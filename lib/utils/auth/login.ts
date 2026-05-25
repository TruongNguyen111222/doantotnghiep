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

export function validateLoginForm(args: { 
  identifier: string; 
  password: string; 
}): ValidateLoginFormResult {
  const { identifier, password } = args; 

  const errors: { identifier?: string; password?: string } = {}; 
  const idTrim = identifier.trim();

  if (!idTrim) { 
    errors.identifier = LOGIN_IDENTIFIER_ERROR_EMPTY;
  } else if (idTrim.toLowerCase() !== "admin" && !LOGIN_EMAIL_REGEX.test(idTrim.toLowerCase())) { 
    errors.identifier = LOGIN_IDENTIFIER_ERROR_INVALID; 
  }

  if (!password.trim()) { 
    errors.password = LOGIN_PASSWORD_ERROR_EMPTY; 
  }

  return {
    isValid: Object.keys(errors).length === 0, 
    errors 
  };
}

export function getSafeNextPath(nextRaw: string | null): string | null {  
  if (!nextRaw) return null; 
  return nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : null; 
}

export function getLoginRedirectDest(args: { 
  nextRaw: string | null;
  redirectPath?: string;
}): string {
  const safeNext = getSafeNextPath(args.nextRaw);
  return safeNext || args.redirectPath || "/";
}

//Quyết định có hiện link "Quên mật khẩu" không
export function shouldShowForgotPassword(args: { 
  identifierFocused: boolean; 
  identifier: string; 
}): boolean {
  const { identifierFocused, identifier } = args; 
  if (!identifierFocused) return true; 
  return resolveLoginEmail(identifier) !== "admin@utc.edu.vn"; 
}

export function mapLoginApiErrorToForm(args: {
  code?: string;
  message?: string;
}): { identifierError?: string; passwordError?: string; submitError?: string } { 
  const { code, message } = args;
  if (code === "WRONG_PASSWORD") return { passwordError: message || "" }; 

  if (code === "NOT_FOUND" || code === "LOCKED" || code === "INVALID_EMAIL") {
    return { identifierError: message || "" }; 
  }

  return { submitError: message || LOGIN_SUBMIT_ERROR_FAIL }; 
}

export const getNetworkErrorMessage = (): string => LOGIN_NETWORK_ERROR; 

