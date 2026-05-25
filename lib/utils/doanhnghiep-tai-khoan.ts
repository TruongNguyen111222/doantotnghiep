import type { AdminEnterpriseDetail } from "@/lib/types/admin";
import type { EnterpriseAccountFormState } from "@/lib/types/doanhnghiep-tai-khoan"; //kiểu dữ liệu trả về từ API
import {
  ENTERPRISE_ACCOUNT_ERROR_EMAIL,
  ENTERPRISE_ACCOUNT_ERROR_ADDRESS,
  ENTERPRISE_ACCOUNT_ERROR_REPRESENTATIVE_NAME,
  ENTERPRISE_ACCOUNT_ERROR_REPRESENTATIVE_TITLE,
  ENTERPRISE_ACCOUNT_ERROR_PROVINCE,
  ENTERPRISE_ACCOUNT_ERROR_WARD,
  ENTERPRISE_ACCOUNT_ERROR_WEBSITE
} from "@/lib/constants/doanhnghiep-tai-khoan"; //hằng số cho API
import { PHONE_ERROR, PHONE_PATTERN } from "@/lib/constants/sinhvien-ho-so"; //hằng số cho API
import { AUTH_EMAIL_REGISTER_PATTERN } from "@/lib/constants/auth/patterns"; //hằng số cho API
import {
  DOANHNGHIEP_REGISTER_ADDRESS_PATTERN,
  DOANHNGHIEP_REGISTER_LETTER_ONLY_PATTERN,
  DOANHNGHIEP_REGISTER_WEBSITE_PATTERN
} from "@/lib/constants/doanhnghiep"; //hằng số cho API
import { metaRecord } from "@/lib/utils/enterprise-meta"; //hàm xử lý thông tin doanh nghiệp

export function mapEnterpriseAccountFormFromMe(item: AdminEnterpriseDetail): EnterpriseAccountFormState { //hàm xử lý form doanh nghiệp
  const m = metaRecord(item.enterpriseMeta); //lấy thông tin doanh nghiệp

  const representativeName = //lấy tên người đại diện
    typeof m.representativeName === "string" && m.representativeName.trim()
      ? m.representativeName.trim()
      : item.fullName || ""; //lấy tên người đại diện

  const representativeTitle = //lấy chức vụ người đại diện
    typeof m.representativeTitle === "string" && m.representativeTitle.trim()
      ? m.representativeTitle.trim()
      : typeof item.representativeTitle === "string"
        ? item.representativeTitle
        : ""; //lấy chức vụ người đại diện

  const companyIntro = typeof m.companyIntro === "string" ? m.companyIntro : typeof m.intro === "string" ? m.intro : ""; //lấy giới thiệu doanh nghiệp

  const website = typeof m.website === "string" ? m.website.trim() : ""; //lấy website doanh nghiệp

  const provinceCode = typeof m.provinceCode === "string" ? m.provinceCode.trim() : ""; //lấy mã tỉnh/thành
  const wardCode = typeof m.wardCode === "string" ? m.wardCode.trim() : ""; //lấy mã phường/xã
  const provinceName = typeof m.province === "string" ? m.province.trim() : ""; //lấy tên tỉnh/thành
  const wardName = typeof m.ward === "string" ? m.ward.trim() : ""; //lấy tên phường/xã
  const addressDetail = typeof m.addressDetail === "string" ? m.addressDetail : ""; //lấy địa chỉ chi tiết

  return { //trả về form doanh nghiệp
    email: (item.email || "").trim(),
    phone: (item.phone || "").trim(),
    representativeName,
    representativeTitle,
    companyIntro,
    website,
    provinceCode,
    wardCode,
    provinceName,
    wardName,
    addressDetail
  };
}

export function validateEnterpriseAccountForm(form: EnterpriseAccountFormState): { //hàm kiểm tra form doanh nghiệp
  isValid: boolean;
  errors: Record<string, string>;
} { //trả về dữ liệu kiểm tra form doanh nghiệp
  const next: Record<string, string> = {}; //lấy dữ liệu kiểm tra form doanh nghiệp

  const emailNorm = form.email.trim().toLowerCase(); //lấy email doanh nghiệp
  if (!emailNorm || !AUTH_EMAIL_REGISTER_PATTERN.test(emailNorm)) {
    next.email = ENTERPRISE_ACCOUNT_ERROR_EMAIL; //lấy lỗi email
  }
  const phoneTrim = form.phone.trim(); //lấy số điện thoại doanh nghiệp
  if (!phoneTrim || !PHONE_PATTERN.test(phoneTrim)) {
    next.phone = PHONE_ERROR; //lấy lỗi số điện thoại 
  }

  if (!form.representativeName || !DOANHNGHIEP_REGISTER_LETTER_ONLY_PATTERN.test(form.representativeName)) { 
    next.representativeName = ENTERPRISE_ACCOUNT_ERROR_REPRESENTATIVE_NAME; //lấy lỗi tên người đại diện
  }
  if (!form.representativeTitle || !DOANHNGHIEP_REGISTER_LETTER_ONLY_PATTERN.test(form.representativeTitle)) {
    next.representativeTitle = ENTERPRISE_ACCOUNT_ERROR_REPRESENTATIVE_TITLE;
  }
  if (form.website && !DOANHNGHIEP_REGISTER_WEBSITE_PATTERN.test(form.website.trim())) { //lấy lỗi website
    next.website = ENTERPRISE_ACCOUNT_ERROR_WEBSITE; //lấy lỗi website
  }

  const provinceCode = form.provinceCode.trim(); //lấy mã tỉnh/thành
  const wardCode = form.wardCode.trim(); //lấy mã phường/xã
  const provinceName = form.provinceName.trim(); //lấy tên tỉnh/thành
  const wardName = form.wardName.trim(); //lấy tên phường/xã
  const addressDetail = form.addressDetail.trim(); //lấy địa chỉ chi tiết
  if (!provinceCode || !/^\d+$/.test(provinceCode) || !provinceName) { //lấy lỗi tỉnh/thành
    next.provinceCode = ENTERPRISE_ACCOUNT_ERROR_PROVINCE; //lấy lỗi tỉnh/thành
  }
  if (!wardCode || !/^\d+$/.test(wardCode) || !wardName) { //lấy lỗi phường/xã
    next.wardCode = ENTERPRISE_ACCOUNT_ERROR_WARD; //lấy lỗi phường/xã
  }
  if (!DOANHNGHIEP_REGISTER_ADDRESS_PATTERN.test(addressDetail)) { //lấy lỗi địa chỉ chi tiết
    next.addressDetail = ENTERPRISE_ACCOUNT_ERROR_ADDRESS; //lấy lỗi địa chỉ chi tiết
  }

  return {
    isValid: Object.keys(next).length === 0, //trả về true nếu không có lỗi
    errors: next //trả về dữ liệu kiểm tra form doanh nghiệp
  };
}

export function buildEnterpriseAccountPatchPayload(form: EnterpriseAccountFormState): { //hàm xây dựng payload đăng ký doanh nghiệp
  email: string; //email doanh nghiệp
  phone: string; //số điện thoại doanh nghiệp
  representativeName: string; //tên người đại diện doanh nghiệp
  representativeTitle: string; //chức vụ người đại diện doanh nghiệp
  companyIntro: string | null; //giới thiệu doanh nghiệp
  website: string | null; //website doanh nghiệp
  province: string;
  ward: string;
  provinceCode: string;
  wardCode: string;
  addressDetail: string;
} {
  return { //trả về payload đăng ký doanh nghiệp
    email: form.email.trim().toLowerCase(),
    phone: form.phone.trim(),
    representativeName: form.representativeName.trim(),
    representativeTitle: form.representativeTitle.trim(),
    companyIntro: form.companyIntro.trim() ? form.companyIntro.trim() : null,
    website: form.website.trim() ? form.website.trim() : null,
    province: form.provinceName.trim(),
    ward: form.wardName.trim(),
    provinceCode: form.provinceCode.trim(),
    wardCode: form.wardCode.trim(),
    addressDetail: form.addressDetail.trim()
  };
}

