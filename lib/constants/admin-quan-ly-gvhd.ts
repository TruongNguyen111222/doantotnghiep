import type { Degree, Gender } from "@/lib/types/admin-quan-ly-gvhd";

export const ADMIN_QUAN_LY_GVHD_PAGE_SIZE = 10; //số lượng giảng viên trên mỗi trang

export const ADMIN_QUAN_LY_GVHD_NAME_PATTERN = /^[\p{L}\s]{1,255}$/u; //pattern họ tên giảng viên
export const ADMIN_QUAN_LY_GVHD_PHONE_PATTERN = /^\d{8,12}$/; //pattern số điện thoại giảng viên

export const ADMIN_QUAN_LY_GVHD_FACULTY_CUSTOM_VALUE = "__custom__"; //giá trị tùy chỉnh khoa

export const ADMIN_QUAN_LY_GVHD_GENDER_LABEL: Record<Gender, string> = { //label giới tính giảng viên
  MALE: "Nam",
  FEMALE: "Nữ",
  OTHER: "Khác"
};

export const ADMIN_QUAN_LY_GVHD_DEGREE_LABEL: Record<Degree, string> = { //label bậc giảng viên
  MASTER: "Thạc sĩ",
  PHD: "Tiến sĩ",
  ASSOC_PROF: "Phó giáo sư",
  PROF: "Giáo sư"
};

export const ADMIN_QUAN_LY_GVHD_DEGREE_OPTIONS: Array<{ value: Degree; label: string }> = [ //options bậc giảng viên
  { value: "MASTER", label: "Thạc sĩ" },
  { value: "PHD", label: "Tiến sĩ" },
  { value: "ASSOC_PROF", label: "Phó giáo sư" },
  { value: "PROF", label: "Giáo sư" }
];

export const ADMIN_QUAN_LY_GVHD_GENDER_OPTIONS: Array<{ value: Gender; label: string }> = [ //options giới tính giảng viên
  { value: "MALE", label: "Nam" },
  { value: "FEMALE", label: "Nữ" },
  { value: "OTHER", label: "Khác" }
];

export const ADMIN_QUAN_LY_GVHD_EXTERNAL_TEACHER_LABEL = {
  internal: "Giảng viên trong trường",
  external: "Giảng viên ngoài trường"
} as const;

export const ADMIN_QUAN_LY_GVHD_EXTERNAL_TEACHER_FILTER_OPTIONS: Array<{
  value: "all" | "internal" | "external";
  label: string;
}> = [
  { value: "all", label: "Tất cả loại GV" },
  { value: "internal", label: "Giảng viên trong trường" },
  { value: "external", label: "Giảng viên ngoài trường" }
];

