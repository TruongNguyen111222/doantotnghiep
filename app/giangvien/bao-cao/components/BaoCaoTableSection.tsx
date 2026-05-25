import type { Row } from "@/lib/types/giangvien-bao-cao-thuc-tap";
import { degreeLabel } from "@/lib/constants/giangvien-bao-cao-thuc-tap";
import TableIconButton from "../../../components/TableIconButton";
import { FiBriefcase, FiEye, FiFileText } from "react-icons/fi";
import adminStyles from "../../../admin/styles/dashboard.module.css";
import { ChartStyleLoading } from "@/app/components/ChartStyleLoading";

type Props = { 
  loading: boolean;
  rows: Row[];
  busy: boolean;
  onView: (r: Row) => void;
  onUpdate: (r: Row) => void;
  onReview: (r: Row) => void;
};

export default function BaoCaoTableSection({ loading, rows, busy, onView, onUpdate, onReview }: Props) {
  if (loading && rows.length === 0) {
    return <ChartStyleLoading variant="compact" />;
  }

  return (
    <div className={adminStyles.tableWrap}>
      <table className={adminStyles.dataTable}>
        <thead>
          <tr>
            <th>STT</th>
            <th>MSV</th>
            <th>Họ tên</th>
            <th>Khóa</th>
            <th>Bậc</th>
            <th>Trạng thái thực tập</th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={7} className={adminStyles.modulePlaceholder}>
                Chưa có dữ liệu.
              </td>
            </tr>
          ) : (
            rows.map((r, idx) => (
              <tr key={r.studentProfileId}>
                <td data-label="STT">{idx + 1}</td>
                <td data-label="MSV">{r.msv}</td>
                <td data-label="Họ tên">{r.fullName}</td>
                <td data-label="Khóa">{r.cohort}</td>
                <td data-label="Bậc">{degreeLabel[r.degree]}</td>
                <td data-label="Trạng thái thực tập">{r.statusText}</td>
                <td data-label="Thao tác">
                  <div className={adminStyles.rowActions} style={{ gap: 6, flexWrap: "wrap" }}>
                    <TableIconButton label="Xem chi tiết" onClick={() => onView(r)} disabled={busy}>
                      <FiEye size={18} />
                    </TableIconButton>
                    {r.ui.canUpdateInternshipStatus ? (
                      <TableIconButton label="Xác nhận thực tập tự túc" variant="success" disabled={busy} onClick={() => onUpdate(r)}>
                        <FiBriefcase size={18} />
                      </TableIconButton>
                    ) : null}
                    {r.ui.canReviewReport && r.report ? (
                      <TableIconButton label="Đánh giá báo cáo thực tập" disabled={busy} onClick={() => onReview(r)}>
                        <FiFileText size={18} />
                      </TableIconButton>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
