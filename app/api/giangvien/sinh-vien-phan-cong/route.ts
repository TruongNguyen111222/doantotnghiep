import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth/jwt";
import { SESSION_COOKIE_NAME } from "@/lib/constants/auth/patterns";
import { prisma } from "@/lib/prisma";

type GuidanceStatus = "GUIDING" | "COMPLETED"; //hàm xử lý trạng thái hướng dẫn

async function getGiangVienProfileId() { //hàm lấy id giảng viên
  const cookieStore = await cookies(); //lấy cookie store
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value; //lấy token từ cookie
  if (!token) return { error: NextResponse.json({ success: false, message: "Vui lòng đăng nhập." }, { status: 401 }) };
  try { //lấy id giảng viên từ database
    const verified = await verifySession(token);
    if (verified.role !== "giangvien") return { error: NextResponse.json({ success: false, message: "Không có quyền truy cập." }, { status: 403 }) };
    const prismaAny = prisma as any;
    const sup = await prismaAny.supervisorProfile.findFirst({ where: { userId: verified.sub }, select: { id: true } });
    if (!sup) return { error: NextResponse.json({ success: false, message: "Không tìm thấy hồ sơ giảng viên." }, { status: 404 }) };
    return { supervisorProfileId: sup.id };
  } catch {
    return { error: NextResponse.json({ success: false, message: "Phiên đăng nhập không hợp lệ." }, { status: 401 }) };
  }
}

export async function GET(request: Request) { //hàm lấy dữ liệu sinh viên
  const giangVien = await getGiangVienProfileId(); //lấy id giảng viên từ database
  if ("error" in giangVien) return giangVien.error;
  const supervisorProfileId = giangVien.supervisorProfileId as string;

  const { searchParams } = new URL(request.url); 
  const q = (searchParams.get("q") || "").trim();
  const internshipBatchId = (searchParams.get("batchId") || "").trim();
  const guidanceStatus = (searchParams.get("status") || "all").trim();

  const prismaAny = prisma as any;

  const batchIdsRows = await prismaAny.supervisorAssignment.findMany({ //lấy danh sách id đợt thực tập từ database
    where: { supervisorProfileId },
    distinct: ["internshipBatchId"],
    select: { internshipBatchId: true }
  });
  const batchIds = batchIdsRows.map((r: any) => r.internshipBatchId).filter(Boolean); //lấy danh sách id đợt thực tập từ database

  const batchOptionsRows = batchIds.length
    ? await prismaAny.internshipBatch.findMany({ //lấy danh sách đợt thực tập từ database
        where: { id: { in: batchIds } },
        select: { id: true, name: true, startDate: true },
        orderBy: { startDate: "desc" }
      })
    : [];

  const batchOptions = batchOptionsRows.map((r: any) => ({ id: String(r.id), name: r.name }));

  // Đợt mới nhất (theo ngày bắt đầu) mà GV có phân công
  const latestBatchRow = batchOptionsRows[0] ?? null; //lấy đợt thực tập mới nhất từ database
  let latestBatchGuidanceStats: { //hàm xử lý thống kê đợt thực tập
    batchId: string | null; //id đợt thực tập
    batchName: string | null; //tên đợt thực tập
    guiding: number; //số lượng đang hướng dẫn
    completed: number; //số lượng hoàn thành
  } = { batchId: null, batchName: null, guiding: 0, completed: 0 }; //hàm xử lý thống kê đợt thực tập mặc định

  if (latestBatchRow) { //nếu có đợt thực tập mới nhất
    const bid = String(latestBatchRow.id);
    const [guiding, completed] = await Promise.all([
      prismaAny.supervisorAssignmentStudent.count({ //lấy số lượng sinh viên đang hướng dẫn từ database
        where: {
          supervisorAssignment: {
            supervisorProfileId,
            internshipBatchId: bid,
            status: "GUIDING"
          }
        }
      }),
      prismaAny.supervisorAssignmentStudent.count({ //lấy số lượng sinh viên hoàn thành hướng dẫn từ database
        where: {
          supervisorAssignment: {
            supervisorProfileId,
            internshipBatchId: bid,
            status: "COMPLETED"
          }
        }
      })
    ]);
    latestBatchGuidanceStats = { //set dữ liệu thống kê đợt thực tập vào latestBatchGuidanceStats
      batchId: bid,
      batchName: latestBatchRow.name ?? null,
      guiding,
      completed
    };
  }

  const where: any = { //hàm xử lý điều kiện lấy dữ liệu sinh viên
    supervisorAssignment: {
      supervisorProfileId
    }
  };
  if (internshipBatchId) where.supervisorAssignment.internshipBatchId = internshipBatchId;
  if (guidanceStatus !== "all") where.supervisorAssignment.status = guidanceStatus as GuidanceStatus;

  if (q) {
    where.studentProfile = { //điều kiện tìm kiếm sinh viên
      OR: [
        { msv: { startsWith: q } },
        ...(q.length >= 2 ? [{ user: { fullName: { contains: q, mode: "insensitive" } } }] : [])
      ]
    };
  }

  const links = await prismaAny.supervisorAssignmentStudent.findMany({ //lấy danh sách sinh viên được phân công từ database
    where,
    orderBy: { createdAt: "desc" },
    select: {
      studentProfile: {
        select: {
          id: true,
          msv: true,
          className: true,
          faculty: true,
          cohort: true,
          degree: true,
          gender: true,
          birthDate: true,
          permanentProvinceName: true,
          permanentWardName: true,
          internshipStatus: true,
          user: { select: { fullName: true, phone: true, email: true } },
          internshipStatusHistory: {
            orderBy: { at: "desc" },
            select: { fromStatus: true, toStatus: true, at: true }
          },
          internshipReport: {
            select: {
              id: true,
              reportFileName: true,
              reviewStatus: true,
              supervisorEvaluation: true,
              supervisorPoint: true,
              enterpriseEvaluation: true,
              enterprisePoint: true
            }
          }
        }
      },
      supervisorAssignment: { //lấy trạng thái hướng dẫn từ database
        select: {
          status: true,
          statusHistory: { //lấy lịch sử trạng thái hướng dẫn từ database
            orderBy: { at: "desc" },
            select: { fromStatus: true, toStatus: true, at: true }
          }
        }
      }
    }
  });

  const guidanceStatusLabel: Record<GuidanceStatus, string> = { GUIDING: "Đang hướng dẫn", COMPLETED: "Hoàn thành hướng dẫn" };

  const items = links.map((x: any, idx: number) => { //lấy danh sách sinh viên được phân công từ database
    const sp = x.studentProfile;
    const assignment = x.supervisorAssignment;
    const r = sp.internshipReport; //lấy báo cáo thực tập từ database
    return { //hàm xử lý dữ liệu sinh viên
      id: sp.id,
      stt: idx + 1,
      msv: sp.msv,
      fullName: sp.user?.fullName ?? "",
      className: sp.className,
      faculty: sp.faculty,
      cohort: sp.cohort,
      degree: sp.degree,
      guidanceStatus: assignment?.status as GuidanceStatus,
      guidanceStatusLabel: guidanceStatusLabel[assignment?.status as GuidanceStatus] ?? String(assignment?.status ?? ""),
      phone: sp.user?.phone ?? null,
      email: sp.user?.email ?? "",
      birthDate: sp.birthDate?.toISOString?.() ?? null,
      gender: sp.gender,
      permanentAddress: [sp.permanentProvinceName, sp.permanentWardName].filter(Boolean).join(" - ") || "—",
      internshipStatus: sp.internshipStatus,
      internshipStatusHistory: (sp.internshipStatusHistory || []).map((h: any) => ({
        fromStatus: h.fromStatus,
        toStatus: h.toStatus,
        at: h.at?.toISOString?.() ?? null
      })),
      guidanceStatusHistory: (assignment?.statusHistory || []).map((h: any) => ({
        fromStatus: h.fromStatus,
        toStatus: h.toStatus,
        at: h.at?.toISOString?.() ?? null
      })),
      report: r
        ? {
            id: r.id,
            reportFileName: r.reportFileName, //tên file báo cáo thực tập
            reportUrl: `/api/files/internship-report/${r.id}`, //url báo cáo thực tập
            reviewStatus: r.reviewStatus, //trạng thái review báo cáo thực tập
            supervisorEvaluation: r.supervisorEvaluation ?? null,
            supervisorPoint: r.supervisorPoint ?? null,
            enterpriseEvaluation: r.enterpriseEvaluation ?? null,
            enterprisePoint: r.enterprisePoint ?? null
          }
        : null
    };
  });

  return NextResponse.json({ //trả về dữ liệu sinh viên
    success: true,
    items,
    batches: batchOptions,
    latestBatchGuidanceStats
  });
}
