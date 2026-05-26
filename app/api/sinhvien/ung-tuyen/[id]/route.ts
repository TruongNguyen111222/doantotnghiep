import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth/jwt";
import { SESSION_COOKIE_NAME } from "@/lib/constants/auth/patterns";
import { prisma } from "@/lib/prisma";
import { MAIL_PHONG_DAO_TAO_SUBJECT_PREFIX, MAIL_TRANSACTIONAL_SIGN_OFF, SCHOOL_FULL_NAME } from "@/lib/constants/school";
import { sendMail } from "@/lib/mail";
import { getPublicAppUrl } from "@/lib/mail-enterprise";
import { escapeHtml, mailCalloutHtml } from "@/lib/mail-layout";
import { assertStudentCanConfirmInternship } from "@/lib/server/student-internship-commitment";

type StudentAction = "CONFIRM_INTERVIEW" | "DECLINE_INTERVIEW" | "CONFIRM_INTERNSHIP" | "DECLINE_INTERNSHIP";

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

async function fetchMailContext(prismaAny: any, applicationId: string) { //hàm lấy context email
  const app = await prismaAny.jobApplication.findFirst({ //lấy ứng tuyển theo id
    where: { id: applicationId },
    select: {
      jobPost: {
        select: {
          title: true,
          expertise: true,
          enterpriseUser: { select: { email: true, companyName: true } }
        }
      },
      studentUser: { select: { fullName: true, email: true, phone: true } }
    }
  });
  return { //trả về context email
    jobTitle: (app?.jobPost?.title ?? "") as string,
    expertise: (app?.jobPost?.expertise ?? null) as string | null,
    companyName: (app?.jobPost?.enterpriseUser?.companyName ?? "") as string,
    enterpriseEmail: (app?.jobPost?.enterpriseUser?.email ?? null) as string | null,
    svFullName: (app?.studentUser?.fullName ?? "Sinh viên") as string,
    svEmail: (app?.studentUser?.email ?? null) as string | null,
    svPhone: (app?.studentUser?.phone ?? null) as string | null
  };
}

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) { //hàm phản hồi ứng tuyển
  const auth = await getStudentUserId(); //lấy id sinh viên
  if (auth.error) return auth.error;
  const userId = auth.userId as string;
  const { id } = await ctx.params; //lấy id ứng tuyển
  const body = (await request.json()) as { action?: StudentAction }; //lấy body request
  const action = (body.action || "").trim() as StudentAction;

  if (!action) return NextResponse.json({ success: false, message: "Hành động bắt buộc." }, { status: 400 }); //trả về lỗi nếu không có action

  const prismaAny = prisma as any;
  const app = await prismaAny.jobApplication.findFirst({ //lấy ứng tuyển theo id và id sinh viên
    where: { id, studentUserId: userId },
    select: {
      id: true,
      status: true,
      response: true,
      history: true
    }
  });
  if (!app) return NextResponse.json({ success: false, message: "Không tìm thấy hồ sơ ứng tuyển." }, { status: 404 });

  const isInterview = app.status === "INTERVIEW_INVITED";
  const isOffered = app.status === "OFFERED";
  if (!isInterview && !isOffered) {
    return NextResponse.json({ success: false, message: "Trạng thái hiện tại không cho phép phản hồi." }, { status: 400 });
  }

  if (app.response !== "PENDING") {
    return NextResponse.json({ success: false, message: "Bạn đã phản hồi trước đó, không thể thay đổi." }, { status: 400 });
  }

  if (isInterview && !["CONFIRM_INTERVIEW", "DECLINE_INTERVIEW"].includes(action)) {
    return NextResponse.json({ success: false, message: "Chỉ được xác nhận hoặc từ chối phỏng vấn." }, { status: 400 });
  }
  if (isOffered && !["CONFIRM_INTERNSHIP", "DECLINE_INTERNSHIP"].includes(action)) {
    return NextResponse.json({ success: false, message: "Chỉ được xác nhận hoặc từ chối thực tập." }, { status: 400 });
  }

  if (action === "CONFIRM_INTERNSHIP") {
    const commitCheck = await assertStudentCanConfirmInternship(prismaAny, userId, id);
    if (!commitCheck.ok) {
      return NextResponse.json({ success: false, message: commitCheck.message }, { status: 400 });
    }
  }

  const now = new Date(); //lấy thời gian hiện tại
  const prevHistory = Array.isArray(app.history) ? app.history : [];
  const historyEvent = { //lấy lịch sử ứng tuyển
    at: now.toISOString(),
    by: "STUDENT",
    action,
    fromStatus: app.status
  };

  let responseMessage = ""; //lấy message phản hồi

  if (action === "CONFIRM_INTERVIEW") {
    await prismaAny.jobApplication.update({ //cập nhật ứng tuyển
      where: { id },
      data: {
        response: "ACCEPTED",
        responseAt: now,
        history: [...prevHistory, historyEvent]
      }
    });
    responseMessage = "Đã xác nhận phỏng vấn.";
  } else if (action === "DECLINE_INTERVIEW") {
    await prismaAny.jobApplication.update({ //cập nhật ứng tuyển
      where: { id },
      data: {
        status: "STUDENT_DECLINED",
        response: "DECLINED",
        responseAt: now,
        history: [...prevHistory, historyEvent]
      }
    });
    responseMessage = "Đã từ chối phỏng vấn.";
  } else if (action === "DECLINE_INTERNSHIP") {
    await prismaAny.jobApplication.update({ //cập nhật ứng tuyển
      where: { id },
      data: {
        status: "STUDENT_DECLINED",
        response: "DECLINED",
        responseAt: now,
        history: [...prevHistory, historyEvent]
      }
    });
    responseMessage = "Đã từ chối thực tập.";
  } else {
    // CONFIRM_INTERNSHIP
    await prismaAny.$transaction(async (tx: any) => { //cập nhật ứng tuyển
      await tx.jobApplication.update({
        where: { id },
        data: {
          response: "ACCEPTED",
          responseAt: now,
          history: [...prevHistory, historyEvent]
        }
      });

      const student = await tx.studentProfile.findFirst({ //lấy hồ sơ sinh viên   
        where: { userId },
        select: { id: true, internshipStatus: true }
      });
      if (!student) throw new Error("Missing studentProfile");

      const prevStatus = student.internshipStatus;
      await tx.studentProfile.update({
        where: { userId },
        data: { internshipStatus: "DOING" }
      });
      if (prevStatus !== "DOING") {
        await tx.internshipStatusHistory.create({
          data: {
            studentProfileId: student.id,
            fromStatus: prevStatus,
            toStatus: "DOING",
            byRole: "sinhvien",
            message: "Xác nhận thực tập"
          }
        });
      }
    });
    responseMessage = "Xác nhận thực tập thành công. Trạng thái thực tập đã chuyển sang Đang thực tập.";
  }

  // Send email notifications
  try {
    const appUrl = getPublicAppUrl(); //lấy url ứng dụng
    const { jobTitle, expertise, companyName, enterpriseEmail, svFullName, svEmail, svPhone } =
      await fetchMailContext(prismaAny, id);

    const phoneInfo = svPhone ? ` - SĐT: ${svPhone}` : "";
    const expertiseDnLine = expertise ? `\n  Lĩnh vực: ${expertise}` : "";

    if (action === "CONFIRM_INTERVIEW" && enterpriseEmail) {
      await sendMail(
        enterpriseEmail,
        `${MAIL_PHONG_DAO_TAO_SUBJECT_PREFIX} – ${svFullName} đã xác nhận tham gia phỏng vấn – ${jobTitle}`,
        `Kính gửi ${companyName},\n\nSinh viên ${svFullName}${phoneInfo} đã XÁC NHẬN tham gia phỏng vấn cho vị trí "${jobTitle}".${expertiseDnLine}\n\nVui lòng liên hệ sinh viên để sắp xếp lịch phỏng vấn chi tiết.\nĐường dẫn hệ thống: ${appUrl}/doanhnghiep\n\n${MAIL_TRANSACTIONAL_SIGN_OFF}`
      );
    }
    if (action === "DECLINE_INTERVIEW" && enterpriseEmail) {
      await sendMail(
        enterpriseEmail,
        `${MAIL_PHONG_DAO_TAO_SUBJECT_PREFIX} – ${svFullName} đã từ chối tham gia phỏng vấn – ${jobTitle}`,
        `Kính gửi ${companyName},\n\nSinh viên ${svFullName} đã TỪ CHỐI tham gia phỏng vấn cho vị trí "${jobTitle}".${expertiseDnLine}\nĐường dẫn hệ thống: ${appUrl}/doanhnghiep\n\n${MAIL_TRANSACTIONAL_SIGN_OFF}`
      );
    }
    if (action === "CONFIRM_INTERNSHIP" && enterpriseEmail) {
      await sendMail(
        enterpriseEmail,
        `${MAIL_PHONG_DAO_TAO_SUBJECT_PREFIX} – ${svFullName} đã xác nhận nhận thực tập – ${jobTitle}`,
        `Kính gửi ${companyName},\n\nSinh viên ${svFullName}${phoneInfo} đã XÁC NHẬN tham gia thực tập tại quý doanh nghiệp cho vị trí "${jobTitle}".${expertiseDnLine}\n\nSinh viên sẽ liên hệ với quý doanh nghiệp để sắp xếp lịch bắt đầu thực tập.\nĐường dẫn hệ thống: ${appUrl}/doanhnghiep\n\n${MAIL_TRANSACTIONAL_SIGN_OFF}`
      );
    }
    if (action === "DECLINE_INTERNSHIP" && enterpriseEmail) {
      await sendMail(
        enterpriseEmail,
        `${MAIL_PHONG_DAO_TAO_SUBJECT_PREFIX} – ${svFullName} đã từ chối nhận thực tập – ${jobTitle}`,
        `Kính gửi ${companyName},\n\nSinh viên ${svFullName} đã TỪ CHỐI tham gia thực tập tại quý doanh nghiệp cho vị trí "${jobTitle}".${expertiseDnLine}\nĐường dẫn hệ thống: ${appUrl}/doanhnghiep\n\n${MAIL_TRANSACTIONAL_SIGN_OFF}`
      );
    }

    // Confirmation email to SV
    if (svEmail) {
      const svSubject =
        action === "CONFIRM_INTERVIEW"
          ? `${MAIL_PHONG_DAO_TAO_SUBJECT_PREFIX} – Xác nhận phỏng vấn tại ${companyName} – ${jobTitle}`
          : action === "DECLINE_INTERVIEW"
          ? `${MAIL_PHONG_DAO_TAO_SUBJECT_PREFIX} – Từ chối phỏng vấn tại ${companyName} – ${jobTitle}`
          : action === "CONFIRM_INTERNSHIP"
          ? `${MAIL_PHONG_DAO_TAO_SUBJECT_PREFIX} – Xác nhận thực tập tại ${companyName} – ${jobTitle}`
          : `${MAIL_PHONG_DAO_TAO_SUBJECT_PREFIX} – Từ chối thực tập tại ${companyName} – ${jobTitle}`;

      const svBody =
        action === "CONFIRM_INTERVIEW"
          ? `Kính gửi ${svFullName},\n\nBạn đã XÁC NHẬN tham gia phỏng vấn cho vị trí "${jobTitle}" tại ${companyName}. Doanh nghiệp sẽ liên hệ với bạn để sắp xếp lịch.\nĐường dẫn hệ thống: ${appUrl}/sinhvien\n\n${MAIL_TRANSACTIONAL_SIGN_OFF}`
          : action === "DECLINE_INTERVIEW"
          ? `Kính gửi ${svFullName},\n\nBạn đã TỪ CHỐI tham gia phỏng vấn cho vị trí "${jobTitle}" tại ${companyName}.\nĐường dẫn hệ thống: ${appUrl}/sinhvien\n\n${MAIL_TRANSACTIONAL_SIGN_OFF}`
          : action === "CONFIRM_INTERNSHIP"
          ? `Kính gửi ${svFullName},\n\nBạn đã XÁC NHẬN thực tập tại ${companyName} cho vị trí "${jobTitle}". Trạng thái thực tập của bạn đã được cập nhật sang "Đang thực tập".\nĐường dẫn hệ thống: ${appUrl}/sinhvien\n\n${MAIL_TRANSACTIONAL_SIGN_OFF}`
          : `Kính gửi ${svFullName},\n\nBạn đã TỪ CHỐI thực tập tại ${companyName} cho vị trí "${jobTitle}".\nĐường dẫn hệ thống: ${appUrl}/sinhvien\n\n${MAIL_TRANSACTIONAL_SIGN_OFF}`;

      const safeSv = escapeHtml(svFullName);
      const safeCompany = escapeHtml(companyName);
      const safeJob = escapeHtml(jobTitle);
      const safeUrl = escapeHtml(`${appUrl}/sinhvien`);

      const actionLabel = //lấy label hành động
        action === "CONFIRM_INTERVIEW"
          ? "Xác nhận phỏng vấn"
          : action === "DECLINE_INTERVIEW"
            ? "Từ chối phỏng vấn"
            : action === "CONFIRM_INTERNSHIP"
              ? "Xác nhận thực tập"
              : "Từ chối thực tập";

      const mainLine =
        action === "CONFIRM_INTERVIEW"
          ? `Bạn đã <strong>XÁC NHẬN</strong> tham gia phỏng vấn cho vị trí <strong>"${safeJob}"</strong> tại <strong>${safeCompany}</strong>. Doanh nghiệp sẽ liên hệ với bạn để sắp xếp lịch.`
          : action === "DECLINE_INTERVIEW"
            ? `Bạn đã <strong>TỪ CHỐI</strong> tham gia phỏng vấn cho vị trí <strong>"${safeJob}"</strong> tại <strong>${safeCompany}</strong>.`
            : action === "CONFIRM_INTERNSHIP"
              ? `Bạn đã <strong>XÁC NHẬN</strong> thực tập cho vị trí <strong>"${safeJob}"</strong> tại <strong>${safeCompany}</strong>. Trạng thái thực tập của bạn đã được cập nhật.`
              : `Bạn đã <strong>TỪ CHỐI</strong> thực tập cho vị trí <strong>"${safeJob}"</strong> tại <strong>${safeCompany}</strong>.`;

      const svHtml = `
        <p style="margin:0 0 14px;">Kính gửi <strong>${safeSv}</strong>,</p>
        ${mailCalloutHtml("success", actionLabel, `<p style="margin:0;">${mainLine}</p>`)}
        <p style="margin:0 0 14px;">
          Đường dẫn hệ thống: <a href="${safeUrl}" style="color:#005bac;text-decoration:underline;">${safeUrl}</a>
        </p>
        <p style="margin:0;">Trân trọng,</p>
        <p style="margin:0;">Phòng Đào tạo — ${escapeHtml(SCHOOL_FULL_NAME)}</p>
      `.trim();

      await sendMail(svEmail, svSubject, svBody, svHtml);
    }
  } catch {
    // Email failure should not block the main response
  }

  return NextResponse.json({ success: true, message: responseMessage });
}
