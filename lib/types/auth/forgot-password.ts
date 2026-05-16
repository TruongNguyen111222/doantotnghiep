export type ForgotPasswordFormErrors = { //lỗi đăng nhập
  email?: string;
}; //lỗi email

export type ValidateForgotPasswordFormResult = { //kết quả validate dữ liệu đăng nhập
  isValid: boolean; //kết quả validate dữ liệu đăng nhập
  normalizedEmail: string; //email đã được chuẩn hóa
  errors: ForgotPasswordFormErrors; //lỗi đăng nhập
};

export type ForgotPasswordApiResponse = { //kết quả đăng nhập từ API/backend
  code?: string; //mã lỗi
  message?: string; //thông báo lỗi
};

