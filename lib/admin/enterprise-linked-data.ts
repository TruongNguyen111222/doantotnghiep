import { EnterpriseStatus, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
//kiểm tra xem một tài khoản Doanh nghiệp đã được Admin phê duyệt (APPROVED) hay chưa.
export async function enterpriseUserHasLinkedData(userId: string): Promise<boolean> { //hàm kiểm tra xem doanh nghiệp đã có dữ liệu liên kết trong hệ thống hay chưa
  const u = await prisma.user.findUnique({ //tìm kiếm doanh nghiệp theo id
    where: { id: userId },
    select: { role: true, enterpriseStatus: true } //lấy role và trạng thái doanh nghiệp  
  });
  if (!u || u.role !== Role.doanhnghiep) return true; //nếu doanh nghiệp không tồn tại hoặc role không phải là doanh nghiệp thì trả về true
  if (u.enterpriseStatus === EnterpriseStatus.APPROVED) return true; //nếu trạng thái doanh nghiệp là đã phê duyệt thì trả về true
  return false; //nếu trạng thái doanh nghiệp không phải là đã phê duyệt thì trả về false
}
