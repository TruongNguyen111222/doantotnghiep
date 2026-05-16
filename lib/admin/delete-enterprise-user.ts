import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { enterpriseUserHasLinkedData } from "@/lib/admin/enterprise-linked-data"; //hàm kiểm tra xem doanh nghiệp đã có dữ liệu liên kết trong hệ thống hay chưa

export async function deleteEnterpriseUserCascade( //hàm xóa doanh nghiệp và tất cả dữ liệu liên kết với doanh nghiệp
  userId: string //id của doanh nghiệp
): Promise<{ ok: true } | { ok: false; message: string }> {
  const user = await prisma.user.findUnique({ //tìm kiếm doanh nghiệp theo id
    where: { id: userId },  
    select: { id: true, role: true }
  });
  if (!user || user.role !== Role.doanhnghiep) { //nếu doanh nghiệp không tồn tại hoặc role không phải là doanh nghiệp thì trả về lỗi
    return { ok: false, message: "Không tìm thấy doanh nghiệp." };
  }
  if (await enterpriseUserHasLinkedData(userId)) { //nếu doanh nghiệp đã có dữ liệu liên kết trong hệ thống thì trả về lỗi
    return {
      ok: false,
      message: "Không thể xóa tài khoản đã phê duyệt hoặc đã có dữ liệu liên kết trong hệ thống."
    };
  }

  try {
    await prisma.$transaction(async (tx) => { //xóa tất cả dữ liệu liên kết với doanh nghiệp
      const posts = await tx.jobPost.findMany({ //tìm kiếm tin tuyển dụng theo id doanh nghiệp
        where: { enterpriseUserId: userId },
        select: { id: true }
      }); 
      const ids = posts.map((p) => p.id); //lấy id của tin tuyển dụng
      if (ids.length > 0) {
        await tx.jobApplication.deleteMany({ where: { jobPostId: { in: ids } } }); //xóa tất cả dữ liệu liên kết với tin tuyển dụng
      }
      await tx.jobPost.deleteMany({ where: { enterpriseUserId: userId } }); //xóa tất cả tin tuyển dụng của doanh nghiệp
      await tx.user.delete({ where: { id: userId } }); //xóa doanh nghiệp
    });
  } catch (e) {
    console.error("deleteEnterpriseUserCascade", e); //log lỗi
    return { ok: false, message: "Không thể xóa tài khoản (lỗi hệ thống)." };
  }
  return { ok: true }; //trả về true nếu xóa doanh nghiệp thành công
}
