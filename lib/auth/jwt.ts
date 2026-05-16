//file để tạo và verify token phiên
import * as jose from "jose";

// lấy khóa từ env và mã hóa sang byte để sử dụng trong jwtVerify
export function getSecretKey() {
  const s = process.env.SECRET; //lấy khóa từ env
  if (!s) throw new Error("SECRET is required in environment"); //nếu không có khóa thì throw error
  return new TextEncoder().encode(s); //mã hóa khó từ chuỗi sang byte
}

//tạo token đăng nhập
// Đóng gói thông tin user vào 1 chuỗi mã hóa, lưu vào cookie. Sau này dùng chuỗi đó để biết ai đang đăng nhập mà không cần hỏi database.
export async function signSession(payload: { sub: string; role: string; email: string }) { //Tạo token sau khi đăng nhập thành công
  return new jose.SignJWT({ role: payload.role, email: payload.email }) //Đóng gói thông tin user vào 1 chuỗi mã hóa
    .setProtectedHeader({ alg: "HS256" }) // kí sử dụng thuật toán HS256
    .setSubject(payload.sub) // đặt id user vào token
    .setIssuedAt() // đặt thời gian tạo token
    .setExpirationTime("7d") // đặt thời gian hết hạn token
    .sign(getSecretKey()); // kí token bằng khóa mã hóa ko ai giả mạo được
}


// Kiểm tra token còn hợp lệ không, nếu hợp lệ thì trả về thông tin user
export async function verifySession(token: string) {
  const { payload } = await jose.jwtVerify(token, getSecretKey()); //giải mã token nếu hợp lệ trả về payload chứa thông tin user
  const sub = payload.sub; //lấy id user từ payload
  const role = payload.role; //lấy role từ payload
  const email = payload.email; //lấy email từ payload
  if (typeof sub !== "string" || typeof role !== "string" || typeof email !== "string") { //nếu id user, role hoặc email không phải là string thì throw error
    throw new Error("Invalid session token"); //nếu token không hợp lệ thì throw error
  }
  return { sub, role, email }; //trả về thông tin user
}

//tạo token đặt lại mật khẩu
//bản chất  Tạo token ngắn hạn để gửi kèm link đặt lại mật khẩu qua email.
export async function signPasswordResetToken(email: string) {
  return new jose.SignJWT({ purpose: "password_reset", email }) //Đóng gói thông tin email vào 1 chuỗi mã hóa
    .setProtectedHeader({ alg: "HS256" }) // kí sử dụng thuật toán HS256
    .setIssuedAt() // đặt thời gian tạo token
    .setExpirationTime("15m") // đặt thời gian hết hạn token
    .sign(getSecretKey()); // kí token bằng khóa mã hóa ko ai giả mạo được
}

//Kiểm tra token trong link email có hợp lệ không trước khi cho đặt mật khẩu mới.
export async function verifyPasswordResetToken(token: string) { //hàm kiểm tra token đặt lại mật khẩu
  const { payload } = await jose.jwtVerify(token, getSecretKey()); //giải mã token nếu hợp lệ trả về payload chứa thông tin email
  if (payload.purpose !== "password_reset" || typeof payload.email !== "string") { //nếu purpose không phải là password_reset hoặc email không phải là string thì throw error
    throw new Error("Invalid reset token"); //nếu token không hợp lệ thì throw error
  }
  return { email: payload.email }; //trả về email
}
