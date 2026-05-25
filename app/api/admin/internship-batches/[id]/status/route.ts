import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth/admin-session";
//hàm đóng đợt thực tập
type InternshipBatchStatus = "OPEN" | "CLOSED"; //trạng thái đợt thực tập

function getTodayStart() { //hàm lấy ngày hiện tại
  const d = new Date(); //tạo ngày hiện tại
  d.setHours(0, 0, 0, 0); //set giờ, phút, giây, miligiây về 0
  return d; //trả về ngày hiện tại
}

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) { //hàm đóng đợt thực tập
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ message: "Không có quyền truy cập." }, { status: 403 });

  const { id } = await ctx.params; //lấy id đợt thực tập từ params    
  const body = (await request.json()) as { action?: string }; //lấy body từ request

  const action = body.action; //lấy action từ body
  if (action !== "close") return NextResponse.json({ message: "Thiếu hành động hợp lệ." }, { status: 400 }); //nếu action không phải là close thì trả về lỗi

  const current = await (prisma as any).internshipBatch.findUnique({ //tìm đợt thực tập theo id
    where: { id }, //lấy id đợt thực tập
    select: { id: true, status: true, endDate: true } //lấy id, trạng thái, ngày kết thúc
  });
  if (!current) return NextResponse.json({ message: "Không tìm thấy đợt thực tập." }, { status: 404 }); //nếu không tìm thấy đợt thực tập thì trả về lỗi

  const today = getTodayStart(); //lấy ngày hiện tại
  const endDate = new Date(current.endDate);

  let nextStatus: InternshipBatchStatus = "CLOSED"; //trạng thái đợt thực tập
  if (endDate.getTime() > today.getTime()) {
    // Admin đóng kỳ sớm.
    nextStatus = "CLOSED"; //trạng thái đợt thực tập
  } else {
    nextStatus = "CLOSED"; //trạng thái đợt thực tập    
  }

  await (prisma as any).internshipBatch.update({ //cập nhật trạng thái đợt thực tập
    where: { id }, //lấy id đợt thực tập
    data: { status: nextStatus } //cập nhật trạng thái đợt thực tập
  });

  return NextResponse.json({ success: true, message: "Đã cập nhật trạng thái đợt thực tập." }); //trả về dữ liệu đợt thực tập
}

