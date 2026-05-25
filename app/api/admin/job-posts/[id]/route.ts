import { NextResponse } from "next/server"; 
import { getAdminSession } from "@/lib/auth/admin-session";
import { prisma } from "@/lib/prisma";
import { buildEnterpriseHeadquartersAddress, formatBusinessFields } from "@/lib/utils/enterprise-admin-display"; //hàm format lĩnh vực hoạt động doanh nghiệp và ghép địa chỉ trụ sở chính doanh nghiệp

function enterpriseMetaAsRecord(meta: unknown): Record<string, unknown> { //hàm chuyển đổi meta thành đối tượng Record
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return {}; //nếu meta không tồn tại hoặc không phải đối tượng hoặc là mảng thì trả về đối tượng rỗng
  return meta as Record<string, unknown>;
}

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) { //hàm xử lý request GET
  const admin = await getAdminSession(); //lấy session admin
  if (!admin) return NextResponse.json({ message: "Không có quyền truy cập." }, { status: 403 }); //nếu không có session admin thì trả về lỗi 403

  try {
    const { id } = await ctx.params; //lấy id việc làm
    const now = new Date();

    try {
      await (prisma as any).jobPost.updateMany({ //cập nhật trạng thái việc làm
        where: {
          deadlineAt: { lt: now },
          status: { in: ["PENDING", "REJECTED", "ACTIVE"] }
        },
        data: { status: "STOPPED", stoppedAt: now }
      });
    } catch {
      // Không để lỗi auto-stop chặn tải chi tiết việc làm
    }

    const job = await (prisma as any).jobPost.findFirst({ //tìm kiếm việc làm theo id
      where: { id },
      include: {
        enterpriseUser: { select: { companyName: true, taxCode: true, enterpriseMeta: true } }, //lấy thông tin doanh nghiệp
        internshipBatch: { select: { id: true, name: true } }
      }
    });

    if (!job) return NextResponse.json({ success: false, message: "Không tìm thấy tin tuyển dụng." }, { status: 404 }); //nếu không tìm thấy việc làm thì trả về lỗi 404

    const meta = enterpriseMetaAsRecord(job.enterpriseUser?.enterpriseMeta); //chuyển đổi meta thành đối tượng Record 
    const businessFields = formatBusinessFields(job.enterpriseUser?.enterpriseMeta); //format lĩnh vực hoạt động doanh nghiệp
    const headquartersAddress = buildEnterpriseHeadquartersAddress(job.enterpriseUser?.enterpriseMeta); //ghép địa chỉ trụ sở chính doanh nghiệp
    const intro = job.companyIntro ?? (typeof meta.businessFields !== "undefined" ? businessFields : null);
    const website = job.companyWebsite ?? (typeof meta.website === "string" && meta.website.trim() ? meta.website.trim() : null);

    return NextResponse.json({ //trả về dữ liệu chi tiết việc làm
      success: true,
      item: {
        job: {
          id: job.id,
          title: job.title,
          createdAt: job.createdAt?.toISOString?.() ?? null,
          recruitmentCount: job.recruitmentCount,
          expertise: job.expertise,
          workType: job.workType,
          status: job.status,
          deadlineAt: job.deadlineAt?.toISOString?.() ?? null,
          salary: job.salary,
          experienceRequirement: job.experienceRequirement,
          jobDescription: job.jobDescription,
          candidateRequirements: job.candidateRequirements,
          benefits: job.benefits,
          workLocation: job.workLocation,
          workTime: job.workTime,
          applicationMethod: job.applicationMethod,
          companyIntro: intro,
          companyWebsite: website,
          rejectionReason: job.rejectionReason ?? null
        },
        enterprise: {
          companyName: job.enterpriseUser?.companyName ?? null,
          taxCode: job.enterpriseUser?.taxCode ?? null,
          businessFields,
          headquartersAddress
        },
        batch: {
          id: job.internshipBatch?.id ?? null,
          name: job.internshipBatch?.name ?? null
        }
      }
    });
  } catch (e) {
    console.error("[GET /api/admin/job-posts/[id]]", e);
    return NextResponse.json(
      { success: false, message: "Lỗi máy chủ. Vui lòng thử lại." },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) { //hàm xử lý request DELETE
  const admin = await getAdminSession(); //lấy session admin
  if (!admin) return NextResponse.json({ message: "Không có quyền truy cập." }, { status: 403 });

  const { id } = await ctx.params; //lấy id việc làm        

  const linkedCount = await (prisma as any).jobApplication.count({ where: { jobPostId: id } }); //đếm số lượng ứng viên liên kết với việc làm
  if (linkedCount > 0) { //nếu có ứng viên liên kết với việc làm thì trả về lỗi 409
    return NextResponse.json(
      {
        success: false,
        message: "Không thể xóa Tin tuyển dụng đã có dữ liệu liên kết trong hệ thống."
      },
      { status: 409 }
    ); //trả về lỗi 409
  }

  await (prisma as any).jobPost.delete({ where: { id } }); //xóa việc làm

  return NextResponse.json({ success: true, message: "Xóa tin tuyển dụng thành công" }); //trả về dữ liệu thành công
}

