//Đây là hàm gửi email thực sự của hệ thống — kết nối Gmail qua thư viện nodemailer và gửi email đi. 
// Tất cả email trong hệ thống (đăng ký doanh nghiệp, duyệt/từ chối...) đều đi qua file này.
import nodemailer from "nodemailer"; //thư viện nodemailer để gửi email
import { MAIL_PRODUCT_NAME } from "@/lib/constants/school"; //gọi hàm MAIL_PRODUCT_NAME để lấy tên sản phẩm trong email
import { buildMailShell, escapeHtml } from "@/lib/mail-layout";  //layout email

function createTransport() { //tạo transport để gửi email
  const user = process.env.EMAIL_FROM;
  const pass = process.env.EMAIL_PASSWORD;
  if (!user || !pass) {
    throw new Error("EMAIL_FROM và EMAIL_PASSWORD phải được cấu hình trong .env.local");
  }
  return nodemailer.createTransport({ //tạo kết nối đến Gmail
    service: "gmail",
    auth: { user, pass }
  });
}
//nhận thông tin email, dựng nội dung HTML đẹp, rồi gửi đi qua Gmail. Đây là hàm chính để gửi email.
export async function sendMail(to: string, subject: string, text: string, htmlOverride?: string) {
  const transport = createTransport(); //tạo transport để gửi email
  const from = `"${process.env.EMAIL_FROM_NAME || MAIL_PRODUCT_NAME}" <${process.env.EMAIL_FROM}>`; //tên người gửi email

  const isFullDocument = (s: string) => /^\s*<!DOCTYPE|^\s*<html/i.test(s); //kiểm tra xem email có phải là full document hay không

  const fallbackBodyHtml = text //Nếu không có htmlOverride thì tự chuyển text thành HTM
    .split("\n")
    .map((line) => (line.trim() ? `<p style="margin:0 0 14px;">${escapeHtml(line)}</p>` : "<br/>"))
    .join("");

  const html = htmlOverride //Nếu có htmlOverride thì sử dụng htmlOverride, nếu không thì sử dụng fallbackBodyHtml
    ? isFullDocument(htmlOverride)
      ? htmlOverride //Nếu htmlOverride là full document thì sử dụng htmlOverride
      : buildMailShell({ bodyHtml: htmlOverride }) //Nếu htmlOverride không phải là full document thì chuyển thành HTML
    : buildMailShell({ bodyHtml: fallbackBodyHtml }); //Nếu không có htmlOverride thì sử dụng fallbackBodyHtml

  await transport.sendMail({ //gửi email
    from,
    to,
    subject,
    text,
    html
  });
}
