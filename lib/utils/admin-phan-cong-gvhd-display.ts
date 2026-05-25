import type { StudentDegree, SupervisorDegree } from "@/lib/types/admin-phan-cong-gvhd";
import {
  ADMIN_PHAN_CONG_GVHD_STUDENT_DEGREE_LABEL,
  ADMIN_PHAN_CONG_GVHD_SUPERVISOR_DEGREE_LABEL
} from "@/lib/constants/admin-phan-cong-gvhd";
//hàm hiển thị sinh viên
export function studentDisplay(s: { msv: string; fullName: string; degree: StudentDegree | null }) { //hàm hiển thị sinh viên
  const d = s.degree ? ADMIN_PHAN_CONG_GVHD_STUDENT_DEGREE_LABEL[s.degree] : ""; //lấy label bậc sinh viên
  return `${s.msv}-${s.fullName}${d ? `-${d}` : ""}`; //hiển thị mã sinh viên - họ tên - bậc sinh viên
}

//hàm hiển thị giảng viên hướng dẫn
export function supervisorDisplay(s: { fullName: string; degree: SupervisorDegree | null }) { //hàm hiển thị giảng viên hướng dẫn
  const d = s.degree ? ADMIN_PHAN_CONG_GVHD_SUPERVISOR_DEGREE_LABEL[s.degree] : ""; //lấy label bậc giảng viên hướng dẫn
  return `${d ? `${d}-` : ""}${s.fullName}`; //hiển thị bậc giảng viên hướng dẫn - họ tên giảng viên hướng dẫn
}

