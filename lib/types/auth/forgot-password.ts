export type ForgotPasswordFormErrors = { 
  email?: string;
}; 

export type ValidateForgotPasswordFormResult = { 
  isValid: boolean; 
  normalizedEmail: string; 
  errors: ForgotPasswordFormErrors; 
};

export type ForgotPasswordApiResponse = { 
  code?: string; 
  message?: string; 
};

