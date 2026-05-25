import { NextResponse } from "next/server";       
import { EnterpriseStatus, Role } from "@prisma/client"; 
import { prisma } from "@/lib/prisma"; 
import { SESSION_COOKIE_NAME } from "@/lib/constants/auth/patterns"; 
import { ROLE_HOME } from "@/lib/constants/routing"; 
import { resolveLoginEmail } from "@/lib/auth/identifier"; 
import { verifyPassword } from "@/lib/auth/password"; 
import { signSession } from "@/lib/auth/jwt"; 
import type { LoginRequestBody } from "@/lib/types/auth"; 

export async function POST(request: Request) {
  const body = (await request.json()) as LoginRequestBody; 
  const identifier = body.identifier?.trim(); 
  const password = body.password?.trim(); 

  if (!identifier || !password) { 
    return NextResponse.json(
      { success: false, message: "Vui lòng nhập đầy đủ email và mật khẩu." },
      { status: 400 } 
    );
  }
  const email = resolveLoginEmail(identifier); 
  if (!email) { 
    return NextResponse.json(
      { success: false, code: "INVALID_EMAIL", message: "Vui lòng nhập email hợp lệ (ví dụ ten@domain.com)." },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({ where: { email } }); 

  if (!user) { 
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

  if (user.isLocked) { 
    return NextResponse.json(
      {
        success: false,
        code: "LOCKED",
        message: "Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên."
      },
      { status: 423 }
    );
  }
    if (user.role === Role.doanhnghiep) { 
    if (user.enterpriseStatus === EnterpriseStatus.PENDING || user.enterpriseStatus == null) { 
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

  const ok = await verifyPassword(password, user.passwordHash); 
  if (!ok) { 
    return NextResponse.json(
      {
        success: false,
        code: "WRONG_PASSWORD",
        message: "Mật khẩu không chính xác."
      },
      { status: 401 }
    );
  }
  const token = await signSession({ 
    sub: user.id, 
    role: user.role,
    email: user.email
  });

  const redirectPath = ROLE_HOME[user.role] || "/"; 
  const res = NextResponse.json({ 
    success: true,
    message: "Đăng nhập thành công.",
    user: {
      identifier: user.email,
      role: user.role
    },
    redirectPath 
  });

  res.cookies.set(SESSION_COOKIE_NAME, token, { 
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });

  return res; 
}
