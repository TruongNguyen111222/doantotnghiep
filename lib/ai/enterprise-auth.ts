import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth/jwt";
import { SESSION_COOKIE_NAME } from "@/lib/constants/auth/patterns";

export type EnterpriseSession = { sub: string; role: "doanhnghiep" };

export async function getEnterpriseSession(): Promise<
  { session: EnterpriseSession } | { error: NextResponse }
> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return { error: NextResponse.json({ success: false, message: "Vui lòng đăng nhập." }, { status: 401 }) };
  }
  try {
    const verified = await verifySession(token);
    if (verified.role !== "doanhnghiep") {
      return { error: NextResponse.json({ success: false, message: "Chỉ doanh nghiệp mới dùng AI Screening." }, { status: 403 }) };
    }
    return { session: { sub: verified.sub, role: "doanhnghiep" } };
  } catch {
    return { error: NextResponse.json({ success: false, message: "Phiên đăng nhập không hợp lệ." }, { status: 401 }) };
  }
}

export async function getAdminOrEnterpriseSession(): Promise<
  { session: { sub: string; role: string } } | { error: NextResponse }
> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return { error: NextResponse.json({ success: false, message: "Vui lòng đăng nhập." }, { status: 401 }) };
  }
  try {
    const verified = await verifySession(token);
    if (verified.role !== "doanhnghiep" && verified.role !== "admin") {
      return { error: NextResponse.json({ success: false, message: "Không có quyền truy cập." }, { status: 403 }) };
    }
    return { session: { sub: verified.sub, role: verified.role } };
  } catch {
    return { error: NextResponse.json({ success: false, message: "Phiên đăng nhập không hợp lệ." }, { status: 401 }) };
  }
}
