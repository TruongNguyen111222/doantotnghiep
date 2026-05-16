export type ChangePasswordFormErrors = { //kiểu dữ liệu cho lỗi form đổi mật khẩu mật khẩu hiện tại
  currentPassword?: string;
  newPassword?: string; //lỗi mật khẩu mới
  confirmPassword?: string; //lỗi mật khẩu xác nhận
  submitError?: string; //lỗi submit
};

export type ValidateChangePasswordFormResult = { //kiểu dữ liệu cho kết quả validate form đổi mật khẩu
  isValid: boolean; //kết quả validate form đổi mật khẩu
  errors: ChangePasswordFormErrors; //lỗi form đổi mật khẩu
};

export type ChangePasswordApiResponse = { //kiểu dữ liệu cho response đổi mật khẩu
  code?: string; //mã lỗi
  message?: string; //thông báo lỗi
  redirectPath?: string; //đường dẫn đích sau khi đổi mật khẩu thành công
};

export type AuthMeResponse = { //kiểu dữ liệu cho response auth me
  home?: string; //đường dẫn đích sau khi đăng nhập thành công
};

//File khai báo kiểu dữ liệu
//cho chức năng đổi mật khẩu.