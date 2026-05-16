import type {
  ResetPasswordApiResponse,
  ValidateResetPasswordFormResult
} from "@/lib/types/auth/reset-password"; //hàm validateResetPasswordForm để validate dữ liệu đăng nhập
import {
  RESET_PASSWORD_ERROR_CONFIRM_EMPTY,
  RESET_PASSWORD_ERROR_CONFIRM_MISMATCH,
  RESET_PASSWORD_ERROR_MISSING_TOKEN,
  RESET_PASSWORD_ERROR_NEW_PASSWORD_EMPTY,
  RESET_PASSWORD_ERROR_PASSWORD_WEAK,
  RESET_PASSWORD_NETWORK_ERROR,
  RESET_PASSWORD_PASSWORD_REGEX,
  RESET_PASSWORD_SUBMIT_ERROR_DEFAULT,
  RESET_PASSWORD_SUCCESS_DEFAULT
} from "@/lib/constants/auth/reset-password";  //validate dữ liệu đăng nhập

export function validateResetPasswordForm(args: {  //kiểm tra dữ liệu đăng nhập trước khi gửi lên server
  newPassword: string; //mật khẩu mới
  confirmPassword: string; //mật khẩu xác nhận
  resetToken: string; //token đặt lại mật khẩu
}): ValidateResetPasswordFormResult { // kiểu tra về
  const { newPassword, confirmPassword, resetToken } = args; //lấy dữ liệu đăng nhập từ args( là dữ liệu truyteenf vào)

  const errors: ValidateResetPasswordFormResult["errors"] = {}; //khởi tạo errors là một object với key là newPassword và confirmPassword

  if (!newPassword.trim()) { //nếu mật khẩu mới không có gì thì set lỗi mật khẩu mới
    errors.newPassword = RESET_PASSWORD_ERROR_NEW_PASSWORD_EMPTY; //set lỗi mật khẩu mới
  } else if (!RESET_PASSWORD_PASSWORD_REGEX.test(newPassword)) { //nếu mật khẩu mới không hợp lệ thì set lỗi mật khẩu mới
    errors.newPassword = RESET_PASSWORD_ERROR_PASSWORD_WEAK; //set lỗi mật khẩu mới
  }

  if (!confirmPassword.trim()) { //nếu mật khẩu xác nhận không có gì thì set lỗi mật khẩu xác nhận
    errors.confirmPassword = RESET_PASSWORD_ERROR_CONFIRM_EMPTY; //set lỗi mật khẩu xác nhận
  } else if (newPassword !== confirmPassword) { //nếu mật khẩu mới không khớp với mật khẩu xác nhận thì set lỗi mật khẩu xác nhận
    errors.confirmPassword = RESET_PASSWORD_ERROR_CONFIRM_MISMATCH; //set lỗi mật khẩu xác nhận
  }

  if (!resetToken.trim()) { //nếu token đặt lại mật khẩu không có gì thì set lỗi token đặt lại mật khẩu
    errors.submitError = RESET_PASSWORD_ERROR_MISSING_TOKEN; //set lỗi token đặt lại mật khẩu
  }

  const isValid = //nếu cả 3 không có lỗi thì trả về true
    !errors.newPassword && !errors.confirmPassword && !errors.submitError;

  return { isValid, errors }; //trả về kết quả validate dữ liệu đăng nhập
} 

export function mapResetPasswordApiError(args: { //chuyển lỗi từ API/backend thành lỗi để frontend hiển thị đúng chỗ.
  code?: string; //mã lỗi
  message?: string; //thông báo lỗi
}): { newPasswordError?: string; confirmPasswordError?: string; submitError?: string } {
  const { code, message } = args; //lấy mã lỗi và thông báo lỗi từ args

  if (code === "WEAK_PASSWORD") return { newPasswordError: message || "" }; //nếu mã lỗi là WEAK_PASSWORD thì set lỗi mật khẩu mới
  if (code === "CONFIRM_NOT_MATCH") return { confirmPasswordError: message || "" }; //nếu mã lỗi là CONFIRM_NOT_MATCH thì set lỗi mật khẩu xác nhận

  return { submitError: message || RESET_PASSWORD_SUBMIT_ERROR_DEFAULT }; //nếu mã lỗi không phải WEAK_PASSWORD hoặc CONFIRM_NOT_MATCH thì set lỗi submit
}

export function getResetPasswordSuccessMessage(args: { responseMessage?: string }): string { //lấy thông báo thành công từ API/backend
  return args.responseMessage || RESET_PASSWORD_SUCCESS_DEFAULT; //nếu có thông báo thành công thì trả về thông báo thành công, nếu không thì trả về thông báo mặc định
}

export function getResetPasswordSubmitErrorMessage(): string { //lấy thông báo lỗi submit từ API/backend
  return RESET_PASSWORD_NETWORK_ERROR; //trả về thông báo lỗi submit
}

export function getResetPasswordRedirectPath(args: { redirectPath?: string }): string { //lấy đường dẫn đăng nhập từ API/backend
  return args.redirectPath || "/auth/dangnhap"; //nếu có đường dẫn đăng nhập thì trả về đường dẫn đăng nhập, nếu không thì trả về đường dẫn mặc định
}

export function normalizeResetPasswordApiResponse(data: ResetPasswordApiResponse | unknown): { //chuyển đổi dữ liệu từ API/backend thành dữ liệu để frontend hiển thị
  code?: string; //mã lỗi
  message?: string; //thông báo lỗi
  redirectPath?: string; //đường dẫn đăng nhập
} {
  const d = data as ResetPasswordApiResponse; //ép kiểu dữ liệu từ API/backend thành dữ liệu để frontend hiển thị
  if (!d || typeof d !== "object") return {}; //nếu dữ liệu không hợp lệ thì trả về empty object
  return { code: d.code, message: d.message, redirectPath: d.redirectPath }; //trả về dữ liệu để frontend hiển thị
}

