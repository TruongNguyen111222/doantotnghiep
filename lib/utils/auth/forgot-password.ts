import type {
  ForgotPasswordApiResponse,
  ForgotPasswordFormErrors,
  ValidateForgotPasswordFormResult
} from "@/lib/types/auth/forgot-password"; 
import {
  FORGOT_PASSWORD_EMAIL_REGEX,
  FORGOT_PASSWORD_ERROR_EMAIL_EMPTY,
  FORGOT_PASSWORD_ERROR_EMAIL_INVALID,
  FORGOT_PASSWORD_ERROR_NETWORK,
  FORGOT_PASSWORD_ERROR_SUBMIT_DEFAULT,
  FORGOT_PASSWORD_SUCCESS_DEFAULT
} from "@/lib/constants/auth/forgot-password"; 

export function normalizeForgotPasswordEmail(email: string): string { 
  return email.trim().toLowerCase();
}

export function validateForgotPasswordForm(args: { 
  email: string;
}): ValidateForgotPasswordFormResult { 
  const normalizedEmail = normalizeForgotPasswordEmail(args.email); 

  const errors: ForgotPasswordFormErrors = {}; 

  if (!normalizedEmail) {
    errors.email = FORGOT_PASSWORD_ERROR_EMAIL_EMPTY;   
  } else if (!FORGOT_PASSWORD_EMAIL_REGEX.test(normalizedEmail)) { 
    errors.email = FORGOT_PASSWORD_ERROR_EMAIL_INVALID; 
  }

  return { 
    isValid: Object.keys(errors).length === 0, 
    normalizedEmail, 
    errors 
  };
}

export function mapForgotPasswordApiError(args: {   
  code?: string; 
  message?: string; 
}): { emailError?: string; submitError?: string } { 
  const { message } = args as ForgotPasswordApiResponse; 
  return {
    emailError: message || FORGOT_PASSWORD_ERROR_SUBMIT_DEFAULT 
  };
}

export function getForgotPasswordSuccessMessage(args: { responseMessage?: string }): string { 
  return args.responseMessage || FORGOT_PASSWORD_SUCCESS_DEFAULT; 
}

export function getForgotPasswordNetworkErrorMessage(): string { 
  return FORGOT_PASSWORD_ERROR_NETWORK; 
}

