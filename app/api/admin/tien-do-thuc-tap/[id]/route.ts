import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth/admin-session";
import { MAIL_PHONG_DAO_TAO_SUBJECT_PREFIX, MAIL_TRANSACTIONAL_SIGN_OFF } from "@/lib/constants/school";
import { sendMail } from "@/lib/mail";
import { getPublicAppUrl } from "@/lib/mail-enterprise";
import { getAdminTienDoStatusLabel } from "@/lib/utils/admin-tien-do-status-label";

type Degree = "BACHELOR" | "ENGINEER"; //trình độ học vấn
type InternshipStatus =
  | "NOT_STARTED" //chưa bắt đầu
  | "DOING" //đang thực tập
  | "SELF_FINANCED" //tự tài trợ
  | "REPORT_SUBMITTED" //báo cáo đã nộp
  | "COMPLETED" //hoàn thành
  | "REJECTED"; //bị từ chối

type ReportReviewStatus = "PENDING" | "REJECTED" | "APPROVED"; //trạng thái review báo cáo

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) { //hàm lấy chi tiết tiến độ thực tập
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ message: "Không có quyền truy cập." }, { status: 403 });

  const { id } = await ctx.params;
  const prismaAny = prisma as any;

  const profile = await prismaAny.studentProfile.findFirst({ //tìm kiếm sinh viên theo id
    where: { id }, //điều kiện tìm kiếm
    select: {
      id: true,
      userId: true,
      msv: true,
      className: true,
      faculty: true,
      cohort: true,
      degree: true,
      internshipStatus: true,
      user: { select: { fullName: true, phone: true, email: true } },
      internshipReport: {
        select: {
          id: true,
          reviewStatus: true,
          reportFileName: true,
          supervisorEvaluation: true,
          supervisorPoint: true,
          enterpriseEvaluation: true,
          enterprisePoint: true,
          supervisorRejectReason: true,
          reviewedAt: true,
          submittedAt: true,
          history: true
        }
      },
      internshipStatusHistory: { 
        orderBy: { at: "desc" }, //sắp xếp theo thời gian
        select: { fromStatus: true, toStatus: true, byRole: true, message: true, at: true }
      },
      assignmentLinks: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          supervisorAssignment: {
            select: {
              status: true,
              supervisorProfile: {
                select: {
                  degree: true,
                  gender: true,
                  user: { select: { fullName: true, phone: true, email: true } }
                }
              }
            }
          }
        }
      }
    }
  });

  if (!profile) return NextResponse.json({ success: false, message: "Không tìm thấy sinh viên." }, { status: 404 });

  const internshipStatus = profile.internshipStatus as InternshipStatus;  //trạng thái thực tập
  const reportReviewStatus = (profile.internshipReport?.reviewStatus ?? null) as ReportReviewStatus | null;
  const canFinalUpdate = internshipStatus !== "COMPLETED" && internshipStatus !== "REJECTED";

  const assignment = profile.assignmentLinks?.[0]?.supervisorAssignment ?? null; //phân công hướng dẫn
  const supervisor = assignment?.supervisorProfile
    ? {
        fullName: assignment.supervisorProfile.user?.fullName ?? "",
        degree: assignment.supervisorProfile.degree ?? null,
        phone: assignment.supervisorProfile.user?.phone ?? null,
        email: assignment.supervisorProfile.user?.email ?? ""
      }
    : null;

  let enterprise: { companyName: string; position: string } | null = null; //doanh nghiệp
  if (internshipStatus !== "SELF_FINANCED") {
    const appRow = await prismaAny.jobApplication.findFirst({ //tìm kiếm ứng viên theo id sinh viên
      where: { studentUserId: profile.userId, status: "OFFERED", response: "ACCEPTED" }, //điều kiện tìm kiếm
      select: {
        jobPost: {
          select: { title: true, enterpriseUser: { select: { companyName: true } } } //lấy thông tin việc làm
        }
      },
      orderBy: { createdAt: "desc" } //sắp xếp theo thời gian
    });
    if (appRow?.jobPost) {
      enterprise = { //doanh nghiệp
        companyName: appRow.jobPost.enterpriseUser?.companyName ?? "—",
        position: appRow.jobPost.title ?? "—"
      };
    }
  }

  const report = profile.internshipReport //báo cáo thực tập
    ? {
        id: profile.internshipReport.id, //id báo cáo thực tập
        reviewStatus: profile.internshipReport.reviewStatus as ReportReviewStatus, //trạng thái review báo cáo
        reportFileName: profile.internshipReport.reportFileName, //tên báo cáo thực tập
        reportUrl: `/api/files/internship-report/${profile.internshipReport.id}`,
        supervisorEvaluation: profile.internshipReport.supervisorEvaluation ?? null, //đánh giá giảng viên hướng dẫn
        supervisorPoint: profile.internshipReport.supervisorPoint ?? null, //điểm giảng viên hướng dẫn
        enterpriseEvaluation: profile.internshipReport.enterpriseEvaluation ?? null, //đánh giá doanh nghiệp        
        enterprisePoint: profile.internshipReport.enterprisePoint ?? null, //điểm doanh nghiệp
        supervisorRejectReason: profile.internshipReport.supervisorRejectReason ?? null, //lý do từ chối báo cáo thực tập
        submittedAt: profile.internshipReport.submittedAt?.toISOString?.() ?? null, //thời gian nộp báo cáo thực tập
        reviewedAt: profile.internshipReport.reviewedAt?.toISOString?.() ?? null //thời gian review báo cáo thực tập
      }
    : null;

  return NextResponse.json({ //trả về dữ liệu chi tiết tiến độ thực tập
    success: true,
    item: {
      student: {
        id: profile.id,
        msv: profile.msv,
        fullName: profile.user?.fullName ?? "",
        className: profile.className,
        faculty: profile.faculty,
        cohort: profile.cohort,
        degree: profile.degree as Degree,
        phone: profile.user?.phone ?? null,
        email: profile.user?.email ?? ""
      },
      supervisor,
      enterprise,
      internshipStatus,
      statusLabel: getAdminTienDoStatusLabel(internshipStatus, reportReviewStatus),
      report,
      history: (profile.internshipStatusHistory || []).map((h: any) => ({
        fromStatus: h.fromStatus as InternshipStatus,
        toStatus: h.toStatus as InternshipStatus,
        at: h.at?.toISOString?.() ?? null,
        byRole: h.byRole as string,
        message: h.message ?? null
      })),
      ui: { canFinalUpdate }
    }
  });
}

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) { //hàm cập nhật trạng thái cuối cùng
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ message: "Không có quyền truy cập." }, { status: 403 });

  const { id } = await ctx.params;
  const body = (await request.json()) as { finalStatus?: "COMPLETED" | "REJECTED" }; //lấy trạng thái cuối cùng từ body
  const finalStatus = body.finalStatus;
  if (!finalStatus || (finalStatus !== "COMPLETED" && finalStatus !== "REJECTED")) {
    return NextResponse.json({ success: false, message: "Trạng thái không hợp lệ." }, { status: 400 }); //trả về lỗi nếu trạng thái không hợp lệ
  }

  const prismaAny = prisma as any;

  const profile = await prismaAny.studentProfile.findFirst({ //tìm kiếm sinh viên theo id
    where: { id }, //điều kiện tìm kiếm
    select: {
      id: true, //id sinh viên
      userId: true, //id tài khoản
      msv: true, //mã sinh viên
      internshipStatus: true, //trạng thái thực tập
      user: { select: { fullName: true, email: true } }, //lấy thông tin sinh viên
      internshipReport: {
        select: {
          reviewStatus: true, //trạng thái review báo cáo
          supervisorPoint: true, //điểm giảng viên hướng dẫn
          enterprisePoint: true, //điểm doanh nghiệp
          supervisorEvaluation: true //đánh giá giảng viên hướng dẫn
        }
      },
      assignmentLinks: {
        orderBy: { createdAt: "desc" }, //sắp xếp theo thời gian
        take: 1, //lấy 1 phần tử
        select: {
          supervisorAssignment: {
            select: {
              id: true, //id phân công hướng dẫn
              status: true, //trạng thái phân công hướng dẫn
              supervisorProfile: {
                select: {
                  user: { select: { fullName: true, email: true } } //lấy thông tin giảng viên hướng dẫn
                }
              }
            }
          }
        }
      }
    }
  });
  if (!profile) return NextResponse.json({ success: false, message: "Không tìm thấy sinh viên." }, { status: 404 }); //trả về lỗi nếu không tìm thấy sinh viên

  const internshipStatus = profile.internshipStatus as InternshipStatus; //trạng thái thực tập  

  if (internshipStatus === "COMPLETED" || internshipStatus === "REJECTED") { 
    return NextResponse.json({ success: false, message: "Trạng thái thực tập đã ở trạng thái cuối cùng, không thể cập nhật lại." }, { status: 400 }); //trả về lỗi nếu trạng thái thực tập đã ở trạng thái cuối cùng
  }

  if (finalStatus === "COMPLETED") { //nếu trạng thái cuối cùng là COMPLETED
    const report = profile.internshipReport; //báo cáo thực tập
    const reviewStatus = (report?.reviewStatus ?? null) as ReportReviewStatus | null; //trạng thái review báo cáo
    const dqt = report?.supervisorPoint ?? null; //điểm giảng viên hướng dẫn
    const kthp = report?.enterprisePoint ?? null; //điểm doanh nghiệp
    const evaluation = (report?.supervisorEvaluation ?? "").trim(); //đánh giá giảng viên hướng dẫn
    if (reviewStatus !== "APPROVED" || dqt == null || kthp == null || !evaluation) { //nếu trạng thái review báo cáo không là APPROVED hoặc điểm giảng viên hướng dẫn hoặc điểm doanh nghiệp hoặc đánh giá giảng viên hướng dẫn không hợp lệ
      return NextResponse.json( //trả về lỗi nếu GVHD chưa duyệt BCTT hoặc chưa có đủ điểm ĐQT/KTHP và đánh giá
        {
          success: false,
          message: "Chưa thể cập nhật 'Hoàn thành thực tập': GVHD chưa duyệt BCTT hoặc chưa có đủ điểm ĐQT/KTHP và đánh giá."
        },
        { status: 400 }
      ); //trả về lỗi nếu GVHD chưa duyệt BCTT hoặc chưa có đủ điểm ĐQT/KTHP và đánh giá
    }
  }

  const prevStatus = internshipStatus; //trạng thái trước đó
  const svFullName: string = profile.user?.fullName ?? "Sinh viên"; //tên sinh viên
  const svEmail: string | null = profile.user?.email ?? null; //email sinh viên

  const supervisorAssignment = profile.assignmentLinks?.[0]?.supervisorAssignment ?? null;
  const gvFullName: string = supervisorAssignment?.supervisorProfile?.user?.fullName ?? "Giảng viên"; //tên giảng viên hướng dẫn
  const gvEmail: string | null = supervisorAssignment?.supervisorProfile?.user?.email ?? null; //email giảng viên hướng dẫn

  await prismaAny.$transaction(async (tx: any) => { //thực hiện transaction
    if (finalStatus === "COMPLETED") { //nếu trạng thái cuối cùng là COMPLETED
      await tx.studentProfile.update({ where: { id }, data: { internshipStatus: "COMPLETED" } }); //cập nhật trạng thái thực tập thành COMPLETED

      if (supervisorAssignment?.id) { //nếu phân công hướng dẫn tồn tại
        await tx.supervisorAssignment.update({
          where: { id: supervisorAssignment.id },
          data: { status: "COMPLETED" } //cập nhật trạng thái phân công hướng dẫn thành COMPLETED
        });
        await tx.supervisorAssignmentStatusHistory.create({ //tạo lịch sử trạng thái phân công hướng dẫn
          data: {
            supervisorAssignmentId: supervisorAssignment.id, //id phân công hướng dẫn
            fromStatus: (supervisorAssignment.status ?? "GUIDING") as any, //trạng thái trước đó
            toStatus: "COMPLETED", //trạng thái sau
            byRole: "admin", //vai trò
            message: "Admin hoàn thành hướng dẫn thực tập" //lời nhắn
          }
        });
      }
    } else {
      // REJECTED = "Chưa hoàn thành thực tập"
      await tx.studentProfile.update({ where: { id }, data: { internshipStatus: "REJECTED" } }); //cập nhật trạng thái thực tập thành REJECTED

      if (supervisorAssignment?.id) { //nếu phân công hướng dẫn tồn tại
        await tx.supervisorAssignment.update({
          where: { id: supervisorAssignment.id },
          data: { status: "COMPLETED" } //cập nhật trạng thái phân công hướng dẫn thành COMPLETED
        });
        await tx.supervisorAssignmentStatusHistory.create({ //tạo lịch sử trạng thái phân công hướng dẫn
          data: {
            supervisorAssignmentId: supervisorAssignment.id, //id phân công hướng dẫn
            fromStatus: (supervisorAssignment.status ?? "GUIDING") as any,
            toStatus: "COMPLETED", //trạng thái sau
            byRole: "admin", //vai trò
            message: "Admin hoàn thành hướng dẫn (SV chưa hoàn thành thực tập)" //lời nhắn
          }
        });
      }

      // Lock student account
      await tx.user.update({ //cập nhật trạng thái tài khoản thành LOCKED
        where: { id: profile.userId }, //id tài khoản
        data: { isLocked: true } //cập nhật trạng thái tài khoản thành LOCKED
      });
    }
 
    await tx.internshipStatusHistory.create({ //tạo lịch sử trạng thái thực tập
      data: {
        studentProfileId: id, //id sinh viên
        fromStatus: prevStatus, //trạng thái trước đó
        toStatus: finalStatus, //trạng thái sau
        byRole: "admin", //vai trò  
        message:
          finalStatus === "COMPLETED"
            ? "Admin xác nhận hoàn thành thực tập"
            : "Admin xác nhận chưa hoàn thành thực tập – tài khoản bị tạm dừng"
      }
    });
  });

  // Send email notifications
  try {
    const appUrl = getPublicAppUrl(); //url hệ thống
    if (finalStatus === "COMPLETED") { //nếu trạng thái cuối cùng là COMPLETED
      if (svEmail) {
        await sendMail(
          svEmail, //email sinh viên
          `${MAIL_PHONG_DAO_TAO_SUBJECT_PREFIX} – Kết quả thực tập của bạn đã có`,
          `Kính gửi ${svFullName},\n\nKết quả thực tập của bạn đã được Admin xác nhận: Hoàn thành thực tập.\n\nVui lòng đăng nhập hệ thống để xem chi tiết kết quả.\nĐường dẫn hệ thống: ${appUrl}/sinhvien\n\n${MAIL_TRANSACTIONAL_SIGN_OFF}`
        );
      }
      if (gvEmail) {
        await sendMail(
          gvEmail,
          `${MAIL_PHONG_DAO_TAO_SUBJECT_PREFIX} – Hoàn thành hướng dẫn thực tập – Sinh viên ${svFullName}`,
          `Kính gửi ${gvFullName},\n\nAdmin đã xác nhận sinh viên ${svFullName} hoàn thành thực tập.\nPhân công hướng dẫn của bạn đối với sinh viên này đã được cập nhật thành "Hoàn thành hướng dẫn".\nĐường dẫn hệ thống: ${appUrl}/giangvien\n\n${MAIL_TRANSACTIONAL_SIGN_OFF}`
        );
      }
    } else {
      if (svEmail) {
        await sendMail(
          svEmail,
          `${MAIL_PHONG_DAO_TAO_SUBJECT_PREFIX} – Thông báo kết quả thực tập`,
          `Kính gửi ${svFullName},\n\nAdmin thông báo: Kết quả thực tập của bạn là Chưa hoàn thành thực tập.\n\nTài khoản của bạn hiện đã bị tạm dừng hoạt động. Vui lòng liên hệ với bộ phận quản lý để được hỗ trợ.\nĐường dẫn hệ thống: ${appUrl}/auth/dangnhap\n\n${MAIL_TRANSACTIONAL_SIGN_OFF}`
        );
      }
    }
  } catch {
    // Email failure must not block the main response
  }

  const msg =
    finalStatus === "COMPLETED"
      ? "Xác nhận hoàn thành thực tập thành công. Email đã gửi cho SV và GVHD."
      : "Xác nhận chưa hoàn thành thực tập. Tài khoản SV đã bị tạm dừng.";

  return NextResponse.json({ success: true, message: msg }); //trả về dữ liệu thành công
}

