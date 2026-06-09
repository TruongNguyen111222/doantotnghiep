export type InternshipStatus =
  | "NOT_STARTED"
  | "DOING"
  | "SELF_FINANCED"
  | "REPORT_SUBMITTED"
  | "COMPLETED"
  | "REJECTED";

export type InternshipReportReviewStatus = "PENDING" | "REJECTED" | "APPROVED";

export type Gender = "MALE" | "FEMALE" | "OTHER";
export type SupervisorDegree = "MASTER" | "PHD" | "ASSOC_PROF" | "PROF";

export type SupervisorInfo = {
  fullName: string;
  phone: string | null;
  email: string;
  gender: Gender;
  degree: SupervisorDegree;
};

export type StatusHistoryEvent = {
  fromStatus: InternshipStatus;
  toStatus: InternshipStatus;
  at: string | null;
};

export type Report = {
  id: string;
  reviewStatus: InternshipReportReviewStatus;
  submittedAt: string | null;
  supervisorRejectReason: string | null;
  reportFileName: string;
  reportMime: string;
  reportUrl: string;
  enterpriseEvalFileName: string | null;
  enterpriseEvalUrl: string | null;
  supervisorEvaluation: string | null;
  supervisorPoint: number | null;
  enterpriseEvaluation: string | null;
  enterprisePoint: number | null;
};

export type SinhVienBaoCaoThucTapOverviewItem = {
  internshipStatus: InternshipStatus;
  supervisor: SupervisorInfo | null;
  report: Report | null;
  statusHistory: StatusHistoryEvent[];
  ui?: {
    canSubmitReport?: boolean;
    canEditReport?: boolean;
    requiresEnterpriseEval?: boolean;
  };
};

