import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/admin-session";
import { prisma } from "@/lib/prisma";

type JobStatus = "PENDING" | "REJECTED" | "ACTIVE" | "STOPPED"; //trạng thái việc làm

function enterpriseMetaAsRecord(meta: unknown): Record<string, unknown> { //hàm chuyển đổi meta thành đối tượng Record
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return {}; //nếu meta không tồn tại hoặc không phải đối tượng hoặc là mảng thì trả về đối tượng rỗng
  return meta as Record<string, unknown>; //trả về meta dưới dạng đối tượng Record
}

export async function GET(request: Request) { //hàm xử lý request GET
  const admin = await getAdminSession(); //lấy session admin
  if (!admin) return NextResponse.json({ message: "Không có quyền truy cập." }, { status: 403 }); //nếu không có session admin thì trả về lỗi 403

  try {
    const { searchParams } = new URL(request.url); //lấy searchParams từ request
    const q = searchParams.get("q")?.trim() || ""; 
    const batchId = searchParams.get("batchId")?.trim() || ""; //lấy batchId từ searchParams
    const status = searchParams.get("status")?.trim() || "all"; //lấy status từ searchParams
    // Faculty filter (Ngành/Khoa) — dùng tên param cũ `expertise` để không phá UI hiện tại.
    const faculty = searchParams.get("expertise")?.trim() || ""; //lấy faculty từ searchParams

    const now = new Date(); //lấy thời gian hiện tại
    // Auto-stop khi quá hạn.
    try {
      await (prisma as any).jobPost.updateMany({ //cập nhật trạng thái việc làm
        where: {
          deadlineAt: { lt: now },
          status: { in: ["PENDING", "REJECTED", "ACTIVE"] } //cập nhật trạng thái việc làm
        },
        data: { status: "STOPPED", stoppedAt: now } //cập nhật trạng thái việc làm
      });
    } catch {
      // Không để lỗi auto-stop chặn tải danh sách
    }

    const where: any = {}; //tạo where
    if (q) { //nếu q có giá trị thì thêm vào where
      where.OR = [
        ...(q.length >= 2 ? [{ title: { contains: q, mode: "insensitive" } }] : []), //nếu q có ít nhất 2 ký tự thì thêm vào where
        ...(q.length >= 2 ? [{ enterpriseUser: { companyName: { contains: q, mode: "insensitive" } } }] : [])
      ];
    }
    if (batchId && batchId !== "all") where.internshipBatchId = batchId; //nếu batchId có giá trị và không phải là all thì thêm vào where
    if (status && status !== "all") where.status = status; //nếu status có giá trị và không phải là all thì thêm vào where
    if (faculty && faculty !== "all") {
      // Tin cho phép tất cả khoa: allowedFaculties = []
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : []), //nếu where.AND là mảng thì thêm vào where
        { OR: [{ allowedFaculties: { equals: [] } }, { allowedFaculties: { has: faculty } }] } //nếu faculty có giá trị thì thêm vào where
      ];
    }

    // Status stats for cards (apply same filters)
    let statusStats: { pending: number; rejected: number; active: number; stopped: number } = { //tạo statusStats
      pending: 0, //số lượng việc làm chờ duyệt
      rejected: 0, //số lượng việc làm bị từ chối
      active: 0, //số lượng việc làm đang hoạt động
      stopped: 0 //số lượng việc làm đã dừng
    };
    try {
      const grouped = await (prisma as any).jobPost.groupBy({ //nhóm việc làm theo trạng thái
        by: ["status"],
        where,
        _count: { _all: true }
      });
      for (const g of grouped as any[]) { //lặp qua nhóm việc làm
        const s = String(g.status);
        const c = Number(g._count?._all ?? 0);
        if (s === "PENDING") statusStats.pending = c; //nếu trạng thái là PENDING thì tăng số lượng việc làm chờ duyệt
        else if (s === "REJECTED") statusStats.rejected = c; //nếu trạng thái là REJECTED thì tăng số lượng việc làm bị từ chối
        else if (s === "ACTIVE") statusStats.active = c; //nếu trạng thái là ACTIVE thì tăng số lượng việc làm đang hoạt động
        else if (s === "STOPPED") statusStats.stopped = c; //nếu trạng thái là STOPPED thì tăng số lượng việc làm đã dừng
      }
    } catch {
      // Không để lỗi thống kê chặn tải danh sách
    }

    const rows = await (prisma as any).jobPost.findMany({ //lấy danh sách việc làm
      where,
      orderBy: { createdAt: "desc" }, //sắp xếp việc làm theo thời gian tạo giảm dần
      include: {
        enterpriseUser: { select: { companyName: true, taxCode: true } }, //lấy thông tin doanh nghiệp
        internshipBatch: { select: { id: true, name: true } }
      }
    });

    // Distinct faculty values for the filter dropdown
    let expertises: string[] = [];
    try {
      const fRows = await (prisma as any).studentProfile.findMany({ //lấy danh sách khoa
        distinct: ["faculty"],
        select: { faculty: true },
        orderBy: { faculty: "asc" }
      });
      expertises = fRows.map((r: any) => String(r.faculty || "").trim()).filter(Boolean);
    } catch {
      // Không để lỗi distinct chặn tải danh sách
    }

    return NextResponse.json({ //trả về dữ liệu việc làm
      success: true,
      statusStats,
      items: rows.map((r: any) => ({
        id: r.id,
        title: r.title,
        createdAt: r.createdAt?.toISOString?.() ?? null,
        recruitmentCount: r.recruitmentCount,
        expertise: r.expertise,
        workType: r.workType,
        status: r.status,
        deadlineAt: r.deadlineAt?.toISOString?.() ?? null,
        enterpriseName: r.enterpriseUser?.companyName ?? null,
        batchName: r.internshipBatch?.name ?? null,
        enterpriseTaxCode: r.enterpriseUser?.taxCode ?? null,
        rejectionReason: r.rejectionReason ?? null
      })),
      expertises
    });
  } catch (e) {
    console.error("[GET /api/admin/job-posts]", e);
    return NextResponse.json(
      { success: false, message: "Lỗi máy chủ. Vui lòng thử lại." },
      { status: 500 }
    );
  }
}
