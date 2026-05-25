//File này chứa 2 hàm gửi email sau khi admin duyệt hoặc từ chối doanh nghiệp — 
// khác với register-enterprise/route.ts chỉ gửi email "tiếp nhận đăng ký".
import { createElement } from "react";
import { render } from "@react-email/render";
import { EnterpriseApprovedEmail } from "@/emails/enterprise-approved-email"; //gọi hàm EnterpriseApprovedEmail để tạo email phê duyệt
import { EnterpriseRejectedEmail } from "@/emails/enterprise-rejected-email"; //gọi hàm EnterpriseRejectedEmail để tạo email từ chối
import { sendMail } from "@/lib/mail"; //gọi hàm sendMail để gửi email
import {
  DEFAULT_SUPPORT_EMAIL,
  ENTERPRISE_MAIL_SIGN_OFF_ADDRESS,
  ENTERPRISE_MAIL_SIGN_OFF_NAME,
  ENTERPRISE_MAIL_SIGN_OFF_SCHOOL,
  ENTERPRISE_MAIL_SIGN_OFF_TITLE,
  MAIL_PHONG_DAO_TAO_SUBJECT_PREFIX,
  SCHOOL_HOTLINE
} from "@/lib/constants/school";

export function getPublicAppUrl() { 
  const base = process.env.APP_URL?.replace(/\/$/, ""); 
  if (base) return base;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

function supportEmail() { //lấy email hỗ trợ từ process.env
  return process.env.SUPPORT_EMAIL || DEFAULT_SUPPORT_EMAIL; 
}

function greetingLine(companyName: string) { //tạo dòng chào email
  return companyName.trim() ? `Kính gửi ${companyName},` : "Kính gửi Quý Doanh nghiệp,"; //trả về dòng chào email
}

function buildApprovedText(companyName: string, loginPath: string, loginEmail: string): string { //tạo nội dung email phê duyệt
  const greet = greetingLine(companyName);
  const school = ENTERPRISE_MAIL_SIGN_OFF_SCHOOL; 
  const support = supportEmail(); 
  return [
    greet,
    "",
    `Thay mặt ${school}, chúng tôi xin trân trọng thông báo hồ sơ đăng ký tham gia hệ thống Quản lý thực tập của Quý doanh nghiệp đã được phê duyệt thành công.`,
    "",
    "Kể từ bây giờ, Quý doanh nghiệp có thể đăng nhập vào hệ thống để đăng tin tuyển dụng thực tập sinh, quản lý hồ sơ sinh viên ứng tuyển và theo dõi quá trình thực tập của sinh viên tại đơn vị.",
    "",
    "Thông tin đăng nhập của Quý doanh nghiệp như sau:",
    `Địa chỉ hệ thống: ${loginPath}`,
    `Tên đăng nhập: ${loginEmail}`,
    "Mật khẩu tạm thời: Mã số thuế đã đăng ký (Quý doanh nghiệp vui lòng dùng đúng mã số thuế để đăng nhập lần đầu).",
    "",
    "Lưu ý quan trọng:",
    "- Để đảm bảo tính bảo mật, Quý doanh nghiệp vui lòng thay đổi mật khẩu ngay trong lần đăng nhập đầu tiên.",
    "- Quý doanh nghiệp vui lòng cập nhật đầy đủ thông tin hồ sơ và các vị trí tuyển dụng để sinh viên có thể tìm thấy và ứng tuyển.",
    "",
    "Trong quá trình sử dụng hệ thống, nếu gặp bất kỳ khó khăn nào, Quý doanh nghiệp vui lòng liên hệ với chúng tôi qua:",
    `Email: ${support}`,
    `Số điện thoại: ${SCHOOL_HOTLINE}`,
    "",
    "Chúng tôi rất mong đợi sự hợp tác tốt đẹp giữa Quý doanh nghiệp và Nhà trường trong việc đào tạo và phát triển nguồn nhân lực trẻ.",
    "",
    "Trân trọng,",
    ENTERPRISE_MAIL_SIGN_OFF_NAME,
    ENTERPRISE_MAIL_SIGN_OFF_TITLE,
    ENTERPRISE_MAIL_SIGN_OFF_SCHOOL,
    ENTERPRISE_MAIL_SIGN_OFF_ADDRESS
  ].join("\n");
}

function buildRejectedText(companyName: string, reasons: string[], registerLink: string): string { //tạo nội dung email từ chối
  const greet = greetingLine(companyName); 
  const school = ENTERPRISE_MAIL_SIGN_OFF_SCHOOL; 
  const reasonBlock =
    reasons.length > 0
      ? reasons.map((r, i) => `[Lý do ${i + 1}: ${r}]`).join("\n") 
      : "[Lý do: không được nêu chi tiết]"; 
  return [
    greet,
    "",
    `Lời đầu tiên, ${school} xin chân thành cảm ơn Quý doanh nghiệp đã quan tâm và gửi hồ sơ đăng ký tham gia hệ thống quản lý thực tập của nhà trường.`,
    "",
    "Sau khi xem xét các thông tin và hồ sơ đính kèm, chúng tôi rất tiếc phải thông báo rằng yêu cầu đăng ký tài khoản của Quý doanh nghiệp chưa được phê duyệt tại thời điểm này.",
    "",
    "Lý do cụ thể như sau:",
    reasonBlock,
    "",
    "Hướng dẫn xử lý:",
    `Nếu lý do liên quan đến hồ sơ hoặc thông tin sai sót, Quý doanh nghiệp vui lòng truy cập lại trang đăng ký tại địa chỉ ${registerLink} để cập nhật lại thông tin chính xác.`,
    "Nếu cần trao đổi thêm về các tiêu chí hợp tác, Quý doanh nghiệp có thể phản hồi trực tiếp qua email này.",
    "",
    "Chúng tôi rất hy vọng sẽ có cơ hội hợp tác với Quý doanh nghiệp trong các chương trình hoặc học kỳ tiếp theo khi các điều kiện phù hợp hơn.",
    "",
    "Trân trọng,",
    ENTERPRISE_MAIL_SIGN_OFF_NAME,
    ENTERPRISE_MAIL_SIGN_OFF_TITLE,
    ENTERPRISE_MAIL_SIGN_OFF_SCHOOL,
    `Số điện thoại hỗ trợ: ${SCHOOL_HOTLINE}`
  ].join("\n");
}

export async function sendEnterpriseApprovedEmail(to: string, companyName: string, loginEmail: string) { //gửi email phê duyệt
  const appUrl = getPublicAppUrl(); 
  const loginPath = `${appUrl}/auth/dangnhap`; 
  const subject = `${MAIL_PHONG_DAO_TAO_SUBJECT_PREFIX} - Thông báo phê duyệt tài khoản kết nối thực tập thành công`; 
  const text = buildApprovedText(companyName, loginPath, loginEmail); 
  const html = await render( 
    createElement(EnterpriseApprovedEmail, { 
      greetingLine: greetingLine(companyName), 
      loginPath, 
      loginEmail 
    })
  );
  await sendMail(to, subject, text, html); 
}

export async function sendEnterpriseRejectedEmail(to: string, reasons: string[], companyName: string) { //gửi email từ chối
  const appUrl = getPublicAppUrl(); 
  const registerLink = `${appUrl}/auth/dangky`; 
  const subject = `${MAIL_PHONG_DAO_TAO_SUBJECT_PREFIX} - Thông báo kết quả đăng ký tài khoản kết nối thực tập`; 
  const text = buildRejectedText(companyName, reasons, registerLink); 
  const html = await render( 
    createElement(EnterpriseRejectedEmail, {
      greetingLine: greetingLine(companyName), 
      reasons, 
      registerLink 
    })
  );
  await sendMail(to, subject, text, html);
}
