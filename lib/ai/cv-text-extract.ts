import mammoth from "mammoth";

const PDF_MIMES = new Set(["application/pdf"]);
const DOCX_MIMES = new Set([
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
]);
const DOC_MIMES = new Set(["application/msword"]);

async function extractPdfText(bytes: Buffer): Promise<string> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: new Uint8Array(bytes) });
  try {
    const parsed = await parser.getText();
    return String(parsed.text || "").trim();
  } finally {
    await parser.destroy();
  }
}

async function extractDocxText(bytes: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer: bytes });
  return String(result.value || "").trim();
}

export async function extractCvTextFromBytes(bytes: Buffer, mime: string): Promise<string> {
  const m = String(mime || "").trim().toLowerCase();
  if (PDF_MIMES.has(m)) return extractPdfText(bytes);
  if (DOCX_MIMES.has(m)) return extractDocxText(bytes);
  if (DOC_MIMES.has(m)) {
    throw new Error("DOC_LEGACY_UNSUPPORTED");
  }
  throw new Error("UNSUPPORTED_MIME");
}

export function normalizeCvText(text: string, maxChars: number): string {
  const cleaned = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (cleaned.length <= maxChars) return cleaned;
  return `${cleaned.slice(0, maxChars)}\n\n[... nội dung bị cắt bớt do giới hạn độ dài ...]`;
}
