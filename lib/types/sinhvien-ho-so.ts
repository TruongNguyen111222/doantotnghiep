import type { Gender, StudentDegree, SupervisorDegree } from "./sinhvien-ho-so-shared";
export type { Gender as StudentGender, StudentDegree, SupervisorDegree } from "./sinhvien-ho-so-shared";

export type StudentAccount = { //thông tin tài khoản sinh viên
  msv: string;
  fullName: string;
  className: string;
  faculty: string;
  cohort: string;
  degree: StudentDegree;
  phone: string | null;
  email: string;
  birthDate: string | null;
  gender: Gender;
  address: string | null;
};

export type SupervisorInfo = { //thông tin giảng viên hướng dẫn sinh viên
  fullName: string;
  phone: string | null;
  email: string;
  gender: Gender | null;
  degree: SupervisorDegree | null;
} | null;

export type Province = { code: number; name: string }; //tỉnh/thành phố 
export type Ward = { code: number; name: string };

export type SinhVienHoSoProfile = { //thông tin hồ sơ sinh viên
  currentProvinceCode?: string | null;
  currentProvinceName?: string | null;
  currentWardCode?: string | null;
  currentWardName?: string | null;
  phone?: string | null;
  email?: string | null;
  intro?: string | null;
  cvFileName?: string | null;
  cvMime?: string | null;
  hasCv?: boolean;
};

export type SinhVienHoSoDraft = { //bản nháp hồ sơ sinh viên khi nhập form
  phone: string;
  email: string;
  currentProvinceCode: string;
  currentWardCode: string;
  intro: string;
  cvFileName: string | null;
  cvMime: string | null;
  cvFile: File | null;
};

