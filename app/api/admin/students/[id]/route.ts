import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth/admin-session";
import { AUTH_EMAIL_REGISTER_PATTERN } from "@/lib/constants/auth/patterns"; //hằng số email đăng ký
import { fetchProvinceList, fetchWardsForProvince } from "@/lib/vn-open-api";

const MSV_PATTERN = /^\d{8,15}$/; //pattern mã sinh viên
const NAME_PATTERN = /^[\p{L}\s]{1,255}$/u;
const PHONE_PATTERN = /^\d{8,12}$/; //pattern số điện thoại
const CLASS_PATTERN = /^[\p{L}\d]{1,255}$/u; //pattern lớp
const KHOL_PATTERN = /^[\p{L}\d]{1,10}$/u; //pattern khóa
const GENDER_VALUES = ["MALE", "FEMALE", "OTHER"] as const; //giá trị giới tính
const DEGREE_VALUES = ["BACHELOR", "ENGINEER"] as const; //giá trị bậc
const INTERNSHIP_STATUS_VALUES = ["NOT_STARTED", "DOING", "SELF_FINANCED", "REPORT_SUBMITTED", "COMPLETED", "REJECTED"] as const;

type Degree = (typeof DEGREE_VALUES)[number]; //type bậc
type Gender = (typeof GENDER_VALUES)[number]; //type giới tính
type InternshipStatus = (typeof INTERNSHIP_STATUS_VALUES)[number]; //type trạng thái thực tập

function parseDateOnly(input: string) { //hàm chuyển đổi ngày tháng năm thành định dạng YYYY-MM-DD
  return new Date(`${input}T00:00:00.000Z`);
}

function calcAge(date: Date, now = new Date()) { //hàm tính tuổi từ ngày sinh
  let age = now.getFullYear() - date.getUTCFullYear(); //tuổi
  const m = now.getUTCMonth() - date.getUTCMonth(); //tháng
  if (m < 0 || (m === 0 && now.getUTCDate() < date.getUTCDate())) age -= 1; //nếu tháng nhỏ hơn 0 hoặc tháng bằng 0 và ngày nhỏ hơn ngày thì trừ 1 tuổi
  return age; //trả về tuổi
}

async function resolveProvinceWardNames(provinceCode: string, wardCode: string) { //hàm lấy tên tỉnh và huyện từ mã tỉnh và mã huyện
  const provinces = await fetchProvinceList(); //gọi hàm lấy danh sách tỉnh/thành từ API
  const prov = provinces.find((p) => String(p.code) === String(provinceCode));
  if (!prov) return { provinceName: null as string | null, wardName: null as string | null };
  const wards = await fetchWardsForProvince(String(provinceCode)); //gọi hàm lấy danh sách huyện/xã từ API
  const ward = wards.find((w) => String(w.code) === String(wardCode));
  return { provinceName: prov.name, wardName: ward?.name ?? null }; //trả về tên tỉnh và huyện
}

type PatchStudentBody = { //type dữ liệu sinh viên
  msv: string;
  fullName: string;
  className: string;
  faculty: string;
  cohort: string;
  degree: Degree;
  phone: string;
  email: string;
  birthDate: string;
  gender: Gender;
  permanentProvinceCode: string;
  permanentWardCode: string;
};

function validateCommon(body: PatchStudentBody) { //hàm kiểm tra dữ liệu sinh viên
  const errors: Record<string, string> = {}; 

  const msv = (body.msv || "").trim();
  if (!MSV_PATTERN.test(msv)) errors.msv = "Mã sinh viên chỉ gồm số (8–15 ký tự).";

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
    else {
      const age = calcAge(birth);
      if (age < 18) errors.birthDate = "Sinh viên phải đủ 18 tuổi trở lên.";
      if (birth.getTime() > Date.now()) errors.birthDate = "Ngày sinh không hợp lệ.";
    }
  }

  if (!body.gender || !GENDER_VALUES.includes(body.gender)) errors.gender = "Giới tính không hợp lệ.";
  if (!body.degree || !DEGREE_VALUES.includes(body.degree)) errors.degree = "Bậc không hợp lệ.";

  const provinceCode = (body.permanentProvinceCode || "").trim(); //mã tỉnh
  const wardCode = (body.permanentWardCode || "").trim(); //mã huyện
  if (!provinceCode || !/^\d+$/.test(provinceCode)) errors.permanentProvinceCode = "Tỉnh/thành không hợp lệ.";
  if (!wardCode || !/^\d+$/.test(wardCode)) errors.permanentWardCode = "Phường/xã không hợp lệ.";

  const className = (body.className || "").trim();
  if (!className || !CLASS_PATTERN.test(className)) errors.className = "Lớp chỉ gồm chữ và số (1–255 ký tự).";

  const faculty = (body.faculty || "").trim();
  if (!faculty) errors.faculty = "Khoa bắt buộc.";

  const cohort = (body.cohort || "").trim();
  if (!KHOL_PATTERN.test(cohort)) errors.cohort = "Khóa chỉ gồm chữ và số (1–10 ký tự).";

  return errors;
}

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) { //hàm lấy dữ liệu sinh viên từ API
  const admin = await getAdminSession(); //gọi hàm lấy session admin
  if (!admin) return NextResponse.json({ message: "Không có quyền truy cập." }, { status: 403 });

  const { id } = await ctx.params;
  const prismaAny = prisma as any;

  const row = await prismaAny.studentProfile.findFirst({ //tìm kiếm sinh viên theo id
    where: { id },
    select: {
      id: true,
      userId: true,
      msv: true,
      className: true,
      faculty: true,
      cohort: true,
      degree: true,
      gender: true,
      birthDate: true,
      permanentProvinceCode: true,
      permanentProvinceName: true,
      permanentWardCode: true,
      permanentWardName: true,
      internshipStatus: true,
      user: { select: { fullName: true, email: true, phone: true } }
    }
  });

  if (!row) return NextResponse.json({ success: false, message: "Không tìm thấy sinh viên." }, { status: 404 });

  return NextResponse.json({ //trả về dữ liệu sinh viên
    success: true,
    item: {
      id: row.id,
      userId: row.userId,
      msv: row.msv,
      fullName: row.user?.fullName ?? "",
      className: row.className,
      faculty: row.faculty,
      cohort: row.cohort,
      degree: row.degree as Degree,
      gender: row.gender as Gender,
      phone: row.user?.phone ?? null,
      email: row.user?.email ?? "",
      birthDate: row.birthDate?.toISOString?.() ?? null,
      permanentProvinceCode: row.permanentProvinceCode,
      permanentProvinceName: row.permanentProvinceName ?? null,
      permanentWardCode: row.permanentWardCode,
      permanentWardName: row.permanentWardName ?? null,
      internshipStatus: row.internshipStatus as InternshipStatus
    }
  });
}

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) { //hàm cập nhật dữ liệu sinh viên từ API
  const admin = await getAdminSession(); //gọi hàm lấy session admin
  if (!admin) return NextResponse.json({ message: "Không có quyền truy cập." }, { status: 403 });

  const { id } = await ctx.params;
  const body = (await request.json()) as PatchStudentBody;

  const prismaAny = prisma as any;
  const current = await prismaAny.studentProfile.findFirst({ where: { id }, select: { userId: true, msv: true } });
  if (!current) return NextResponse.json({ success: false, message: "Không tìm thấy sinh viên." }, { status: 404 });

  const errors = validateCommon(body);
  if (Object.keys(errors).length) return NextResponse.json({ success: false, errors }, { status: 400 });

  const existingEmail = await prismaAny.user.findUnique({ where: { email: body.email.trim() }, select: { id: true } });
  if (existingEmail && existingEmail.id !== current.userId) {
    return NextResponse.json({ success: false, errors: { email: "Email đã tồn tại trong hệ thống." } }, { status: 400 });
  }
  const existingPhone = await prismaAny.user.findUnique({ where: { phone: body.phone.trim() }, select: { id: true } });
  if (existingPhone && existingPhone.id !== current.userId) {
    return NextResponse.json({ success: false, errors: { phone: "Số điện thoại đã tồn tại trong hệ thống." } }, { status: 400 });
  }
  const existingMsv = await prismaAny.studentProfile.findUnique({ where: { msv: body.msv.trim() }, select: { id: true } });
  if (existingMsv && existingMsv.id !== id) {
    return NextResponse.json({ success: false, errors: { msv: "Mã sinh viên đã tồn tại trong hệ thống." } }, { status: 400 });
  }

  const { provinceName, wardName } = await resolveProvinceWardNames(body.permanentProvinceCode, body.permanentWardCode);
  if (!provinceName || !wardName) {
    return NextResponse.json(
      { success: false, errors: { permanentProvinceCode: "Tỉnh/thành hoặc phường/xã không tồn tại.", permanentWardCode: "Tỉnh/thành hoặc phường/xã không tồn tại." } },
      { status: 400 }
    );
  }

  await prismaAny.user.update({ //cập nhật thông tin sinh viên 
    where: { id: current.userId },
    data: {
      fullName: body.fullName.trim(),
      phone: body.phone.trim(),
      email: body.email.trim().toLowerCase()
    }
  });

  await prismaAny.studentProfile.update({ //cập nhật thông tin sinh viên 
    where: { id },
    data: {
      msv: body.msv.trim(),
      className: body.className.trim(),
      faculty: body.faculty.trim(),
      cohort: body.cohort.trim(),
      degree: body.degree,
      gender: body.gender,
      birthDate: parseDateOnly(body.birthDate.trim()),
      permanentProvinceCode: body.permanentProvinceCode.trim(),
      permanentProvinceName: provinceName,
      permanentWardCode: body.permanentWardCode.trim(),
      permanentWardName: wardName
    }
  });

  return NextResponse.json({ success: true, message: "Cập nhật sinh viên thành công." });
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) { //hàm xóa sinh viên từ API
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ message: "Không có quyền truy cập." }, { status: 403 });

  const { id } = await ctx.params;
  const prismaAny = prisma as any;

  const current = await prismaAny.studentProfile.findFirst({ where: { id }, select: { userId: true, msv: true, user: { select: { fullName: true } } } });
  if (!current) return NextResponse.json({ success: false, message: "Không tìm thấy sinh viên." }, { status: 404 });

  const appCount = await prismaAny.jobApplication.count({ where: { studentUserId: current.userId } });
  if (appCount > 0) {
    return NextResponse.json(
      { success: false, message: "Không thể xóa sinh viên đã có dữ liệu liên kết trong hệ thống." },
      { status: 400 }
    );
  }

  await prismaAny.studentProfile.deleteMany({ where: { userId: current.userId } });
  await prismaAny.user.delete({ where: { id: current.userId } });

  return NextResponse.json({ success: true, message: "Xóa sinh viên thành công." });
}

