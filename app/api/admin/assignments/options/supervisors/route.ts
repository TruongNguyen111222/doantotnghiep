import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth/admin-session";

export async function GET(request: Request) { //hàm lấy danh sách giảng viên hướng dẫn
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ message: "Không có quyền truy cập." }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const faculty = (searchParams.get("faculty") || "").trim();
  const internshipBatchId = (searchParams.get("internshipBatchId") || "").trim();
  const q = (searchParams.get("q") || "").trim();
  const includeId = (searchParams.get("includeId") || "").trim();

  if (!faculty || !internshipBatchId) {
    return NextResponse.json({ success: false, message: "Thiếu khoa hoặc đợt thực tập." }, { status: 400 });
  }

  const prismaAny = prisma as any;

  const assigned = await prismaAny.supervisorAssignment.findMany({ //lấy danh sách giảng viên hướng dẫn đã phân công
    where: { internshipBatchId }, //điều kiện tìm kiếm
    select: { supervisorProfileId: true } //lấy id giảng viên hướng dẫn
  });
  const assignedSet = new Set(assigned.map((x: any) => String(x.supervisorProfileId))); //lấy danh sách id giảng viên hướng dẫn đã phân công
  if (includeId) assignedSet.delete(includeId); //xóa id giảng viên hướng dẫn đã phân công

  const where: any = { //điều kiện tìm kiếm
    faculty: { equals: faculty, mode: "insensitive" }, //khoa
    id: { notIn: Array.from(assignedSet) }, //id giảng viên hướng dẫn đã phân công
    user: { isLocked: false } //điều kiện tìm kiếm
  };
  if (q && q.length >= 2) { //nếu có từ khóa tìm kiếm và từ khóa tìm kiếm có ít nhất 2 ký tự
    where.AND = [{ user: { fullName: { contains: q, mode: "insensitive" } } }]; //điều kiện tìm kiếm
  }

  const rows = await prismaAny.supervisorProfile.findMany({ //lấy danh sách giảng viên hướng dẫn      
    where,
    orderBy: { user: { fullName: "asc" } },
    select: { id: true, faculty: true, degree: true, user: { select: { fullName: true } } }
  });

  return NextResponse.json({ //trả về danh sách giảng viên hướng dẫn
    success: true,
    items: rows.map((r: any) => ({
      id: r.id,
      fullName: r.user?.fullName ?? "",
      degree: r.degree,
      faculty: r.faculty
    }))
  });
}

