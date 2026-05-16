import { NextResponse } from "next/server";
import { EnterpriseStatus, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth/admin-session"; //lấy session admin
import { deleteEnterpriseUserCascade } from "@/lib/admin/delete-enterprise-user"; //hàm xóa doanh nghiệp và tất cả dữ liệu liên kết với doanh nghiệp
//Xem chi tiết doanh nghiệp (GET) và Xóa doanh nghiệp (DELETE).
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await getAdminSession(); //lấy session admin
  if (!admin) {
    return NextResponse.json({ message: "Không có quyền truy cập." }, { status: 403 });
  }

  const { id } = await ctx.params; //lấy id doanh nghiệp
  const user = await prisma.user.findUnique({ //tìm kiếm doanh nghiệp theo id
    where: { id },
    select: {
      id: true,
      email: true,
      phone: true,
      fullName: true,
      companyName: true,
      taxCode: true,
      representativeTitle: true,
      enterpriseStatus: true,
      isLocked: true,
      enterpriseMeta: true,
      createdAt: true,
      updatedAt: true,
      role: true
    }
  });

  if (!user || user.role !== Role.doanhnghiep) { //nếu doanh nghiệp không tồn tại hoặc role không phải là doanh nghiệp thì trả về lỗi
    return NextResponse.json({ message: "Không tìm thấy doanh nghiệp." }, { status: 404 });
  }

  return NextResponse.json({ //trả về dữ liệu chi tiết doanh nghiệp
    item: {
      ...user, //trả về dữ liệu chi tiết doanh nghiệp
      enterpriseStatus: user.enterpriseStatus ?? EnterpriseStatus.PENDING, //trả về trạng thái doanh nghiệp
      isLocked: Boolean((user as any).isLocked), //trả về trạng thái khóa doanh nghiệp
      createdAt: user.createdAt.toISOString(), //trả về ngày tạo doanh nghiệp
      updatedAt: user.updatedAt.toISOString() //trả về ngày cập nhật doanh nghiệp
    }
  });
}

//Trước khi đóng gói gửi về cho Frontend hiển thị lên cái Popup, Server tinh chỉnh lại một chút
export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) { 
  const admin = await getAdminSession(); //lấy session admin
  if (!admin) { //nếu không có session admin thì trả về lỗi
    return NextResponse.json({ message: "Không có quyền truy cập." }, { status: 403 });
  }

  const { id } = await ctx.params; //lấy id doanh nghiệp
  const user = await prisma.user.findUnique({ //tìm kiếm doanh nghiệp theo id
    where: { id },
    select: { id: true, role: true }
  });

  if (!user || user.role !== Role.doanhnghiep) { //nếu doanh nghiệp không tồn tại hoặc role không phải là doanh nghiệp thì trả về lỗi
    return NextResponse.json({ message: "Không tìm thấy doanh nghiệp." }, { status: 404 });
  }

  const del = await deleteEnterpriseUserCascade(id); //xóa doanh nghiệp và tất cả dữ liệu liên kết với doanh nghiệp
  if (!del.ok) { //nếu không xóa được doanh nghiệp thì trả về lỗi
    const conflict = del.message.includes("phê duyệt") || del.message.includes("liên kết"); //nếu lỗi chứa "phê duyệt" hoặc "liên kết" thì trả về 409
    return NextResponse.json(
      { success: false, message: del.message }, //trả về lỗi
      { status: conflict ? 409 : del.message.includes("Không tìm thấy") ? 404 : 500 } //trả về mã lỗi
    );
  }
  return NextResponse.json({ success: true, message: "Xóa tài khoản thành công." }); //trả về thành công
}
