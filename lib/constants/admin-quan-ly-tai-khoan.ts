import type { AccountRow, AccountStatus, Role } from "@/lib/types/admin-quan-ly-tai-khoan";
//lưu trữ các hằng số dùng để dịch mã hệ thống (như ACTIVE, MALE, PHD) thành chữ tiếng Việt hiển thị lên giao diện và cấu 
// hình số lượng dòng phân trang cho bảng quản lý tài khoản.
export const ADMIN_QUAN_LY_TAI_KHOAN_PAGE_SIZE = 10; //số lượng tài khoản trên mỗi trang

export const roleLabel: Record<Role, string> = { //label vai trò
  sinhvien: "SV", //sinh viên
  doanhnghiep: "DN", //doanh nghiệp
  giangvien: "GVHD" //giảng viên
};

export const statusLabel: Record<AccountStatus, string> = { //label trạng thái
  ACTIVE: "Đang hoạt động",
  STOPPED: "Dừng hoạt động"
};

export type StudentDegree = "BACHELOR" | "ENGINEER"; //bậc sinh viên
export type SupervisorDegree = "MASTER" | "PHD" | "ASSOC_PROF" | "PROF"; //bậc giảng viên
export type Gender = "MALE" | "FEMALE" | "OTHER"; //giới tính

export const studentDegreeLabel: Record<StudentDegree, string> = { //label bậc sinh viên
  BACHELOR: "Cử nhân",
  ENGINEER: "Kỹ sư"
};

export const supervisorDegreeLabel: Record<SupervisorDegree, string> = { //label bậc giảng viên
  MASTER: "Thạc sĩ",
  PHD: "Tiến sĩ",
  ASSOC_PROF: "Phó giáo sư",
  PROF: "Giáo sư"
};

export const genderLabel: Record<Gender, string> = { //label giới tính      
  MALE: "Nam", //nam
  FEMALE: "Nữ",
  OTHER: "Khác"
};

// If you want to type viewTarget later, this is a useful anchor.
export type AccountRowForStatusConfirm = Pick<AccountRow, "id" | "role" | "fullName" | "email" | "status">;

