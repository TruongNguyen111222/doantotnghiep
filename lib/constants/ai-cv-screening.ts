/** Free tier ổn định hơn gemini-2.0-flash; override bằng GEMINI_MODEL trong .env nếu cần. */
export const AI_CV_SCREENING_MODEL =
  (typeof process !== "undefined" && process.env.GEMINI_MODEL?.trim()) || "gemini-1.5-flash";

export const AI_CV_SCREENING_MAX_CV_CHARS = 24_000;

export const AI_CV_SCREENING_API_BASE = "/api/ai/cv-screening";
export const AI_CV_SCREENING_DISCLAIMER =
  "Kết quả do AI tạo ra chỉ mang tính tham khảo. Doanh nghiệp vẫn là bên quyết định cuối cùng.";

export const AI_CV_SCREENING_ERROR_NO_GEMINI_KEY =
  "Chưa cấu hình GEMINI_API_KEY trong .env (hoặc .env.local). Thêm khóa rồi lưu file và restart npm run dev.";

export const AI_CV_SCREENING_ERROR_EMPTY_CV_TEXT =
  "Không trích xuất được nội dung CV (file scan ảnh hoặc định dạng không hỗ trợ).";

export const AI_CV_SCREENING_ERROR_QUOTA =
  "Đã hết hạn mức Gemini API (429). Tạo key mới tại Google AI Studio, hoặc nạp thêm tiền để thêm lượt hỏi.";
