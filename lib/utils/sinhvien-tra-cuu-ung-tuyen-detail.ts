import type {
  SinhVienApplyDraft,
  SinhVienApplyProfile,
  SinhVienTraCuuUngTuyenJobDetail,
  SinhVienApplyDraft as Draft
} from "@/lib/types/sinhvien-tra-cuu-ung-tuyen-detail";
import { AUTH_EMAIL_REGISTER_PATTERN } from "@/lib/constants/auth/patterns";
import {
  CV_ALLOWED_MIMES,
  PHONE_PATTERN,
  SINHVIEN_TRA_CUU_UNG_TUYEN_CV_ERROR_INVALID,
  SINHVIEN_TRA_CUU_UNG_TUYEN_CV_ERROR_REQUIRED,
  SINHVIEN_TRA_CUU_UNG_TUYEN_OPEN_APPLY_ERROR_DEFAULT,
  SINHVIEN_TRA_CUU_UNG_TUYEN_PROFILE_ENDPOINT,
  SINHVIEN_TRA_CUU_UNG_TUYEN_VALIDATE_ERROR_EMAIL,
  SINHVIEN_TRA_CUU_UNG_TUYEN_VALIDATE_ERROR_INTRO,
  SINHVIEN_TRA_CUU_UNG_TUYEN_VALIDATE_ERROR_PHONE,
  SINHVIEN_TRA_CUU_UNG_TUYEN_DETAIL_ENDPOINT,
  SINHVIEN_TRA_CUU_UNG_TUYEN_LOAD_DETAIL_ERROR_DEFAULT,
  SINHVIEN_TRA_CUU_UNG_TUYEN_LOAD_PROFILE_ERROR_DEFAULT,
  SINHVIEN_TRA_CUU_UNG_TUYEN_SUBMIT_ERROR_DEFAULT,
  SINHVIEN_TRA_CUU_UNG_TUYEN_SUBMIT_SUCCESS_DEFAULT
} from "@/lib/constants/sinhvien-tra-cuu-ung-tuyen-detail";

export function formatDateVi(iso: string | null): string { //hàm format ngày tháng năm
  if (!iso) return "—"; 
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—"; 
  return d.toLocaleDateString("vi-VN"); //format ngày tháng năm
}

export function buildSinhVienTraCuuUngTuyenDetailUrl(jobId: string): string { //hàm tạo URL chi tiết tin tuyển dụng
  return `${SINHVIEN_TRA_CUU_UNG_TUYEN_DETAIL_ENDPOINT}/${jobId}`; //trả về URL chi tiết tin tuyển dụng
}

export function buildSinhVienTraCuuUngTuyenApplyUrl(jobId: string): string { //hàm tạo URL ứng tuyển
  return `${SINHVIEN_TRA_CUU_UNG_TUYEN_DETAIL_ENDPOINT}/${jobId}/apply`;
}

export function fetchSinhVienTraCuuUngTuyenDetail(jobId: string): Promise<{ item: SinhVienTraCuuUngTuyenJobDetail }> { //hàm lấy chi tiết tin tuyển dụng
  return fetch(buildSinhVienTraCuuUngTuyenDetailUrl(jobId))
    .then(async (res) => { //gửi request lấy chi tiết tin tuyển dụng
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.message || SINHVIEN_TRA_CUU_UNG_TUYEN_LOAD_DETAIL_ERROR_DEFAULT); //trả về lỗi nếu không thể lấy chi tiết tin tuyển dụng
      return data as { item: SinhVienTraCuuUngTuyenJobDetail }; //trả về chi tiết tin tuyển dụng
    })
    .then((data) => ({ item: data.item })); //trả về chi tiết tin tuyển dụng
}

export function fetchSinhVienHoSoProfileForApply(): Promise<SinhVienApplyProfile> { //hàm lấy hồ sơ sinh viên
  return fetch(SINHVIEN_TRA_CUU_UNG_TUYEN_PROFILE_ENDPOINT)
    .then(async (res) => { //gửi request lấy hồ sơ sinh viên
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.message || SINHVIEN_TRA_CUU_UNG_TUYEN_LOAD_PROFILE_ERROR_DEFAULT); //trả về lỗi nếu không thể lấy hồ sơ sinh viên
      const item = data.item ?? {}; //lấy hồ sơ sinh viên
      return {
        fullName: String(item.fullName || ""),
        phone: item.phone ?? null,
        email: item.email ?? null,
        intro: item.intro ?? null,
        cvFileName: item.cvFileName ?? null,
        cvMime: item.cvMime ?? null,
        hasCv: Boolean(item.hasCv)
      } satisfies SinhVienApplyProfile;
    })
    .catch(() => {
      throw new Error(SINHVIEN_TRA_CUU_UNG_TUYEN_LOAD_PROFILE_ERROR_DEFAULT);
    });
}

export function isCvMimeAllowed(mime: string | null | undefined): boolean { //hàm kiểm tra kiểu MIME file CV
  if (!mime) return false;
  return (CV_ALLOWED_MIMES as readonly string[]).includes(mime); //trả về true nếu kiểu MIME file CV cho phép
}

export function getCvMimeValidationError(mime: string | null | undefined): string | null {
  if (!isCvMimeAllowed(mime)) return SINHVIEN_TRA_CUU_UNG_TUYEN_CV_ERROR_INVALID; //trả về lỗi nếu kiểu MIME file CV không cho phép
  return null; //trả về null nếu kiểu MIME file CV cho phép
}

export function validateSinhVienApplyDraft(draft: SinhVienApplyDraft): { isValid: boolean; errors: Record<string, string> } { //hàm kiểm tra hồ sơ sinh viên
  const next: Record<string, string> = {};

  if (!PHONE_PATTERN.test(draft.phone.trim())) next.phone = SINHVIEN_TRA_CUU_UNG_TUYEN_VALIDATE_ERROR_PHONE; //trả về lỗi nếu số điện thoại không hợp lệ
  if (!AUTH_EMAIL_REGISTER_PATTERN.test(draft.email.trim().toLowerCase())) next.email = SINHVIEN_TRA_CUU_UNG_TUYEN_VALIDATE_ERROR_EMAIL; //trả về lỗi nếu email không hợp lệ
  if (!draft.intro.trim()) next.intro = SINHVIEN_TRA_CUU_UNG_TUYEN_VALIDATE_ERROR_INTRO;
  const hasCv = Boolean(draft.cvFile) || (draft.hasExistingCv && !draft.removeCv);
  if (!hasCv || !draft.cvMime || !draft.cvFileName) next.cv = SINHVIEN_TRA_CUU_UNG_TUYEN_CV_ERROR_REQUIRED;

  return { isValid: Object.keys(next).length === 0, errors: next };
}

export function buildSinhVienTraCuuUngTuyenApplyPayload(draft: Draft): { //hàm tạo payload ứng tuyển
  phone: string;
  email: string;
  intro: string;
  removeCv: boolean;
} {
  return { //trả về payload ứng tuyển
    phone: draft.phone.trim(),
    email: draft.email.trim().toLowerCase(),
    intro: draft.intro.trim(),
    removeCv: draft.removeCv
  };
}

export function getSinhVienTraCuuUngTuyenOpenApplyErrorMessage(err: unknown): string { //hàm lấy lỗi mở popup ứng tuyển
  if (err instanceof Error) return err.message || SINHVIEN_TRA_CUU_UNG_TUYEN_OPEN_APPLY_ERROR_DEFAULT;
  return SINHVIEN_TRA_CUU_UNG_TUYEN_OPEN_APPLY_ERROR_DEFAULT;
}

export function getSinhVienTraCuuUngTuyenSubmitSuccessMessage(message?: string): string {
  return message || SINHVIEN_TRA_CUU_UNG_TUYEN_SUBMIT_SUCCESS_DEFAULT; //trả về lỗi nếu không thể lấy lỗi mở popup ứng tuyển
}

export function getSinhVienTraCuuUngTuyenSubmitErrorMessage(message?: string): string { //hàm lấy lỗi nộp hồ sơ ứng tuyển
  return message || SINHVIEN_TRA_CUU_UNG_TUYEN_SUBMIT_ERROR_DEFAULT;
}

