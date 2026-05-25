import type { StudentFormState } from "@/lib/types/admin-quan-ly-sinh-vien";
import { todayDateInputValue } from "@/lib/utils/admin-quan-ly-sinh-vien-dates";
 //hàm tạo form sinh viên
export function buildEmptyStudentFormState(): StudentFormState {  //hàm tạo form sinh viên
  return { //trả về dữ liệu rỗng cho form sinh viên
    msv: "", //mã sinh viên
    fullName: "", //họ tên
    className: "", //lớp
    faculty: "", //khoa
    facultyCustom: "", //khoa tùy chỉnh
    cohort: "", //khóa
    degree: "", //bậc
    phone: "", //số điện thoại
    email: "", //email
    birthDate: todayDateInputValue(), //ngày sinh
    gender: "", //giới tính
    permanentProvinceCode: "", //mã tỉnh
    permanentWardCode: "" //mã huyện
  }; //trả về dữ liệu rỗng cho form sinh viên
}

