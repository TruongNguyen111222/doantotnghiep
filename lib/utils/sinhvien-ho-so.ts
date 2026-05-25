import type { SinhVienHoSoDraft, SinhVienHoSoProfile, SinhVienHoSoDraft as Draft, Province, Ward } from "@/lib/types/sinhvien-ho-so";
import type { StudentDegree, StudentGender, SupervisorDegree } from "@/lib/types/sinhvien-ho-so";
import type { SinhVienHoSoProfile as Profile } from "@/lib/types/sinhvien-ho-so";
import { AUTH_EMAIL_REGISTER_PATTERN } from "@/lib/constants/auth/patterns";
import {
  CV_ALLOWED_MIMES,
  CV_ERROR_INVALID_MIME,
  CV_ERROR_REQUIRED,
  CURRENT_PROVINCE_CODE_ERROR,
  CURRENT_WARD_CODE_ERROR,
  INTRO_ERROR_MAX_LENGTH,
  INTRO_ERROR_REQUIRED,
  PHONE_ERROR,
  PHONE_PATTERN,
  SINHVIEN_HO_SO_SUBMIT_ERROR_DEFAULT,
  SINHVIEN_HO_SO_SUBMIT_SUCCESS_DEFAULT,
  SINHVIEN_HO_SO_LOAD_ACCOUNT_ERROR_DEFAULT,
  SINHVIEN_HO_SO_LOAD_PROFILE_ERROR_DEFAULT
} from "@/lib/constants/sinhvien-ho-so";
import type { SinhVienHoSoProfile as SinhVienHoSoProfileType } from "@/lib/types/sinhvien-ho-so";
import type { SinhVienHoSoDraft as SinhVienHoSoDraftType } from "@/lib/types/sinhvien-ho-so";

//xử lý logic cho hồ sơ sinh viên

export function formatDateVi(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("vi-VN");
}

export function mapProfileToDraft(profile: SinhVienHoSoProfileType | null): SinhVienHoSoDraftType { //chuyển đổi thông tin hồ sơ sinh viên từ profile sang draft
  return {
    phone: String(profile?.phone ?? ""),
    email: String(profile?.email ?? ""),
    currentProvinceCode: String(profile?.currentProvinceCode ?? ""),
    currentWardCode: String(profile?.currentWardCode ?? ""),
    intro: String(profile?.intro ?? ""),
    cvFileName: profile?.cvFileName ?? null,
    cvMime: profile?.cvMime ?? null,
    cvFile: null
  };
}

export function validateSinhVienHoSoDraft(draft: SinhVienHoSoDraftType): { isValid: boolean; errors: Record<string, string> } {
  const next: Record<string, string> = {};

  if (!PHONE_PATTERN.test(draft.phone.trim())) next.phone = PHONE_ERROR;
  if (!AUTH_EMAIL_REGISTER_PATTERN.test(draft.email.trim())) next.email = "Email không đúng định dạng (ví dụ: example@domain.com).";
  if (!draft.currentProvinceCode) next.currentProvinceCode = CURRENT_PROVINCE_CODE_ERROR;
  if (!draft.currentWardCode) next.currentWardCode = CURRENT_WARD_CODE_ERROR;
  if (!draft.intro.trim()) next.intro = INTRO_ERROR_REQUIRED;
  if (draft.intro.trim().length > 3000) next.intro = INTRO_ERROR_MAX_LENGTH;
  if (!draft.cvFile && !draft.cvFileName) next.cv = CV_ERROR_REQUIRED;

  return { isValid: Object.keys(next).length === 0, errors: next };
}

export function isCvMimeAllowed(mime: string | null | undefined): boolean {
  if (!mime) return false;
  return (CV_ALLOWED_MIMES as readonly string[]).includes(mime);
}

export function getCvFileValidationError(mime: string | null | undefined): string | null { //lấy lỗi file CV không hợp lệ
  if (!isCvMimeAllowed(mime)) return CV_ERROR_INVALID_MIME;
  return null;
}

export function buildSinhVienHoSoPatchPayload(draft: SinhVienHoSoDraftType): { //tạo payload để cập nhật hồ sơ sinh viên
  phone: string;
  email: string;
  currentProvinceCode: string;
  currentWardCode: string;
  intro: string;
} {
  return {
    phone: draft.phone.trim(),
    email: draft.email.trim(),
    currentProvinceCode: draft.currentProvinceCode,
    currentWardCode: draft.currentWardCode,
    intro: draft.intro.trim()
  };
}

export function getSinhVienHoSoSubmitErrorMessage(args: { message?: string } | undefined): string { //lấy lỗi cập nhật hồ sơ sinh viên
  return args?.message || SINHVIEN_HO_SO_SUBMIT_ERROR_DEFAULT;
}

export function getSinhVienHoSoSubmitSuccessMessage(args: { message?: string } | undefined): string { //lấy thông báo thành công cập nhật hồ sơ sinh viên
  return args?.message || SINHVIEN_HO_SO_SUBMIT_SUCCESS_DEFAULT;
}

export function getSinhVienHoSoLoadAccountErrorMessage(err: unknown): string { //lấy lỗi tải thông tin tài khoản sinh viên
  if (err instanceof Error) return err.message || SINHVIEN_HO_SO_LOAD_ACCOUNT_ERROR_DEFAULT;
  return SINHVIEN_HO_SO_LOAD_ACCOUNT_ERROR_DEFAULT;
}

export function getSinhVienHoSoLoadProfileErrorMessage(err: unknown): string { //lấy lỗi tải thông tin hồ sơ sinh viên
  if (err instanceof Error) return err.message || SINHVIEN_HO_SO_LOAD_PROFILE_ERROR_DEFAULT;
  return SINHVIEN_HO_SO_LOAD_PROFILE_ERROR_DEFAULT;
}

