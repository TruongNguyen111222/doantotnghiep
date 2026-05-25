# AI Screening CV (Gemini)

Module **tách biệt** — không sửa luồng ứng tuyển / duyệt hồ sơ hiện có.

## Cấu hình

Thêm vào `.env.local`:

```env
GEMINI_API_KEY=your_gemini_api_key
```

Cần sẵn Cloudinary (CV đã upload) như các chức năng file khác.

Đồng bộ DB (bảng mới `JobApplicationAiScreening`):

```bash
npm run db:push
```

## Cách dùng (Doanh nghiệp)

1. Đăng nhập tài khoản **doanh nghiệp**.
2. Vào **Ứng viên** → chọn tin tuyển dụng → bấm **Xem** một ứng viên.
3. Trong popup chi tiết, ở dòng **File CV đính kèm**, bấm nút **「Phân tích CV (AI)」**.
4. Popup AI mở ra → bấm **「Phân tích CV bằng AI」** → xem điểm khớp, kỹ năng, nhận xét.
5. **「Xem CV gốc」** mở file CV qua API hiện có.

(Không cần mở tab/link riêng — AI nằm ngay trong popup ứng viên.)

## API (tuỳ chọn, gọi từ Postman)

| Method | URL | Mô tả |
|--------|-----|--------|
| GET | `/api/ai/cv-screening/{applicationId}` | Lấy context + kết quả đã lưu |
| POST | `/api/ai/cv-screening/{applicationId}` | Chạy / chạy lại phân tích |

Cần cookie session doanh nghiệp.

## File đã thêm (không sửa code cũ)

```
prisma/schema.prisma                          # model JobApplicationAiScreening
lib/types/ai-cv-screening.ts
lib/constants/ai-cv-screening.ts
lib/ai/enterprise-auth.ts
lib/ai/gemini-client.ts
lib/ai/cv-text-extract.ts
lib/ai/cv-screening-service.ts
app/api/ai/cv-screening/[applicationId]/route.ts
app/doanhnghiep/ai-screen/[applicationId]/page.tsx
app/doanhnghiep/ai-screen/[applicationId]/components/AiCvScreeningClient.tsx
app/doanhnghiep/ai-screen/styles/ai-screen.module.css
docs/AI_CV_SCREENING.md
.env.example                                  # GEMINI_API_KEY
package.json                                  # @google/generative-ai, pdf-parse, mammoth
```

## Ghi chú

- Hỗ trợ CV: **PDF**, **DOCX** (file `.doc` cũ báo lỗi).
- PDF scan ảnh có thể không trích được chữ.
- AI chỉ **gợi ý**; DN vẫn duyệt thủ công trên màn hình cũ.

## Gắn link trên UI cũ (tuỳ chọn)

Nếu muốn nút trên popup ứng viên, thêm link (không bắt buộc):

```tsx
import { buildAiCvScreeningPageUrl } from "@/lib/constants/ai-cv-screening";

<a href={buildAiCvScreeningPageUrl(applicationId)} target="_blank" rel="noreferrer">
  AI Screening CV
</a>
```
