export type Gender = "MALE" | "FEMALE" | "OTHER"; //giới tính nam, nữ, khác
export type Degree = "MASTER" | "PHD" | "ASSOC_PROF" | "PROF";

export type ExternalTeacherFilter = "all" | "internal" | "external";

export type SupervisorListItem = { //type dữ liệu giảng viên  
  id: string;
  fullName: string;
  phone: string | null;
  email: string;
  faculty: string;
  degree: Degree;
  isExternalTeacher: boolean;
  birthDate: string | null;
  gender: Gender;
  permanentProvinceCode: string;
  permanentWardCode: string;
  permanentProvinceName: string | null;
  permanentWardName: string | null;
};

export type Province = { code: number; name: string }; //type dữ liệu tỉnh
export type Ward = { code: number; name: string }; //type dữ liệu huyện

export type SupervisorFormState = { //type form giảng viên
  fullName: string;
  phone: string;
  email: string;
  birthDate: string;
  gender: Gender | "";
  permanentProvinceCode: string;
  permanentWardCode: string;
  faculty: string;
  facultyCustom: string;
  degree: Degree | "";
  isExternalTeacher: boolean;
};

