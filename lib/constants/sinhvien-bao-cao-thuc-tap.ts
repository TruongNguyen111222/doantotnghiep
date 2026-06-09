import type { Gender, InternshipReportReviewStatus, InternshipStatus, SupervisorDegree } from "@/lib/types/sinhvien-bao-cao-thuc-tap";

export const SINHVIEN_BAO_CAO_THUC_TAP_ENDPOINT = "/api/sinhvien/bao-cao-thuc-tap";

export const SINHVIEN_BAO_CAO_THUC_TAP_LOAD_ERROR_DEFAULT = "Không thể tải tiến độ thực tập.";
export const SINHVIEN_BAO_CAO_THUC_TAP_SUBMIT_NEW_ERROR_DEFAULT = "Nộp BCTT thất bại.";
export const SINHVIEN_BAO_CAO_THUC_TAP_SUBMIT_EDIT_ERROR_DEFAULT = "Sửa BCTT thất bại.";

export const SINHVIEN_BAO_CAO_THUC_TAP_SUBMIT_NEW_SUCCESS_DEFAULT = "Nộp BCTT thành công.";
export const SINHVIEN_BAO_CAO_THUC_TAP_SUBMIT_EDIT_SUCCESS_DEFAULT =
  "Đã sửa BCTT. Đang chờ giảng viên hướng dẫn duyệt.";

export const BCTT_ALLOWED_MIMES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
] as const;

export const BCTT_ERROR_INVALID_MIME = "File BCTT chỉ chấp nhận PDF hoặc DOCX.";
export const BCTT_ERROR_REQUIRED_FILE_BEFORE_SUBMIT = "Vui lòng chọn file BCTT trước khi nộp.";
export const BCTT_ERROR_REQUIRED_FILE_BEFORE_EDIT = "Vui lòng upload file BCTT mới theo đề xuất chỉnh sửa của GVHD.";
export const BCTT_ERROR_REQUIRED_ENTERPRISE_EVAL =
  "Vui lòng nộp phiếu đánh giá kết quả thực tập của doanh nghiệp (PDF hoặc DOCX).";
export const BCTT_ERROR_INVALID_ENTERPRISE_EVAL_MIME =
  "Phiếu đánh giá doanh nghiệp chỉ chấp nhận PDF hoặc DOCX.";

export const internshipStatusLabel: Record<InternshipStatus, string> = {
  NOT_STARTED: "Chưa thực tập",
  DOING: "Đang thực tập",
  SELF_FINANCED: "Thực tập tự túc",
  REPORT_SUBMITTED: "Đã nộp BCTT",
  COMPLETED: "Hoàn thành thực tập",
  REJECTED: "Từ chối"
};

export const internshipReportReviewStatusLabel: Record<InternshipReportReviewStatus, string> = {
  PENDING: "Chờ xem xét",
  REJECTED: "Từ chối",
  APPROVED: "Đã duyệt"
};

export const genderLabel: Record<Gender, string> = {
  MALE: "Nam",
  FEMALE: "Nữ",
  OTHER: "Khác"
};

export const supervisorDegreeLabel: Record<SupervisorDegree, string> = {
  MASTER: "Thạc sĩ",
  PHD: "Tiến sĩ",
  ASSOC_PROF: "Phó giáo sư",
  PROF: "Giáo sư"
};

