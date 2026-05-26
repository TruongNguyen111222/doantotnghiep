import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth/jwt";
import { SESSION_COOKIE_NAME } from "@/lib/constants/auth/patterns";
import { prisma } from "@/lib/prisma";
import { MAIL_PHONG_DAO_TAO_SUBJECT_PREFIX, MAIL_TRANSACTIONAL_SIGN_OFF } from "@/lib/constants/school";
import { sendMail } from "@/lib/mail";
import { signRespondToken } from "@/lib/utils/respond-token";
import { validateInterviewInviteSchedule } from "@/lib/utils/doanhnghiep-ung-vien-detail";
/**
 * TỔNG QUAN FILE:
 * Route Handler này xử lý API endpoint PATCH nhằm cho phép Doanh nghiệp (Enterprise) cập nhật trạng thái
 * hồ sơ ứng tuyển (Job Application) 
 * xác thực điều kiện logic chuyển đổi trạng thái hồ sơ, kiểm tra trạng thái thực tập hiện tại của sinh viên,
 * ghi nhận lịch sử thay đổi vào database qua Prisma, và tự động gửi email thông báo kết quả (mời phỏng vấn, 
 * trúng tuyển hoặc từ chối) tương ứng đến cho Sinh viên.
 */
type JobApplicationStatus = "PENDING_REVIEW" | "INTERVIEW_INVITED" | "OFFERED" | "REJECTED" | "STUDENT_DECLINED"; //định nghĩa các kiểu dữ liệu cho trạng thái ứng viên
type JobApplicationResponse = "PENDING" | "ACCEPTED" | "DECLINED"; //định nghĩa các kiểu dữ liệu cho phản hồi ứng viên

function nowIso() { //lấy thời gian hiện tại
  return new Date().toISOString();
}

function parseDateTime(input: string) { //chuyển đổi chuỗi thành đối tượng Date
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? null : d;
}

function tomorrowStart(): Date { //lấy thời gian ngày mai
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function canUpdateStatus( //kiểm tra điều kiện logic chuyển đổi trạng thái hồ sơ
  currentStatus: JobApplicationStatus, //trạng thái hiện tại của hồ sơ
  response: JobApplicationResponse, //phản hồi của ứng viên 
  nextStatus: JobApplicationStatus //trạng thái muốn chuyển đổi
): { ok: boolean; message?: string } {
  if (currentStatus === "STUDENT_DECLINED" || currentStatus === "REJECTED") { //nếu trạng thái hiện tại là STUDENT_DECLINED hoặc REJECTED thì không thể cập nhật trạng thái
    return { ok: false, message: "Không thể cập nhật trạng thái sau khi đã từ chối." };
  }
  if (response === "DECLINED") { //nếu phản hồi của ứng viên là DECLINED thì không thể cập nhật trạng thái
    return { ok: false, message: "Ứng viên đã từ chối. Không thể cập nhật trạng thái." };
  }

  if (currentStatus === "PENDING_REVIEW") { //nếu trạng thái hiện tại là PENDING_REVIEW thì chỉ được chuyển đổi sang INTERVIEW_INVITED, OFFERED hoặc REJECTED
    if (["INTERVIEW_INVITED", "OFFERED", "REJECTED"].includes(nextStatus)) return { ok: true };
    return { ok: false, message: "Trạng thái cập nhật không hợp lệ." };
  }

  if (currentStatus === "INTERVIEW_INVITED") { //nếu trạng thái hiện tại là INTERVIEW_INVITED thì chỉ được chuyển đổi sang OFFERED hoặc REJECTED
    if (response === "PENDING") {
      return { ok: false, message: "Đang chờ ứng viên phản hồi lời mời phỏng vấn." };
    }
    if (response === "ACCEPTED") { //nếu phản hồi của ứng viên là ACCEPTED thì chỉ được chuyển đổi sang OFFERED hoặc REJECTED
      if (nextStatus === "OFFERED" || nextStatus === "REJECTED") return { ok: true };
      return { ok: false, message: "Sau khi ứng viên đồng ý phỏng vấn chỉ được cập nhật Trúng tuyển hoặc Từ chối." };
    }
    return { ok: false, message: "Ứng viên đã từ chối phỏng vấn." }; //nếu phản hồi của ứng viên là DECLINED thì không thể cập nhật trạng thái
  }

  if (currentStatus === "OFFERED") { //nếu trạng thái hiện tại là OFFERED thì không thể cập nhật trạng thái
    return { ok: false, message: "Đang chờ ứng viên phản hồi lời mời thực tập. Không thể cập nhật thêm." };
  }

  return { ok: false, message: "Trạng thái cập nhật không hợp lệ." }; //nếu trạng thái không hợp lệ thì không thể cập nhật trạng thái
}

function getBaseUrl(): string { //lấy url cơ sở
  const base = process.env.APP_URL?.replace(/\/$/, "");
  if (base) return base;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) { //xử lý yêu cầu cập nhật trạng thái hồ sơ
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value; //lấy token từ cookie
  if (!token) return NextResponse.json({ success: false, message: "Vui lòng đăng nhập." }, { status: 401 });

  let sub: string; //lấy id người dùng
  let role: string; //lấy vai trò người dùng
  try {
    const verified = await verifySession(token); //xác thực token
    sub = verified.sub; //lấy id người dùng
    role = verified.role; //lấy vai trò người dùng
  } catch {
    return NextResponse.json({ success: false, message: "Phiên đăng nhập không hợp lệ." }, { status: 401 });
  }
  if (role !== "doanhnghiep") return NextResponse.json({ success: false, message: "Không có quyền truy cập." }, { status: 403 });

  const { id } = await ctx.params; //lấy id hồ sơ
  const body = (await request.json()) as { //lấy dữ liệu từ body
    status?: JobApplicationStatus; //trạng thái hồ sơ
    interviewAt?: string; //thời gian phỏng vấn
    interviewLocation?: string; //địa điểm phỏng vấn
    responseDeadline?: string; //thời hạn phản hồi
  };

  const nextStatus = (body.status || "").trim() as JobApplicationStatus; //lấy trạng thái hồ sơ
  const interviewAtRaw = (body.interviewAt || "").trim(); //lấy thời gian phỏng vấn
  const interviewLocationRaw = (body.interviewLocation || "").trim(); //lấy địa điểm phỏng vấn
  const responseDeadlineRaw = (body.responseDeadline || "").trim(); //lấy thời hạn phản hồi

  if (!nextStatus) return NextResponse.json({ success: false, message: "Trạng thái bắt buộc." }, { status: 400 });

  const prismaAny = prisma as any; //lấy dữ liệu từ database
  const current = await prismaAny.jobApplication.findFirst({ //lấy dữ liệu từ database
    where: { id }, //lấy id hồ sơ
    select: { //lấy dữ liệu từ database
      id: true, //lấy id hồ sơ
      status: true, //lấy trạng thái hồ sơ
      response: true, //lấy phản hồi hồ sơ
      interviewAt: true, //lấy thời gian phỏng vấn
      history: true, //lấy lịch sử thay đổi hồ sơ
      jobPost: { //lấy dữ liệu từ database
      select: { //lấy dữ liệu từ database
        id: true, //lấy id hồ sơ
        title: true,
        expertise: true,
        enterpriseUserId: true,
        enterpriseUser: { select: { companyName: true, email: true } }
      }
      },
      studentUser: { //lấy dữ liệu từ database
        select: {
          fullName: true,
          email: true,
          studentProfile: { select: { internshipStatus: true } }
        }
      }
    }
  });

  if (!current || current.jobPost?.enterpriseUserId !== sub) { //nếu không tìm thấy hồ sơ ứng tuyển hoặc id hồ sơ không phù hợp thì trả về lỗi
    return NextResponse.json({ success: false, message: "Không tìm thấy hồ sơ ứng tuyển." }, { status: 404 });
  }

  // kiểm tra trạng thái thực tập hiện tại của sinh viên
  const svInternshipStatus = current.studentUser?.studentProfile?.internshipStatus ?? "NOT_STARTED";
  if (svInternshipStatus !== "NOT_STARTED") { //nếu trạng thái thực tập hiện tại của sinh viên không phù hợp thì trả về lỗi
    return NextResponse.json(
      { success: false, message: "Sinh viên đã có nơi thực tập. Không thể cập nhật trạng thái hồ sơ." },
      { status: 400 }
    );
  }
// kiểm tra điều kiện logic chuyển đổi trạng thái hồ sơ
  const check = canUpdateStatus(current.status, current.response, nextStatus); //kiểm tra điều kiện logic chuyển đổi trạng thái hồ sơ
  if (!check.ok) return NextResponse.json({ success: false, message: check.message }, { status: 400 });

  const svFullName: string = current.studentUser?.fullName ?? "Sinh viên"; //lấy tên sinh viên
  const svEmail: string | null = current.studentUser?.email ?? null;
  const companyName: string = current.jobPost?.enterpriseUser?.companyName ?? "Doanh nghiệp";
  const jobTitle: string = current.jobPost?.title ?? "vị trí thực tập";
  const expertiseLine = current.jobPost?.expertise ? `\n  Lĩnh vực: ${current.jobPost.expertise}` : "";

  let interviewAt: Date | null | undefined = undefined;
  let responseDeadline: Date | null = null;

  if (nextStatus === "INTERVIEW_INVITED") {
    if (!interviewAtRaw) {
      return NextResponse.json({ success: false, message: "Vui lòng nhập thời gian phỏng vấn." }, { status: 400 });
    }
    if (!interviewLocationRaw) {
      return NextResponse.json({ success: false, message: "Vui lòng nhập địa điểm phỏng vấn." }, { status: 400 });
    }
    if (!responseDeadlineRaw) {
      return NextResponse.json({ success: false, message: "Vui lòng nhập thời hạn phản hồi." }, { status: 400 });
    }
    const parsedInterview = parseDateTime(interviewAtRaw);
    if (!parsedInterview) return NextResponse.json({ success: false, message: "Thời gian phỏng vấn không hợp lệ." }, { status: 400 });
    const parsedDeadline = parseDateTime(responseDeadlineRaw);
    if (!parsedDeadline) return NextResponse.json({ success: false, message: "Thời hạn phản hồi không hợp lệ." }, { status: 400 });
    const min = tomorrowStart().getTime();
    if (!(parsedInterview.getTime() >= min)) {
      return NextResponse.json({ success: false, message: "Thời gian phỏng vấn phải từ ngày mai trở đi." }, { status: 400 });
    }
    if (!(parsedDeadline.getTime() >= min)) {
      return NextResponse.json({ success: false, message: "Thời hạn phản hồi phải từ ngày mai trở đi." }, { status: 400 });
    }
    const scheduleCheck = validateInterviewInviteSchedule(
      parsedDeadline.toISOString(),
      parsedInterview.toISOString()
    );
    if (!scheduleCheck.ok) {
      return NextResponse.json({ success: false, message: scheduleCheck.message }, { status: 400 });
    }
    interviewAt = parsedInterview;
    responseDeadline = parsedDeadline;
  }

  if (nextStatus === "OFFERED") { //nếu trạng thái hồ sơ là OFFERED thì lấy thời hạn phản hồi
    if (!responseDeadlineRaw) {
      return NextResponse.json({ success: false, message: "Vui lòng nhập thời hạn phản hồi." }, { status: 400 });
    }
    const parsedDeadline = parseDateTime(responseDeadlineRaw);
    if (!parsedDeadline) return NextResponse.json({ success: false, message: "Thời hạn phản hồi không hợp lệ." }, { status: 400 });
    const min = tomorrowStart().getTime();
    if (!(parsedDeadline.getTime() >= min)) {
      return NextResponse.json({ success: false, message: "Thời hạn phản hồi phải từ ngày mai trở đi." }, { status: 400 });
    }
    responseDeadline = parsedDeadline; //lấy thời hạn phản hồi
  }

  const prevHistory = Array.isArray(current.history) ? current.history : []; //lấy lịch sử thay đổi hồ sơ
  const historyEvent: Record<string, unknown> = {
    at: nowIso(), //lấy thời gian thay đổi
    by: "ENTERPRISE", //lấy vai trò thay đổi
    action: "STATUS_UPDATE",
    from: current.status, //lấy trạng thái hiện tại
    to: nextStatus //lấy trạng thái muốn chuyển đổi
  };
  if (interviewAt) historyEvent.interviewAt = interviewAt.toISOString(); //lấy thời gian phỏng vấn
  if (interviewLocationRaw) historyEvent.interviewLocation = interviewLocationRaw;
  if (responseDeadline) historyEvent.responseDeadline = responseDeadline.toISOString(); //lấy thời hạn phản hồi

  const data: any = { //lấy dữ liệu từ database
    status: nextStatus,
    history: [...prevHistory, historyEvent] //lấy lịch sử thay đổi hồ sơ
  };

  if (nextStatus === "INTERVIEW_INVITED") { //nếu trạng thái hồ sơ là INTERVIEW_INVITED thì lấy thời gian phỏng vấn
    data.interviewAt = interviewAt; //lấy thời gian phỏng vấn
    data.response = "PENDING"; //lấy phản hồi hồ sơ
    data.responseAt = null; //lấy thời gian phản hồi hồ sơ
  }
  if (nextStatus === "OFFERED") { //nếu trạng thái hồ sơ là OFFERED thì lấy thời hạn phản hồi
    data.response = "PENDING"; //lấy phản hồi hồ sơ
    data.responseAt = null; //lấy thời gian phản hồi hồ sơ
  }

  await prismaAny.jobApplication.update({ where: { id }, data }); //cập nhật dữ liệu vào database

  // gửi email thông báo kết quả (mời phỏng vấn, trúng tuyển hoặc từ chối) tương ứng đến cho Sinh viên
  try {
    const baseUrl = getBaseUrl(); //lấy url cơ sở

    if (nextStatus === "INTERVIEW_INVITED" && svEmail && responseDeadline && interviewAt) { //nếu trạng thái hồ sơ là INTERVIEW_INVITED thì gửi email thông báo mời phỏng vấn đến cho Sinh viên
      const interviewDateStr = interviewAt.toLocaleString("vi-VN"); //lấy thời gian phỏng vấn
      const deadlineStr = responseDeadline.toLocaleString("vi-VN"); //lấy thời hạn phản hồi

      await sendMail(
        svEmail, //lấy email sinh viên
        `${MAIL_PHONG_DAO_TAO_SUBJECT_PREFIX} – ${companyName} mời bạn tham gia phỏng vấn – ${jobTitle}`,
        `Kính gửi ${svFullName},\n\nDoanh nghiệp ${companyName} mời bạn tham gia phỏng vấn cho vị trí "${jobTitle}".${expertiseLine}\n\nThời gian phỏng vấn: ${interviewDateStr}\nĐịa điểm: ${interviewLocationRaw}\nThời hạn phản hồi: ${deadlineStr}\n\nTruy cập hệ thống để xem thông tin chi tiết.\n${baseUrl}/sinhvien\n\n${MAIL_TRANSACTIONAL_SIGN_OFF}`,
        `
        <p>Kính gửi <strong>${svFullName}</strong>,</p>
        <p>Doanh nghiệp <strong>${companyName}</strong> mời bạn tham gia phỏng vấn cho vị trí <strong>"${jobTitle}"</strong>.</p>
        <table style="font-size:14px;margin:12px 0;border-collapse:collapse;">
          <tr><th style="text-align:left;padding:4px 12px 4px 0;color:#6b7280;">Thời gian:</th><td>${interviewDateStr}</td></tr>
          <tr><th style="text-align:left;padding:4px 12px 4px 0;color:#6b7280;">Địa điểm:</th><td>${interviewLocationRaw}</td></tr>
          <tr><th style="text-align:left;padding:4px 12px 4px 0;color:#6b7280;">Thời hạn phản hồi:</th><td>${deadlineStr}</td></tr>
        </table>
        <p style="margin:12px 0 0;">
          <a href="${baseUrl}/sinhvien" style="background:#005bac;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block;">
            Truy cập hệ thống
          </a>
        </p>
        `
      );
    }

    if (nextStatus === "OFFERED" && svEmail && responseDeadline) { //nếu trạng thái hồ sơ là OFFERED thì gửi email thông báo trúng tuyển đến cho Sinh viên
      const deadlineStr = responseDeadline.toLocaleString("vi-VN");

      await sendMail(
        svEmail,
        `${MAIL_PHONG_DAO_TAO_SUBJECT_PREFIX} – ${companyName} thông báo Trúng tuyển – ${jobTitle}`,
        `Kính gửi ${svFullName},\n\nChúc mừng! Doanh nghiệp ${companyName} thông báo bạn đã TRÚNG TUYỂN vị trí "${jobTitle}".${expertiseLine}\n\nThời hạn phản hồi: ${deadlineStr}\n\nTruy cập hệ thống để xem thông tin chi tiết.\n${baseUrl}/sinhvien\n\n${MAIL_TRANSACTIONAL_SIGN_OFF}`,
        `
        <p>Kính gửi <strong>${svFullName}</strong>,</p>
        <p>Chúc mừng! Doanh nghiệp <strong>${companyName}</strong> thông báo bạn đã <strong>TRÚNG TUYỂN</strong> vị trí <strong>"${jobTitle}"</strong>.</p>
        <p><strong>Thời hạn phản hồi:</strong> ${deadlineStr}</p>
        <p style="margin:12px 0 0;">
          <a href="${baseUrl}/sinhvien" style="background:#005bac;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block;">
            Truy cập hệ thống
          </a>
        </p>
        `
      );
    }

    if (nextStatus === "REJECTED" && svEmail) { //nếu trạng thái hồ sơ là REJECTED thì gửi email thông báo từ chối đến cho Sinh viên
      await sendMail(
        svEmail, //lấy email sinh viên
        `${MAIL_PHONG_DAO_TAO_SUBJECT_PREFIX} – Thông báo kết quả ứng tuyển – ${jobTitle}`,
        `Kính gửi ${svFullName},\n\nCảm ơn bạn đã ứng tuyển vào vị trí "${jobTitle}" tại ${companyName}.${expertiseLine}\n\nRất tiếc, sau khi xem xét, doanh nghiệp không thể tiếp tục tiến trình tuyển dụng với bạn.\n\nChúc bạn thành công trong việc tìm kiếm nơi thực tập phù hợp.\nĐường dẫn hệ thống: ${baseUrl}/sinhvien\n\n${MAIL_TRANSACTIONAL_SIGN_OFF}`
      );
    }
  } catch {
    // Email failure should not block the main response
  }

  return NextResponse.json({ success: true, message: "Cập nhật trạng thái hồ sơ thành công." }); //trả về dữ liệu thành công
}
