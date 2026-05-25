export type AdminSupervisorExcelRow = { //type dữ liệu giảng viên excel
  fullName: string;
  phone: string;
  email: string;
  birthDate: string; // YYYY-MM-DD
  gender: "Nam" | "Nữ" | "Khác";
  provinceName: string;
  wardName: string;
  faculty: string;
  degree: "Thạc sĩ" | "Tiến sĩ" | "Phó giáo sư" | "Giáo sư";
};
//mẫu dữ liệu giảng viên excel
export const ADMIN_SUPERVISOR_EXCEL_HEADER = [
  "Họ tên",
  "SĐT",
  "Email",
  "Ngày sinh",
  "Giới tính",
  "Tỉnh",
  "Phường/Xã",
  "Khoa",
  "Bậc"
] as const;

export const ADMIN_SUPERVISOR_EXCEL_SAMPLE_ROWS: AdminSupervisorExcelRow[] = [
  {
    fullName: "Nguyễn Văn Bình",
    phone: "0881000001",
    email: "gvhd01@utc.edu.vn",
    birthDate: "1985-03-12",
    gender: "Nam",
    provinceName: "Hà Nội",
    wardName: "Phường Dịch Vọng Hậu",
    faculty: "Công nghệ thông tin",
    degree: "Tiến sĩ"
  },
  {
    fullName: "Trần Thị Hương",
    phone: "0881000002",
    email: "gvhd02@utc.edu.vn",
    birthDate: "1988-07-21",
    gender: "Nữ",
    provinceName: "Hà Nội",
    wardName: "Phường Yên Hòa",
    faculty: "Kinh tế",
    degree: "Thạc sĩ"
  },
  {
    fullName: "Lê Minh Hải",
    phone: "0881000003",
    email: "gvhd03@utc.edu.vn",
    birthDate: "1980-11-05",
    gender: "Nam",
    provinceName: "Hà Nội",
    wardName: "Phường Trung Hòa",
    faculty: "Xây dựng",
    degree: "Phó giáo sư"
  },
  {
    fullName: "Phạm Thu Trang",
    phone: "0881000004",
    email: "gvhd04@utc.edu.vn",
    birthDate: "1976-02-18",
    gender: "Nữ",
    provinceName: "Hà Nội",
    wardName: "Phường Nghĩa Tân",
    faculty: "Điện tử viễn thông",
    degree: "Giáo sư"
  },
  {
    fullName: "Vũ Quốc Anh",
    phone: "0881000005",
    email: "gvhd05@utc.edu.vn",
    birthDate: "1986-09-30",
    gender: "Nam",
    provinceName: "Hà Nội",
    wardName: "Phường Quan Hoa",
    faculty: "Công nghệ thông tin",
    degree: "Thạc sĩ"
  },
  {
    fullName: "Ngô Thị Mai",
    phone: "0881000006",
    email: "gvhd06@utc.edu.vn",
    birthDate: "1984-01-10",
    gender: "Nữ",
    provinceName: "Hà Nội",
    wardName: "Phường Láng Thượng",
    faculty: "Xây dựng",
    degree: "Tiến sĩ"
  },
  {
    fullName: "Đặng Minh Đức",
    phone: "0881000007",
    email: "gvhd07@utc.edu.vn",
    birthDate: "1982-05-26",
    gender: "Nam",
    provinceName: "Hà Nội",
    wardName: "Phường Giảng Võ",
    faculty: "Kinh tế",
    degree: "Tiến sĩ"
  },
  {
    fullName: "Bùi Thu Hà",
    phone: "0881000008",
    email: "gvhd08@utc.edu.vn",
    birthDate: "1989-12-03",
    gender: "Nữ",
    provinceName: "Hà Nội",
    wardName: "Phường Bách Khoa",
    faculty: "Quản lý xây dựng",
    degree: "Thạc sĩ"
  },
  {
    fullName: "Hoàng Văn Long",
    phone: "0881000009",
    email: "gvhd09@utc.edu.vn",
    birthDate: "1979-08-14",
    gender: "Nam",
    provinceName: "Hà Nội",
    wardName: "Phường Khương Mai",
    faculty: "Điện tử viễn thông",
    degree: "Phó giáo sư"
  },
  {
    fullName: "Đỗ Thảo Vy",
    phone: "0881000010",
    email: "gvhd10@utc.edu.vn",
    birthDate: "1990-04-09",
    gender: "Nữ",
    provinceName: "Hà Nội",
    wardName: "Phường Dịch Vọng",
    faculty: "Công nghệ thông tin",
    degree: "Thạc sĩ"
  }
];

