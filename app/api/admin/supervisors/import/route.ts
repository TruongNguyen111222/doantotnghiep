import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth/admin-session";
import { hashPassword } from "@/lib/auth/password";
import { AUTH_EMAIL_REGISTER_PATTERN } from "@/lib/constants/auth/patterns";
import { fetchProvinceList, fetchWardsForProvince } from "@/lib/vn-open-api";

const NAME_PATTERN = /^[\p{L}\s]{1,255}$/u;
const PHONE_PATTERN = /^\d{8,12}$/;
const KHOL_PATTERN = /^[\p{L}\d\s]{1,255}$/u;
//hàm kiểm tra tên giảng viên hướng dẫn
//
const ALLOWED_DEGREE_TEXT = new Map<string, "MASTER" | "PHD" | "ASSOC_PROF" | "PROF">([
  ["thac si", "MASTER"],
  ["tien si", "PHD"],
  ["pho giao su", "ASSOC_PROF"],
  ["giao su", "PROF"]
]);
//hàm kiểm tra giới tính giảng viên hướng dẫn
const ALLOWED_GENDER_TEXT = new Map<string, "MALE" | "FEMALE" | "OTHER">([ 
  ["nam", "MALE"],
  ["nu", "FEMALE"],
  ["khac", "OTHER"]
]);

function normalizeText(s: string) { //hàm chuyển đổi văn bản thành định dạng chuẩn
  return s
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}
 //hàm lấy mã tỉnh và mã huyện từ tên tỉnh và tên huyện
async function resolveFromNamesToCodes(provinceName: string, wardName: string) {
  const provinces = await fetchProvinceList();
  const provNeedle = normalizeText(provinceName);
  const prov =
    provinces.find((p) => normalizeText(p.name) === provNeedle) ??
    provinces.find((p) => {
      const hay = normalizeText(p.name);
      return hay.endsWith(provNeedle) || hay.includes(provNeedle) || provNeedle.includes(hay);
    });
  if (!prov) return { provinceCode: null as string | null, wardCode: null as string | null };
  const wards = await fetchWardsForProvince(String(prov.code));
  const wardNeedle = normalizeText(wardName);
  const ward =
    wards.find((w) => normalizeText(w.name) === wardNeedle) ??
    wards.find((w) => {
      const hay = normalizeText(w.name);
      return hay.endsWith(wardNeedle) || hay.includes(wardNeedle) || wardNeedle.includes(hay);
    });
  return { provinceCode: String(prov.code), wardCode: ward ? String(ward.code) : null };
}
 //hàm lấy tên tỉnh và huyện từ mã tỉnh và mã huyện
async function resolveProvinceWardNames(provinceCode: string, wardCode: string) {
  const provinces = await fetchProvinceList();
  const prov = provinces.find((p) => String(p.code) === String(provinceCode));
  if (!prov) return { provinceName: null as string | null, wardName: null as string | null };
  const wards = await fetchWardsForProvince(String(provinceCode));
  const ward = wards.find((w) => String(w.code) === String(wardCode));
  return { provinceName: prov.name, wardName: ward?.name ?? null };
}

type ImportRow = { //type dữ liệu giảng viên hướng dẫn
  line: number;
  fullName: string;
  phone: string;
  email: string;
  birthDate: string;
  gender: string;
  permanentProvinceName?: string;
  permanentWardName?: string;
  faculty: string;
  degree: string;
};

type PreparedRow = { //type dữ liệu giảng viên hướng dẫn
  line: number;
  fullName: string;
  phone: string;
  email: string;
  birthDate: string;
  passwordHash: string;
  gender: "MALE" | "FEMALE" | "OTHER";
  permanentProvinceCode: string;
  permanentProvinceName: string;
  permanentWardCode: string;
  permanentWardName: string;
  faculty: string;
  degree: "MASTER" | "PHD" | "ASSOC_PROF" | "PROF";
};

function validateRowFormat(row: ImportRow) { //hàm kiểm tra dữ liệu giảng viên hướng dẫn
  const line = row.line;
  const missing = (v: unknown) => v == null || String(v).trim() === "";
  const invalid = () => ({ ok: false as const, message: `Dòng ${line} có dữ liệu nhập vào không đúng định dạng. Vui lòng kiểm tra lại.` });

  const requiredMissing =
    missing(row.fullName) ||
    missing(row.phone) ||
    missing(row.email) ||
    missing(row.birthDate) ||
    missing(row.gender) ||
    missing(row.faculty) ||
    missing(row.degree) ||
    missing(row.permanentProvinceName) ||
    missing(row.permanentWardName);
  if (requiredMissing) return { ok: false as const, message: `Dòng ${line} trong file Excel thiếu dữ liệu. Vui lòng kiểm tra lại.` };

  if (!NAME_PATTERN.test(String(row.fullName).trim())) return invalid();
  if (!PHONE_PATTERN.test(String(row.phone).trim())) return invalid();
  if (!AUTH_EMAIL_REGISTER_PATTERN.test(String(row.email).trim())) return invalid();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(row.birthDate).trim())) return invalid();
  const birth = new Date(`${String(row.birthDate).trim()}T00:00:00.000Z`);
  if (Number.isNaN(birth.getTime())) return invalid();
  const age = (() => {
    const now = new Date();
    let a = now.getFullYear() - birth.getUTCFullYear();
    const m = now.getUTCMonth() - birth.getUTCMonth();
    if (m < 0 || (m === 0 && now.getUTCDate() < birth.getUTCDate())) a -= 1;
    return a;
  })();
  if (age < 18) return invalid();

  if (!KHOL_PATTERN.test(String(row.faculty).trim())) return invalid();
  if (!ALLOWED_DEGREE_TEXT.has(normalizeText(row.degree))) return invalid();
  if (!ALLOWED_GENDER_TEXT.has(normalizeText(row.gender))) return invalid();

  return { ok: true as const };
}
//hàm import giảng viên hướng dẫn từ API
export async function POST(request: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ message: "Không có quyền truy cập." }, { status: 403 });

  const body = (await request.json()) as { rows?: ImportRow[] };
  const rows = Array.isArray(body.rows) ? body.rows : [];
  if (!rows.length) return NextResponse.json({ success: false, message: "File Excel không có dữ liệu. Vui lòng kiểm tra lại." }, { status: 400 });

  const seenEmail = new Map<string, number>();
  const seenPhone = new Map<string, number>();

  for (const r of rows) {
    const v = validateRowFormat(r);
    if (!v.ok) return NextResponse.json({ success: false, message: v.message }, { status: 400 });

    const email = String(r.email).trim().toLowerCase();
    const phone = String(r.phone).trim();
    if (seenEmail.has(email) || seenPhone.has(phone)) {
      return NextResponse.json({ success: false, message: `Dòng ${r.line} đang bị trùng dữ liệu với một dòng khác trong file Excel. Vui lòng kiểm tra lại.` }, { status: 400 });
    }
    seenEmail.set(email, r.line);
    seenPhone.set(phone, r.line);
  }
 //lấy database
  const prismaAny = prisma as any;
  //lấy danh sách giảng viên hướng dẫn
  const prepared: PreparedRow[] = []; 
  for (const r of rows) { //lấy dữ liệu giảng viên hướng dẫn
    const line = r.line;
    const fullName = String(r.fullName).trim();
    const phone = String(r.phone).trim();
    const email = String(r.email).trim().toLowerCase();
    const birthDate = String(r.birthDate).trim();
    const passwordHash = await hashPassword(birthDate);

    const gender = ALLOWED_GENDER_TEXT.get(normalizeText(r.gender))!;
    const degree = ALLOWED_DEGREE_TEXT.get(normalizeText(r.degree))!;

    const resolved = await resolveFromNamesToCodes(String(r.permanentProvinceName || "").trim(), String(r.permanentWardName || "").trim());
    if (!resolved.provinceCode || !resolved.wardCode) {
      return NextResponse.json({ success: false, message: `Dòng ${line} có dữ liệu nhập vào không đúng định dạng. Vui lòng kiểm tra lại.` }, { status: 400 });
    }

    const names = await resolveProvinceWardNames(resolved.provinceCode, resolved.wardCode);
    if (!names.provinceName || !names.wardName) {
      return NextResponse.json({ success: false, message: `Dòng ${line} có dữ liệu nhập vào không đúng định dạng. Vui lòng kiểm tra lại.` }, { status: 400 });
    }

    prepared.push({ //thêm dữ liệu giảng viên hướng dẫn vào danh sách
      line,
      fullName,
      phone,
      email,
      birthDate,
      passwordHash,
      gender,
      permanentProvinceCode: resolved.provinceCode,
      permanentProvinceName: names.provinceName,
      permanentWardCode: resolved.wardCode,
      permanentWardName: names.wardName,
      faculty: String(r.faculty).trim(),
      degree
    });
  }
 //lấy danh sách email và số điện thoại giảng viên hướng dẫn
  const emails = prepared.map((r) => r.email);
  const phones = prepared.map((r) => r.phone);
  const existingUsers = await prismaAny.user.findMany({
    where: { OR: [{ email: { in: emails } }, { phone: { in: phones } }] },
    select: { id: true, role: true, email: true, phone: true }
  });
  const existingEmailSet = new Set(existingUsers.filter((u: any) => u.email).map((u: any) => String(u.email).toLowerCase()));
  const existingPhoneSet = new Set(existingUsers.filter((u: any) => u.phone).map((u: any) => String(u.phone)));
  const existingEmailMap = new Map<string, any>();
  const existingPhoneMap = new Map<string, any>();
  for (const u of existingUsers) {
    if (u.email) existingEmailMap.set(String(u.email).toLowerCase(), u);
    if (u.phone) existingPhoneMap.set(String(u.phone), u);
  }
 //kiểm tra dữ liệu giảng viên hướng dẫn
  for (const r of prepared) {
    const emailDup = existingEmailSet.has(r.email);
    const phoneDup = existingPhoneSet.has(r.phone);
    if (emailDup || phoneDup) {
      return NextResponse.json(
        {
          success: false,
          message: `Dòng ${r.line} trong file Excel chứa thông tin đã tồn tại trong hệ thống. Vui lòng kiểm tra lại.`,
          debug: {
            kind: "DUPLICATE_IN_SYSTEM",
            line: r.line,
            fields: { email: emailDup ? r.email : null, phone: phoneDup ? r.phone : null },
            existingMatches: { email: emailDup ? existingEmailMap.get(r.email) ?? null : null, phone: phoneDup ? existingPhoneMap.get(r.phone) ?? null : null }
          }
        },
        { status: 400 }
      );
    }
  }

  await prismaAny.$transaction( //tạo giảng viên hướng dẫn
    async (tx: any) => {
      for (const r of prepared) { //tạo tài khoản giảng viên hướng dẫn
        const user = await tx.user.create({
          data: {
            email: r.email,
            phone: r.phone,
            passwordHash: r.passwordHash,
            fullName: r.fullName,
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

        await tx.supervisorProfile.create({ //tạo thông tin giảng viên hướng dẫn
          data: {
            userId: user.id,
            faculty: r.faculty,
            degree: r.degree,
            gender: r.gender,
            birthDate: new Date(`${r.birthDate}T00:00:00.000Z`),
            permanentProvinceCode: r.permanentProvinceCode,
            permanentProvinceName: r.permanentProvinceName,
            permanentWardCode: r.permanentWardCode,
            permanentWardName: r.permanentWardName
          }
        });
      }
    },
    { timeout: 30_000 }
  );

  return NextResponse.json({ success: true, message: "Tạo danh sách GVHD thành công." });
}

