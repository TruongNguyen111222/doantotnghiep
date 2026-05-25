import type { AssignmentStatus, StudentDegree, SupervisorDegree } from "@/lib/types/admin-phan-cong-gvhd";
 //constants phân công giảng viên hướng dẫn
export const ADMIN_PHAN_CONG_GVHD_PAGE_SIZE = 10; //số lượng phân công giảng viên hướng dẫn trên mỗi trang
export const ADMIN_PHAN_CONG_GVHD_TABLE_STUDENTS_MAX_LINES = 2; //số lượng sinh viên trên mỗi dòng trong bảng phân công giảng viên hướng dẫn

export const ADMIN_PHAN_CONG_GVHD_STATUS_LABEL: Record<AssignmentStatus, string> = { //label trạng thái phân công giảng viên hướng dẫn
  GUIDING: "Đang hướng dẫn",
  COMPLETED: "Hoàn thành hướng dẫn"
};

export const ADMIN_PHAN_CONG_GVHD_STUDENT_DEGREE_LABEL: Record<StudentDegree, string> = { //label bậc sinh viên
  BACHELOR: "Cử nhân",
  ENGINEER: "Kỹ sư"
};

export const ADMIN_PHAN_CONG_GVHD_SUPERVISOR_DEGREE_LABEL: Record<SupervisorDegree, string> = { //label bậc giảng viên hướng dẫn
  MASTER: "Thạc sĩ",
  PHD: "Tiến sĩ",
  ASSOC_PROF: "Phó giáo sư",
  PROF: "Giáo sư"
};

