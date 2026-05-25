export type WorkType = "PART_TIME" | "FULL_TIME"; //kiểu làm việc

export type InternshipStatus = //trạng thái đăng ký thực tập
  | "NOT_STARTED"
  | "DOING"
  | "SELF_FINANCED"
  | "REPORT_SUBMITTED"
  | "COMPLETED"
  | "REJECTED";

export type SinhVienTraCuuUngTuyenItem = { //thông tin tin tuyển dụng
  id: string;
  title: string;
  companyName: string;
  address: string;
  businessField: string;
  expertise: string;
  salary: string;
  experienceRequirement: string;
  workType: WorkType;
  deadlineAt: string | null;
  hasApplied: boolean;
};

export type WorkTypeFilter = "all" | WorkType; //kiểu làm việc

