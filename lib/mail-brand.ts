/**
 * Giao diện email UTC — bảng 640px, header xanh đậm, không logo (dùng chung HTML + React Email).
 */
export const MAIL_BRAND = { //giao diện email UTC 
  headerBar: "#002f6c",
  headerText: "#ffffff",
  titleColor: "#002f6c",
  bodyText: "#111111",
  bodyBg: "#ffffff",
  pageBg: "#ffffff",
  link: "#002f6c",
  footerHeading: "#002f6c",
  footerText: "#333333",
  footerMuted: "#666666",
  innerWidth: 640,
  rule: "#e5e7eb"
} as const;

/** Giữ API cho .env; layout hiện không nhúng logo. */
export function getSchoolEmailLogoUrl(): string { //lấy URL logo email
  const a = String(process.env.NEXT_PUBLIC_SCHOOL_EMAIL_LOGO_URL || "").trim(); //lấy URL logo email từ process.env
  const b = String(process.env.SCHOOL_EMAIL_LOGO_URL || "").trim(); //lấy URL logo email từ process.env
  return a || b || ""; //trả về URL logo email
}
