//định nghĩa dữ liệu cho chức năng đặt lại mật khẩu 
export type ResetPasswordFormErrors = { //lỗi đăng nhập
  newPassword?: string; //lỗi mật khẩu mới
  confirmPassword?: string; //lỗi mật khẩu xác nhận
};

export type ValidateResetPasswordFormResult = { //kết quả validate dữ liệu đăng nhập 
  isValid: boolean; //kết quả validate dữ liệu đăng nhập
  errors: ResetPasswordFormErrors & { submitError?: string }; //lỗi đăng nhập
};

export type ResetPasswordApiResponse = { //kết quả đăng nhập
  code?: string; //mã lỗi
  message?: string; //thông báo lỗi
  redirectPath?: string; //đường dẫn đăng nhập
};

