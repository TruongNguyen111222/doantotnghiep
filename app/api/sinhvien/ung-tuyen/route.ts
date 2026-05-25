import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth/jwt";
import { SESSION_COOKIE_NAME } from "@/lib/constants/auth/patterns";
import { prisma } from "@/lib/prisma";

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

export async function GET(request: Request) { //hàm lấy danh sách ứng tuyển
  const auth = await getStudentUserId();
  if (auth.error) return auth.error;
  const userId = auth.userId as string;
  const prismaAny = prisma as any;
  const { searchParams } = new URL(request.url);
  const status = (searchParams.get("status") || "all").trim();
  const where: any = { studentUserId: userId };
  if (status !== "all") {
    if (status === "REJECTED") {
      where.status = { in: ["REJECTED", "STUDENT_DECLINED"] };
    } else {
      where.status = status;
    }
  }

  function extractHistoryMeta(history: any[]): { responseDeadline: string | null; interviewLocation: string | null } { //hàm lấy meta lịch sử ứng tuyển
    if (!Array.isArray(history) || !history.length) return { responseDeadline: null, interviewLocation: null };
    let responseDeadline: string | null = null;
    let interviewLocation: string | null = null;
    for (let i = history.length - 1; i >= 0; i--) {
      const h = history[i] as Record<string, unknown>;
      if (h?.action === "STATUS_UPDATE") {
        if (!responseDeadline && typeof h?.responseDeadline === "string") responseDeadline = h.responseDeadline as string;
        if (!interviewLocation && typeof h?.interviewLocation === "string") interviewLocation = h.interviewLocation as string;
        if (responseDeadline && interviewLocation) break;
      }
    }
    return { responseDeadline, interviewLocation };
  }

  const rows = await prismaAny.jobApplication.findMany({ //lấy danh sách ứng tuyển
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      response: true,
      createdAt: true,
      interviewAt: true,
      responseAt: true,
      history: true,
      jobPost: {
        select: {
          id: true,
          title: true,
          expertise: true,
          workType: true,
          deadlineAt: true,
          enterpriseUser: { select: { companyName: true } }
        }
      }
    }
  });

  return NextResponse.json({ //trả về danh sách ứng tuyển
    success: true,
    items: rows.map((r: any) => ({
      id: r.id,
      status: r.status,
      response: r.response,
      appliedAt: r.createdAt?.toISOString?.() ?? null,
      interviewAt: r.interviewAt?.toISOString?.() ?? null,
      ...extractHistoryMeta(Array.isArray(r.history) ? r.history : []),
      responseAt: r.responseAt?.toISOString?.() ?? null,
      job: {
        id: r.jobPost.id,
        title: r.jobPost.title,
        expertise: r.jobPost.expertise,
        workType: r.jobPost.workType,
        deadlineAt: r.jobPost.deadlineAt?.toISOString?.() ?? null,
        companyName: r.jobPost.enterpriseUser?.companyName ?? "—"
      }
    }))
  });
}

