import type { InternshipStatus, SinhVienTraCuuUngTuyenItem, WorkType, WorkTypeFilter } from "@/lib/types/sinhvien-tra-cuu-ung-tuyen";
import { SINHVIEN_TRA_CUU_UNG_TUYEN_ENDPOINT, SINHVIEN_TRA_CUU_UNG_TUYEN_LOAD_ERROR_DEFAULT } from "@/lib/constants/sinhvien-tra-cuu-ung-tuyen";

export function formatDateVi(iso: string | null): string { //hàm format ngày tháng năm
  if (!iso) return "—"; 
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—"; 
  return d.toLocaleDateString("vi-VN"); //format ngày tháng năm
}

export function parseInternshipStatus(value: unknown): InternshipStatus { //hàm parse trạng thái đăng ký thực tập
  const v = String(value ?? "NOT_STARTED"); //lấy trạng thái đăng ký thực tập
  const allowed: InternshipStatus[] = ["NOT_STARTED", "DOING", "SELF_FINANCED", "REPORT_SUBMITTED", "COMPLETED", "REJECTED"];
  return (allowed as string[]).includes(v) ? (v as InternshipStatus) : "NOT_STARTED"; //trả về trạng thái đăng ký thực tập
}

export function buildSinhVienTraCuuUngTuyenListUrl(args: { q: string; workType: WorkTypeFilter; province: string }): string { //hàm tạo URL danh sách tin tuyển dụng
  const sp = new URLSearchParams(); //tạo URL search params
  if (args.q.trim()) sp.set("q", args.q.trim()); //thêm tham số q
  if (args.workType !== "all") sp.set("workType", args.workType); //thêm tham số workType
  if (args.province !== "all") sp.set("province", args.province); //thêm tham số province
  const qs = sp.toString(); //chuyển URL search params thành string
  return qs ? `${SINHVIEN_TRA_CUU_UNG_TUYEN_ENDPOINT}?${qs}` : SINHVIEN_TRA_CUU_UNG_TUYEN_ENDPOINT; //trả về URL danh sách tin tuyển dụng
}

export async function fetchSinhVienTraCuuUngTuyenList(args: { q: string; workType: WorkTypeFilter; province: string }): Promise<{ //hàm lấy danh sách tin tuyển dụng
  items: SinhVienTraCuuUngTuyenItem[];
  canApply: boolean;
  internshipStatus: InternshipStatus;
  provinceOptions: string[];
}> {
  const res = await fetch(buildSinhVienTraCuuUngTuyenListUrl(args)); //gửi request lấy danh sách tin tuyển dụng
  const data = await res.json(); //lấy dữ liệu từ response
  if (!res.ok || !data?.success) {
    throw new Error(data?.message || SINHVIEN_TRA_CUU_UNG_TUYEN_LOAD_ERROR_DEFAULT); //trả về lỗi nếu không thể lấy danh sách tin tuyển dụng
  }

  const nextItems: SinhVienTraCuuUngTuyenItem[] = Array.isArray(data.items) ? data.items : []; //lấy danh sách tin tuyển dụng
  const internshipStatus = parseInternshipStatus(data.internshipStatus ?? "NOT_STARTED"); //lấy trạng thái đăng ký thực tập
  const provinceOptions: string[] = Array.isArray(data.provinceOptions) ? data.provinceOptions : []; //lấy danh sách tỉnh/thành

  return {
    items: nextItems, //trả về danh sách tin tuyển dụng
    canApply: Boolean(data.canApply), //trả về trạng thái có thể ứng tuyển
    internshipStatus,
    provinceOptions //trả về danh sách tỉnh/thành
  };
}

