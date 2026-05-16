//dùng để lấy chức vụ người đại diện doanh nghiệp một cách an toàn và ưu tiên nhiều nguồn dữ liệu.
export function resolveRepresentativeTitle( //hàm lấy chức vụ người đại diện doanh nghiệp một cách an toàn và ưu tiên nhiều nguồn dữ liệu.
  columnTitle: string | null | undefined, //tiêu đề cột
  enterpriseMeta: unknown //thông tin doanh nghiệp
): string { //hàm trả về chức vụ người đại diện doanh nghiệp
  if (typeof columnTitle === "string" && columnTitle.trim()) return columnTitle.trim(); //nếu columnTitle là string và có trim thì trả về columnTitle.trim()
  if (!enterpriseMeta || typeof enterpriseMeta !== "object" || Array.isArray(enterpriseMeta)) return "—"; //nếu enterpriseMeta không hợp lệ thì trả về "—"
  const t = (enterpriseMeta as Record<string, unknown>).representativeTitle; //lấy representativeTitle từ enterpriseMeta
  if (typeof t === "string" && t.trim()) return t.trim(); //nếu t là string và có trim thì trả về t.trim()
  return "—"; //nếu t không phải là string hoặc không có trim thì trả về "—"
} 
/** Ví dụ về out 
 * {
 *   label: "Chức vụ",
 *   value: "Giám đốc"
 * }
 */

