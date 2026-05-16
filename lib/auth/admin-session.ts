import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth/jwt";  // hàm để kiểm tra session
import { SESSION_COOKIE_NAME } from "@/lib/constants/auth/patterns"; // hằng số tên cookie session

export async function getAdminSession(): Promise<{ sub: string; email: string } | null> { // hàm để lấy session admin
  const cookieStore = await cookies(); // lấy cookie store
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value; // lấy token từ cookie
  if (!token) return null; // nếu không có token thì trả về null
  try {
    const { sub, role, email } = await verifySession(token); // kiểm tra token có hợp lệ không
    if (role !== "admin") return null; // nếu không phải admin thì trả về null
    return { sub, email }; // trả về session admin
  } catch { // nếu có lỗi thì trả về null
    return null;
  }
}
