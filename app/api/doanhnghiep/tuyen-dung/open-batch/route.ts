import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth/jwt";
import { SESSION_COOKIE_NAME } from "@/lib/constants/auth/patterns";
import { prisma } from "@/lib/prisma";
/**

 *  - Tự động cập nhật (Auto-close) các đợt thực tập đã quá hạn kết thúc (`endDate < now`) từ OPEN sang CLOSED.
 *  - Kiểm tra xem hiện tại có đợt thực tập nào đang mở (`status: "OPEN"`) hay không.
 *  - Trả về thông tin trạng thái và ID của đợt thực tập đang mở gần nhất để phía Client xử lý.

 */
export async function GET() { 
  // * 1. Xác thực người dùng và kiểm tra quyền truy cập (Role: doanhnghiep)
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ success: false, message: "Vui lòng đăng nhập." }, { status: 401 });

  let sub: string;
  let role: string;
  try {
    const verified = await verifySession(token);
    sub = verified.sub;
    role = verified.role;
  } catch {
    return NextResponse.json({ success: false, message: "Phiên đăng nhập không hợp lệ." }, { status: 401 });
  }
// * 2. Kiểm tra xem người dùng có phải là doanh nghiệp không
  if (role !== "doanhnghiep") {
    return NextResponse.json({ success: false, message: "Không có quyền truy cập." }, { status: 403 });
  }
// * 3. Tìm kiếm đợt thực tập đang mở gần nhất
  const prismaAny = prisma as any;
  const now = new Date();
  // Auto-close khi quá hạn.
  await prismaAny.internshipBatch.updateMany({ //cập nhật trạng thái đợt thực tập quá hạn
    where: { endDate: { lt: now }, status: "OPEN" },
    data: { status: "CLOSED" }
  });
  const openBatch = await prismaAny.internshipBatch.findFirst({ //tìm kiếm đợt thực tập đang mở gần nhất
    where: { status: "OPEN" },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json({ //trả về kết quả thành công
    success: true,
    hasOpenBatch: Boolean(openBatch),
    batchId: openBatch?.id ?? null
  });
}

