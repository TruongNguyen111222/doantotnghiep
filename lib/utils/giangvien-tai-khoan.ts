import type { Degree, GiangVienMe, GiangVienTaiKhoanDraft, ValidateGiangVienTaiKhoanFormResult } from "@/lib/types/giangvien-tai-khoan";
import {
  PHONE_PATTERN,
  GIANGVIEN_TAI_KHOAN_ERROR_DEGREE_REQUIRED,
  GIANGVIEN_TAI_KHOAN_ERROR_PHONE,
  GIANGVIEN_TAI_KHOAN_ERROR_PROVINCE_INVALID,
  GIANGVIEN_TAI_KHOAN_ERROR_WARD_INVALID,
  GIANGVIEN_TAI_KHOAN_DEFAULT_DEGREE
} from "@/lib/constants/giangvien-tai-khoan";

export function buildGiangVienTaiKhoanDraftFromMe(me: GiangVienMe): GiangVienTaiKhoanDraft { //hàm xử lý tài khoản giảng viên từ me
  return {
    phone: me.phone ?? "", //lấy số điện thoại từ me
    degree: me.degree, //lấy bậc từ me
    provinceCode: me.permanentProvinceCode ?? "", //lấy mã tỉnh/thành từ me
    wardCode: me.permanentWardCode ?? "" //lấy mã phường/xã từ me
  };
}

export function validateGiangVienTaiKhoanForm(args: { //hàm xử lý tài khoản giảng viên form
  phone: string; //số điện thoại
  degree: Degree; //bậc
  provinceCode: string; //mã tỉnh/thành
  wardCode: string; //mã phường/xã
}): ValidateGiangVienTaiKhoanFormResult {
  const { phone, degree, provinceCode, wardCode } = args; //lấy dữ liệu từ form
  const next: Record<string, string> = {};

  if (!PHONE_PATTERN.test(phone.trim())) next.phone = GIANGVIEN_TAI_KHOAN_ERROR_PHONE;
  if (!degree) next.degree = GIANGVIEN_TAI_KHOAN_ERROR_DEGREE_REQUIRED;
  if (!provinceCode || !/^\d+$/.test(provinceCode)) next.permanentProvinceCode = GIANGVIEN_TAI_KHOAN_ERROR_PROVINCE_INVALID;
  if (!wardCode || !/^\d+$/.test(wardCode)) next.permanentWardCode = GIANGVIEN_TAI_KHOAN_ERROR_WARD_INVALID;

  return { 
    isValid: Object.keys(next).length === 0, //trả về true nếu không có lỗi
    errors: next //trả về lỗi nếu có
  };
}
//chạy sau khi submit form - làm sạch dữ liệu trước khi submit
export function buildGiangVienTaiKhoanPatchPayload(args: GiangVienTaiKhoanDraft): {  
  phone: string; //số điện thoại
  degree: Degree; //bậc
  permanentProvinceCode: string; //mã tỉnh/thành
  permanentWardCode: string; //mã phường/xã
} {
  return { //trả về dữ liệu từ form
    phone: args.phone.trim(),
    degree: args.degree, //lấy bậc từ form
    permanentProvinceCode: args.provinceCode, //lấy mã tỉnh/thành từ form
    permanentWardCode: args.wardCode //lấy mã phường/xã từ form
  };
}

//chạy trc khi submit form ,bù dữ liệu nếu thiếu
export function normalizeGiangVienTaiKhoanDraft(args: { //hàm xử lý tài khoản giảng viên form
  phone: string;
  degree?: Degree;
  provinceCode: string;
  wardCode: string;
}): GiangVienTaiKhoanDraft {
  return { //trả về dữ liệu từ form
    phone: args.phone, //lấy số điện thoại từ form
    degree: args.degree || GIANGVIEN_TAI_KHOAN_DEFAULT_DEGREE, //lấy bậc từ form
    provinceCode: args.provinceCode, //lấy mã tỉnh/thành từ form
    wardCode: args.wardCode //lấy mã phường/xã từ form
  };
}

export function formatDateVi(iso: string | null): string { //hàm xử lý ngày tháng năm
  if (!iso) return "—"; //trả về "—" nếu ngày tháng năm là null
  const d = new Date(iso); //lấy ngày tháng năm từ iso
  if (Number.isNaN(d.getTime())) return "—"; //trả về "—" nếu ngày tháng năm là invalid
  return d.toLocaleDateString("vi-VN"); //trả về ngày tháng năm theo định dạng việt nam
}

