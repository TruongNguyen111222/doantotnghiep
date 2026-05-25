import crypto from "crypto";
import path from "path";
import { v2 as cloudinary } from "cloudinary";
import { resolveContentTypeForBytes } from "@/lib/utils/binary-file-sniff";
import {
  buildCloudinaryImageDeliveryUrl,
  buildCloudinaryRawDeliveryUrl
} from "./cloudinary-public";

export type CloudinaryUploadResult = {
  publicId: string;
};

export {
  CLOUDINARY_REF_PREFIX,
  buildCloudinaryImageDeliveryUrl,
  buildCloudinaryRawDeliveryUrl,
  enterpriseLicensePublicIdFromStored,
  fromCloudinaryRef,
  toCloudinaryRef
} from "./cloudinary-public";



//tải file lên cloudinary (đóng gói file , ký xác thực và gửi lên api cloudinary)
function requiredEnv(name: string): string { //lấy tên env
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function sanitizeSegment(s: string): string { //làm sạch chuỗi
  return String(s || "")
    .replace(/[^\w.\-() ]+/g, "")
    .trim()
    .slice(0, 120);
}

function removeExtension(filename: string): string { //xóa đuôi file
  const parsed = path.parse(filename);
  return parsed.name || filename;
}
//hồ sơ sinh viên
export function buildCvPublicId(ownerId: string, originalName: string): string { //tạo public id cho file cv
  const safeOwner = sanitizeSegment(ownerId) || "anonymous";
  const safeOriginal = sanitizeSegment(originalName) || "resume";
  const nameNoExt = sanitizeSegment(removeExtension(safeOriginal)).slice(0, 80) || "resume";
  const safeName = nameNoExt.replace(/\s+/g, "_");
  return `resumes/${safeOwner}_${Date.now()}_${safeName}`;
}
//tạo id file báo cáo thực tập
export function buildInternshipReportPublicId(ownerId: string, originalName: string): string {
  const safeOwner = sanitizeSegment(ownerId) || "anonymous";
  const safeOriginal = sanitizeSegment(originalName) || "report";
  const nameNoExt = sanitizeSegment(removeExtension(safeOriginal)).slice(0, 80) || "report";
  const safeName = nameNoExt.replace(/\s+/g, "_");
  return `internship_reports/${safeOwner}_${Date.now()}_${safeName}`;
}
//lấy đuôi file giấy phép doanh nghiệp
function licensePublicIdSuffix(originalName: string): string {
  const ext = path.extname(String(originalName || "").trim()).toLowerCase();
  if (/^\.(pdf|docx?)$/i.test(ext)) return ext.replace(/[^.a-z0-9]/gi, "") || ".pdf";
  return ".pdf";
}
//tạo id file giấy phép doanh nghiệp
export function buildEnterpriseLicensePublicId(ownerKey: string, originalName: string): string {
  const safeOwner = sanitizeSegment(ownerKey) || "enterprise";
  const safeOriginal = sanitizeSegment(originalName) || "business_license";
  const nameNoExt = sanitizeSegment(removeExtension(safeOriginal)).slice(0, 80) || "business_license";
  const safeName = nameNoExt.replace(/\s+/g, "_");
  const suffix = licensePublicIdSuffix(safeOriginal);
  return `enterprise_licenses/${safeOwner}_${Date.now()}_${safeName}${suffix}`;
}
//tạo id file logo doanh nghiệp
export function buildEnterpriseLogoPublicId(ownerKey: string, originalName: string): string {
  const safeOwner = sanitizeSegment(ownerKey) || "enterprise";
  const safeOriginal = sanitizeSegment(originalName) || "company_logo";
  const nameNoExt = sanitizeSegment(removeExtension(safeOriginal)).slice(0, 80) || "company_logo";
  const safeName = nameNoExt.replace(/\s+/g, "_");
  return `enterprise_logos/${safeOwner}_${Date.now()}_${safeName}`;
}
//tạo chữ ký bảo mật
function buildSignature(params: Record<string, string>, apiSecret: string): string {
  const toSign = Object.keys(params) //id - nối lại 
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return crypto.createHash("sha1").update(toSign + apiSecret).digest("hex"); //gắn secret vào toSign để mã hóa
}
//bọc lại để upload file cv lên cloudinary
export async function uploadCvBytesToCloudinary(input: {
  bytes: Buffer; //nội dung file base64
  mimeType: string; //định dạng file
  ownerId: string; 
  originalName: string; 
}): Promise<CloudinaryUploadResult> {
  return uploadBytesToCloudinary({
    bytes: input.bytes,
    mimeType: input.mimeType,
    publicId: buildCvPublicId(input.ownerId, input.originalName), //tạo tên id file cv
    resourceType: "raw" //file thô 
  });
}
//tải file báo cáo thực tập lên cloudinary
export async function uploadInternshipReportBytesToCloudinary(input: {
  bytes: Buffer;
  mimeType: string;
  ownerId: string;
  originalName: string;
}): Promise<CloudinaryUploadResult> {
  return uploadBytesToCloudinary({
    bytes: input.bytes,
    mimeType: input.mimeType,
    publicId: buildInternshipReportPublicId(input.ownerId, input.originalName),
    resourceType: "raw"
  });
}
//tải file giấy phép doanh nghiệp lên cloudinary
export async function uploadEnterpriseLicenseBytesToCloudinary(input: {
  bytes: Buffer;
  mimeType: string;
  ownerKey: string;
  originalName: string;
}): Promise<CloudinaryUploadResult> {
  return uploadBytesToCloudinary({
    bytes: input.bytes,
    mimeType: input.mimeType,
    publicId: buildEnterpriseLicensePublicId(input.ownerKey, input.originalName),
    resourceType: "raw"
  });
}
//tải file logo doanh nghiệp lên cloudinary
export async function uploadEnterpriseLogoBytesToCloudinary(input: {
  bytes: Buffer;
  mimeType: string;
  ownerKey: string;
  originalName: string;
}): Promise<CloudinaryUploadResult> {
  return uploadBytesToCloudinary({
    bytes: input.bytes,
    mimeType: input.mimeType,
    publicId: buildEnterpriseLogoPublicId(input.ownerKey, input.originalName),
    resourceType: "image"
  });
}
//tải file lên cloudinary (đóng gói file , ký xác thực và gửi lên api cloudinary)
async function uploadBytesToCloudinary(input: {
  bytes: Buffer;
  mimeType: string;
  publicId: string;
  resourceType: "raw" | "image";
}): Promise<CloudinaryUploadResult> {
  //lấy tên cloud name, api key và api secret từ env
  const cloudName = requiredEnv("CLOUDINARY_CLOUD_NAME");
  const apiKey = requiredEnv("CLOUDINARY_API_KEY");
  const apiSecret = requiredEnv("CLOUDINARY_API_SECRET");

  const timestamp = String(Math.floor(Date.now() / 1000)); //thời gian hiện tại
  const publicId = input.publicId; //tên id file

  const signParams: Record<string, string> = { //tham số ký xác thực
    public_id: publicId,
    timestamp
  };
  const signature = buildSignature(signParams, apiSecret);

  const form = new FormData(); //tạo form data để gửi lên api cloudinary
  //tạo url dữ liệu file base64
  const fileDataUrl = `data:${input.mimeType};base64,${input.bytes.toString("base64")}`;
  //nhét dữ liệu file vào form data
  form.set("file", fileDataUrl);
  form.set("api_key", apiKey);
  form.set("timestamp", timestamp);
  form.set("public_id", publicId);
  form.set("resource_type", input.resourceType);
  form.set("signature", signature);

  //gửi lên api cloudinary
  const endpoint = `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/${input.resourceType}/upload`;
  const res = await fetch(endpoint, { method: "POST", body: form });
  const data = (await res.json()) as any;
  //kiểm tra response có lỗi không
  if (!res.ok) {
    const msg = typeof data?.error?.message === "string" ? data.error.message : "Cloudinary upload failed";
    throw new Error(msg);
  }

  const outPublicId = String(data?.public_id || "");
  if (!outPublicId) throw new Error("Cloudinary response missing public_id");

  return { publicId: outPublicId }; //trả về tên id file
}



/**
 * Tải file raw/image từ Cloudinary (proxy API).
 * Thứ tự: URL ký (SDK) → raw delivery công khai → image delivery (fallback public_id nhầm loại).
 */
function cloudinarySigningEnv(): { cloud_name: string; api_key: string; api_secret: string } | null {
  const cloud_name =
    String(process.env.CLOUDINARY_CLOUD_NAME || "").trim() ||
    String(process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "").trim();
  const api_key = String(process.env.CLOUDINARY_API_KEY || "").trim();
  const api_secret = String(process.env.CLOUDINARY_API_SECRET || "").trim();
  if (!cloud_name || !api_key || !api_secret) return null;
  return { cloud_name, api_key, api_secret };
}

function encodedPublicIdPath(pid: string): string {
  return String(pid || "")
    .trim()
    .replace(/^\/+/, "")
    .split("/")
    .filter(Boolean)
    .map((seg) => encodeURIComponent(seg))
    .join("/");
}

function pushUnsignedRawDeliveryVariants(pid: string, push: (u: string | null | undefined) => void) {
  const base = buildCloudinaryRawDeliveryUrl(pid);
  if (!base) return;
  if (pid.includes("/")) {
    const parts = base.split("/raw/upload/");
    if (parts.length === 2) {
      push(`${parts[0]}/raw/upload/v1/${parts[1]}`);
    }
  }
  push(base);
}

/** Thử mọi cloud name trong env + đường `files` (SDK map raw/upload → files). */
function pushResCloudinaryDeliveryMatrix(pid: string, push: (u: string | null | undefined) => void) {
  const enc = encodedPublicIdPath(pid);
  if (!enc) return;
  const clouds = new Set<string>();
  const a = String(process.env.CLOUDINARY_CLOUD_NAME || "").trim();
  const b = String(process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "").trim();
  if (a) clouds.add(a);
  if (b) clouds.add(b);
  for (const cloud of clouds) {
    const c = encodeURIComponent(cloud);
    const host = `https://res.cloudinary.com/${c}`;
    push(`${host}/raw/upload/v1/${enc}`);
    push(`${host}/raw/upload/${enc}`);
    push(`${host}/files/v1/${enc}`);
    push(`${host}/files/${enc}`);
  }
}

async function collectUrlsFromSdkApiResource(
  cred: { cloud_name: string; api_key: string; api_secret: string },
  pid: string
): Promise<string[]> {
  cloudinary.config({
    cloud_name: cred.cloud_name,
    api_key: cred.api_key,
    api_secret: cred.api_secret,
    secure: true
  });
  const out: string[] = [];
  const seen = new Set<string>();
  const add = (u: string | undefined) => {
    const s = String(u || "").trim();
    if (s && !seen.has(s)) {
      seen.add(s);
      out.push(s);
    }
  };
  for (const rt of ["raw", "image"] as const) {
    const meta = await new Promise<{ secure_url?: string; url?: string } | null>((resolve) => {
      cloudinary.api.resource(pid, { resource_type: rt }, (err: unknown, res: unknown) => {
        if (err || !res || typeof res !== "object") resolve(null);
        else resolve(res as { secure_url?: string; url?: string });
      });
    });
    if (meta) {
      add(meta.secure_url);
      add(meta.url);
    }
  }
  return out;
}

async function collectDeliveryUrlsFromAdminApi(
  cred: { cloud_name: string; api_key: string; api_secret: string },
  pid: string
): Promise<string[]> {
  const auth = Buffer.from(`${cred.api_key}:${cred.api_secret}`).toString("base64");
  const headers = { Authorization: `Basic ${auth}`, Accept: "application/json" };
  const cloud = encodeURIComponent(cred.cloud_name);
  const encOne = encodeURIComponent(pid.replace(/^\/+/, ""));
  const encPath = encodedPublicIdPath(pid);
  const q = encodeURIComponent(pid.replace(/^\/+/, ""));
  const tryMeta: string[] = [];
  for (const rt of ["raw", "image"] as const) {
    tryMeta.push(`https://api.cloudinary.com/v1_1/${cloud}/resources/${rt}/upload?public_id=${q}`);
    tryMeta.push(`https://api.cloudinary.com/v1_1/${cloud}/resources/${rt}/upload/${encOne}`);
    if (encPath !== encOne) {
      tryMeta.push(`https://api.cloudinary.com/v1_1/${cloud}/resources/${rt}/upload/${encPath}`);
    }
  }
  const out: string[] = [];
  const seen = new Set<string>();
  for (const url of tryMeta) {
    try {
      const res = await fetch(url, { cache: "no-store", headers });
      if (!res.ok) continue;
      const j = (await res.json()) as { secure_url?: string; url?: string };
      for (const k of [j.secure_url, j.url] as const) {
        const s = typeof k === "string" ? k.trim() : "";
        if (s && !seen.has(s)) {
          seen.add(s);
          out.push(s);
        }
      }
    } catch {
      /* ignore */
    }
  }
  return out;
}

function looksLikePdfOrZip(bytes: Buffer): boolean {
  if (bytes.length >= 4 && bytes.subarray(0, 4).toString("ascii") === "%PDF") return true;
  if (bytes.length >= 2 && bytes[0] === 0x50 && bytes[1] === 0x4b) return true;
  return false;
}

function isLikelyCloudinaryErrorBody(contentType: string, bytes: Buffer): boolean {
  if (looksLikePdfOrZip(bytes)) return false;
  const ct = contentType.split(";")[0].trim().toLowerCase();
  if (ct === "application/pdf" || ct === "application/octet-stream") return false;
  if (ct === "application/json" || ct === "text/html") return true;
  if (ct === "text/plain" && bytes.length < 2000) return true;
  if (bytes.length > 0 && bytes.length < 512) {
    const head = bytes.subarray(0, 1).toString("ascii");
    if (head === "{" || head === "<") return true;
  }
  return false;
}

//tải file từ cloudinary
export async function fetchCloudinaryBytesByPublicId(publicId: string): Promise<{ bytes: Buffer; contentType: string } | null> {
  const pid = String(publicId || "").trim().replace(/^\/+/, "");
  if (!pid) return null;

  const urls: string[] = [];
  const seen = new Set<string>();
  const push = (u: string | null | undefined) => {
    const s = String(u || "").trim();
    if (s && !seen.has(s)) {
      seen.add(s);
      urls.push(s);
    }
  };

  const cred = cloudinarySigningEnv();
  if (cred) {
    cloudinary.config({
      cloud_name: cred.cloud_name,
      api_key: cred.api_key,
      api_secret: cred.api_secret,
      secure: true
    });
    const signedBase = {
      secure: true,
      sign_url: true,
      cloud_name: cred.cloud_name,
      api_secret: cred.api_secret
    } as const;
    try {
      push(cloudinary.url(pid, { ...signedBase, resource_type: "raw" }));
    } catch (e) {
      console.warn("cloudinary.url raw signed failed", e);
    }
    try {
      push(cloudinary.url(pid, { ...signedBase, resource_type: "image" }));
    } catch {
      /* ignore */
    }
    try {
      push(
        cloudinary.url(pid, {
          ...signedBase,
          resource_type: "raw",
          type: "upload"
        })
      );
    } catch {
      /* ignore */
    }
    try {
      push(cloudinary.url(pid, { ...signedBase, resource_type: "raw", long_url_signature: true }));
    } catch {
      /* ignore */
    }
  }

  pushUnsignedRawDeliveryVariants(pid, push);
  pushResCloudinaryDeliveryMatrix(pid, push);
  push(buildCloudinaryImageDeliveryUrl(pid));

  const tryFetch = async (candidates: string[]): Promise<{ bytes: Buffer; contentType: string } | null> => {
    const headers: Record<string, string> = {
      Accept: "*/*",
      "User-Agent": "Mozilla/5.0 (compatible; UTC-Manage-FileProxy/1.0)"
    };
    for (const url of candidates) {
      try {
        const res = await fetch(url, { cache: "no-store", headers, redirect: "follow" });
        if (!res.ok) continue;
        const bytes = Buffer.from(await res.arrayBuffer());
        if (bytes.length === 0) continue;
        const contentType = String(res.headers.get("content-type") || "").trim().toLowerCase();
        if (isLikelyCloudinaryErrorBody(contentType, bytes)) continue;
        const fixed = resolveContentTypeForBytes(bytes, contentType, null);
        return { bytes, contentType: fixed };
      } catch {
        continue;
      }
    }
    return null;
  };

  const first = await tryFetch(urls);
  if (first) return first;

  if (cred) {
    const fromAdmin = await collectDeliveryUrlsFromAdminApi(cred, pid);
    const second = await tryFetch(fromAdmin);
    if (second) return second;

    const fromSdk = await collectUrlsFromSdkApiResource(cred, pid);
    const third = await tryFetch(fromSdk);
    if (third) return third;
  }

  return null;
}
