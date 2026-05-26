export const STUDENT_ALREADY_COMMITTED_INTERNSHIP_MESSAGE =
  "Bạn đã xác nhận thực tập tại một doanh nghiệp khác. Không thể xác nhận thêm.";

/**
 * Sinh viên đã cam kết thực tập (profile DOING hoặc có đơn OFFERED + ACCEPTED khác).
 */
export async function studentHasCommittedInternship(
  prismaAny: {
    studentProfile: { findFirst: (args: unknown) => Promise<{ internshipStatus: string } | null> };
    jobApplication: { findFirst: (args: unknown) => Promise<{ id: string } | null> };
  },
  userId: string,
  excludeApplicationId?: string
): Promise<boolean> {
  const profile = await prismaAny.studentProfile.findFirst({
    where: { userId },
    select: { internshipStatus: true }
  });
  if (profile?.internshipStatus && profile.internshipStatus !== "NOT_STARTED") {
    return true;
  }

  const where: Record<string, unknown> = {
    studentUserId: userId,
    status: "OFFERED",
    response: "ACCEPTED"
  };
  if (excludeApplicationId) {
    where.id = { not: excludeApplicationId };
  }

  const acceptedElsewhere = await prismaAny.jobApplication.findFirst({
    where,
    select: { id: true }
  });
  return Boolean(acceptedElsewhere);
}

export async function assertStudentCanConfirmInternship(
  prismaAny: Parameters<typeof studentHasCommittedInternship>[0],
  userId: string,
  applicationId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const committed = await studentHasCommittedInternship(prismaAny, userId, applicationId);
  if (committed) {
    return { ok: false, message: STUDENT_ALREADY_COMMITTED_INTERNSHIP_MESSAGE };
  }
  return { ok: true };
}
