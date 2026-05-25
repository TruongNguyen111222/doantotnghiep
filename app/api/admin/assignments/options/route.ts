import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth/admin-session";

export async function GET() { //hàm lấy danh sách đợt thực tập và khoa
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ message: "Không có quyền truy cập." }, { status: 403 });

  const prismaAny = prisma as any;

  const batches = await prismaAny.internshipBatch.findMany({ //lấy danh sách đợt thực tập
    where: { status: "OPEN" }, //trạng thái đợt thực tập
    orderBy: { startDate: "desc" },
    select: { id: true, name: true, semester: true, schoolYear: true, startDate: true, endDate: true } //lấy id, tên, học kỳ, năm học, ngày bắt đầu, ngày kết thúc
  });

  const facultiesRaw = await prismaAny.supervisorProfile.findMany({ //lấy danh sách khoa
    where: { user: { isLocked: false } }, //điều kiện tìm kiếm
    distinct: ["faculty"], //lấy khoa
    select: { faculty: true } //lấy khoa    
  });
  const faculties = facultiesRaw.map((r: any) => String(r.faculty)).filter(Boolean).sort((a: string, b: string) => a.localeCompare(b, "vi"));

  return NextResponse.json({ //trả về danh sách đợt thực tập và khoa
    success: true,
    faculties, //danh sách khoa
    openBatches: batches.map((b: any) => ({ //danh sách đợt thực tập
      id: b.id, //id đợt thực tập
      name: b.name, //tên đợt thực tập
      semester: b.semester, //học kỳ
      schoolYear: b.schoolYear, //năm học
      startDate: b.startDate?.toISOString?.() ?? null, //ngày bắt đầu
      endDate: b.endDate?.toISOString?.() ?? null //ngày kết thúc
    }))
  });
}

