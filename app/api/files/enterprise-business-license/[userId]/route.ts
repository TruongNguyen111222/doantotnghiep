import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { cookies } from "next/headers";
import { getAdminSession } from "@/lib/auth/admin-session";
import { verifySession } from "@/lib/auth/jwt";
import { SESSION_COOKIE_NAME } from "@/lib/constants/auth/patterns";
import { prisma } from "@/lib/prisma";
import { enterpriseLicensePublicIdFromStored, fetchCloudinaryBytesByPublicId } from "@/lib/storage/cloudinary";
import {
  filenameWithSniffedExtension,
  resolveContentTypeForBytes,
  sniffBinaryKind
} from "@/lib/utils/binary-file-sniff"; //hàm xử lý file

/**
 * TỔNG QUAN FILE:
 * File này định nghĩa một API Route (phương thức GET) để xử lý việc tải xuống hoặc xem trực tuyến (inline) 
 * file giấy phép kinh doanh của doanh nghiệp. API hỗ trợ phân quyền bảo mật (chỉ Admin hệ thống hoặc chính 
 * doanh nghiệp sở hữu file mới có quyền truy cập), đồng thời tự động xử lý nguồn file linh hoạt từ chuỗi Base64 
 * lưu trong Database hoặc kéo file binary từ Cloudinary, cuối cùng nhận diện định dạng chuẩn của file để trả về cho client.
 */

/* CẤU HÌNH THỜI GIAN THỰC THI TỐI ĐA (TIMEOUT) CHO API ROUTE */
export const maxDuration = 60;
/* CÁC HÀM TRỢ GIÚP CHUẨN HÓA TÊN FILE VÀ ĐỊNH DẠNG HEADER CONTENT-DISPOSITION (XEM TRỰC TIẾP HOẶC TẢI XUỐNG) */
function safeFilename(name: string): string {
  return String(name || "giay-phep.pdf").replace(/["\r\n]/g, "").trim() || "giay-phep.pdf";
}

function contentDispositionHeader(download: boolean, filename: string): string { //hàm xử lý định dạng header content-disposition
  const safe = safeFilename(filename);
  const quoted = safe.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const star = encodeURIComponent(safe);
  return download
    ? `attachment; filename="${quoted}"; filename*=UTF-8''${star}`
    : `inline; filename="${quoted}"; filename*=UTF-8''${star}`;
}
/*   HÀM ĐỌC VÀ TRÍCH XUẤT CÁC THÔNG TIN METADATA CỦA GIẤY PHÉP KINH DOANH TỪ TRƯỜNG ENTERPRISE_META */
function readLicenseMeta(meta: unknown): {
  publicIdRef: string | null;
  mime: string;
  fileName: string;
  base64: string | null;
} {
  const m = meta && typeof meta === "object" && !Array.isArray(meta) ? (meta as Record<string, unknown>) : {};
  const publicIdRef = typeof m.businessLicensePublicId === "string" ? m.businessLicensePublicId.trim() : null;
  const mime = typeof m.businessLicenseMime === "string" && m.businessLicenseMime.trim() ? m.businessLicenseMime.trim() : "application/pdf";
  const fileName =
    typeof m.businessLicenseName === "string" && m.businessLicenseName.trim() ? m.businessLicenseName.trim() : "giay-phep.pdf";
  const base64 = typeof m.businessLicenseBase64 === "string" && m.businessLicenseBase64.trim() ? m.businessLicenseBase64.trim() : null;
  return { publicIdRef, mime, fileName, base64 };
}
/* PHƯƠNG THỨC GET - ĐỌC THAM SỐ ĐẦU VÀO, KIỂM TRA VÀ XÁC THỰC QUYỀN TRUY CẬP (ADMIN HOẶC CHÍNH DOANH NGHIỆP) */
export async function GET(request: Request, ctx: { params: Promise<{ userId: string }> }) {
  const { userId } = await ctx.params;
  const sp = new URL(request.url).searchParams;
  const download = sp.get("inline") !== "1";

  const admin = await getAdminSession();
  let allowed = Boolean(admin);
  if (!allowed) {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ success: false, message: "Vui lòng đăng nhập." }, { status: 401 });
    }
    try {
      const verified = await verifySession(token);
      allowed = verified.role === Role.doanhnghiep && verified.sub === userId;
    } catch {
      return NextResponse.json({ success: false, message: "Phiên đăng nhập không hợp lệ." }, { status: 401 });
    }
  }

  if (!allowed) {
    return NextResponse.json({ success: false, message: "Không có quyền truy cập." }, { status: 403 });
  }
/*  TRUY VẤN THÔNG TIN DOANH NGHIỆP TRONG DATABASE ĐỂ LẤY METADATA CỦA GIẤY PHÉP */
  const user = await prisma.user.findUnique({ //tìm kiếm user theo id
    where: { id: userId },
    select: { id: true, role: true, enterpriseMeta: true }
  });
  if (!user || user.role !== Role.doanhnghiep) {
    return NextResponse.json({ success: false, message: "Không tìm thấy doanh nghiệp." }, { status: 404 });
  }

  const { publicIdRef, mime: metaMime, fileName, base64 } = readLicenseMeta(user.enterpriseMeta);
  const cloudPublicId = enterpriseLicensePublicIdFromStored(publicIdRef);

  let bytes: Buffer;
  let upstreamContentType: string | null | undefined;
/*   XỬ LÝ ĐỌC DỮ LIỆU FILE BINARY TỪ CHUỖI BASE64 HOẶC KÉO TỪ CLOUDINARY VỀ BỘ NHỚ ĐỆM (BUFFER) */
  if (base64) {
    try {
      bytes = Buffer.from(base64, "base64");
      upstreamContentType = null;
    } catch {
      return NextResponse.json({ success: false, message: "File giấy phép không hợp lệ." }, { status: 500 });
    }
  } else if (cloudPublicId) {
    const fetched = await fetchCloudinaryBytesByPublicId(cloudPublicId);
    if (!fetched) {
      console.error("enterprise-business-license cloudinary fetch failed publicId=", cloudPublicId);
      return NextResponse.json({ success: false, message: "Không thể tải file giấy phép." }, { status: 502 });
    }
    bytes = fetched.bytes;
    upstreamContentType = fetched.contentType;
  } else {
    return NextResponse.json({ success: false, message: "Không có file giấy phép." }, { status: 404 });
  }

  const sniff = sniffBinaryKind(bytes);
  const mime = resolveContentTypeForBytes(bytes, upstreamContentType, metaMime || "application/pdf");
  const outFilename = filenameWithSniffedExtension(fileName, sniff);

  const body = new Uint8Array(bytes);
/* THIẾT LẬP CÁC HTTP HEADERS AN TOÀN (CACHE, CONTENT-TYPE...) VÀ TRẢ FILE VỀ CHO TRÌNH DUYỆT */
  return new NextResponse(body, { //trả về file cho trình duyệt
    status: 200,
    headers: {
      "Content-Type": mime,
      "Content-Disposition": contentDispositionHeader(download, outFilename),
      "Content-Length": String(body.byteLength),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}
