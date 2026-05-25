import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth/admin-session";
import { MAIL_PHONG_DAO_TAO_SUBJECT_PREFIX, MAIL_TRANSACTIONAL_SIGN_OFF } from "@/lib/constants/school";
import { sendMail } from "@/lib/mail";
import { getPublicAppUrl } from "@/lib/mail-enterprise";

type AssignmentStatus = "GUIDING" | "COMPLETED";

function normalizeQ(s: string) {
  return s.trim();
}

export async function GET(request: Request) { //hàm lấy danh sách phân công giảng viên hướng dẫn
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ message: "Không có quyền truy cập." }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const q = normalizeQ(searchParams.get("q") || ""); //từ khóa tìm kiếm
  const faculty = (searchParams.get("faculty") || "all").trim(); //khoa tìm kiếm
  const status = (searchParams.get("status") || "all").trim() as AssignmentStatus | "all"; //trạng thái tìm kiếm

  const prismaAny = prisma as any;
  const where: any = {}; //điều kiện tìm kiếm
  const andParts: any[] = []; //điều kiện tìm kiếm

  if (faculty !== "all") andParts.push({ faculty });
  if (status !== "all") andParts.push({ status });

  if (q) {
    andParts.push({ //điều kiện tìm kiếm
      OR: [
        ...(q.length >= 2 ? [{ supervisorProfile: { user: { fullName: { contains: q, mode: "insensitive" } } } }] : []),
        { students: { some: { studentProfile: { msv: { startsWith: q } } } } },
        ...(q.length >= 2 ? [{ students: { some: { studentProfile: { user: { fullName: { contains: q, mode: "insensitive" } } } } } }] : [])
      ]
    });
  }

  if (andParts.length) where.AND = andParts; //nếu có điều kiện tìm kiếm thì thêm điều kiện tìm kiếm

  const rows = await prismaAny.supervisorAssignmentStudent.findMany({ //lấy danh sách phân công giảng viên hướng dẫn
    where: {
      supervisorAssignment: where //điều kiện tìm kiếm
    },
    orderBy: { createdAt: "desc" }, //sắp xếp theo thời gian tạo giảm dần
    select: {
      id: true,
      supervisorAssignmentId: true, //id phân công giảng viên hướng dẫn   
      supervisorAssignment: {
        select: {
          faculty: true,
          status: true,
          internshipBatch: { select: { id: true, name: true, semester: true, schoolYear: true, status: true } },
          supervisorProfile: {
            select: { id: true, degree: true, user: { select: { fullName: true } } }
          }
        }
      },
      studentProfile: { //sinh viên
        select: { id: true, msv: true, degree: true, user: { select: { fullName: true } } }
      }
    }
  });

  let faculties: string[] = []; //danh sách khoa
  try {
    const fRows = await prismaAny.supervisorProfile.findMany({ distinct: ["faculty"], select: { faculty: true } }); //lấy danh sách khoa
    faculties = fRows.map((r: any) => String(r.faculty)).filter(Boolean).sort((a: string, b: string) => a.localeCompare(b, "vi"));
  } catch {
    faculties = [];
  }

  return NextResponse.json({
    success: true, //thành công
    faculties, //danh sách khoa
    items: rows.map((r: any) => ({
      id: r.id, //id phân công giảng viên hướng dẫn
      supervisorAssignmentId: r.supervisorAssignmentId, //id phân công giảng viên hướng dẫn
      faculty: r.supervisorAssignment?.faculty ?? "", //khoa
      status: (r.supervisorAssignment?.status ?? "GUIDING") as AssignmentStatus, //trạng thái phân công giảng viên hướng dẫn
      batch: { //đợt thực tập
        id: r.supervisorAssignment?.internshipBatch?.id ?? null,
        name: r.supervisorAssignment?.internshipBatch?.name ?? null, //tên đợt thực tập
        semester: r.supervisorAssignment?.internshipBatch?.semester ?? null, //học kỳ
        schoolYear: r.supervisorAssignment?.internshipBatch?.schoolYear ?? null, //năm học
        status: r.supervisorAssignment?.internshipBatch?.status ?? null //trạng thái đợt thực tập
      },
      supervisor: { //giảng viên hướng dẫn        
        id: r.supervisorAssignment?.supervisorProfile?.id ?? null,
        fullName: r.supervisorAssignment?.supervisorProfile?.user?.fullName ?? "",
        degree: r.supervisorAssignment?.supervisorProfile?.degree ?? null
      },
      student: {
        id: r.studentProfile?.id ?? null,
        msv: r.studentProfile?.msv ?? "",
        fullName: r.studentProfile?.user?.fullName ?? "",
        degree: r.studentProfile?.degree ?? null
      }
    }))
  });
} //trả về danh sách phân công giảng viên hướng dẫn

type CreateBody = {
  faculty: string;
  internshipBatchId: string;
  supervisorProfileId: string;
  studentProfileIds: string[];
};

export async function POST(request: Request) { //hàm thêm phân công giảng viên hướng dẫn
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ message: "Không có quyền truy cập." }, { status: 403 });

  const body = (await request.json()) as CreateBody;
  const faculty = (body.faculty || "").trim();
  const internshipBatchId = (body.internshipBatchId || "").trim();
  const supervisorProfileId = (body.supervisorProfileId || "").trim();
  const studentProfileIds = Array.isArray(body.studentProfileIds) ? body.studentProfileIds.filter(Boolean) : [];

  const errors: Record<string, string> = {};
  if (!faculty) errors.faculty = "Khoa bắt buộc.";
  if (!internshipBatchId) errors.internshipBatchId = "Đợt thực tập bắt buộc.";
  if (!supervisorProfileId) errors.supervisorProfileId = "Giảng viên hướng dẫn bắt buộc.";
  if (!studentProfileIds.length) errors.studentProfileIds = "Danh sách sinh viên hướng dẫn bắt buộc.";
  if (Object.keys(errors).length) return NextResponse.json({ success: false, errors }, { status: 400 });

  const prismaAny = prisma as any;

  const batch = await prismaAny.internshipBatch.findUnique({ where: { id: internshipBatchId }, select: { id: true, status: true } });
  if (!batch || batch.status !== "OPEN") { //nếu đợt thực tập không hợp lệ hoặc không ở trạng thái đang mở thì trả về lỗi
    return NextResponse.json({ success: false, message: "Đợt thực tập không hợp lệ hoặc không ở trạng thái đang mở." }, { status: 400 });
  }

  const supervisor = await prismaAny.supervisorProfile.findUnique({ //lấy giảng viên hướng dẫn
    where: { id: supervisorProfileId },
    select: {
      id: true,
      faculty: true,
      degree: true,
      user: { select: { fullName: true, email: true, phone: true } }
    }
  }); 
  if (!supervisor || supervisor.faculty !== faculty) { //nếu giảng viên hướng dẫn không hợp lệ hoặc không thuộc khoa đã chọn thì trả về lỗi
    return NextResponse.json({ success: false, message: "Giảng viên hướng dẫn không hợp lệ hoặc không thuộc khoa đã chọn." }, { status: 400 });
  }

  const existingSupervisorInBatch = await prismaAny.supervisorAssignment.findFirst({ //lấy giảng viên hướng dẫn đã phân công trong đợt thực tập
    where: { internshipBatchId, supervisorProfileId },
    select: { id: true }
  });
  if (existingSupervisorInBatch) { //nếu giảng viên hướng dẫn đã phân công trong đợt thực tập này thì trả về lỗi
    return NextResponse.json({ success: false, message: "Giảng viên hướng dẫn đã được phân công trong đợt thực tập này." }, { status: 400 });
  }

  const students = await prismaAny.studentProfile.findMany({ //lấy danh sách sinh viên
    where: { id: { in: studentProfileIds } },
    select: {
      id: true,
      faculty: true,
      msv: true,
      className: true,
      degree: true,
      internshipStatus: true,
      user: { select: { fullName: true, email: true } }
    }
  });
  if (students.length !== studentProfileIds.length) { //nếu danh sách sinh viên không hợp lệ thì trả về lỗi
    return NextResponse.json({ success: false, message: "Danh sách sinh viên không hợp lệ." }, { status: 400 });
  }
  for (const s of students) {
    if (s.faculty !== faculty) { //nếu sinh viên không thuộc khoa đã chọn thì trả về lỗi
      return NextResponse.json({ success: false, message: "Có sinh viên không thuộc khoa đã chọn." }, { status: 400 });
    }
    if (
      s.internshipStatus !== "NOT_STARTED" &&
      s.internshipStatus !== "DOING" &&
      s.internshipStatus !== "REPORT_SUBMITTED"
    ) {
      return NextResponse.json( //nếu sinh viên không có trạng thái Chưa thực tập, Đang thực tập hoặc Đã nộp BCTT thì trả về lỗi
        { success: false, message: "Chỉ được chọn sinh viên có trạng thái Chưa thực tập, Đang thực tập hoặc Đã nộp BCTT." },
        { status: 400 }
      );
    }
  }

  const existingStudentLinks = await prismaAny.supervisorAssignmentStudent.findMany({ //lấy danh sách sinh viên đã phân công giảng viên hướng dẫn trong đợt thực tập
    where: { studentProfileId: { in: studentProfileIds }, supervisorAssignment: { internshipBatchId } },
    select: { studentProfileId: true }
  });
  if (existingStudentLinks.length) {
    return NextResponse.json({ success: false, message: "Có sinh viên đã được phân công GVHD trong đợt thực tập đã chọn." }, { status: 400 });
  }

  const batchDetails = await prismaAny.internshipBatch.findUnique({ //lấy thông tin đợt thực tập
    where: { id: internshipBatchId },
    select: { name: true, semester: true, schoolYear: true }
  });

  await prismaAny.$transaction( //thực hiện transaction
    async (tx: any) => {
      const assignment = await tx.supervisorAssignment.create({ //tạo phân công giảng viên hướng dẫn
        data: {
          faculty,
          status: "GUIDING",
          internshipBatchId,
          supervisorProfileId
        },
        select: { id: true }
      });

      await tx.supervisorAssignmentStatusHistory.create({ //tạo lịch sử trạng thái phân công giảng viên hướng dẫn
        data: {
          supervisorAssignmentId: assignment.id,
          fromStatus: "GUIDING",
          toStatus: "GUIDING",
          byRole: "admin",
          message: "Khởi tạo phân công GVHD"
        }
      });

      for (const sid of studentProfileIds) { //tạo phân công sinh viên cho giảng viên hướng dẫn
        await tx.supervisorAssignmentStudent.create({
          data: { supervisorAssignmentId: assignment.id, studentProfileId: sid }
        });
      }
    },
    { timeout: 30_000 }
  );

  // Send email notifications
  try {
    const appUrl = getPublicAppUrl(); //lấy url của hệ thống
    const supervisorDegreeLabelMap: Record<string, string> = { //map bậc giảng viên hướng dẫn
      MASTER: "Thạc sĩ",
      PHD: "Tiến sĩ",
      ASSOC_PROF: "Phó giáo sư",
      PROF: "Giáo sư"
    }; 
    const degreeLabelMap: Record<string, string> = { BACHELOR: "Cử nhân", ENGINEER: "Kỹ sư" }; //map bậc sinh viên
    const batchLabel = batchDetails
      ? `${batchDetails.name} (${batchDetails.semester} – ${batchDetails.schoolYear})`
      : "đợt thực tập"; //tên đợt thực tập

    const gvFullName: string = supervisor.user?.fullName ?? "Giảng viên"; //tên giảng viên hướng dẫn
    const gvEmail: string | null = supervisor.user?.email ?? null;
    const gvDegree: string = supervisorDegreeLabelMap[supervisor.degree] ?? supervisor.degree ?? "";
    const gvPhone: string = supervisor.user?.phone ?? "—"; //số điện thoại giảng viên hướng dẫn
    const facultyLabel = faculty ? `\n  Ngành/Khoa: ${faculty}` : "";

    if (gvEmail) { //nếu email giảng viên hướng dẫn không rỗng thì gửi email thông báo
      const svListLines = students //danh sách sinh viên
        .map(
          (s: any, i: number) =>
            `${i + 1}. ${s.msv} – ${s.user?.fullName ?? ""} – ${degreeLabelMap[s.degree] ?? s.degree ?? ""} – Lớp: ${s.className ?? "—"}`
        )
        .join("\n");

      await sendMail( //gửi email thông báo
        gvEmail,
        `${MAIL_PHONG_DAO_TAO_SUBJECT_PREFIX} – Phân công hướng dẫn thực tập – ${batchLabel}`,
        `Kính gửi ${gvDegree} ${gvFullName},\n\nBạn đã được phân công hướng dẫn thực tập cho ${students.length} sinh viên trong ${batchLabel}.${facultyLabel}\n\nDanh sách sinh viên hướng dẫn:\n${svListLines}\n\nVui lòng đăng nhập hệ thống để xem thông tin chi tiết và theo dõi tiến độ thực tập của sinh viên.\nTruy cập hệ thống để xem thông tin chi tiết: ${appUrl}/giangvien\n\n${MAIL_TRANSACTIONAL_SIGN_OFF}`
      );
    }

    for (const s of students as any[]) { //gửi email thông báo cho sinh viên
      const svEmail: string | null = s.user?.email ?? null;
      const svFullName: string = s.user?.fullName ?? "Sinh viên"; //tên sinh viên
      if (!svEmail) continue; //nếu email sinh viên không rỗng thì gửi email thông báo

      await sendMail( //gửi email thông báo
        svEmail,
        `${MAIL_PHONG_DAO_TAO_SUBJECT_PREFIX} – Thông tin Giảng viên hướng dẫn thực tập – ${batchLabel}`, //tiêu đề email
        `Kính gửi ${svFullName},\n\nBạn đã được phân công Giảng viên hướng dẫn cho ${batchLabel}.${facultyLabel}\n\nThông tin giảng viên hướng dẫn:\n  Họ tên: ${gvDegree} ${gvFullName}\n  Email: ${gvEmail ?? "—"}\n  Số điện thoại: ${gvPhone}\n\nVui lòng liên hệ giảng viên hướng dẫn để được hướng dẫn trong quá trình thực tập.\nTruy cập hệ thống để xem thông tin chi tiết: ${appUrl}/sinhvien\n\n${MAIL_TRANSACTIONAL_SIGN_OFF}`
      );
    }
  } catch { //nếu lỗi thì không làm gì
  }

  return NextResponse.json({ success: true, message: "Tạo phân công thành công." }); //trả về thành công
}

