import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

import { getAdminSession } from "@/lib/auth/admin-session";
import { prisma } from "@/lib/prisma";
import { ADMIN_TIEN_DO_FILTER_EXPORT_HEADER } from "@/lib/constants/admin-quan-ly-tien-do-thuc-tap";
import { ADMIN_QUAN_LY_SINH_VIEN_DEGREE_LABEL } from "@/lib/constants/admin-quan-ly-sinh-vien";
import { buildAdminTienDoListWhere } from "@/lib/server/admin-tien-do-list-filter"; //hàm lấy danh sách tiến độ thực tập
import { getAdminTienDoStatusLabel } from "@/lib/utils/admin-tien-do-status-label";
import type { InternshipStatus } from "@/lib/types/admin-quan-ly-tien-do-thuc-tap";

const MAX_EXPORT = 8000;

function fmtPoint(v: unknown): string { //hàm chuyển đổi điểm thành chuỗi
  if (v == null) return ""; //nếu điểm là null hoặc undefined thì trả về chuỗi rỗng
  const n = typeof v === "number" ? v : Number(v); //nếu điểm là số thì trả về số đó, nếu không thì chuyển đổi thành số
  if (Number.isNaN(n)) return ""; //nếu điểm không phải là số thì trả về chuỗi rỗng
  return String(n); //trả về chuỗi điểm
}

function reportReviewLabel(s: string | null | undefined): string { //hàm chuyển đổi trạng thái review báo cáo thành chuỗi
  if (!s) return ""; //nếu trạng thái review báo cáo là null hoặc undefined thì trả về chuỗi rỗng
  if (s === "APPROVED") return "Đã duyệt"; //nếu trạng thái review báo cáo là APPROVED thì trả về chuỗi "Đã duyệt"
  if (s === "REJECTED") return "Từ chối"; //nếu trạng thái review báo cáo là REJECTED thì trả về chuỗi "Từ chối"
  if (s === "PENDING") return "Chờ duyệt"; //nếu trạng thái review báo cáo là PENDING thì trả về chuỗi "Chờ duyệt"
  return String(s); //trả về chuỗi trạng thái review báo cáo
}

export async function GET(request: Request) { //hàm xuất file Excel tiến độ thực tập
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ message: "Không có quyền truy cập." }, { status: 403 }); //nếu không có quyền truy cập thì trả về lỗi 403

  try {
    const { searchParams } = new URL(request.url); //lấy tham số từ URL
    const prismaAny = prisma as any; //lấy prisma
    const where = buildAdminTienDoListWhere(searchParams) as any; //lấy danh sách tiến độ thực tập

    const totalItems = await prismaAny.studentProfile.count({ where }); //lấy số lượng sinh viên
    if (totalItems > MAX_EXPORT) { //nếu số lượng sinh viên vượt quá MAX_EXPORT thì trả về lỗi 400
      return NextResponse.json(
        { message: `Kết quả vượt ${MAX_EXPORT} sinh viên. Vui lòng thu hẹp bộ lọc hoặc từ khóa tìm kiếm.` },
        { status: 400 } //trả về lỗi 400
      );
    }

    const rows = await prismaAny.studentProfile.findMany({ //lấy danh sách sinh viên  
      where, //điều kiện tìm kiếm
      orderBy: { msv: "asc" }, //sắp xếp theo mã sinh viên
      take: MAX_EXPORT, //lấy MAX_EXPORT sinh viên
      select: {
        id: true,
        userId: true,
        msv: true,
        className: true,
        faculty: true,
        cohort: true,
        degree: true,
        internshipStatus: true,
        user: { select: { fullName: true, phone: true, email: true } },
        internshipReport: {
          select: { reviewStatus: true, supervisorPoint: true, enterprisePoint: true }
        },
        assignmentLinks: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            supervisorAssignment: {
              select: {
                supervisorProfile: {
                  select: { user: { select: { fullName: true, email: true, phone: true } } }
                }
              }
            }
          }
        }
      }
    });

    const userIds = [...new Set(rows.map((r: { userId: string }) => String(r.userId)).filter(Boolean))];
    const enterpriseByUserId = new Map<string, { companyName: string; position: string }>(); //map công ty theo id sinh viên

    if (userIds.length) { //nếu có sinh viên thì lấy danh sách công ty theo id sinh viên
      const apps = await prismaAny.jobApplication.findMany({ //lấy danh sách ứng tuyển
        where: { studentUserId: { in: userIds }, status: "OFFERED", response: "ACCEPTED" }, //điều kiện tìm kiếm
        orderBy: { createdAt: "desc" }, //sắp xếp theo thời gian
        select: {
          studentUserId: true,
          jobPost: {
            select: {
              title: true,
              enterpriseUser: { select: { companyName: true } }
            }
          }
        }
      });
      for (const a of apps) {
        const uid = String(a.studentUserId);
        if (enterpriseByUserId.has(uid)) continue;
        enterpriseByUserId.set(uid, {
          companyName: String(a.jobPost?.enterpriseUser?.companyName ?? ""),
          position: String(a.jobPost?.title ?? "")
        });
      }
    }

    const degreeMap = ADMIN_QUAN_LY_SINH_VIEN_DEGREE_LABEL as Record<string, string>; //map bậc theo id sinh viên

    const dataRows = rows.map((r: any) => { //lấy danh sách sinh viên
      const internshipStatus = r.internshipStatus as InternshipStatus; //trạng thái thực tập
      const reportReviewStatus = r.internshipReport?.reviewStatus ?? null; //trạng thái review báo cáo
      const statusLabel = getAdminTienDoStatusLabel(internshipStatus, reportReviewStatus); //trạng thái tiến độ thực tập
      const sup = r.assignmentLinks?.[0]?.supervisorAssignment?.supervisorProfile?.user; //giảng viên hướng dẫn

      let companyName = ""; //tên công ty
      let position = ""; //chức vụ
      if (internshipStatus !== "SELF_FINANCED") { //nếu trạng thái thực tập không phải là SELF_FINANCED thì lấy tên công ty và chức vụ
        const ent = enterpriseByUserId.get(String(r.userId)); //lấy công ty theo id sinh viên
        if (ent) {
          companyName = ent.companyName;
          position = ent.position;
        }
      }

      return [ //lấy dữ liện sinh viên
        String(r.msv ?? ""),
        String(r.user?.fullName ?? ""),
        String(r.className ?? ""),
        String(r.faculty ?? ""),
        String(r.cohort ?? ""),
        degreeMap[String(r.degree ?? "")] ?? String(r.degree ?? ""),
        String(r.user?.phone ?? ""),
        String(r.user?.email ?? ""),
        statusLabel,
        String(sup?.fullName ?? ""),
        String(sup?.email ?? ""),
        String(sup?.phone ?? ""),
        companyName,
        position,
        reportReviewLabel(reportReviewStatus),
        fmtPoint(r.internshipReport?.supervisorPoint),
        fmtPoint(r.internshipReport?.enterprisePoint)
      ];
    });

    const aoa = [[...ADMIN_TIEN_DO_FILTER_EXPORT_HEADER], ...dataRows]; //tạo dữ liệu excel
    const ws = XLSX.utils.aoa_to_sheet(aoa);
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
      { wch: 28 },
      { wch: 22 },
      { wch: 26 },
      { wch: 14 },
      { wch: 28 },
      { wch: 24 },
      { wch: 18 },
      { wch: 16 },
      { wch: 14 },
      { wch: 14 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tien do TT");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

    const disposition = `attachment; filename="tien_do_thuc_tap.xlsx"; filename*=UTF-8''${encodeURIComponent("tien_do_thuc_tap_theo_loc.xlsx")}`;

    return new NextResponse(Buffer.from(buf), { //trả về file excel
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", //set type file excel
        "Content-Disposition": disposition //set header gửi dữ liệu
      }
    });
  } catch (e) {
    console.error("[GET /api/admin/tien-do-thuc-tap/export]", e); //log lỗi
    return NextResponse.json({ success: false, message: "Lỗi máy chủ." }, { status: 500 });
  }
}
