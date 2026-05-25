import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth/jwt";
import { SESSION_COOKIE_NAME } from "@/lib/constants/auth/patterns";
import { prisma } from "@/lib/prisma";
import { fetchCloudinaryBytesByPublicId } from "@/lib/storage/cloudinary";

function safeFilename(name: string): string {
  return String(name || "cv.pdf").replace(/["\r\n]/g, "").trim() || "cv.pdf";
}

async function getStudentUserId() { //hàm lấy id sinh viên
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return { error: NextResponse.json({ success: false, message: "Vui lòng đăng nhập." }, { status: 401 }) };
  try {
    const verified = await verifySession(token);
    if (verified.role !== "sinhvien") {
      return { error: NextResponse.json({ success: false, message: "Không có quyền truy cập." }, { status: 403 }) };
    }
    return { userId: verified.sub };
  } catch {
    return { error: NextResponse.json({ success: false, message: "Phiên đăng nhập không hợp lệ." }, { status: 401 }) };
  }
}

export async function GET(request: Request) { //hàm lấy file CV sinh viên
  const auth = await getStudentUserId();
  if (auth.error) return auth.error;
  const userId = auth.userId as string;

  const download = new URL(request.url).searchParams.get("download") === "1"; //lấy trạng thái tải xuống

  const prismaAny = prisma as any;
  const row = await prismaAny.studentProfile.findFirst({ //tìm kiếm hồ sơ sinh viên
    where: { userId },
    select: { cvFileName: true, cvMime: true, cvPublicId: true }
  });
  if (!row) return NextResponse.json({ success: false, message: "Không tìm thấy hồ sơ sinh viên." }, { status: 404 });

  const publicId = String(row.cvPublicId || "").trim();
  if (!publicId) return NextResponse.json({ success: false, message: "Không có file CV." }, { status: 404 });

  const fetched = await fetchCloudinaryBytesByPublicId(publicId);
  if (!fetched) {
    return NextResponse.json({ success: false, message: "Không thể tải file CV." }, { status: 502 });
  }
  const bytes = fetched.bytes; //lấy dữ liệu file CV
  const upstreamType = fetched.contentType; //lấy kiểu MIME của file CV
  const fallbackType = String(row.cvMime || "").trim().toLowerCase();
  const mime = //lấy kiểu MIME của file CV
    !upstreamType || upstreamType === "application/octet-stream"
      ? fallbackType || "application/pdf"
      : upstreamType;

  const filename = safeFilename(row.cvFileName || "cv.pdf"); //lấy tên file CV
  const disposition = `${download ? "attachment" : "inline"}; filename="${filename}"`; //lấy cấu hình bảo mật/bộ nhớ đệm

  return new NextResponse(new Uint8Array(bytes), { //trả về file CV
    status: 200,
    headers: {
      "Content-Type": mime,
      "Content-Disposition": disposition,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

