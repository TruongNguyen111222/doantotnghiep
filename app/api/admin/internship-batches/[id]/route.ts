import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth/admin-session";

type InternshipBatchStatus = "OPEN" | "CLOSED"; //trạng thái đợt thực tập
type Semester = "HK_I" | "HK_II" | "HK_HE" | "HK_PHU"; //học kỳ

function getTodayStart() { //hàm lấy ngày hiện tại
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function parseDateOnly(input: string | null | undefined) { //hàm phân tích ngày tháng năm
  if (!input) return null; //nếu không có ngày tháng năm thì trả về null 
  const trimmed = String(input).trim(); //loại bỏ khoảng trắng và chuyển thành chuỗi
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null; //nếu không phải là ngày tháng năm thì trả về null
  const asStart = new Date(`${trimmed}T00:00:00.000Z`); //tạo ngày tháng năm bắt đầu
  const end = new Date(`${trimmed}T23:59:59.999Z`); //tạo ngày tháng năm kết thúc
  return { asStart, start: asStart, end }; //trả về ngày tháng năm bắt đầu và kết thúc
}

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) { //hàm lấy dữ liệu đợt thực tập theo id
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ message: "Không có quyền truy cập." }, { status: 403 }); //nếu không có quyền truy cập thì trả về lỗi

  const { id } = await ctx.params; //lấy id đợt thực tập từ params
  const row = await (prisma as any).internshipBatch.findUnique({ //tìm đợt thực tập theo id
    where: { id },
    select: {
      id: true,
      name: true,
      semester: true,
      schoolYear: true,
      startDate: true,
      endDate: true,
      status: true,
      notes: true,
      createdAt: true,
      updatedAt: true
    }
  });

  if (!row) return NextResponse.json({ message: "Không tìm thấy đợt thực tập." }, { status: 404 }); //nếu không tìm thấy đợt thực tập thì trả về lỗi

  return NextResponse.json({ success: true, item: { ...row, startDate: row.startDate?.toISOString?.() ?? null, endDate: row.endDate?.toISOString?.() ?? null, createdAt: row.createdAt?.toISOString?.() ?? null, updatedAt: row.updatedAt?.toISOString?.() ?? null } }); //trả về dữ liệu đợt thực tập
}

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) { //hàm sửa dữ liệu đợt thực tập  
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ message: "Không có quyền truy cập." }, { status: 403 }); //nếu không có quyền truy cập thì trả về lỗi

  const { id } = await ctx.params; //lấy id đợt thực tập từ params
  const body = (await request.json()) as { //lấy dữ liệu đợt thực tập từ request
    name?: string;
    semester?: Semester;
    schoolYear?: string;
    startDate?: string; // YYYY-MM-DD
    endDate?: string; // YYYY-MM-DD
    notes?: string;
  };

  const name = (body.name || "").trim(); //tên đợt thực tập
  const semester = body.semester;
  const schoolYear = (body.schoolYear || "").trim(); //năm học
  const notes = (body.notes || "").trim(); //ghi chú

  const startParsed = parseDateOnly(body.startDate || ""); //ngày bắt đầu
  const endParsed = parseDateOnly(body.endDate || ""); //ngày kết thúc
  const today = getTodayStart(); //ngày hiện tại

  const errors: Record<string, string> = {}; //lỗi
  if (!name || name.length < 1 || name.length > 255) errors.name = "Tên đợt thực tập từ 1–255 ký tự."; //nếu tên đợt thực tập không hợp lệ thì trả về lỗi 
  if (!semester || !["HK_I", "HK_II", "HK_HE", "HK_PHU"].includes(String(semester))) errors.semester = "Học kỳ không hợp lệ.";
  if (!/^\d{4}-\d{4}$/.test(schoolYear) || schoolYear.length < 8 || schoolYear.length > 15)
    errors.schoolYear = "Năm học chỉ cho phép số, dấu '-' (ví dụ 2024-2025)."; //nếu năm học không hợp lệ thì trả về lỗi
  if (!startParsed) errors.startDate = "Thời gian bắt đầu không hợp lệ (YYYY-MM-DD)."; //nếu ngày bắt đầu không hợp lệ thì trả về lỗi
  if (!endParsed) errors.endDate = "Thời gian kết thúc không hợp lệ (YYYY-MM-DD)."; //nếu ngày kết thúc không hợp lệ thì trả về lỗi
  if (startParsed && endParsed) { //nếu ngày bắt đầu và ngày kết thúc không hợp lệ thì trả về lỗi
    if (endParsed.asStart.getTime() <= startParsed.asStart.getTime()) errors.endDate = "Thời gian kết thúc phải > thời gian bắt đầu."; //nếu ngày kết thúc nhỏ hơn ngày bắt đầu thì trả về lỗi
  }

  if (Object.keys(errors).length) { //nếu có lỗi thì trả về lỗi
    return NextResponse.json({ success: false, errors }, { status: 400 }); //trả về lỗi
  }

  const startDate = startParsed!.asStart; //ngày bắt đầu
  const endDate = endParsed!.asStart; //ngày kết thúc

  const current = await (prisma as any).internshipBatch.findUnique({ where: { id } }); //tìm đợt thực tập theo id
  if (!current) return NextResponse.json({ message: "Không tìm thấy đợt thực tập." }, { status: 404 }); //nếu không tìm thấy đợt thực tập thì trả về lỗi

  const endChanged = new Date(current.endDate).toISOString().slice(0, 10) !== body.endDate; //ngày kết thúc đã thay đổi

  // Trùng kỳ-năm (loại chính nó)
  const existsSemester = await (prisma as any).internshipBatch.findFirst({ //tìm đợt thực tập theo học kỳ và năm học
    where: { semester, schoolYear, NOT: { id } } //không tìm đợt thực tập cùng học kỳ và năm học
  });
  if (existsSemester) { //nếu tìm thấy đợt thực tập cùng học kỳ và năm học thì trả về lỗi
    return NextResponse.json({ success: false, message: "Thông tin đợt thực tập đã tồn tại (trùng kỳ-năm)." }, { status: 409 });
  }
  // Trùng ngày bắt đầu-kết thúc (loại chính nó)
  const existsDates = await (prisma as any).internshipBatch.findFirst({
    where: { startDate, endDate, NOT: { id } } //không tìm đợt thực tập cùng ngày bắt đầu và kết thúc
  });
  if (existsDates) { //nếu tìm thấy đợt thực tập cùng ngày bắt đầu và kết thúc thì trả về lỗi
    return NextResponse.json({ success: false, message: "Thông tin đợt thực tập đã tồn tại (trùng ngày bắt đầu-kết thúc)." }, { status: 409 });
  }
  //Quy tắc trạng thái:
  // Quy tắc trạng thái:
  // - Nếu endDate <= hôm nay => Đóng
  // - Nếu endDate > hôm nay và admin sửa ngày kết thúc => Đang mở
  // - Nếu endDate > hôm nay nhưng không đổi endDate => giữ nguyên trạng thái hiện tại (để hỗ trợ đóng sớm)
  let nextStatus: InternshipBatchStatus = current.status; 
  if (endDate.getTime() <= today.getTime()) nextStatus = "CLOSED"; //nếu ngày kết thúc nhỏ hơn ngày hiện tại thì đặt trạng thái là CLOSED
  else if (endChanged) nextStatus = "OPEN"; //nếu ngày kết thúc đã thay đổi thì đặt trạng thái là OPEN

  await (prisma as any).internshipBatch.update({ //cập nhật đợt thực tập 
    where: { id },
    data: { name, semester, schoolYear, startDate, endDate, notes, status: nextStatus }
  }); //cập nhật đợt thực tập
 
  return NextResponse.json({ success: true, message: "Cập nhật đợt thực tập thành công." }); //trả về dữ liệu đợt thực tập
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) { //hàm xóa đợt thực tập
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ message: "Không có quyền truy cập." }, { status: 403 }); //nếu không có quyền truy cập thì trả về lỗi

  const { id } = await ctx.params; //lấy id đợt thực tập từ params

  const current = await (prisma as any).internshipBatch.findUnique({ //tìm đợt thực tập theo id
    where: { id },
    select: { id: true } //lấy id đợt thực tập
  });
  if (!current) return NextResponse.json({ message: "Không tìm thấy đợt thực tập." }, { status: 404 }); //nếu không tìm thấy đợt thực tập thì trả về lỗi

  const linkedCount = await (prisma as any).jobPost.count({ //đếm số lượng tin tuyển dụng liên kết với đợt thực tập
    where: { internshipBatchId: id }
  }); //đếm số lượng tin tuyển dụng liên kết với đợt thực tập

  if (linkedCount > 0) { //nếu có tin tuyển dụng liên kết với đợt thực tập thì trả về lỗi
    return NextResponse.json(
      { success: false, message: "Không thể xóa Đợt thực tập đã có dữ liệu liên kết trong hệ thống." },
      { status: 409 }
    );
  }

  await (prisma as any).internshipBatch.delete({ where: { id } }); //xóa đợt thực tập
  return NextResponse.json({ success: true, message: "Xóa đợt thực tập thành công." }); //trả về dữ liệu đợt thực tập
}

