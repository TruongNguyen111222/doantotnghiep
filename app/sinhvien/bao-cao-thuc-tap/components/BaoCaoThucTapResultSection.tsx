import type { Report } from "@/lib/types/sinhvien-bao-cao-thuc-tap";
import adminStyles from "../../../admin/styles/dashboard.module.css";

type Props = {
  report: Report | null;
  reportFileLink: string | null;
};

export default function BaoCaoThucTapResultSection({ report, reportFileLink }: Props) {
  return (
    <section className={adminStyles.detailCard} style={{ padding: "20px 22px", marginTop: 16, maxWidth: "none" }}>
      <div className={adminStyles.detailSectionTitle}>Kết quả thực tập</div>
      <table className={adminStyles.viewModalDetailTable}>
        <tbody>
          <tr>
            <th scope="row">Đánh giá</th>
            <td style={{ whiteSpace: "pre-wrap" }}>{report?.supervisorEvaluation ?? "—"}</td>
          </tr>
          <tr>
            <th scope="row">Điểm ĐQT</th>
            <td>{report?.supervisorPoint ?? "—"}</td>
          </tr>
          <tr>
            <th scope="row">Điểm KTHP</th>
            <td>{report?.enterprisePoint ?? "—"}</td>
          </tr>
          <tr>
            <th scope="row">File BCTT</th> 	
            <td>
              {report && reportFileLink ? (
                <a className={adminStyles.detailLink} href={reportFileLink} download={report.reportFileName}>
                  Tải file
                </a>
              ) : "—"}
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}
