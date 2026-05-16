import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth/jwt"; //gọi hàm verifySession để kiểm tra token có hợp lệ không
import { SESSION_COOKIE_NAME } from "@/lib/constants/auth/patterns"; //gọi hằng số SESSION_COOKIE_NAME để lấy tên cookie session
import { ROLE_HOME } from "@/lib/constants/routing"; //gọi hằng số ROLE_HOME để lấy đường dẫn đích sau khi đăng nhập thành công

export async function GET() { //hàm GET để lấy thông tin user
  const cookieStore = await cookies(); //lấy cookie store
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value; //lấy token từ cookie
  if (!token) { //nếu không có token thì trả về lỗi 401
    return NextResponse.json({ authenticated: false }, { status: 401 }); //trả về lỗi 401
  }
  try { //try catch để xử lý lỗi
    const { role } = await verifySession(token); //kiểm tra token có hợp lệ không
    const home = ROLE_HOME[role] ?? "/"; //lấy đường dẫn đích sau khi đăng nhập thành công
    return NextResponse.json({ authenticated: true, role, home }); //trả về response
  } catch { //catch để xử lý lỗi
    return NextResponse.json({ authenticated: false }, { status: 401 }); //trả về lỗi 401
  }
}
