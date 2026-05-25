import type { Gender, StudentDegree, SupervisorDegree } from "@/lib/types/sinhvien-ho-so-shared";

export const SINHVIEN_HO_SO_TAI_KHOAN_ENDPOINT = "/api/sinhvien/tai-khoan"; //url API lấy thông tin sinh viên
export const SINHVIEN_HO_SO_PROFILE_ENDPOINT = "/api/sinhvien/ho-so-sinh-vien"; //url API lấy thông tin sinh viên

export const SINHVIEN_HO_SO_LOAD_ACCOUNT_ERROR_DEFAULT = "Không thể tải thông tin tài khoản."; //lỗi tải thông tin tài khoản
export const SINHVIEN_HO_SO_LOAD_PROFILE_ERROR_DEFAULT = "Không thể tải hồ sơ sinh viên."; //lỗi tải thông tin sinh viên
export const SINHVIEN_HO_SO_SUBMIT_ERROR_DEFAULT = "Không thể cập nhật hồ sơ sinh viên."; //lỗi cập nhật hồ sơ sinh viên
export const SINHVIEN_HO_SO_SUBMIT_SUCCESS_DEFAULT = "Cập nhật hồ sơ sinh viên thành công."; //lỗi cập nhật hồ sơ sinh viên thành công

export const PHONE_PATTERN = /^\d{8,12}$/; //pattern số điện thoại

export const CV_ALLOWED_MIMES = [ //pattern file CV
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
] as const;

export const CV_ERROR_INVALID_MIME = "Chỉ cho phép file .doc, .docx, .pdf."; //lỗi file CV không hợp lệ
export const CV_ERROR_REQUIRED = "File CV đính kèm bắt buộc."; //lỗi file CV đính kèm bắt buộc

export const INTRO_ERROR_REQUIRED = "Thư giới thiệu bản thân bắt buộc."; //       
export const INTRO_ERROR_MAX_LENGTH = "Thư giới thiệu bản thân tối đa 3000 ký tự.";

export const CURRENT_PROVINCE_CODE_ERROR = "Tỉnh/thành không hợp lệ.";
export const CURRENT_WARD_CODE_ERROR = "Phường/xã không hợp lệ.";

export const PHONE_ERROR = "Số điện thoại chỉ gồm số (8–12 ký tự).";
export const SUBMIT_EMAIL_ERROR_FALLBACK = "Email không đúng định dạng (ví dụ: example@domain.com).";

export const studentDegreeLabel: Record<StudentDegree, string> = { BACHELOR: "Cử nhân", ENGINEER: "Kỹ sư" };
export const supervisorDegreeLabel: Record<SupervisorDegree, string> = {
  MASTER: "Thạc sĩ",
  PHD: "Tiến sĩ",
  ASSOC_PROF: "Phó giáo sư",
  PROF: "Giáo sư"
};
export const genderLabel: Record<Gender, string> = { MALE: "Nam", FEMALE: "Nữ", OTHER: "Khác" };

