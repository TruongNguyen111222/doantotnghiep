import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth/jwt";
import { SESSION_COOKIE_NAME } from "@/lib/constants/auth/patterns";
import { prisma } from "@/lib/prisma";
import { buildEnterpriseHeadquartersAddress, formatBusinessFields } from "@/lib/utils/enterprise-admin-display";

/**
 * KHỐI CHỨC NĂNG: HÀM TRỢ GIÚP (HELPER FUNCTIONS) & CẤU HÌNH BIỂU THỨC CHÍNH QUY (REGEX)
 * - Định nghĩa các biểu thức chính quy để kiểm tra định dạng dữ liệu đầu vào (Tiêu đề, vị trí, mức lương, số lượng).
 * - Hàm `enterpriseMetaAsRecord`: Chuyển đổi an toàn dữ liệu meta hỗn hợp (unknown) của doanh nghiệp sang dạng Object (Record).
 * - Hàm `getTodayStart`: Thiết lập và lấy mốc thời gian 00:00:00 của ngày hiện tại để phục vụ so sánh ngày tháng.
 */
function enterpriseMetaAsRecord(meta: unknown): Record<string, unknown> {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return {};
  return meta as Record<string, unknown>;
}

const TITLE_PATTERN = /^[\p{L}\d\s.,/()&+\-_'":]{1,255}$/u;
const EXPERTISE_PATTERN = /^[\p{L}\d\s.,/()&+\-_'":]{1,255}$/u;
const SALARY_PATTERN = /^[\p{L}\d\s\-]{1,150}$/u;
const COUNT_PATTERN = /^\d{1,10}$/;

function getTodayStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
/**
 * KHỐI ĐỊNH NGHĨA KIỂU DỮ LIỆU (TYPES)
 * Đảm bảo tính minh bạch về cấu trúc dữ liệu trả về cho phía Frontend khi truy vấn chi tiết tin tuyển dụng.
 */
type JobDetailResponse = {
  job: any;
  enterprise: {
    companyName: string | null;
    taxCode: string | null;
    businessFields: string;
    headquartersAddress: string;
    intro: string | null;
    website: string | null;
  };
};
/**
 * KHỐI XỬ LÝ: API GET - LẤY CHI TIẾT TIN TUYỂN DỤNG
 */
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
// * 1. Xác thực người dùng qua Session Token và phân quyền Role phải là "doanhnghiep".

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ success: false, message: "Vui lòng đăng nhập." }, { status: 401 });
 
  const { id } = await ctx.params;

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

  const prismaAny = prisma as any; 
  const now = new Date();
// * 2. Thực hiện quét và tự động chuyển trạng thái sang "STOPPED" đối với tất cả các tin tuyển dụng đã quá hạn của doanh nghiệp này.
  await prismaAny.jobPost.updateMany({ //cập nhật trạng thái tin tuyển dụng
    where: {
      enterpriseUserId: sub,
      deadlineAt: { lt: now },
      status: { in: ["PENDING", "REJECTED", "ACTIVE"] }
    },
    data: { status: "STOPPED", stoppedAt: now }
  });
// /* 3. Truy vấn thông tin chi tiết của tin tuyển dụng theo `id` và thông tin hồ sơ doanh nghiệp tương ứng.
  const job = await prismaAny.jobPost.findFirst({ //tìm kiếm tin tuyển dụng theo id và id doanh nghiệp
    where: { id, enterpriseUserId: sub },
    include: { internshipBatch: true }
  });

  if (!job) return NextResponse.json({ success: false, message: "Không tìm thấy tin tuyển dụng." }, { status: 404 });

  const user = await prismaAny.user.findUnique({
    where: { id: sub },
    select: { companyName: true, taxCode: true, enterpriseMeta: true }
  });
  const meta = enterpriseMetaAsRecord(user?.enterpriseMeta);
  const enterpriseDefaultsWebsite =
    job.companyWebsite ??
    (typeof meta.website === "string" && meta.website.trim() ? meta.website.trim() : null);
// / * 4. Hợp nhất dữ liệu (ưu tiên thông tin tùy chỉnh trong tin, nếu không có sẽ lấy thông tin mặc định của doanh nghiệp) và trả về Client.
  const response: JobDetailResponse = { //trả về dữ liệu chi tiết tin tuyển dụng
    job,
    enterprise: {
      companyName: user?.companyName ?? null,
      taxCode: user?.taxCode ?? null,
      businessFields: formatBusinessFields(user?.enterpriseMeta),
      headquartersAddress: buildEnterpriseHeadquartersAddress(user?.enterpriseMeta),
      intro: job.companyIntro ?? null,
      website: enterpriseDefaultsWebsite
    }
  };

  return NextResponse.json({ success: true, item: response });
}
/**
 * KHỐI ĐỊNH NGHĨA KIỂU DỮ LIỆU ĐẦU VÀO (REQUEST BODY TYPE)
 */
type EditBody = {
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
 * KHỐI XỬ LÝ: API PATCH - CHỈNH SỬA TIN TUYỂN DỤNG
 */
export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  // * 1. Xác thực người dùng và kiểm tra quyền truy cập (Role: doanhnghiep)
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ success: false, message: "Vui lòng đăng nhập." }, { status: 401 });

  const { id } = await ctx.params;

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
// * 2. Đọc dữ liệu body gửi lên và kiểm tra sự tồn tại cũng như trạng thái hiện tại của tin tuyển dụng
  const body = (await request.json()) as EditBody;
  const prismaAny = prisma as any;
  const job = await prismaAny.jobPost.findFirst({ where: { id, enterpriseUserId: sub } });
  if (!job) return NextResponse.json({ success: false, message: "Không tìm thấy tin tuyển dụng." }, { status: 404 });
// Không cho phép chỉnh sửa nếu tin đã được duyệt (ACTIVE) hoặc đã chủ động dừng/hết hạn (STOPPED)
  if (job.status === "ACTIVE" || job.status === "STOPPED") {
    return NextResponse.json({ success: false, message: "Không thể sửa tin đã được duyệt hoặc đã dừng hoạt động." }, { status: 403 });
  }
// * 3. Validate thủ công toàn bộ các trường dữ liệu đầu vào bằng Regex Pattern và các điều kiện logic cơ bản
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

  const recruitmentCountStr = body.recruitmentCount == null ? "" : String(body.recruitmentCount).trim();
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

  if (Object.keys(errors).length) { //nếu có lỗi thì trả về lỗi
    return NextResponse.json({ success: false, errors }, { status: 400 });
  }
// * 5. Chuẩn bị thông tin mặc định của doanh nghiệp (Giới thiệu, Website) nếu trong tin tuyển dụng để trống
  const user = await prismaAny.user.findUnique({ where: { id: sub }, select: { enterpriseMeta: true } }); //tìm kiếm thông tin doanh nghiệp theo id doanh nghiệp
  const meta = enterpriseMetaAsRecord(user?.enterpriseMeta);
  const defaultIntro = Array.isArray(meta.businessFields) ? meta.businessFields.map(String).join(", ") : null;
  const defaultWebsite = typeof meta.website === "string" && meta.website.trim() ? meta.website.trim() : null;

  const companyIntro =
    (body.companyIntro == null ? "" : String(body.companyIntro).trim()) || defaultIntro || null;
  const companyWebsite =
    (body.companyWebsite == null ? "" : String(body.companyWebsite).trim()) || defaultWebsite || null;
// * 6. Tính toán lại trạng thái tin dựa trên mốc thời gian và tiến hành cập nhật dữ liệu vào DB
  const now = new Date();
  const deadlineAt = new Date(`${deadlineAtStr}T00:00:00.000Z`);
  const nextStatus = deadlineAt.getTime() <= now.getTime() ? "STOPPED" : "PENDING";

  await prismaAny.jobPost.update({ 
    where: { id },
    data: {
      title,
      companyIntro,
      companyWebsite,
      salary,
      expertise,
      allowedFaculties: Array.from(new Set(allowedFaculties)),
      experienceRequirement: expReq,
      recruitmentCount: Number(recruitmentCountStr),
      workType,
      deadlineAt,
      jobDescription,
      candidateRequirements,
      benefits,
      workLocation,
      workTime,
      applicationMethod,
      status: nextStatus,
      rejectionReason: null,
      stoppedAt: nextStatus === "STOPPED" ? now : null
    }
  });

  return NextResponse.json({ success: true, message: "Sửa tin tuyển dụng thành công." });
}
/**
 * KHỐI XỬ LÝ: API DELETE - XÓA TIN TUYỂN DỤNG
 */
export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  // * 1. Xác thực người dùng và kiểm tra quyền truy cập (Role: doanhnghiep)
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ success: false, message: "Vui lòng đăng nhập." }, { status: 401 });

  const { id } = await ctx.params;

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
// * 2. Tìm kiếm tin tuyển dụng cần xóa để đảm bảo tin tồn tại và thuộc quyền sở hữu của doanh nghiệp này
  const prismaAny = prisma as any;
  const job = await prismaAny.jobPost.findFirst({ where: { id, enterpriseUserId: sub }, select: { id: true } });
  if (!job) return NextResponse.json({ success: false, message: "Không tìm thấy tin tuyển dụng." }, { status: 404 });
// * 3. Kiểm tra ràng buộc dữ liệu toàn vẹn (Data Integrity): Đếm số lượng hồ sơ ứng tuyển liên kết với tin này
  const linkedCount = await prismaAny.jobApplication.count({ where: { jobPostId: id } }); //đếm số lượng hồ sơ ứng tuyển liên kết với tin này
  // Nếu đã có sinh viên nộp đơn ứng tuyển vào tin này, chặn không cho xóa để tránh lỗi mồ côi dữ liệu lịch sử (trả về 409 Conflict)
  if (linkedCount > 0) {
    return NextResponse.json(
      {
        success: false,
        message: "Không thể xóa Tin tuyển dụng đã có dữ liệu liên kết trong hệ thống."
      },
      { status: 409 }
    );
  }
// * 4. Thực hiện xóa tin tuyển dụng và trả về kết quả thành công
  await prismaAny.jobPost.delete({ where: { id } });
  return NextResponse.json({ success: true, message: "Xóa tin tuyển dụng thành công." }); 
}

