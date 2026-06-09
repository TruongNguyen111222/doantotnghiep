import MessagePopup from "../../../components/MessagePopup";
import type { Row } from "@/lib/types/giangvien-bao-cao-thuc-tap";
import { degreeLabel } from "@/lib/constants/giangvien-bao-cao-thuc-tap";
import { formatDateVi } from "@/lib/utils/giangvien-bao-cao-thuc-tap";
import adminStyles from "../../../admin/styles/dashboard.module.css";

type Props = {
  viewTarget: Row | null;
  onClose: () => void;
};

const internshipStatusColor: Record<string, { bg: string; color: string }> = {
  NOT_STARTED: { bg: "#f3f4f6", color: "#374151" },
  DOING: { bg: "#dbeafe", color: "#1d4ed8" },
  SELF_FINANCED: { bg: "#dbeafe", color: "#1d4ed8" },
  REPORT_SUBMITTED: { bg: "#fef9c3", color: "#854d0e" },
  COMPLETED: { bg: "#dcfce7", color: "#16a34a" },
  REJECTED: { bg: "#fee2e2", color: "#dc2626" }
};

export default function BaoCaoViewPopup({ viewTarget, onClose }: Props) { //hàm hiển thị giao diện xem chi tiết sinh viên
  if (!viewTarget) return null;

  const statusColors = internshipStatusColor[viewTarget.internshipStatus] ?? { bg: "#f3f4f6", color: "#374151" };

  const reportFileLink = viewTarget.report ? `/api/files/internship-report/${viewTarget.report.id}` : null;

  return (
    <MessagePopup open title="Xem chi tiết sinh viên" size="extraWide" onClose={onClose}>
      <table className={adminStyles.viewModalDetailTable}>
        <tbody>
          <tr><th scope="row">MSV</th><td>{viewTarget.msv}</td></tr>
          <tr><th scope="row">Họ tên</th><td>{viewTarget.fullName}</td></tr>
          <tr><th scope="row">Lớp</th><td>{viewTarget.className}</td></tr>
          <tr><th scope="row">Khoa</th><td>{viewTarget.faculty}</td></tr>
          <tr><th scope="row">Khóa</th><td>{viewTarget.cohort}</td></tr>
          <tr><th scope="row">Bậc</th><td>{degreeLabel[viewTarget.degree]}</td></tr>
          <tr><th scope="row">SĐT</th><td>{viewTarget.phone ?? "—"}</td></tr>
          <tr><th scope="row">Email</th><td>{viewTarget.email}</td></tr>
          <tr><th scope="row">Ngày sinh</th><td>{formatDateVi(viewTarget.birthDate)}</td></tr>
          <tr>
            <th scope="row">Trạng thái thực tập</th>
            <td>
              <span
                style={{
                  display: "inline-block",
                  padding: "2px 10px",
                  borderRadius: 12,
                  fontSize: 12,
                  fontWeight: 600,
                  background: statusColors.bg,
                  color: statusColors.color
                }}
              >
                {viewTarget.statusText}
              </span>
            </td>
          </tr>
        </tbody>
      </table>

      {/* DOING: enterprise info */}
      {viewTarget.internshipStatus === "DOING" ? (
        <div style={{ marginTop: 16 }}>
          <div className={adminStyles.detailSectionTitle}>Thông tin tiếp nhận thực tập</div>
          <table className={adminStyles.viewModalDetailTable} style={{ marginTop: 8 }}>
            <tbody>
              <tr>
                <th scope="row">Thời gian TT</th>
                <td>
                  {viewTarget.internshipBatch?.startDate ? formatDateVi(viewTarget.internshipBatch.startDate) : "—"}
                  {" – "}
                  {viewTarget.internshipBatch?.endDate ? formatDateVi(viewTarget.internshipBatch.endDate) : "—"}
                </td>
              </tr>
              <tr><th scope="row">Tên doanh nghiệp</th><td>{viewTarget.enterprise?.companyName ?? "—"}</td></tr>
              <tr><th scope="row">MST</th><td>{viewTarget.enterprise?.taxCode ?? "—"}</td></tr>
              <tr><th scope="row">Địa chỉ trụ sở chính</th><td>{viewTarget.enterprise?.headquartersAddress ?? "—"}</td></tr>
            </tbody>
          </table>
        </div>
      ) : null}

      {/* REPORT_SUBMITTED: file BCTT */}
      {viewTarget.internshipStatus === "REPORT_SUBMITTED" && viewTarget.report ? (
        <div style={{ marginTop: 16 }}>
          <div className={adminStyles.detailSectionTitle}>File BCTT đã nộp</div>
          <div style={{ marginTop: 8 }}>
            <a
              className={adminStyles.detailLink}
              href={reportFileLink!}
              download={viewTarget.report.reportFileName}
              target="_blank"
              rel="noreferrer"
            >
              {viewTarget.report.reportFileName}
            </a>
          </div>
          {viewTarget.report.enterpriseEvalFileName ? (
            <div style={{ marginTop: 12 }}>
              <div className={adminStyles.detailSectionTitle}>Phiếu đánh giá doanh nghiệp</div>
              <div style={{ marginTop: 8 }}>
                <a
                  className={adminStyles.detailLink}
                  href={`/api/files/internship-report/${viewTarget.report.id}?kind=enterprise-evaluation`}
                  download={viewTarget.report.enterpriseEvalFileName}
                  target="_blank"
                  rel="noreferrer"
                >
                  {viewTarget.report.enterpriseEvalFileName}
                </a>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* COMPLETED: file BCTT + scores + evaluation */}
      {viewTarget.internshipStatus === "COMPLETED" ? (
        <div style={{ marginTop: 16 }}>
          <div className={adminStyles.detailSectionTitle}>Kết quả thực tập</div>
          <table className={adminStyles.viewModalDetailTable} style={{ marginTop: 8 }}>
            <tbody>
              <tr>
                <th scope="row">File BCTT</th>
                <td>
                  {viewTarget.report && reportFileLink ? (
                    <a
                      className={adminStyles.detailLink}
                      href={reportFileLink}
                      download={viewTarget.report.reportFileName}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {viewTarget.report.reportFileName}
                    </a>
                  ) : "—"}
                </td>
              </tr>
              <tr>
                <th scope="row">Phiếu đánh giá DN</th>
                <td>
                  {viewTarget.report?.enterpriseEvalFileName ? (
                    <a
                      className={adminStyles.detailLink}
                      href={`/api/files/internship-report/${viewTarget.report.id}?kind=enterprise-evaluation`}
                      download={viewTarget.report.enterpriseEvalFileName}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {viewTarget.report.enterpriseEvalFileName}
                    </a>
                  ) : "—"}
                </td>
              </tr>
              <tr>
                <th scope="row">Điểm ĐQT (Giảng viên hướng dẫn)</th>
                <td>{viewTarget.report?.supervisorPoint != null ? viewTarget.report.supervisorPoint : "—"}</td>
              </tr>
              <tr>
                <th scope="row">Điểm KTHP (Giảng viên hướng dẫn)</th>
                <td>{viewTarget.report?.enterprisePoint != null ? viewTarget.report.enterprisePoint : "—"}</td>
              </tr>
              <tr>
                <th scope="row">Đánh giá của giảng viên hướng dẫn</th>
                <td style={{ whiteSpace: "pre-wrap" }}>{viewTarget.report?.supervisorEvaluation ?? "—"}</td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : null}
    </MessagePopup>
  );
}
