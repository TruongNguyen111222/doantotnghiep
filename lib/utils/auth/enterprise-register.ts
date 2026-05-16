
//trước khi gửi dữ liệu lên server, nó kiểm tra toàn bộ các trường xem người dùng điền đúng chưa. 
// Nếu sai thì trả về danh sách lỗi để hiện lên màn hình, không gửi lên server.


import type { FormDataState } from "@/lib/types/enterprise-register";
import {
  ENTERPRISE_ADDRESS_PATTERN,
  ENTERPRISE_EMAIL_REGEX,
  ENTERPRISE_LETTER_ONLY_PATTERN,
  ENTERPRISE_WEBSITE_REGEX
} from "@/lib/constants/auth/enterprise-register";
import { DOANHNGHIEP_MAX_UPLOAD_FILE_LABEL, MAX_ENTERPRISE_UPLOAD_BYTES } from "@/lib/constants/doanhnghiep";

export type ValidateEnterpriseRegisterResult = {
  isValid: boolean;
  errors: Record<string, string>;
};

export function getInitialRegisterForm(
  emptyForm: FormDataState,
  demoForm: Partial<FormDataState>,
  prefillFlag: string | undefined
): FormDataState {
  if (prefillFlag === "1") {
    return { ...emptyForm, ...demoForm };
  }
  return emptyForm;
}

export function validateEnterpriseRegisterForm(args: {
  form: FormDataState;
  businessLicense: File | null;
  companyLogo: File | null;
}): ValidateEnterpriseRegisterResult {
  const { form, businessLicense, companyLogo } = args;
  const nextErrors: Record<string, string> = {};

  if (!form.companyName?.trim()) nextErrors.companyName = "Vui lòng nhập tên doanh nghiệp.";
  else if (form.companyName.length > 255) nextErrors.companyName = "Tên doanh nghiệp tối đa 255 ký tự.";

  if (!form.taxCode?.trim()) nextErrors.taxCode = "Vui lòng nhập mã số thuế.";
  else if (!/^\d{10,15}$/.test(form.taxCode)) nextErrors.taxCode = "Mã số thuế chỉ gồm số, dài 10-15 ký tự.";

  if (!form.businessFields.length) nextErrors.businessFields = "Vui lòng chọn ít nhất 1 ngành/khoa.";

  if (!form.provinceCode || !form.provinceName) nextErrors.province = "Vui lòng chọn tỉnh/thành.";
  if (!form.wardCode || !form.wardName) nextErrors.ward = "Vui lòng chọn phường/xã.";

  if (!form.addressDetail?.trim()) nextErrors.addressDetail = "Vui lòng nhập địa chỉ chi tiết.";
  else if (!ENTERPRISE_ADDRESS_PATTERN.test(form.addressDetail)) {
    nextErrors.addressDetail = "Địa chỉ chi tiết chỉ gồm chữ, số và khoảng trắng (không ký tự đặc biệt), dài 1-255 ký tự.";
  }

  if (!businessLicense) nextErrors.businessLicense = "Vui lòng đính kèm giấy phép kinh doanh.";
  else if (businessLicense.size > MAX_ENTERPRISE_UPLOAD_BYTES) {
    nextErrors.businessLicense = `Giấy phép tối đa ${DOANHNGHIEP_MAX_UPLOAD_FILE_LABEL} / file.`;
  }

  if (!companyLogo) nextErrors.companyLogo = "Vui lòng tải lên logo công ty.";
  else if (companyLogo.size > MAX_ENTERPRISE_UPLOAD_BYTES) {
    nextErrors.companyLogo = `Logo tối đa ${DOANHNGHIEP_MAX_UPLOAD_FILE_LABEL} / file.`;
  }
  if (form.website && !ENTERPRISE_WEBSITE_REGEX.test(form.website)) {
    nextErrors.website = "Website không đúng định dạng.";
  }

  if (!form.representativeName?.trim()) nextErrors.representativeName = "Vui lòng nhập họ và tên người đại diện.";
  else if (!ENTERPRISE_LETTER_ONLY_PATTERN.test(form.representativeName)) {
    nextErrors.representativeName = "Họ và tên chỉ gồm ký tự chữ, dài 1-255.";
  }

  if (!form.representativeTitle?.trim()) nextErrors.representativeTitle = "Vui lòng nhập chức vụ người đại diện.";
  else if (!ENTERPRISE_LETTER_ONLY_PATTERN.test(form.representativeTitle)) {
    nextErrors.representativeTitle = "Chức vụ chỉ gồm ký tự chữ, dài 1-255.";
  }

  if (!form.phone?.trim()) nextErrors.phone = "Vui lòng nhập số điện thoại.";
  else if (!/^\d{8,12}$/.test(form.phone)) nextErrors.phone = "Số điện thoại chỉ gồm số, dài 8-12 ký tự.";

  if (!form.email?.trim()) nextErrors.email = "Vui lòng nhập email.";
  else if (!ENTERPRISE_EMAIL_REGEX.test(form.email)) nextErrors.email = "Email phải đúng định dạng example@domain.com.";

  return {
    isValid: Object.keys(nextErrors).length === 0,
    errors: nextErrors
  };
}

