import type { DashboardNavItem } from "./dashboard-nav";

//Danh sách các mục trong menu bên trái của dashboard doanh nghiệp sau khi đăng nhập. Mỗi mục có đường dẫn, tên hiển thị và icon.
export const DOANHNGHIEP_DASHBOARD_NAV: DashboardNavItem[] = [
  { href: "/doanhnghiep/dashboard", label: "Tổng quan", icon: "overview" },
  { href: "/doanhnghiep/tai-khoan", label: "Tài khoản", icon: "account" },
  { href: "/doanhnghiep/tuyen-dung", label: "Tin tuyển dụng", icon: "documents" },
  { href: "/doanhnghiep/ung-vien", label: "Ứng viên", icon: "candidates" },
  { href: "/auth/doimatkhau", label: "Đổi mật khẩu", icon: "password" }
];

export const DOANHNGHIEP_DASHBOARD_TOPBAR_TITLE = "Doanh nghiệp";

/** Giới hạn upload đăng ký / file doanh nghiệp. */
export const MAX_ENTERPRISE_UPLOAD_BYTES = 20 * 1024 * 1024;
export const MAX_ENTERPRISE_BASE64_CHARS = Math.ceil((MAX_ENTERPRISE_UPLOAD_BYTES * 4) / 3) + 4;
export const DOANHNGHIEP_MAX_UPLOAD_FILE_LABEL = `${MAX_ENTERPRISE_UPLOAD_BYTES / (1024 * 1024)} MB`;

//Danh sác các lĩnh vực kinh doanh
export const DOANHNGHIEP_BUSINESS_FIELD_OPTIONS = [
  "Công nghệ thông tin",
  "Cơ khí - Chế tạo",
  "Logistics",
  "Xây dựng",
  "Tài chính - Kế toán",
  "Điện - Điện tử"
] as const;

//Pattern cho địa chỉ đăng ký doanh nghiệp
export const DOANHNGHIEP_REGISTER_ADDRESS_PATTERN = /^[\p{L}\d\s]{1,255}$/u;
export const DOANHNGHIEP_REGISTER_LETTER_ONLY_PATTERN = /^[\p{L}\s]{1,255}$/u;
export const DOANHNGHIEP_REGISTER_WEBSITE_PATTERN =
  /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/[\w./?%&=-]*)?$/i;

//Thông báo cho doanh nghiệp khi yêu cầu đăng ký được xét duyệt
export const DOANHNGHIEP_CHO_PHE_DUYET_MESSAGE =
  "Phòng đào tạo xét duyệt yêu cầu đăng ký qua email trong vòng 24h, vui lòng chú ý kiểm tra hòm thư trong thời gian tới.";
