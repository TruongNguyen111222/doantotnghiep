import type { Degree, Gender, SupervisorFormState } from "@/lib/types/admin-quan-ly-gvhd";
import { todayDateInputValue } from "@/lib/utils/admin-quan-ly-gvhd-dates";

export function buildEmptySupervisorFormState(): SupervisorFormState { //hàm tạo form giảng viên
  return {
    fullName: "", //họ tên
    phone: "", //số điện thoại
    email: "", //email
    birthDate: todayDateInputValue(), //ngày sinh
    gender: "", //giới tính
    permanentProvinceCode: "", //mã tỉnh
    permanentWardCode: "", //mã huyện
    faculty: "", //khoa
    facultyCustom: "", //khoa tùy chỉnh
    degree: "" //bậc
  };
} //trả về dữ liệu rỗng cho form giảng viên

// Utility type exports (kept to help tooling autocomplete)
export type { Gender, Degree }; //export type giới tính và bậc giảng viên
