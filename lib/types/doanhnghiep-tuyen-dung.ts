/*   ĐỊNH NGHĨA CÁC ĐỊNH DẠNG HẰNG CHUỖI (UNION TYPES) CHO TRẠNG THÁI VÀ HÌNH THỨC CỦA TIN TUYỂN DỤNG */

export type JobStatus = "PENDING" | "REJECTED" | "ACTIVE" | "STOPPED";
export type WorkType = "PART_TIME" | "FULL_TIME";
/**
 * TỔNG QUAN FILE:
 * File này chứa các định nghĩa kiểu dữ liệu (TypeScript Types) phục vụ riêng cho phân hệ Quản lý Tin Tuyển Dụng 
 * của tài khoản Doanh nghiệp. Nó thiết lập cấu trúc chặt chẽ cho danh sách tin, dữ liệu chi tiết phản hồi từ API 
 * và trạng thái dữ liệu lưu trữ trong Form nhập liệu (JobFormState), giúp đồng bộ dữ liệu chuẩn xác giữa giao diện UI và Backend.
 */

/*  ĐỊNH NGHĨA CẤU TRÚC DỮ LIỆU CỦA MỘT ITEM TIN TUYỂN DỤNG TRONG DANH SÁCH HIỂN THỊ (DATATABLE / LIST) */
export type JobListItem = {
  id: string; //id của tin tuyển dụng
  title: string;
  createdAt: string | null;
  recruitmentCount: number; //số lượng tuyển dụng
  expertise: string; //chuyên môn
  workType: WorkType; //hình thức làm việc
  status: JobStatus; //trạng thái
  deadlineAt: string | null;
};

/*   ĐỊNH NGHĨA CẤU TRÚC DỮ LIỆU PHẢN HỒI KHI TRUY VẤN CHI TIẾT TIN TUYỂN DỤNG VÀ THÔNG TIN DOANH NGHIỆP SỞ HỮU */
export type JobDetailResponse = {
  job: any; //dữ liệu chi tiết tin tuyển dụng
  enterprise: {
    companyName: string | null; //tên doanh nghiệp
    taxCode: string | null; //mã số thuế doanh nghiệp
    businessFields: string; //lĩnh vực kinh doanh
    headquartersAddress: string; //địa chỉ trụ sở chính
    intro: string | null; //giới thiệu doanh nghiệp
    website: string | null; //website doanh nghiệp
  };
};
/*   ĐỊNH NGHĨA KIỂU DỮ LIỆU CHUẨN (GENERIC) CHO PHẢN HỒI TỪ CÁC API ENDPOINT HỆ THỐNG */
export type ApiResponse<T> = {
  success: boolean;
  message?: string;
  item?: T;
  items?: any;
  hasOpenBatch?: boolean;
  batchId?: string | null;
  errors?: Record<string, string>;
};
/*  : ĐỊNH NGHĨA CẤU TRÚC DỮ LIỆU TRẠNG THÁI FORM (FORM STATE) ĐỂ QUẢN LÝ DỮ LIỆU KHI THÊM MỚI / SỬA TIN TUYỂN DỤNG */
export type JobFormState = {
  title: string;
  companyIntro: string;
  companyWebsite: string;
  salary: string;
  expertise: string;
  allowedFaculties: string[];
  experienceRequirement: string;
  recruitmentCount: string;
  workType: WorkType | "";
  deadlineAt: string; // yyyy-mm-dd
  jobDescription: string;
  candidateRequirements: string;
  benefits: string;
  workLocation: string;
  /** Địa chỉ làm việc dạng cấu trúc (UI) — map sang workLocation string khi submit. */
  provinceCode: string;
  wardCode: string;
  provinceName: string;
  wardName: string;
  addressDetail: string;
  workTime: string;
  applicationMethod: string;
};

