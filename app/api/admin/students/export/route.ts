import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

import { getAdminSession } from "@/lib/auth/admin-session";
import { prisma } from "@/lib/prisma";
import { ADMIN_STUDENT_FILTER_EXPORT_HEADER } from "@/lib/constants/admin-students-excel";
import {
  ADMIN_QUAN_LY_SINH_VIEN_DEGREE_LABEL,
  ADMIN_QUAN_LY_SINH_VIEN_GENDER_LABEL,
  ADMIN_QUAN_LY_SINH_VIEN_INTERNSHIP_STATUS_LABEL
} from "@/lib/constants/admin-quan-ly-sinh-vien";
import { buildAdminStudentListWhere } from "@/lib/server/admin-students-list-filter";

const MAX_EXPORT = 8000; //số lượng sinh viên tối đa xuất excel

function birthDateYmd(d: Date | null | undefined): string { //hàm chuyển đổi ngày tháng năm thành định dạng YYYY-MM-DD
  if (!d || !(d instanceof Date) || Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

type LinkRow = {
  studentProfileId: string;
  supervisorAssignment: {
    updatedAt: Date;
    internshipBatch: { name: string; startDate: Date };
    supervisorProfile: { user: { fullName: string; email: string; phone: string | null } };
  };
};

function pickPreferredSupervisorLink(prev: LinkRow | undefined, cur: LinkRow): LinkRow { //hàm lấy link supervisor ưu tiên
  if (!prev) return cur;
  const pStart = prev.supervisorAssignment.internshipBatch.startDate?.getTime?.() ?? 0;
  const cStart = cur.supervisorAssignment.internshipBatch.startDate?.getTime?.() ?? 0;
  if (cStart > pStart) return cur;
  if (cStart < pStart) return prev;
  const pU = prev.supervisorAssignment.updatedAt?.getTime?.() ?? 0;
  const cU = cur.supervisorAssignment.updatedAt?.getTime?.() ?? 0;
  return cU >= pU ? cur : prev;
}

export async function GET(request: Request) { //hàm xuất excel danh sách sinh viên từ API
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ message: "Không có quyền truy cập." }, { status: 403 });

  try {
    const { searchParams } = new URL(request.url);
    const prismaAny = prisma as any;
    const where = buildAdminStudentListWhere(searchParams) as any;

    const totalItems = await prismaAny.studentProfile.count({ where });
    if (totalItems > MAX_EXPORT) {
      return NextResponse.json(
        { message: `Kết quả vượt ${MAX_EXPORT} sinh viên. Vui lòng thu hẹp bộ lọc hoặc từ khóa tìm kiếm.` },
        { status: 400 }
      );
    }

    const rows = await prismaAny.studentProfile.findMany({ //lấy danh sách sinh viên
      where,
      orderBy: { msv: "asc" },
      take: MAX_EXPORT,
      select: {
        id: true,
        msv: true,
        className: true,
        faculty: true,
        cohort: true,
        degree: true,
        gender: true,
        birthDate: true,
        permanentProvinceName: true,
        permanentWardName: true,
        internshipStatus: true,
        user: { select: { fullName: true, email: true, phone: true } }
      }
    });

    const profileIds = rows.map((r: { id: string }) => String(r.id)).filter(Boolean); //lấy danh sách id sinh viên
    const supervisorByStudent = new Map<string, LinkRow>(); //map supervisor theo id sinh viên

    if (profileIds.length) {
      const links: LinkRow[] = await prismaAny.supervisorAssignmentStudent.findMany({ //lấy danh sách link supervisor theo id sinh viên
        where: { studentProfileId: { in: profileIds } },
        select: {
          studentProfileId: true,
          supervisorAssignment: {
            select: {
              updatedAt: true,
              internshipBatch: { select: { name: true, startDate: true } },
              supervisorProfile: {
                select: { user: { select: { fullName: true, email: true, phone: true } } }
              }
            }
          }
        }
      });

      for (const link of links) { //lặp qua danh sách link supervisor
        const sid = String(link.studentProfileId);
        const prev = supervisorByStudent.get(sid); //lấy link supervisor trước đó
        supervisorByStudent.set(sid, pickPreferredSupervisorLink(prev, link)); //lấy link supervisor ưu tiên
      }
    }

    const degreeMap = ADMIN_QUAN_LY_SINH_VIEN_DEGREE_LABEL as Record<string, string>;
    const genderMap = ADMIN_QUAN_LY_SINH_VIEN_GENDER_LABEL as Record<string, string>;
    const statusMap = ADMIN_QUAN_LY_SINH_VIEN_INTERNSHIP_STATUS_LABEL as Record<string, string>;

    const dataRows = rows.map((sp: any) => { //lặp qua danh sách sinh viên
      const sup = supervisorByStudent.get(String(sp.id)); //lấy link supervisor theo id sinh viên
      const u = sup?.supervisorAssignment?.supervisorProfile?.user;
      const batchName = sup?.supervisorAssignment?.internshipBatch?.name ?? "";

      return [ //lấy dữ liệu sinh viên
        String(sp.msv ?? ""),
        String(sp.user?.fullName ?? ""),
        String(sp.className ?? ""),
        String(sp.faculty ?? ""),
        String(sp.cohort ?? ""),
        degreeMap[String(sp.degree ?? "")] ?? String(sp.degree ?? ""),
        String(sp.user?.phone ?? ""),
        String(sp.user?.email ?? ""),
        birthDateYmd(sp.birthDate),
        genderMap[String(sp.gender ?? "")] ?? String(sp.gender ?? ""),
        String(sp.permanentProvinceName ?? ""),
        String(sp.permanentWardName ?? ""),
        statusMap[String(sp.internshipStatus ?? "")] ?? String(sp.internshipStatus ?? ""),
        String(u?.fullName ?? ""),
        String(u?.email ?? ""),
        String(u?.phone ?? ""),
        String(batchName)
      ];
    });

    const aoa = [[...ADMIN_STUDENT_FILTER_EXPORT_HEADER], ...dataRows]; //tạo dữ liệu excel
    const ws = XLSX.utils.aoa_to_sheet(aoa); //tạo sheet excel
    const range = XLSX.utils.decode_range(ws["!ref"] || "A1"); //lấy khoảng excel
    for (let c = range.s.c; c <= range.e.c; c++) {
      for (let r = range.s.r + 1; r <= range.e.r; r++) {
        const addr = XLSX.utils.encode_cell({ r, c }); //lấy cell excel
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
      { wch: 12 },
      { wch: 10 },
      { wch: 14 },
      { wch: 26 },
      { wch: 22 },
      { wch: 22 },
      { wch: 26 },
      { wch: 14 },
      { wch: 28 }
    ];

    const wb = XLSX.utils.book_new(); //tạo workbook excel
    XLSX.utils.book_append_sheet(wb, ws, "Sinh vien"); //thêm sheet excel vào workbook
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer; //lưu workbook excel

    const disposition = `attachment; filename="danh_sach_sinh_vien.xlsx"; filename*=UTF-8''${encodeURIComponent("danh_sach_sinh_vien_theo_loc.xlsx")}`; //set header gửi dữ liệu

    return new NextResponse(buf.toString("binary"), { //trả về file excel
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", //set type file excel
        "Content-Disposition": disposition //set header gửi dữ liệu
      }
    });
  } catch (e) {
    console.error("[GET /api/admin/students/export]", e);
    return NextResponse.json({ success: false, message: "Lỗi máy chủ." }, { status: 500 });
  }
}
