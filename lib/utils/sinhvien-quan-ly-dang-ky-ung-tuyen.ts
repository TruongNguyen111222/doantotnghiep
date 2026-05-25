import type { AppStatus, ResponseStatus, RespondAction, StatusFilter } from "@/lib/types/sinhvien-quan-ly-dang-ky-ung-tuyen";
import type { SinhVienQuanLyDangKyUngTuyenRow } from "@/lib/types/sinhvien-quan-ly-dang-ky-ung-tuyen";
import {
  SINHVIEN_QUAN_LY_DANG_KY_UNG_TUYEN_ENDPOINT 
} from "@/lib/constants/sinhvien-quan-ly-dang-ky-ung-tuyen";

const APP_STATUS_VALUES: AppStatus[] = [ 
  "PENDING_REVIEW",
  "INTERVIEW_INVITED",
  "OFFERED",
  "REJECTED",
  "STUDENT_DECLINED"
];

export function isAppStatus(value: string): value is AppStatus { //hàm kiểm tra trạng thái
  return APP_STATUS_VALUES.includes(value as AppStatus);
}

export function parseStatusFilterValue(value: string): StatusFilter { //hàm phân tích trạng thái lọc
  if (value === "all") return "all";
  if (isAppStatus(value)) return value;
  return "all";
}

export function buildSinhVienQuanLyDangKyUngTuyenListUrl(statusFilter: StatusFilter): string { //hàm tạo url danh sách ứng tuyển
  const sp = new URLSearchParams();
  if (statusFilter !== "all") sp.set("status", statusFilter);
  const qs = sp.toString();
  return qs ? `${SINHVIEN_QUAN_LY_DANG_KY_UNG_TUYEN_ENDPOINT}?${qs}` : SINHVIEN_QUAN_LY_DANG_KY_UNG_TUYEN_ENDPOINT;
}

export function buildSinhVienQuanLyDangKyUngTuyenRespondEndpoint(applicationId: string): string { //hàm tạo url phản hồi ứng tuyển
  return `${SINHVIEN_QUAN_LY_DANG_KY_UNG_TUYEN_ENDPOINT}/${applicationId}`;
}

export function formatDateVi(iso: string | null): string { //hàm format ngày tháng
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("vi-VN");
}

export function getSinhVienQuanLyDangKyUngTuyenResponseText( //hàm lấy text phản hồi ứng tuyển
  row: Pick<SinhVienQuanLyDangKyUngTuyenRow, "status" | "response">
): string { //hàm lấy text phản hồi ứng tuyển
  const { status, response } = row;
  if (status === "INTERVIEW_INVITED") {
    if (response === "ACCEPTED") return "Đã xác nhận phỏng vấn";
    if (response === "DECLINED") return "Đã từ chối phỏng vấn";
    return "Chưa phản hồi";
  }
  if (status === "OFFERED") {
    if (response === "ACCEPTED") return "Đã xác nhận thực tập";
    if (response === "DECLINED") return "Đã từ chối thực tập";
    return "Chưa phản hồi";
  }
  if (status === "STUDENT_DECLINED") return "Đã từ chối";
  return "—";
}

export function canRespond(status: AppStatus, response: ResponseStatus): boolean { //hàm kiểm tra có thể phản hồi ứng tuyển
  return (status === "INTERVIEW_INVITED" || status === "OFFERED") && response === "PENDING";
}

export function getRespondPayload(action: RespondAction): { action: RespondAction } { //hàm lấy payload phản hồi ứng tuyển
  return { action }; //trả về payload phản hồi ứng tuyển
}

