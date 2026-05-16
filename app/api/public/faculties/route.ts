import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const prismaAny = prisma as any;

  //truy vấn 2 bảng student_profile và supervisor_profile để lấy danh sách ngành/khoa
  try {
    const [studentRows, supervisorRows] = await Promise.all([ //tải danh sách ngành/khoa từ database
      prismaAny.studentProfile?.findMany //tải danh sách ngành/khoa từ bảng student_profile
        ? prismaAny.studentProfile.findMany({ distinct: ["faculty"], select: { faculty: true } }) //tải danh sách ngành/khoa từ bảng student_profile
        : Promise.resolve([]),
      prismaAny.supervisorProfile?.findMany //tải danh sách ngành/khoa từ bảng supervisor_profile
        ? prismaAny.supervisorProfile.findMany({ distinct: ["faculty"], select: { faculty: true } }) //tải danh sách ngành/khoa từ bảng supervisor_profile
        : Promise.resolve([])
    ]);
//gộp , lọc trùng lặp và sắp xếp theo thứ tự alphabet
    const faculties = Array.from(
      new Set(
        [...studentRows, ...supervisorRows]
          .map((r: any) => String(r?.faculty ?? "").trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b, "vi"));

    //trả về danh sách ngành/khoa
    return NextResponse.json({ success: true, faculties });
  } catch {
    return NextResponse.json({ success: true, faculties: [] }); //trả về danh sách ngành/khoa rỗng nếu có lỗi
  }
}

