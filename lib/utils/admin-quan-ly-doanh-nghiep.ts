import type { EnterpriseStatus } from "@prisma/client";
//xử lý query params cho quản lý doanh nghiệp
//tìm kiếm và lọc theo tên doanh nghiệp, mã số thuế, trạng thái doanh nghiệp

//Tạo query params để gọi API.
export function buildAdminEnterprisesListQueryParams(q: string, status: string) {
  const params = new URLSearchParams(); //tạo URLSearchParams
  if (q.trim()) params.set("q", q.trim());
  if (status !== "all") params.set("status", status); //nếu trạng thái không phải tất cả thì thêm trạng thái vào query params
  return params; //trả về query params chứa  q=fpt&status=APPROVED hoặc q=fpt&status=PENDING để sau gọi API được
}

//Đọc status từ URL và kiểm tra có hợp lệ không.
export function parseAdminEnterprisesStatusQueryParam(st: string | null): EnterpriseStatus | null { //hàm đọc trạng thái từ URL và kiểm tra có hợp lệ không.
  if (!st) return null; //nếu trạng thái là null thì trả về null
  if (st !== "PENDING" && st !== "APPROVED" && st !== "REJECTED") return null; //nếu trạng thái không phải chờ phê duyệt, đã phê duyệt, từ chối thì trả về null
  return st as EnterpriseStatus; //trả về trạng thái doanh nghiệp
}

