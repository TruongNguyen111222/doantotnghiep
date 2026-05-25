import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth/admin-session";
import { enterpriseUserHasLinkedData } from "@/lib/admin/enterprise-linked-data"; //hàm kiểm tra xem doanh nghiệp đã có dữ liệu liên kết trong hệ thống hay chưa

type AccountStatus = "ACTIVE" | "STOPPED";

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) { //hàm lấy thông tin tài khoản
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ message: "Không có quyền truy cập." }, { status: 403 });

  const { id } = await ctx.params; //lấy id tài khoản
  const prismaAny = prisma as any;

  const user = await prismaAny.user.findUnique({ //tìm kiếm tài khoản theo id
    where: { id },
    select: {
      id: true,
      role: true,
      isLocked: true,
      fullName: true,
      email: true,
      phone: true,
      companyName: true,
      taxCode: true,
      enterpriseMeta: true,
      studentProfile: {
        select: {
          msv: true,
          className: true,
          faculty: true,
          cohort: true,
          degree: true,
          internshipStatus: true,
          gender: true,
          birthDate: true,
          permanentProvinceName: true,
          permanentWardName: true
        }
      },
      supervisorProfile: {
        select: {
          faculty: true,
          degree: true,
          gender: true,
          birthDate: true,
          permanentProvinceName: true,
          permanentWardName: true
        }
      }
    }
  });

  if (!user) return NextResponse.json({ success: false, message: "Không tìm thấy tài khoản." }, { status: 404 });

  const status: AccountStatus = user.isLocked ? "STOPPED" : "ACTIVE"; //trạng thái tài khoản

  if (user.role === Role.sinhvien) { //nếu role là sinh viên thì trả về thông tin sinh viên
    const p = user.studentProfile;
    return NextResponse.json({
      success: true,
      item: {
        id: user.id,
        role: user.role,
        status,
        msv: p?.msv ?? null,
        fullName: user.fullName,
        phone: user.phone ?? null,
        email: user.email,
        birthDate: p?.birthDate?.toISOString?.() ?? null,
        gender: p?.gender ?? null,
        permanentAddress: [p?.permanentProvinceName, p?.permanentWardName].filter(Boolean).join(" - ") || null,
        className: p?.className ?? null,
        faculty: p?.faculty ?? null,
        cohort: p?.cohort ?? null,
        degree: p?.degree ?? null,
        internshipStatus: p?.internshipStatus ?? null
      }
    });
  }

  if (user.role === Role.giangvien) {
    const p = user.supervisorProfile;
    return NextResponse.json({
      success: true,
      item: {
        id: user.id,
        role: user.role,
        status,
        fullName: user.fullName,
        phone: user.phone ?? null,
        email: user.email,
        birthDate: p?.birthDate?.toISOString?.() ?? null,
        gender: p?.gender ?? null,
        permanentAddress: [p?.permanentProvinceName, p?.permanentWardName].filter(Boolean).join(" - ") || null,
        faculty: p?.faculty ?? null,
        degree: p?.degree ?? null
      }
    });
  }

  if (user.role === Role.doanhnghiep) { //nếu role là doanh nghiệp thì trả về thông tin doanh nghiệp
    const meta = (user.enterpriseMeta || {}) as Record<string, any>;
    const address =
      typeof meta.addressDetail === "string" ? meta.addressDetail : typeof meta.address === "string" ? meta.address : null;
    const businessFields =
      Array.isArray(meta.businessFields) ? meta.businessFields.join(", ") : typeof meta.businessFields === "string" ? meta.businessFields : null;
    const website = typeof meta.website === "string" ? meta.website : null;
    const intro = typeof meta.companyIntro === "string" ? meta.companyIntro : typeof meta.intro === "string" ? meta.intro : null;
    return NextResponse.json({ //trả về thông tin doanh nghiệp
      success: true,
      item: {
        id: user.id,
        role: user.role,
        status,
        companyName: user.companyName ?? null,
        taxCode: user.taxCode ?? null,
        fullName: user.companyName ?? user.fullName,
        email: user.email,
        phone: user.phone ?? null,
        businessFields,
        address,
        website,
        intro
      }
    });
  }

  return NextResponse.json({ success: false, message: "Không hỗ trợ phân quyền này." }, { status: 400 });
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) { //hàm xóa tài khoản
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ message: "Không có quyền truy cập." }, { status: 403 });

  const { id } = await ctx.params;
  const prismaAny = prisma as any;

  const user = await prismaAny.user.findUnique({ where: { id }, select: { id: true, role: true } }); //tìm kiếm tài khoản theo id
  if (!user) return NextResponse.json({ success: false, message: "Không tìm thấy tài khoản." }, { status: 404 });

  if (user.role === Role.doanhnghiep) {
    const hasLinked = await enterpriseUserHasLinkedData(id);
    if (hasLinked) {
      return NextResponse.json({ success: false, message: "Không thể xóa tài khoản đã có dữ liệu liên kết trong hệ thống." }, { status: 400 });
    }
  } else if (user.role === Role.sinhvien) { //nếu role là sinh viên thì xóa thông tin sinh viên
    const linkedCount = await prismaAny.jobApplication.count({ where: { studentUserId: id } });
    if (linkedCount > 0) { //nếu có dữ liệu liên kết trong hệ thống thì trả về lỗi
      return NextResponse.json({ success: false, message: "Không thể xóa tài khoản đã có dữ liệu liên kết trong hệ thống." }, { status: 400 });
    }
    await prismaAny.studentProfile.deleteMany({ where: { userId: id } }); //xóa thông tin sinh viên
  } else if (user.role === Role.giangvien) { //nếu role là giảng viên thì xóa thông tin giảng viên
    await prismaAny.supervisorProfile.deleteMany({ where: { userId: id } });
  } else {
    return NextResponse.json({ success: false, message: "Không hỗ trợ phân quyền này." }, { status: 400 });
  }

  await prismaAny.user.delete({ where: { id } }); //xóa tài khoản
  return NextResponse.json({ success: true, message: "Xóa tài khoản thành công." });
}

