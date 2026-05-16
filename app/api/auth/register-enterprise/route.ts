import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mail"; //gọi hàm sendMail để gửi email
import { validateEnterpriseRegisterPayload, type EnterpriseRegisterPayload } from "@/lib/enterprise-register-validate"; //gọi hàm validateEnterpriseRegisterPayload để validate dữ liệu đăng ký doanh nghiệp
import { MAIL_PHONG_DAO_TAO_SUBJECT_PREFIX, MAIL_TRANSACTIONAL_SIGN_OFF } from "@/lib/constants/school"; //gọi hàm MAIL_PHONG_DAO_TAO_SUBJECT_PREFIX để lấy tiêu đề email
import { MAIL_BRAND } from "@/lib/mail-brand"; //gọi hàm MAIL_BRAND để lấy giao diện email
import { buildMailShell, escapeHtml, mailLetterClosingHtml } from "@/lib/mail-layout"; //gọi hàm buildMailShell để tạo email shell
import { getPublicAppUrl } from "@/lib/mail-enterprise"; //gọi hàm getPublicAppUrl để lấy URL của ứng dụng
import { toCloudinaryRef, uploadEnterpriseLogoBytesToCloudinary } from "@/lib/storage/cloudinary";
import type { Prisma } from "@prisma/client";
//hàm POST để đăng ký doanh nghiệp
export async function POST(request: Request) {
  const body = (await request.json()) as EnterpriseRegisterPayload; //lấy dữ liệu đăng ký doanh nghiệp từ request
  const validated = await validateEnterpriseRegisterPayload(body); //validate dữ liệu đăng ký doanh nghiệp
  if (!validated.ok) {
    const { error } = validated; //lấy lỗi từ validate
    return NextResponse.json( //trả về lỗi
      { success: false, field: error.field, message: error.message },
      { status: error.status }
    );
  }
 //lấy dữ liệu đăng ký doanh nghiệp từ validate
  const { userCreate } = validated; //lấy dữ liệu đăng ký doanh nghiệp từ validate
  const email = userCreate.email as string; //lấy email từ dữ liệu đăng ký doanh nghiệp
  const enterpriseMeta = 
    userCreate.enterpriseMeta && typeof userCreate.enterpriseMeta === "object" && !Array.isArray(userCreate.enterpriseMeta)
      ? ({ ...(userCreate.enterpriseMeta as Record<string, unknown>) } as Record<string, unknown>)
      : {}; //sao chép dữ liệu đăng ký doanh nghiệp từ validate sang enterpriseMeta

  delete enterpriseMeta.businessLicensePublicId; //xóa mã định danh của file giấy phép kinh doanh

  const companyLogoName = String(enterpriseMeta.companyLogoName || "").trim(); //lấy tên file logo doanh nghiệp
  const companyLogoMime = String(enterpriseMeta.companyLogoMime || "").trim(); //lấy định dạng file logo doanh nghiệp
  const companyLogoBase64 = String(enterpriseMeta.companyLogoBase64 || "").trim(); //lấy base64 của file logo doanh nghiệp

  if (companyLogoBase64 && companyLogoName && companyLogoMime) {
    const uploadedLogo = await uploadEnterpriseLogoBytesToCloudinary({ //tải file logo doanh nghiệp lên cloudinary
      bytes: Buffer.from(companyLogoBase64, "base64"),
      mimeType: companyLogoMime, 
      ownerKey: String(userCreate.taxCode || email || "enterprise"), 
      originalName: companyLogoName 
    });
    enterpriseMeta.companyLogoPublicId = toCloudinaryRef(uploadedLogo.publicId); //lưu tên của file logo doanh nghiệp vào enterpriseMeta
    delete enterpriseMeta.companyLogoBase64; //xóa base64 của file logo doanh nghiệp
    delete enterpriseMeta.companyLogoByteLength; //xóa độ dài của file logo doanh nghiệp để tránh lưu trữ dữ liệu không cần thiết
  }

  const nextUserCreate: Prisma.UserCreateInput = { //tạo dữ liệu đăng ký doanh nghiệp
    ...userCreate,
    enterpriseMeta: enterpriseMeta as Prisma.InputJsonValue
  }; //lưu dữ liệu đăng ký doanh nghiệp vào database

  try { //tạo tài khoản doanh nghiệp
    await prisma.user.create({ data: nextUserCreate }); //lưu dữ liệu đăng ký doanh nghiệp vào database
  } catch (e) { //nếu có lỗi thì log lỗi
    console.error("register-enterprise create user", e);
    return NextResponse.json(
      {
        success: false,
        message: "Không thể tạo tài khoản (có thể email hoặc thông tin đã được dùng). Vui lòng thử lại."
      },
      { status: 409 }
    );
  }
  //gửi mai  
  const appUrl = getPublicAppUrl(); //lấy URL của ứng dụng
  const name = (userCreate.fullName as string) || email; //lấy tên doanh nghiệp từ dữ liệu đăng ký doanh nghiệp
  const subject = `${MAIL_PHONG_DAO_TAO_SUBJECT_PREFIX} - Tiếp nhận đăng ký doanh nghiệp`; //tạo tiêu đề email
  const loginUrl = `${appUrl}/auth/dangnhap`; //tạo đường dẫn đăng nhập
  const text = [ //tạo nội dung email
    `Kính gửi ${name},`,
    "",
    "Hệ thống đã tiếp nhận hồ sơ đăng ký doanh nghiệp của Quý đơn vị.",
    "Quý đơn vị sẽ nhận thông báo khi hồ sơ được phê duyệt.",
    "",
    `Đường dẫn hệ thống: ${loginUrl}`,
    "",
    "Nếu không phải Quý đơn vị thực hiện, vui lòng liên hệ quản trị hệ thống.",
    "",
    MAIL_TRANSACTIONAL_SIGN_OFF
  ].join("\n");

  const C = MAIL_BRAND; //lấy giao diện email
  const html = buildMailShell({ 
    title: "Thông báo tiếp nhận đăng ký tài khoản doanh nghiệp",
    bodyHtml: `
      <p style="margin:0 0 12px;">Kính gửi <strong>${escapeHtml(name)}</strong>,</p>
      <p style="margin:0 0 12px;">
        Phòng Đào tạo trân trọng thông báo hồ sơ đăng ký tài khoản doanh nghiệp của Quý đơn vị
        đã được hệ thống <strong>tiếp nhận</strong> và đang trong quá trình xét duyệt.
      </p>
      <p style="margin:0 0 12px;">
        Sau khi hồ sơ được phê duyệt, Quý đơn vị sẽ nhận thông báo và có thể truy cập hệ thống theo đường dẫn dưới đây:
      </p>
      <p style="margin:16px 0;">
        <a href="${escapeHtml(loginUrl)}"
           style="color:${C.link};font-weight:bold;text-decoration:underline;word-break:break-all;">
          ${escapeHtml(loginUrl)}
        </a>
      </p>
      <p style="margin:0;">
        Trường hợp Quý đơn vị không thực hiện đăng ký, vui lòng bỏ qua email này hoặc liên hệ để được hỗ trợ.
      </p>
      ${mailLetterClosingHtml()}
    `.trim()
  });

  try { //gửi email
    await sendMail(email, subject, text, html); //gửi email
  } catch (e) { //nếu có lỗi thì log lỗi
    console.error("register-enterprise notification mail", e);
  }

  return NextResponse.json({ //trả về kết quả đăng ký doanh nghiệp
    success: true, //thành công
    message: "Đăng ký thành công. Tài khoản đang chờ phê duyệt.", //thông báo đăng ký thành công
    redirectPath: "/auth/dangky" //đường dẫn đăng ký
  });
}
