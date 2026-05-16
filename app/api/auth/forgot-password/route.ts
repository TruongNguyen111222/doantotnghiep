import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signPasswordResetToken } from "@/lib/auth/jwt"; //tạo token đặt lại mật khẩu
import { AUTH_EMAIL_SIMPLE_PATTERN } from "@/lib/constants/auth/patterns"; //kiểm tra email có hợp lệ không
import { getPublicAppUrl } from "@/lib/mail-enterprise"; //lấy URL của ứng dụng
import { sendPasswordResetEmail } from "@/lib/mail-password-reset"; //gửi email đặt lại mật khẩu

type ForgotPayload = { //kiểu dữ liệu cho request POST đặt lại mật khẩu
  email?: string;
};

export async function POST(request: Request) { //hàm xử lý request POST đặt lại mật khẩu
  const body = (await request.json()) as ForgotPayload; //lấy dữ liệu từ request
  const email = body.email?.trim().toLowerCase() || ""; //email đã được chuẩn hóa

  if (!email) { //nếu email không có gì thì set lỗi email
    return NextResponse.json({ success: false, code: "EMPTY_EMAIL", message: "Vui lòng nhập email." }, { status: 400 }); //trả về lỗi email
  }

  if (!AUTH_EMAIL_SIMPLE_PATTERN.test(email)) { //nếu email không hợp lệ thì set lỗi email
    return NextResponse.json( //trả về lỗi email
      { success: false, code: "INVALID_FORMAT", message: "Email không đúng định dạng example@domain.com." }, //trả về lỗi email
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({ where: { email } }); //tìm kiếm user trong database
  if (!user) { //nếu user không tồn tại thì set lỗi email
    return NextResponse.json( //trả về lỗi email
      { success: false, code: "NOT_FOUND", message: "Email không tồn tại trong hệ thống." }, //trả về lỗi email
      { status: 404 } //trả về lỗi email
    );
  }

  if (user.isLocked) { //nếu user bị khóa thì set lỗi email
    return NextResponse.json( //trả về lỗi email
      { success: false, code: "LOCKED", message: "Email thuộc tài khoản bị khóa." }, //trả về lỗi email
      { status: 423 } //trả về lỗi email
    );
  }

  if (user.role === "admin") { //nếu user là admin thì set lỗi email
    return NextResponse.json( //trả về lỗi email
      {
        success: false,
        code: "NOT_ALLOWED",
        message: "Tài khoản quản trị không hỗ trợ đặt lại mật khẩu qua email. Vui lòng liên hệ bộ phận kỹ thuật." //trả về lỗi email
      },
      { status: 403 } //trả về lỗi email
    );
  }

  let resetToken: string; //token đặt lại mật khẩu
  try {
    resetToken = await signPasswordResetToken(email); //tạo token đặt lại mật khẩu
  } catch (e) {
    console.error("forgot-password sign token", e); //log lỗi
    return NextResponse.json( //trả về lỗi email
      { success: false, code: "SERVER_ERROR", message: "Không thể tạo liên kết đặt lại mật khẩu. Thử lại sau." }, //trả về lỗi email
      { status: 500 } //trả về lỗi email
    );
  }
  //tạo URL đặt lại mật khẩu
  const appUrl = getPublicAppUrl(); //lấy URL của ứng dụng
  const qs = new URLSearchParams({ email, token: resetToken }); //tạo query string
  const resetPath = `/auth/datlaimatkhau?${qs.toString()}`; //tạo path đặt lại mật khẩu
  const resetUrl = `${appUrl}${resetPath}`; //tạo URL đặt lại mật khẩu - Ghép domain + path - Đây là link reset password hoàn chỉnh
                                            //User sẽ bấm link này trong email.
  //gửi email đặt lại mật khẩu
  try {
    await sendPasswordResetEmail(email, user.fullName, user.role, resetUrl); //gửi email đặt lại mật khẩu
  } catch (e) {
    console.error("sendMail forgot-password", e); //log lỗi
    return NextResponse.json( //trả về lỗi email
      { success: false, code: "MAIL_FAILED", message: "Không gửi được email. Kiểm tra cấu hình SMTP hoặc thử lại sau." }, //trả về lỗi email
      { status: 502 } //trả về lỗi email
    );
  }
  //trả về thông báo thành công
  return NextResponse.json({
    success: true,
    message: "Đã gửi liên kết đặt lại mật khẩu đến email của bạn. Vui lòng kiểm tra hòm thư."
  });
}
