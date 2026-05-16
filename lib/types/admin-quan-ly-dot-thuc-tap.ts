//định nghĩa các kiểu dữ liệu cho đợt thực tập
export type InternshipBatchStatus = "OPEN" | "CLOSED"; //trạng thái đợt thực tập

export type Semester = "HK_I" | "HK_II" | "HK_HE" | "HK_PHU"; //học kỳ

export type InternshipBatchRow = { //dữ liệu đợt thực tập
  id: string;
  name: string; //tên đợt thực tập
  semester: Semester;
  schoolYear: string; //năm học       
  startDate: string | null; //ngày bắt đầu
  endDate: string | null; //ngày kết thúc
  status: InternshipBatchStatus; //trạng thái đợt thực tập
  notes: string; //ghi chú
};

export type ApiResponse<T> = { //phản hồi API sau mỗi lần gọi 
  success: boolean; //thành công
  message?: string;
  item?: T; //dữ liệu đợt thực tập
  items?: T[]; //danh sách dữ liệu đợt thực tập
  errors?: Record<string, string>;
}; //lỗi

export type BatchFormState = { //dữ liệu form đợt thực tập      
  name: string; //tên đợt thực tập  
  semester: Semester | "";
  schoolYear: string; //năm học
  startDate: string; //ngày bắt đầu
  endDate: string; //ngày kết thúc
  notes: string; //ghi chú
};

