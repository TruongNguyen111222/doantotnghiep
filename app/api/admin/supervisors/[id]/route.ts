import { NextResponse } from "next/server"; 
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth/admin-session";
import { AUTH_EMAIL_REGISTER_PATTERN } from "@/lib/constants/auth/patterns";
import { fetchProvinceList, fetchWardsForProvince } from "@/lib/vn-open-api";

const NAME_PATTERN = /^[\p{L}\s]{1,255}$/u;
const PHONE_PATTERN = /^\d{8,12}$/;
const KHOL_PATTERN = /^[\p{L}\d\s]{1,255}$/u;

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
//hàm lấy tên tỉnh và huyện từ mã tỉnh và mã huyện
async function resolveProvinceWardNames(provinceCode: string, wardCode: string) {
  const provinces = await fetchProvinceList(); //lấy danh sách tỉnh thành từ API
  const prov = provinces.find((p) => String(p.code) === String(provinceCode)); //lấy tỉnh thành từ danh sách tỉnh thành
  if (!prov) return { provinceName: null as string | null, wardName: null as string | null }; //nếu không tìm thấy tỉnh thành thì trả về null
  const wards = await fetchWardsForProvince(String(provinceCode)); //lấy danh sách huyện từ API
  const ward = wards.find((w) => String(w.code) === String(wardCode)); //lấy huyện từ danh sách huyện
  return { provinceName: prov.name, wardName: ward?.name ?? null }; //trả về tên tỉnh và huyện
}
//type dữ liệu giảng viên hướng dẫn
type PatchSupervisorBody = {
  fullName: string;
  phone: string;
  email: string;
  birthDate: string;
  gender: Gender;
  permanentProvinceCode: string;
  permanentWardCode: string;
  faculty: string;
  degree: Degree;
  isExternalTeacher?: boolean;
};

function validateCommon(body: PatchSupervisorBody) { //hàm kiểm tra dữ liệu giảng viên hướng dẫn
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
    else if (calcAge(birth) < 18) errors.birthDate = "GVHD phải đủ 18 tuổi trở lên.";
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
//hàm lấy thông tin giảng viên hướng dẫn
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await getAdminSession(); //lấy session admin
  if (!admin) return NextResponse.json({ message: "Không có quyền truy cập." }, { status: 403 });

  const { id } = await ctx.params;
  const prismaAny = prisma as any;

  const row = await prismaAny.supervisorProfile.findFirst({ //lấy thông tin giảng viên hướng dẫn từ database
    where: { id },
    select: {
      id: true,
      userId: true,
      faculty: true,
      degree: true,
      isExternalTeacher: true,
      gender: true,
      birthDate: true,
      permanentProvinceCode: true,
      permanentProvinceName: true,
      permanentWardCode: true,
      permanentWardName: true,
      user: { select: { fullName: true, email: true, phone: true } }
    }
  });

  if (!row) return NextResponse.json({ success: false, message: "Không tìm thấy GVHD." }, { status: 404 });

  return NextResponse.json({ //trả về thông tin giảng viên hướng dẫn
    success: true,
    item: {
      id: row.id,
      userId: row.userId,
      fullName: row.user?.fullName ?? "",
      phone: row.user?.phone ?? null,
      email: row.user?.email ?? "",
      birthDate: row.birthDate?.toISOString?.() ?? null,
      gender: row.gender as Gender,
      permanentProvinceCode: row.permanentProvinceCode,
      permanentProvinceName: row.permanentProvinceName ?? null,
      permanentWardCode: row.permanentWardCode,
      permanentWardName: row.permanentWardName ?? null,
      faculty: row.faculty,
      degree: row.degree as Degree,
      isExternalTeacher: Boolean(row.isExternalTeacher)
    }
  });
}
//hàm sửa thông tin giảng viên hướng dẫn
export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await getAdminSession(); //lấy session admin
  if (!admin) return NextResponse.json({ message: "Không có quyền truy cập." }, { status: 403 });

  const { id } = await ctx.params; //lấy id giảng viên hướng dẫn
  const body = (await request.json()) as PatchSupervisorBody;

  const prismaAny = prisma as any; //lấy database
  const current = await prismaAny.supervisorProfile.findFirst({ where: { id }, select: { userId: true } });
  if (!current) return NextResponse.json({ success: false, message: "Không tìm thấy GVHD." }, { status: 404 });

  const errors = validateCommon(body); //kiểm tra dữ liệu giảng viên hướng dẫn
  if (Object.keys(errors).length) return NextResponse.json({ success: false, errors }, { status: 400 });

  const phone = body.phone.trim(); //lấy số điện thoại giảng viên hướng dẫn
  const existingPhone = await prismaAny.user.findUnique({ where: { phone }, select: { id: true } });
  if (existingPhone && existingPhone.id !== current.userId) {
    return NextResponse.json({ success: false, errors: { phone: "Số điện thoại đã tồn tại trong hệ thống." } }, { status: 400 });
  }

  const { provinceName, wardName } = await resolveProvinceWardNames(body.permanentProvinceCode, body.permanentWardCode);
  if (!provinceName || !wardName) {
    return NextResponse.json(
      { success: false, errors: { permanentProvinceCode: "Tỉnh/thành hoặc phường/xã không tồn tại.", permanentWardCode: "Tỉnh/thành hoặc phường/xã không tồn tại." } },
      { status: 400 }
    );
  }

  await prismaAny.user.update({ //cập nhật thông tin giảng viên hướng dẫn
    where: { id: current.userId },
    data: {
      fullName: body.fullName.trim(),
      phone
    }
  });

  await prismaAny.supervisorProfile.update({ //cập nhật thông tin giảng viên hướng dẫn
    where: { id },
    data: {
      faculty: body.faculty.trim(),
      degree: body.degree,
      isExternalTeacher: Boolean(body.isExternalTeacher),
      gender: body.gender,
      birthDate: parseDateOnly(body.birthDate.trim()),
      permanentProvinceCode: body.permanentProvinceCode.trim(),
      permanentProvinceName: provinceName,
      permanentWardCode: body.permanentWardCode.trim(),
      permanentWardName: wardName
    }
  });

  return NextResponse.json({ success: true, message: "Cập nhật GVHD thành công." });
}
//hàm xóa giảng viên hướng dẫn
export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ message: "Không có quyền truy cập." }, { status: 403 });

  const { id } = await ctx.params;
  const prismaAny = prisma as any;

  const current = await prismaAny.supervisorProfile.findFirst({ where: { id }, select: { userId: true, faculty: true, degree: true, user: { select: { fullName: true } } } });
  if (!current) return NextResponse.json({ success: false, message: "Không tìm thấy GVHD." }, { status: 404 });

  const linkedApps = await prismaAny.jobApplication.count({ where: { studentUserId: current.userId } });
  const linkedPosts = await prismaAny.jobPost.count({ where: { enterpriseUserId: current.userId } });
  if (linkedApps > 0 || linkedPosts > 0) {
    return NextResponse.json({ success: false, message: "Không thể xóa GVHD đã có dữ liệu liên kết trong hệ thống." }, { status: 400 });
  }

  await prismaAny.supervisorProfile.deleteMany({ where: { userId: current.userId } }); //xóa thông tin giảng viên hướng dẫn
  await prismaAny.user.delete({ where: { id: current.userId } }); //xóa tài khoản giảng viên hướng dẫn

  return NextResponse.json({ success: true, message: "Xóa GVHD thành công." });
}

