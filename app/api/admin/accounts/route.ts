import { NextResponse } from "next/server";
import { Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth/admin-session";
import { ADMIN_QUAN_LY_TAI_KHOAN_PAGE_SIZE } from "@/lib/constants/admin-quan-ly-tai-khoan";

type AccountStatus = "ACTIVE" | "STOPPED"; //trạng thái tài khoản

export async function GET(request: Request) { //hàm lấy danh sách tài khoản
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ message: "Không có quyền truy cập." }, { status: 403 });

  try {
    const { searchParams } = new URL(request.url); //lấy query params
    const q = searchParams.get("q")?.trim() || ""; //từ khóa tìm kiếm
    const roleParam = searchParams.get("role")?.trim() || "all"; //vai trò tìm kiếm
    const statusParam = (searchParams.get("status")?.trim() || "all") as AccountStatus | "all"; //trạng thái tìm kiếm
    const page = Math.max(Number(searchParams.get("page") || "1") || 1, 1); //trang hiện tại
    const pageSize = Math.max(Number(searchParams.get("pageSize") || String(ADMIN_QUAN_LY_TAI_KHOAN_PAGE_SIZE)) || ADMIN_QUAN_LY_TAI_KHOAN_PAGE_SIZE, 1); //số lượng tài khoản trên mỗi trang

    const where: Prisma.UserWhereInput = { //điều kiện tìm kiếm
      role: { in: [Role.sinhvien, Role.giangvien, Role.doanhnghiep] }
    };
    const andParts: Prisma.UserWhereInput[] = []; //điều kiện tìm kiếm

    if (q) { //nếu có từ khóa tìm kiếm thì thêm điều kiện tìm kiếm
      const isNumeric = /^\d+$/.test(q); //kiểm tra xem từ khóa tìm kiếm có phải là số không
      const isEmailLike = q.includes("@") || q.includes("."); //kiểm tra xem từ khóa tìm kiếp có phải là email không
      andParts.push({
        OR: [
          ...(q.length >= 2 ? [{ fullName: { contains: q, mode: Prisma.QueryMode.insensitive } }] : []),
          ...(isNumeric ? [{ phone: { startsWith: q } }, { taxCode: { startsWith: q } }] : []),
          ...(isEmailLike ? [{ email: { startsWith: q, mode: Prisma.QueryMode.insensitive } }] : []),
          ...(q.length >= 2 ? [{ companyName: { contains: q, mode: Prisma.QueryMode.insensitive } }] : [])
        ]
      });
    }

    if (roleParam !== "all" && Object.values(Role).includes(roleParam as Role)) { //nếu vai trò tìm kiếm không phải là tất cả thì thêm điều kiện tìm kiếm
      const r = roleParam as Role;
      if (([Role.sinhvien, Role.giangvien, Role.doanhnghiep] as Role[]).includes(r)) andParts.push({ role: r });
    }

    if (statusParam !== "all") { //nếu trạng thái tìm kiếm không phải là tất cả thì thêm điều kiện tìm kiếm
      andParts.push({ isLocked: statusParam === "STOPPED" });
    }

    if (andParts.length) where.AND = andParts; //nếu có điều kiện tìm kiếm thì thêm điều kiện tìm kiếm

    const totalItems = await prisma.user.count({ where }); //lấy tổng số lượng tài khoản
    const rows = await prisma.user.findMany({ //lấy danh sách tài khoản
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        isLocked: true,
        companyName: true
      }
    });

    // --- Latest batch account stats ---
    let latestBatchAccountStats: { //thống kê tài khoản theo batch
      batchId: string | null;
      batchName: string | null;
      active: number;
      stopped: number;
    } = { batchId: null, batchName: null, active: 0, stopped: 0 }; 
 
    try {
      const prismaAny = prisma as any;
      const latestBatch: { id: string; name: string } | null = await prismaAny.internshipBatch.findFirst({ //lấy batch mới nhất
        orderBy: { startDate: "desc" }, //sắp xếp theo thời gian bắt đầu giảm dần
        select: { id: true, name: true } //lấy id và tên batch
      });

      if (latestBatch?.id) { //nếu có batch mới nhất thì lấy thống kê tài khoản theo batch
        const batchId = String(latestBatch.id); //lấy id batch

        // Accounts related to the latest batch:
        // - lecturers having supervisor assignments in batch (giảng viên có nhiệm vụ giảng dạy trong batch)
        // - students assigned to those assignments in batch (sinh viên được giao nhiệm vụ giảng dạy trong batch)
        // - enterprises posting jobs in batch (doanh nghiệp đăng tuyển sinh viên trong batch)
        const [assignmentRows, studentLinkRows, enterpriseJobRows] = await Promise.all([ //lấy danh sách tài khoản theo batch
          prismaAny.supervisorAssignment.findMany({ //lấy danh sách giảng viên có nhiệm vụ giảng dạy trong batch
            where: { internshipBatchId: batchId }, //điều kiện tìm kiếm
            select: { supervisorProfile: { select: { userId: true } } } //lấy id giảng viên
          }) as Promise<Array<{ supervisorProfile: { userId: string } | null }>>,
          prismaAny.supervisorAssignmentStudent.findMany({ //lấy danh sách sinh viên được giao nhiệm vụ giảng dạy trong batch
            where: { supervisorAssignment: { internshipBatchId: batchId } },
            select: { studentProfile: { select: { userId: true } } } //lấy id sinh viên
          }) as Promise<Array<{ studentProfile: { userId: string } | null }>>,
          prismaAny.jobPost.findMany({ //lấy danh sách doanh nghiệp đăng tuyển sinh viên trong batch
            where: { internshipBatchId: batchId },
            select: { enterpriseUserId: true } //lấy id doanh nghiệp
          }) as Promise<Array<{ enterpriseUserId: string }>>
        ]);

        const userIds = new Set<string>(); //set id tài khoản
        for (const a of assignmentRows) {
          const id = a.supervisorProfile?.userId; //lấy id giảng viên
          if (id) userIds.add(String(id));
        }
        for (const l of studentLinkRows) {
          const id = l.studentProfile?.userId; //lấy id sinh viên
          if (id) userIds.add(String(id));
        }
        for (const jp of enterpriseJobRows) {
          if (jp.enterpriseUserId) userIds.add(String(jp.enterpriseUserId)); //lấy id doanh nghiệp
        }

        if (userIds.size) { //nếu có id tài khoản thì lấy thống kê tài khoản theo batch 
          const list = Array.from(userIds);
          const [active, stopped] = await Promise.all([ //lấy số lượng tài khoản hoạt động và dừng hoạt động theo batch
            prismaAny.user.count({ where: { id: { in: list }, isLocked: false } }), //lấy số lượng tài khoản hoạt động theo batch
            prismaAny.user.count({ where: { id: { in: list }, isLocked: true } }) //lấy số lượng tài khoản dừng hoạt động theo batch
          ]);
          latestBatchAccountStats = { //thống kê tài khoản theo batch   
            batchId,
            batchName: latestBatch.name ?? null,
            active,
            stopped
          };
        } else {
          latestBatchAccountStats = {
            batchId,  
            batchName: latestBatch.name ?? null,
            active: 0,
            stopped: 0
          };
        }
      }
    } catch (e) {
      console.error("[GET /api/admin/accounts] latestBatchAccountStats error", e);
    }

    return NextResponse.json({ //trả về dữ liệu danh sách tài khoản
      success: true,
      latestBatchAccountStats,
      items: rows.map((r) => ({ //map rows
        id: r.id,
        fullName: r.role === Role.doanhnghiep ? r.companyName || r.fullName : r.fullName, //lấy tên tài khoản
        email: r.email, //lấy email tài khoản
        phone: r.phone ?? null, //lấy số điện thoại tài khoản
        role: r.role, //lấy vai trò tài khoản
        status: (r.isLocked ? "STOPPED" : "ACTIVE") as AccountStatus //lấy trạng thái tài khoản
      })),
      page, //trang hiện tại
      pageSize, //số lượng tài khoản trên mỗi trang
      totalItems //tổng số lượng tài khoản
    });
  } catch (e) {
    console.error("[GET /api/admin/accounts]", e);
    return NextResponse.json({ success: false, message: "Lỗi máy chủ." }, { status: 500 });
  }
}

