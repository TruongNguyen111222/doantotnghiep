import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth/jwt";
import { SESSION_COOKIE_NAME } from "@/lib/constants/auth/patterns";
import { prisma } from "@/lib/prisma";
import { EnterpriseStatus } from "@prisma/client";
import {
  DOANHNGHIEP_BUSINESS_FIELD_OPTIONS,
  DOANHNGHIEP_REGISTER_ADDRESS_PATTERN,
  DOANHNGHIEP_REGISTER_LETTER_ONLY_PATTERN,
  DOANHNGHIEP_REGISTER_WEBSITE_PATTERN
} from "@/lib/constants/doanhnghiep"; //hằng số cho API
import { AUTH_EMAIL_REGISTER_PATTERN } from "@/lib/constants/auth/patterns"; //hằng số cho API
import {
  ENTERPRISE_ACCOUNT_EMAIL_TAKEN,
  ENTERPRISE_ACCOUNT_ERROR_ADDRESS,
  ENTERPRISE_ACCOUNT_ERROR_EMAIL,
  ENTERPRISE_ACCOUNT_ERROR_PROVINCE,
  ENTERPRISE_ACCOUNT_ERROR_WARD,
  ENTERPRISE_ACCOUNT_PHONE_TAKEN,
  ENTERPRISE_ACCOUNT_UNIQUE_CONSTRAINT
} from "@/lib/constants/doanhnghiep-tai-khoan"; //hằng số cho API
import { PHONE_ERROR, PHONE_PATTERN } from "@/lib/constants/sinhvien-ho-so"; //hằng số cho API
import type { AdminEnterpriseDetail } from "@/lib/types/admin"; //type chi tiết doanh nghiệp
import { decodeEnterpriseFilePayload, ENTERPRISE_LOGO_MIMES } from "@/lib/enterprise-register-files"; //hàm xử lý file
import { toCloudinaryRef, uploadEnterpriseLogoBytesToCloudinary } from "@/lib/storage/cloudinary"; //hàm xử lý cloudinary

/* KHAI BÁO KIỂU DỮ LIỆU VÀ CÁC HÀM TRỢ GIÚP ÉP KIỂU RECORD CHO ENTERPRISE META */
type GetEnterpriseMeResponse = AdminEnterpriseDetail; //type trả về

function enterpriseMetaAsRecord(meta: unknown): Record<string, unknown> { //hàm xử lý meta doanh nghiệp
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return {};
  return meta as Record<string, unknown>;
}
/* PHƯƠNG THỨC GET - KIỂM TRA QUYỀN TRUY CẬP VÀ LẤY THÔNG TIN CHI TIẾT HỒ SƠ DOANH NGHIỆP HIỆN TẠI */
export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value; 
  if (!token) return NextResponse.json({ success: false, message: "Vui lòng đăng nhập." }, { status: 401 });

  let sub: string;
  let role: string;
  try { //kiểm tra quyền truy cập
    const verified = await verifySession(token); //kiểm tra token
    sub = verified.sub;
    role = verified.role;
  } catch { //nếu lỗi thì trả về lỗi 401
    return NextResponse.json({ success: false, message: "Phien dang nhap khong hop le." }, { status: 401 });
  }

  if (role !== "doanhnghiep") { //nếu không phải doanh nghiệp thì trả về lỗi 403
    return NextResponse.json({ success: false, message: "Không có quyền truy cập." }, { status: 403 });
  }

  const user = await prisma.user.findUnique({ //tìm kiếm user theo id
    where: { id: sub },
    select: {
      id: true,
      email: true,
      phone: true,
      fullName: true,
      companyName: true,
      taxCode: true,
      representativeTitle: true,
      enterpriseMeta: true,
      enterpriseStatus: true,
      isLocked: true,
      createdAt: true,
      updatedAt: true
    }
  });

  if (!user) return NextResponse.json({ success: false, message: "Không tìm thấy tài khoản." }, { status: 404 });

  const out: GetEnterpriseMeResponse = {
    id: user.id,
    email: user.email,
    phone: user.phone ?? null,
    fullName: user.fullName,
    companyName: user.companyName ?? null,
    taxCode: user.taxCode ?? null,
    representativeTitle: user.representativeTitle ?? null,
    enterpriseMeta: user.enterpriseMeta ?? {},
    enterpriseStatus: user.enterpriseStatus ?? EnterpriseStatus.PENDING,
    isLocked: Boolean((user as any).isLocked),
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString()
  };

  return NextResponse.json({ success: true, item: out }); //trả về thông tin doanh nghiệp
}

/* ĐỊNH NGHĨA KIỂU DỮ LIỆU ĐẦU VÀO CHO BODY REQUEST CỦA PHƯƠNG THỨC PATCH */
type PatchEnterpriseMeBody = {
  email?: string;
  phone?: string;
  representativeName?: string;
  representativeTitle?: string;
  businessFields?: string[];
  companyIntro?: string | null;
  website?: string | null;
  province?: string;
  ward?: string;
  provinceCode?: string | number;
  wardCode?: string | number;
  addressDetail?: string;
  companyLogoName?: string;
  companyLogoMime?: string;
  companyLogoBase64?: string;
};
/* PHƯƠNG THỨC PATCH - XÁC THỰC PHIÊN ĐĂNG NHẬP VÀ PHÂN QUYỀN TÀI KHOẢN DOANH NGHIỆP */
export async function PATCH(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ success: false, message: "Vui lòng đăng nhập." }, { status: 401 });

  let sub: string;
  let role: string;
  try {
    const verified = await verifySession(token); //kiểm tra token
    sub = verified.sub;
    role = verified.role;
  } catch { //nếu lỗi thì trả về lỗi 401
    return NextResponse.json({ success: false, message: "Phien dang nhap khong hop le." }, { status: 401 });
  }

  if (role !== "doanhnghiep") { //nếu không phải doanh nghiệp thì trả về lỗi 403
    return NextResponse.json({ success: false, message: "Không có quyền truy cập." }, { status: 403 });
  }
/* PHÂN TÁCH, CHUẨN HÓA VÀ LÀM SẠCH CÁC TRƯỜNG DỮ LIỆU NHẬN ĐƯỢC TỪ CLIENT */
  const body = (await request.json()) as PatchEnterpriseMeBody;
  const emailNorm = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const phoneTrim = typeof body.phone === "string" ? body.phone.trim() : "";
  const representativeName = body.representativeName?.trim() || "";
  const representativeTitle = body.representativeTitle?.trim() || "";
  const businessFields = Array.isArray(body.businessFields) ? body.businessFields.map((x) => String(x).trim()).filter(Boolean) : [];
  const companyIntro = typeof body.companyIntro === "string" ? body.companyIntro.trim() : body.companyIntro ?? null;
  const companyIntroOrNull = companyIntro && companyIntro.trim() ? companyIntro.trim() : null;
  const website = typeof body.website === "string" ? body.website.trim() : body.website ?? null;
  const websiteOrNull = website && website.trim() ? website.trim() : null;

  const province = typeof body.province === "string" ? body.province.trim() : "";
  const ward = typeof body.ward === "string" ? body.ward.trim() : "";
  const provinceCodeRaw = body.provinceCode != null ? String(body.provinceCode).trim() : "";
  const wardCodeRaw = body.wardCode != null ? String(body.wardCode).trim() : "";
  const addressDetail = typeof body.addressDetail === "string" ? body.addressDetail.trim() : "";

  const companyLogoName = typeof body.companyLogoName === "string" ? body.companyLogoName.trim() : "";
  const companyLogoMime = typeof body.companyLogoMime === "string" ? body.companyLogoMime.trim() : "";
  const companyLogoBase64 = typeof body.companyLogoBase64 === "string" ? body.companyLogoBase64.trim() : "";
/*  KIỂM TRA ĐỊNH DẠNG (VALIDATION) CÁC THÔNG TIN CƠ BẢN: EMAIL, SỐ ĐIỆN THOẠI, NGƯỜI ĐẠI DIỆN */
  if (!emailNorm || !AUTH_EMAIL_REGISTER_PATTERN.test(emailNorm)) {
    return NextResponse.json({ success: false, field: "email", message: ENTERPRISE_ACCOUNT_ERROR_EMAIL }, { status: 400 });
  }

  if (!phoneTrim || !PHONE_PATTERN.test(phoneTrim)) {
    return NextResponse.json({ success: false, field: "phone", message: PHONE_ERROR }, { status: 400 });
  }

  if (!representativeName || representativeName.length > 255 || !DOANHNGHIEP_REGISTER_LETTER_ONLY_PATTERN.test(representativeName)) {
    return NextResponse.json({ success: false, field: "representativeName", message: "Ho va ten chi gom ky tu chu, dai 1-255 ky tu." }, { status: 400 });
  }

  if (!representativeTitle || representativeTitle.length > 255 || !DOANHNGHIEP_REGISTER_LETTER_ONLY_PATTERN.test(representativeTitle)) {
    return NextResponse.json({ success: false, field: "representativeTitle", message: "Chuc vu chi gom ky tu chu, dai 1-255 ky tu." }, { status: 400 });
  }
/*  KIỂM TRA ĐỊNH DẠNG CÁC THÔNG TIN BỔ SUNG: WEBSITE VÀ ĐỊA CHỈ HÀNH CHÍNH (TỈNH, PHƯỜNG, ĐƯỜNG) */
  const allowedFields = DOANHNGHIEP_BUSINESS_FIELD_OPTIONS as readonly string[];

  if (websiteOrNull && !DOANHNGHIEP_REGISTER_WEBSITE_PATTERN.test(websiteOrNull)) {
    return NextResponse.json({ success: false, field: "website", message: "Website không đúng định dạng." }, { status: 400 });
  }

  if (!province || !provinceCodeRaw || !/^\d+$/.test(provinceCodeRaw)) {
    return NextResponse.json({ success: false, field: "provinceCode", message: ENTERPRISE_ACCOUNT_ERROR_PROVINCE }, { status: 400 });
  }
  if (!ward || !wardCodeRaw || !/^\d+$/.test(wardCodeRaw)) {
    return NextResponse.json({ success: false, field: "wardCode", message: ENTERPRISE_ACCOUNT_ERROR_WARD }, { status: 400 });
  }
  if (!DOANHNGHIEP_REGISTER_ADDRESS_PATTERN.test(addressDetail)) {
    return NextResponse.json({ success: false, field: "addressDetail", message: ENTERPRISE_ACCOUNT_ERROR_ADDRESS }, { status: 400 });
  }
/*   TRUY VẤN CƠ SỞ DỮ LIỆU ĐỂ KIỂM TRA SỰ TỒN TẠI CỦA TÀI KHOẢN HIỆN TẠI */
  const user = await prisma.user.findUnique({ //tìm kiếm user theo id
    where: { id: sub },
    select: { id: true, email: true, phone: true, enterpriseMeta: true, representativeTitle: true, fullName: true, taxCode: true }
  });

  if (!user) return NextResponse.json({ success: false, message: "Không tìm thấy tài khoản." }, { status: 404 });
/*   KIỂM TRA TRÙNG LẶP (DUPLICATE) EMAIL VÀ SỐ ĐIỆN THOẠI VỚI CÁC TÀI KHOẢN KHÁC TRÊN HỆ THỐNG */
  if (emailNorm !== user.email) {
    const emailTaken = await prisma.user.findFirst({
      where: { email: emailNorm, NOT: { id: sub } },
      select: { id: true }
    });
    if (emailTaken) {
      return NextResponse.json({ success: false, field: "email", message: ENTERPRISE_ACCOUNT_EMAIL_TAKEN }, { status: 409 });
    }
  }

  const currentPhone = user.phone ?? "";
  if (phoneTrim !== currentPhone) {
    const phoneTaken = await prisma.user.findFirst({
      where: { phone: phoneTrim, NOT: { id: sub } },
      select: { id: true }
    });
    if (phoneTaken) {
      return NextResponse.json({ success: false, field: "phone", message: ENTERPRISE_ACCOUNT_PHONE_TAKEN }, { status: 409 });
    }
  }
/*  MERGE DỮ LIỆU CŨ VỚI DỮ LIỆU MỚI VÀ SÀNG LỌC LĨNH VỰC KINH DOANH (BUSINESS FIELDS) HỢP LỆ */
  const prevMeta = enterpriseMetaAsRecord(user.enterpriseMeta); //lấy meta doanh nghiệp cũ
  const prevBusinessFields = Array.isArray(prevMeta.businessFields) //lấy lĩnh vực kinh doanh cũ
    ? prevMeta.businessFields.map((x) => String(x).trim()).filter(Boolean)
    : [];
  const nextBusinessFields = //lấy lĩnh vực kinh doanh mới
    businessFields.length > 0
      ? businessFields.filter((x) => allowedFields.includes(x))
      : prevBusinessFields.filter((x) => allowedFields.includes(x)); //lấy lĩnh vực kinh doanh mới
  const nextMeta = { //lấy meta doanh nghiệp mới
    ...prevMeta, //lấy meta doanh nghiệp cũ
    representativeName, //lấy tên người đại diện mới
    representativeTitle, //lấy chức danh người đại diện mới 
    businessFields: nextBusinessFields,
    companyIntro: companyIntroOrNull, //lấy giới thiệu doanh nghiệp mới
    website: websiteOrNull,
    province, //lấy tỉnh/thành mới
    ward, //lấy phường/xã mới
    provinceCode: provinceCodeRaw, //lấy mã tỉnh/thành mới
    wardCode: wardCodeRaw, //lấy mã phường/xã mới
    addressDetail //lấy địa chỉ chi tiết mới
  };
/* XỬ LÝ GIẢI MÃ CHUỖI BASE64 VÀ TIẾN HÀNH UPLOAD FILE LOGO MỚI LÊN LƯU TRỮ CLOUDINARY */
  if (companyLogoBase64 && companyLogoMime && companyLogoName) {
    const decoded = decodeEnterpriseFilePayload(companyLogoBase64, companyLogoMime, ENTERPRISE_LOGO_MIMES);
    if (!decoded.ok) {
      return NextResponse.json({ success: false, field: "companyLogo", message: decoded.message }, { status: 400 });
    }
    const uploaded = await uploadEnterpriseLogoBytesToCloudinary({ //upload file logo mới lên cloudinary
      bytes: Buffer.from(decoded.base64, "base64"),
      mimeType: decoded.mime,
      ownerKey: String(user.taxCode || emailNorm || sub),
      originalName: companyLogoName
    });
    (nextMeta as any).companyLogoName = companyLogoName;
    (nextMeta as any).companyLogoMime = decoded.mime;
    (nextMeta as any).companyLogoPublicId = toCloudinaryRef(uploaded.publicId);
    delete (nextMeta as any).companyLogoBase64;
    delete (nextMeta as any).companyLogoByteLength;
  }
/*  TIẾN HÀNH CẬP NHẬT DỮ LIỆU VÀO DATABASE QUA PRISMA VÀ BẮT LỖI RÀNG BUỘC DUY NHẤT (P2002) */
  try {
    await prisma.user.update({ //cập nhật dữ liệu vào database
      where: { id: sub },
      data: {
        email: emailNorm,
        phone: phoneTrim,
        fullName: representativeName,
        representativeTitle,
        enterpriseMeta: nextMeta
      }
    });
  } catch (e: unknown) {
    const code = typeof e === "object" && e !== null && "code" in e ? String((e as { code?: string }).code) : "";
    if (code === "P2002") {
      return NextResponse.json({ success: false, message: ENTERPRISE_ACCOUNT_UNIQUE_CONSTRAINT }, { status: 409 });
    }
    throw e;
  }

  return NextResponse.json({ success: true, message: "Đã cập nhật thông tin tài khoản doanh nghiệp." }); //trả về thông báo cập nhật thành công
}
