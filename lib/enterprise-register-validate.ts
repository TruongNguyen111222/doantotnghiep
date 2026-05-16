import type { EnterpriseStatus, Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password"; //gọi hàm hashPassword để hash password
import {
  decodeEnterpriseFilePayload,
  ENTERPRISE_LICENSE_MIMES,
  ENTERPRISE_LOGO_MIMES
} from "@/lib/enterprise-register-files"; //gọi hàm decodeEnterpriseFilePayload để decode file đăng ký doanh nghiệp
import { AUTH_EMAIL_REGISTER_PATTERN } from "@/lib/constants/auth/patterns"; //gọi hàm AUTH_EMAIL_REGISTER_PATTERN để kiểm tra email có hợp lệ không
import {
  DOANHNGHIEP_REGISTER_ADDRESS_PATTERN,
  DOANHNGHIEP_REGISTER_LETTER_ONLY_PATTERN,
  DOANHNGHIEP_REGISTER_WEBSITE_PATTERN
} from "@/lib/constants/doanhnghiep"; //gọi hàm DOANHNGHIEP_REGISTER_ADDRESS_PATTERN để kiểm tra địa chỉ có hợp lệ không

export type EnterpriseRegisterPayload = { //cấu trúc dữ liệu đăng ký doanh nghiệp
  companyName?: string;
  taxCode?: string;
  businessFields?: string[];
  province?: string;
  ward?: string;
  provinceCode?: string | number;
  wardCode?: string | number;
  addressDetail?: string;
  businessLicenseName?: string;
  businessLicenseMime?: string;
  businessLicenseBase64?: string;
  companyLogoName?: string;
  companyLogoMime?: string;
  companyLogoBase64?: string;
  website?: string;
  representativeName?: string;
  representativeTitle?: string;
  phone?: string;
  email?: string;
};

export type EnterpriseRegisterError = { field?: string; message: string; status: number }; //cấu trúc lỗi đăng ký doanh nghiệp

export type ValidatedEnterpriseUserCreate = Prisma.UserCreateInput; //cấu trúc dữ liệu đăng ký doanh nghiệp

/**
 * Kiểm tra toàn bộ payload đăng ký DN; trả về dữ liệu tạo User hoặc lỗi.
 */
export async function validateEnterpriseRegisterPayload( //validate dữ liệu đăng ký doanh nghiệp
  body: EnterpriseRegisterPayload
): Promise<{ ok: true; userCreate: ValidatedEnterpriseUserCreate } | { ok: false; error: EnterpriseRegisterError }> {
  const companyName = body.companyName?.trim() || "";
  const taxCode = body.taxCode?.trim() || "";
  const businessFields = body.businessFields || [];
  const province = body.province?.trim() || "";
  const ward = body.ward?.trim() || "";
  const provinceCodeRaw = body.provinceCode != null ? String(body.provinceCode).trim() : "";
  const wardCodeRaw = body.wardCode != null ? String(body.wardCode).trim() : "";
  const addressDetail = body.addressDetail?.trim() || "";
  const businessLicenseName = body.businessLicenseName?.trim() || "";
  const businessLicenseMime = body.businessLicenseMime?.trim() || "";
  const businessLicenseBase64 = body.businessLicenseBase64;
  const companyLogoName = body.companyLogoName?.trim() || "";
  const companyLogoMime = body.companyLogoMime?.trim() || "";
  const companyLogoBase64 = body.companyLogoBase64;
  const website = body.website?.trim() || "";
  const representativeName = body.representativeName?.trim() || "";
  const representativeTitle = body.representativeTitle?.trim() || "";
  const phone = body.phone?.trim() || "";
  const email = body.email?.trim().toLowerCase() || "";

  const fail = (error: EnterpriseRegisterError) => ({ ok: false as const, error });

  if (!companyName || companyName.length > 255) { //kiểm tra tên doanh nghiệp có hợp lệ không
    return fail({ field: "companyName", message: "Tên doanh nghiệp từ 1-255 ký tự.", status: 400 });
  }

  const dupName = await prisma.user.findFirst({ //kiểm tra tên doanh nghiệp đã tồn tại trong hệ thống chưa
    where: { companyName: { equals: companyName, mode: "insensitive" } }
  });
  if (dupName) {
    return fail({ //trả về lỗi nếu tên doanh nghiệp đã tồn tại trong hệ thống
      field: "companyName",
      message: "Tên doanh nghiệp đã tồn tại trong hệ thống.",
      status: 409
    });
  }

  if (!/^\d{10,15}$/.test(taxCode)) { //kiểm tra mã số thuế có hợp lệ không
    return fail({ field: "taxCode", message: "Mã số thuế chỉ gồm số và có độ dài 10-15 ký tự.", status: 400 });
  }

  const dupTax = await prisma.user.findUnique({ where: { taxCode } });
  if (dupTax) {
    return fail({ field: "taxCode", message: "Mã số thuế đã tồn tại trong hệ thống.", status: 409 });
  }

  if (!businessFields.length) {
    return fail({ field: "businessFields", message: "Vui lòng chọn ít nhất 1 lĩnh vực hoạt động.", status: 400 });
  }
  if (!province || !ward) {
    return fail({ field: "province", message: "Vui lòng chọn tỉnh thành và phường xã.", status: 400 });
  }
  if (!provinceCodeRaw || !wardCodeRaw || !/^\d+$/.test(provinceCodeRaw) || !/^\d+$/.test(wardCodeRaw)) {
    return fail({
      field: "province",
      message: "Địa chỉ tỉnh/phường không hợp lệ. Vui lòng chọn lại.",
      status: 400
    });
  }
  if (!DOANHNGHIEP_REGISTER_ADDRESS_PATTERN.test(addressDetail)) {
    return fail({
      field: "addressDetail",
      message:
        "Địa chỉ chi tiết chỉ gồm chữ, số và khoảng trắng (không ký tự đặc biệt), dài 1-255 ký tự.",
      status: 400
    });
  }
  if (!businessLicenseName) {
    return fail({ field: "businessLicense", message: "Vui lòng đính kèm giấy phép kinh doanh.", status: 400 });
  }
  const licenseDecoded = decodeEnterpriseFilePayload(
    businessLicenseBase64,
    businessLicenseMime,
    ENTERPRISE_LICENSE_MIMES
  );
  if (!licenseDecoded.ok) {
    return fail({ field: "businessLicense", message: licenseDecoded.message, status: 400 });
  }

  if (!companyLogoName) {
    return fail({ field: "companyLogo", message: "Vui lòng tải lên logo công ty.", status: 400 });
  }
  const logoDecoded = decodeEnterpriseFilePayload(companyLogoBase64, companyLogoMime, ENTERPRISE_LOGO_MIMES);
  if (!logoDecoded.ok) {
    return fail({ field: "companyLogo", message: logoDecoded.message, status: 400 });
  }
  if (website && !DOANHNGHIEP_REGISTER_WEBSITE_PATTERN.test(website)) {
    return fail({ field: "website", message: "Website không đúng định dạng.", status: 400 });
  }
  if (!DOANHNGHIEP_REGISTER_LETTER_ONLY_PATTERN.test(representativeName)) {
    return fail({
      field: "representativeName",
      message: "Họ và tên chỉ được nhập ký tự chữ, dài 1-255 ký tự.",
      status: 400
    });
  }
  if (!DOANHNGHIEP_REGISTER_LETTER_ONLY_PATTERN.test(representativeTitle)) {
    return fail({
      field: "representativeTitle",
      message: "Chức vụ chỉ được nhập ký tự chữ, dài 1-255 ký tự.",
      status: 400
    });
  }
  if (!/^\d{8,12}$/.test(phone)) {
    return fail({
      field: "phone",
      message: "Số điện thoại chỉ gồm số và có độ dài 8-12 ký tự.",
      status: 400
    });
  }
  if (!AUTH_EMAIL_REGISTER_PATTERN.test(email)) {
    return fail({ field: "email", message: "Email phải đúng định dạng example@domain.com.", status: 400 });
  }

  const dupEmail = await prisma.user.findUnique({ where: { email } });
  if (dupEmail) {
    return fail({ field: "email", message: "Email đã được đăng ký trong hệ thống.", status: 409 });
  }

  const dupPhone = await prisma.user.findUnique({ where: { phone } });
  if (dupPhone) {
    return fail({ field: "phone", message: "Số điện thoại đã được đăng ký.", status: 409 });
  }

  const enterpriseMeta = { //lưu dữ liệu đăng ký doanh nghiệp vào database
    businessFields,
    province,
    ward,
    provinceCode: provinceCodeRaw,
    wardCode: wardCodeRaw,
    addressDetail,
    businessLicenseName,
    businessLicenseMime: licenseDecoded.mime,
    businessLicenseBase64: licenseDecoded.base64,
    businessLicenseByteLength: licenseDecoded.byteLength,
    companyLogoName,
    companyLogoMime: logoDecoded.mime,
    companyLogoBase64: logoDecoded.base64,
    companyLogoByteLength: logoDecoded.byteLength,
    website: website || null,
    representativeName,
    representativeTitle
  };

  const passwordHash = await hashPassword(taxCode); //hash password

  const userCreate: ValidatedEnterpriseUserCreate = { //tạo dữ liệu đăng ký doanh nghiệp
    email,
    phone,
    passwordHash,
    fullName: representativeName,
    role: "doanhnghiep" as Role,
    enterpriseStatus: "PENDING" as EnterpriseStatus,
    companyName,
    taxCode,
    representativeTitle,
    enterpriseMeta
  };

  return { ok: true, userCreate }; //trả về dữ liệu đăng ký doanh nghiệp
}
