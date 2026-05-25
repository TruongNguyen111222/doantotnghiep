import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signPasswordResetToken } from "@/lib/auth/jwt"; 
import { AUTH_EMAIL_SIMPLE_PATTERN } from "@/lib/constants/auth/patterns"; 
import { getPublicAppUrl } from "@/lib/mail-enterprise"; 
import { sendPasswordResetEmail } from "@/lib/mail-password-reset"; 

type ForgotPayload = { 
  email?: string;
};

export async function POST(request: Request) { 
  const body = (await request.json()) as ForgotPayload; 
  const email = body.email?.trim().toLowerCase() || ""; 

  if (!email) { 
    return NextResponse.json({ success: false, code: "EMPTY_EMAIL", message: "Vui lòng nhập email." }, { status: 400 }); //trả về lỗi email
  }

  if (!AUTH_EMAIL_SIMPLE_PATTERN.test(email)) { 
    return NextResponse.json( 
      { success: false, code: "INVALID_FORMAT", message: "Email không đúng định dạng example@domain.com." }, 
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({ where: { email } }); 
  if (!user) { 
    return NextResponse.json( 
      { success: false, code: "NOT_FOUND", message: "Email không tồn tại trong hệ thống." }, 
      { status: 404 } 
    );
  }

  if (user.isLocked) { 
    return NextResponse.json( 
      { success: false, code: "LOCKED", message: "Email thuộc tài khoản bị khóa." }, 
      { status: 423 } 
    );
  }

  if (user.role === "admin") { 
    return NextResponse.json( 
      {
        success: false,
        code: "NOT_ALLOWED",
        message: "Tài khoản quản trị không hỗ trợ đặt lại mật khẩu qua email. Vui lòng liên hệ bộ phận kỹ thuật." 
      },
      { status: 403 } 
    );
  }

  let resetToken: string; 
  try {
    resetToken = await signPasswordResetToken(email); 
  } catch (e) {
    console.error("forgot-password sign token", e); 
    return NextResponse.json( 
      { success: false, code: "SERVER_ERROR", message: "Không thể tạo liên kết đặt lại mật khẩu. Thử lại sau." }, 
      { status: 500 } 
    );
  }
  //tạo URL đặt lại mật khẩu
  const appUrl = getPublicAppUrl(); 
  const qs = new URLSearchParams({ email, token: resetToken }); 
  const resetPath = `/auth/datlaimatkhau?${qs.toString()}`; 
  const resetUrl = `${appUrl}${resetPath}`; 
  try {
    await sendPasswordResetEmail(email, user.fullName, user.role, resetUrl); 
  } catch (e) {
    console.error("sendMail forgot-password", e); 
    return NextResponse.json( 
      { success: false, code: "MAIL_FAILED", message: "Không gửi được email. Kiểm tra cấu hình SMTP hoặc thử lại sau." }, 
      { status: 502 } 
    );
  }
  return NextResponse.json({
    success: true,
    message: "Đã gửi liên kết đặt lại mật khẩu đến email của bạn. Vui lòng kiểm tra hòm thư."
  });
}
