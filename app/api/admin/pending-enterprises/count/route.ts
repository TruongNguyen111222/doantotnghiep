import { NextResponse } from "next/server";
import { EnterpriseStatus, Role } from "@prisma/client"; 
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth/admin-session"; // lấy session admin

export async function GET() {
  const admin = await getAdminSession(); // lấy session admin
  if (!admin) { // nếu không có session admin thì trả về lỗi
    return NextResponse.json({ message: "Không có quyền truy cập." }, { status: 403 });
  }

  const count = await prisma.user.count({ // đếm số doanh nghiệp đang chờ duyệt
    where: {
      role: Role.doanhnghiep, // lấy role doanh nghiệp
      OR: [{ enterpriseStatus: EnterpriseStatus.PENDING }, { enterpriseStatus: null }] // lấy doanh nghiệp đang chờ duyệt hoặc null
    }
  });

  return NextResponse.json({ count }); // trả về số lượng doanh nghiệp đang chờ duyệt
}
