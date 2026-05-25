import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth/admin-session";

export async function GET(request: Request) { //hàm lấy danh sách sinh viên
  const admin = await getAdminSession(); //lấy session admin
  if (!admin) return NextResponse.json({ message: "Không có quyền truy cập." }, { status: 403 });

  const { searchParams } = new URL(request.url); 
  const faculty = (searchParams.get("faculty") || "").trim(); //khoa
  const internshipBatchId = (searchParams.get("internshipBatchId") || "").trim();
  const q = (searchParams.get("q") || "").trim();

  if (!faculty || !internshipBatchId) {
    return NextResponse.json({ success: false, message: "Thiếu khoa hoặc đợt thực tập." }, { status: 400 });
  }

  const prismaAny = prisma as any;

  const existingLinks = await prismaAny.supervisorAssignmentStudent.findMany({ //lấy danh sách sinh viên đã phân công
    where: { supervisorAssignment: { internshipBatchId } }, //điều kiện tìm kiếm
    select: { studentProfileId: true } //lấy id sinh viên
  });
  const assignedSet = new Set(existingLinks.map((x: any) => String(x.studentProfileId))); //lấy danh sách id sinh viên đã phân công

  const where: any = { //điều kiện tìm kiếm
    faculty,
    internshipStatus: { not: "REJECTED" },
    id: { notIn: Array.from(assignedSet) }
  };

  if (q) {
    where.OR = [
      { msv: { startsWith: q } },
      ...(q.length >= 2 ? [{ user: { fullName: { contains: q, mode: "insensitive" } } }] : [])
    ];
  }

  const rows = await prismaAny.studentProfile.findMany({ //lấy danh sách sinh viên
    where,
    orderBy: [{ msv: "asc" }],
    select: { id: true, msv: true, degree: true, user: { select: { fullName: true } } }
  });

  return NextResponse.json({ //trả về danh sách sinh viên 
    success: true,
    items: rows.map((r: any) => ({
      id: r.id,
      msv: r.msv,
      fullName: r.user?.fullName ?? "",
      degree: r.degree
    }))
  });
}
