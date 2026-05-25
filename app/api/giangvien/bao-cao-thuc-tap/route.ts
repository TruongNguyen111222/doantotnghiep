import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  fetchGiangVienBaoCaoListItems,
  resolveGiangVienSupervisorProfileId
} from "@/lib/server/giangvien-bao-cao-thuc-tap-list";

const prismaAny = prisma as any;

type InternshipStatus =
  | "NOT_STARTED"
  | "DOING"
  | "SELF_FINANCED"
  | "REPORT_SUBMITTED"
  | "COMPLETED"
  | "REJECTED";

type ReportReviewStatus = "PENDING" | "REJECTED" | "APPROVED";

export async function GET(request: Request) { //hàm lấy dữ liệu báo cáo thực tập
  const giangVien = await resolveGiangVienSupervisorProfileId(); //hàm lấy id giảng viên
  if (!giangVien.ok) return giangVien.response;
  const supervisorProfileId = giangVien.supervisorProfileId; //hàm lấy id giảng viên

  const latestAssignment = await prismaAny.supervisorAssignment.findFirst({ //hàm lấy đợt thực tập mới nhất
    where: { supervisorProfileId },
    orderBy: { internshipBatch: { startDate: "desc" } },
    select: {
      internshipBatchId: true,
      internshipBatch: { select: { name: true, startDate: true } }
    }
  });

  let latestBatchInternshipStats: { //hàm xử lý thống kê đợt thực tập
    batchId: string | null;
    batchName: string | null;
    totalAssigned: number;
    notStarted: number;
    doing: number;
    selfFinanced: number;
    reportSubmitted: number;
    reportRejected: number;
    reportApproved: number;
    internshipCompleted: number;
    reportNotCompleted: number;
  } = {
    batchId: null,
    batchName: null,
    totalAssigned: 0,
    notStarted: 0,
    doing: 0,
    selfFinanced: 0,
    reportSubmitted: 0,
    reportRejected: 0,
    reportApproved: 0,
    internshipCompleted: 0,
    reportNotCompleted: 0
  };

  if (latestAssignment?.internshipBatchId) {
    const bid = String(latestAssignment.internshipBatchId);
    const batchName = latestAssignment.internshipBatch?.name ?? null;

    const latestLinks: Array<{
      studentProfile: { internshipStatus: InternshipStatus; internshipReport: { reviewStatus: ReportReviewStatus } | null };
    }> = await prismaAny.supervisorAssignmentStudent.findMany({ //hàm lấy danh sách sinh viên được phân công từ database
      where: {
        supervisorAssignment: { supervisorProfileId, internshipBatchId: bid }
      },
      select: {
        studentProfile: {
          select: {
            internshipStatus: true,
            internshipReport: { select: { reviewStatus: true } }
          }
        }
      }
    });

    let notStarted = 0;
    let doing = 0;
    let selfFinanced = 0;
    let reportSubmitted = 0;
    let reportRejected = 0;
    let reportApproved = 0;
    let internshipCompleted = 0;

    for (const x of latestLinks) {
      const s = x.studentProfile?.internshipStatus as InternshipStatus;
      const review = x.studentProfile?.internshipReport?.reviewStatus as ReportReviewStatus | undefined;

      if (s === "NOT_STARTED") notStarted++;
      else if (s === "DOING") doing++;
      else if (s === "SELF_FINANCED") selfFinanced++;
      else if (s === "COMPLETED") internshipCompleted++;

      if (s === "REPORT_SUBMITTED") {
        if (review === "APPROVED") reportApproved++;
        else if (review === "REJECTED") reportRejected++;
        else reportSubmitted++;
      } else if (s === "REJECTED") {
        reportRejected++;
      }
    }

    const totalAssigned = latestLinks.length;
    const reportNotCompleted = Math.max(0, totalAssigned - reportApproved); //hàm xử lý số lượng sinh viên chưa nộp báo cáo thực tập

    latestBatchInternshipStats = { //hàm xử lý thống kê đợt thực tập
      batchId: bid,
      batchName,
      totalAssigned,
      notStarted,
      doing,
      selfFinanced,
      reportSubmitted,
      reportRejected,
      reportApproved,
      internshipCompleted,
      reportNotCompleted
    };
  }

  const { searchParams } = new URL(request.url); 
  const items = await fetchGiangVienBaoCaoListItems(supervisorProfileId, searchParams);

  return NextResponse.json({ success: true, items, latestBatchInternshipStats }); //trả về dữ liệu báo cáo thực tập
}
