import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth/jwt";
import { SESSION_COOKIE_NAME } from "@/lib/constants/auth/patterns";
import { prisma } from "@/lib/prisma";

async function getSupervisorProfileId() { //hàm lấy id giảng viên
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value; //lấy token từ cookie
  if (!token)
    return { error: NextResponse.json({ success: false, message: "Vui lòng đăng nhập." }, { status: 401 }) };
  try {
    const verified = await verifySession(token);
    if (verified.role !== "giangvien")
      return { error: NextResponse.json({ success: false, message: "Không có quyền truy cập." }, { status: 403 }) };
    const prismaAny = prisma as any;
    const sup = await prismaAny.supervisorProfile.findFirst({
      where: { userId: verified.sub },
      select: { id: true }
    });
    if (!sup)
      return { error: NextResponse.json({ success: false, message: "Không tìm thấy hồ sơ giảng viên." }, { status: 404 }) };
    return { supervisorProfileId: sup.id as string };
  } catch {
    return { error: NextResponse.json({ success: false, message: "Phiên đăng nhập không hợp lệ." }, { status: 401 }) };
  }
}

const INTERNSHIP_STATUS_ORDER = [ //danh sách trạng thái thực tập
  "NOT_STARTED", "DOING", "SELF_FINANCED", "REPORT_SUBMITTED", "COMPLETED", "REJECTED" //chưa thực tập, đang thực tập, thực tập tự túc, đã nộp báo cáo thực tập, hoàn thành thực tập, từ chối duyệt báo cáo thực tập
];
const INTERNSHIP_STATUS_LABELS: Record<string, string> = { //danh sách nhãn trạng thái thực tập
  NOT_STARTED: "Chưa thực tập", //chưa thực tập
  DOING: "Đang thực tập", //Đang thực tập
  SELF_FINANCED: "Thực tập tự túc", //Thực tập tự túc
  REPORT_SUBMITTED: "Đã nộp BCTT", //Đã nộp báo cáo thực tập
  COMPLETED: "Hoàn thành thực tập", //Hoàn thành thực tập
  REJECTED: "Từ chối" //Từ chối duyệt báo cáo thực tập
};

export async function GET(request: Request) { //hàm lấy dữ liệu cho dashboard
  const auth = await getSupervisorProfileId(); //lấy id giảng viên
  if ("error" in auth) return auth.error;
  const supervisorProfileId = auth.supervisorProfileId; //lấy id giảng viên
  const prismaAny = prisma as any;

  try {
    const { searchParams } = new URL(request.url);
    const batchIdParam = (searchParams.get("batchId") ?? "all").trim(); //lấy id batch

    // Batches this GV has assignments in
    const assignments: Array<{
      id: string;
      status: string;
      internshipBatchId: string;
      internshipBatch: { id: string; name: string; status: string };
      students: Array<{ studentProfileId: string }>;
    }> = await prismaAny.supervisorAssignment.findMany({
      where: { supervisorProfileId },
      select: {
        id: true,
        status: true,
        internshipBatchId: true,
        internshipBatch: { select: { id: true, name: true, status: true } },
        students: { select: { studentProfileId: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    // Distinct batches
    const batchMap = new Map<string, { id: string; name: string; status: string }>();
    for (const a of assignments) {
      if (!batchMap.has(a.internshipBatch.id)) {
        batchMap.set(a.internshipBatch.id, a.internshipBatch);
      }
    }
    const batches = Array.from(batchMap.values());

    // Determine chosen batch
    const chosenBatchId =
      batchIdParam !== "all" && batchMap.has(batchIdParam)
        ? batchIdParam
        : batches.find((b) => b.status === "OPEN")?.id ?? batches[0]?.id ?? null;

    const emptyPayload = { //trả về dữ liệu trống khi không có đợt thực tập được chọn thì render cho khỏi lỗi
      success: true,
      batches,
      selectedBatchId: chosenBatchId,
      guidanceStatus: {
        labels: ["Đang hướng dẫn", "Đã hoàn thành hướng dẫn"], //danh sách nhãn trạng thái hướng dẫn
        values: [0, 0]
      },
      internshipStatus: {
        labels: INTERNSHIP_STATUS_ORDER.map((s) => INTERNSHIP_STATUS_LABELS[s] ?? s),
        values: INTERNSHIP_STATUS_ORDER.map(() => 0)
      }
    };

    if (!chosenBatchId) return NextResponse.json(emptyPayload); //trả về dữ liệu trống khi không có đợt thực tập được chọn thì render cho khỏi lỗi

    // Assignments in chosen batch
    const batchAssignments = assignments.filter((a) => a.internshipBatchId === chosenBatchId);

    // Guidance status chart
    let guidingCount = 0;
    let completedCount = 0;
    const allStudentProfileIds = new Set<string>();

    for (const a of batchAssignments) {
      const count = a.students.length; //lấy số lượng sinh viên trong batch
      if (a.status === "GUIDING") guidingCount += count;
      else if (a.status === "COMPLETED") completedCount += count;
      for (const s of a.students) allStudentProfileIds.add(s.studentProfileId); //lấy id sinh viên trong batch
    }

    const guidanceStatus = {
      labels: ["Đang hướng dẫn", "Đã hoàn thành hướng dẫn"],
      values: [guidingCount, completedCount]
    };

    // Internship status chart (for assigned students)
    const studentProfileIdList = Array.from(allStudentProfileIds); //lấy danh sách id sinh viên trong batch
    const internshipStatusCounts: Record<string, number> = {};

    if (studentProfileIdList.length > 0) { //nếu có sinh viên trong batch thì lấy trạng thái thực tập của sinh viên
      const studentProfiles: Array<{ internshipStatus: string }> =
        await prismaAny.studentProfile.findMany({
          where: { id: { in: studentProfileIdList } },
          select: { internshipStatus: true }
        });
      for (const sp of studentProfiles) {
        internshipStatusCounts[sp.internshipStatus] =
          (internshipStatusCounts[sp.internshipStatus] ?? 0) + 1;
      }
    }

    const internshipStatus = { //lấy danh sách trạng thái thực tập của sinh viên trong batch
      labels: INTERNSHIP_STATUS_ORDER.map((s) => INTERNSHIP_STATUS_LABELS[s] ?? s),
      values: INTERNSHIP_STATUS_ORDER.map((s) => internshipStatusCounts[s] ?? 0)
    };
 
    return NextResponse.json({ //trả về dữ liệu cho dashboard
      success: true,
      batches,
      selectedBatchId: chosenBatchId,
      guidanceStatus,
      internshipStatus
    });
  } catch (e) {
    console.error("[GET /api/giangvien/dashboard/overview]", e);
    return NextResponse.json({ success: false, message: "Lỗi máy chủ." }, { status: 500 });
  }
}
