import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth/jwt";
import { SESSION_COOKIE_NAME } from "@/lib/constants/auth/patterns";
import { prisma } from "@/lib/prisma";
import { DOANHNGHIEP_UNG_VIEN_PAGE_SIZE } from "@/lib/constants/doanhnghiep-ung-vien";

type JobStatus = "PENDING" | "REJECTED" | "ACTIVE" | "STOPPED";

function parseDateOnly(input: string) {
  // input: YYYY-MM-DD
  const d = new Date(`${input}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}
//
export async function GET(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ success: false, message: "Vui lòng đăng nhập." }, { status: 401 });

  let sub: string;
  let role: string;
  try {
    const verified = await verifySession(token);
    sub = verified.sub;
    role = verified.role;
  } catch {
    return NextResponse.json({ success: false, message: "Phiên đăng nhập không hợp lệ." }, { status: 401 });
  }

  if (role !== "doanhnghiep") return NextResponse.json({ success: false, message: "Không có quyền truy cập." }, { status: 403 });
//  Đọc và chuẩn hóa các tham số tìm kiếm, lọc, phân trang từ URL Query Parameters
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();
  const createdDate = (searchParams.get("createdDate") || "").trim();
  const deadlineDate = (searchParams.get("deadlineDate") || "").trim();
  const status = (searchParams.get("status") || "all").trim() as JobStatus | "all";
  const page = Math.max(Number(searchParams.get("page") || "1") || 1, 1);
  const pageSize = Math.max(Number(searchParams.get("pageSize") || String(DOANHNGHIEP_UNG_VIEN_PAGE_SIZE)) || DOANHNGHIEP_UNG_VIEN_PAGE_SIZE, 1);

  const where: any = { enterpriseUserId: sub };
  const and: any[] = [];

  if (q && q.length >= 2) and.push({ title: { contains: q, mode: "insensitive" } });
  if (status !== "all") and.push({ status });
// Thêm điều kiện lọc theo Ngày đăng và Hạn tuyển dụng
  const created = createdDate ? parseDateOnly(createdDate) : null;
  if (created) {
    const next = new Date(created);
    next.setUTCDate(next.getUTCDate() + 1);
    and.push({ createdAt: { gte: created, lt: next } });
  }

  const deadline = deadlineDate ? parseDateOnly(deadlineDate) : null;
  if (deadline) {
    const next = new Date(deadline);
    next.setUTCDate(next.getUTCDate() + 1);
    and.push({ deadlineAt: { gte: deadline, lt: next } });
  }

  if (and.length) where.AND = and;

  const prismaAny = prisma as any;
// 6. Thực hiện đồng thời (Parallel) 3 câu lệnh truy vấn tới Database để tối ưu hiệu năng
  const [totalItems, rows, appStatusRows] = await Promise.all([ //lấy tổng số lượng tin tuyển dụng, danh sách tin tuyển dụng và danh sách trạng thái ứng viên
    prismaAny.jobPost.count({ where }), //đếm tổng số lượng tin tuyển dụng
    prismaAny.jobPost.findMany({ //lấy danh sách tin tuyển dụng
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        title: true,
        createdAt: true,
        deadlineAt: true,
        recruitmentCount: true,
        status: true,
        _count: { select: { jobApplications: true } }
      }
    }),
    // Aggregate all application statuses for this enterprise (ignoring current search filters)
    prismaAny.jobApplication.findMany({ //lấy danh sách trạng thái ứng viên
      where: { jobPost: { enterpriseUserId: sub } },
      select: { status: true }
    }) as Promise<Array<{ status: string }>>
  ]);
// 7. Khối xử lý Logic duyệt qua danh sách trạng thái để gom nhóm và tính toán số lượng thống kê (Aggregation)
  const appStats = { PENDING_REVIEW: 0, INTERVIEW_INVITED: 0, OFFERED: 0, REJECTED: 0, STUDENT_DECLINED: 0 };
  for (const row of appStatusRows) {
    if (row.status in appStats) appStats[row.status as keyof typeof appStats]++;
  }

  return NextResponse.json({ //trả về dữ liệu danh sách tin tuyển dụng
    success: true,
    appStats,
    page,
    pageSize,
    totalItems,
    items: rows.map((r: any) => ({
      id: r.id,
      title: r.title,
      createdAt: r.createdAt?.toISOString?.() ?? null,
      deadlineAt: r.deadlineAt?.toISOString?.() ?? null,
      recruitmentCount: r.recruitmentCount,
      applicantCount: r._count?.jobApplications ?? 0,
      status: r.status as JobStatus
    }))
  });
}

