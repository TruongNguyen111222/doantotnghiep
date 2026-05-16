import { EnterpriseStatus } from "@prisma/client";
//hiển thị trạng thái doanh nghiệp - để hỗ trợ hiển thị dữ liệu doanh nghiệp”.
const STATUS_LABEL: Record<EnterpriseStatus, string> = { //map trạng thái doanh nghiệp
  PENDING: "Chờ phê duyệt",
  APPROVED: "Đã phê duyệt",
  REJECTED: "Từ chối"
};

/** DN cũ có thể có enterpriseStatus null — coi như chờ phê duyệt cho UI & nghiệp vụ. */
export function normalizeEnterpriseStatus(status: EnterpriseStatus | null | undefined): EnterpriseStatus {
  return status ?? EnterpriseStatus.PENDING; //nếu trạng thái doanh nghiệp là null thì coi như chờ phê duyệt
}

export function formatEnterpriseStatusVi(status: EnterpriseStatus | null | undefined): string { //hàm format trạng thái doanh nghiệp
  const n = normalizeEnterpriseStatus(status);
  return STATUS_LABEL[n] ?? String(n);//Đổi status thành tiếng Việt hoàn chỉnh.
}
//ghép địa chỉ trụ sở chính doanh nghiệp
export function buildEnterpriseHeadquartersAddress(meta: unknown): string { //hàm xây dựng địa chỉ trụ sở chính doanh nghiệp
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return "—"; //nếu meta không hợp lệ thì trả về "—"
  const m = meta as Record<string, unknown>;
  const parts = [m.addressDetail, m.ward, m.province].filter((x) => typeof x === "string" && String(x).trim()); //lấy địa chỉ chi tiết, phường, tỉnh
  return parts.length ? parts.map(String).join(", ") : "—"; //nếu có địa chỉ thì trả về địa chỉ, nếu không thì trả về "—"
}

/** Lĩnh vực hoạt động dạng chuỗi hiển thị */ //Hiển thị lĩnh vực hoạt động thành chuỗi đẹp.
export function formatBusinessFields(meta: unknown): string { //hàm format lĩnh vực hoạt động doanh nghiệp
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return "—"; //nếu meta không hợp lệ thì trả về "—"
  const fields = (meta as Record<string, unknown>).businessFields;
  if (!Array.isArray(fields) || !fields.length) return "—"; //nếu fields không hợp lệ thì trả về "—"
  return fields.map(String).join(", "); //nếu có fields thì trả về fields, nếu không thì trả về "—"
}
//Biến chuỗi base64 thành link ảnh để <img> hiển thị được
export function dataUrlFromBase64(mime: string, base64: string): string {
  return `data:${mime};base64,${base64}`; //trả về link ảnh
}
