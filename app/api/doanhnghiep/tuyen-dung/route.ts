import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth/jwt";
import { SESSION_COOKIE_NAME } from "@/lib/constants/auth/patterns";
import { prisma } from "@/lib/prisma";
import { DOANHNGHIEP_TUYEN_DUNG_PAGE_SIZE } from "@/lib/constants/doanhnghiep-tuyen-dung";

function getTodayStart() { //hàm lấy ngày hiện tại
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
//hàm chuyển đổi meta thành đối tượng Record
function enterpriseMetaAsRecord(meta: unknown): Record<string, unknown> {  
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return {};
  return meta as Record<string, unknown>;
}

function parseDateOnly(input: string | null | undefined): { start: Date; end: Date } | null { //hàm parse ngày tháng
  if (!input) return null;
  const trimmed = String(input).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const start = new Date(`${trimmed}T00:00:00.000Z`);
  const end = new Date(`${trimmed}T23:59:59.999Z`);
  return { start, end };
}


const TITLE_PATTERN = /^[\p{L}\d\s.,/()&+\-_'":]{1,255}$/u;
const EXPERTISE_PATTERN = /^[\p{L}\d\s.,/()&+\-_'":]{1,255}$/u;
const SALARY_PATTERN = /^[\p{L}\d\s\-]{1,150}$/u;
const COUNT_PATTERN = /^\d{1,10}$/;

/**
 * KHỐI XỬ LÝ: API GET - LẤY DANH SÁCH, LỌC VÀ THỐNG KÊ TIN TUYỂN DỤNG
 */
export async function GET(request: Request) {
  // * 1. Xác thực người dùng và kiểm tra quyền truy cập (Role: doanhnghiep)
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ success: false, message: "Vui lòng đăng nhập." }, { status: 401 });

  let sub: string;
  let role: string;
  try {
    const verified = await verifySession(token);
    sub = verified.sub;
    role = verified.role;
  } catch {
    return NextResponse.json({ success: false, message: "Phiên đăng nhập không hợp lệ." }, { status: 401 });
  }

  if (role !== "doanhnghiep") {
    return NextResponse.json({ success: false, message: "Không có quyền truy cập." }, { status: 403 });
  }
// * 2. Đọc và chuẩn hóa các tham số tìm kiếm, bộ lọc (query, date, status) và phân trang từ URL
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();
  const date = searchParams.get("date") || "";
  const status = (searchParams.get("status") || "all").trim();
  const page = Math.max(Number(searchParams.get("page") || "1") || 1, 1);
  const pageSize = Math.max(Number(searchParams.get("pageSize") || String(DOANHNGHIEP_TUYEN_DUNG_PAGE_SIZE)) || DOANHNGHIEP_TUYEN_DUNG_PAGE_SIZE, 1);

  const prismaAny = prisma as any;
  const now = new Date();
// * 3. Quét quét tự động: Chuyển các tin hết hạn (deadlineAt < now) sang trạng thái "STOPPED"
  await prismaAny.jobPost.updateMany({
    where: {
      enterpriseUserId: sub,
      deadlineAt: { lt: now },
      status: { in: ["PENDING", "REJECTED", "ACTIVE"] }
    },
    data: { status: "STOPPED", stoppedAt: now }
  });
// * 4. Xây dựng điều kiện truy vấn (where clause) dựa trên các bộ lọc người dùng chọn
  const where: Record<string, unknown> = { enterpriseUserId: sub };
// Thêm điều kiện tìm kiếm theo Tiêu đề hoặc Vị trí chuyên môn (chỉ áp dụng khi từ khóa từ 2 ký tự trở lên)
  if (q) {
    where.OR = [
      ...(q.length >= 2 ? [{ title: { contains: q, mode: "insensitive" } }] : []),
      ...(q.length >= 2 ? [{ expertise: { contains: q, mode: "insensitive" } }] : [])
    ];
  }
// Sao chép điều kiện để dùng riêng cho việc thống kê số lượng (không bị ảnh hưởng bởi bộ lọc status)
  const whereForStats: Record<string, unknown> = { ...where }; 
  if (status && status !== "all") where.status = status;
// Thêm điều kiện lọc theo ngày tạo (createdAt) nếu người dùng chọn ngày cụ thể
  const dateRange = parseDateOnly(date);
  if (dateRange) {
    where.createdAt = { gte: dateRange.start, lte: dateRange.end };
  }
// * 5. Thực hiện các truy vấn song song: Đếm tổng số tin, lấy danh sách và thống kê số lượng theo trạng thái
  const [totalItems, rows, groupedStatusRows] = await Promise.all([
    prismaAny.jobPost.count({ where }), //đếm tổng số tin
    prismaAny.jobPost.findMany({ //lấy danh sách tin
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        title: true,
        createdAt: true,
        recruitmentCount: true,
        expertise: true,
        workType: true,
        status: true,
        deadlineAt: true
      }
    }),
    prismaAny.jobPost.groupBy({ //nhóm tin theo trạng thái
      by: ["status"],
      where: whereForStats,
      _count: { _all: true }
    })
  ]);
  // Định dạng lại cấu trúc dữ liệu thống kê số lượng tin theo từng trạng thái cụ thể
  const statusStats = { PENDING: 0, REJECTED: 0, ACTIVE: 0, STOPPED: 0 };
  for (const g of groupedStatusRows as Array<{ status: keyof typeof statusStats; _count: { _all: number } }>) {
    if (g.status in statusStats) statusStats[g.status] = Number(g._count?._all || 0);
  }

  return NextResponse.json({ //trả về dữ liệu danh sách tin tuyển dụng
    success: true,
    page,
    pageSize,
    totalItems,
    statusStats,
    items: rows.map((r: any) => ({
      id: r.id,
      title: r.title,
      createdAt: r.createdAt?.toISOString?.() ?? null,
      recruitmentCount: r.recruitmentCount,
      expertise: r.expertise,
      workType: r.workType,
      status: r.status,
      deadlineAt: r.deadlineAt?.toISOString?.() ?? null
    }))
  });
}
 /**
 * KHỐI ĐỊNH NGHĨA KIỂU DỮ LIỆU ĐẦU VÀO (REQUEST BODY TYPE)
 */
type PatchOrCreateBody = {
  title?: string;
  companyIntro?: string | null;
  companyWebsite?: string | null;
  salary?: string;
  expertise?: string;
  allowedFaculties?: unknown;
  experienceRequirement?: string;
  recruitmentCount?: number | string;
  workType?: "PART_TIME" | "FULL_TIME";
  deadlineAt?: string; // YYYY-MM-DD
  jobDescription?: string;
  candidateRequirements?: string;
  benefits?: string;
  workLocation?: string;
  workTime?: string;
  applicationMethod?: string | null;
};
/**
 * KHỐI CHỨC NĂNG: HÀM VALIDATE DỮ LIỆU ĐẦU VÀO (DÙNG CHUNG CHO KHỐI TẠO VÀ SỬA)
 */
function validateCreateOrEdit(body: PatchOrCreateBody, enterpriseDefaults: { website: string | null }) {
  const errors: Record<string, string> = {};

  const title = (body.title || "").trim();
  if (!title || !TITLE_PATTERN.test(title)) errors.title = "Tiêu đề không hợp lệ (tối đa 255 ký tự).";

  const salary = (body.salary || "").trim();
  if (!salary || !SALARY_PATTERN.test(salary)) errors.salary = "Mức lương chỉ gồm ký tự chữ và số, ký tự '-' (dài 1–150).";

  const expertise = (body.expertise || "").trim();
  if (!expertise || !EXPERTISE_PATTERN.test(expertise)) errors.expertise = "Vị trí tuyển dụng không hợp lệ (tối đa 255 ký tự).";

  const allowedFacultiesRaw = body.allowedFaculties;
  const allowedFaculties = Array.isArray(allowedFacultiesRaw)
    ? allowedFacultiesRaw.map((x) => String(x || "").trim()).filter(Boolean)
    : [];
  if (allowedFaculties.length === 0) errors.allowedFaculties = "Ngành/Khoa bắt buộc.";
  if (allowedFaculties.length > 30) errors.allowedFaculties = "Ngành/Khoa tối đa 30 giá trị.";
  if (allowedFaculties.some((x) => x.length > 255)) errors.allowedFaculties = "Ngành/Khoa không hợp lệ.";

  const expReq = (body.experienceRequirement || "").trim();
  if (!expReq || !EXPERTISE_PATTERN.test(expReq)) errors.experienceRequirement = "Yêu cầu kinh nghiệm không hợp lệ (tối đa 255 ký tự).";

  const recruitmentCountRaw = body.recruitmentCount;
  const recruitmentCountStr = recruitmentCountRaw == null ? "" : String(recruitmentCountRaw).trim();
  if (!recruitmentCountStr || !COUNT_PATTERN.test(recruitmentCountStr)) errors.recruitmentCount = "Số lượng tuyển dụng chỉ gồm số (dài 1–10).";

  const workType = body.workType;
  if (!workType || (workType !== "PART_TIME" && workType !== "FULL_TIME")) errors.workType = "Hình thức làm việc không hợp lệ.";

  const deadlineAtStr = (body.deadlineAt || "").trim();
  if (!deadlineAtStr || !/^\d{4}-\d{2}-\d{2}$/.test(deadlineAtStr)) {
    errors.deadlineAt = "Hạn tuyển dụng không hợp lệ (YYYY-MM-DD).";
  } else {
    const deadlineAt = new Date(`${deadlineAtStr}T00:00:00.000Z`);
    const today = getTodayStart();
    if (!(deadlineAt.getTime() > today.getTime())) {
      errors.deadlineAt = "Hạn tuyển dụng phải lớn hơn ngày hiện tại.";
    }
  }

  const jobDescription = (body.jobDescription || "").trim();
  if (!jobDescription) errors.jobDescription = "Vui lòng nhập mô tả công việc.";

  const candidateRequirements = (body.candidateRequirements || "").trim();
  if (!candidateRequirements) errors.candidateRequirements = "Vui lòng nhập yêu cầu ứng viên.";

  const benefits = (body.benefits || "").trim();
  if (!benefits) errors.benefits = "Vui lòng nhập quyền lợi.";

  const workLocation = (body.workLocation || "").trim();
  if (!workLocation || workLocation.length > 255) errors.workLocation = "Địa điểm làm việc bắt buộc và tối đa 255 ký tự.";

  const workTime = (body.workTime || "").trim();
  if (!workTime) errors.workTime = "Vui lòng nhập thời gian làm việc.";

  const applicationMethod = body.applicationMethod == null ? null : (String(body.applicationMethod).trim() || null);
// Xử lý điền thông tin giới thiệu và website mặc định nếu không được truyền lên
  const companyIntro = (body.companyIntro == null ? "" : String(body.companyIntro).trim()) || null;
  const companyWebsite =
    (body.companyWebsite == null ? "" : String(body.companyWebsite).trim()) || enterpriseDefaults.website || null;
// Trả về kết quả đánh giá validation kèm dữ liệu sạch đã chuẩn hóa
  return {
    ok: Object.keys(errors).length === 0,
    errors,
    data: {
      title,
      salary,
      expertise,
      allowedFaculties: Array.from(new Set(allowedFaculties)),
      experienceRequirement: expReq,
      recruitmentCount: Number(recruitmentCountStr),
      workType,
      deadlineAt: new Date(`${deadlineAtStr}T00:00:00.000Z`),
      jobDescription,
      candidateRequirements,
      benefits,
      workLocation,
      workTime,
      applicationMethod,
      companyIntro,
      companyWebsite
    }
  };
}

/**
 * KHỐI XỬ LÝ: API POST - TẠO TIN TUYỂN DỤNG
 */
export async function POST(request: Request) {
  // * 1. Xác thực người dùng và kiểm tra quyền truy cập (Role: doanhnghiep)
  const cookieStore = await cookies(); 
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ success: false, message: "Vui lòng đăng nhập." }, { status: 401 });

  let sub: string;
  let role: string;
  try {
    const verified = await verifySession(token);
    sub = verified.sub;
    role = verified.role;
  } catch {
    return NextResponse.json({ success: false, message: "Phiên đăng nhập không hợp lệ." }, { status: 401 });
  }

  if (role !== "doanhnghiep") {
    return NextResponse.json({ success: false, message: "Không có quyền truy cập." }, { status: 403 });
  }

  const body = (await request.json()) as PatchOrCreateBody;

  const prismaAny = prisma as any;
// * 2. Tìm kiếm thông tin doanh nghiệp để lấy thông tin giới thiệu và website mặc định
  const user = await prismaAny.user.findUnique({ //tìm kiếm thông tin doanh nghiệp theo id doanh nghiệp
    where: { id: sub },
    select: { enterpriseMeta: true }
  });
  const meta = enterpriseMetaAsRecord(user?.enterpriseMeta);
  const defaultWebsite = typeof meta.website === "string" && meta.website.trim() ? meta.website.trim() : null;
// * 3. Validate dữ liệu đầu vào và chuẩn hóa dữ liệu
  const validated = validateCreateOrEdit(body, { website: defaultWebsite });
  if (!validated.ok) {
    return NextResponse.json({ success: false, errors: validated.errors }, { status: 400 });
  }
 // * 4. Tìm kiếm đợt thực tập mở nhất để liên kết với tin tuyển dụng
  const openBatch = await prismaAny.internshipBatch.findFirst({
    where: { status: "OPEN" },
    orderBy: { createdAt: "desc" }
  });

  if (!openBatch) { //nếu không tìm thấy đợt thực tập mở thì trả về lỗi
    return NextResponse.json(
      { success: false, message: "Phòng đào tạo chưa mở đợt thực tập. Vui lòng chờ đến khi mở đợt thực tập." },
      { status: 400 }
    );
  }

  const data = validated.data;
  const now = new Date();
// * 4. Tự động xác định trạng thái ban đầu: "STOPPED" nếu vô tình chọn hạn nộp nhỏ hơn hiện tại, ngược lại là "PENDING" chờ duyệt
  const status = data.deadlineAt.getTime() <= now.getTime() ? "STOPPED" : "PENDING";
// * 5. Tạo tin tuyển dụng mới vào DB
  const created = await prismaAny.jobPost.create({ //tạo tin tuyển dụng mới vào DB
    data: {
      enterpriseUserId: sub,
      internshipBatchId: openBatch.id,
      title: data.title,
      companyIntro: data.companyIntro,
      companyWebsite: data.companyWebsite,
      salary: data.salary,
      expertise: data.expertise,
      allowedFaculties: data.allowedFaculties,
      experienceRequirement: data.experienceRequirement,
      recruitmentCount: data.recruitmentCount,
      workType: data.workType,
      deadlineAt: data.deadlineAt,
      jobDescription: data.jobDescription,
      candidateRequirements: data.candidateRequirements,
      benefits: data.benefits,
      workLocation: data.workLocation,
      workTime: data.workTime,
      applicationMethod: data.applicationMethod,
      status,
      stoppedAt: status === "STOPPED" ? now : null
    }
  });

  return NextResponse.json({ success: true, message: "Tạo tin tuyển dụng thành công." }); //trả về kết quả thành công
}

