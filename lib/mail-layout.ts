import {
  DEFAULT_SUPPORT_EMAIL,
  ENTERPRISE_MAIL_SIGN_OFF_ADDRESS,
  MAIL_PRODUCT_NAME,
  SCHOOL_FULL_NAME,
  SCHOOL_HOTLINE,
  SCHOOL_WEBSITE
} from "@/lib/constants/school";
import { MAIL_BRAND } from "@/lib/mail-brand";  //gọi hàm MAIL_BRAND để lấy giao diện email

export function escapeHtml(s: string) { //chuyển đổi các ký tự đặc biệt thành HTML entities
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Khớp globals.css — callout (mailCalloutHtml). */
export const MAIL_ACCENT = { //màu sắc cho email
  primary: "#002f6c",
  primaryDark: "#001f4a",
  success: "#027a48",
  danger: "#b42318",
  warning: "#92400e",
  muted: "#5b6470",
  text: "#1f2937",
  border: "#d5dce5",
  pageBg: "#f4f7fb",
  headerBg: "#002f6c",
  footerBg: "#1f2937"
} as const;

type MailShellOptions = { //cấu trúc email
  bodyHtml: string;
  belowCardHtml?: string;
  /** Tiêu đề lớn dưới header (HTML đã escape). */
  title?: string;
};

const FONT = 'Arial, Helvetica, sans-serif';  //font email

function buildHeader(): string { //tạo header email 
  const safeName = escapeHtml(SCHOOL_FULL_NAME);
  const safeProduct = escapeHtml(MAIL_PRODUCT_NAME);
  return `<tr>
    <td style="background:${MAIL_BRAND.headerBar};color:${MAIL_BRAND.headerText};padding:18px 24px;font-family:${FONT};">
      <div style="font-size:16px;font-weight:bold;line-height:1.35;">${safeName}</div>
      <div style="font-size:13px;margin-top:4px;line-height:1.4;">${safeProduct}</div>
    </td>
  </tr>`;
}

function buildFooter(): string { //tạo footer email 
  const safeAddr = escapeHtml(ENTERPRISE_MAIL_SIGN_OFF_ADDRESS);
  const safeHotline = escapeHtml(SCHOOL_HOTLINE);
  const safeEmail = escapeHtml(DEFAULT_SUPPORT_EMAIL);
  const safeWeb = escapeHtml(SCHOOL_WEBSITE);
  const safeProduct = escapeHtml(MAIL_PRODUCT_NAME);

  return `<tr>
    <td style="padding:16px 24px;font-size:13px;color:${MAIL_BRAND.footerText};font-family:${FONT};
               line-height:1.65;text-align:justify;word-wrap:break-word;">
      <div style="font-weight:bold;color:${MAIL_BRAND.footerHeading};margin-bottom:6px;">Thông tin liên hệ</div>
      <div style="color:${MAIL_BRAND.footerText};">
        Địa chỉ: ${safeAddr}<br/>
        Điện thoại: ${safeHotline}<br/>
        Email: <a href="mailto:${safeEmail}" style="color:${MAIL_BRAND.link};font-weight:bold;text-decoration:underline;">${safeEmail}</a><br/>
        Website: <a href="${safeWeb}" style="color:${MAIL_BRAND.link};font-weight:bold;text-decoration:underline;">${safeWeb}</a>
      </div>
      <div style="margin-top:12px;font-size:12px;color:${MAIL_BRAND.footerMuted};line-height:1.55;">
        Thư được gửi tự động từ ${safeProduct}. Vui lòng không phản hồi trực tiếp email này.
      </div>
    </td>
  </tr>`;
}

/** Kết thư — không dùng &lt;hr&gt;. */
export function mailLetterClosingHtml(): string { //tạo kết thư email
  return `<p style="margin:20px 0 0;font-family:${FONT};font-size:14px;line-height:1.6;color:${MAIL_BRAND.bodyText};text-align:justify;text-justify:inter-word;">
  Trân trọng,<br/>
  <strong style="color:${MAIL_BRAND.titleColor};">Phòng Đào tạo</strong>
</p>`.trim();
}

export function buildMailShell({ bodyHtml, belowCardHtml, title }: MailShellOptions): string { //tạo email shell
  const safeTitle = title?.trim() ? escapeHtml(title.trim()) : "";
  const titleRow = safeTitle
    ? `<tr>
    <td style="padding:20px 24px 10px 24px;font-family:${FONT};">
      <div style="font-size:18px;font-weight:bold;color:${MAIL_BRAND.titleColor};line-height:1.35;">${safeTitle}</div>
    </td>
  </tr>`
    : "";

  const below = belowCardHtml 
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr><td align="center" style="padding:12px 16px 0;">
          <table role="presentation" width="${MAIL_BRAND.innerWidth}" cellpadding="0" cellspacing="0"
                 style="max-width:${MAIL_BRAND.innerWidth}px;width:100%;">
            <tr>
              <td style="padding:0 24px;font-family:${FONT};font-size:12px;line-height:1.6;color:${MAIL_ACCENT.muted};text-align:justify;word-wrap:break-word;">
                ${belowCardHtml}
              </td>
            </tr>
          </table>
        </td></tr>
      </table>`
    : "";

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>Email UTC</title>
</head>
<body style="margin:0;padding:0;background:${MAIL_BRAND.pageBg};font-family:${FONT};color:${MAIL_BRAND.bodyText};color-scheme:light;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${MAIL_BRAND.pageBg};">
  <tr><td align="center" style="line-height:normal;">
    <table role="presentation" width="${MAIL_BRAND.innerWidth}" cellpadding="0" cellspacing="0"
           style="max-width:${MAIL_BRAND.innerWidth}px;width:100%;table-layout:fixed;background:${MAIL_BRAND.bodyBg};">
      ${buildHeader()}
      ${titleRow}
      <tr>
        <td style="padding:10px 24px 20px 24px;font-size:14px;line-height:1.6;color:${MAIL_BRAND.bodyText};font-family:${FONT};
                   text-align:justify;text-justify:inter-word;word-wrap:break-word;overflow-wrap:break-word;">
          ${bodyHtml}
        </td>
      </tr>
      ${buildFooter()}
    </table>
    ${below}
  </td></tr>
</table>
</body>
</html>`;
}

export function mailCalloutHtml( //tạo thông báo email
  variant: "info" | "success" | "warning" | "danger",
  title: string,
  innerHtml: string
): string {
  const map = { //màu sắc cho thông báo email
    info: { bg: "#eff6ff", border: "#002f6c", title: "#002f6c" },
    success: { bg: "#ecfdf5", border: "#027a48", title: "#027a48" },
    warning: { bg: "#fffbeb", border: "#d97706", title: "#92400e" },
    danger: { bg: "#fff1f0", border: "#b42318", title: "#b42318" }
  }[variant];

  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"
       style="margin:18px 0;border-left:4px solid ${map.border};background:${map.bg};">
  <tr>
    <td style="padding:12px 16px;">
      <p style="margin:0 0 8px;font-family:${FONT};font-size:12px;font-weight:700;
                letter-spacing:0.05em;text-transform:uppercase;
                color:${map.title};line-height:1.4;">${escapeHtml(title)}</p>
      <div style="font-family:${FONT};font-size:14px;line-height:1.7;
                  color:${MAIL_BRAND.footerText};">${innerHtml}</div>
    </td>
  </tr>
</table>`.trim();
}
