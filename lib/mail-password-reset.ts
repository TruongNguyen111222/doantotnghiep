import type { Role } from "@prisma/client";
import { createElement } from "react";
import { render } from "@react-email/render";
import { PasswordResetEmail } from "@/emails/password-reset-email"; 
import { sendMail } from "@/lib/mail"; 
import {
  MAIL_PHONG_DAO_TAO_SUBJECT_PREFIX,
  MAIL_PRODUCT_NAME,
  MAIL_TRANSACTIONAL_SIGN_OFF,
  SCHOOL_FULL_NAME,
  SCHOOL_HOTLINE,
  SCHOOL_WEBSITE
} from "@/lib/constants/school"; 

function politeYou(role: Role): string { 
  return role === "doanhnghiep" ? "Quý doanh nghiệp" : "Quý vị";  
}

export function buildPasswordResetMail(fullName: string, role: Role, resetUrl: string) { 
  const school = SCHOOL_FULL_NAME; 
  const you = politeYou(role); 
  const subject = `${MAIL_PHONG_DAO_TAO_SUBJECT_PREFIX} - Yêu cầu đặt lại mật khẩu tài khoản`; 

  const text = [
    `Kính gửi ${fullName},`, 
    "",
    `Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản liên kết với địa chỉ email này trên ${MAIL_PRODUCT_NAME} của ${school}.`,
    "",
    `Để tiếp tục quá trình thay đổi mật khẩu, ${you} vui lòng mở liên kết sau:`,
    resetUrl, 
    "",
    "Lưu ý quan trọng:", 
    "- Vì lý do bảo mật, đường dẫn này sẽ hết hiệu lực sau 15 phút.",
    `- Nếu ${you} không thực hiện yêu cầu này, vui lòng bỏ qua email này. Mật khẩu hiện tại của bạn vẫn sẽ được giữ nguyên.`,
    "- Tuyệt đối không chia sẻ nội dung email này hoặc đường dẫn phía trên cho bất kỳ ai.",
    `Nếu gặp khó khăn trong quá trình khôi phục mật khẩu, bạn có thể liên hệ với bộ phận kỹ thuật của nhà trường qua số hotline: ${SCHOOL_HOTLINE}.`,
    "",
    MAIL_TRANSACTIONAL_SIGN_OFF, 
    SCHOOL_WEBSITE 
  ].join("\n"); 

  return { subject, text, youLabel: you }; 
}

export async function sendPasswordResetEmail(to: string, fullName: string, role: Role, resetUrl: string) { 
  const { subject, text, youLabel } = buildPasswordResetMail(fullName, role, resetUrl); 
  const html = await render(createElement(PasswordResetEmail, { fullName, youLabel, resetUrl })); 
  await sendMail(to, subject, text, html); 
}
