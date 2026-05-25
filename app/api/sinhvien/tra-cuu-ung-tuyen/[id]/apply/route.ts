import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth/jwt";
import { SESSION_COOKIE_NAME, AUTH_EMAIL_REGISTER_PATTERN } from "@/lib/constants/auth/patterns";
import { prisma } from "@/lib/prisma";
import { uploadCvBytesToCloudinary } from "@/lib/storage/cloudinary";
import { sniffBinaryKind } from "@/lib/utils/binary-file-sniff";

const PHONE_PATTERN = /^\d{8,12}$/;  
const CV_ALLOWED_MIMES = [ //kiểu MIME file CV cho phép
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
] as const;

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

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) { //hàm nộp hồ sơ ứng tuyển
  const auth = await getStudentUserId();
  if (auth.error) return auth.error;
  const userId = auth.userId as string;
  const { id } = await ctx.params;
  const form = await request.formData();

  const phone = String(form.get("phone") || "").trim();
  const email = String(form.get("email") || "").trim().toLowerCase();
  const intro = String(form.get("intro") || "").trim();
  const cvFile = form.get("cv");
  const removeCv = String(form.get("removeCv") || "") === "1";

  const errors: Record<string, string> = {};
  if (!PHONE_PATTERN.test(phone)) errors.phone = "Số điện thoại chỉ gồm số (8–12 ký tự).";
  if (!AUTH_EMAIL_REGISTER_PATTERN.test(email)) errors.email = "Email không đúng định dạng (ví dụ: example@domain.com).";
  if (!intro) errors.intro = "Thư giới thiệu bản thân bắt buộc.";
  if (intro.length > 3000) errors.intro = "Thư giới thiệu bản thân tối đa 3000 ký tự.";

  let cvPatch: { cvFileName: string; cvMime: string; bytes: Buffer } | null = null;
  if (cvFile && cvFile instanceof File) {
    const ab = await cvFile.arrayBuffer();
    const bytes = Buffer.from(ab);
    const browserMime = String(cvFile.type || "").trim().toLowerCase();
    const sniff = sniffBinaryKind(bytes);
    const sniffMime = String(sniff?.mime || "").trim().toLowerCase();

    const allowed = (m: string) => CV_ALLOWED_MIMES.includes(m as any);
    const effectiveMime = allowed(browserMime) ? browserMime : allowed(sniffMime) ? sniffMime : "";
    if (!effectiveMime) {
      errors.cv = "File CV không hợp lệ. Chỉ hỗ trợ .pdf, .doc, .docx.";
    } else {
      cvPatch = { cvFileName: cvFile.name || "cv", cvMime: effectiveMime, bytes };
    }
  }
  if (Object.keys(errors).length) return NextResponse.json({ success: false, errors }, { status: 400 });

  const prismaAny = prisma as any;
  const now = new Date();
  const job = await prismaAny.jobPost.findFirst({
    where: { id, status: "ACTIVE", deadlineAt: { gte: now }, enterpriseUser: { enterpriseStatus: "APPROVED" } },
    select: { id: true }
  });
  if (!job) return NextResponse.json({ success: false, message: "Tin tuyển dụng không còn khả dụng." }, { status: 400 });

  const profile = await prismaAny.studentProfile.findFirst({
    where: { userId },
    select: { internshipStatus: true, cvFileName: true, cvMime: true, cvPublicId: true }
  });
  if (!profile) return NextResponse.json({ success: false, message: "Không tìm thấy hồ sơ sinh viên." }, { status: 404 });
  if (profile.internshipStatus !== "NOT_STARTED") {
    return NextResponse.json({ success: false, message: "Chỉ sinh viên có trạng thái Chưa thực tập mới được ứng tuyển." }, { status: 400 });
  }

  const existed = await prismaAny.jobApplication.findFirst({ where: { jobPostId: id, studentUserId: userId }, select: { id: true } });
  if (existed) return NextResponse.json({ success: false, message: "Bạn đã ứng tuyển tin này." }, { status: 409 });

  const existedEmail = await prismaAny.user.findFirst({ where: { email, id: { not: userId } }, select: { id: true } });
  const existedPhone = await prismaAny.user.findFirst({ where: { phone, id: { not: userId } }, select: { id: true } });
  if (existedEmail) return NextResponse.json({ success: false, errors: { email: "Email đã tồn tại trong hệ thống." } }, { status: 400 });
  if (existedPhone) return NextResponse.json({ success: false, errors: { phone: "Số điện thoại đã tồn tại trong hệ thống." } }, { status: 400 });

  const effectiveCv = cvPatch
    ? cvPatch
    : removeCv
      ? null
      : profile.cvPublicId && profile.cvMime && profile.cvFileName
        ? { cvPublicId: profile.cvPublicId, cvMime: profile.cvMime, cvFileName: profile.cvFileName }
        : null;
  if (!effectiveCv) return NextResponse.json({ success: false, errors: { cv: "Vui lòng đính kèm file CV." } }, { status: 400 });

  const cvUpload = //hàm upload file CV lên cloudinary
    "bytes" in (effectiveCv as any)
      ? await uploadCvBytesToCloudinary({
          bytes: (effectiveCv as any).bytes as Buffer,
          mimeType: effectiveCv.cvMime,
          ownerId: userId,
          originalName: effectiveCv.cvFileName
        })
      : null;
  const cvPublicId = cvUpload?.publicId ?? (effectiveCv as any).cvPublicId ?? null;

  await prismaAny.$transaction(async (tx: any) => {
    await tx.user.update({ where: { id: userId }, data: { phone, email } });
    await tx.studentProfile.update({
      where: { userId },
      data: {
        intro,
        cvFileName: effectiveCv.cvFileName,
        cvMime: effectiveCv.cvMime,
        cvPublicId
      }
    });
    await tx.jobApplication.create({ //tạo ứng tuyển
      data: {
        jobPostId: id,
        studentUserId: userId,
        status: "PENDING_REVIEW",
        response: "PENDING",
        coverLetter: intro,
        cvPublicId,
        cvFileName: effectiveCv.cvFileName,
        cvMime: effectiveCv.cvMime,
        history: [
          {
            action: "APPLIED",
            at: new Date().toISOString(),
            by: "STUDENT",
            status: "PENDING_REVIEW"
          }
        ]
      }
    });
  });

  return NextResponse.json({ success: true, message: "Nộp hồ sơ ứng tuyển thành công." });
}

