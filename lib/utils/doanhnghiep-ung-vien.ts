import type { JobRow, JobStatus } from "@/lib/types/doanhnghiep-ung-vien";
import { DOANHNGHIEP_UNG_VIEN_ENDPOINT, DOANHNGHIEP_UNG_VIEN_ERROR_DEFAULT } from "@/lib/constants/doanhnghiep-ung-vien";
import { DOANHNGHIEP_UNG_VIEN_STATUS_LABEL } from "@/lib/constants/doanhnghiep-ung-vien"; //constants cho trạng thái tin tuyển dụng
import type { JobRow as _JobRow } from "@/lib/types/doanhnghiep-ung-vien";

export function formatDateVi(iso: string | null): string {  //hàm chuyển đổi ngày thành định dạng việt nam
  if (!iso) return "—"; //nếu ngày không tồn tại thì trả về "—"
  const d = new Date(iso); //tạo đối tượng Date từ chuỗi ngày
  if (Number.isNaN(d.getTime())) return "—"; //nếu ngày không hợp lệ thì trả về "—"
  return d.toLocaleDateString("vi-VN"); //trả về định dạng việt nam
}

export function buildDoanhNghiepUngVienListUrl(args: { //hàm xây dựng URL danh sách tin tuyển dụng
  origin: string;
  q: string;
  createdDate: string;
  deadlineDate: string;
  status: JobStatus | "all";
}): URL {
  const url = new URL(DOANHNGHIEP_UNG_VIEN_ENDPOINT, args.origin);
  if (args.q.trim()) url.searchParams.set("q", args.q.trim());
  if (args.createdDate) url.searchParams.set("createdDate", args.createdDate);
  if (args.deadlineDate) url.searchParams.set("deadlineDate", args.deadlineDate);
  if (args.status !== "all") url.searchParams.set("status", args.status);
  return url;
}

export function getDoanhNghiepUngVienLoadErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message || DOANHNGHIEP_UNG_VIEN_ERROR_DEFAULT;
  return DOANHNGHIEP_UNG_VIEN_ERROR_DEFAULT;
}

