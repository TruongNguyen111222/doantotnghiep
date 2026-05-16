import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; //gọi prisma
import { verifyPasswordResetToken } from "@/lib/auth/jwt"; //gọi hàm verifyPasswordResetToken để kiểm tra token đặt lại mật khẩu
import { hashPassword } from "@/lib/auth/password"; //gọi hàm hashPassword để mã hóa mật khẩu
import { AUTH_STRONG_PASSWORD_PATTERN } from "@/lib/constants/auth/patterns"; //gọi hàm AUTH_STRONG_PASSWORD_PATTERN để kiểm tra mật khẩu

type ResetPayload = { //kiểu dữ liệu cho request POST đặt lại mật khẩu
  email?: string;
  token?: string;
  newPassword?: string;
  confirmPassword?: string;
};

export async function POST(request: Request) { //hàm POST đặt lại mật khẩu
  const body = (await request.json()) as ResetPayload; //lấy dữ liệu từ request
  const email = body.email?.trim().toLowerCase() || ""; //lấy email từ request
  const token = body.token?.trim() || ""; //lấy token từ request
  const newPassword = body.newPassword?.trim() || ""; //lấy mật khẩu mới từ request
  const confirmPassword = body.confirmPassword?.trim() || ""; //lấy mật khẩu xác nhận từ request

  if (!email || !newPassword || !confirmPassword || !token) { //nếu email, mật khẩu mới, mật khẩu xác nhận hoặc token không có thì trả về lỗi 
    return NextResponse.json(
      { success: false, code: "REQUIRED", message: "Vui lòng nhập đầy đủ thông tin hoặc mở lại liên kết từ email." },
      { status: 400 }
    );
  }

  let tokenEmail: string; //lấy email từ token
  try {
    ({ email: tokenEmail } = await verifyPasswordResetToken(token)); //kiểm tra token đặt lại mật khẩu
  } catch {
    return NextResponse.json( //trả về lỗi token không hợp lệ
      { success: false, code: "INVALID_TOKEN", message: "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn." },
      { status: 400 }
    );
  }

  if (tokenEmail !== email) { //nếu email từ token không khớp với email trong request thì trả về lỗi
    return NextResponse.json( //trả về lỗi email không khớp với mã xác thực
      { success: false, code: "INVALID_TOKEN", message: "Email không khớp với mã xác thực." },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({ where: { email } }); //tìm kiếm user trong database
  if (!user || user.isLocked) { //nếu user không tồn tại hoặc user bị khóa thì trả về lỗi
    return NextResponse.json( //trả về lỗi tài khoản không hợp lệ
      { success: false, code: "INVALID_ACCOUNT", message: "Tài khoản không hợp lệ hoặc đã bị khóa." },
      { status: 400 }
    );
  }

  if (user.role === "admin") {
    return NextResponse.json( //trả về lỗi tài khoản quản trị không hỗ trợ đặt lại mật khẩu qua liên kết này
      {
        success: false,
        code: "NOT_ALLOWED",
        message: "Tài khoản quản trị không hỗ trợ đặt lại mật khẩu qua liên kết này."
      },
      { status: 403 }
    );
  }

  if (!AUTH_STRONG_PASSWORD_PATTERN.test(newPassword)) { //nếu mật khẩu mới không hợp lệ thì trả về lỗi
    return NextResponse.json( //trả về lỗi mật khẩu không hợp lệ
      {
        success: false,
        code: "WEAK_PASSWORD",
        message: "Mật khẩu phải có ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt."
      },
      { status: 400 }
    );
  }

  if (newPassword !== confirmPassword) { //nếu mật khẩu mới không khớp với mật khẩu xác nhận thì trả về lỗi
    return NextResponse.json(
      { success: false, code: "CONFIRM_NOT_MATCH", message: "Xác nhận mật khẩu mới không trùng khớp." },
      { status: 400 }
    );
  }

  await prisma.user.update({ //cập nhật mật khẩu mới cho user
    where: { id: user.id },
    data: { passwordHash: await hashPassword(newPassword) } //cập nhật mật khẩu mới cho user
  });

  return NextResponse.json({ //trả về response cho client
    success: true,
    message: "Đặt lại mật khẩu thành công.", //thông báo thành công
    redirectPath: "/auth/dangnhap" //đường dẫn đích sau khi đặt lại mật khẩu thành công
  });
}
