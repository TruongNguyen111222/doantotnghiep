export type AdminStudentExcelRow = { //type dữ liệu sinh viên excel
  msv: string; //mã sinh viên     
  fullName: string;
  className: string; //lớp
  faculty: string; //khoa
  cohort: string; //khóa
  degree: "Cử nhân" | "Kỹ sư";
  phone: string;
  email: string;
  birthDate: string; // YYYY-MM-DD
  gender: "Nam" | "Nữ" | "Khác";
  provinceName: string;
  wardName: string;
};

export const ADMIN_STUDENT_EXCEL_HEADER = [ //header dữ liệu sinh viên excel
  "MSV",
  "Họ tên",
  "Lớp",
  "Khoa",
  "Khóa",
  "Bậc",
  "SĐT",
  "Email",
  "Ngày sinh",
  "Giới tính",
  "Tỉnh",
  "Phường/Xã"
] as const;

export const ADMIN_STUDENT_FILTER_EXPORT_EXTRA_HEADER = [ //header dữ liệu sinh viên excel thêm
  "Trạng thái thực tập",
  "GVHD họ tên",
  "GVHD email",
  "GVHD SĐT",
  "Tên đợt thực tập"
] as const;

export const ADMIN_STUDENT_FILTER_EXPORT_HEADER = [...ADMIN_STUDENT_EXCEL_HEADER, ...ADMIN_STUDENT_FILTER_EXPORT_EXTRA_HEADER];

export const ADMIN_STUDENT_EXCEL_SAMPLE_ROWS: AdminStudentExcelRow[] = [ //dữ liệu mẫu sinh viên excel
  {
    msv: "10000001",
    fullName: "Nguyễn Văn An",
    className: "CNTT01",
    faculty: "Công nghệ thông tin",
    cohort: "K66",
    degree: "Kỹ sư",
    phone: "0880000001",
    email: "sv10000001@utc.edu.vn",
    birthDate: "2000-01-31",
    gender: "Nam",
    provinceName: "Hà Nội",
    wardName: "Phường Dịch Vọng Hậu"
  },
  {
    msv: "10000002",
    fullName: "Trần Thị Mai",
    className: "CNTT02",
    faculty: "Công nghệ thông tin",
    cohort: "K66",
    degree: "Cử nhân",
    phone: "0880000002",
    email: "sv10000002@utc.edu.vn",
    birthDate: "2001-05-20",
    gender: "Nữ",
    provinceName: "Hà Nội",
    wardName: "Phường Dịch Vọng"
  },
  {
    msv: "10000003",
    fullName: "Lê Minh Quân",
    className: "XD01",
    faculty: "Xây dựng",
    cohort: "K65",
    degree: "Kỹ sư",
    phone: "0880000003",
    email: "sv10000003@utc.edu.vn",
    birthDate: "1999-11-12",
    gender: "Nam",
    provinceName: "Hà Nội",
    wardName: "Phường Trung Hòa"
  },
  {
    msv: "10000004",
    fullName: "Phạm Thu Hà",
    className: "KT01",
    faculty: "Kinh tế",
    cohort: "K67",
    degree: "Cử nhân",
    phone: "0880000004",
    email: "sv10000004@utc.edu.vn",
    birthDate: "2000-08-08",
    gender: "Nữ",
    provinceName: "Hà Nội",
    wardName: "Phường Yên Hòa"
  },
  {
    msv: "10000005",
    fullName: "Đỗ Đức Long",
    className: "DT01",
    faculty: "Điện tử viễn thông",
    cohort: "K66",
    degree: "Kỹ sư",
    phone: "0880000005",
    email: "sv10000005@utc.edu.vn",
    birthDate: "1998-09-15",
    gender: "Nam",
    provinceName: "Hà Nội",
    wardName: "Phường Nghĩa Tân"
  },
  {
    msv: "10000006",
    fullName: "Vũ Thị Lan",
    className: "KT02",
    faculty: "Kinh tế",
    cohort: "K66",
    degree: "Cử nhân",
    phone: "0880000006",
    email: "sv10000006@utc.edu.vn",
    birthDate: "2000-03-02",
    gender: "Nữ",
    provinceName: "Hà Nội",
    wardName: "Phường Giảng Võ"
  },
  {
    msv: "10000007",
    fullName: "Hoàng Minh Đức",
    className: "CNTT03",
    faculty: "Công nghệ thông tin",
    cohort: "K67",
    degree: "Kỹ sư",
    phone: "0880000007",
    email: "sv10000007@utc.edu.vn",
    birthDate: "1999-06-18",
    gender: "Nam",
    provinceName: "Hà Nội",
    wardName: "Phường Quan Hoa"
  },
  {
    msv: "10000008",
    fullName: "Ngô Thu Trang",
    className: "XD02",
    faculty: "Xây dựng",
    cohort: "K66",
    degree: "Cử nhân",
    phone: "0880000008",
    email: "sv10000008@utc.edu.vn",
    birthDate: "2001-12-10",
    gender: "Nữ",
    provinceName: "Hà Nội",
    wardName: "Phường Láng Thượng"
  },
  {
    msv: "10000009",
    fullName: "Bùi Quốc Huy",
    className: "DT02",
    faculty: "Điện tử viễn thông",
    cohort: "K65",
    degree: "Kỹ sư",
    phone: "0880000009",
    email: "sv10000009@utc.edu.vn",
    birthDate: "1998-02-25",
    gender: "Nam",
    provinceName: "Hà Nội",
    wardName: "Phường Khương Mai"
  },
  {
    msv: "10000010",
    fullName: "Đặng Thảo Vy",
    className: "QL01",
    faculty: "Quản lý xây dựng",
    cohort: "K67",
    degree: "Cử nhân",
    phone: "0880000010",
    email: "sv10000010@utc.edu.vn",
    birthDate: "2000-10-05",
    gender: "Nữ",
    provinceName: "Hà Nội",
    wardName: "Phường Bách Khoa"
  }
];

