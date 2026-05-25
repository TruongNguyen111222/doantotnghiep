import { AUTH_EMAIL_SIMPLE_PATTERN } from "@/lib/constants/auth/patterns";

/** Chuẩn hóa email đăng nhập: "admin" → admin@utc.edu.vn; chỉ email, không SĐT. */
export function resolveLoginEmail(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  if (t.toLowerCase() === "admin") return "admin@utc.edu.vn"; 
  const lower = t.toLowerCase(); 
  if (!AUTH_EMAIL_SIMPLE_PATTERN.test(lower)) return null; 
  return lower; 
}
