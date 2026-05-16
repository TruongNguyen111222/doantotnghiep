import type { LoginApiResponse, ValidateLoginFormResult } from "@/lib/types/auth/login";
import {
  LOGIN_EMAIL_REGEX,
  LOGIN_IDENTIFIER_ERROR_EMPTY,
  LOGIN_IDENTIFIER_ERROR_INVALID,
  LOGIN_NETWORK_ERROR,
  LOGIN_PASSWORD_ERROR_EMPTY,
  LOGIN_SUBMIT_ERROR_FAIL
} from "@/lib/constants/auth/login";
import { resolveLoginEmail } from "@/lib/auth/identifier";

//Kiểm tra email/password hợp lệ trước khi gửi lên server
export function validateLoginForm(args: { //tham số truyền vào là identifier và password
  identifier: string; //email đăng nhập vào form
  password: string; //mật khẩu đăng nhập vào form
}): ValidateLoginFormResult {
  const { identifier, password } = args; //lấy tham số truyền vào và gán cho identifier và password

  const errors: { identifier?: string; password?: string } = {}; //khởi tạo errors là một object với key là identifier và password
  const idTrim = identifier.trim();

  if (!idTrim) { //nếu email không có gì thì set lỗi email
    errors.identifier = LOGIN_IDENTIFIER_ERROR_EMPTY;
  } else if (idTrim.toLowerCase() !== "admin" && !LOGIN_EMAIL_REGEX.test(idTrim.toLowerCase())) { //nếu email không phải là admin và không hợp lệ thì set lỗi email
    errors.identifier = LOGIN_IDENTIFIER_ERROR_INVALID; //set lỗi email
  }

  if (!password.trim()) { //nếu mật khẩu không có gì thì set lỗi mật khẩu
    errors.password = LOGIN_PASSWORD_ERROR_EMPTY; //set lỗi mật khẩu
  }

  return {
    isValid: Object.keys(errors).length === 0, //nếu không có lỗi thì trả về true
    errors //trả về errors
  };
}

//lấy đường dẫn đích sau khi đăng nhập thành công
export function getSafeNextPath(nextRaw: string | null): string | null {  //
  if (!nextRaw) return null; //nếu nextRaw không có thì trả về null
  return nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : null; 
  // //nếu nextRaw bắt đầu bằng / và không bắt đầu bằng // thì trả về nextRaw
}

//lấy đường dẫn đích sau khi đăng nhập thành công
export function getLoginRedirectDest(args: { //tham số truyền vào là nextRaw và redirectPath
  nextRaw: string | null;
  redirectPath?: string;
}): string {
  const safeNext = getSafeNextPath(args.nextRaw);
  return safeNext || args.redirectPath || "/";
}

//Quyết định có hiện link "Quên mật khẩu" không (ẩn với tài khoản admin)
export function shouldShowForgotPassword(args: { //tham số truyền vào là identifierFocused và identifier
  identifierFocused: boolean; //trạng thái focus email có nhấp vào email hay không
  identifier: string; //email đăng nhập vào form
}): boolean {
  const { identifierFocused, identifier } = args; //lấy tham số truyền vào và gán cho identifierFocused và identifier
  if (!identifierFocused) return true; //nếu không nhấp vào email thì hiển thị link "Quên mật khẩu"
  return resolveLoginEmail(identifier) !== "admin@utc.edu.vn"; //nếu email không phải là admin thì hiển thị link "Quên mật khẩu"
}

//chuyển đổi lỗi API thành lỗi form để hiển thị cho user
export function mapLoginApiErrorToForm(args: {
  code?: string;
  message?: string;
}): { identifierError?: string; passwordError?: string; submitError?: string } { //trả về lỗi form để hiển thị cho user
  const { code, message } = args;
  if (code === "WRONG_PASSWORD") return { passwordError: message || "" }; //nếu lỗi là mật khẩu không chính xác thì set lỗi mật khẩu

  if (code === "NOT_FOUND" || code === "LOCKED" || code === "INVALID_EMAIL") {
    return { identifierError: message || "" }; //nếu lỗi là email không tồn tại, email không hợp lệ, email đã bị khóa thì set lỗi email
  }

  return { submitError: message || LOGIN_SUBMIT_ERROR_FAIL }; //nếu lỗi là submit không thành công thì set lỗi submit
}

export const getNetworkErrorMessage = (): string => LOGIN_NETWORK_ERROR; //lấy thông báo lỗi khi không thể kết nối hệ thống

