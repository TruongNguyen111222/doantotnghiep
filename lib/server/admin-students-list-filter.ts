type Degree = "BACHELOR" | "ENGINEER"; //type bậc
type InternshipStatus = 
  | "NOT_STARTED" //Chưa thực tập
  | "DOING" //Đang thực tập
  | "SELF_FINANCED" //Thực tập tự túc
  | "REPORT_SUBMITTED" //Đã nộp báo cáo thực tập
  | "COMPLETED"
  | "REJECTED"; //Từ chối

/** Query params giống GET /api/admin/students (q, faculty, status, degree). */
export function buildAdminStudentListWhere(searchParams: URLSearchParams): Record<string, unknown> { //hàm tạo điều kiện tìm kiếm sinh viên
  const q = searchParams.get("q")?.trim() || "";
  const faculty = searchParams.get("faculty")?.trim() || "all"; //khoa
  const status = (searchParams.get("status")?.trim() || "all") as InternshipStatus | "all"; //trạng thái thực tập
  const degree = (searchParams.get("degree")?.trim() || "all") as Degree | "all"; //bậc

  const where: Record<string, unknown> = {}; //điều kiện tìm kiếm
  const andParts: Record<string, unknown>[] = []; //điều kiện và

  if (faculty && faculty !== "all") andParts.push({ faculty }); //điều kiện khoa      
  if (status && status !== "all") andParts.push({ internshipStatus: status }); //điều kiện trạng thái thực tập
  if (degree && degree !== "all") andParts.push({ degree }); //điều kiện bậc

  if (q) { //nếu có từ khóa tìm kiếm
    const isNumeric = /^\d+$/.test(q); //kiểm tra từ khóa tìm kiếm có phải là số không
    const isEmailLike = q.includes("@") || q.includes("."); //kiểm tra từ khóa tìm kiếm có phải là email không
    andParts.push({  
      OR: [
        { msv: { startsWith: q } },
        ...(q.length >= 2 ? [{ user: { fullName: { contains: q, mode: "insensitive" as const } } }] : []),
        ...(isNumeric ? [{ user: { phone: { startsWith: q } } }] : []),
        ...(isEmailLike ? [{ user: { email: { startsWith: q, mode: "insensitive" as const } } }] : [])
      ]
    });
  }

  if (andParts.length) where.AND = andParts; //điều kiện và
  return where; //trả về điều kiện tìm kiếm
}
