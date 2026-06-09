import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth/jwt";
import { SESSION_COOKIE_NAME } from "@/lib/constants/auth/patterns";
import { prisma } from "@/lib/prisma"; 
import { fetchCloudinaryBytesByPublicId, fromCloudinaryRef } from "@/lib/storage/cloudinary";

function safeFilename(name: string): string { //hàm xử lý tên file báo cáo thực tập
  return String(name || "bctt.pdf").replace(/["\r\n]/g, "").trim() || "bctt.pdf";
}

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

export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) { //hàm lấy file báo cáo thực tập
  const sess = await getSession(); 
  if ("error" in sess) return sess.error;
  const { sub, role } = sess;

  const { id } = await ctx.params; //lấy id báo cáo thực tập
  const urlObj = new URL(request.url);
  const download = urlObj.searchParams.get("download") === "1";
  const kind = (urlObj.searchParams.get("kind") || "report").trim();

  const prismaAny = prisma as any;
  const report = await prismaAny.internshipReport.findFirst({
    where: { id },
    select: {
      id: true,
      reportFileName: true,
      reportMime: true,
      reportBase64: true,
      enterpriseEvalFileName: true,
      enterpriseEvalMime: true,
      enterpriseEvalBase64: true,
      studentProfileId: true,
      studentProfile: { select: { userId: true } }
    }
  });
  if (!report) return NextResponse.json({ success: false, message: "Không tìm thấy file." }, { status: 404 });

  let allowed = role === "admin" || (role === "sinhvien" && report.studentProfile?.userId === sub);
  if (!allowed && role === "giangvien") {
    const sup = await prismaAny.supervisorProfile.findFirst({ where: { userId: sub }, select: { id: true } });
    if (sup?.id && report.studentProfileId) { 
      const link = await prismaAny.supervisorAssignmentStudent.findFirst({
        where: {
          studentProfileId: report.studentProfileId,
          supervisorAssignment: { supervisorProfileId: sup.id }
        },
        select: { id: true }
      });
      allowed = Boolean(link);
    }
  }

  if (!allowed) return NextResponse.json({ success: false, message: "Không có quyền truy cập." }, { status: 403 });

  const isEnterpriseEval = kind === "enterprise-evaluation";
  const stored = String(
    isEnterpriseEval ? report.enterpriseEvalBase64 : report.reportBase64
  ).trim();
  if (!stored) {
    return NextResponse.json(
      { success: false, message: isEnterpriseEval ? "Không có phiếu đánh giá doanh nghiệp." : "Không có file BCTT." },
      { status: 404 }
    );
  }

  let bytes: Buffer;
  let mime = String(
    isEnterpriseEval ? report.enterpriseEvalMime : report.reportMime
  ).trim() || "application/pdf";
  const cloudPublicId = fromCloudinaryRef(stored);
  if (cloudPublicId) {
    const fetched = await fetchCloudinaryBytesByPublicId(cloudPublicId);
    if (!fetched) {
      return NextResponse.json({ success: false, message: "Không thể tải file BCTT." }, { status: 502 });
    }
    bytes = fetched.bytes;
    const upstreamType = fetched.contentType;
    if (upstreamType && upstreamType !== "application/octet-stream") mime = upstreamType;
  } else {
    try {
      bytes = Buffer.from(stored, "base64"); //chuyển đổi file base64 thành file thật nếu là file cũ
    } catch {
      return NextResponse.json({ success: false, message: "File BCTT không hợp lệ." }, { status: 500 });
    }
  }

  const filename = safeFilename(
    (isEnterpriseEval ? report.enterpriseEvalFileName : report.reportFileName) || (isEnterpriseEval ? "phieu-danh-gia.pdf" : "bctt.pdf")
  );
  const disposition = `${download ? "attachment" : "inline"}; filename="${filename}"`;

  return new NextResponse(new Uint8Array(bytes), { //trả về file báo cáo thực tập
    status: 200,
    headers: {
      "Content-Type": mime,
      "Content-Disposition": disposition, //chọn mở trực tiếp hay tải xuống
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}
