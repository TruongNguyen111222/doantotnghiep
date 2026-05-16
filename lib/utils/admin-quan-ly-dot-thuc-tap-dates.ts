//hàm tiện ích (Utility Functions) chuyên dùng để xử lý và định dạng ngày tháng trong toàn bộ phân hệ

export function formatDateVi(iso: string | null | undefined) { //định dạng ngày tháng theo tiếng Việt
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("vi-VN");
}

export function todayDateInputValue() { //hàm tạo ngày hiện tại cho form đợt thực tập
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function getTodayStart() { //hàm tạo ngày bắt đầu của ngày hiện tại
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function parseDateOnly(input: string) { //hàm phân tích ngày tháng từ chuỗi ISO
  // input: YYYY-MM-DD
  return new Date(`${input}T00:00:00.000Z`);
}

