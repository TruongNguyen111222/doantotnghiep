import type { JobStatus, WorkType } from "@/lib/types/admin-quan-ly-tin-tuyen-dung";

export const ADMIN_QUAN_LY_TIN_TUYEN_DUNG_PAGE_SIZE = 10; //số lượng việc làm trên mỗi trang

export const statusLabel: Record<JobStatus, string> = { //label trạng thái việc làm 
  PENDING: "Chờ duyệt",
  REJECTED: "Từ chối duyệt",
  ACTIVE: "Đang hoạt động",
  STOPPED: "Dừng hoạt động"
};

export const workTypeLabel: Record<WorkType, string> = { //label loại hình làm việc
  PART_TIME: "part-time",
  FULL_TIME: "full-time"
};

// Keep for compatibility with legacy code; currently unused.
export const TITLE_DATE_TH: Record<string, string> = {};

