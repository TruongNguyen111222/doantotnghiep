export type WorkType = "PART_TIME" | "FULL_TIME"; //kiểu làm việc

export type InternshipStatus = //trạng thái đăng ký thực tập
  | "NOT_STARTED"
  | "DOING"
  | "SELF_FINANCED"
  | "REPORT_SUBMITTED"
  | "COMPLETED"
  | "REJECTED";

export type SinhVienTraCuuUngTuyenJobDetail = { //thông tin chi tiết tin tuyển dụng
  id: string;
  title: string;
  salary: string;
  expertise: string;
  experienceRequirement: string;
  recruitmentCount: number;
  workType: WorkType;
  deadlineAt: string | null;
  jobDescription: string;
  candidateRequirements: string;
  benefits: string;
  workLocation: string;
  workTime: string;
  applicationMethod: string | null;
  enterprise: {
    companyName: string;
    taxCode: string;
    businessFields: string;
    headquartersAddress: string;
    intro: string | null;
    website: string | null;
  };
  canApply: boolean;
  hasApplied: boolean;
  internshipStatus: InternshipStatus;
};

export type SinhVienApplyProfile = { //thông tin hồ sơ sinh viên
  fullName: string;
  phone: string | null;
  email: string | null;
  intro: string | null;
  cvFileName: string | null;
  cvMime: string | null;
  hasCv: boolean;
};

export type SinhVienApplyDraft = { //thông tin hồ sơ sinh viên
  phone: string;
  email: string;
  intro: string;
  cvFileName: string | null;
  cvMime: string | null;
  cvFile: File | null;
  hasExistingCv: boolean;
  removeCv: boolean;
};

