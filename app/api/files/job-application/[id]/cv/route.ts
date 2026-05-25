import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth/jwt";
import { SESSION_COOKIE_NAME } from "@/lib/constants/auth/patterns";
import { prisma } from "@/lib/prisma";
import { fetchCloudinaryBytesByPublicId } from "@/lib/storage/cloudinary";

//hàm an toàn cho tên file
function safeFilename(name: string): string {
  return String(name || "cv.pdf").replace(/["\r\n]/g, "").trim() || "cv.pdf";
}

/**
 * - Trả về thông tin User ID (sub) và Vai trò (role), hoặc trả về đối tượng chứa lỗi 401.
 */
async function getSession() { 
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return { error: NextResponse.json({ success: false, message: "Vui lòng đăng nhập." }, { status: 401 }) };
  try {
    const verified = await verifySession(token);
    return { sub: verified.sub, role: verified.role };
  } catch {
    return { error: NextResponse.json({ success: false, message: "Phiên đăng nhập không hợp lệ." }, { status: 401 }) };
  }
}
//hàm lấy thông tin phiên đăng nhập
export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const sess = await getSession();
  if ((sess as any).error) return (sess as any).error;
  const { sub, role } = sess as { sub: string; role: string };
// 2. Lấy tham số ID từ URL và kiểm tra chế độ (Xem online hay Tải xuống trực tiếp) 
  const { id } = await ctx.params;
  const download = new URL(request.url).searchParams.get("download") === "1";
// 3. Truy vấn database lấy thông tin file CV thuộc hồ sơ ứng tuyển (hoặc CV gốc trong Profile sinh viên nếu hồ sơ thiếu thông tin)
  const prismaAny = prisma as any;
  const row = await prismaAny.jobApplication.findFirst({ //tìm kiếm hồ sơ ứng tuyển theo id
    where: { id },
    select: {
      id: true,
      studentUserId: true,
      cvPublicId: true,
      cvFileName: true,
      cvMime: true,
      jobPost: { select: { enterpriseUserId: true } },
      studentUser: { select: { studentProfile: { select: { cvPublicId: true, cvFileName: true, cvMime: true } } } }
    }
  });
  if (!row) return NextResponse.json({ success: false, message: "Không tìm thấy hồ sơ." }, { status: 404 });
// 4. Phân quyền truy cập hồ sơ (Phải là Admin, hoặc chính Sinh viên đó, hoặc Doanh nghiệp sở hữu bài đăng tuyển)
  const allowed = //nếu là admin hoặc là sinh viên đó hoặc là doanh nghiệp sở hữu bài đăng tuyển thì trả về true
    role === "admin" || (role === "sinhvien" && row.studentUserId === sub) || (role === "doanhnghiep" && row.jobPost.enterpriseUserId === sub);
  if (!allowed) return NextResponse.json({ success: false, message: "Không có quyền truy cập." }, { status: 403 });
// 5. Chuẩn bị dữ liệu dự phòng (Fallback) từ Profile nếu bản ghi ứng tuyển không lưu trực tiếp thông tin file
  const fallbackCvPublicId = row.studentUser?.studentProfile?.cvPublicId ?? null;
  const fallbackCvFileName = row.studentUser?.studentProfile?.cvFileName ?? null;
  const fallbackCvMime = row.studentUser?.studentProfile?.cvMime ?? null;
// 6. Kiểm tra sự tồn tại của ID file lưu trên Cloudinary (PublicID)
  const publicId = String(row.cvPublicId || fallbackCvPublicId || "").trim();
  if (!publicId) return NextResponse.json({ success: false, message: "Không có file CV." }, { status: 404 });
// 7. Gọi API tới Cloudinary để tải file về máy chủ (dưới dạng mảng byte dữ liệu thô)
  const fetched = await fetchCloudinaryBytesByPublicId(publicId);
  if (!fetched) {
    return NextResponse.json({ success: false, message: "Không thể tải file CV." }, { status: 502 });
  }
  const bytes = fetched.bytes;
  const upstreamType = fetched.contentType;
  const fallbackType = String(row.cvMime || fallbackCvMime || "").trim().toLowerCase();
  // 8. Định dạng lại kiểu MIME (Content-Type) phù hợp cho file dữ liệu trả về
  const mime =
    !upstreamType || upstreamType === "application/octet-stream"
      ? fallbackType || "application/pdf"
      : upstreamType;

  const filename = safeFilename(row.cvFileName || fallbackCvFileName || "cv.pdf");
  const disposition = `${download ? "attachment" : "inline"}; filename="${filename}"`;
// 10. Trả phản hồi binary dữ liệu file hoàn chỉnh về cho phía Client kèm theo cấu hình bảo mật/bộ nhớ đệm
  return new NextResponse(new Uint8Array(bytes), {
    status: 200, 
    headers: {
      "Content-Type": mime,
      "Content-Disposition": disposition,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

