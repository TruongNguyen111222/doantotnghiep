import nodemailer from "nodemailer"; 
import { MAIL_PRODUCT_NAME } from "@/lib/constants/school"; 
import { buildMailShell, escapeHtml } from "@/lib/mail-layout"; 

function createTransport() { 
  const user = process.env.EMAIL_FROM;
  const pass = process.env.EMAIL_PASSWORD;
  if (!user || !pass) {
    throw new Error("EMAIL_FROM và EMAIL_PASSWORD phải được cấu hình trong .env.local");
  }
  return nodemailer.createTransport({ 
    service: "gmail",
    auth: { user, pass }
  });
}
export async function sendMail(to: string, subject: string, text: string, htmlOverride?: string) {
  const transport = createTransport(); 
  const from = `"${process.env.EMAIL_FROM_NAME || MAIL_PRODUCT_NAME}" <${process.env.EMAIL_FROM}>`; 

  const isFullDocument = (s: string) => /^\s*<!DOCTYPE|^\s*<html/i.test(s);  

  const fallbackBodyHtml = text 
    .split("\n")
    .map((line) => (line.trim() ? `<p style="margin:0 0 14px;">${escapeHtml(line)}</p>` : "<br/>"))
    .join("");

  const html = htmlOverride 
    ? isFullDocument(htmlOverride)
      ? htmlOverride 
      : buildMailShell({ bodyHtml: htmlOverride }) 
    : buildMailShell({ bodyHtml: fallbackBodyHtml }); 

  await transport.sendMail({ //gửi email
    from,
    to,
    subject,
    text,
    html
  });
}
