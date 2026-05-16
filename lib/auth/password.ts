import { compare, hash } from "bcryptjs";

export function hashPassword(plain: string) {
  return hash(plain, 12);
}

export function verifyPassword(plain: string, hashValue: string) { //kiểm tra mật khẩu đã mã hóa có khớp với mật khẩu nhập vào không
  return compare(plain, hashValue);
}
//File này có 2 hàm xử lý mật khẩu — 1 hàm để mã hóa, 1 hàm để kiểm tra. Dùng thư viện bcryptjs.