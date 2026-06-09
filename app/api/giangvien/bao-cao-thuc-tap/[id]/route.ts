import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth/jwt";
import { SESSION_COOKIE_NAME } from "@/lib/constants/auth/patterns";
import { prisma } from "@/lib/prisma";
import { MAIL_PHONG_DAO_TAO_SUBJECT_PREFIX, MAIL_TRANSACTIONAL_SIGN_OFF } from "@/lib/constants/school";
import { sendMail } from "@/lib/mail";
import { getPublicAppUrl } from "@/lib/mail-enterprise";

type ReportAction = "APPROVE" | "REJECT";

const prismaAny = prisma as any;

async function getGiangVienContext() { //hàm lấy thông tin giảng viên
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return { error: NextResponse.json({ success: false, message: "Vui lòng đăng nhập." }, { status: 401 }) };
  try {
    const verified = await verifySession(token);
    if (verified.role !== "giangvien") {
      return { error: NextResponse.json({ success: false, message: "Không có quyền truy cập." }, { status: 403 }) };
    }

    const sup = await prismaAny.supervisorProfile.findFirst({ //hàm lấy hồ sơ giảng viên từ database
      where: { userId: verified.sub },
      select: { id: true, user: { select: { fullName: true } } }
    });
    if (!sup) return { error: NextResponse.json({ success: false, message: "Không tìm thấy hồ sơ giảng viên." }, { status: 404 }) };
    return { supervisorProfileId: sup.id as string, supervisorName: (sup.user?.fullName ?? "Giảng viên") as string };
  } catch {
    return { error: NextResponse.json({ success: false, message: "Phiên đăng nhập không hợp lệ." }, { status: 401 }) };
  }
}

async function fetchStudentMailInfo(studentProfileId: string): Promise<{ svFullName: string; svEmail: string | null }> { //hàm lấy thông tin sinh viên
  const sp = await prismaAny.studentProfile.findFirst({ //hàm lấy sinh viên từ database
    where: { id: studentProfileId },
    select: { user: { select: { fullName: true, email: true } } }
  });
  return {
    svFullName: sp?.user?.fullName ?? "Sinh viên",
    svEmail: sp?.user?.email ?? null
  };
}

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) { //hàm duyệt báo cáo thực tập
  const giangVien = await getGiangVienContext(); //hàm lấy thông tin giảng viên
  if ("error" in giangVien) return giangVien.error;
  const { supervisorProfileId, supervisorName } = giangVien;
  const { id } = await ctx.params;

  const body = (await request.json()) as { //hàm lấy thông tin báo cáo thực tập từ body
    action?: ReportAction;
    rejectReason?: string;
    supervisorEvaluation?: string;
    supervisorPoint?: number | string | null;
    enterpriseEvaluation?: string;
    enterprisePoint?: number | string | null;
  };

  const action = (body.action || "").trim() as ReportAction;
  if (!action || (action !== "APPROVE" && action !== "REJECT")) {
    return NextResponse.json({ success: false, message: "Hành động không hợp lệ." }, { status: 400 });
  }

  const report = await prismaAny.internshipReport.findFirst({ //hàm lấy báo cáo thực tập từ database
    where: { id },
    select: {
      id: true,
      studentProfileId: true,
      reviewStatus: true,
      history: true
    }
  });
  if (!report) return NextResponse.json({ success: false, message: "Không tìm thấy BCTT." }, { status: 404 });

  const assigned = await prismaAny.supervisorAssignmentStudent.findFirst({
    where: {
      studentProfileId: report.studentProfileId,
      supervisorAssignment: { supervisorProfileId }
    },
    select: { id: true }
  });
  if (!assigned) return NextResponse.json({ success: false, message: "Không có quyền cập nhật cho sinh viên này." }, { status: 403 });

  const currentStudent = await prismaAny.studentProfile.findFirst({ //hàm lấy sinh viên từ database
    where: { id: report.studentProfileId },
    select: { internshipStatus: true, userId: true }
  });
  const prevStatus = currentStudent?.internshipStatus;

  const now = new Date();
  const historyPrev = Array.isArray(report.history) ? report.history : []; //hàm lấy lịch sử báo cáo thực tập

  const selfFinancedHist = await prismaAny.internshipStatusHistory.findFirst({
    where: { studentProfileId: report.studentProfileId, toStatus: "SELF_FINANCED" },
    select: { id: true }
  });
  const isSelfFinancedInternship = Boolean(selfFinancedHist);

  if (action === "REJECT") { //hàm từ chối báo cáo thực tập
    const rejectReason = (body.rejectReason || "").trim();
    if (!rejectReason) return NextResponse.json({ success: false, message: "Lý do giảng viên hướng dẫn từ chối là bắt buộc." }, { status: 400 });

    await prismaAny.$transaction(async (tx: any) => { //hàm xử lý transaction
      await tx.internshipReport.update({ //hàm cập nhật báo cáo thực tập
        where: { id: report.id },
        data: {
          reviewStatus: "REJECTED",
          supervisorRejectReason: rejectReason,
          reviewedAt: now,
          history: [
            ...historyPrev,
            { at: now.toISOString(), by: "GIANGVIEN", action: "REJECTED", reason: rejectReason }
          ]
        }
      });

      await tx.studentProfile.update({ //hàm cập nhật sinh viên
        where: { id: report.studentProfileId },
        data: { internshipStatus: "REPORT_SUBMITTED" } //hàm cập nhật trạng thái thực tập thành REPORT_SUBMITTED
      });

      if (prevStatus && prevStatus !== "REPORT_SUBMITTED") { //hàm tạo lịch sử trạng thái thực tập
        await tx.internshipStatusHistory.create({
          data: {
            studentProfileId: report.studentProfileId,
            fromStatus: prevStatus,
            toStatus: "REPORT_SUBMITTED",
            byRole: "giangvien",
            message: "GVHD từ chối duyệt BCTT (SV có thể sửa và nộp lại)", //hàm tạo lịch sử trạng thái thực tập
            meta: { reportId: report.id }
          }
        });
      }
    });

    try {
      const appUrl = getPublicAppUrl();  
      const { svFullName, svEmail } = await fetchStudentMailInfo(report.studentProfileId); //hàm lấy thông tin sinh viên
      if (svEmail) {
        await sendMail(
          svEmail,
          `${MAIL_PHONG_DAO_TAO_SUBJECT_PREFIX} – GVHD từ chối duyệt Báo cáo thực tập`, 
          `Kính gửi ${svFullName},\n\nGiảng viên hướng dẫn đã TỪ CHỐI duyệt Báo cáo thực tập (BCTT) của bạn.\n\nLý do: ${rejectReason}\n\nVui lòng chỉnh sửa và nộp lại BCTT theo hướng dẫn của GVHD.\nĐường dẫn hệ thống: ${appUrl}/sinhvien\n\n${MAIL_TRANSACTIONAL_SIGN_OFF}`
        );
      }
    } catch {
      // Email failure should not block the main response
    }

    return NextResponse.json({ success: true, message: "Đã từ chối duyệt BCTT. Sinh viên có thể sửa lại." });
  }

  // APPROVE
  const noSpecialPattern = /^[\p{L}\d\s]*$/u; //hàm xử lý ký tự đặc biệt
  const pointPattern = /^\d+(\.\d+)?$/; //hàm xử lý điểm

  const supervisorEvaluationRaw = (body.supervisorEvaluation || "").trim(); //hàm xử lý đánh giá giảng viên
  const enterpriseEvaluationRaw = (body.enterpriseEvaluation || "").trim(); //hàm xử lý đánh giá doanh nghiệp
 
  if (supervisorEvaluationRaw && !noSpecialPattern.test(supervisorEvaluationRaw)) { //hàm xử lý ký tự đặc biệt
    return NextResponse.json({ success: false, message: "Đánh giá GVHD không được chứa ký tự đặc biệt." }, { status: 400 });
  }
  if (enterpriseEvaluationRaw && !noSpecialPattern.test(enterpriseEvaluationRaw)) {
    return NextResponse.json({ success: false, message: "Đánh giá DN không được chứa ký tự đặc biệt." }, { status: 400 });
  }

  const supervisorPointRaw = String(body.supervisorPoint ?? "").trim();
  const enterprisePointRaw = String(body.enterprisePoint ?? "").trim();

  if (!supervisorPointRaw) return NextResponse.json({ success: false, message: "Vui lòng nhập điểm GVHD." }, { status: 400 });
  if (!pointPattern.test(supervisorPointRaw)) return NextResponse.json({ success: false, message: "Điểm GVHD không hợp lệ." }, { status: 400 });
  const supervisorPointNum = Number(supervisorPointRaw);
  if (Number.isNaN(supervisorPointNum) || supervisorPointNum < 1 || supervisorPointNum > 10) {
    return NextResponse.json({ success: false, message: "Điểm GVHD phải nằm trong khoảng 1-10." }, { status: 400 });
  }

  if (!enterprisePointRaw) return NextResponse.json({ success: false, message: "Vui lòng nhập điểm KTHP." }, { status: 400 });
  if (!pointPattern.test(enterprisePointRaw)) return NextResponse.json({ success: false, message: "Điểm KTHP không hợp lệ." }, { status: 400 });
  const enterprisePointNum = Number(enterprisePointRaw);
  if (Number.isNaN(enterprisePointNum) || enterprisePointNum < 1 || enterprisePointNum > 10) {
    return NextResponse.json({ success: false, message: "Điểm KTHP phải nằm trong khoảng 1-10." }, { status: 400 });
  }

  const supervisorEvaluation = supervisorEvaluationRaw || null;
  const enterpriseEvaluation = isSelfFinancedInternship ? null : enterpriseEvaluationRaw || null;

  await prismaAny.$transaction(async (tx: any) => { //hàm xử lý transaction
    await tx.internshipReport.update({ //hàm cập nhật báo cáo thực tập
      where: { id: report.id },
      data: {
        reviewStatus: "APPROVED",
        supervisorRejectReason: null,
        supervisorEvaluation,
        supervisorPoint: supervisorPointNum,
        enterpriseEvaluation,
        enterprisePoint: enterprisePointNum,
        reviewedAt: now,
        history: [...historyPrev, { at: now.toISOString(), by: "GIANGVIEN", action: "APPROVED" }]
      }
    });

    if (prevStatus !== "REPORT_SUBMITTED") { //hàm cập nhật sinh viên
      await tx.studentProfile.update({ //hàm cập nhật sinh viên
        where: { id: report.studentProfileId },
        data: { internshipStatus: "REPORT_SUBMITTED" }
      });
      if (prevStatus) {
        await tx.internshipStatusHistory.create({
          data: {
            studentProfileId: report.studentProfileId,
            fromStatus: prevStatus,
            toStatus: "REPORT_SUBMITTED",
            byRole: "giangvien",
            message: "GVHD duyệt BCTT",
            meta: { reportId: report.id } //hàm tạo lịch sử trạng thái thực tập
          }
        });
      }
    }
  });

  try {
    const appUrl = getPublicAppUrl(); //hàm lấy url hệ thống
    const { svFullName, svEmail } = await fetchStudentMailInfo(report.studentProfileId); //hàm lấy thông tin sinh viên
    if (svEmail) {
      const scoreLines = [ //hàm xử lý điểm
        `- Điểm ĐQT (GVHD): ${supervisorPointNum}`,
        `- Điểm KTHP (GVHD): ${enterprisePointNum}`,
        supervisorEvaluation ? `- Đánh giá: ${supervisorEvaluation}` : null
      ]
        .filter(Boolean)
        .join("\n");

      await sendMail(
        svEmail,
        `${MAIL_PHONG_DAO_TAO_SUBJECT_PREFIX} – GVHD đã duyệt Báo cáo thực tập`,
        `Kính gửi ${svFullName},\n\nGiảng viên hướng dẫn ${supervisorName} đã DUYỆT Báo cáo thực tập (BCTT) của bạn.\n\n${scoreLines}\n\nKết quả đã được ghi nhận và gửi về Ngành/Khoa. Vui lòng đăng nhập hệ thống để xem chi tiết.\nĐường dẫn hệ thống: ${appUrl}/sinhvien\n\n${MAIL_TRANSACTIONAL_SIGN_OFF}`
      );
    }
  } catch {
    // Email failure should not block the main response
  }

  return NextResponse.json({ success: true, message: "Đã duyệt BCTT. Chờ admin chốt trạng thái thực tập cuối cùng." });
}
