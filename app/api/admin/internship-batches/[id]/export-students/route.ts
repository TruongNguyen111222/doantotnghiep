import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

import { getAdminSession } from "@/lib/auth/admin-session";
import { prisma } from "@/lib/prisma";
import { ADMIN_STUDENT_EXCEL_HEADER } from "@/lib/constants/admin-students-excel";
import {
  ADMIN_QUAN_LY_SINH_VIEN_DEGREE_LABEL,
  ADMIN_QUAN_LY_SINH_VIEN_GENDER_LABEL
} from "@/lib/constants/admin-quan-ly-sinh-vien";

function safeFilePart(name: string) {
  const s = name.replace(/[/\\?%*:|"<>]/g, "_").trim().slice(0, 80);
  return s || "dot-thuc-tap";
}

function birthDateYmd(d: Date | null | undefined): string {
  if (!d || !(d instanceof Date) || Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ message: "Không có quyền truy cập." }, { status: 403 });

  const { id: batchId } = await ctx.params;
  const prismaAny = prisma as any;

  const batch = await prismaAny.internshipBatch.findUnique({
    where: { id: batchId },
    select: { id: true, name: true }
  });
  if (!batch) return NextResponse.json({ message: "Không tìm thấy đợt thực tập." }, { status: 404 });

  const links = await prismaAny.supervisorAssignmentStudent.findMany({
    where: { supervisorAssignment: { internshipBatchId: batchId } },
    select: {
      studentProfile: {
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
          user: { select: { fullName: true, phone: true, email: true } }
        }
      }
    }
  });

  const byStudentId = new Map<
    string,
    {
      msv: string;
      className: string;
      faculty: string;
      cohort: string;
      degree: keyof typeof ADMIN_QUAN_LY_SINH_VIEN_DEGREE_LABEL;
      gender: keyof typeof ADMIN_QUAN_LY_SINH_VIEN_GENDER_LABEL;
      birthDate: Date;
      permanentProvinceName: string | null;
      permanentWardName: string | null;
      user: { fullName: string; phone: string | null; email: string };
    }
  >();

  for (const row of links) {
    const sp = row.studentProfile;
    if (!sp || byStudentId.has(sp.id)) continue;
    byStudentId.set(sp.id, sp);
  }

  const profiles = [...byStudentId.values()].sort((a, b) => String(a.msv).localeCompare(String(b.msv), "vi"));

  const degreeMap = ADMIN_QUAN_LY_SINH_VIEN_DEGREE_LABEL as Record<string, string>;
  const genderMap = ADMIN_QUAN_LY_SINH_VIEN_GENDER_LABEL as Record<string, string>;

  const dataRows = profiles.map((sp) => [
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

  const aoa = [[...ADMIN_STUDENT_EXCEL_HEADER], ...dataRows];
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
    { wch: 12 },
    { wch: 10 },
    { wch: 14 },
    { wch: 26 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sinh vien");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

  const base = safeFilePart(batch.name || "dot");
  const utfName = `${base}_sinh_vien.xlsx`;
  const disposition = `attachment; filename="danh_sach_sinh_vien.xlsx"; filename*=UTF-8''${encodeURIComponent(utfName)}`;

  return new NextResponse(Buffer.from(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": disposition
    }
  });
}
