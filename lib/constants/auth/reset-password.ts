export const RESET_PASSWORD_PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

export const RESET_PASSWORD_ERROR_NEW_PASSWORD_EMPTY = "Vui lòng nhập mật khẩu mới.";
export const RESET_PASSWORD_ERROR_PASSWORD_WEAK =
  "Mật khẩu phải có ít nhất 8 ký tự bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt.";

export const RESET_PASSWORD_ERROR_CONFIRM_EMPTY = "Vui lòng nhập xác nhận mật khẩu mới.";
export const RESET_PASSWORD_ERROR_CONFIRM_MISMATCH = "Xác nhận mật khẩu mới không khớp.";

export const RESET_PASSWORD_ERROR_MISSING_TOKEN =
  "Thiếu liên kết hợp lệ. Vui lòng mở lại đường link trong email đặt lại mật khẩu.";

export const RESET_PASSWORD_NETWORK_ERROR = "Không thể kết nối hệ thống. Vui lòng thử lại.";
export const RESET_PASSWORD_SUBMIT_ERROR_DEFAULT = "Đặt lại mật khẩu thất bại.";
export const RESET_PASSWORD_SUCCESS_DEFAULT = "Đặt lại mật khẩu thành công.";

//gom toàn bộ luật kiểm tra và thông báo reset password vào 1 chỗ.