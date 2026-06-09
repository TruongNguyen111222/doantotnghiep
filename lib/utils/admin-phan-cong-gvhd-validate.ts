import type { SupervisorDegree } from "@/lib/types/admin-phan-cong-gvhd";
import { ADMIN_PHAN_CONG_GVHD_SUPERVISOR_DEGREE_LABEL } from "@/lib/constants/admin-phan-cong-gvhd";

export const ADMIN_PHAN_CONG_GVHD_MIN_STUDENTS = 3;

export const ADMIN_PHAN_CONG_GVHD_MAX_STUDENTS_BY_DEGREE: Record<SupervisorDegree, number> = {
  PHD: 5,
  MASTER: 7,
  ASSOC_PROF: 9,
  PROF: 11
};

export function validatePhanCongStudentCount(args: {
  supervisorFullName: string;
  supervisorDegree: SupervisorDegree;
  currentAssignedCount: number;
  newStudentCount: number;
}): string | null {
  const { supervisorFullName, supervisorDegree, currentAssignedCount, newStudentCount } = args;

  if (newStudentCount < ADMIN_PHAN_CONG_GVHD_MIN_STUDENTS) {
    return "Giảng viên phải được phân công tối thiểu 3 sinh viên.";
  }

  const maxAllowed = ADMIN_PHAN_CONG_GVHD_MAX_STUDENTS_BY_DEGREE[supervisorDegree];
  const totalAfter = currentAssignedCount + newStudentCount;
  if (totalAfter > maxAllowed) {
    return `Giảng viên ${supervisorFullName} chỉ được hướng dẫn tối đa ${maxAllowed} sinh viên theo quy định.`;
  }

  return null;
}

export function getSupervisorDegreeLabel(degree: SupervisorDegree): string {
  return ADMIN_PHAN_CONG_GVHD_SUPERVISOR_DEGREE_LABEL[degree] ?? degree;
}
