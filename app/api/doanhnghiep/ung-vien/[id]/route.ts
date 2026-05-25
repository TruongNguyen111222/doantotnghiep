import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth/jwt";
import { SESSION_COOKIE_NAME } from "@/lib/constants/auth/patterns";
import { prisma } from "@/lib/prisma";
import { DOANHNGHIEP_UNG_VIEN_DETAIL_PAGE_SIZE } from "@/lib/constants/doanhnghiep-ung-vien-detail";
import { fetchProvinceList, fetchWardsForProvince } from "@/lib/vn-open-api";
//trích xuất dữ liệu lịch sử
function extractHistoryMeta(history: any[]): { 
  responseDeadline: string | null;
  interviewLocation: string | null;
} {
  if (!Array.isArray(history) || !history.length) {
    return { responseDeadline: null, interviewLocation: null };
  }
  //Tìm kiếm sự kiện STATUS_UPDATE cuối cùng thiết lập INTERVIEW_INVITED hoặc OFFERED
  let responseDeadline: string | null = null; //thời hạn phản hồi
  let interviewLocation: string | null = null; //vị trí phỏng vấn
  for (let i = history.length - 1; i >= 0; i--) { //duyệt ngược lại danh sách lịch sử
    const h = history[i] as Record<string, unknown>; //lấy sự kiện lịch sử
    if (h?.action === "STATUS_UPDATE") { //nếu sự kiện lịch sử là STATUS_UPDATE
      if (!responseDeadline && typeof h?.responseDeadline === "string") { //nếu thời hạn phản hồi chưa được thiết lập và là chuỗi
        responseDeadline = h.responseDeadline; //thiết lập thời hạn phản hồi
      }
      if (!interviewLocation && typeof h?.interviewLocation === "string") { //nếu vị trí phỏng vấn chưa được thiết lập và là chuỗi
        interviewLocation = h.interviewLocation; //thiết lập vị trí phỏng vấn
      }
      if (responseDeadline && interviewLocation) break; //nếu thời hạn phản hồi và vị trí phỏng vấn đã được thiết lập thì thoát khỏi vòng lặp
    }
  }
  return { responseDeadline, interviewLocation }; //trả về thời hạn phản hồi và vị trí phỏng vấn
}

export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) { //hàm xử lý API GET - Lấy chi tiết ứng viên
  const cookieStore = await cookies(); //lấy token từ cookie
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ success: false, message: "Vui lòng đăng nhập." }, { status: 401 });

  let sub: string; //id người dùng
  let role: string; //vai trò người dùng
  try {
    const verified = await verifySession(token);
    sub = verified.sub;
    role = verified.role;
  } catch { //nếu lỗi thì trả về lỗi 401
    return NextResponse.json({ success: false, message: "Phiên đăng nhập không hợp lệ." }, { status: 401 });
  }
  if (role !== "doanhnghiep") return NextResponse.json({ success: false, message: "Không có quyền truy cập." }, { status: 403 });
// 1. Lấy tham số ID từ URL và chuẩn hóa các tham số tìm kiếm, lọc, phân trang từ URL Query Parameters
  const { id } = await ctx.params; //lấy id từ url
  const { searchParams } = new URL(request.url); //lấy url query parameters
  const page = Math.max(Number(searchParams.get("page") || "1") || 1, 1); //lấy trang hiện tại
  const pageSize = Math.max(Number(searchParams.get("pageSize") || String(DOANHNGHIEP_UNG_VIEN_DETAIL_PAGE_SIZE)) || DOANHNGHIEP_UNG_VIEN_DETAIL_PAGE_SIZE, 1); //lấy kích thước trang
  const q = String(searchParams.get("q") || "").trim(); //lấy từ khóa tìm kiếm
  const statusRaw = String(searchParams.get("status") || "").trim(); //lấy trạng thái ứng viên
  const prismaAny = prisma as any; //lấy prisma

  const job = await prismaAny.jobPost.findFirst({ //lấy tin tuyển dụng theo id
    where: { id, enterpriseUserId: sub }, //lấy tin tuyển dụng theo id và id người dùng
    select: {
      id: true,
      title: true,
      salary: true,
      expertise: true,
      experienceRequirement: true,
      workType: true,
      jobDescription: true,
      candidateRequirements: true,
      workLocation: true,
      workTime: true,
      benefits: true,
      applicationMethod: true,
      createdAt: true,
      deadlineAt: true,
      recruitmentCount: true,
      status: true
    }
  }); //lấy tin tuyển dụng theo id và id người dùng
  if (!job) return NextResponse.json({ success: false, message: "Không tìm thấy tin tuyển dụng." }, { status: 404 });

  const allowedStatuses = new Set(["PENDING_REVIEW", "INTERVIEW_INVITED", "OFFERED", "REJECTED", "STUDENT_DECLINED"]); //danh sách trạng thái ứng viên
  const status = allowedStatuses.has(statusRaw) ? statusRaw : ""; //lấy trạng thái ứng viên
  const where: any = { jobPostId: id }; //lấy trạng thái ứng viên
  if (status) where.status = status; //lấy trạng thái ứng viên
  if (q) {
    where.studentUser = { //lấy sinh viên theo tên, email, số điện thoại
      OR: [
        { fullName: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { phone: { contains: q } }
      ]
    };
  }

  const [totalItems, apps] = await Promise.all([ //lấy tổng số lượng ứng viên và danh sách ứng viên
    prismaAny.jobApplication.count({ where }), //đếm số lượng ứng viên
    prismaAny.jobApplication.findMany({ //lấy danh sách ứng viên
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
    select: {
      id: true,
      status: true,
      coverLetter: true,
      cvPublicId: true,
      cvFileName: true,
      cvMime: true,
      interviewAt: true,
      response: true,
      responseAt: true,
      history: true,
      createdAt: true,
      studentUser: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          studentProfile: {
            select: {
              degree: true,
              internshipStatus: true,
              currentProvinceCode: true,
              currentProvinceName: true,
              currentWardCode: true,
              currentWardName: true,
              cvPublicId: true,
              cvFileName: true,
              cvMime: true
            }
          }
        }
      }
    }
  })
  ]);

  const now = new Date();

  // Resolve current address names when only codes exist (legacy data)
  const provinceNameByCode = new Map<string, string>(); //lấy tên tỉnh theo mã tỉnh
  const wardNameByKey = new Map<string, string>(); // `${provinceCode}:${wardCode}` -> name
  const normalizeCode = (v: unknown) => String(v ?? "").trim(); //lấy mã tỉnh và mã huyện
  try {
    const needProvinceCodes = new Set<string>(); //lấy mã tỉnh và mã huyện
    for (const a of apps as any[]) {
      const sp = a?.studentUser?.studentProfile; //lấy hồ sơ sinh viên
      const pCode = normalizeCode(sp?.currentProvinceCode); //lấy mã tỉnh
      const wCode = normalizeCode(sp?.currentWardCode); //lấy mã huyện
      const hasNames = Boolean(String(sp?.currentProvinceName || "").trim()) && Boolean(String(sp?.currentWardName || "").trim()); //lấy tên tỉnh và tên huyện
      if (!hasNames && pCode && wCode) needProvinceCodes.add(pCode); //lấy mã tỉnh và mã huyện
    }
    if (needProvinceCodes.size) {
      const provinces = await fetchProvinceList(); //lấy danh sách tỉnh thành
      for (const p of provinces as any[]) { //lấy danh sách tỉnh thành
        const code = normalizeCode(p?.code); //lấy mã tỉnh
        const name = String(p?.name || "").trim(); //lấy tên tỉnh
        if (code && name) provinceNameByCode.set(code, name); //lấy tên tỉnh theo mã tỉnh
      }
      await Promise.all( //lấy danh sách huyện từ API
        Array.from(needProvinceCodes).map(async (pCode) => { //lấy danh sách huyện từ API
          try {
            const wards = await fetchWardsForProvince(pCode); //lấy danh sách huyện từ API
            for (const w of wards as any[]) { //lấy danh sách huyện từ API
              const wCode = normalizeCode(w?.code); //lấy mã huyện
              const wName = String(w?.name || "").trim(); //lấy tên huyện
              if (wCode && wName) wardNameByKey.set(`${pCode}:${wCode}`, wName); //lấy tên huyện theo mã huyện
            }
          } catch {
            /* ignore */ //nếu lỗi thì bỏ qua
          }
        })
      );
    }
  } catch {
    /* ignore */
  }

  // Lazy auto-decline: if responseDeadline passed and SV hasn't responded, mark as STUDENT_DECLINED
  const expiredIds: string[] = [];
  for (const a of apps) {
    if (
      (a.status === "INTERVIEW_INVITED" || a.status === "OFFERED") &&
      a.response === "PENDING"
    ) {
      const history = Array.isArray(a.history) ? a.history : [];
      const { responseDeadline } = extractHistoryMeta(history);
      if (responseDeadline) {
        const dl = new Date(responseDeadline);
        if (!Number.isNaN(dl.getTime()) && dl < now) { //nếu thời hạn phản hồi đã qua và sinh viên chưa phản hồi thì thêm vào danh sách ứng viên
          expiredIds.push(a.id);
        }
      }
    }
  }

  if (expiredIds.length) {
    const declineHistory = {
      at: now.toISOString(),
      by: "SYSTEM",
      action: "AUTO_DECLINED",
      reason: "Quá hạn phản hồi"
    };
    await Promise.all( //lấy danh sách ứng viên đã quá hạn phản hồi
      expiredIds.map(async (appId: string) => {
        const app = apps.find((a: any) => a.id === appId); //lấy ứng viên theo id
        const prevHistory = Array.isArray(app?.history) ? app.history : []; //lấy lịch sử ứng viên
        await prismaAny.jobApplication.update({ //cập nhật trạng thái ứng viên
          where: { id: appId },
          data: {
            status: "STUDENT_DECLINED",
            response: "DECLINED",
            responseAt: now,
            history: [...prevHistory, declineHistory]
          }
        });
        // Update the in-memory object for the response
        if (app) {
          app.status = "STUDENT_DECLINED";
          app.response = "DECLINED";
          app.responseAt = now;
          app.history = [...(Array.isArray(app.history) ? app.history : []), declineHistory];
        }
      })
    );
  }

  return NextResponse.json({ //trả về dữ liệu danh sách ứng viên
    success: true,
    page,
    pageSize,
    totalItems,
    job: {
      ...job,
      createdAt: job.createdAt?.toISOString?.() ?? null,
      deadlineAt: job.deadlineAt?.toISOString?.() ?? null
    },
    applicants: apps.map((a: any) => { //lấy danh sách ứng viên
      const sp = a.studentUser?.studentProfile;
      const history = Array.isArray(a.history) ? a.history : [];
      const { responseDeadline, interviewLocation } = extractHistoryMeta(history);
      const provinceName =
        String(sp?.currentProvinceName || "").trim() ||
        (normalizeCode(sp?.currentProvinceCode) ? provinceNameByCode.get(normalizeCode(sp?.currentProvinceCode)) || "" : "");
      const wardName =
        String(sp?.currentWardName || "").trim() ||
        (() => {
          const pCode = normalizeCode(sp?.currentProvinceCode);
          const wCode = normalizeCode(sp?.currentWardCode);
          if (!pCode || !wCode) return "";
          return wardNameByKey.get(`${pCode}:${wCode}`) || "";
        })();
      const currentParts = [provinceName, wardName].filter(Boolean);

      // CV fallback: legacy apps may not store CV on JobApplication
      const effectiveCvPublicId = a.cvPublicId ?? sp?.cvPublicId ?? null;
      const effectiveCvFileName = a.cvFileName ?? sp?.cvFileName ?? null;
      const effectiveCvMime = a.cvMime ?? sp?.cvMime ?? null;
      return {
        id: a.id,
        appliedAt: a.createdAt?.toISOString?.() ?? null,
        status: a.status,
        coverLetter: a.coverLetter ?? null,
        cvPublicId: effectiveCvPublicId,
        cvFileName: effectiveCvFileName,
        cvMime: effectiveCvMime,
        interviewAt: a.interviewAt?.toISOString?.() ?? null,
        interviewLocation,
        responseDeadline,
        response: a.response,
        responseAt: a.responseAt?.toISOString?.() ?? null,
        history: a.history ?? null,
        internshipStatus: sp?.internshipStatus ?? "NOT_STARTED",
        student: {
          id: a.studentUser.id,
          fullName: a.studentUser.fullName,
          email: a.studentUser.email,
          phone: a.studentUser.phone ?? null,
          degree: sp?.degree ?? null,
          currentAddress: currentParts.length ? currentParts.join(" - ") : "—"
        }
      };
    })
  });
}
