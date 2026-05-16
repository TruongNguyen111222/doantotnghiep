//API cập nhật trạng thái tài khoản 
///api/admin/accounts/123/status
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth/admin-session";

type AccountStatus = "ACTIVE" | "STOPPED"; //kiểu dữ liệu cho trạng thái tài khoản

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await getAdminSession(); //lấy session admin
  if (!admin) return NextResponse.json({ message: "Không có quyền truy cập." }, { status: 403 });

  const { id } = await ctx.params; //lấy id tài khoản
  const body = (await request.json()) as { status?: AccountStatus }; //lấy body request
  const status = body.status; //lấy trạng thái tài khoản
  if (!status || !["ACTIVE", "STOPPED"].includes(status)) { //nếu trạng thái không hợp lệ thì trả về lỗi
    return NextResponse.json({ success: false, message: "Trạng thái không hợp lệ." }, { status: 400 });
  }

  const prismaAny = prisma as any; //lấy prisma
  const current = await prismaAny.user.findUnique({ //tìm tài khoản
    where: { id }, //lấy id tài khoản
    select: { id: true, role: true, isLocked: true } //lấy id, role, isLocked
  });
  if (!current) return NextResponse.json({ success: false, message: "Không tìm thấy tài khoản." }, { status: 404 }); //nếu không tìm thấy tài khoản thì trả về lỗi

  const isLocked = status === "STOPPED"; //nếu trạng thái tài khoản là STOPPED thì isLocked = true

  await prismaAny.user.update({ //cập nhật trạng thái tài khoản
    where: { id }, //lấy id tài khoản
    data: { isLocked } //cập nhật trạng thái tài khoản
  });

  // When reactivating a student account, check if internshipStatus is REJECTED
  // (= "Chưa hoàn thành thực tập") and reset it to NOT_STARTED so the student
  // can start a new internship cycle.
  if (status === "ACTIVE" && current.role === "sinhvien") { //nếu trạng thái tài khoản là ACTIVE và role là sinh viên thì kiểm tra trạng thái thực tập
    const studentProfile = await prismaAny.studentProfile.findFirst({
      where: { userId: id }, //lấy id tài khoản
      select: { id: true, internshipStatus: true } //lấy id, trạng thái thực tập
    });
    if (studentProfile && studentProfile.internshipStatus === "REJECTED") { //nếu trạng thái thực tập là REJECTED thì reset lại trạng thái thực tập
      await prismaAny.$transaction(async (tx: any) => { //cập nhật trạng thái thực tập
        await tx.studentProfile.update({
          where: { id: studentProfile.id }, //lấy id tài khoản
          data: { internshipStatus: "NOT_STARTED" } //cập nhật trạng thái thực tập
        });
        await tx.internshipStatusHistory.create({ //tạo lịch sử trạng thái thực tập
          data: {
            studentProfileId: studentProfile.id, //lấy id tài khoản
            fromStatus: "REJECTED", //trạng thái thực tập trước
            toStatus: "NOT_STARTED", //trạng thái thực tập sau
            byRole: "admin", //vai trò
            message: "Admin kích hoạt lại tài khoản – đặt lại trạng thái thực tập" //lời nhắn
          }
        });
      });
    }
  }

  return NextResponse.json({ success: true, message: "Cập nhật trạng thái tài khoản thành công." }); //trả về thông báo thành công
} 
