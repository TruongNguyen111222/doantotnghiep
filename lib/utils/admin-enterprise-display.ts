//xử lý hiển thị cho quản lý doanh nghiệp. 
//FPT-123456
//Đã phê duyệt — Đang hoạt động ,xử lý hiển thị ở xác nhận phê duyệt hay ko
//xử lý trả về strinh 
import { EnterpriseStatus } from "@prisma/client";
import type { AdminEnterpriseListItem } from "@/lib/types/admin";
import { formatEnterpriseStatusVi, normalizeEnterpriseStatus } from "@/lib/utils/enterprise-admin-display";

//Hiển thị tên doanh nghiệp và mã số thuế
export function companyTaxLabel(row: Pick<AdminEnterpriseListItem, "companyName" | "taxCode">): string { //hàm hiển thị tên doanh nghiệp và mã số thuế
  const name = row.companyName || "—"; //nếu tên doanh nghiệp là null thì trả về "—"
  const tax = row.taxCode || "—"; //nếu mã số thuế là null thì trả về "—"
  return `${name}-${tax}`; //trả về tên doanh nghiệp và mã số thuế
}

/** Dòng trạng thái trong bảng / modal (có hậu tố khi đã phê duyệt). */ //Hiển thị trạng thái doanh nghiệp trong bảng / modal (có hậu tố khi đã phê duyệt).
export function formatAdminEnterpriseStatusLine(status: EnterpriseStatus | null | undefined): string { //hàm hiển thị trạng thái doanh nghiệp trong bảng / modal (có hậu tố khi đã phê duyệt).
  const st = normalizeEnterpriseStatus(status); //nếu trạng thái doanh nghiệp là null thì coi như chờ phê duyệt
  if (st === EnterpriseStatus.APPROVED) { //nếu trạng thái doanh nghiệp là đã phê duyệt thì trả về "Đã phê duyệt — Đang hoạt động"
    return `${formatEnterpriseStatusVi(st)} — Đang hoạt động`; //trả về "Đã phê duyệt — Đang hoạt động"
  }
  return formatEnterpriseStatusVi(st); //trả về trạng thái doanh nghiệp
}

//Hiển thị trạng thái doanh nghiệp và trạng thái khóa doanh nghiệp
export function formatAdminEnterpriseStatusWithLock(args: { //hàm hiển thị trạng thái doanh nghiệp và trạng thái khóa doanh nghiệp
  enterpriseStatus: EnterpriseStatus | null | undefined; //trạng thái doanh nghiệp
  isLocked: boolean | null | undefined; //trạng thái khóa doanh nghiệp
}): string {
  const st = normalizeEnterpriseStatus(args.enterpriseStatus); //nếu trạng thái doanh nghiệp là null thì coi như chờ phê duyệt
  if (st !== EnterpriseStatus.APPROVED) return formatEnterpriseStatusVi(st); //nếu trạng thái doanh nghiệp không phải đã phê duyệt thì trả về trạng thái doanh nghiệp
  return `${formatEnterpriseStatusVi(st)} — ${args.isLocked ? "Dừng hoạt động" : "Đang hoạt động"}`; //trả về "Đã phê duyệt — Đang hoạt động" hoặc "Đã phê duyệt — Dừng hoạt động"
}
