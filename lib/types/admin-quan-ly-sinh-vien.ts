export type Degree = "BACHELOR" | "ENGINEER"; //bậc cử nhân hoặc kỹ sư
export type Gender = "MALE" | "FEMALE" | "OTHER"; //giới tính nam, nữ, khác
export type InternshipStatus = //trạng thái thực tập
  | "NOT_STARTED" //Chưa thực tập
  | "DOING" //Đang thực tập
  | "SELF_FINANCED" //Thực tập tự túc
  | "REPORT_SUBMITTED" //Đã nộp báo cáo thực tập
  | "COMPLETED" //Hoàn thành thực tập
  | "REJECTED"; //Từ chối thực tập

export type StudentListItem = { //danh sách sinh viên
  id: string; // StudentProfile.id
  msv: string; //mã sinh viên
  fullName: string; //họ tên
  className: string; //lớp
  faculty: string; //khoa
  cohort: string; //khóa
  degree: Degree; //bậc
  internshipStatus: InternshipStatus; //trạng thái thực tập
  hasSupervisor: boolean; //có giảng viên hướng dẫn
  phone: string | null; //số điện thoại
  email: string; //email
  birthDate: string | null; //ngày sinh
  gender: Gender; //giới tính
  permanentProvinceCode: string; //mã tỉnh
  permanentWardCode: string; //mã huyện
  permanentProvinceName: string | null;
  permanentWardName: string | null; //tên huyện
  hasLinkedData: boolean; //có liên kết dữ liệu
};

export type Province = { code: number; name: string }; //tỉnh
export type Ward = { code: number; name: string }; //huyện

export type ViewStudent = Omit<StudentListItem, "hasLinkedData">; //danh sách sinh viên
 //type form sinh viên
export type StudentFormState = { //form sinh viên
  msv: string; //mã sinh viên
  fullName: string; //họ tên
  className: string; //lớp
  faculty: string; //khoa
  facultyCustom: string; //khoa tùy chỉnh
  cohort: string; //khóa
  degree: Degree | "";
  phone: string; //số điện thoại
  email: string; //email
  birthDate: string; // yyyy-mm-dd
  gender: Gender | ""; //giới tính
  permanentProvinceCode: string;
  permanentWardCode: string; //mã huyện
};

