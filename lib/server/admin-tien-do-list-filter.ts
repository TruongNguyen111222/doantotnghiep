 //type trạng thái thực tập
 type InternshipStatus = 
  | "NOT_STARTED" //Chưa thực tập
  | "DOING" //Đang thực tập
  | "SELF_FINANCED" //Thực tập tự túc
  | "REPORT_SUBMITTED" //Đã nộp báo cáo thực tập
  | "COMPLETED" //Hoàn thành thực tập
  | "REJECTED"; //Từ chối

function pushSearchQ(and: Record<string, unknown>[], q: string) { //hàm thêm điều kiện tìm kiếm
  if (!q) return;
  const isNumeric = /^\d+$/.test(q); //kiểm tra từ khóa tìm kiếm có phải là số không
  const isEmailLike = q.includes("@") || q.includes("."); //kiểm tra từ khóa tìm kiếm có phải là email không
  and.push({
    OR: [
      { msv: { startsWith: q } }, //tìm kiếm theo mã sinh viên
      ...(q.length >= 2 ? [{ user: { fullName: { contains: q, mode: "insensitive" as const } } }] : []), //tìm kiếm theo họ tên
      ...(isNumeric ? [{ user: { phone: { startsWith: q } } }] : []), //tìm kiếm theo số điện thoại
      ...(isEmailLike ? [{ user: { email: { startsWith: q, mode: "insensitive" as const } } }] : []) //tìm kiếm theo email
    ]
  }); //thêm điều kiện tìm kiếm vào and
} //hàm thêm điều kiện tìm kiếm

/** Giống danh sách trang tiến độ (có lọc trạng thái, kể cả APPROVED_REPORT). */
export function buildAdminTienDoListWhere(searchParams: URLSearchParams): Record<string, unknown> { //hàm lấy danh sách tiến độ thực tập
  const q = (searchParams.get("q") || "").trim();
  const faculty = (searchParams.get("faculty") || "all").trim(); //lấy khoa
  const status = (searchParams.get("status") || "all").trim(); //lấy trạng thái
  const degree = (searchParams.get("degree") || "all").trim(); //lấy bậc

  const and: Record<string, unknown>[] = [];
  if (faculty !== "all") and.push({ faculty });
  if (degree !== "all") and.push({ degree });

  if (status !== "all") {
    if (status === "APPROVED_REPORT") {
      and.push({ internshipStatus: "REPORT_SUBMITTED" });
      and.push({ internshipReport: { is: { reviewStatus: "APPROVED" } } });
    } else {
      and.push({ internshipStatus: status as InternshipStatus });
    }
  }

  pushSearchQ(and, q); //thêm điều kiện tìm kiếm vào and

  const where: Record<string, unknown> = {}; //điều kiện tìm kiếm
  if (and.length) where.AND = and; //thêm điều kiện tìm kiếm vào and
  return where; //trả về điều kiện tìm kiếm
}

/** Thống kê thẻ: chỉ khoa/bậc/từ khóa, không lọc trạng thái. */
export function buildAdminTienDoStatsWhere(searchParams: URLSearchParams): Record<string, unknown> { //hàm lấy thống kê tiến độ thực tập
  const q = (searchParams.get("q") || "").trim(); //lấy từ khóa tìm kiếm
  const faculty = (searchParams.get("faculty") || "all").trim(); //lấy khoa
  const degree = (searchParams.get("degree") || "all").trim(); //lấy bậc

  const and: Record<string, unknown>[] = [];
  if (faculty !== "all") and.push({ faculty }); //thêm điều kiện khoa vào and
  if (degree !== "all") and.push({ degree }); //thêm điều kiện bậc vào and
  pushSearchQ(and, q); //thêm điều kiện tìm kiếm vào and      

  const where: Record<string, unknown> = {};
  if (and.length) where.AND = and;
  return where;
}
