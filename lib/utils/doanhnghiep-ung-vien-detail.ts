const INTERVIEW_RESPONSE_MIN_GAP_MS = 60 * 60 * 1000;

function toDateTimeLocalValue(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

/** Giá trị tối thiểu cho input datetime-local: 00:00 ngày mai (giờ máy client). */
export function tomorrowDateTimeLocalMin(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  return toDateTimeLocalValue(d);
}

export function shiftLocalDateTimeHours(input: string, hours: number): string {
  if (!input) return "";
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "";
  d.setHours(d.getHours() + hours);
  return toDateTimeLocalValue(d);
}

export function maxDateTimeLocal(a: string, b: string): string {
  return a >= b ? a : b;
}

export function minDateTimeLocal(a: string, b: string): string {
  return a <= b ? a : b;
}

/** Hạn phản hồi phải trước buổi phỏng vấn ít nhất 1 giờ. */
export function validateInterviewInviteSchedule(
  responseDeadline: string,
  interviewAt: string
): { ok: true } | { ok: false; message: string } {
  const deadline = new Date(responseDeadline);
  const interview = new Date(interviewAt);
  if (Number.isNaN(deadline.getTime()) || Number.isNaN(interview.getTime())) {
    return { ok: false, message: "Thời gian không hợp lệ." };
  }
  if (interview.getTime() - deadline.getTime() < INTERVIEW_RESPONSE_MIN_GAP_MS) {
    return {
      ok: false,
      message: "Thời hạn phản hồi phải trước thời gian phỏng vấn ít nhất 1 tiếng.",
    };
  }
  return { ok: true };
}

export function formatDateTimeVi(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("vi-VN");
}

export function formatDateVi(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("vi-VN");
}

