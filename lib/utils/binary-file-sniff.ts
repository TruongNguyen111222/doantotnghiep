/** Nhận diện định dạng thật từ magic bytes (ưu tiên hơn Content-Type sai từ CDN). */
//CHỨC NĂng file là  nhận diện file jpeg, png, pdf, doc, docx, xlsx, pptx, zip , tránh file gải , sửa đuôi đúng 
export type BinarySniff = { mime: string; ext: string };

export function sniffBinaryKind(bytes: Buffer): BinarySniff | null {
  if (bytes.length < 4) return null;
  if (bytes.subarray(0, 4).toString("ascii") === "%PDF") {
    return { mime: "application/pdf", ext: ".pdf" };
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { mime: "image/jpeg", ext: ".jpg" };
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return { mime: "image/png", ext: ".png" };
  }
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) {
    const scan = bytes.subarray(0, Math.min(24_000, bytes.length));
    const bin = scan.toString("latin1");
    if (bin.includes("word/")) {
      return {
        mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ext: ".docx"
      };
    }
    if (bin.includes("xl/")) {
      return {
        mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ext: ".xlsx"
      };
    }
    if (bin.includes("ppt/")) {
      return {
        mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        ext: ".pptx"
      };
    }
    return { mime: "application/zip", ext: ".zip" };
  }
  if (bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0) {
    return { mime: "application/msword", ext: ".doc" };
  }
  return null;
}

function normalizeMimeToken(raw: string): string {
  return String(raw || "")
    .split(";")[0]
    .trim()
    .toLowerCase();
}

function isGenericOrBadContentType(ct: string): boolean {
  if (!ct) return true;
  if (ct === "application/octet-stream" || ct === "binary/octet-stream") return true;
  if (ct === "text/plain" || ct === "text/html" || ct === "application/json") return true;
  return false;
}

function sniffIsDocumentOrArchive(s: BinarySniff): boolean {
  return (
    s.mime === "application/pdf" ||
    s.mime.includes("openxmlformats") ||
    s.mime === "application/msword" ||
    s.mime === "application/zip"
  );
}

/** Chuẩn hóa Content-Type từ header + meta + sniff (magic thắng header sai). */
export function resolveContentTypeForBytes(
  bytes: Buffer,
  headerContentType: string | null | undefined,
  fallbackMetaMime: string | null | undefined
): string {
  const sniff = sniffBinaryKind(bytes);
  const header = normalizeMimeToken(String(headerContentType || ""));
  const meta = normalizeMimeToken(String(fallbackMetaMime || ""));

  if (sniff) {
    if (isGenericOrBadContentType(header)) return sniff.mime;
    if (
      sniffIsDocumentOrArchive(sniff) &&
      (header.startsWith("image/") || header.startsWith("text/") || header === "application/json")
    ) {
      return sniff.mime;
    }
    return header;
  }
  if (!isGenericOrBadContentType(header)) return header;
  if (meta && !isGenericOrBadContentType(meta)) return meta;
  return header || meta || "application/octet-stream";
}

/** Gắn đuôi file đúng sniff (giữ phần tên gốc). */
export function filenameWithSniffedExtension(storedName: string, sniff: BinarySniff | null): string {
  const name = String(storedName || "file").replace(/["\r\n]/g, "").trim() || "file";
  if (!sniff) return name;
  const base = name.replace(/\.[^./\\]+$/i, "");
  return `${base || "file"}${sniff.ext}`;
}
