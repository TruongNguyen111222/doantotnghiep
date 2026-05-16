import { NextResponse } from "next/server";
import { EnterpriseStatus, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth/admin-session";
import { deleteEnterpriseUserCascade } from "@/lib/admin/delete-enterprise-user"; //hàm xóa doanh nghiệp và tất cả dữ liệu liên kết với doanh nghiệp
import { sendEnterpriseApprovedEmail, sendEnterpriseRejectedEmail } from "@/lib/mail-enterprise"; //hàm gửi email phê duyệt và từ chối doanh nghiệp
//Phê duyệt và từ chối doanh nghiệp (POST).
export const dynamic = "force-dynamic"; 

type Body = {
  action?: "approve" | "reject";
  reasons?: string[];
};

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) { //hàm phê duyệt và từ chối doanh nghiệp
  const admin = await getAdminSession(); //lấy session admin
  if (!admin) { //nếu không có session admin thì trả về lỗi
    return NextResponse.json({ message: "Không có quyền truy cập." }, { status: 403 });
  }

  const { id } = await ctx.params; //lấy id doanh nghiệp
  const body = (await request.json()) as Body;
  const action = body.action; //lấy hành động phê duyệt hoặc từ chối
  const reasons = Array.isArray(body.reasons)
    ? body.reasons.map((r) => String(r).trim()).filter(Boolean) //lấy lý do từ chối
    : [];

  if (action !== "approve" && action !== "reject") { //nếu hành động không phải là phê duyệt hoặc từ chối thì trả về lỗi
    return NextResponse.json({ message: "Thiếu hành động hợp lệ." }, { status: 400 }); //trả về lỗi
  }

  const user = await prisma.user.findUnique({ where: { id } }); //tìm kiếm doanh nghiệp theo id
  if (!user || user.role !== Role.doanhnghiep) { //nếu doanh nghiệp không tồn tại hoặc role không phải là doanh nghiệp thì trả về lỗi
    return NextResponse.json({ message: "Không tìm thấy doanh nghiệp." }, { status: 404 });
  }

  const companyName = user.companyName || ""; //lấy tên doanh nghiệp
  const prevMeta = //lấy meta data của doanh nghiệp
    user.enterpriseMeta && typeof user.enterpriseMeta === "object" && !Array.isArray(user.enterpriseMeta)
      ? { ...(user.enterpriseMeta as Record<string, unknown>) } //lấy meta data của doanh nghiệp
      : {}; //lấy meta data của doanh nghiệp

  if (action === "approve") { //nếu hành động là phê duyệt thì kiểm tra xem doanh nghiệp đã được phê duyệt hay chưa
    if (user.enterpriseStatus === EnterpriseStatus.APPROVED) { //nếu doanh nghiệp đã được phê duyệt thì trả về lỗi
      return NextResponse.json({
        success: true,
        message: "Tài khoản đã ở trạng thái đã phê duyệt (đang hoạt động).",
        alreadyApproved: true
      });
    }

    const cleanMeta = { ...prevMeta }; //lấy meta data của doanh nghiệp
    delete cleanMeta.rejectedAt; //xóa rejectedAt
    delete cleanMeta.rejectedByAdminId; //xóa rejectedByAdminId
    delete cleanMeta.rejectionReasons; //xóa rejectionReasons

    await prisma.user.update({ //cập nhật trạng thái doanh nghiệp
      where: { id },
      data: {
        enterpriseStatus: EnterpriseStatus.APPROVED, //cập nhật trạng thái doanh nghiệp thành đã phê duyệt
        enterpriseMeta: {
          ...cleanMeta, //lấy meta data của doanh nghiệp
          approvedAt: new Date().toISOString(), //cập nhật ngày phê duyệt
          approvedByAdminId: admin.sub //cập nhật id admin phê duyệt
        }
      }
    });

    let mailError: string | null = null; //lỗi gửi email
    try {
      await sendEnterpriseApprovedEmail(user.email, companyName, user.email); //gửi email phê duyệt doanh nghiệp
    } catch (e) {
      mailError = e instanceof Error ? e.message : "Gửi email thất bại.";
    }

    return NextResponse.json({ //trả về thành công
      success: true,
      message: mailError
        ? `Đã phê duyệt. Cảnh báo gửi email: ${mailError}` //trả về lỗi gửi email
        : "Đã phê duyệt. Đã gửi email thông báo tới doanh nghiệp.", //trả về thành công
      mailError //trả về lỗi gửi email
    });
  }

  if (reasons.length === 0) { //nếu không có lý do từ chối thì trả về lỗi
    return NextResponse.json({ message: "Vui lòng nhập ít nhất một lý do từ chối." }, { status: 400 });
  }

  if (user.enterpriseStatus === EnterpriseStatus.APPROVED) { //nếu doanh nghiệp đã được phê duyệt thì trả về lỗi
    return NextResponse.json({ message: "Không thể từ chối tài khoản đã phê duyệt." }, { status: 400 });
  }

  try { 
    await sendEnterpriseRejectedEmail(user.email, reasons, companyName); //gửi email từ chối doanh nghiệp
  } catch (e) {
    const mailError = e instanceof Error ? e.message : "Gửi email thất bại."; //lỗi gửi email
    return NextResponse.json(
      { success: false, message: `Gửi email thất bại: ${mailError}` }, //trả về lỗi gửi email
      { status: 502 }
    );
  }

  const del = await deleteEnterpriseUserCascade(id);    //xóa doanh nghiệp và tất cả dữ liệu liên kết với doanh nghiệp
  if (!del.ok) { //nếu không xóa được doanh nghiệp thì trả về lỗi
    return NextResponse.json( //trả về lỗi
      {
        success: false,
        message: `${del.message} Email từ chối đã được gửi; vui lòng xử lý thủ công hoặc thử xóa tài khoản sau.`
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ //trả về thành công
    success: true, 
    message: "Đã gửi email từ chối và xóa tài khoản doanh nghiệp." //trả về thành công
  });
}
