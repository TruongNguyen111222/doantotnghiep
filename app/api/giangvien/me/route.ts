import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth/jwt";
import { SESSION_COOKIE_NAME } from "@/lib/constants/auth/patterns";
import { prisma } from "@/lib/prisma";
import { fetchProvinceList, fetchWardsForProvince } from "@/lib/vn-open-api";

const PHONE_PATTERN = /^\d{8,12}$/;
const DEGREE_ALLOWED = ["MASTER", "PHD", "ASSOC_PROF", "PROF"] as const; //hàm xử lý bậc giảng viên
type Degree = (typeof DEGREE_ALLOWED)[number];

async function resolveProvinceWardNames(provinceCode: string, wardCode: string) {
  const provinces = await fetchProvinceList();
  const prov = provinces.find((p) => String(p.code) === String(provinceCode));
  if (!prov) return { provinceName: null as string | null, wardName: null as string | null };
  const wards = await fetchWardsForProvince(String(provinceCode));
  const ward = wards.find((w) => String(w.code) === String(wardCode));
  return { provinceName: prov.name, wardName: ward?.name ?? null };
}

async function getGiangVienUserId() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return { error: NextResponse.json({ success: false, message: "Vui lòng đăng nhập." }, { status: 401 }) };
  try {
    const verified = await verifySession(token);
    if (verified.role !== "giangvien") return { error: NextResponse.json({ success: false, message: "Không có quyền truy cập." }, { status: 403 }) };
    return { userId: verified.sub };
  } catch {
    return { error: NextResponse.json({ success: false, message: "Phiên đăng nhập không hợp lệ." }, { status: 401 }) };
  }
}

export async function GET() {
  const auth = await getGiangVienUserId();
  if ("error" in auth) return auth.error;
  const userId = auth.userId as string;

  const prismaAny = prisma as any;
  const row = await prismaAny.supervisorProfile.findFirst({ //lấy dữ liệu giảng viên từ database
    where: { userId },
    select: {
      id: true,
      faculty: true,
      degree: true,
      gender: true,
      birthDate: true,
      permanentProvinceCode: true,
      permanentProvinceName: true,
      permanentWardCode: true,
      permanentWardName: true,
      user: { select: { fullName: true, email: true, phone: true } }
    }
  });

  if (!row) return NextResponse.json({ success: false, message: "Không tìm thấy hồ sơ giảng viên." }, { status: 404 });

  return NextResponse.json({ //trả về dữ liệu giảng viên
    success: true,
    item: {
      fullName: row.user?.fullName ?? "",
      email: row.user?.email ?? "",
      phone: row.user?.phone ?? null,
      birthDate: row.birthDate?.toISOString?.() ?? null,
      gender: row.gender,
      faculty: row.faculty,
      degree: row.degree,
      permanentProvinceCode: row.permanentProvinceCode,
      permanentProvinceName: row.permanentProvinceName ?? null,
      permanentWardCode: row.permanentWardCode,
      permanentWardName: row.permanentWardName ?? null
    }
  });
}

type PatchBody = { //kiểu dữ liệu form chỉnh sửa tài khoản giảng viên
  phone: string;
  degree: Degree;
  permanentProvinceCode: string;
  permanentWardCode: string;
};

export async function PATCH(request: Request) { //hàm chỉnh sửa tài khoản giảng viên
  const auth = await getGiangVienUserId();
  if ("error" in auth) return auth.error;
  const userId = auth.userId as string;

  const prismaAny = prisma as any;
  const body = (await request.json()) as Partial<PatchBody>;

  const phone = String(body.phone || "").trim();
  const degree = body.degree as Degree;
  const permanentProvinceCode = String(body.permanentProvinceCode || "").trim();
  const permanentWardCode = String(body.permanentWardCode || "").trim();

  const errors: Record<string, string> = {};
  if (!PHONE_PATTERN.test(phone)) errors.phone = "Số điện thoại chỉ gồm số (8–12 ký tự).";
  if (!degree || !DEGREE_ALLOWED.includes(degree)) errors.degree = "Bậc không hợp lệ.";
  if (!permanentProvinceCode || !/^\d+$/.test(permanentProvinceCode)) errors.permanentProvinceCode = "Tỉnh/thành không hợp lệ.";
  if (!permanentWardCode || !/^\d+$/.test(permanentWardCode)) errors.permanentWardCode = "Phường/xã không hợp lệ.";

  if (Object.keys(errors).length) return NextResponse.json({ success: false, errors }, { status: 400 });

  const current = await prismaAny.supervisorProfile.findFirst({ where: { userId }, select: { id: true, userId: true } });
  if (!current) return NextResponse.json({ success: false, message: "Không tìm thấy hồ sơ giảng viên." }, { status: 404 });

  const existedPhone = await prismaAny.user.findFirst({ where: { phone, id: { not: userId } }, select: { id: true } });
  if (existedPhone) return NextResponse.json({ success: false, errors: { phone: "Số điện thoại đã tồn tại trong hệ thống." } }, { status: 400 });

  const { provinceName, wardName } = await resolveProvinceWardNames(permanentProvinceCode, permanentWardCode);
  if (!provinceName || !wardName) {
    return NextResponse.json(
      {
        success: false,
        errors: { permanentProvinceCode: "Tỉnh/thành hoặc phường/xã không tồn tại.", permanentWardCode: "Tỉnh/thành hoặc phường/xã không tồn tại." }
      },
      { status: 400 }
    );
  }

  await prismaAny.$transaction(async (tx: any) => { //cập nhật thông tin giảng viên
    await tx.user.update({ where: { id: userId }, data: { phone } }); //cập nhật số điện thoại giảng viên
    await tx.supervisorProfile.update({
      where: { id: current.id },
      data: {
        degree,
        permanentProvinceCode,
        permanentProvinceName: provinceName,
        permanentWardCode,
        permanentWardName: wardName
      }
    });
  });

  return NextResponse.json({ success: true, message: "Cập nhật tài khoản giảng viên thành công." });
}

