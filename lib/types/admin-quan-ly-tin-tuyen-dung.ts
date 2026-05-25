export type JobStatus = "PENDING" | "REJECTED" | "ACTIVE" | "STOPPED"; //trạng thái việc làm
export type WorkType = "PART_TIME" | "FULL_TIME"; //loại hình làm việc

export type ApiResponse<T> = { //type dữ liệu trả về từ API
  success: boolean; //trạng thái thành công
  message?: string; //thông báo lỗi
  item?: T; //dữ liệu chi tiết
  items?: T[]; //danh sách dữ liệu
  errors?: Record<string, string>;
};

export type InternshipBatchRow = { //type dữ liệu đợt thực tập
  id: string; //mã đợt thực tập
  name: string; //tên đợt thực tập
  semester: string; //học kỳ
  schoolYear: string; //năm học
};

export type JobListItem = { //type dữ liệu việc làm
  id: string; //mã việc làm
  title: string; //tiêu đề việc làm
  createdAt: string | null; //ngày tạo
  recruitmentCount: number; //số lượng tuyển dụng
  expertise: string; //chuyên môn
  workType: WorkType; //loại hình làm việc
  status: JobStatus; //trạng thái việc làm
  deadlineAt: string | null; //ngày hết hạn
  enterpriseName: string | null; //tên doanh nghiệp
  batchName: string | null; //tên đợt thực tập
  enterpriseTaxCode: string | null; //mã số thuế doanh nghiệp
  rejectionReason: string | null;
};

export type JobDetailResponse = { //type dữ liệu chi tiết việc làm
  job: {
    id: string; //mã việc làm
    title: string; //tiêu đề việc làm
    createdAt: string | null; //ngày tạo
    recruitmentCount: number; //số lượng tuyển dụng
    expertise: string; //chuyên môn
    workType: WorkType;
    status: JobStatus; //trạng thái việc làm
    deadlineAt: string | null; //ngày hết hạn
    salary: string; //lương
    experienceRequirement: string; //yêu cầu kinh nghiệm
    jobDescription: string;
    candidateRequirements: string;
    benefits: string;
    workLocation: string; //địa điểm làm việc
    workTime: string; //thời gian làm việc
    applicationMethod: string | null; 
    companyIntro: string | null; //giới thiệu doanh nghiệp
    companyWebsite: string | null; //website doanh nghiệp
    rejectionReason: string | null;
  };
  enterprise: {
    companyName: string | null;
    taxCode: string | null;
    businessFields: string;
    headquartersAddress: string;
  };
  batch: { id: string | null; name: string | null };
};

export type StatusAction = "approve" | "reject" | "stop"; //trạng thái hành động

