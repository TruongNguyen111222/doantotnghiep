import type { InternshipBatchStatus, Semester } from "@/lib/types/admin-quan-ly-dot-thuc-tap";
//Hằng số thiết lập (Constants) dùng chung cho toàn bộ phân hệ quản lý đợt thực tập.
export const ADMIN_QUAN_LY_DOT_THUC_TAP_PAGE_SIZE = 10; //số lượng đợt thực tập trên mỗi trang

export const ADMIN_QUAN_LY_DOT_THUC_TAP_STATUS_LABEL: Record<InternshipBatchStatus, string> = {
  OPEN: "Đang mở", //trạng thái đợt thực tập đang mở  
  CLOSED: "Đóng" //trạng thái đợt thực tập đã đóng  
};

export const ADMIN_QUAN_LY_DOT_THUC_TAP_SEMESTER_OPTIONS: Array<{ value: Semester; label: string }> = [
  { value: "HK_I", label: "HK I" }, //học kỳ I
  { value: "HK_II", label: "HK II" }, //học kỳ II
  { value: "HK_HE", label: "HK hè" }, //học kỳ hè
  { value: "HK_PHU", label: "HK phụ" } //học kỳ phụ
];

