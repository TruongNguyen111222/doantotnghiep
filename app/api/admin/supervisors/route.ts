import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth/admin-session";
import { hashPassword } from "@/lib/auth/password";
import { AUTH_EMAIL_REGISTER_PATTERN } from "@/lib/constants/auth/patterns";
import { fetchProvinceList, fetchWardsForProvince } from "@/lib/vn-open-api";
import { ADMIN_QUAN_LY_GVHD_PAGE_SIZE } from "@/lib/constants/admin-quan-ly-gvhd";

const NAME_PATTERN = /^[\p{L}\s]{1,255}$/u; //hàm kiểm tra tên giảng viên hướng dẫn
const PHONE_PATTERN = /^\d{8,12}$/; //hàm kiểm tra số điện thoại giảng viên hướng dẫn
const KHOL_PATTERN = /^[\p{L}\d\s]{1,255}$/u; //hàm kiểm tra khoa giảng viên hướng dẫn

type Gender = "MALE" | "FEMALE" | "OTHER";
type Degree = "MASTER" | "PHD" | "ASSOC_PROF" | "PROF";

function parseDateOnly(input: string) { //hàm chuyển đổi ngày tháng năm thành định dạng ISO 8601
  return new Date(`${input}T00:00:00.000Z`);
}

function calcAge(date: Date, now = new Date()) { //hàm tính tuổi từ ngày sinh
  let age = now.getFullYear() - date.getUTCFullYear();
  const m = now.getUTCMonth() - date.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < date.getUTCDate())) age -= 1;
  return age;
}

async function resolveProvinceWardNames(provinceCode: string, wardCode: string) { //hàm lấy tên tỉnh và huyện từ mã tỉnh và mã huyện
  const provinces = await fetchProvinceList(); //lấy danh sách tỉnh thành từ API
  const prov = provinces.find((p) => String(p.code) === String(provinceCode));
  if (!prov) return { provinceName: null as string | null, wardName: null as string | null };
  const wards = await fetchWardsForProvince(String(provinceCode));
  const ward = wards.find((w) => String(w.code) === String(wardCode));
  return { provinceName: prov.name, wardName: ward?.name ?? null };
}

export async function GET(request: Request) { //hàm lấy danh sách giảng viên hướng dẫn
  const admin = await getAdminSession(); //lấy session admin
  if (!admin) return NextResponse.json({ message: "Không có quyền truy cập." }, { status: 403 });

  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() || "";
    const faculty = searchParams.get("faculty")?.trim() || "all";
    const degree = (searchParams.get("degree")?.trim() || "all") as Degree | "all";
    const page = Math.max(Number(searchParams.get("page") || "1") || 1, 1);
    const pageSize = Math.max(Number(searchParams.get("pageSize") || String(ADMIN_QUAN_LY_GVHD_PAGE_SIZE)) || ADMIN_QUAN_LY_GVHD_PAGE_SIZE, 1);

    const prismaAny = prisma as any;
    const where: any = {};
    const andParts: any[] = [];

    if (faculty && faculty !== "all") andParts.push({ faculty });
    if (degree && degree !== "all") andParts.push({ degree });
    if (q) {
      const isNumeric = /^\d+$/.test(q);
      const isEmailLike = q.includes("@") || q.includes(".");
      andParts.push({
        OR: [
          ...(q.length >= 2 ? [{ user: { fullName: { contains: q, mode: "insensitive" } } }] : []),
          ...(isNumeric ? [{ user: { phone: { startsWith: q } } }] : []),
          ...(isEmailLike ? [{ user: { email: { startsWith: q, mode: "insensitive" } } }] : [])
        ]
      });
    }
    if (andParts.length) where.AND = andParts; //nếu có điều kiện tìm kiếm thì thêm điều kiện tìm kiếm

    const totalItems = await prismaAny.supervisorProfile.count({ where }); //lấy tổng số giảng viên hướng dẫn
    const rows = await prismaAny.supervisorProfile.findMany({ //lấy danh sách giảng viên hướng dẫn
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        userId: true,
        faculty: true,
        degree: true,
        birthDate: true,
        gender: true,
        permanentProvinceCode: true,
        permanentProvinceName: true,
        permanentWardCode: true,
        permanentWardName: true,
        user: { select: { fullName: true, email: true, phone: true } }
      }
    });

    let faculties: string[] = []; 
    try { //lấy danh sách khoa giảng viên hướng dẫn
      const fRows = await prismaAny.supervisorProfile.findMany({ distinct: ["faculty"], select: { faculty: true } });
      faculties = fRows
        .map((r: any) => String(r.faculty))
        .filter(Boolean)
        .sort((a: string, b: string) => a.localeCompare(b, "vi"));
    } catch {
      faculties = [];
    }

    // --- Latest batch supervisor assignment stats (for cards) ---
    let latestBatchSupervisorStats: { //thống kê giảng viên hướng dẫn đã phân công và chưa phân công
      batchId: string | null;
      batchName: string | null;
      assigned: number;
      unassigned: number;
    } = { batchId: null, batchName: null, assigned: 0, unassigned: 0 };

    try {
      const latestBatch: { id: string; name: string } | null = await prismaAny.internshipBatch.findFirst({
        orderBy: { startDate: "desc" },
        select: { id: true, name: true }
      });

      if (latestBatch?.id) { //nếu có đợt thực tập mới nhất thì lấy thống kê giảng viên hướng dẫn đã phân công và chưa phân công
        const batchId = String(latestBatch.id);
        const totalSupervisors = await prismaAny.supervisorProfile.count(); //lấy tổng số giảng viên hướng dẫn
        const assignedDistinct = await prismaAny.supervisorAssignment.count({ //lấy tổng số giảng viên hướng dẫn đã phân công
          where: { internshipBatchId: batchId },
          distinct: ["supervisorProfileId"]
        });

        latestBatchSupervisorStats = { //thống kê giảng viên hướng dẫn đã phân công và chưa phân công
          batchId,
          batchName: latestBatch.name ?? null,
          assigned: assignedDistinct ?? 0,
          unassigned: Math.max(0, (totalSupervisors ?? 0) - (assignedDistinct ?? 0))
        };
      }
    } catch (e) {
      console.error("[GET /api/admin/supervisors] latestBatchSupervisorStats error", e);
    }

    return NextResponse.json({ //trả về danh sách giảng viên hướng dẫn
      success: true,
      latestBatchSupervisorStats,
      items: rows.map((r: any) => ({ //lấy thông tin giảng viên hướng dẫn
        id: r.id,
        fullName: r.user?.fullName ?? "",
        phone: r.user?.phone ?? null,
        email: r.user?.email ?? "",
        faculty: r.faculty,
        degree: r.degree as Degree,
        birthDate: r.birthDate?.toISOString?.() ?? null,
        gender: r.gender as Gender,
        permanentProvinceCode: r.permanentProvinceCode,
        permanentProvinceName: r.permanentProvinceName ?? null,
        permanentWardCode: r.permanentWardCode,
        permanentWardName: r.permanentWardName ?? null
      })),
      faculties,
      page,
      pageSize,
      totalItems
    });
  } catch (e) {
    console.error("[GET /api/admin/supervisors]", e);
    return NextResponse.json({ success: false, message: "Lỗi máy chủ." }, { status: 500 });
  }
}

type CreateSupervisorBody = { //type dữ liệu giảng viên hướng dẫn
  fullName: string;
  phone: string;
  email: string;
  birthDate: string;
  gender: Gender;
  permanentProvinceCode: string;
  permanentWardCode: string;
  faculty: string;
  degree: Degree;
};

function validateCreate(body: CreateSupervisorBody) { //hàm kiểm tra dữ liệu giảng viên hướng dẫn
  const errors: Record<string, string> = {};

  const fullName = (body.fullName || "").trim();
  if (!fullName || !NAME_PATTERN.test(fullName)) errors.fullName = "Họ tên chỉ gồm chữ và dấu cách (1–255 ký tự).";

  const phone = (body.phone || "").trim();
  if (!PHONE_PATTERN.test(phone)) errors.phone = "Số điện thoại chỉ gồm số (8–12 ký tự).";

  const email = (body.email || "").trim();
  if (!AUTH_EMAIL_REGISTER_PATTERN.test(email)) errors.email = "Email không đúng định dạng (ví dụ: example@domain.com).";

  const birthDateStr = (body.birthDate || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDateStr)) errors.birthDate = "Ngày sinh không hợp lệ (YYYY-MM-DD).";
  else {
    const birth = parseDateOnly(birthDateStr);
    if (Number.isNaN(birth.getTime())) errors.birthDate = "Ngày sinh không hợp lệ.";
    else if (calcAge(birth) < 18) errors.birthDate = "Giảng viên hướng dẫn phải đủ 18 tuổi trở lên.";
  }

  if (!body.gender || !["MALE", "FEMALE", "OTHER"].includes(String(body.gender))) errors.gender = "Giới tính không hợp lệ.";

  const provinceCode = (body.permanentProvinceCode || "").trim();
  const wardCode = (body.permanentWardCode || "").trim();
  if (!provinceCode || !/^\d+$/.test(provinceCode)) errors.permanentProvinceCode = "Tỉnh/thành không hợp lệ.";
  if (!wardCode || !/^\d+$/.test(wardCode)) errors.permanentWardCode = "Phường/xã không hợp lệ.";

  const faculty = (body.faculty || "").trim();
  if (!faculty || !KHOL_PATTERN.test(faculty)) errors.faculty = "Khoa bắt buộc.";

  if (!body.degree || !["MASTER", "PHD", "ASSOC_PROF", "PROF"].includes(String(body.degree))) errors.degree = "Bậc không hợp lệ.";

  return errors;
}

export async function POST(request: Request) { //hàm tạo giảng viên hướng dẫn
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ message: "Không có quyền truy cập." }, { status: 403 });

  const body = (await request.json()) as CreateSupervisorBody;
  const errors = validateCreate(body);
  if (Object.keys(errors).length) return NextResponse.json({ success: false, errors }, { status: 400 });

  const prismaAny = prisma as any;
  const email = body.email.trim().toLowerCase();
  const phone = body.phone.trim();

  const existingEmail = await prismaAny.user.findUnique({ where: { email }, select: { id: true } });
  const existingPhone = await prismaAny.user.findUnique({ where: { phone }, select: { id: true } });
  const uniqErrors: Record<string, string> = {};
  if (existingEmail) uniqErrors.email = "Email đã tồn tại trong hệ thống.";
  if (existingPhone) uniqErrors.phone = "Số điện thoại đã tồn tại trong hệ thống.";
  if (Object.keys(uniqErrors).length) return NextResponse.json({ success: false, errors: uniqErrors }, { status: 400 });

  const { provinceName, wardName } = await resolveProvinceWardNames(body.permanentProvinceCode, body.permanentWardCode);
  if (!provinceName || !wardName) {
    return NextResponse.json(
      { success: false, errors: { permanentProvinceCode: "Tỉnh/thành hoặc phường/xã không tồn tại.", permanentWardCode: "Tỉnh/thành hoặc phường/xã không tồn tại." } },
      { status: 400 }
    );
  }

  const birthDateStr = body.birthDate.trim(); //lấy ngày sinh giảng viên hướng dẫn
  const passwordHash = await hashPassword(birthDateStr); //mã hóa mật khẩu từ ngày sinh

  const user = await prismaAny.user.create({ //tạo tài khoản giảng viên hướng dẫn
    data: {
      email,
      phone,
      passwordHash,
      fullName: body.fullName.trim(),
      role: "giangvien",
      isLocked: false,
      enterpriseStatus: null,
      companyName: null,
      taxCode: null,
      representativeTitle: null,
      enterpriseMeta: null
    },
    select: { id: true }
  });

  await prismaAny.supervisorProfile.create({ //tạo thông tin giảng viên hướng dẫn
    data: {
      userId: user.id,
      faculty: body.faculty.trim(),
      degree: body.degree,
      gender: body.gender,
      birthDate: parseDateOnly(birthDateStr),
      permanentProvinceCode: body.permanentProvinceCode.trim(),
      permanentProvinceName: provinceName,
      permanentWardCode: body.permanentWardCode.trim(),
      permanentWardName: wardName
    }
  });

  return NextResponse.json({ success: true, message: "Tạo GVHD thành công." });
}

