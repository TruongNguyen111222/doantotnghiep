import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth/admin-session";
import { hashPassword } from "@/lib/auth/password";
import { AUTH_EMAIL_REGISTER_PATTERN } from "@/lib/constants/auth/patterns";
import { fetchProvinceList, fetchWardsForProvince } from "@/lib/vn-open-api";

const MSV_PATTERN = /^\d{8,15}$/;
const NAME_PATTERN = /^[\p{L}\s]{1,255}$/u;
const PHONE_PATTERN = /^\d{8,12}$/;
const CLASS_PATTERN = /^[\p{L}\d]{1,255}$/u;
const KHOL_PATTERN = /^[\p{L}\d]{1,10}$/u;

const ALLOWED_DEGREE_TEXT = new Map<string, "BACHELOR" | "ENGINEER">([ //map bậc
  ["cu nhan", "BACHELOR"],
  ["ky su", "ENGINEER"]
]);

const ALLOWED_GENDER_TEXT = new Map<string, "MALE" | "FEMALE" | "OTHER">([
  ["nam", "MALE"],
  ["nu", "FEMALE"],
  ["khac", "OTHER"]
]);

async function resolveFromNamesToCodes(provinceName: string, wardName: string) { //hàm lấy mã tỉnh và mã huyện từ tên tỉnh và tên huyện
  const provinces = await fetchProvinceList();
  const provNeedle = normalizeText(provinceName); //lấy tên tỉnh
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

async function resolveProvinceWardNames(provinceCode: string, wardCode: string) { //hàm lấy tên tỉnh và huyện từ mã tỉnh và mã huyện
  const provinces = await fetchProvinceList();
  const prov = provinces.find((p) => String(p.code) === String(provinceCode));
  if (!prov) return { provinceName: null as string | null, wardName: null as string | null };
  const wards = await fetchWardsForProvince(String(provinceCode));
  const ward = wards.find((w) => String(w.code) === String(wardCode));
  return { provinceName: prov.name, wardName: ward?.name ?? null };
}
 
type ImportRow = { //type dữ liệu sinh viên
  line: number;
  msv: string;
  fullName: string;
  className: string;
  faculty: string;
  cohort: string;
  degree: string;
  phone: string;
  email: string;
  birthDate: string;
  gender: string;
  permanentProvinceCode?: string;
  permanentWardCode?: string;
  permanentProvinceName?: string;
  permanentWardName?: string;
};

type PreparedRow = {
  line: number;
  msv: string;
  fullName: string;
  className: string;
  faculty: string;
  cohort: string;
  degree: "BACHELOR" | "ENGINEER";
  phone: string;
  email: string;
  birthDate: string;
  passwordHash: string;
  gender: "MALE" | "FEMALE" | "OTHER";
  permanentProvinceCode: string;
  permanentProvinceName: string;
  permanentWardCode: string;
  permanentWardName: string;
};

function normalizeText(s: string) { //hàm chuyển đổi text thành lowercase và loại bỏ dấu
  return s
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function validateRowFormat(row: ImportRow) {
  const line = row.line;
  const missing = (v: unknown) => v == null || String(v).trim() === "";
  const invalid = () => ({ ok: false as const, message: `Dòng ${line} có dữ liệu nhập vào không đúng định dạng. Vui lòng kiểm tra lại.` });
  const requiredMissing =
    missing(row.msv) ||
    missing(row.fullName) ||
    missing(row.className) ||
    missing(row.faculty) ||
    missing(row.cohort) ||
    missing(row.phone) ||
    missing(row.email) ||
    missing(row.birthDate) ||
    missing(row.gender) ||
    missing(row.degree) ||
    (missing(row.permanentProvinceCode) && missing(row.permanentProvinceName)) ||
    (missing(row.permanentWardCode) && missing(row.permanentWardName));

  if (requiredMissing) return { ok: false as const, message: `Dòng ${line} trong file Excel thiếu dữ liệu. Vui lòng kiểm tra lại.` };

  if (!MSV_PATTERN.test(String(row.msv).trim())) return invalid();
  if (!NAME_PATTERN.test(String(row.fullName).trim())) return invalid();
  if (!PHONE_PATTERN.test(String(row.phone).trim())) return invalid();
  if (!AUTH_EMAIL_REGISTER_PATTERN.test(String(row.email).trim())) return invalid();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(row.birthDate).trim())) return invalid();

  const birth = new Date(`${String(row.birthDate).trim()}T00:00:00.000Z`);
  if (Number.isNaN(birth.getTime())) return invalid();
  const age = (() => {
    let a = new Date().getFullYear() - birth.getUTCFullYear();
    const m = new Date().getUTCMonth() - birth.getUTCMonth();
    if (m < 0 || (m === 0 && new Date().getUTCDate() < birth.getUTCDate())) a -= 1;
    return a;
  })();
  if (age < 18) return invalid();

  if (!CLASS_PATTERN.test(String(row.className).trim())) return invalid();
  if (!KHOL_PATTERN.test(String(row.cohort).trim())) return invalid();

  const provinceOk = !missing(row.permanentProvinceCode) || !missing(row.permanentProvinceName);
  const wardOk = !missing(row.permanentWardCode) || !missing(row.permanentWardName);
  if (!provinceOk || !wardOk) return invalid();

  const degreeNorm = normalizeText(row.degree);
  const genderNorm = normalizeText(row.gender);
  if (!ALLOWED_DEGREE_TEXT.has(degreeNorm)) return invalid();
  if (!ALLOWED_GENDER_TEXT.has(genderNorm)) return invalid();

  return { ok: true as const };
}

export async function POST(request: Request) { //hàm import sinh viên từ API
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ message: "Không có quyền truy cập." }, { status: 403 });

  const body = (await request.json()) as { rows?: ImportRow[] };
  const rows = Array.isArray(body.rows) ? body.rows : [];
  if (!rows.length) return NextResponse.json({ success: false, message: "File Excel không có dữ liệu. Vui lòng kiểm tra lại." }, { status: 400 });

  const seenMsv = new Map<string, number>();
  const seenEmail = new Map<string, number>();
  const seenPhone = new Map<string, number>();

  for (const r of rows) {
    const v = validateRowFormat(r);
    if (!v.ok) return NextResponse.json({ success: false, message: v.message }, { status: 400 });

    const msv = String(r.msv).trim();
    const email = String(r.email).trim().toLowerCase();
    const phone = String(r.phone).trim();

    if (seenMsv.has(msv))
      return NextResponse.json({ success: false, message: `Dòng ${r.line} đang bị trùng dữ liệu với một dòng khác trong file Excel. Vui lòng kiểm tra lại.` }, { status: 400 });
    if (seenEmail.has(email))
      return NextResponse.json({ success: false, message: `Dòng ${r.line} đang bị trùng dữ liệu với một dòng khác trong file Excel. Vui lòng kiểm tra lại.` }, { status: 400 });
    if (seenPhone.has(phone))
      return NextResponse.json({ success: false, message: `Dòng ${r.line} đang bị trùng dữ liệu với một dòng khác trong file Excel. Vui lòng kiểm tra lại.` }, { status: 400 });

    seenMsv.set(msv, r.line);
    seenEmail.set(email, r.line);
    seenPhone.set(phone, r.line);
  }

  const prismaAny = prisma as any;

  const prepared: PreparedRow[] = [];
  for (const r of rows) {
    const line = r.line;
    const msv = String(r.msv).trim();
    const fullName = String(r.fullName).trim();
    const className = String(r.className).trim();
    const faculty = String(r.faculty).trim();
    const cohort = String(r.cohort).trim();
    const phone = String(r.phone).trim();
    const email = String(r.email).trim().toLowerCase();
    const birthDate = String(r.birthDate).trim();
    const passwordHash = await hashPassword(birthDate);

    const degreeNorm = normalizeText(r.degree);
    const genderNorm = normalizeText(r.gender);
    const degree = ALLOWED_DEGREE_TEXT.get(degreeNorm) as "BACHELOR" | "ENGINEER" | undefined;
    const gender = ALLOWED_GENDER_TEXT.get(genderNorm) as "MALE" | "FEMALE" | "OTHER" | undefined;
    if (!degree || !gender) {
      return NextResponse.json({ success: false, message: `Dòng ${line} có dữ liệu nhập vào không đúng định dạng. Vui lòng kiểm tra lại.` }, { status: 400 });
    }

    let provinceCode = r.permanentProvinceCode ? String(r.permanentProvinceCode).trim() : "";
    let wardCode = r.permanentWardCode ? String(r.permanentWardCode).trim() : "";
    if (!provinceCode || !wardCode) {
      const resolved = await resolveFromNamesToCodes(String(r.permanentProvinceName || "").trim(), String(r.permanentWardName || "").trim());
      provinceCode = resolved.provinceCode || "";
      wardCode = resolved.wardCode || "";
    }
    if (!provinceCode || !wardCode) {
      return NextResponse.json( //trả về thông báo lỗi
        {
          success: false,
          message: `Dòng ${line} có dữ liệu nhập vào không đúng định dạng. Vui lòng kiểm tra lại.`,
          debug: {
            kind: "ADDRESS_RESOLVE_FAILED",
            line,
            provinceName: String(r.permanentProvinceName || "").trim(),
            wardName: String(r.permanentWardName || "").trim()
          }
        },
        { status: 400 }
      );
    }

    const { provinceName, wardName } = await resolveProvinceWardNames(provinceCode, wardCode); //lấy tên tỉnh và huyện từ mã tỉnh và mã huyện
    if (!provinceName || !wardName) {
      return NextResponse.json(
        {
          success: false,
          message: `Dòng ${line} có dữ liệu nhập vào không đúng định dạng. Vui lòng kiểm tra lại.`,
          debug: {
            kind: "ADDRESS_CODE_NOT_FOUND",
            line,
            provinceCode,
            wardCode
          }
        },
        { status: 400 }
      );
    }

    prepared.push({
      line,
      msv,
      fullName,
      className,
      faculty,
      cohort,
      degree,
      phone,
      email,
      birthDate,
      passwordHash,
      gender,
      permanentProvinceCode: provinceCode,
      permanentProvinceName: provinceName,
      permanentWardCode: wardCode,
      permanentWardName: wardName
    });
  }

  const ms2 = prepared.map((r) => r.msv); 
  const emails = prepared.map((r) => r.email);
  const phones = prepared.map((r) => r.phone);

  const existingProfiles = await prismaAny.studentProfile.findMany({ where: { msv: { in: ms2 } }, select: { msv: true } });
  const existingUsers = await prismaAny.user.findMany({
    where: { OR: [{ email: { in: emails } }, { phone: { in: phones } }] },
    select: { id: true, role: true, email: true, phone: true }
  });
  const existingMsvSet = new Set(existingProfiles.map((x: any) => String(x.msv)));
  const existingEmailSet = new Set(existingUsers.filter((u: any) => u.email).map((u: any) => String(u.email).toLowerCase()));
  const existingPhoneSet = new Set(existingUsers.filter((u: any) => u.phone).map((u: any) => String(u.phone)));
  const existingEmailMap = new Map<string, any>();
  const existingPhoneMap = new Map<string, any>();
  for (const u of existingUsers) {
    if (u.email) existingEmailMap.set(String(u.email).toLowerCase(), u);
    if (u.phone) existingPhoneMap.set(String(u.phone), u);
  }

  for (const r of prepared) {
    const msv = r.msv;
    const email = r.email;
    const phone = r.phone;
    const msvDup = existingMsvSet.has(msv);
    const emailDup = existingEmailSet.has(email);
    const phoneDup = existingPhoneSet.has(phone);

    if (msvDup || emailDup || phoneDup) {
      console.warn("admin students import duplicate detected", {
        line: r.line,
        msv: msvDup ? msv : undefined,
        email: emailDup ? email : undefined,
        phone: phoneDup ? phone : undefined
      });
      return NextResponse.json(
        {
          success: false,
          message: `Dòng ${r.line} trong file Excel chứa thông tin đã tồn tại trong hệ thống. Vui lòng kiểm tra lại.`,
          debug: {
            kind: "DUPLICATE_IN_SYSTEM",
            line: r.line,
            fields: {
              msv: msvDup ? msv : null,
              email: emailDup ? email : null,
              phone: phoneDup ? phone : null
            },
            existingMatches: {
              email: emailDup ? existingEmailMap.get(email) ?? null : null,
              phone: phoneDup ? existingPhoneMap.get(phone) ?? null : null
            },
            existingCounts: {
              msv: existingMsvSet.size,
              email: existingEmailSet.size,
              phone: existingPhoneSet.size
            }
          }
        },
        { status: 400 }
      );
    }
  }

  await prismaAny.$transaction(
    async (tx: any) => {
    for (const r of prepared) {
      const user = await tx.user.create({
        data: {
          email: r.email,
          phone: r.phone,
          passwordHash: r.passwordHash,
          fullName: r.fullName,
          role: "sinhvien",
          isLocked: false,
          enterpriseStatus: null,
          companyName: null,
          taxCode: null,
          representativeTitle: null,
          enterpriseMeta: null
        },
        select: { id: true }
      });

      await tx.studentProfile.create({
        data: {
          userId: user.id,
          msv: r.msv,
          className: r.className,
          faculty: r.faculty,
          cohort: r.cohort,
          degree: r.degree,
          gender: r.gender,
          birthDate: new Date(`${r.birthDate}T00:00:00.000Z`),
          permanentProvinceCode: r.permanentProvinceCode,
          permanentProvinceName: r.permanentProvinceName,
          permanentWardCode: r.permanentWardCode,
          permanentWardName: r.permanentWardName,
          internshipStatus: "NOT_STARTED"
        }
      });
    }
    },
    { timeout: 30_000 }
  );

  return NextResponse.json({ success: true, message: "Tạo danh sách sinh viên thành công." });
}

