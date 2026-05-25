export type Degree = "MASTER" | "PHD" | "ASSOC_PROF" | "PROF"; //bậc giảng viên
export type Gender = "MALE" | "FEMALE" | "OTHER";

export type Province = { code: number; name: string }; //kiểu dữ liệu tỉnh/thành
export type Ward = { code: number; name: string }; //kiểu dữ liệu phường/xã

export type GiangVienMe = { //kiểu dữ liệu giảng viên
  fullName: string; //họ tên
  email: string; //email
  phone: string | null; //số điện thoại
  birthDate: string | null; //ngày sinh
  gender: Gender; //giới tính
  faculty: string; //khoa
  degree: Degree; //bậc
  permanentProvinceCode: string; //mã tỉnh/thành
  permanentProvinceName: string | null; //tên tỉnh/thành
  permanentWardCode: string; //mã phường/xã
  permanentWardName: string | null; //tên phường/xã
};

export type GiangVienTaiKhoanDraft = { //kiểu dữ liệu tài khoản giảng viên
  phone: string; //số điện thoại
  degree: Degree; //bậc
  provinceCode: string; //mã tỉnh/thành
  wardCode: string; //mã phường/xã
};

export type ValidateGiangVienTaiKhoanFormResult = { //kiểu dữ liệu kết quả xử lý tài khoản giảng viên form
  isValid: boolean;
  errors: Record<string, string>; //lỗi nếu có
};

