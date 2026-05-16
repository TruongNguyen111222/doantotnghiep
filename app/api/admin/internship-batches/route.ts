import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth/admin-session";

type InternshipBatchStatus = "OPEN" | "CLOSED"; //trạng thái đợt thực tập
type Semester = "HK_I" | "HK_II" | "HK_HE" | "HK_PHU"; //học kỳ

function getTodayStart() { //hàm lấy ngày hiện tại
  const d = new Date(); //tạo ngày hiện tại
  d.setHours(0, 0, 0, 0);
  return d; //trả về ngày hiện tại
}

function parseDateOnly(input: string | null | undefined) { //hàm phân tích ngày tháng năm
  if (!input) return null; //nếu không có ngày tháng năm thì trả về null
  const trimmed = String(input).trim(); //loại bỏ khoảng trắng và chuyển thành chuỗi
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null; //nếu không phải là ngày tháng năm thì trả về null
  const start = new Date(`${trimmed}T00:00:00.000Z`); //tạo ngày tháng năm bắt đầu
  const end = new Date(`${trimmed}T23:59:59.999Z`); //tạo ngày tháng năm kết thúc
  return { start, end, asStart: start }; //trả về ngày tháng năm bắt đầu và kết thúc
}

export async function GET(request: Request) { //hàm lấy dữ liệu đợt thực tập
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ message: "Không có quyền truy cập." }, { status: 403 }); //nếu không có quyền truy cập thì trả về lỗi

  try {
    const { searchParams } = new URL(request.url); //lấy searchParams từ request
    const q = searchParams.get("q")?.trim() || ""; //lấy q từ searchParams
    const startDateStr = searchParams.get("startDate") || ""; //lấy startDateStr từ searchParams
    const endDateStr = searchParams.get("endDate") || ""; //lấy endDateStr từ searchParams
    const status = (searchParams.get("status") || "all").trim() as InternshipBatchStatus | "all";

    const today = getTodayStart(); //lấy ngày hiện tại

    // Auto-close quá hạn. //tự động đóng đợt thực tập quá hạn
    try {
      await (prisma as any).internshipBatch.updateMany({ //cập nhật đợt thực tập quá hạn
        where: { endDate: { lt: today }, status: "OPEN" }, //cập nhật đợt thực tập quá hạn
        data: { status: "CLOSED" } //cập nhật trạng thái đợt thực tập quá hạn
      });
    } catch (e) {
      console.error("[GET /api/admin/internship-batches] auto-close error", e); //log lỗi
    }

    const dateStart = parseDateOnly(startDateStr); //lấy ngày bắt đầu từ startDateStr
    const dateEnd = parseDateOnly(endDateStr); //lấy ngày kết thúc từ endDateStr

    const where: any = {}; //tạo where
    if (q && q.length >= 2) where.name = { contains: q, mode: "insensitive" }; //nếu q có giá trị và có ít nhất 2 ký tự thì thêm vào where
    if (status !== "all") where.status = status; //nếu status không phải là all thì thêm vào where
    if (dateStart) where.startDate = { gte: dateStart.start, lte: dateStart.end }; //nếu dateStart có giá trị thì thêm vào where
    if (dateEnd) where.endDate = { gte: dateEnd.start, lte: dateEnd.end }; //nếu dateEnd có giá trị thì thêm vào where

    const prismaAny = prisma as any; //tạo prismaAny
//tạo thẻ thống kê ở đầu trang 
    const [rows, openCount, closedCount] = await Promise.all([ //tạo rows, openCount, closedCount
      prismaAny.internshipBatch.findMany({ //tìm đợt thực tập
        where, //where
        orderBy: { createdAt: "desc" }, //orderBy
        select: {
          id: true, //id
          name: true, //tên
          semester: true,
          schoolYear: true, //năm học
          startDate: true,
          endDate: true, //ngày kết thúc
          status: true, //trạng thái
          notes: true //ghi chú
        }
      }),
      prismaAny.internshipBatch.count({ where: { status: "OPEN" } }), //đếm số lượng đợt thực tập mở
      prismaAny.internshipBatch.count({ where: { status: "CLOSED" } }) //đếm số lượng đợt thực tập đóng
    ]);

    return NextResponse.json({ //trả về dữ liệu đợt thực tập
      success: true,
      batchStatusStats: { open: openCount ?? 0, closed: closedCount ?? 0 }, //trạng thái đợt thực tập
      items: rows.map((r: any) => ({ //map rows
        ...r, //map r
        startDate: r.startDate?.toISOString?.() ?? null, //ngày bắt đầu
        endDate: r.endDate?.toISOString?.() ?? null //ngày kết thúc
      }))
    });
  } catch (e) {
    console.error("[GET /api/admin/internship-batches]", e); //log lỗi
    return NextResponse.json({ success: false, message: "Lỗi máy chủ." }, { status: 500 }); 
  }
}

export async function POST(request: Request) { //hàm tạo đợt thực tập
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ message: "Không có quyền truy cập." }, { status: 403 }); //nếu không có quyền truy cập thì trả về lỗi

  const body = (await request.json()) as { //lấy body từ request
    name?: string; //tên
    semester?: Semester; //học kỳ
    schoolYear?: string; //năm học
    startDate?: string; // YYYY-MM-DD
    endDate?: string; // YYYY-MM-DD
    notes?: string; //ghi chú
  };

  const name = (body.name || "").trim(); //tên
  const semester = body.semester; //học kỳ
  const schoolYear = (body.schoolYear || "").trim(); //năm học
  const notes = (body.notes || "").trim(); //ghi chú

  const today = getTodayStart(); //ngày hiện tại
  const startDateStr = (body.startDate || today.toISOString().slice(0, 10)).trim(); //ngày bắt đầu
  const endDateStr = (body.endDate || "").trim(); //ngày kết thúc

  const startParsed = parseDateOnly(startDateStr); //ngày bắt đầu parse
  const endParsed = parseDateOnly(endDateStr); //ngày kết thúc parse

  const errors: Record<string, string> = {};
  if (!name || name.length < 1 || name.length > 255) errors.name = "Tên đợt thực tập từ 1–255 ký tự.";
  if (!semester || !["HK_I", "HK_II", "HK_HE", "HK_PHU"].includes(String(semester))) errors.semester = "Học kỳ không hợp lệ.";
  if (!/^\d{4}-\d{4}$/.test(schoolYear) || schoolYear.length < 8 || schoolYear.length > 15)
    errors.schoolYear = "Năm học chỉ cho phép số, dấu '-' (ví dụ 2024-2025).";
  if (!startParsed) errors.startDate = "Thời gian bắt đầu không hợp lệ (YYYY-MM-DD).";
  if (!endParsed) errors.endDate = "Thời gian kết thúc không hợp lệ (YYYY-MM-DD).";
  if (startParsed && endParsed) {
    if (endParsed.asStart.getTime() <= startParsed.asStart.getTime()) errors.endDate = "Thời gian kết thúc phải > thời gian bắt đầu.";
    if (endParsed.asStart.getTime() <= today.getTime()) errors.endDate = "Thời gian kết thúc phải > ngày hiện tại.";
  }

  if (Object.keys(errors).length) { //nếu có lỗi thì trả về lỗi
    return NextResponse.json({ success: false, errors }, { status: 400 }); //trả về lỗi
  }

  const startDate = startParsed!.asStart; //ngày bắt đầu
  const endDate = endParsed!.asStart; //ngày kết thúc

  // Trùng kỳ-năm hoặc trùng start-end. //trùng kỳ-năm hoặc trùng ngày bắt đầu-kết thúc
  const existsSemester = await (prisma as any).internshipBatch.findFirst({ //tìm đợt thực tập theo học kỳ và năm học
    where: { semester, schoolYear } //không tìm đợt thực tập cùng học kỳ và năm học
  });
  if (existsSemester) { //nếu tìm thấy đợt thực tập cùng học kỳ và năm học thì trả về lỗi
    return NextResponse.json({ success: false, message: "Thông tin đợt thực tập đã tồn tại (trùng kỳ-năm)." }, { status: 409 });
  }
  const existsDates = await (prisma as any).internshipBatch.findFirst({ //tìm đợt thực tập theo ngày bắt đầu và kết thúc
    where: { startDate, endDate } //không tìm đợt thực tập cùng ngày bắt đầu và kết thúc
  });
  if (existsDates) { //nếu tìm thấy đợt thực tập cùng ngày bắt đầu và kết thúc thì trả về lỗi
    return NextResponse.json({ success: false, message: "Thông tin đợt thực tập đã tồn tại (trùng ngày bắt đầu-kết thúc)." }, { status: 409 });
  }

  await (prisma as any).internshipBatch.create({ //tạo đợt thực tập
    data: {
      name,
      semester,
      schoolYear,
      startDate,
      endDate,
      notes,
      status: "OPEN"
    }
  });

  return NextResponse.json({ success: true, message: "Tạo đợt thực tập thành công." }); //trả về dữ liệu đợt thực tập
}

