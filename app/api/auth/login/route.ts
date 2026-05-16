import { NextResponse } from "next/server"; //trả về response cho client
import { EnterpriseStatus, Role } from "@prisma/client"; //loại vai trò và trạng thái doanh nghiệp
import { prisma } from "@/lib/prisma"; //kết nối với database
import { SESSION_COOKIE_NAME } from "@/lib/constants/auth/patterns"; //tên cookie phiên
import { ROLE_HOME } from "@/lib/constants/routing"; //đường dẫn nhà của từng vai trò
import { resolveLoginEmail } from "@/lib/auth/identifier"; //chuyển đổi email đăng nhập vào form thành email thật
import { verifyPassword } from "@/lib/auth/password"; //kiểm tra mật khẩu
import { signSession } from "@/lib/auth/jwt"; //tạo token phiên
import type { LoginRequestBody } from "@/lib/types/auth"; //kiểu dữ liệu request body

export async function POST(request: Request) {
  const body = (await request.json()) as LoginRequestBody; //lấy request body
  const identifier = body.identifier?.trim(); //lấy email từ request body và loại bỏ khoảng trắng
  const password = body.password?.trim(); //lấy mật khẩu từ request body và loại bỏ khoảng trắng

  if (!identifier || !password) { //nếu email hoặc mật khẩu không có gì thì trả về lỗi
    return NextResponse.json(
      { success: false, message: "Vui lòng nhập đầy đủ email và mật khẩu." },
      { status: 400 } 
    );
  }
  //chuyển đổi email đăng nhập vào form thành email thật
  const email = resolveLoginEmail(identifier); //chuyển đổi email đăng nhập vào form thành email thật
  if (!email) { //nếu email không hợp lệ thì trả về lỗi
    return NextResponse.json(
      { success: false, code: "INVALID_EMAIL", message: "Vui lòng nhập email hợp lệ (ví dụ ten@domain.com)." },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({ where: { email } }); //tìm user trong database

  if (!user) { //nếu user không tồn tại thì trả về lỗi
    return NextResponse.json(
      {
        success: false,
        code: "NOT_FOUND",
        message: "Thông tin đăng nhập không tồn tại trong hệ thống.",
        suggestRegister: true
      },
      { status: 404 }
    );
  }

  if (user.isLocked) { //nếu user bị khóa thì trả về lỗi
    return NextResponse.json(
      {
        success: false,
        code: "LOCKED",
        message: "Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên."
      },
      { status: 423 }
    );
  }
//kiểm tra trạng thái doanh nghiệp
  if (user.role === Role.doanhnghiep) { //nếu user là doanh nghiệp thì kiểm tra trạng thái doanh nghiệp
    if (user.enterpriseStatus === EnterpriseStatus.PENDING || user.enterpriseStatus == null) { //nếu trạng thái doanh nghiệp là chờ phê duyệt hoặc null thì trả về lỗi
      return NextResponse.json(
        {
          success: false,
          code: "ENTERPRISE_PENDING",
          message:
            "Tài khoản doanh nghiệp đang chờ phê duyệt. Vui lòng theo dõi email trong vòng 24h."
        },
        { status: 403 }
      );
    }
    if (user.enterpriseStatus === EnterpriseStatus.REJECTED) {
      return NextResponse.json(
        {
          success: false,
          code: "ENTERPRISE_REJECTED",
          message:
            "Hồ sơ đăng ký doanh nghiệp chưa được phê duyệt. Vui lòng xem email thông báo hoặc liên hệ Phòng đào tạo."
        },
        { status: 403 }
      );
    }
  }

  const ok = await verifyPassword(password, user.passwordHash); //kiểm tra mật khẩu đã mã hóa có khớp với mật khẩu nhập vào không
  if (!ok) { //nếu mật khẩu không chính xác thì trả về lỗi
    return NextResponse.json(
      {
        success: false,
        code: "WRONG_PASSWORD",
        message: "Mật khẩu không chính xác."
      },
      { status: 401 }
    );
  }
  //Đây là phần cuối cùng của API đăng nhập — chạy khi đã qua hết mọi kiểm tra.
  const token = await signSession({  //tạo token phiên gọi hàm signSession để tạo token phiên
    sub: user.id, 
    role: user.role,
    email: user.email
  });

  const redirectPath = ROLE_HOME[user.role] || "/"; //Lấy URL dashboard tương ứng với role.
  const res = NextResponse.json({ //trả về response cho client
    success: true,
    message: "Đăng nhập thành công.",
    user: {
      identifier: user.email,
      role: user.role
    },
    redirectPath //đường dẫn đích sau khi đăng nhập thành công
  });

  res.cookies.set(SESSION_COOKIE_NAME, token, { //lưu token phiên vào cookie
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });

  return res; //trả về response cho client
}
