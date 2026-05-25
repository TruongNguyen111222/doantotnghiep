import type { JobStatus } from "@/lib/types/doanhnghiep-ung-vien"; //kiểu dữ liệu cho trạng thái tin tuyển dụng

export const DOANHNGHIEP_UNG_VIEN_ENDPOINT = "/api/doanhnghiep/ung-vien"; //đường dẫn API lấy danh sách tin tuyển dụng

export const DOANHNGHIEP_UNG_VIEN_PAGE_SIZE = 10; //số lượng tin tuyển dụng trên mỗi trang

export const DOANHNGHIEP_UNG_VIEN_STATUS_LABEL: Record<JobStatus, string> = {
  PENDING: "Chờ duyệt",
  REJECTED: "Từ chối",
  ACTIVE: "Đang tuyển",
  STOPPED: "Dừng tuyển"
};
  
export const DOANHNGHIEP_UNG_VIEN_ERROR_DEFAULT = "Không thể tải danh sách tin tuyển dụng."; //lỗi mặc định khi tải danh sách tin tuyển dụng

