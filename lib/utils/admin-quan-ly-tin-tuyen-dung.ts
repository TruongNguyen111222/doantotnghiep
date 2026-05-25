import type { JobStatus, StatusAction } from "@/lib/types/admin-quan-ly-tin-tuyen-dung"; //type dữ liệu việc làm

export function formatDateVi(iso: string | null | undefined) { //hàm chuyển đổi ngày tháng năm thành định dạng việt nam
  if (!iso) return "—"; //nếu ngày tháng năm không tồn tại thì trả về "—"
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—"; //nếu ngày tháng năm không hợp lệ thì trả về "—"
  return d.toLocaleDateString("vi-VN");
}

export function inferDefaultAction(status: JobStatus): StatusAction { //hàm xác định hành động mặc định
  if (status === "REJECTED") return "reject"; //nếu trạng thái việc làm là "REJECTED" thì trả về "reject"
  if (status === "PENDING") return "approve"; //nếu trạng thái việc làm là "PENDING" thì trả về "approve"
  return "stop";
}

