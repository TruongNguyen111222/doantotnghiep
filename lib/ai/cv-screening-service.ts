import { prisma } from "@/lib/prisma";
import { analyzeCvAgainstJobRequirements } from "@/lib/ai/gemini-client";
import { extractCvTextFromBytes, normalizeCvText } from "@/lib/ai/cv-text-extract";
import {
  AI_CV_SCREENING_ERROR_EMPTY_CV_TEXT,
  AI_CV_SCREENING_ERROR_NO_GEMINI_KEY,
  AI_CV_SCREENING_ERROR_QUOTA,
  AI_CV_SCREENING_MAX_CV_CHARS,
  AI_CV_SCREENING_MODEL
} from "@/lib/constants/ai-cv-screening";
import { fetchCloudinaryBytesByPublicId } from "@/lib/storage/cloudinary";
import type { AiCvScreeningContext, AiCvScreeningRecord } from "@/lib/types/ai-cv-screening";

function jsonStringArray(v: unknown): string[] {
  if (Array.isArray(v)) {
    return v.map((x) => String(x ?? "").trim()).filter(Boolean);
  }
  if (typeof v === "string") {
    try {
      const parsed = JSON.parse(v) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.map((x) => String(x ?? "").trim()).filter(Boolean);
      }
    } catch {
      return v.trim() ? [v.trim()] : [];
    }
  }
  return [];
}

function mapRow(row: any): AiCvScreeningRecord {
  return {
    id: String(row.id),
    jobApplicationId: String(row.jobApplicationId),
    status: row.status,
    matchScore: row.matchScore == null ? null : Number(row.matchScore),
    summary: row.summary ?? null,
    extractedSkills: jsonStringArray(row.extractedSkills),
    extractedExperience: jsonStringArray(row.extractedExperience),
    matchedRequirements: jsonStringArray(row.matchedRequirements),
    gaps: jsonStringArray(row.gaps),
    reasoning: row.reasoning ?? null,
    model: row.model ?? null,
    errorMessage: row.errorMessage ?? null,
    screenedAt: row.screenedAt ? new Date(row.screenedAt).toISOString() : null,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString()
  };
}

type LoadedApplication = {
  id: string;
  applicantName: string;
  jobTitle: string;
  jobDescription: string;
  candidateRequirements: string;
  experienceRequirement: string;
  expertise: string;
  coverLetter: string;
  cvPublicId: string;
  cvFileName: string | null;
  cvMime: string;
};

type LoadApplicationResult =
  | { error: "NOT_FOUND" }
  | { error: "FORBIDDEN" }
  | { application: LoadedApplication };

async function loadApplicationForEnterprise(
  applicationId: string,
  enterpriseUserId: string
): Promise<LoadApplicationResult> {
  const prismaAny = prisma as any;
  const row = await prismaAny.jobApplication.findFirst({
    where: { id: applicationId },
    select: {
      id: true,
      cvPublicId: true,
      cvFileName: true,
      cvMime: true,
      coverLetter: true,
      studentUser: {
        select: {
          fullName: true,
          studentProfile: { select: { cvPublicId: true, cvFileName: true, cvMime: true } }
        }
      },
      jobPost: {
        select: {
          enterpriseUserId: true,
          title: true,
          jobDescription: true,
          candidateRequirements: true,
          experienceRequirement: true,
          expertise: true
        }
      }
    }
  });

  if (!row) return { error: "NOT_FOUND" as const };
  if (row.jobPost?.enterpriseUserId !== enterpriseUserId) return { error: "FORBIDDEN" as const };

  const cvPublicId = String(row.cvPublicId || row.studentUser?.studentProfile?.cvPublicId || "").trim();
  const cvFileName = row.cvFileName || row.studentUser?.studentProfile?.cvFileName || null;
  const cvMime = row.cvMime || row.studentUser?.studentProfile?.cvMime || "application/pdf";

  return {
    application: {
      id: String(row.id),
      applicantName: String(row.studentUser?.fullName || "Sinh viên"),
      jobTitle: String(row.jobPost?.title || ""),
      jobDescription: String(row.jobPost?.jobDescription || ""),
      candidateRequirements: String(row.jobPost?.candidateRequirements || ""),
      experienceRequirement: String(row.jobPost?.experienceRequirement || ""),
      expertise: String(row.jobPost?.expertise || ""),
      coverLetter: String(row.coverLetter || ""),
      cvPublicId,
      cvFileName,
      cvMime
    }
  };
}

export async function getAiCvScreeningContext(
  applicationId: string,
  enterpriseUserId: string
): Promise<AiCvScreeningContext | { error: "NOT_FOUND" | "FORBIDDEN" }> {
  const loaded = await loadApplicationForEnterprise(applicationId, enterpriseUserId);
  if ("error" in loaded) return { error: loaded.error };

  const prismaAny = prisma as any;
  const screeningRow = await prismaAny.jobApplicationAiScreening.findUnique({
    where: { jobApplicationId: applicationId }
  });

  return {
    applicationId,
    applicantName: loaded.application.applicantName,
    jobTitle: loaded.application.jobTitle,
    cvFileName: loaded.application.cvFileName,
    screening: screeningRow ? mapRow(screeningRow) : null
  };
}

export async function runAiCvScreening(
  applicationId: string,
  enterpriseUserId: string
): Promise<{ screening: AiCvScreeningRecord } | { error: string; status: number }> {
  if (!process.env.GEMINI_API_KEY?.trim()) {
    return { error: AI_CV_SCREENING_ERROR_NO_GEMINI_KEY, status: 503 };
  }

  const loaded = await loadApplicationForEnterprise(applicationId, enterpriseUserId);
  if ("error" in loaded) {
    return {
      error: loaded.error === "NOT_FOUND" ? "Không tìm thấy hồ sơ ứng tuyển." : "Không có quyền truy cập hồ sơ này.",
      status: loaded.error === "NOT_FOUND" ? 404 : 403
    };
  }

  const app = loaded.application;
  if (!app.cvPublicId) {
    return { error: "Hồ sơ không có file CV.", status: 400 };
  }

  const prismaAny = prisma as any;
  await prismaAny.jobApplicationAiScreening.upsert({
    where: { jobApplicationId: applicationId },
    create: { jobApplicationId: applicationId, status: "PENDING" },
    update: { status: "PENDING", errorMessage: null }
  });

  try {
    const fetched = await fetchCloudinaryBytesByPublicId(app.cvPublicId);
    if (!fetched) {
      throw new Error("Không tải được file CV từ Cloudinary.");
    }

    let cvText = await extractCvTextFromBytes(fetched.bytes, app.cvMime || fetched.contentType);
    if (!cvText && app.coverLetter.trim()) {
      cvText = `[Thư giới thiệu]\n${app.coverLetter.trim()}`;
    }
    cvText = normalizeCvText(cvText, AI_CV_SCREENING_MAX_CV_CHARS);
    if (!cvText) {
      throw new Error(AI_CV_SCREENING_ERROR_EMPTY_CV_TEXT);
    }

    const ai = await analyzeCvAgainstJobRequirements({
      cvText,
      jobTitle: app.jobTitle,
      jobDescription: app.jobDescription,
      candidateRequirements: app.candidateRequirements,
      experienceRequirement: app.experienceRequirement,
      expertise: app.expertise,
      applicantName: app.applicantName
    });

    const saved = await prismaAny.jobApplicationAiScreening.update({
      where: { jobApplicationId: applicationId },
      data: {
        status: "COMPLETED",
        matchScore: ai.matchScore,
        summary: ai.summary,
        extractedSkills: ai.extractedSkills,
        extractedExperience: ai.extractedExperience,
        matchedRequirements: ai.matchedRequirements,
        gaps: ai.gaps,
        reasoning: ai.reasoning,
        model: AI_CV_SCREENING_MODEL,
        errorMessage: null,
        screenedAt: new Date()
      }
    });

    return { screening: mapRow(saved) };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Phân tích CV thất bại.";
    const friendly =
      message === "GEMINI_API_KEY_MISSING"
        ? AI_CV_SCREENING_ERROR_NO_GEMINI_KEY
        : /429|quota|Too Many Requests/i.test(message)
          ? AI_CV_SCREENING_ERROR_QUOTA
          : message === "DOC_LEGACY_UNSUPPORTED"
            ? "File .doc cũ chưa hỗ trợ. Vui lòng dùng PDF hoặc .docx."
            : message.length > 280
              ? `${message.slice(0, 280)}…`
              : message;

    await prismaAny.jobApplicationAiScreening.update({
      where: { jobApplicationId: applicationId },
      data: {
        status: "FAILED",
        errorMessage: friendly,
        screenedAt: new Date()
      }
    });

    return { error: friendly, status: 502 };
  }
}
