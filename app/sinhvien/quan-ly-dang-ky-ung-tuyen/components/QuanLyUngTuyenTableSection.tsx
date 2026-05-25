import type { RespondAction, SinhVienQuanLyDangKyUngTuyenRow } from "@/lib/types/sinhvien-quan-ly-dang-ky-ung-tuyen";
import {
  SINHVIEN_QUAN_LY_DANG_KY_UNG_TUYEN_EMPTY_TEXT,
  SINHVIEN_QUAN_LY_DANG_KY_UNG_TUYEN_CONFIRM_INTERNSHIP_TEXT,
  SINHVIEN_QUAN_LY_DANG_KY_UNG_TUYEN_CONFIRM_INTERVIEW_TEXT,
  SINHVIEN_QUAN_LY_DANG_KY_UNG_TUYEN_DECLINE_INTERNSHIP_TEXT,
  SINHVIEN_QUAN_LY_DANG_KY_UNG_TUYEN_DECLINE_INTERVIEW_TEXT,
  sinhvienQuanLyDangKyUngTuyenStatusLabel
} from "@/lib/constants/sinhvien-quan-ly-dang-ky-ung-tuyen";
import {
  formatDateVi,
  getSinhVienQuanLyDangKyUngTuyenResponseText,
  canRespond
} from "@/lib/utils/sinhvien-quan-ly-dang-ky-ung-tuyen";
import { formatDateTimeVi } from "@/lib/utils/doanhnghiep-ung-vien-detail";
import adminStyles from "../../../admin/styles/dashboard.module.css";
import styles from "../../styles/dashboard.module.css";
import { useState } from "react";
import MessagePopup from "../../../components/MessagePopup";
import TableIconButton from "../../../components/TableIconButton";
import { FiCheck, FiInfo, FiX } from "react-icons/fi";

type Props = {
  rows: SinhVienQuanLyDangKyUngTuyenRow[];
  busyId: string | null;
  onRespond: (applicationId: string, action: RespondAction) => void;
};

function ActionCell({ //hàm cell thao tác
  row,
  busyId,
  onRespond,
  onViewStatus
}: {
  row: SinhVienQuanLyDangKyUngTuyenRow;
  busyId: string | null;
  onRespond: (id: string, action: RespondAction) => void;
  onViewStatus: (row: SinhVienQuanLyDangKyUngTuyenRow) => void;
}) {
  const isBusy = busyId === row.id;
  const alreadyResponded = row.response !== "PENDING";
  const canViewStatus = row.status === "INTERVIEW_INVITED" || row.status === "OFFERED";

  function confirmAndRespond(action: RespondAction) {
    const isInterview = action === "CONFIRM_INTERVIEW" || action === "DECLINE_INTERVIEW";
    const verb =
      action === "CONFIRM_INTERVIEW" || action === "CONFIRM_INTERNSHIP" ? "xác nhận" : "từ chối";
    const noun = isInterview ? "phỏng vấn" : "thực tập";
    const ok = window.confirm(`Bạn có chắc chắn muốn ${verb} ${noun} không?`);
    if (!ok) return;
    onRespond(row.id, action);
  }

  if (row.status === "INTERVIEW_INVITED") {
    return (
      <div className={adminStyles.rowActions} style={{ gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <TableIconButton label="Xem thông tin phỏng vấn" onClick={() => onViewStatus(row)}>
          <FiInfo size={18} />
        </TableIconButton>
        <TableIconButton
          label={SINHVIEN_QUAN_LY_DANG_KY_UNG_TUYEN_CONFIRM_INTERVIEW_TEXT}
          variant="success"
          disabled={isBusy || alreadyResponded}
          onClick={() => !alreadyResponded && confirmAndRespond("CONFIRM_INTERVIEW")}
        >
          <FiCheck size={18} />
        </TableIconButton>
        <TableIconButton
          label={SINHVIEN_QUAN_LY_DANG_KY_UNG_TUYEN_DECLINE_INTERVIEW_TEXT}
          variant="danger"
          disabled={isBusy || alreadyResponded}
          onClick={() => !alreadyResponded && confirmAndRespond("DECLINE_INTERVIEW")}
        >
          <FiX size={18} />
        </TableIconButton>
      </div>
    );
  }

  if (row.status === "OFFERED") {
    return (
      <div className={adminStyles.rowActions} style={{ gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <TableIconButton label="Xem thông tin trúng tuyển" onClick={() => onViewStatus(row)}>
          <FiInfo size={18} />
        </TableIconButton>
        <TableIconButton
          label={SINHVIEN_QUAN_LY_DANG_KY_UNG_TUYEN_CONFIRM_INTERNSHIP_TEXT}
          variant="success"
          disabled={isBusy || alreadyResponded}
          onClick={() => !alreadyResponded && confirmAndRespond("CONFIRM_INTERNSHIP")}
        >
          <FiCheck size={18} />
        </TableIconButton>
        <TableIconButton
          label={SINHVIEN_QUAN_LY_DANG_KY_UNG_TUYEN_DECLINE_INTERNSHIP_TEXT}
          variant="danger"
          disabled={isBusy || alreadyResponded}
          onClick={() => !alreadyResponded && confirmAndRespond("DECLINE_INTERNSHIP")}
        >
          <FiX size={18} />
        </TableIconButton>
      </div>
    );
  }

  return <span>—</span>;
}

export default function QuanLyUngTuyenTableSection({ rows, busyId, onRespond }: Props) {
  const [viewStatusRow, setViewStatusRow] = useState<SinhVienQuanLyDangKyUngTuyenRow | null>(null);

  return (
    <>
      <div className={adminStyles.tableWrap}>
        <table className={adminStyles.dataTable}>
          <thead>
            <tr>
              <th>STT</th>
              <th>Tin tuyển dụng</th>
              <th>Doanh nghiệp</th>
              <th>Vị trí tuyển dụng</th>
              <th>Ngày ứng tuyển</th>
              <th>Trạng thái</th>
              <th>Phản hồi của SV</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className={styles.modulePlaceholder}>
                  {SINHVIEN_QUAN_LY_DANG_KY_UNG_TUYEN_EMPTY_TEXT}
                </td>
              </tr>
            ) : (
              rows.map((r, idx) => {
                return (
                  <tr key={r.id}>
                    <td>{idx + 1}</td>
                    <td>
                      <a className={adminStyles.detailLink} href={`/sinhvien/tra-cuu-ung-tuyen/${r.job.id}`}>
                        {r.job.title}
                      </a>
                    </td>
                    <td>{r.job.companyName}</td>
                    <td>{r.job.expertise}</td>
                    <td>{formatDateVi(r.appliedAt)}</td>
                    <td>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "2px 8px",
                          borderRadius: 12,
                          fontSize: 12,
                          fontWeight: 600,
                          background:
                            r.status === "OFFERED"
                              ? "#dcfce7"
                              : r.status === "INTERVIEW_INVITED"
                              ? "#dbeafe"
                              : r.status === "REJECTED" || r.status === "STUDENT_DECLINED"
                              ? "#fee2e2"
                              : "#f3f4f6",
                          color:
                            r.status === "OFFERED"
                              ? "#16a34a"
                              : r.status === "INTERVIEW_INVITED"
                              ? "#1d4ed8"
                              : r.status === "REJECTED" || r.status === "STUDENT_DECLINED"
                              ? "#dc2626"
                              : "#374151"
                        }}
                      >
                        {sinhvienQuanLyDangKyUngTuyenStatusLabel[r.status]}
                      </span>
                    </td>
                    <td>{getSinhVienQuanLyDangKyUngTuyenResponseText(r)}</td>
                    <td>
                      <ActionCell row={r} busyId={busyId} onRespond={onRespond} onViewStatus={setViewStatusRow} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {viewStatusRow ? (
        <MessagePopup open title="Thông tin phản hồi" onClose={() => setViewStatusRow(null)} size="wide">
          <table className={adminStyles.viewModalDetailTable} style={{ marginTop: 10 }}>
            <tbody>
              <tr>
                <th scope="row">Tin tuyển dụng</th>
                <td>{viewStatusRow.job.title}</td>
              </tr>
              <tr>
                <th scope="row">Doanh nghiệp</th>
                <td>{viewStatusRow.job.companyName}</td>
              </tr>
              {viewStatusRow.status === "INTERVIEW_INVITED" ? (
                <>
                  <tr>
                    <th scope="row">Thời gian phỏng vấn</th>
                    <td>{formatDateTimeVi(viewStatusRow.interviewAt)}</td>
                  </tr>
                  <tr>
                    <th scope="row">Địa điểm phỏng vấn</th>
                    <td>{viewStatusRow.interviewLocation || "—"}</td>
                  </tr>
                  <tr>
                    <th scope="row">Thời hạn phản hồi</th>
                    <td>{formatDateTimeVi(viewStatusRow.responseDeadline)}</td>
                  </tr>
                </>
              ) : viewStatusRow.status === "OFFERED" ? (
                <tr>
                  <th scope="row">Thời hạn phản hồi</th>
                  <td>{formatDateTimeVi(viewStatusRow.responseDeadline)}</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </MessagePopup>
      ) : null}
    </>
  );
}
