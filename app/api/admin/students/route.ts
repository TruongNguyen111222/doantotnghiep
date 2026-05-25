import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth/admin-session";
import { hashPassword } from "@/lib/auth/password";
import { AUTH_EMAIL_REGISTER_PATTERN } from "@/lib/constants/auth/patterns";
import { fetchProvinceList, fetchWardsForProvince } from "@/lib/vn-open-api";
import { ADMIN_QUAN_LY_SINH_VIEN_PAGE_SIZE } from "@/lib/constants/admin-quan-ly-sinh-vien";
import { buildAdminStudentListWhere } from "@/lib/server/admin-students-list-filter"; //hàm tạo điều kiện tìm kiếm sinh viên

const MSV_PATTERN = /^\d{8,15}$/;
const NAME_PATTERN = /^[\p{L}\s]{1,255}$/u;
const PHONE_PATTERN = /^\d{8,12}$/;
const CLASS_PATTERN = /^[\p{L}\d]{1,255}$/u;
const KHOL_PATTERN = /^[\p{L}\d]{1,10}$/u;

type Degree = "BACHELOR" | "ENGINEER"; //type bậc
type Gender = "MALE" | "FEMALE" | "OTHER";
type InternshipStatus = "NOT_STARTED" | "DOING" | "SELF_FINANCED" | "REPORT_SUBMITTED" | "COMPLETED" | "REJECTED"; //type trạng thái thực tập

function parseDateOnly(input: string) { //hàm chuyển đổi ngày tháng năm thành định dạng YYYY-MM-DD
  return new Date(`${input}T00:00:00.000Z`); 
}

function calcAge(date: Date, now = new Date()) { //hàm tính tuổi từ ngày sinh
  let age = now.getFullYear() - date.getUTCFullYear();
  const m = now.getUTCMonth() - date.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < date.getUTCDate())) age -= 1;
  return age;
}

async function resolveProvinceWardNames(provinceCode: string, wardCode: string) { //hàm lấy tên tỉnh và huyện từ mã tỉnh và mã huyện
  const provinces = await fetchProvinceList(); //gọi hàm lấy danh sách tỉnh/thành từ API
  const prov = provinces.find((p) => String(p.code) === String(provinceCode));
  if (!prov) return { provinceName: null as string | null, wardName: null as string | null };
  const wards = await fetchWardsForProvince(String(provinceCode)); //gọi hàm lấy danh sách huyện/xã từ API
  const ward = wards.find((w) => String(w.code) === String(wardCode));
  return { provinceName: prov.name, wardName: ward?.name ?? null }; //trả về tên tỉnh và huyện
}

export async function GET(request: Request) { //hàm lấy danh sách sinh viên từ API
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ message: "Không có quyền truy cập." }, { status: 403 });

  try {
    const { searchParams } = new URL(request.url); //lấy query params từ URL
    const page = Math.max(Number(searchParams.get("page") || "1") || 1, 1);
    const pageSize = Math.max(Number(searchParams.get("pageSize") || String(ADMIN_QUAN_LY_SINH_VIEN_PAGE_SIZE)) || ADMIN_QUAN_LY_SINH_VIEN_PAGE_SIZE, 1);

    const prismaAny = prisma as any;

    const where = buildAdminStudentListWhere(searchParams) as any;

    const totalItems = await prismaAny.studentProfile.count({ where }); //lấy tổng số sinh viên
    const rows = await prismaAny.studentProfile.findMany({ //lấy danh sách sinh viên
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize, //bỏ qua số lượng sinh viên trên mỗi trang
      take: pageSize,
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
        user: {
          select: {
            fullName: true,
            email: true,
            phone: true
          }
        }
      }
    });

    const profileIds = rows.map((r: any) => String(r.id)).filter(Boolean);
    const supervisorLinked = new Set<string>();
    if (profileIds.length) { //nếu có sinh viên thì lấy danh sách sinh viên đã phân công
      const links = await prismaAny.supervisorAssignmentStudent.findMany({
        where: { studentProfileId: { in: profileIds } },
        distinct: ["studentProfileId"],
        select: { studentProfileId: true }
      });
      for (const l of links) supervisorLinked.add(String(l.studentProfileId));
    }

    const userIds = rows.map((r: any) => r.userId);
    const linked = new Set<string>();
    if (userIds.length) {
      const distinctApps = await prismaAny.jobApplication.findMany({ //lấy danh sách ứng tuyển của sinh viên
        where: { studentUserId: { in: userIds } },
        select: { studentUserId: true },
        distinct: ["studentUserId"]
      });
      for (const a of distinctApps) linked.add(String(a.studentUserId)); //thêm id sinh viên vào set
    }

    let faculties: string[] = [];
    try {
      const fRows = await prismaAny.studentProfile.findMany({ //lấy danh sách khoa
        distinct: ["faculty"],
        select: { faculty: true }
      });
      faculties = fRows
        .map((r: any) => String(r.faculty))
        .filter(Boolean)
        .sort((a: string, b: string) => a.localeCompare(b, "vi"));
    } catch {
      faculties = [];
    }

    // --- Latest batch internship status stats (for cards) ---
    let latestBatchInternshipStats: {
      batchId: string | null;
      batchName: string | null;
      notStarted: number;
      doing: number;
      selfFinanced: number;
      reportSubmitted: number;
      completed: number;
      rejected: number;
    } = {
      batchId: null,
      batchName: null,
      notStarted: 0,
      doing: 0,
      selfFinanced: 0,
      reportSubmitted: 0,
      completed: 0,
      rejected: 0
    };

    try {
      const latestBatch: { id: string; name: string } | null = await prismaAny.internshipBatch.findFirst({ //lấy đợt thực tập mới nhất
        orderBy: { startDate: "desc" },
        select: { id: true, name: true }
      });

      if (latestBatch?.id) {
        const batchId = String(latestBatch.id);
        const links: Array<{ studentProfileId: string }> = await prismaAny.supervisorAssignmentStudent.findMany({
          where: { supervisorAssignment: { internshipBatchId: batchId } },
          distinct: ["studentProfileId"],
          select: { studentProfileId: true }
        });
        const studentProfileIds = links.map((l: any) => String(l.studentProfileId)).filter(Boolean);

        if (studentProfileIds.length) {
          const statusRows: Array<{ internshipStatus: InternshipStatus }> = await prismaAny.studentProfile.findMany({ //lấy danh sách trạng thái thực tập của sinh viên
            where: { id: { in: studentProfileIds } },
            select: { internshipStatus: true }
          });

          for (const r of statusRows) { //lấy trạng thái thực tập của sinh viên
            const s = r.internshipStatus as InternshipStatus;
            if (s === "NOT_STARTED") latestBatchInternshipStats.notStarted += 1;
            else if (s === "DOING") latestBatchInternshipStats.doing += 1;
            else if (s === "SELF_FINANCED") latestBatchInternshipStats.selfFinanced += 1;
            else if (s === "REPORT_SUBMITTED") latestBatchInternshipStats.reportSubmitted += 1;
            else if (s === "COMPLETED") latestBatchInternshipStats.completed += 1;
            else if (s === "REJECTED") latestBatchInternshipStats.rejected += 1;
          }
        }

        latestBatchInternshipStats.batchId = batchId;
        latestBatchInternshipStats.batchName = latestBatch.name ?? null;
      }
    } catch (e) {
      console.error("[GET /api/admin/students] latestBatchInternshipStats error", e);
    }

    return NextResponse.json({ //trả về danh sách sinh viên
      success: true,
      latestBatchInternshipStats,
      items: rows.map((r: any) => ({
        id: r.id,
        msv: r.msv,
        fullName: r.user?.fullName ?? "",
        phone: r.user?.phone ?? null,
        email: r.user?.email ?? "",
        className: r.className,
        faculty: r.faculty,
        cohort: r.cohort,
        degree: r.degree as Degree,
        internshipStatus: r.internshipStatus as InternshipStatus,
        hasSupervisor: supervisorLinked.has(String(r.id)),
        birthDate: r.birthDate?.toISOString?.() ?? null,
        gender: r.gender as Gender,
        permanentProvinceCode: r.permanentProvinceCode,
        permanentProvinceName: r.permanentProvinceName ?? null,
        permanentWardCode: r.permanentWardCode,
        permanentWardName: r.permanentWardName ?? null,
        hasLinkedData: linked.has(String(r.userId))
      })),
      faculties,
      page,
      pageSize,
      totalItems
    });
  } catch (e) {
    console.error("[GET /api/admin/students]", e);
    return NextResponse.json({ success: false, message: "Lỗi máy chủ." }, { status: 500 });
  }
}

type CreateStudentBody = { //type dữ liệu sinh viên
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

function validateCreate(body: CreateStudentBody) { //hàm kiểm tra dữ liệu sinh viên
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

  if (!body.gender || !["MALE", "FEMALE", "OTHER"].includes(String(body.gender))) errors.gender = "Giới tính không hợp lệ.";

  const permanentProvinceCode = (body.permanentProvinceCode || "").trim(); //mã tỉnh
  const permanentWardCode = (body.permanentWardCode || "").trim(); //mã huyện
  if (!permanentProvinceCode || !/^\d+$/.test(permanentProvinceCode)) errors.permanentProvinceCode = "Tỉnh/thành không hợp lệ.";
  if (!permanentWardCode || !/^\d+$/.test(permanentWardCode)) errors.permanentWardCode = "Phường/xã không hợp lệ.";

  const className = (body.className || "").trim();
  if (!className || !CLASS_PATTERN.test(className)) errors.className = "Lớp chỉ gồm chữ và số (1–255 ký tự).";

  const faculty = (body.faculty || "").trim();
  if (!faculty) errors.faculty = "Khoa bắt buộc.";

  const cohort = (body.cohort || "").trim();
  if (!KHOL_PATTERN.test(cohort)) errors.cohort = "Khóa chỉ gồm chữ và số (1–10 ký tự).";

  if (!body.degree || !["BACHELOR", "ENGINEER"].includes(String(body.degree))) errors.degree = "Bậc không hợp lệ.";

  return errors;
}

export async function POST(request: Request) { //hàm tạo sinh viên từ API
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ message: "Không có quyền truy cập." }, { status: 403 });

  const body = (await request.json()) as CreateStudentBody; //lấy dữ liệu sinh viên từ API
  const errors = validateCreate(body); //kiểm tra dữ liệu sinh viên
  if (Object.keys(errors).length) return NextResponse.json({ success: false, errors }, { status: 400 });

  const prismaAny = prisma as any;

  const msv = body.msv.trim();
  const email = body.email.trim();
  const phone = body.phone.trim();

  const existingProfile = await prismaAny.studentProfile.findFirst({ where: { msv }, select: { userId: true } });
  const existingUserByEmail = await prismaAny.user.findUnique({ where: { email }, select: { id: true } });
  const existingUserByPhone = await prismaAny.user.findUnique({ where: { phone }, select: { id: true } });

  const uniqErrors: Record<string, string> = {};
  if (existingProfile) uniqErrors.msv = "Mã sinh viên đã tồn tại trong hệ thống.";
  if (existingUserByEmail) uniqErrors.email = "Email đã tồn tại trong hệ thống.";
  if (existingUserByPhone) uniqErrors.phone = "Số điện thoại đã tồn tại trong hệ thống.";
  if (Object.keys(uniqErrors).length) return NextResponse.json({ success: false, errors: uniqErrors }, { status: 400 });

  const { provinceName, wardName } = await resolveProvinceWardNames(body.permanentProvinceCode, body.permanentWardCode);
  if (!provinceName || !wardName) {
    return NextResponse.json(
      { success: false, errors: { permanentProvinceCode: "Tỉnh/thành hoặc phường/xã không tồn tại.", permanentWardCode: "Tỉnh/thành hoặc phường/xã không tồn tại." } },
      { status: 400 }
    );
  }

  const birthDateStr = body.birthDate.trim();
  const passwordHash = await hashPassword(birthDateStr);

  const user = await prismaAny.user.create({ //tạo user sinh viên
    data: {
      email,
      phone,
      passwordHash,
      fullName: body.fullName.trim(),
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

  await prismaAny.studentProfile.create({ //tạo sinh viên
    data: {
      userId: user.id,
      msv,
      className: body.className.trim(),
      faculty: body.faculty.trim(),
      cohort: body.cohort.trim(),
      degree: body.degree,
      gender: body.gender,
      birthDate: parseDateOnly(birthDateStr),
      permanentProvinceCode: body.permanentProvinceCode.trim(),
      permanentProvinceName: provinceName,
      permanentWardCode: body.permanentWardCode.trim(),
      permanentWardName: wardName,
      internshipStatus: "NOT_STARTED"
    }
  });

  return NextResponse.json({ success: true, message: "Tạo sinh viên thành công." }); //trả về thông báo tạo sinh viên thành công
}

