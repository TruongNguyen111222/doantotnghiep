import type { JobDetailResponse, JobFormState, JobStatus, WorkType } from "@/lib/types/doanhnghiep-tuyen-dung";
import {
  DOANHNGHIEP_TUYEN_DUNG_COMPANY_WEBSITE_PATTERN,
  DOANHNGHIEP_TUYEN_DUNG_COUNT_PATTERN,
  DOANHNGHIEP_TUYEN_DUNG_DEADLINE_AT_PATTERN,
  DOANHNGHIEP_TUYEN_DUNG_ERROR_BENEFITS,
  DOANHNGHIEP_TUYEN_DUNG_ERROR_CANDIDATE_REQUIREMENTS,
  DOANHNGHIEP_TUYEN_DUNG_ERROR_COMPANY_WEBSITE,
  DOANHNGHIEP_TUYEN_DUNG_ERROR_DEADLINE_AT,
  DOANHNGHIEP_TUYEN_DUNG_ERROR_DEADLINE_AT_MUST_BE_IN_FUTURE,
  DOANHNGHIEP_TUYEN_DUNG_ERROR_EXPERIENCE_REQUIREMENT,
  DOANHNGHIEP_TUYEN_DUNG_ERROR_EXPERTISE,
  DOANHNGHIEP_TUYEN_DUNG_ERROR_JOB_DESCRIPTION,
  DOANHNGHIEP_TUYEN_DUNG_ERROR_RECRUITMENT_COUNT,
  DOANHNGHIEP_TUYEN_DUNG_ERROR_SALARY,
  DOANHNGHIEP_TUYEN_DUNG_ERROR_WORK_TIME,
  DOANHNGHIEP_TUYEN_DUNG_ERROR_WORK_LOCATION,
  DOANHNGHIEP_TUYEN_DUNG_ERROR_WORK_TYPE,
  DOANHNGHIEP_TUYEN_DUNG_EXPERTISE_PATTERN,
  DOANHNGHIEP_TUYEN_DUNG_SALARY_PATTERN,
  DOANHNGHIEP_TUYEN_DUNG_TITLE_PATTERN,
  DOANHNGHIEP_TUYEN_DUNG_ERROR_TITLE
} from "@/lib/constants/doanhnghiep-tuyen-dung"; //hằng số cho API


/**
 * TỔNG QUAN FILE:
 * File helper/utility này cung cấp các hàm xử lý logic nghiệp vụ cho phân hệ Tuyển dụng của Doanh nghiệp.
 * Bao gồm: khởi tạo dữ liệu mặc định cho Form, phân tách/hợp nhất chuỗi địa chỉ, định dạng ngày tháng,
 * kiểm tra tính hợp lệ của dữ liệu đầu vào (Validation), và chuẩn hóa dữ liệu Payload trước khi gửi lên API (Backend).
 */

export type JobEnterpriseDefaults = {
  intro: string;
  website: string;
  address?: {
    provinceCode?: string;
    wardCode?: string;
    provinceName?: string;
    wardName?: string;
    addressDetail?: string;
  };
};

/* KHỐI 1: CÁC HÀM XỬ LÝ LÝ VÀ CHUYỂN ĐỔI CHUỖI ĐỊA CHỈ (UI <-> TEXT) */

/**
 * Gộp các thành phần địa chỉ (Chi tiết, Phường/Xã, Tỉnh/Thành phố) thành một chuỗi văn bản hoàn chỉnh ngăn cách bởi dấu phẩy.
 */
function joinAddressParts(parts: Array<string | null | undefined>): string {
  const cleaned = parts.map((x) => String(x || "").trim()).filter(Boolean);
  return cleaned.length ? cleaned.join(", ") : "";
}
/**
 * Phân tách chuỗi địa chỉ thuần văn bản (workLocation) từ API ngược thành
 *  các trường cấu trúc để hiển thị lên UI Select/Input.
 */
function guessAddressFromWorkLocation(workLocation: string): {
  addressDetail: string;
  wardName: string;
  provinceName: string;
} {
  const raw = String(workLocation || "").trim();
  if (!raw) return { addressDetail: "", wardName: "", provinceName: "" };
  const parts = raw.split(",").map((x) => x.trim()).filter(Boolean);
  if (parts.length >= 3) {
    const provinceName = parts[parts.length - 1] || "";
    const wardName = parts[parts.length - 2] || "";
    const addressDetail = parts.slice(0, parts.length - 2).join(", ");
    return { addressDetail, wardName, provinceName };
  }
  if (parts.length === 2) return { addressDetail: parts[0] || "", wardName: "", provinceName: parts[1] || "" };
  return { addressDetail: parts[0] || "", wardName: "", provinceName: "" };
}

/* KHỐI 2: CÁC HÀM XỬ LÝ VÀ ĐỊNH DẠNG THỜI GIAN (DATE / TIME UTILS) */

/**
 * Lấy ngày hiện tại định dạng chuỗi dùng cho thẻ input[type="date"] (yyyy-mm-dd).
 */
export function todayDateInputValue(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
/**
 * Lấy ngày mai định dạng chuỗi dùng cho thẻ input[type="date"] (yyyy-mm-dd).
 */
export function tomorrowDateInputValue(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
/**
 * Định dạng chuỗi ngày tháng ISO thành định dạng hiển thị Tiếng Việt (dd/mm/yyyy). Trả về "—" nếu không hợp lệ.
 */
export function formatDateVi(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("vi-VN");
}
/* KHỐI 3: KHỞI TẠO TRẠNG THÁI ĐẦU VÀO CHO FORM (FORM INITIALIZER) */

/**
 * Tạo một State trống hoàn toàn cho Form đăng tuyển dụng với các giá trị mặc định cơ bản.
 */
export function buildEmptyJobFormState(): JobFormState {
  return {
    title: "",
    companyIntro: "",
    companyWebsite: "",
    salary: "",
    expertise: "",
    allowedFaculties: [],
    experienceRequirement: "",
    recruitmentCount: "",
    workType: "",
    deadlineAt: todayDateInputValue(),
    jobDescription: "",
    candidateRequirements: "",
    benefits: "",
    workLocation: "",
    provinceCode: "",
    wardCode: "",
    provinceName: "",
    wardName: "",
    addressDetail: "",
    workTime: "",
    applicationMethod: "Ứng viên nộp hồ sơ trực tuyến bằng cách bấm \"Ứng tuyển ngay\" dưới đây."
  };
}
/**
 * Kiểm tra xem một chuỗi bất kỳ có khớp với kiểu dữ liệu WorkType ("PART_TIME" | "FULL_TIME") hay không.
 */
function isWorkType(value: string): value is WorkType {
  return value === "PART_TIME" || value === "FULL_TIME";
}
/**
 * Khởi tạo dữ liệu Form cho tính năng THÊM MỚI tin tuyển dụng, 
 * tự động điền các thông tin mặc định của doanh nghiệp.
 */
export function buildJobFormForAdd(args: {
  enterpriseDefaults: JobEnterpriseDefaults;
}): JobFormState {
  const addr = args.enterpriseDefaults.address || {};
  const workLocation = joinAddressParts([addr.addressDetail, addr.wardName, addr.provinceName]);
  return {
    ...buildEmptyJobFormState(),
    companyIntro: "",
    companyWebsite: args.enterpriseDefaults.website || "",
    provinceCode: String(addr.provinceCode || ""),
    wardCode: String(addr.wardCode || ""),
    provinceName: String(addr.provinceName || ""),
    wardName: String(addr.wardName || ""),
    addressDetail: String(addr.addressDetail || ""),
    workLocation,
    deadlineAt: tomorrowDateInputValue()
  };
}
/**
 * Khởi tạo dữ liệu Form cho tính năng CẬP NHẬT (SỬA) tin tuyển dụng 
 * bằng cách map dữ liệu chi tiết hiện tại của tin từ API.
 */
export function buildJobFormForEdit(args: {
  detail: JobDetailResponse;
  enterpriseDefaults: JobEnterpriseDefaults;
}): JobFormState {
  const job = args.detail.job;
  const workTypeRaw = (job.workType as string) || "";
  const fromWorkLocation = guessAddressFromWorkLocation(job.workLocation || "");
  const addr = args.enterpriseDefaults.address || {};

  return {
    title: job.title || "",
    companyIntro: job.companyIntro || "",
    companyWebsite: job.companyWebsite || args.enterpriseDefaults.website || "",
    salary: job.salary || "",
    expertise: job.expertise || "",
    allowedFaculties: Array.isArray(job.allowedFaculties) ? job.allowedFaculties.map(String).filter(Boolean) : [],
    experienceRequirement: job.experienceRequirement || "",
    recruitmentCount: job.recruitmentCount != null ? String(job.recruitmentCount) : "",
    workType: isWorkType(workTypeRaw) ? workTypeRaw : "",
    deadlineAt: job.deadlineAt ? new Date(job.deadlineAt).toISOString().slice(0, 10) : todayDateInputValue(),
    jobDescription: job.jobDescription || "",
    candidateRequirements: job.candidateRequirements || "",
    benefits: job.benefits || "",
    workLocation: job.workLocation || "",
    provinceCode: String(addr.provinceCode || ""),
    wardCode: String(addr.wardCode || ""),
    provinceName: fromWorkLocation.provinceName || String(addr.provinceName || ""),
    wardName: fromWorkLocation.wardName || String(addr.wardName || ""),
    addressDetail: fromWorkLocation.addressDetail || String(addr.addressDetail || ""),
    workTime: job.workTime || "",
    applicationMethod: job.applicationMethod || ""
  };
}
/* KHỐI 4: KIỂM TRA DỮ LIỆU ĐẦU VÀO FORM (VALIDATION LOGIC) */

/**
 * Kiểm tra toàn bộ dữ liệu trên Form dựa trên các Pattern RegExp hằng số. 
 * Trả về trạng thái hợp lệ kèm Object chứa thông báo lỗi chi tiết.
 */
export function validateJobForm(
  form: JobFormState
): { isValid: boolean; errors: Record<string, string> } {
  const next: Record<string, string> = {};

  if (!form.title || !DOANHNGHIEP_TUYEN_DUNG_TITLE_PATTERN.test(form.title.trim())) next.title = DOANHNGHIEP_TUYEN_DUNG_ERROR_TITLE;
  if (!form.salary || !DOANHNGHIEP_TUYEN_DUNG_SALARY_PATTERN.test(form.salary.trim())) next.salary = DOANHNGHIEP_TUYEN_DUNG_ERROR_SALARY;
  if (!form.expertise || !DOANHNGHIEP_TUYEN_DUNG_EXPERTISE_PATTERN.test(form.expertise.trim()))
    next.expertise = DOANHNGHIEP_TUYEN_DUNG_ERROR_EXPERTISE;
  if (!Array.isArray(form.allowedFaculties) || form.allowedFaculties.length === 0)
    next.allowedFaculties = "Ngành/Khoa bắt buộc.";
  if (
    !form.experienceRequirement ||
    !DOANHNGHIEP_TUYEN_DUNG_EXPERTISE_PATTERN.test(form.experienceRequirement.trim())
  )
    next.experienceRequirement = DOANHNGHIEP_TUYEN_DUNG_ERROR_EXPERIENCE_REQUIREMENT;
  if (!form.recruitmentCount || !DOANHNGHIEP_TUYEN_DUNG_COUNT_PATTERN.test(form.recruitmentCount.trim()))
    next.recruitmentCount = DOANHNGHIEP_TUYEN_DUNG_ERROR_RECRUITMENT_COUNT;
  if (!form.workType || (form.workType !== "PART_TIME" && form.workType !== "FULL_TIME"))
    next.workType = DOANHNGHIEP_TUYEN_DUNG_ERROR_WORK_TYPE;

  if (!form.deadlineAt || !DOANHNGHIEP_TUYEN_DUNG_DEADLINE_AT_PATTERN.test(form.deadlineAt)) {
    next.deadlineAt = DOANHNGHIEP_TUYEN_DUNG_ERROR_DEADLINE_AT;
  } else {
    const deadline = new Date(`${form.deadlineAt}T00:00:00.000Z`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (!(deadline.getTime() > today.getTime()))
      next.deadlineAt = DOANHNGHIEP_TUYEN_DUNG_ERROR_DEADLINE_AT_MUST_BE_IN_FUTURE;
  }

  if (!form.jobDescription.trim()) next.jobDescription = DOANHNGHIEP_TUYEN_DUNG_ERROR_JOB_DESCRIPTION;
  if (!form.candidateRequirements.trim())
    next.candidateRequirements = DOANHNGHIEP_TUYEN_DUNG_ERROR_CANDIDATE_REQUIREMENTS;
  if (!form.benefits.trim()) next.benefits = DOANHNGHIEP_TUYEN_DUNG_ERROR_BENEFITS;
  if (!form.workLocation.trim() || form.workLocation.trim().length > 255)
    next.workLocation = DOANHNGHIEP_TUYEN_DUNG_ERROR_WORK_LOCATION;
  if (!form.workTime.trim()) next.workTime = DOANHNGHIEP_TUYEN_DUNG_ERROR_WORK_TIME;

  if (
    form.companyWebsite.trim() &&
    !DOANHNGHIEP_TUYEN_DUNG_COMPANY_WEBSITE_PATTERN.test(form.companyWebsite.trim())
  )
    next.companyWebsite = DOANHNGHIEP_TUYEN_DUNG_ERROR_COMPANY_WEBSITE;

  return { isValid: Object.keys(next).length === 0, errors: next };
}
/* KHỐI 5: ĐÓNG GÓI DỮ LIỆU ĐỂ GỬI LÊN BACKEND (API PAYLOAD BUILDERS) */

/**
 * Chuẩn hóa dữ liệu từ Giao diện Form thành định dạng cấu trúc Payload chính xác để thực hiện gọi API tạo mới (POST).
 */
export function buildJobCreatePayload(form: JobFormState) {
  const computedWorkLocation = joinAddressParts([form.addressDetail, form.wardName, form.provinceName]);
  return {
    title: form.title.trim(),
    companyIntro: form.companyIntro.trim() || null,
    companyWebsite: form.companyWebsite.trim() || null,
    salary: form.salary.trim(),
    expertise: form.expertise.trim(),
    allowedFaculties: Array.from(new Set(form.allowedFaculties.map((x) => String(x || "").trim()).filter(Boolean))),
    experienceRequirement: form.experienceRequirement.trim(),
    recruitmentCount: Number(form.recruitmentCount.trim()),
    workType: form.workType as WorkType,
    deadlineAt: form.deadlineAt,
    jobDescription: form.jobDescription.trim(),
    candidateRequirements: form.candidateRequirements.trim(),
    benefits: form.benefits.trim(),
    workLocation: computedWorkLocation || form.workLocation.trim(),
    workTime: form.workTime.trim(),
    applicationMethod: form.applicationMethod.trim() || null
  };
}
/**
 * Chuẩn hóa dữ liệu từ Giao diện Form thành định dạng cấu trúc 
 * Payload để thực hiện gọi API chỉnh sửa (PUT/PATCH) của tin tuyển dụng.
 */
export function buildJobEditPayload(form: JobFormState) {
  return buildJobCreatePayload(form);
}
/* KHỐI 6: PHÂN QUYỀN VÀ TRẠNG THÁI THAO TÁC (PERMISSION / WORKFLOW LOGIC) */

/**
 * Kiểm tra xem tin tuyển dụng ở trạng thái hiện tại có cho phép chỉnh sửa nội dung hay không.
 */
export function canEditStatus(status: JobStatus): boolean {
  return status === "PENDING" || status === "REJECTED";
}
/**
 * Kiểm tra xem tin tuyển dụng ở trạng thái hiện tại có hợp lệ để thực hiện thao tác DỪNG tuyển dụng hay không.
 */
export function canStopStatus(status: JobStatus): boolean {
  return status !== "STOPPED";
}

