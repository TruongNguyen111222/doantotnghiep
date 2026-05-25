import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

import { GIANGVIEN_BAO_CAO_EXPORT_HEADER, degreeLabel } from "@/lib/constants/giangvien-bao-cao-thuc-tap";
import {
  fetchGiangVienBaoCaoListItems,
  resolveGiangVienSupervisorProfileId
} from "@/lib/server/giangvien-bao-cao-thuc-tap-list";

const MAX_EXPORT = 8000;

function fmtPoint(v: unknown): string { //hàm format điểm
  if (v == null) return ""; //nếu v là null thì trả về ""
  const n = typeof v === "number" ? v : Number(v); //nếu v là number thì trả về v, nếu không thì chuyển đổi v thành number
  if (Number.isNaN(n)) return ""; //nếu n là NaN thì trả về ""
  return String(n); //trả về chuỗi của n
}

function reviewLabel(s: string | null | undefined): string { //hàm format trạng thái review báo cáo thực tập
  if (!s) return ""; //nếu s là null thì trả về ""
  if (s === "APPROVED") return "Đã duyệt"; //nếu s là "APPROVED" thì trả về "Đã duyệt"
  if (s === "REJECTED") return "Từ chối"; //nếu s là "REJECTED" thì trả về "Từ chối"
  return "Chờ duyệt"; //nếu s không phải "APPROVED" hoặc "REJECTED" thì trả về "Chờ duyệt"
}

function submittedDate(iso: string | null | undefined): string { //hàm format ngày nộp báo cáo thực tập
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export async function GET(request: Request) { //hàm xuất file Excel theo điều kiện
  const gv = await resolveGiangVienSupervisorProfileId(); //hàm lấy id giảng viên
  if (!gv.ok) return gv.response;

  try {
    const { searchParams } = new URL(request.url);
    const items = await fetchGiangVienBaoCaoListItems(gv.supervisorProfileId, searchParams);
    if (items.length > MAX_EXPORT) {
      return NextResponse.json(
        { success: false, message: `Kết quả vượt ${MAX_EXPORT} bản ghi. Vui lòng thu hẹp bộ lọc.` },
        { status: 400 }
      );
    }

    const degreeLookup = degreeLabel as Record<string, string>; //hàm xử lý độ bậc

    const dataRows = items.map((row: any) => {
      const rep = row.report; //hàm xử lý báo cáo thực tập
      const ent = row.enterprise; //hàm xử lý doanh nghiệp
      return [
        String(row.msv ?? ""),
        String(row.fullName ?? ""),
        String(row.className ?? ""),
        String(row.faculty ?? ""),
        String(row.cohort ?? ""),
        degreeLookup[String(row.degree ?? "")] ?? String(row.degree ?? ""),
        String(row.phone ?? ""),
        String(row.email ?? ""),
        String(row.statusText ?? ""),
        String(ent?.companyName ?? ""),
        String(ent?.headquartersAddress ?? ""),
        reviewLabel(rep?.reviewStatus),
        submittedDate(rep?.submittedAt),
        fmtPoint(rep?.supervisorPoint),
        fmtPoint(rep?.enterprisePoint),
        String(rep?.reportFileName ?? ""),
        String(rep?.supervisorEvaluation ?? "")
      ];
    });

    const aoa = [[...GIANGVIEN_BAO_CAO_EXPORT_HEADER], ...dataRows]; //hàm xử lý dữ liệu excel
    const ws = XLSX.utils.aoa_to_sheet(aoa); //hàm xử lý dữ liệu excel
    const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
    for (let c = range.s.c; c <= range.e.c; c++) {
      for (let r = range.s.r + 1; r <= range.e.r; r++) {
        const addr = XLSX.utils.encode_cell({ r, c });
        const cell = ws[addr];
        if (!cell) continue;
        cell.t = "s";
        cell.v = String(cell.v ?? "");
      }
    }

    ws["!cols"] = [
      { wch: 12 },
      { wch: 22 },
      { wch: 10 },
      { wch: 22 },
      { wch: 10 },
      { wch: 10 },
      { wch: 14 },
      { wch: 26 },
      { wch: 22 },
      { wch: 26 },
      { wch: 36 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 28 },
      { wch: 40 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Bao cao TT");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

    const disposition = `attachment; filename="bao_cao_thuc_tap.xlsx"; filename*=UTF-8''${encodeURIComponent("bao_cao_thuc_tap_theo_loc.xlsx")}`;

    return new NextResponse(Buffer.from(buf), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": disposition
      }
    });
  } catch (e) {
    console.error("[GET /api/giangvien/bao-cao-thuc-tap/export]", e);
    return NextResponse.json({ success: false, message: "Lỗi máy chủ." }, { status: 500 });
  }
}
