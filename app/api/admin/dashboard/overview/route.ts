import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/admin-session"; // hàm để lấy session admin
import { prisma } from "@/lib/prisma"; // hàm để kết nối với database
 
type DonutSegment = { label: string; value: number; percent: number; color: string }; // kiểu dữ liệu cho đồ thị tròn
type SimpleChartSeries = { name: string; data: number[]; color: string }; // kiểu dữ liệu cho đồ thị đường

const COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#ef4444", "#8b5cf6", "#0ea5e9", "#84cc16", "#f97316"];
//“CHUẨN BỊ dữ liệu để vẽ biểu đồ tròn”
function mkDonutSegments( // hàm để tạo đồ thị tròn từ dữ liệu- tính tổng , phần trăm, màu sắc
  entries: Array<{ label: string; value: number }>,  // danh sách các phần tử của đồ thị tròn
  colors: string[] //
): { segments: DonutSegment[]; total: number } { // trả về đồ thị tròn 
  const total = entries.reduce((s, e) => s + e.value, 0); // tính tổng của đồ thị tròn
  const segments: DonutSegment[] = entries.map((e, i) => ({
    label: e.label, // nhãn của phần tử của đồ thị tròn
    value: e.value, // giá trị của phần tử của đồ thị tròn
    percent: total === 0 ? 0 : e.value / total, // phần trăm của phần tử của đồ thị tròn
    color: colors[i % colors.length] // màu sắc của phần tử của đồ thị tròn
  }));
  return { segments, total }; // trả về đồ thị tròn 
}

//“chuyển ngày tháng thành mã tháng” - để dùng cho đồ thị đường
function monthKey(d: Date) { // hàm để tạo key cho đồ thị đường
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

//“chuyển mã tháng thành nhãn tháng” - để dùng cho đồ thị đường
function monthLabel(key: string) {
  const [y, m] = key.split("-"); // tách mã tháng thành năm và tháng
  return `${m}/${y}`; // trả về nhãn tháng
}

//“TẠO API cho dashboard”
export async function GET(request: Request) {
  const admin = await getAdminSession(); // lấy session admin
  if (!admin) return NextResponse.json({ message: "Không có quyền truy cập." }, { status: 403 }); // nếu không có session admin thì trả về lỗi

  try { // phần try catch để xử lý lỗi
    const { searchParams } = new URL(request.url); // lấy search params từ request
    const faculty = (searchParams.get("faculty") ?? "all").trim(); // lấy khoa từ search params
    const batchIdParam = (searchParams.get("batchId") ?? "all").trim(); // lấy đợt thực tập từ search params
    const prismaAny = prisma as any; // lấy prisma as any để dùng cho prisma

    // - lấy danh sách khoa và đợt thực tập
    const facultyRows: Array<{ faculty: string }> = await prismaAny.studentProfile.findMany({
      distinct: ["faculty"], // lấy danh sách khoa ko lấy trùng
      select: { faculty: true } // lấy khoa
    });
    const faculties = facultyRows.map((r) => r.faculty).filter(Boolean).sort() as string[]; // lấy danh sách khoa

    const batches: Array<{ id: string; name: string; status: string; startDate: Date }> = // lấy danh sách đợt thực tập
      await prismaAny.internshipBatch.findMany({ // lấy danh sách đợt thực tập
        orderBy: { startDate: "desc" }, // sắp xếp theo ngày bắt đầu
        select: { id: true, name: true, status: true, startDate: true } // lấy id, tên, trạng thái và ngày bắt đầu
      });

      //lấy đợt thực tập mở nhất
    const openBatch: { id: string } | null = await prismaAny.internshipBatch.findFirst({
      where: { status: "OPEN" }, // lấy đợt thực tập mở nhất
      orderBy: { startDate: "desc" }, // sắp xếp theo ngày bắt đầu
      select: { id: true } // lấy id
    });

    //“quyết định sẽ dùng đợt thực tập nào”
    const chosenBatchId = // lấy đợt thực tập được chọn - nếu không có đợt thực tập được chọn thì lấy đợt thực tập mở nhất
      batchIdParam !== "all" ? batchIdParam : openBatch?.id ?? batches[0]?.id ?? null;
    // lấy khoa được chọn - nếu không có khoa được chọn thì lấy tất cả khoa
    const selectedFaculty = faculty !== "all" ? faculty : "all"; // lấy khoa được chọn - nếu không có khoa được chọn thì lấy tất cả khoa

    const emptyResponse = { // trả về dữ liệu trống khi không có đợt thực tập được chọn thì render cho khỏi lỗi
      faculties,
      batches: batches.map((b) => ({ id: b.id, name: b.name, status: b.status })),
      selectedFaculty,
      selectedBatchId: null,
      applicationStatusDonut: { segments: [], total: 0 },
      jobStatusDonut: { segments: [], total: 0 },
      enterprisesByField: { labels: [], values: [] },
      progress: { labels: [], values: [] },
      lineJobPosts: { labels: [], series: [] },
      topFaculties: { top: [], bottom: [] }
    };

    if (!chosenBatchId) return NextResponse.json(emptyResponse); // nếu không có đợt thực tập được chọn thì trả về dữ liệu trống

    // --- Donut 1: Application status breakdown ---
    const facultyFilter = // lấy khoa được chọn - nếu không có khoa được chọn thì lấy tất cả khoa
      selectedFaculty !== "all" // nếu có khoa được chọn thì lấy khoa được chọn
        ? { studentUser: { studentProfile: { faculty: selectedFaculty } } } // lấy khoa được chọn
        : {}; // lấy tất cả khoa

        //lấy danh sách ứng tuyển
    const allApps: Array<{ status: string; response: string }> = // lấy danh sách ứng tuyển
      await prismaAny.jobApplication.findMany({ // lấy danh sách ứng tuyển
        where: { jobPost: { internshipBatchId: chosenBatchId }, ...facultyFilter }, // lấy danh sách ứng tuyển theo đợt thực tập và khoa
        select: { status: true, response: true } // lấy trạng thái và phản hồi
      });

      //tính số lượng ứng tuyển
    let pendingCount = 0, acceptedCount = 0, svDeclinedCount = 0, dnDeclinedCount = 0;
    for (const app of allApps) {
      if (app.status === "REJECTED") dnDeclinedCount++; // nếu trạng thái là từ chối thì tăng số lượng từ chối
      else if (app.status === "STUDENT_DECLINED") svDeclinedCount++; // nếu trạng thái là từ chối thì tăng số lượng từ chối
      else if (app.response === "ACCEPTED") acceptedCount++; // nếu phản hồi là chấp nhận thì tăng số lượng chấp nhận
      else pendingCount++; // nếu trạng thái là chờ xem xét thì tăng số lượng chờ xem xét
    }

    const applicationStatusDonut = mkDonutSegments( // tạo đồ thị tròn cho trạng thái ứng tuyển
      [
        { label: "Chờ xem xét", value: pendingCount }, // nhãn và giá trị của phần tử của đồ thị tròn
        { label: "SV chấp nhận thực tập", value: acceptedCount }, // nhãn và giá trị của phần tử của đồ thị tròn
        { label: "SV từ chối", value: svDeclinedCount }, // nhãn và giá trị của phần tử của đồ thị tròn
        { label: "DN từ chối", value: dnDeclinedCount } // nhãn và giá trị của phần tử của đồ thị tròn
      ],
      ["#2563eb", "#16a34a", "#f59e0b", "#ef4444"] // màu sắc của phần tử của đồ thị tròn
    );

    // --- Donut 2: Job post status breakdown --- - lấy danh sách tin tuyển dụng
    const jobPostStatusRows: Array<{ status: string }> = await prismaAny.jobPost.findMany({ // lấy danh sách tin tuyển dụng
      where: { internshipBatchId: chosenBatchId }, // lấy danh sách tin tuyển dụng theo đợt thực tập
      select: { status: true } // lấy trạng thái tin tuyển dụng
    });
    const jpCount: Record<string, number> = { PENDING: 0, REJECTED: 0, ACTIVE: 0, STOPPED: 0 }; // khởi tạo số lượng tin tuyển dụng
    for (const jp of jobPostStatusRows) { // lấy số lượng tin tuyển dụng
      if (jp.status in jpCount) jpCount[jp.status]++; // nếu trạng thái là chờ xem xét thì tăng số lượng chờ xem xét và trạng thái khác thì tăng số lượng
    }
    const jobStatusDonut = mkDonutSegments( // tạo đồ thị tròn cho trạng thái tin tuyển dụng
      [
        { label: "Chờ duyệt", value: jpCount.PENDING },
        { label: "Từ chối", value: jpCount.REJECTED },
        { label: "Đang hoạt động", value: jpCount.ACTIVE },
        { label: "Dừng hoạt động", value: jpCount.STOPPED }
      ],
      ["#f59e0b", "#ef4444", "#16a34a", "#6b7280"]
    );

    // --- Bar: Enterprise count by expertise --- - lấy danh sách doanh nghiệp theo ngành/khoa
    const jobPostsForExpertise: Array<{ enterpriseUserId: string; expertise: string }> = // lấy danh sách doanh nghiệp theo ngành/khoa
      await prismaAny.jobPost.findMany({ // lấy danh sách doanh nghiệp theo ngành/khoa
        where: { internshipBatchId: chosenBatchId }, // lấy danh sách doanh nghiệp theo đợt thực tập
        select: { enterpriseUserId: true, expertise: true } // lấy id doanh nghiệp và ngành/khoa
      });
    const enterprisesByExpertise = new Map<string, Set<string>>(); // khởi tạo map để lưu trữ danh sách doanh nghiệp theo ngành/khoa
    for (const jp of jobPostsForExpertise) { // lấy danh sách doanh nghiệp theo ngành/khoa
      const ex = jp.expertise ?? "Khác"; // nếu ngành/khoa là null thì đặt là "Khác"
      if (!enterprisesByExpertise.has(ex)) enterprisesByExpertise.set(ex, new Set()); // nếu map không có ngành/khoa thì thêm vào map
      enterprisesByExpertise.get(ex)!.add(String(jp.enterpriseUserId)); // thêm id doanh nghiệp vào map
    }
    const enterprisesByFieldArr = Array.from(enterprisesByExpertise.entries()) // lấy danh sách doanh nghiệp theo ngành/khoa
      .map(([expertise, set]) => ({ expertise, value: set.size })) // lấy ngành/khoa và số lượng doanh nghiệp theo ngành/khoa
      .sort((a, b) => b.value - a.value) // sắp xếp theo số lượng doanh nghiệp theo ngành/khoa
      .slice(0, 12); // lấy 12 doanh nghiệp theo ngành/khoa
    const enterprisesByField = { // tạo đồ thị tròn cho số lượng doanh nghiệp theo ngành/khoa
      labels: enterprisesByFieldArr.map((x) => x.expertise), // lấy ngành/khoa
      values: enterprisesByFieldArr.map((x) => x.value) // lấy số lượng doanh nghiệp theo ngành/khoa
    };

    // ------ lấy danh sách tiến độ thực tập
    const studentProgressRows: Array<{ internshipStatus: string }> = // lấy danh sách tiến độ thực tập
      await prismaAny.studentProfile.findMany({ // lấy danh sách tiến độ thực tập
        where: selectedFaculty !== "all" ? { faculty: selectedFaculty } : {}, // lấy danh sách tiến độ thực tập theo khoa
        select: { internshipStatus: true } // lấy tiến độ thực tập
      });
    const STATUS_ORDER = [ // lấy danh sách tiến độ thực tập
      "NOT_STARTED", "DOING", "SELF_FINANCED", "REPORT_SUBMITTED", "COMPLETED", "REJECTED" // lấy danh sách tiến độ thực tập
    ];
    const STATUS_LABELS: Record<string, string> = { // lấy danh sách tiến độ thực tập
      NOT_STARTED: "Chưa thực tập", // lấy danh sách tiến độ thực tập
      DOING: "Đang thực tập",
      SELF_FINANCED: "Thực tập tự túc",
      REPORT_SUBMITTED: "Đã nộp BCTT",
      COMPLETED: "Hoàn thành",
      REJECTED: "Từ chối"
    };
    const progressCounts: Record<string, number> = {}; // khởi tạo map để lưu trữ số lượng tiến độ thực tập
    for (const row of studentProgressRows) { // lấy số lượng tiến độ thực tập
      progressCounts[row.internshipStatus] = (progressCounts[row.internshipStatus] ?? 0) + 1; // tăng số lượng tiến độ thực tập
    }
    const progress = { // tạo đồ thị tròn cho số lượng tiến độ thực tập
      labels: STATUS_ORDER.map((s) => STATUS_LABELS[s] ?? s), // lấy tiến độ thực tập
      values: STATUS_ORDER.map((s) => progressCounts[s] ?? 0) // lấy số lượng tiến độ thực tập
    };

    // --- Line: cumulative job posts by top enterprises --- - lấy danh sách tin tuyển dụng theo đợt thực tập
    const jobPostsInBatch: Array<{ // lấy danh sách tin tuyển dụng theo đợt thực tập
      enterpriseUserId: string; // lấy id doanh nghiệp
      createdAt: Date; // lấy ngày tạo
      enterpriseUser: { companyName: string | null }; // lấy tên doanh nghiệp
    }> = await prismaAny.jobPost.findMany({
      where: { internshipBatchId: chosenBatchId }, // lấy danh sách tin tuyển dụng theo đợt thực tập
      select: {
        enterpriseUserId: true, // lấy id doanh nghiệp
        createdAt: true, // lấy ngày tạo
        enterpriseUser: { select: { companyName: true } } // lấy tên doanh nghiệp
      }
    });

    const postsCountByEnterprise = new Map<string, number>(); // khởi tạo map để lưu trữ số lượng tin tuyển dụng theo đợt thực tập
    const enterpriseNameById = new Map<string, string>(); // khởi tạo map để lưu trữ tên doanh nghiệp theo id doanh nghiệp
    const monthKeysSet = new Set<string>(); // khởi tạo set để lưu trữ ngày tạo

    for (const jp of jobPostsInBatch) { // lấy danh sách tin tuyển dụng theo đợt thực tập
      const eId = String(jp.enterpriseUserId); // lấy id doanh nghiệp
      postsCountByEnterprise.set(eId, (postsCountByEnterprise.get(eId) ?? 0) + 1); // tăng số lượng tin tuyển dụng theo đợt thực tập
      enterpriseNameById.set(eId, jp.enterpriseUser?.companyName ?? eId); // lấy tên doanh nghiệp theo id doanh nghiệp
      if (jp.createdAt) monthKeysSet.add(monthKey(new Date(jp.createdAt))); // lấy ngày tạo
    }

    const monthKeys = Array.from(monthKeysSet).sort(); // lấy danh sách ngày tạo
    const lastMonthKeys = monthKeys.length > 8 ? monthKeys.slice(-8) : monthKeys; // lấy danh sách ngày tạo cuối cùng
  //lấy danh sách doanh nghiệp theo số lượng tin tuyển dụng
    const topEnterprises = Array.from(postsCountByEnterprise.entries()) // lấy danh sách doanh nghiệp theo số lượng tin tuyển dụng
      .sort((a, b) => b[1] - a[1]) // sắp xếp theo số lượng tin tuyển dụng
      .slice(0, 4) // lấy 4 doanh nghiệp theo số lượng tin tuyển dụng
      .map(([eId]) => eId); // lấy id doanh nghiệp

    const lineJobPostsSeries: SimpleChartSeries[] = topEnterprises.map((eId, i) => { // lấy danh sách đồ thị đường cho tin tuyển dụng
      const color = COLORS[(i + 1) % COLORS.length]; // lấy màu sắc cho đồ thị đường
      const points = lastMonthKeys.map(() => 0); // lấy danh sách điểm cho đồ thị đường 
      for (const jp of jobPostsInBatch) { // lấy danh sách tin tuyển dụng theo đợt thực tập
        if (String(jp.enterpriseUserId) !== eId) continue;
        const mk = jp.createdAt ? monthKey(new Date(jp.createdAt)) : null; // lấy ngày tạo
        if (!mk) continue; // nếu ngày tạo là null thì continue
        const idx = lastMonthKeys.indexOf(mk); // lấy vị trí ngày tạo trong danh sách ngày tạo cuối cùng
        if (idx < 0) continue; // nếu vị trí ngày tạo trong danh sách ngày tạo cuối cùng là nhỏ hơn 0 thì continue
        for (let j = idx; j < lastMonthKeys.length; j++) points[j] += 1; // tăng số lượng tin tuyển dụng theo đợt thực tập
      }
      return { name: enterpriseNameById.get(eId) ?? eId, data: points, color }; // trả về đồ thị đường cho tin tuyển dụng
    });

    const lineJobPosts = { // tạo đồ thị đường cho tin tuyển dụng
      labels: lastMonthKeys.map(monthLabel), // lấy danh sách ngày tạo
      series: lineJobPostsSeries // lấy danh sách đồ thị đường cho tin tuyển dụng
    };

    // --- Top/Bottom 5 faculties by application & offer count --- - lấy danh sách ứng tuyển theo khoa
    const appsByFaculty: Array<{ 
      response: string;
      studentUser: { studentProfile: { faculty: string } | null } | null;
    }> = await prismaAny.jobApplication.findMany({
      where: { jobPost: { internshipBatchId: chosenBatchId } }, // lấy danh sách ứng tuyển theo đợt thực tập
      select: { 
        response: true, // lấy phản hồi
        studentUser: { select: { studentProfile: { select: { faculty: true } } } } // lấy khoa
      }
    });
    //lấy danh sách khoa theo số lượng ứng tuyển
    const facultyStats = new Map<string, { applications: number; offered: number }>();
    for (const app of appsByFaculty) { // lấy danh sách ứng tuyển theo khoa
      const f = app.studentUser?.studentProfile?.faculty ?? "Không rõ"; // lấy khoa
      if (!facultyStats.has(f)) facultyStats.set(f, { applications: 0, offered: 0 }); // nếu map không có khoa thì thêm vào map
      const stat = facultyStats.get(f)!; // lấy khoa
      stat.applications++; // tăng số lượng ứng tuyển
      if (app.response === "ACCEPTED") stat.offered++; // nếu phản hồi là chấp nhận thì tăng số lượng chấp nhận
    }
    //lấy danh sách khoa theo số lượng ứng tuyển
    const facultyArr = Array.from(facultyStats.entries())
      .map(([label, { applications, offered }]) => ({ label, applications, offered })) // lấy khoa và số lượng ứng tuyển
      .sort((a, b) => b.applications - a.applications); // sắp xếp theo số lượng ứng tuyển

    const topFaculties = { // tạo đồ thị tròn cho số lượng ứng tuyển
      top: facultyArr.slice(0, 5), // lấy 5 khoa có số lượng ứng tuyển nhiều nhất
      bottom: [...facultyArr].sort((a, b) => a.applications - b.applications).slice(0, 5) // lấy 5 khoa có số lượng ứng tuyển ít nhất
    };

    return NextResponse.json({ // trả về dữ liệu
      faculties, // lấy danh sách khoa
      batches: batches.map((b) => ({ id: b.id, name: b.name, status: b.status })),
      selectedFaculty, // lấy khoa được chọn
      selectedBatchId: chosenBatchId, // lấy đợt thực tập được chọn
      applicationStatusDonut, // lấy đồ thị tròn cho trạng thái ứng tuyển
      jobStatusDonut, // lấy đồ thị tròn cho trạng thái tin tuyển dụng
      enterprisesByField, // lấy đồ thị tròn cho số lượng doanh nghiệp theo ngành/khoa
      progress, // lấy đồ thị tròn cho số lượng tiến độ thực tập
      lineJobPosts, // lấy đồ thị đường cho tin tuyển dụng
      topFaculties // lấy đồ thị tròn cho số lượng ứng tuyển
    });
  } catch (e) {
    console.error("[GET /api/admin/dashboard/overview]", e);
    return NextResponse.json({ success: false, message: "Lỗi máy chủ." }, { status: 500 });
  }
}
