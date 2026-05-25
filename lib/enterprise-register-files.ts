
import { MAX_ENTERPRISE_BASE64_CHARS, MAX_ENTERPRISE_UPLOAD_BYTES } from "@/lib/constants/doanhnghiep";

/** Giấy phép: PDF hoặc tài liệu Word (.doc, .docx). */
export const ENTERPRISE_LICENSE_MIMES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
] as const;

export const ENTERPRISE_LOGO_MIMES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;

export type DecodeEnterpriseFileResult =
  | { ok: true; base64: string; mime: string; byteLength: number }
  | { ok: false; message: string };

/**
 * Chuẩn hóa base64 (bỏ data URL nếu có), kiểm tra kích thước và MIME; trả về base64 thuần chuẩn từ buffer.
 */
export function decodeEnterpriseFilePayload(
  rawBase64: string | undefined,
  clientMime: string | undefined,
  allowed: readonly string[]
): DecodeEnterpriseFileResult {
  if (rawBase64 === undefined || typeof rawBase64 !== "string" || !rawBase64.trim()) {
    return { ok: false, message: "Thiếu nội dung file." };
  }
  let payload = rawBase64.trim().replace(/\s/g, "");
  if (payload.startsWith("data:")) {
    const idx = payload.indexOf("base64,");
    if (idx === -1) return { ok: false, message: "Định dạng file không hợp lệ." };
    payload = payload.slice(idx + 7);
  }
  if (payload.length > MAX_ENTERPRISE_BASE64_CHARS) {
    return {
      ok: false,
      message: `Mỗi file tối đa ${MAX_ENTERPRISE_UPLOAD_BYTES / (1024 * 1024)} MB.`
    };
  }
  const buf = Buffer.from(payload, "base64");
  if (buf.length > MAX_ENTERPRISE_UPLOAD_BYTES) {
    return {
      ok: false,
      message: `Mỗi file tối đa ${MAX_ENTERPRISE_UPLOAD_BYTES / (1024 * 1024)} MB.`
    };
  }
  if (buf.length === 0) {
    return { ok: false, message: "File rỗng." };
  }
  const mime = (clientMime || "application/octet-stream").split(";")[0].trim().toLowerCase();
  if (!(allowed as readonly string[]).includes(mime)) {
    return { ok: false, message: "Định dạng file không được hỗ trợ." };
  }
  return { ok: true, base64: buf.toString("base64"), mime, byteLength: buf.length };
}
