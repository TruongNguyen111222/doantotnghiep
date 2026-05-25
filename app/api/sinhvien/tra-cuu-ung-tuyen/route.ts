import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth/jwt";
import { SESSION_COOKIE_NAME } from "@/lib/constants/auth/patterns";
import { prisma } from "@/lib/prisma";
import { buildEnterpriseHeadquartersAddress, formatBusinessFields } from "@/lib/utils/enterprise-admin-display";
import { fetchProvinceList } from "@/lib/vn-open-api";

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

export async function GET(request: Request) { //hàm lấy danh sách tin tuyển dụng
  const auth = await getStudentUserId(); //lấy id sinh viên 
  if (auth.error) return auth.error;
  const userId = auth.userId as string;
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();
  const workType = (searchParams.get("workType") || "all").trim();
  const province = (searchParams.get("province") || "all").trim();

  const prismaAny = prisma as any; 
  const now = new Date();
  const where: any = {
    status: "ACTIVE", //trạng thái tin tuyển dụng
    deadlineAt: { gte: now },
    enterpriseUser: { enterpriseStatus: "APPROVED" }
  };
  if (q) { //nếu có từ khóa
    where.OR = [
      ...(q.length >= 2 ? [{ expertise: { contains: q, mode: "insensitive" } }] : []),
      ...(q.length >= 2 ? [{ enterpriseUser: { companyName: { contains: q, mode: "insensitive" } } }] : [])
    ];
  }
  if (workType !== "all") where.workType = workType; //nếu có kiểu làm việc

  // Dropdown tỉnh/thành: filter theo workLocation (không dùng enterpriseMeta)
  if (province !== "all") { //nếu có tỉnh/thành
    where.workLocation = { contains: province, mode: "insensitive" };
  }

  const profile = await prismaAny.studentProfile.findFirst({ //lấy hồ sơ sinh viên
    where: { userId }, //lấy id sinh viên
    select: { internshipStatus: true, faculty: true } //lấy trạng thái đăng ký thực tập và khoa
  });
  if (!profile) return NextResponse.json({ success: false, message: "Không tìm thấy hồ sơ sinh viên." }, { status: 404 });

  const applied = await prismaAny.jobApplication.findMany({ //lấy danh sách ứng tuyển
    where: { studentUserId: userId },
    select: { jobPostId: true }
  });
  const appliedIds = applied.map((x: any) => String(x.jobPostId)).filter(Boolean); //lấy danh sách id tin tuyển dụng
  const appliedSet = new Set(appliedIds); //lấy danh sách id tin tuyển dụng

  // Tra cứu ứng tuyển: chỉ hiển thị tin CHƯA ứng tuyển.
  // Các tin đã ứng tuyển được hiển thị ở màn "việc làm đã ứng tuyển".
  if (appliedIds.length) {
    where.id = { notIn: appliedIds };
  }

  const faculty = String(profile.faculty || "").trim(); 
  if (faculty) { //nếu có khoa
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : []),
      { OR: [{ allowedFaculties: { equals: [] } }, { allowedFaculties: { has: faculty } }] }
    ];
  }

  const rows = await prismaAny.jobPost.findMany({ //lấy danh sách tin tuyển dụng
    where,
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      expertise: true,
      salary: true,
      experienceRequirement: true,
      workType: true,
      deadlineAt: true,
      workLocation: true,
      enterpriseUser: { select: { companyName: true, enterpriseMeta: true } }
    }
  });

  const mapped = rows.map((r: any) => ({ //lấy danh sách tin tuyển dụng
      id: r.id,
      title: r.title,
      companyName: r.enterpriseUser?.companyName ?? "—",
      address: buildEnterpriseHeadquartersAddress(r.enterpriseUser?.enterpriseMeta),
      businessField: formatBusinessFields(r.enterpriseUser?.enterpriseMeta),
      province: "",
      expertise: r.expertise,
      salary: r.salary,
      experienceRequirement: r.experienceRequirement,
      workType: r.workType,
      deadlineAt: r.deadlineAt?.toISOString?.() ?? null,
      // Luôn false vì đã loại tin đã ứng tuyển ở query; giữ field để không đổi contract FE.
      hasApplied: appliedSet.has(r.id)
    }));

  let provinceOptions: string[] = [];
  try {
    const provinces = await fetchProvinceList();
    provinceOptions = provinces.map((p) => p.name).filter(Boolean).sort((a, b) => a.localeCompare(b, "vi"));
  } catch {
    provinceOptions = [];
  }

  const items = mapped.map(({ province: _p, ...rest }: any) => rest);

  return NextResponse.json({ //trả về danh sách tin tuyển dụng
    success: true,
    internshipStatus: profile.internshipStatus,
    canApply: profile.internshipStatus === "NOT_STARTED",
    provinceOptions,
    items
  });
}

