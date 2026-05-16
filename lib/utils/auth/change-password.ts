//File này là một file utils cho việc đổi mật khẩu trung gian giữa client và server
import type {
  AuthMeResponse,
  ChangePasswordApiResponse,
  ChangePasswordFormErrors,
  ValidateChangePasswordFormResult
} from "@/lib/types/auth/change-password"; //gọi kiểu dữ liệu cho chức năng đổi mật khẩu
import {
  CHANGE_PASSWORD_ERROR_CONFIRM_EMPTY,
  CHANGE_PASSWORD_ERROR_CONFIRM_MISMATCH,
  CHANGE_PASSWORD_ERROR_CURRENT_EMPTY,
  CHANGE_PASSWORD_ERROR_NEW_EMPTY,
  CHANGE_PASSWORD_ERROR_NEW_SAME_AS_CURRENT,
  CHANGE_PASSWORD_ERROR_NETWORK,
  CHANGE_PASSWORD_ERROR_SUBMIT_DEFAULT,
  CHANGE_PASSWORD_ERROR_SUBMIT_UNAUTHORIZED,
  CHANGE_PASSWORD_ERROR_WEAK,
  CHANGE_PASSWORD_SUCCESS_DEFAULT
} from "@/lib/constants/auth/change-password"; //gọi các hằng số cho chức năng đổi mật khẩu
import { AUTH_STRONG_PASSWORD_PATTERN } from "@/lib/constants/auth/patterns"; //gọi hằng số cho chức năng đổi mật khẩu

export function validateChangePasswordForm(args: { //hàm validate form đổi mật khẩu trước khi gửi lên server
  currentPassword: string; //mật khẩu hiện tại
  newPassword: string; //mật khẩu mới
  confirmPassword: string; //mật khẩu xác nhận
}): ValidateChangePasswordFormResult { //kiểu dữ liệu cho kết quả validate form đổi mật khẩu
  const { currentPassword, newPassword, confirmPassword } = args;

  const errors: ChangePasswordFormErrors = {}; //khởi tạo errors là một object với key là currentPassword, newPassword và confirmPassword và value là lỗi

  if (!currentPassword.trim()) { //nếu mật khẩu hiện tại không có gì thì set lỗi mật khẩu hiện tại
    errors.currentPassword = CHANGE_PASSWORD_ERROR_CURRENT_EMPTY;
  }

  if (!newPassword.trim()) { //nếu mật khẩu mới không có gì thì set lỗi mật khẩu mới
    errors.newPassword = CHANGE_PASSWORD_ERROR_NEW_EMPTY;
  } else if (newPassword === currentPassword) { //nếu mật khẩu mới trùng với mật khẩu hiện tại thì set lỗi mật khẩu mới
    errors.newPassword = CHANGE_PASSWORD_ERROR_NEW_SAME_AS_CURRENT;
  } else if (!AUTH_STRONG_PASSWORD_PATTERN.test(newPassword)) { //nếu mật khẩu mới không hợp lệ thì set lỗi mật khẩu mới
    errors.newPassword = CHANGE_PASSWORD_ERROR_WEAK;
  }

  if (!confirmPassword.trim()) { //nếu mật khẩu xác nhận không có gì thì set lỗi mật khẩu xác nhận
    errors.confirmPassword = CHANGE_PASSWORD_ERROR_CONFIRM_EMPTY;
  } else if (newPassword !== confirmPassword) { //nếu mật khẩu mới không khớp với mật khẩu xác nhận thì set lỗi mật khẩu xác nhận
    errors.confirmPassword = CHANGE_PASSWORD_ERROR_CONFIRM_MISMATCH;
  }

  const isValid = Object.keys(errors).length === 0; //nếu không có lỗi thì trả về true
  return { isValid, errors }; //trả về kết quả validate form đổi mật khẩu
}
//Nhận code lỗi từ API server trả về, ánh xạ sang đúng field để hiển thị:
export function mapChangePasswordApiError(args: { //hàm map lỗi đổi mật khẩu từ server về client
  code?: string; //mã lỗi
  message?: string; //thông báo lỗi
}): ChangePasswordFormErrors {  
  const { code, message } = args; //lấy mã lỗi và thông báo lỗi từ args

  if (code === "UNAUTHORIZED") //nếu mã lỗi là UNAUTHORIZED thì set lỗi submit
    return { submitError: message || CHANGE_PASSWORD_ERROR_SUBMIT_UNAUTHORIZED }; //trả về lỗi submit

  // Keep mapping aligned with existing backend error codes. //nếu mã lỗi là WRONG_CURRENT thì set lỗi mật khẩu hiện tại
  if (code === "WRONG_CURRENT") return { currentPassword: message }; //trả về lỗi mật khẩu hiện tại
  if (code === "SAME_AS_CURRENT" || code === "WEAK_PASSWORD") return { newPassword: message }; //trả về lỗi mật khẩu mới
  if (code === "CONFIRM_NOT_MATCH") return { confirmPassword: message }; //trả về lỗi mật khẩu xác nhận

  return { submitError: message || CHANGE_PASSWORD_ERROR_SUBMIT_DEFAULT }; //trả về lỗi submit
}

export function getChangePasswordSuccessMessage(args: { responseMessage?: string }): string { //hàm lấy thông báo thành công đổi mật khẩu
  return args.responseMessage || CHANGE_PASSWORD_SUCCESS_DEFAULT; //trả về thông báo thành công đổi mật khẩu
}

export function getChangePasswordNetworkErrorMessage(): string { //hàm lấy thông báo lỗi mạng đổi mật khẩu
  return CHANGE_PASSWORD_ERROR_NETWORK; //trả về thông báo lỗi mạng đổi mật khẩu
}

export function normalizeAuthMeResponse(data: unknown): AuthMeResponse { // trả về đường dẫn đích sau khi đăng nhập thành công
  const d = data as AuthMeResponse; //lấy response auth me từ data 
  if (!d || typeof d !== "object") return {}; //nếu response auth me không hợp lệ thì trả về empty object
  return { home: typeof d.home === "string" ? d.home : undefined }; //trả về response auth me
}

