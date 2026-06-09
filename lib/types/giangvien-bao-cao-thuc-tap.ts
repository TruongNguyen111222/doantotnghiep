export type Degree = "BACHELOR" | "ENGINEER";

export type InternshipStatus =
  | "NOT_STARTED"
  | "DOING"
  | "SELF_FINANCED"
  | "REPORT_SUBMITTED"
  | "COMPLETED"
  | "REJECTED";

export type ReportReviewStatus = "PENDING" | "REJECTED" | "APPROVED";

export type Report = {
  id: string;
  reviewStatus: ReportReviewStatus;
  reportFileName: string;
  reportMime: string;
  enterpriseEvalFileName: string | null;
  supervisorRejectReason: string | null;
  supervisorEvaluation: string | null;
  supervisorPoint: number | null;
  enterpriseEvaluation: string | null;
  enterprisePoint: number | null;
};

export type Row = {
  studentProfileId: string;
  msv: string;
  fullName: string;
  cohort: string;
  degree: Degree;
  internshipStatus: InternshipStatus;
  statusText: string;
  phone: string | null;
  email: string;
  birthDate: string | null;
  gender: string | null;
  permanentAddress: string;
  className: string;
  faculty: string;
  internshipBatch: { startDate: string | null; endDate: string | null } | null;
  enterprise: null | { companyName: string; taxCode: string | null; headquartersAddress: string };
  report: null | Report;
  ui: { canUpdateInternshipStatus: boolean; canReviewReport: boolean };
};

