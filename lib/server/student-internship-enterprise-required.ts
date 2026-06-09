type PrismaLike = {
  internshipStatusHistory: {
    findFirst: (args: {
      where: { studentProfileId: string; toStatus: string };
      select: { id: true };
    }) => Promise<{ id: string } | null>;
  };
  jobApplication: {
    findFirst: (args: {
      where: { studentUserId: string; status: string; response: string };
      select: { id: true };
    }) => Promise<{ id: string } | null>;
  };
};

/** Sinh viên thực tập tại doanh nghiệp phải nộp phiếu đánh giá DN; thực tập tự túc thì không. */
export async function studentRequiresEnterpriseEvaluation(
  prismaAny: PrismaLike,
  studentProfileId: string,
  userId: string
): Promise<boolean> {
  const selfFinancedHist = await prismaAny.internshipStatusHistory.findFirst({
    where: { studentProfileId, toStatus: "SELF_FINANCED" },
    select: { id: true }
  });
  if (selfFinancedHist) return false;

  const acceptedOffer = await prismaAny.jobApplication.findFirst({
    where: { studentUserId: userId, status: "OFFERED", response: "ACCEPTED" },
    select: { id: true }
  });
  return Boolean(acceptedOffer);
}
