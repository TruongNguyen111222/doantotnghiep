import { GoogleGenerativeAI } from "@google/generative-ai";
import { AI_CV_SCREENING_MODEL } from "@/lib/constants/ai-cv-screening";
import type { AiCvScreeningResult } from "@/lib/types/ai-cv-screening";

function getGeminiApiKey(): string {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) throw new Error("GEMINI_API_KEY_MISSING");
  return key;
}


function clampScore(n: unknown): number {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(100, Math.round(v)));
}

function toStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x ?? "").trim()).filter(Boolean);
}

function normalizeScreeningResult(raw: unknown): AiCvScreeningResult {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    matchScore: clampScore(o.matchScore),
    summary: String(o.summary ?? "").trim(),
    extractedSkills: toStringArray(o.extractedSkills),
    extractedExperience: toStringArray(o.extractedExperience),
    matchedRequirements: toStringArray(o.matchedRequirements),
    gaps: toStringArray(o.gaps),
    reasoning: String(o.reasoning ?? "").trim()
  };
}

export async function analyzeCvAgainstJobRequirements(input: {
  cvText: string;
  jobTitle: string;
  jobDescription: string;
  candidateRequirements: string;
  experienceRequirement: string;
  expertise: string;
  applicantName: string;
}): Promise<AiCvScreeningResult> {
  const genAI = new GoogleGenerativeAI(getGeminiApiKey());
  const model = genAI.getGenerativeModel({
    model: AI_CV_SCREENING_MODEL,
    generationConfig: {
      responseMimeType: "application/json"
    }
  });

  const prompt = [
    "Bạn là trợ lý tuyển dụng thực tập. Phân tích CV sinh viên và so khớp với tin tuyển dụng.",
    "Chỉ dựa trên nội dung được cung cấp. Không bịa thông tin không có trong CV.",
    "Trả về JSON với các key: matchScore (0-100), summary, extractedSkills (string[]), extractedExperience (string[]), matchedRequirements (string[]), gaps (string[]), reasoning.",
    "",
    `Ứng viên: ${input.applicantName}`,
    `Vị trí: ${input.jobTitle}`,
    `Chuyên môn yêu cầu: ${input.expertise}`,
    `Kinh nghiệm yêu cầu: ${input.experienceRequirement}`,
    `Mô tả công việc: ${input.jobDescription}`,
    `Yêu cầu ứng viên: ${input.candidateRequirements}`,
    "",
    "=== NỘI DUNG CV ===",
    input.cvText
  ].join("\n");

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  if (!text.trim()) throw new Error("GEMINI_EMPTY_RESPONSE");

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("GEMINI_INVALID_JSON");
  }

  return normalizeScreeningResult(parsed);
}
