import type { BatchFormState } from "@/lib/types/admin-quan-ly-dot-thuc-tap";
import { todayDateInputValue } from "@/lib/utils/admin-quan-ly-dot-thuc-tap-dates"; //hàm tạo ngày hiện tại cho form đợt thực tập
//Khuôn mẫu khởi tạo" dữ liệu rỗng cho Form thêm mới đợt thực tập.
export function buildEmptyBatchForm(): BatchFormState { 
  return { //trả về dữ liệu rỗng cho form đợt thực tập
    name: "", //tên đợt thực tập
    semester: "", //học kỳ
    schoolYear: "", //năm học
    startDate: todayDateInputValue(), //ngày bắt đầu
    endDate: todayDateInputValue(), //ngày kết thúc
    notes: "" //ghi chú
  };
}

