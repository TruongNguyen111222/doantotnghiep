import { AUTH_EMAIL_SIMPLE_PATTERN } from "@/lib/constants/auth/patterns";

/** Chuẩn hóa email đăng nhập: "admin" → admin@utc.edu.vn; chỉ email, không SĐT. */
export function resolveLoginEmail(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  if (t.toLowerCase() === "admin") return "admin@utc.edu.vn"; //nếu email là admin thì trả về admin@utc.edu.vn
  const lower = t.toLowerCase(); //chuyển về chữ thường
  if (!AUTH_EMAIL_SIMPLE_PATTERN.test(lower)) return null; //nếu email không hợp lệ thì trả về null
  return lower; //trả về email đã chuyển về chữ thường
}
