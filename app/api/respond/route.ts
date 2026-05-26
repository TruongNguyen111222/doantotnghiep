import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyRespondToken } from "@/lib/utils/respond-token";
import { buildMailShell, escapeHtml, mailCalloutHtml, MAIL_ACCENT } from "@/lib/mail-layout";
import {
  assertStudentCanConfirmInternship,
  STUDENT_ALREADY_COMMITTED_INTERNSHIP_MESSAGE
} from "@/lib/server/student-internship-commitment";

function htmlPage(title: string, bodyHtml: string, isSuccess: boolean) {
  const safeTitle = escapeHtml(title);
  const variant = isSuccess ? "success" : "danger";
  const iconBg = isSuccess ? "#ecfdf5" : "#fff1f0";
  const iconBorder = isSuccess ? MAIL_ACCENT.success : MAIL_ACCENT.danger;
  const iconColor = isSuccess ? MAIL_ACCENT.success : MAIL_ACCENT.danger;
  const iconSvg = isSuccess
    ? `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
         <path d="M20 6L9 17l-5-5" stroke="${iconColor}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
       </svg>`
    : `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
         <path d="M18 6L6 18M6 6l12 12" stroke="${iconColor}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
       </svg>`;

  return buildMailShell({
    title: safeTitle,
    bodyHtml: `
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 16px;">
        <tr>
          <td align="center" style="width:56px;height:56px;border-radius:999px;background:${iconBg};
              border:1px solid ${iconBorder};padding:12px;">
            ${iconSvg}
          </td>
        </tr>
      </table>
      ${mailCalloutHtml(variant, "Thông báo", bodyHtml)}
    `.trim()
  });
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") || "";

  if (!token) {
    return new NextResponse(
      htmlPage("Không thể ghi nhận phản hồi", `<p style="margin:0;">Liên kết này không hợp lệ hoặc đã hết hạn.</p>`, false),
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  let payload: Awaited<ReturnType<typeof verifyRespondToken>>;
  try {
    payload = await verifyRespondToken(token);
  } catch {
    return new NextResponse(
      htmlPage(
        "Không thể ghi nhận phản hồi",
        `<p style="margin:0;">Liên kết này đã hết hạn hoặc không hợp lệ. Phản hồi mặc định của bạn đã được ghi nhận là <strong>Từ chối</strong>.</p>`,
        false
      ),
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  const { purpose, appId, action } = payload;
  const prismaAny = prisma as any;

  const app = await prismaAny.jobApplication.findFirst({
    where: { id: appId },
    select: {
      id: true,
      status: true,
      response: true,
      history: true,
      studentUserId: true,
      studentUser: { select: { fullName: true } },
      jobPost: { select: { title: true, enterpriseUser: { select: { companyName: true } } } }
    }
  });

  if (!app) {
    return new NextResponse(
      htmlPage("Không thể ghi nhận phản hồi", `<p style="margin:0;">Hồ sơ ứng tuyển không tồn tại.</p>`, false),
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  // Already responded
  if (app.response !== "PENDING") {
    return new NextResponse(
      htmlPage(
        "Đã ghi nhận phản hồi",
        `<p style="margin:0;">Bạn đã phản hồi hồ sơ này trước đó. Không thể thay đổi phản hồi.</p>`,
        false
      ),
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  const svName = app.studentUser?.fullName ?? "Sinh viên";
  const jobTitle = app.jobPost?.title ?? "vị trí";
  const company = app.jobPost?.enterpriseUser?.companyName ?? "Doanh nghiệp";

  if (purpose === "respond_offer" && action === "CONFIRM" && app.status === "OFFERED") {
    const commitCheck = await assertStudentCanConfirmInternship(prismaAny, app.studentUserId, appId);
    if (!commitCheck.ok) {
      return new NextResponse(
        htmlPage("Không thể xác nhận thực tập", `<p style="margin:0;">${escapeHtml(STUDENT_ALREADY_COMMITTED_INTERNSHIP_MESSAGE)}</p>`, false),
        { headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }
  }

  const prevHistory = Array.isArray(app.history) ? app.history : [];
  const now = new Date();

  let newResponse: "ACCEPTED" | "DECLINED";
  let newStatus: string = app.status;

  if (action === "CONFIRM") {
    newResponse = "ACCEPTED";
    if (purpose === "respond_offer") {
      newStatus = "OFFERED"; // keep status as OFFERED but update response
    }
  } else {
    newResponse = "DECLINED";
    if (purpose === "respond_interview") {
      newStatus = "STUDENT_DECLINED";
    } else {
      newStatus = "STUDENT_DECLINED";
    }
  }

  const historyEvent = {
    at: now.toISOString(),
    by: "STUDENT",
    action: "STUDENT_RESPONSE",
    response: newResponse,
    purpose
  };

  const updateData: any = {
    response: newResponse,
    responseAt: now,
    history: [...prevHistory, historyEvent],
    status: newStatus
  };

  // If student confirms the offer, update internshipStatus to DOING
  if (purpose === "respond_offer" && action === "CONFIRM") {
    try {
      await prismaAny.$transaction(async (tx: any) => {
        await tx.jobApplication.update({ where: { id: appId }, data: updateData });

        const studentUserId = await prismaAny.jobApplication
          .findFirst({ where: { id: appId }, select: { studentUserId: true } })
          .then((a: any) => a?.studentUserId);

        if (studentUserId) {
          await tx.studentProfile.updateMany({
            where: { userId: studentUserId },
            data: { internshipStatus: "DOING" }
          });
        }
      });
    } catch {
      await prismaAny.jobApplication.update({ where: { id: appId }, data: updateData });
    }
  } else {
    await prismaAny.jobApplication.update({ where: { id: appId }, data: updateData });
  }

  const isConfirm = action === "CONFIRM";
  const actionLabel =
    purpose === "respond_interview"
      ? isConfirm
        ? "Chấp nhận phỏng vấn"
        : "Từ chối phỏng vấn"
      : isConfirm
        ? "Xác nhận thực tập"
        : "Từ chối thực tập";

  const successMessage =
    purpose === "respond_interview"
      ? isConfirm
        ? `<p style="margin:0 0 8px;">Bạn đã <strong>XÁC NHẬN</strong> tham gia phỏng vấn cho vị trí <strong>"${escapeHtml(jobTitle)}"</strong> tại <strong>${escapeHtml(company)}</strong>.</p>
           <p style="margin:0;">Doanh nghiệp sẽ liên hệ với bạn để sắp xếp lịch.</p>`
        : `<p style="margin:0;">Bạn đã <strong>TỪ CHỐI</strong> tham gia phỏng vấn cho vị trí <strong>"${escapeHtml(jobTitle)}"</strong> tại <strong>${escapeHtml(company)}</strong>.</p>`
      : isConfirm
        ? `<p style="margin:0 0 8px;">Bạn đã <strong>XÁC NHẬN</strong> thực tập cho vị trí <strong>"${escapeHtml(jobTitle)}"</strong> tại <strong>${escapeHtml(company)}</strong>.</p>
           <p style="margin:0;">Chúc mừng <strong>${escapeHtml(svName)}</strong>!</p>`
        : `<p style="margin:0;">Bạn đã <strong>TỪ CHỐI</strong> thực tập cho vị trí <strong>"${escapeHtml(jobTitle)}"</strong> tại <strong>${escapeHtml(company)}</strong>.</p>`;

  return new NextResponse(
    htmlPage(
      "Đã ghi nhận phản hồi",
      `
        <p style="margin:0 0 10px;"><strong>Kết quả:</strong> ${escapeHtml(actionLabel)}</p>
        ${successMessage}
        <div style="margin-top:10px;font-size:13px;color:#6b7280;">
          <div><strong style="color:#374151;">Doanh nghiệp:</strong> ${escapeHtml(company)}</div>
          <div><strong style="color:#374151;">Tin:</strong> ${escapeHtml(jobTitle)}</div>
        </div>
      `.trim(),
      isConfirm
    ),
    { headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}
