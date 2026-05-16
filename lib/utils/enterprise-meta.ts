//xử lý thông tin doanh nghiệp
export function metaRecord(meta: unknown): Record<string, unknown> {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return {};
  return meta as Record<string, unknown>;
}

/** Bỏ base64 nặng khỏi enterpriseMeta khi trả API admin (danh sách / chi tiết). */
export function stripHeavyEnterpriseMeta(meta: unknown): unknown { //hàm xóa base64 nặng khỏi enterpriseMeta khi trả API admin (danh sách / chi tiết).
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return meta;
  const m = { ...(meta as Record<string, unknown>) }; //lấy meta
  delete m.businessLicenseBase64; //xóa base64 nặng khỏi businessLicenseBase64
  delete m.companyLogoBase64; //xóa base64 nặng khỏi companyLogoBase64
  return m; //trả về meta
}

/** Một dòng tóm tắt địa chỉ / lĩnh vực cho bảng danh sách. */
export function formatEnterpriseMetaSummary(meta: unknown): string { //hàm format địa chỉ / lĩnh vực cho bảng danh sách.
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return "—";
  const m = meta as Record<string, unknown>; //lấy meta
  const fields = m.businessFields; //lấy businessFields
  const parts: string[] = []; //lấy 
  if (typeof m.province === "string") parts.push(m.province); //lấy province
  if (typeof m.ward === "string") parts.push(m.ward); //lấy ward
  if (Array.isArray(fields) && fields.length) parts.push(String(fields.join(", "))); //lấy businessFields
  return parts.length ? parts.join(" · ") : "—"; //trả về parts
}

export type EnterpriseMetaDetailRow = { label: string; value: string }; //kiểu dữ liệu cho các trường hiển thị trên trang chi tiết hồ sơ DN (không có nội dung file).

/** Các trường hiển thị trên trang chi tiết hồ sơ DN (không có nội dung file). */
export function buildEnterpriseMetaDetailRows(meta: unknown): EnterpriseMetaDetailRow[] { //hàm xây dựng các trường hiển thị trên trang chi tiết hồ sơ DN (không có nội dung file).
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return []; //nếu meta không hợp lệ thì trả về empty array
  const m = meta as Record<string, unknown>; //lấy meta
  const out: EnterpriseMetaDetailRow[] = []; //lấy out

  const push = (label: string, v: unknown) => { //hàm push
    if (v === undefined || v === null || v === "") return;
    if (Array.isArray(v)) {
      if (v.length) out.push({ label, value: v.map(String).join(", ") }); //nếu v có length thì push vào out
      return; //nếu v không có length thì không push vào out
    }
    out.push({ label, value: String(v) }); //nếu v không có length thì push vào out
  };
/** Các trường hiển thị trên trang chi tiết hồ sơ DN (không có nội dung file). */
  push("Lĩnh vực hoạt động", m.businessFields); //push businessFields vào out
  push("Tỉnh / Thành phố", m.province); //push province vào out
  push("Phường / Xã", m.ward); //push ward vào out
  push("Mã tỉnh", m.provinceCode); //push provinceCode vào out
  push("Mã phường", m.wardCode); //push wardCode vào out
  push("Địa chỉ chi tiết", m.addressDetail);
  push("Tên file giấy phép KD", m.businessLicenseName); //push businessLicenseName vào out
  push("Loại file giấy phép", m.businessLicenseMime); //push businessLicenseMime vào out
  push("Tên file logo", m.companyLogoName); //push companyLogoName vào out
  push("Loại file logo", m.companyLogoMime); //push companyLogoMime vào out
  push("Website", m.website); //push website vào out

  return out; //trả về out
}

/** Ví dụ về out 
out = [
  {
    label: "Lĩnh vực hoạt động",
    value: "IT, AI"
  },
  {
    label: "Tỉnh / Thành phố",
    value: "Hà Nội"
  },
  {
    label: "Phường / Xã",
    value: "Hà Đông"
  },
  {
    label: "Website",
    value: "fpt.vn"
  }
]
  */