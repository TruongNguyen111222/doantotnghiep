import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth/jwt";
import { SESSION_COOKIE_NAME } from "@/lib/constants/auth/patterns";
import { prisma } from "@/lib/prisma";
import { buildEnterpriseHeadquartersAddress } from "@/lib/utils/enterprise-admin-display";

const prismaAny = prisma as any;

type InternshipStatus = //hàm xử lý trạng thái thực tập
  | "NOT_STARTED" //chưa thực tập
  | "DOING" //đang thực tập
  | "SELF_FINANCED" //thực tập tự túc
  | "REPORT_SUBMITTED"
  | "COMPLETED" //hoàn thành thực tập
  | "REJECTED";

type Degree = "BACHELOR" | "ENGINEER";
type ReportReviewStatus = "PENDING" | "REJECTED" | "APPROVED"; //hàm xử lý trạng thái review báo cáo thực tập

export async function resolveGiangVienSupervisorProfileId(): Promise< //hàm xử lý id giảng viên
  | { ok: true; supervisorProfileId: string }
  | { ok: false; response: NextResponse }
> {
  const cookieStore = await cookies(); //hàm lấy cookie store
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value; //hàm lấy token từ cookie
  if (!token) return { ok: false, response: NextResponse.json({ success: false, message: "Vui lòng đăng nhập." }, { status: 401 }) };
  try {
    const verified = await verifySession(token);
    if (verified.role !== "giangvien") {
      return { ok: false, response: NextResponse.json({ success: false, message: "Không có quyền truy cập." }, { status: 403 }) };
    }
    const sup = await prismaAny.supervisorProfile.findFirst({ where: { userId: verified.sub }, select: { id: true } });
    if (!sup) return { ok: false, response: NextResponse.json({ success: false, message: "Không tìm thấy hồ sơ giảng viên." }, { status: 404 }) };
    return { ok: true, supervisorProfileId: sup.id as string };
  } catch {
    return { ok: false, response: NextResponse.json({ success: false, message: "Phiên đăng nhập không hợp lệ." }, { status: 401 }) };
  }
}

export function giangVienInternshipStatusText(status: InternshipStatus, reviewStatus: ReportReviewStatus | null) {
  if (status === "REPORT_SUBMITTED") {
    if (reviewStatus === "APPROVED") return "Đã duyệt BCTT";
    if (reviewStatus === "REJECTED") return "Từ chối duyệt BCTT";
    return "Đã nộp BCTT";
  }
  if (status === "REJECTED") return "Từ chối duyệt BCTT";
  if (status === "COMPLETED") return "Hoàn thành thực tập";
  if (status === "DOING") return "Đang thực tập";
  if (status === "SELF_FINANCED") return "Thực tập tự túc";
  return "Chưa thực tập";
}

/** Danh sách BCTT cho GV — cùng bộ lọc và logic đợt OPEN / fallback như GET API. */
export async function fetchGiangVienBaoCaoListItems(supervisorProfileId: string, searchParams: URLSearchParams) {
  const q = (searchParams.get("q") || "").trim();
  const degree = (searchParams.get("degree") || "all").trim();
  const status = (searchParams.get("status") || "all").trim();

  const degreeFilter = degree !== "all" ? (degree as Degree) : null;
  const statusFilter = status !== "all" ? (status as InternshipStatus) : null;

  const buildWhere = (useOpenBatchOnly: boolean) => {
    const where: any = {
      supervisorAssignment: {
        supervisorProfileId
      }
    };
    if (useOpenBatchOnly) where.supervisorAssignment.internshipBatch = { status: "OPEN" };
    if (statusFilter) where.studentProfile = { internshipStatus: statusFilter };
    if (degreeFilter) where.studentProfile = { ...(where.studentProfile || {}), degree: degreeFilter };
    if (q) {
      where.studentProfile = {
        ...(where.studentProfile || {}),
        OR: [
          { msv: { startsWith: q } },
          ...(q.length >= 2 ? [{ user: { fullName: { contains: q, mode: "insensitive" } } }] : [])
        ]
      };
    }
    return where;
  };

  const fetchLinks = async (useOpenBatchOnly: boolean) => {
    return prismaAny.supervisorAssignmentStudent.findMany({
      where: buildWhere(useOpenBatchOnly),
      orderBy: { createdAt: "desc" },
      select: {
        studentProfile: {
          select: {
            id: true,
            userId: true,
            msv: true,
            className: true,
            faculty: true,
            cohort: true,
            degree: true,
            internshipStatus: true,
            birthDate: true,
            gender: true,
            permanentProvinceName: true,
            permanentWardName: true,
            user: { select: { fullName: true, phone: true, email: true } },
            internshipReport: {
              select: {
                id: true,
                reviewStatus: true,
                reportFileName: true,
                reportMime: true,
                enterpriseEvalFileName: true,
                submittedAt: true,
                supervisorRejectReason: true,
                supervisorEvaluation: true,
                supervisorPoint: true,
                enterpriseEvaluation: true,
                enterprisePoint: true
              }
            }
          }
        },
        supervisorAssignment: {
          select: {
            internshipBatch: { select: { startDate: true, endDate: true } }
          }
        }
      }
    });
  };

  let links = await fetchLinks(true);
  if (!links.length) links = await fetchLinks(false);

  const userIds = links
    .map((x: any) => x.studentProfile)
    .map((sp: any) => sp.userId)
    .filter(Boolean);

  const enterpriseByUserId = new Map<string, any>();
  if (userIds.length) {
    const apps = await prismaAny.jobApplication.findMany({
      where: {
        studentUserId: { in: userIds },
        status: "OFFERED",
        response: "ACCEPTED"
      },
      select: {
        studentUserId: true,
        jobPost: {
          select: {
            enterpriseUser: { select: { companyName: true, taxCode: true, enterpriseMeta: true } }
          }
        }
      }
    });

    for (const a of apps) {
      const eu = a.jobPost?.enterpriseUser;
      if (!eu) continue;
      enterpriseByUserId.set(String(a.studentUserId), {
        companyName: eu.companyName ?? "—",
        taxCode: eu.taxCode ?? null,
        headquartersAddress: buildEnterpriseHeadquartersAddress(eu.enterpriseMeta)
      });
    }
  }

  return links.map((x: any) => {
    const sp = x.studentProfile;
    const report = sp.internshipReport;
    const reviewStatus = report ? (report.reviewStatus as ReportReviewStatus) : null;
    const internshipStatus = sp.internshipStatus as InternshipStatus;

    const statusText = giangVienInternshipStatusText(internshipStatus, reviewStatus);

    const canUpdateInternshipStatus = internshipStatus === "NOT_STARTED";
    const canReviewReport = internshipStatus === "REPORT_SUBMITTED" && Boolean(report) && report.reviewStatus !== "APPROVED";

    return {
      studentProfileId: sp.id,
      msv: sp.msv,
      fullName: sp.user?.fullName ?? "",
      cohort: sp.cohort,
      degree: sp.degree as Degree,
      internshipStatus: internshipStatus,
      statusText,
      birthDate: sp.birthDate?.toISOString?.() ?? null,
      gender: sp.gender ?? null,
      phone: sp.user?.phone ?? null,
      email: sp.user?.email ?? "",
      permanentAddress: [sp.permanentProvinceName, sp.permanentWardName].filter(Boolean).join(" - ") || "—",
      className: sp.className,
      faculty: sp.faculty,
      internshipBatch: {
        startDate: x.supervisorAssignment?.internshipBatch?.startDate?.toISOString?.() ?? null,
        endDate: x.supervisorAssignment?.internshipBatch?.endDate?.toISOString?.() ?? null
      },
      enterprise: enterpriseByUserId.get(String(sp.userId)) ?? null,
      report: report
        ? {
            id: report.id,
            reviewStatus: report.reviewStatus as ReportReviewStatus,
            reportFileName: report.reportFileName,
            reportMime: report.reportMime,
            enterpriseEvalFileName: report.enterpriseEvalFileName ?? null,
            submittedAt: report.submittedAt?.toISOString?.() ?? null,
            supervisorRejectReason: report.supervisorRejectReason ?? null,
            supervisorEvaluation: report.supervisorEvaluation ?? null,
            supervisorPoint: report.supervisorPoint ?? null,
            enterpriseEvaluation: report.enterpriseEvaluation ?? null,
            enterprisePoint: report.enterprisePoint ?? null
          }
        : null,
      ui: {
        canUpdateInternshipStatus,
        canReviewReport
      }
    };
  });
}
