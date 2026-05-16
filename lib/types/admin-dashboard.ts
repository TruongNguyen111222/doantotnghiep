export type DonutSegment = {  // Kiểu dữ liệu cho đồ thị tròn
  label: string; // Tên của phần tử của đồ thị tròn
  value: number; // Giá trị của phần tử của đồ thị tròn
  percent: number; // Phần trăm của phần tử của đồ thị tròn
  color: string; // Màu sắc của phần tử của đồ thị tròn
};

export type SimpleChartSeries = { // Kiểu dữ liệu cho đồ thị đường
  name: string; // Tên của đồ thị đường
  data: number[]; // Danh sách các giá trị của đồ thị đường
  color: string; // Màu sắc của đồ thị đường
};

export type FacultyStatItem = { // Kiểu dữ liệu cho bảng thống kê khoa
  label: string; // Tên của khoa
  applications: number; // Số lượng ứng dụng của khoa
  offered: number; // Số lượng ứng dụng được chấp nhận của khoa
};

export type OverviewPayload = { // Kiểu dữ liệu trả về từ API , toàn bộ dữ liệu của dashboard
  faculties: string[]; // Danh sách khoa
  batches: Array<{ id: string; name: string; status: string }>; // Danh sách đợt thực tập
  selectedFaculty: string; // Khoa được chọn
  selectedBatchId: string | null; // Đợt thực tập được chọn
  applicationStatusDonut: { // Kiểu dữ liệu cho đồ thị tròn của hồ sơ ứng tuyển
    segments: DonutSegment[]; // Danh sách các phần tử của đồ thị tròn
    total: number; // Tổng số phần tử của đồ thị tròn
  }; // Danh sách các phần tử của đồ thị tròn
  jobStatusDonut: { // Kiểu dữ liệu cho đồ thị tròn của tin tuyển dụng
    segments: DonutSegment[]; // Danh sách các phần tử của đồ thị tròn
    total: number; // Tổng số phần tử của đồ thị tròn
  };
  enterprisesByField: { labels: string[]; values: number[] }; // Danh sách các nhãn và giá trị của đồ thị cột
  progress: { labels: string[]; values: number[] }; // Danh sách các nhãn và giá trị của đồ thị cột của tiến độ thực tập
  lineJobPosts: { labels: string[]; series: SimpleChartSeries[] }; // Danh sách các nhãn và danh sách các đồ thị đường của tin tuyển dụng
  topFaculties: { // Danh sách các khoa có nhiều ứng dụng nhất
    top: FacultyStatItem[]; // Danh sách các khoa có nhiều ứng dụng nhất      
    bottom: FacultyStatItem[]; // Danh sách các khoa có ít ứng dụng nhất
  };
};
