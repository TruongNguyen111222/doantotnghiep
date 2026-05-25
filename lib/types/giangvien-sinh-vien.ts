export type Degree = "BACHELOR" | "ENGINEER"; //hàm xử lý bậc giảng viên
export type GuidanceStatus = "GUIDING" | "COMPLETED"; //hàm xử lý trạng thái hướng dẫn
export type Gender = "MALE" | "FEMALE" | "OTHER"; //hàm xử lý giới tính
export type InternshipStatus = //hàm xử lý trạng thái thực tập
  | "NOT_STARTED" //chưa bắt đầu
  | "DOING" //đang thực tập
  | "SELF_FINANCED" //thực tập tự túc
  | "REPORT_SUBMITTED" //báo cáo đã nộp 
  | "COMPLETED" //hoàn thành thực tập
  | "REJECTED" //từ chối thực tập

export type InternshipHistoryEvent = { //hàm xử lý lịch sử thực tập
  fromStatus: InternshipStatus; //trạng thái trước
  toStatus: InternshipStatus; //trạng thái sau
  at: string | null; //thời gian
};

export type GuidanceHistoryEvent = { //hàm xử lý lịch sử hướng dẫn
  fromStatus: GuidanceStatus; //trạng thái trước
  toStatus: GuidanceStatus; //trạng thái sau
  at: string | null; //thời gian
};

export type InternshipReport = { //hàm xử lý báo cáo thực tập
  id: string; //id
  reportFileName: string; //tên file
  reportUrl: string; //url
  reviewStatus: string; //trạng thái review
  supervisorEvaluation: string | null; //đánh giá giảng viên
  supervisorPoint: number | null; //điểm giảng viên
  enterpriseEvaluation: string | null; //đánh giá doanh nghiệp
  enterprisePoint: number | null; //điểm doanh nghiệp
};

export type Row = { //hàm xử lý dữ liệu sinh viên
  id: string; //id
  stt: number; //số thứ tự
  msv: string; //mã sinh viên
  fullName: string; //họ tên
  className: string; //lớp
  faculty: string; //khoa
  cohort: string; //nhóm
  degree: Degree; //bậc
  guidanceStatus: GuidanceStatus; //trạng thái hướng dẫn
  guidanceStatusLabel: string; //label trạng thái hướng dẫn
  phone: string | null; //số điện thoại
  email: string; //email
  birthDate: string | null; //ngày sinh
  gender: Gender; //giới tính
  permanentAddress: string; //địa chỉ
  internshipStatus: InternshipStatus; //trạng thái thực tập
  internshipStatusHistory: InternshipHistoryEvent[]; //lịch sử thực tập
  guidanceStatusHistory: GuidanceHistoryEvent[];
  report: InternshipReport | null;
};

export type BatchOption = { id: string; name: string }; //hàm xử lý đợt thực tập
