import type {
  ForgotPasswordApiResponse,
  ForgotPasswordFormErrors,
  ValidateForgotPasswordFormResult
} from "@/lib/types/auth/forgot-password";  //hàm validateForgotPasswordForm để validate dữ liệu đăng nhập
import {
  FORGOT_PASSWORD_EMAIL_REGEX,
  FORGOT_PASSWORD_ERROR_EMAIL_EMPTY,
  FORGOT_PASSWORD_ERROR_EMAIL_INVALID,
  FORGOT_PASSWORD_ERROR_NETWORK,
  FORGOT_PASSWORD_ERROR_SUBMIT_DEFAULT,
  FORGOT_PASSWORD_SUCCESS_DEFAULT
} from "@/lib/constants/auth/forgot-password"; //validate dữ liệu đăng nhập

export function normalizeForgotPasswordEmail(email: string): string { //chuyển đổi email thành lowercase
  return email.trim().toLowerCase();
}

export function validateForgotPasswordForm(args: { //kiểm tra dữ liệu đăng nhập trước khi gửi lên server
  email: string;
}): ValidateForgotPasswordFormResult { // kiểu tra về
  const normalizedEmail = normalizeForgotPasswordEmail(args.email); //chuyển đổi email thành lowercase

  const errors: ForgotPasswordFormErrors = {}; //chứa lỗi đăng nhập

  if (!normalizedEmail) {
    errors.email = FORGOT_PASSWORD_ERROR_EMAIL_EMPTY; //nếu email không có gì thì set lỗi email
  } else if (!FORGOT_PASSWORD_EMAIL_REGEX.test(normalizedEmail)) { //nếu email không hợp lệ thì set lỗi email
    errors.email = FORGOT_PASSWORD_ERROR_EMAIL_INVALID; //nếu email không hợp lệ thì set lỗi email
  }

  return { //trả về kết quả validate dữ liệu đăng nhập
    isValid: Object.keys(errors).length === 0, //nếu không có lỗi thì trả về true
    normalizedEmail, //email đã được chuẩn hóa
    errors //lỗi đăng nhập
  };
}

export function mapForgotPasswordApiError(args: { //chuyển lỗi từ API/backend thành lỗi để frontend hiển thị đúng chỗ.
  code?: string; //mã lỗi
  message?: string; //thông báo lỗi
}): { emailError?: string; submitError?: string } { //chuyển lỗi từ API/backend thành lỗi để frontend hiển thị đúng chỗ.
  const { message } = args as ForgotPasswordApiResponse; //lấy mã lỗi và thông báo lỗi từ args
  return {
    emailError: message || FORGOT_PASSWORD_ERROR_SUBMIT_DEFAULT //nếu mã lỗi không phải EMPTY_EMAIL hoặc INVALID_FORMAT thì set lỗi submit
  };
}

export function getForgotPasswordSuccessMessage(args: { responseMessage?: string }): string { //lấy thông báo thành công từ API/backend
  return args.responseMessage || FORGOT_PASSWORD_SUCCESS_DEFAULT; //nếu có thông báo thành công thì trả về thông báo thành công, nếu không thì trả về thông báo mặc định
}

export function getForgotPasswordNetworkErrorMessage(): string { //lấy thông báo lỗi submit từ API/backend
  return FORGOT_PASSWORD_ERROR_NETWORK; //trả về thông báo lỗi submit
}

