export type Degree = "BACHELOR" | "ENGINEER"; //trình độ học vấn

export type InternshipStatus =
  | "NOT_STARTED" //chưa bắt đầu
  | "DOING" //đang thực tập
  | "SELF_FINANCED" //tự tài trợ
  | "REPORT_SUBMITTED" //báo cáo đã nộp
  | "COMPLETED" //hoàn thành
  | "REJECTED"; //bị từ chối

export type ReportReviewStatus = "PENDING" | "REJECTED" | "APPROVED"; //trạng thái review báo cáo
 
export type ListRow = { //dòng danh sách tiến độ thực tập
  id: string; //id sinh viên
  msv: string; //mã sinh viên
  fullName: string; //tên sinh viên
  className: string; //lớp sinh viên
  faculty: string; //khoa sinh viên
  cohort: string; //nhóm sinh viên
  degree: Degree; //trình độ học vấn
  internshipStatus: InternshipStatus; //trạng thái thực tập
  reportReviewStatus: ReportReviewStatus | null; //trạng thái review báo cáo
  statusLabel: string; //nhãn trạng thái
  canFinalUpdate: boolean; //có thể cập nhật cuối cùng
};

export type Detail = { //chi tiết tiến độ thực tập
  student: { //sinh viên
    id: string;
    msv: string;
    fullName: string; //tên sinh viên
    className: string; //lớp sinh viên
    faculty: string; //khoa sinh viên
    cohort: string; //nhóm sinh viên
    degree: Degree; //trình độ học vấn
    phone: string | null; //số điện thoại sinh viên
    email: string; //email sinh viên
  };
  supervisor: //giảng viên hướng dẫn
    | null
    | {
        fullName: string;
        degree: string | null;
        phone: string | null;
        email: string;
      };
  enterprise: null | { companyName: string; position: string };
  internshipStatus: InternshipStatus;
  statusLabel: string;
  report:
    | null
    | {
        id: string;
        reviewStatus: ReportReviewStatus;
        reportFileName: string;
        reportUrl: string;
        supervisorEvaluation: string | null;
        supervisorPoint: number | null;
        enterpriseEvaluation: string | null;
        enterprisePoint: number | null;
        supervisorRejectReason: string | null;
        submittedAt: string | null;
        reviewedAt: string | null;
      };
  history: Array<{
    fromStatus: InternshipStatus;
    toStatus: InternshipStatus;
    at: string | null;
    byRole: string;
    message: string | null;
  }>;
  ui: { canFinalUpdate: boolean };
};

