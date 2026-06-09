import type { Row } from "@/lib/types/giangvien-bao-cao-thuc-tap";
import {
  degreeLabel,
  noSpecialPattern,
  pointPattern,
  GIANGVIEN_BAO_CAO_VALIDATE_DQT_INVALID,
  GIANGVIEN_BAO_CAO_VALIDATE_DQT_RANGE,
  GIANGVIEN_BAO_CAO_VALIDATE_DQT_REQUIRED,
  GIANGVIEN_BAO_CAO_VALIDATE_EVALUATION_SPECIAL,
  GIANGVIEN_BAO_CAO_VALIDATE_KTHP_INVALID,
  GIANGVIEN_BAO_CAO_VALIDATE_KTHP_RANGE,
  GIANGVIEN_BAO_CAO_VALIDATE_KTHP_REQUIRED,
  GIANGVIEN_BAO_CAO_VALIDATE_NO_REPORT
} from "@/lib/constants/giangvien-bao-cao-thuc-tap";

export function formatDateVi(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("vi-VN");
}

export function validateGiangVienBaoCaoApprove(args: {
  reviewTarget: Row | null;
  evaluation: string;
  dqtPoint: string;
  kthpPoint: string;
}): string {
  const { reviewTarget, evaluation, dqtPoint, kthpPoint } = args;

  if (!reviewTarget?.report) return GIANGVIEN_BAO_CAO_VALIDATE_NO_REPORT;

  if (evaluation.trim() && !noSpecialPattern.test(evaluation.trim())) return GIANGVIEN_BAO_CAO_VALIDATE_EVALUATION_SPECIAL;

  if (!dqtPoint.trim()) return GIANGVIEN_BAO_CAO_VALIDATE_DQT_REQUIRED;
  if (!pointPattern.test(dqtPoint.trim())) return GIANGVIEN_BAO_CAO_VALIDATE_DQT_INVALID;

  const dqt = Number(dqtPoint.trim());
  if (Number.isNaN(dqt) || dqt < 1 || dqt > 10) return GIANGVIEN_BAO_CAO_VALIDATE_DQT_RANGE;

  if (!kthpPoint.trim()) return GIANGVIEN_BAO_CAO_VALIDATE_KTHP_REQUIRED;
  if (!pointPattern.test(kthpPoint.trim())) return GIANGVIEN_BAO_CAO_VALIDATE_KTHP_INVALID;

  const kthp = Number(kthpPoint.trim());
  if (Number.isNaN(kthp) || kthp < 1 || kthp > 10) return GIANGVIEN_BAO_CAO_VALIDATE_KTHP_RANGE;

  return "";
}

// Re-export for convenience; used by the page when rendering.
export { degreeLabel };

