import type { AppStatus, ResponseStatus } from "@/lib/types/sinhvien-quan-ly-dang-ky-ung-tuyen";

export const SINHVIEN_QUAN_LY_DANG_KY_UNG_TUYEN_ENDPOINT = "/api/sinhvien/ung-tuyen";

export const SINHVIEN_QUAN_LY_DANG_KY_UNG_TUYEN_LOAD_ERROR_DEFAULT = "Không thể tải danh sách ứng tuyển.";
export const SINHVIEN_QUAN_LY_DANG_KY_UNG_TUYEN_RESPOND_NETWORK_ERROR_DEFAULT =
  "Không thể cập nhật phản hồi.";
export const SINHVIEN_QUAN_LY_DANG_KY_UNG_TUYEN_RESPOND_SUCCESS_DEFAULT = "Cập nhật phản hồi thành công.";

export const SINHVIEN_QUAN_LY_DANG_KY_UNG_TUYEN_EMPTY_TEXT = "Bạn chưa ứng tuyển tin nào.";

export const SINHVIEN_QUAN_LY_DANG_KY_UNG_TUYEN_FIND_BUTTON_TEXT = "Tìm kiếm";

export const SINHVIEN_QUAN_LY_DANG_KY_UNG_TUYEN_CONFIRM_INTERVIEW_TEXT = "Xác nhận phỏng vấn";
export const SINHVIEN_QUAN_LY_DANG_KY_UNG_TUYEN_DECLINE_INTERVIEW_TEXT = "Từ chối phỏng vấn";
export const SINHVIEN_QUAN_LY_DANG_KY_UNG_TUYEN_CONFIRM_INTERNSHIP_TEXT = "Xác nhận thực tập";
export const SINHVIEN_QUAN_LY_DANG_KY_UNG_TUYEN_DECLINE_INTERNSHIP_TEXT = "Từ chối thực tập";
export const SINHVIEN_QUAN_LY_DANG_KY_UNG_TUYEN_CONFIRM_INTERNSHIP_BLOCKED_HINT =
  "Bạn đã xác nhận thực tập tại một tin khác.";

export const SINHVIEN_QUAN_LY_DANG_KY_UNG_TUYEN_RESPONSE_PENDING_TEXT = "Chưa phản hồi";
export const SINHVIEN_QUAN_LY_DANG_KY_UNG_TUYEN_RESPONSE_ACCEPTED_TEXT = "Đã xác nhận";
export const SINHVIEN_QUAN_LY_DANG_KY_UNG_TUYEN_RESPONSE_DECLINED_TEXT = "Đã từ chối";

export const sinhvienQuanLyDangKyUngTuyenStatusLabel: Record<AppStatus, string> = {
  PENDING_REVIEW: "Chờ xem xét",
  INTERVIEW_INVITED: "Mời phỏng vấn",
  OFFERED: "Trúng tuyển",
  REJECTED: "Từ chối",
  STUDENT_DECLINED: "Từ chối"
};

export const sinhvienQuanLyDangKyUngTuyenResponseLabel: Record<ResponseStatus, string> = {
  PENDING: SINHVIEN_QUAN_LY_DANG_KY_UNG_TUYEN_RESPONSE_PENDING_TEXT,
  ACCEPTED: SINHVIEN_QUAN_LY_DANG_KY_UNG_TUYEN_RESPONSE_ACCEPTED_TEXT,
  DECLINED: SINHVIEN_QUAN_LY_DANG_KY_UNG_TUYEN_RESPONSE_DECLINED_TEXT
};

