import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/jwt"; //gọi hàm verifySession để kiểm tra token có hợp lệ không
import { verifyPassword, hashPassword } from "@/lib/auth/password"; //gọi hàm verifyPassword để kiểm tra mật khẩu có khớp với mật khẩu đã mã hóa không và hàm hashPassword để mã hóa mật khẩu
import { AUTH_STRONG_PASSWORD_PATTERN, SESSION_COOKIE_NAME } from "@/lib/constants/auth/patterns"; //gọi hằng số AUTH_STRONG_PASSWORD_PATTERN để kiểm tra mật khẩu có hợp lệ không và hằng số SESSION_COOKIE_NAME để lấy tên cookie session

type ChangePasswordPayload = {   //kiểu dữ liệu cho request POST đổi mật khẩu
  currentPassword?: string; //mật khẩu hiện tại
  newPassword?: string; //mật khẩu mới
  confirmPassword?: string; //mật khẩu xác nhận
};

export async function POST(request: Request) { //hàm POST để đổi mật khẩu
  const cookieStore = await cookies(); //lấy cookie store
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value; //lấy token từ cookie
  if (!sessionCookie) { //nếu không có token thì trả về lỗi 401
    return NextResponse.json({ success: false, code: "UNAUTHORIZED", message: "Vui lòng đăng nhập." }, { status: 401 }); //trả về lỗi 401
  }

  let sub: string;  
  try {
    ({ sub } = await verifySession(sessionCookie)); //lấy id user từ token và gán vào sub để tìm kiếm user trong database
  } catch {
    return NextResponse.json( //trả về lỗi 401
      { success: false, code: "UNAUTHORIZED", message: "Phiên đăng nhập không hợp lệ." },
      { status: 401 }
    );
  }

  const body = (await request.json()) as ChangePasswordPayload;  //lấy dữ liệu từ request
  const currentPassword = body.currentPassword?.trim() || ""; //lấy mật khẩu hiện tại từ request
  const newPassword = body.newPassword?.trim() || ""; //lấy mật khẩu mới từ request
  const confirmPassword = body.confirmPassword?.trim() || ""; //lấy mật khẩu xác nhận từ request

  if (!currentPassword || !newPassword || !confirmPassword) { //nếu mật khẩu hiện tại, mật khẩu mới hoặc mật khẩu xác nhận không có thì trả về lỗi 400  bắt buộc
    return NextResponse.json(
      { success: false, code: "REQUIRED", message: "Vui lòng nhập đầy đủ thông tin bắt buộc." }, //trả về lỗi 400
      { status: 400 } //trả về lỗi 400
    ); //trả về lỗi 400
  }

  const user = await prisma.user.findUnique({ where: { id: sub } }); //tìm kiếm user trong database
  if (!user) { //nếu user không tồn tại thì trả về lỗi 401
    return NextResponse.json({ success: false, code: "UNAUTHORIZED", message: "Tài khoản không tồn tại." }, { status: 401 }); //trả về lỗi 401
  }

  if (user.role === "admin") { //nếu user là admin thì trả về lỗi 403
    return NextResponse.json(
      {
        success: false,
        code: "NOT_ALLOWED",
        message: "Tài khoản quản trị không đổi mật khẩu qua cổng này. Vui lòng liên hệ bộ phận kỹ thuật."
      },
      { status: 403 }
    );
  }

  const currentOk = await verifyPassword(currentPassword, user.passwordHash); //kiểm tra mật khẩu hiện tại có khớp với mật khẩu đã mã hóa không
  if (!currentOk) { //nếu mật khẩu hiện tại không khớp với mật khẩu đã mã hóa thì trả về lỗi 400
    return NextResponse.json(
      { success: false, code: "WRONG_CURRENT", message: "Mật khẩu hiện tại không chính xác." }, //trả về lỗi 400
      { status: 400 } //trả về lỗi 400
    ); //trả về lỗi 400
  }

  if (newPassword === currentPassword) { //nếu mật khẩu mới trùng với mật khẩu hiện tại thì trả về lỗi 400
    return NextResponse.json(
      { success: false, code: "SAME_AS_CURRENT", message: "Mật khẩu mới không được trùng với mật khẩu hiện tại." },
      { status: 400 }
    );
  }

  if (!AUTH_STRONG_PASSWORD_PATTERN.test(newPassword)) { //nếu mật khẩu mới không hợp lệ thì trả về lỗi 400
    return NextResponse.json(
      {
        success: false,
        code: "WEAK_PASSWORD",
        message: "Mật khẩu phải có ít nhất 8 ký tự bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt."
      },
      { status: 400 }
    );
  }

  if (newPassword !== confirmPassword) { //nếu mật khẩu mới không khớp với mật khẩu xác nhận thì trả về lỗi 400
    return NextResponse.json(
      { success: false, code: "CONFIRM_NOT_MATCH", message: "Xác nhận mật khẩu mới không trùng khớp." },
      { status: 400 }
    );
  }

  await prisma.user.update({ //cập nhật mật khẩu mới cho user
    where: { id: user.id },
    data: { passwordHash: await hashPassword(newPassword) } //cập nhật mật khẩu mới cho user
  });

  return NextResponse.json({ //trả về response
    success: true,
    message: "Đổi mật khẩu thành công." //thông báo thành công
  });
}
