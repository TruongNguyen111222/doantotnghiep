import { NextResponse } from "next/server";
import { getEnterpriseSession } from "@/lib/ai/enterprise-auth";
import { getAiCvScreeningContext, runAiCvScreening } from "@/lib/ai/cv-screening-service";

export const runtime = "nodejs";

type RouteCtx = { params: Promise<{ applicationId: string }> };

export async function GET(_request: Request, ctx: RouteCtx) {
  const auth = await getEnterpriseSession();
  if ("error" in auth) return auth.error;

  const { applicationId } = await ctx.params;
  const context = await getAiCvScreeningContext(applicationId, auth.session.sub);

  if ("error" in context) {
    const status = context.error === "NOT_FOUND" ? 404 : 403;
    const message =
      context.error === "NOT_FOUND" ? "Không tìm thấy hồ sơ ứng tuyển." : "Không có quyền truy cập hồ sơ này.";
    return NextResponse.json({ success: false, message }, { status });
  }

  return NextResponse.json({ success: true, item: context });
}

export async function POST(_request: Request, ctx: RouteCtx) {
  const auth = await getEnterpriseSession();
  if ("error" in auth) return auth.error;

  const { applicationId } = await ctx.params;
  const result = await runAiCvScreening(applicationId, auth.session.sub);

  if ("error" in result) {
    return NextResponse.json({ success: false, message: result.error }, { status: result.status });
  }

  return NextResponse.json({
    success: true,
    message: "Phân tích CV bằng AI hoàn tất.",
    screening: result.screening
  });
}
