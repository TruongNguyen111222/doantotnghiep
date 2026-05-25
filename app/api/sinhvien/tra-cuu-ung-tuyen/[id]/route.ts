import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth/jwt";
import { SESSION_COOKIE_NAME } from "@/lib/constants/auth/patterns";
import { prisma } from "@/lib/prisma";
import { buildEnterpriseHeadquartersAddress, formatBusinessFields } from "@/lib/utils/enterprise-admin-display";

async function getStudentUserId() { //hàm lấy id sinh viên
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return { error: NextResponse.json({ success: false, message: "Vui lòng đăng nhập." }, { status: 401 }) };
  try {
    const verified = await verifySession(token);
    if (verified.role !== "sinhvien") {
      return { error: NextResponse.json({ success: false, message: "Không có quyền truy cập." }, { status: 403 }) };
    }
    return { userId: verified.sub };
  } catch {
    return { error: NextResponse.json({ success: false, message: "Phiên đăng nhập không hợp lệ." }, { status: 401 }) };
  }
}

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) { //hàm lấy chi tiết tin tuyển dụng
  const auth = await getStudentUserId(); //lấy id sinh viên
  if (auth.error) return auth.error;
  const userId = auth.userId as string;
  const { id } = await ctx.params; //lấy id tin tuyển dụng
  const prismaAny = prisma as any;

  const now = new Date();
  const row = await prismaAny.jobPost.findFirst({ //lấy tin tuyển dụng theo id
    where: { id, status: "ACTIVE", deadlineAt: { gte: now }, enterpriseUser: { enterpriseStatus: "APPROVED" } },
    select: {
      id: true,
      title: true,
      salary: true,
      expertise: true,
      experienceRequirement: true,
      recruitmentCount: true,
      workType: true,
      deadlineAt: true,
      jobDescription: true,
      candidateRequirements: true,
      benefits: true,
      workLocation: true,
      workTime: true,
      applicationMethod: true,
      companyIntro: true,
      companyWebsite: true,
      enterpriseUser: {
        select: { companyName: true, taxCode: true, enterpriseMeta: true }
      }
    }
  });
  if (!row) return NextResponse.json({ success: false, message: "Không tìm thấy tin tuyển dụng." }, { status: 404 });

  const profile = await prismaAny.studentProfile.findFirst({
    where: { userId },
    select: { internshipStatus: true }
  });
  if (!profile) return NextResponse.json({ success: false, message: "Không tìm thấy hồ sơ sinh viên." }, { status: 404 });

  const existed = await prismaAny.jobApplication.findFirst({ //lấy ứng tuyển theo id tin tuyển dụng và id sinh viên
    where: { jobPostId: id, studentUserId: userId },
    select: { id: true, status: true, createdAt: true }
  });

  return NextResponse.json({ //trả về chi tiết tin tuyển dụng
    success: true,
    item: {
      id: row.id,
      title: row.title,
      salary: row.salary,
      expertise: row.expertise,
      experienceRequirement: row.experienceRequirement,
      recruitmentCount: row.recruitmentCount,
      workType: row.workType,
      deadlineAt: row.deadlineAt?.toISOString?.() ?? null,
      jobDescription: row.jobDescription,
      candidateRequirements: row.candidateRequirements,
      benefits: row.benefits,
      workLocation: row.workLocation,
      workTime: row.workTime,
      applicationMethod: row.applicationMethod ?? null,
      enterprise: {
        companyName: row.enterpriseUser?.companyName ?? "—",
        taxCode: row.enterpriseUser?.taxCode ?? "—",
        businessFields: formatBusinessFields(row.enterpriseUser?.enterpriseMeta),
        headquartersAddress: buildEnterpriseHeadquartersAddress(row.enterpriseUser?.enterpriseMeta),
        intro: row.companyIntro ?? null,
        website: row.companyWebsite ?? null
      },
      internshipStatus: profile.internshipStatus,
      canApply: profile.internshipStatus === "NOT_STARTED" && !existed,
      hasApplied: Boolean(existed),
      appliedAt: existed?.createdAt?.toISOString?.() ?? null
    }
  });
}

