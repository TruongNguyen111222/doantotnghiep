export type JobStatus = "PENDING" | "REJECTED" | "ACTIVE" | "STOPPED"; //trạng thái tin tuyển dụng

export type JobRow = { //kiểu dữ liệu cho dòng tin tuyển dụng
  id: string; //id tin tuyển dụng
  title: string; //tiêu đề tin tuyển dụng
  createdAt: string | null; //ngày đăng tin tuyển dụng
  deadlineAt: string | null; //hạn tuyển dụng
  recruitmentCount: number; //số lượng tuyển dụng
  applicantCount: number; //số lượng ứng viên
  status: JobStatus; //trạng thái tin tuyển dụng
};

