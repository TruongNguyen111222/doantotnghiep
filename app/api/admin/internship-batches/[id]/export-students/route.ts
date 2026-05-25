import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

import { getAdminSession } from "@/lib/auth/admin-session";
import { prisma } from "@/lib/prisma";
import { ADMIN_STUDENT_EXCEL_HEADER } from "@/lib/constants/admin-students-excel"; //header dữ liệu sinh viên excel
import {
  ADMIN_QUAN_LY_SINH_VIEN_DEGREE_LABEL,
  ADMIN_QUAN_LY_SINH_VIEN_GENDER_LABEL
} from "@/lib/constants/admin-quan-ly-sinh-vien"; //label bậc, giới tính

function safeFilePart(name: string) { //hàm lấy tên file excel  dạng _ đặc biệt
  const s = name.replace(/[/\\?%*:|"<>]/g, "_").trim().slice(0, 80);
  return s || "dot-thuc-tap";
}

function birthDateYmd(d: Date | null | undefined): string { //hàm lấy ngày sinh dạng YYYY-MM-DD
  if (!d || !(d instanceof Date) || Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {  //hàm xuất excel danh sách sinh viên theo đợt thực tập
  const admin = await getAdminSession(); //lấy session admin
  if (!admin) return NextResponse.json({ message: "Không có quyền truy cập." }, { status: 403 }); //nếu không có quyền truy cập thì trả về lỗi

  const { id: batchId } = await ctx.params; //lấy id đợt thực tập từ params
  const prismaAny = prisma as any;

  const batch = await prismaAny.internshipBatch.findUnique({ //tìm đợt thực tập theo id
    where: { id: batchId }, //lấy id đợt thực tập
    select: { id: true, name: true } //lấy id, tên đợt thực tập
  });
  if (!batch) return NextResponse.json({ message: "Không tìm thấy đợt thực tập." }, { status: 404 }); //nếu không tìm thấy đợt thực tập thì trả về lỗi

  const links = await prismaAny.supervisorAssignmentStudent.findMany({ //tìm sinh viên theo đợt thực tập
    where: { supervisorAssignment: { internshipBatchId: batchId } }, //lấy id đợt thực tập
    select: { //lấy id, tên đợt thực tập
      studentProfile: { //lấy id, tên đợt thực tập
        select: {
          id: true, //lấy id sinh viên
          msv: true, //lấy mã sinh viên
          className: true,
          faculty: true, //lấy khoa
          cohort: true, //lấy khóa        
          degree: true,
          gender: true,
          birthDate: true,
          permanentProvinceName: true,
          permanentWardName: true,
          user: { select: { fullName: true, phone: true, email: true } }
        }
      }
    }
  });

  const byStudentId = new Map< //map sinh viên theo id
    string,
    {
      msv: string; //mã sinh viên
      className: string; //lớp
      faculty: string; //khoa
      cohort: string; //khóa
      degree: keyof typeof ADMIN_QUAN_LY_SINH_VIEN_DEGREE_LABEL; //bậc
      gender: keyof typeof ADMIN_QUAN_LY_SINH_VIEN_GENDER_LABEL; //giới tính
      birthDate: Date; //ngày sinh
      permanentProvinceName: string | null; //tên tỉnh
      permanentWardName: string | null; //tên huyện
      user: { fullName: string; phone: string | null; email: string }; //họ tên, số điện thoại, email
    }
  >();

  for (const row of links) { //lặp qua danh sách sinh viên
    const sp = row.studentProfile;
    if (!sp || byStudentId.has(sp.id)) continue; //nếu sinh viên không tồn tại hoặc đã có trong map thì skip
    byStudentId.set(sp.id, sp); //thêm sinh viên vào map
  }

  const profiles = [...byStudentId.values()].sort((a, b) => String(a.msv).localeCompare(String(b.msv), "vi")); //sắp xếp sinh viên theo mã sinh viên

  const degreeMap = ADMIN_QUAN_LY_SINH_VIEN_DEGREE_LABEL as Record<string, string>; //map bậc
  const genderMap = ADMIN_QUAN_LY_SINH_VIEN_GENDER_LABEL as Record<string, string>; //map giới tính

  const dataRows = profiles.map((sp) => [ //lặp qua danh sách sinh viên
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
    String(sp.permanentWardName ?? "")
  ]);

  const aoa = [[...ADMIN_STUDENT_EXCEL_HEADER], ...dataRows]; //tạo dữ liệu excel
  const ws = XLSX.utils.aoa_to_sheet(aoa); //tạo sheet excel

  const range = XLSX.utils.decode_range(ws["!ref"] || "A1"); //lấy khoảng excel
  for (let c = range.s.c; c <= range.e.c; c++) {
    for (let r = range.s.r + 1; r <= range.e.r; r++) { //lặp qua khoảng excel
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = ws[addr]; //lấy cell excel
      if (!cell) continue;
      cell.t = "s"; //set type cell excel
      cell.v = String(cell.v ?? "");
    }
  }

  ws["!cols"] = [ //set width cell excel
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
    { wch: 26 }
  ];

  const wb = XLSX.utils.book_new(); //tạo workbook excel
  XLSX.utils.book_append_sheet(wb, ws, "Sinh vien");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer; //lưu workbook excel

  const base = safeFilePart(batch.name || "dot"); //lấy tên file excel
  const utfName = `${base}_sinh_vien.xlsx`; //tên file excel
  const disposition = `attachment; filename="danh_sach_sinh_vien.xlsx"; filename*=UTF-8''${encodeURIComponent(utfName)}`; //set header gửi dữ liệu

  return new NextResponse(Buffer.from(buf), { //trả về file excel
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", //set type file excel
      "Content-Disposition": disposition //set header gửi dữ liệu
    }
  });
}
