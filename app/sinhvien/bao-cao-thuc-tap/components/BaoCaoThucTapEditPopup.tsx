import type { Report } from "@/lib/types/sinhvien-bao-cao-thuc-tap";
import FormPopup from "../../../components/FormPopup";
import adminStyles from "../../../admin/styles/dashboard.module.css";
import formStyles from "../../../auth/styles/register.module.css";

type Props = {
  busy: boolean;
  requiresEnterpriseEval: boolean;
  report: Report | null;
  reportFileLink: string | null;
  enterpriseEvalFileLink: string | null;
  selectedFileBase64: string | null;
  selectedEnterpriseEvalBase64: string | null;
  deleteLocalFile: boolean;
  deleteLocalEnterpriseEval: boolean;
  fieldError: string;
  enterpriseEvalFieldError: string;
  onChooseFile: (file: File | null) => void;
  onChooseEnterpriseEvalFile: (file: File | null) => void;
  onDeleteFile: () => void;
  onDeleteEnterpriseEvalFile: () => void;
  onClose: () => void;
  onSubmit: () => void;
};

export default function BaoCaoThucTapEditPopup({
  busy,
  requiresEnterpriseEval,
  report,
  reportFileLink,
  enterpriseEvalFileLink,
  selectedFileBase64,
  selectedEnterpriseEvalBase64,
  deleteLocalFile,
  deleteLocalEnterpriseEval,
  fieldError,
  enterpriseEvalFieldError,
  onChooseFile,
  onChooseEnterpriseEvalFile,
  onDeleteFile,
  onDeleteEnterpriseEvalFile,
  onClose,
  onSubmit
}: Props) {
  const hasOldFile = Boolean(report && reportFileLink);
  const oldFileRemoved = deleteLocalFile || Boolean(selectedFileBase64);
  const showFileInput = !hasOldFile || oldFileRemoved;

  const hasOldEnterpriseEval = Boolean(report?.enterpriseEvalFileName && enterpriseEvalFileLink);
  const oldEnterpriseEvalRemoved = deleteLocalEnterpriseEval || Boolean(selectedEnterpriseEvalBase64);
  const showEnterpriseEvalInput = !hasOldEnterpriseEval || oldEnterpriseEvalRemoved;

  return (
    <FormPopup
      open
      title="Sửa BCTT"
      size="wide"
      busy={busy}
      onClose={() => { if (!busy) onClose(); }}
      actions={
        <>
          <button type="button" className={adminStyles.btn} disabled={busy} onClick={onClose}>
            Hủy
          </button>
          <button
            type="button"
            className={`${adminStyles.btn} ${adminStyles.btnPrimary}`}
            disabled={busy}
            onClick={onSubmit}
          >
            Lưu
          </button>
        </>
      }
    >
      <div className={formStyles.field}>
        {report?.supervisorRejectReason ? (
          <div
            style={{
              background: "#fef2f2",
              border: "1px solid #fca5a5",
              borderRadius: 8,
              padding: "10px 14px",
              marginBottom: 16
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: "#dc2626", marginBottom: 4 }}>
              Lý do giảng viên hướng dẫn từ chối:
            </div>
            <div style={{ fontSize: 13, color: "#111827", whiteSpace: "pre-wrap" }}>
              {report.supervisorRejectReason}
            </div>
          </div>
        ) : null}

        <label className={formStyles.label}>File BCTT hiện tại</label>
        {hasOldFile && !oldFileRemoved ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "8px 12px",
              background: "#f9fafb",
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              marginBottom: 4
            }}
          >
            <a
              className={adminStyles.detailLink}
              href={reportFileLink!}
              download={report!.reportFileName}
              target="_blank"
              rel="noreferrer"
            >
              {report!.reportFileName}
            </a>
            <button
              type="button"
              className={adminStyles.textLinkBtn}
              disabled={busy}
              onClick={onDeleteFile}
              style={{ color: "#dc2626", marginLeft: "auto", flexShrink: 0 }}
            >
              Xóa file
            </button>
          </div>
        ) : null}

        {hasOldFile && !oldFileRemoved ? (
          <p style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
            Vui lòng xóa file hiện tại trước khi tải lên file mới.
          </p>
        ) : (
          <>
            <label className={formStyles.label} style={{ marginTop: 12 }}>
              Tải lên file BCTT mới (PDF hoặc DOCX)
            </label>
            <input
              className={formStyles.input}
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              disabled={busy}
              onChange={(e) => onChooseFile(e.target.files?.[0] ?? null)}
            />
          </>
        )}

        {fieldError ? <p className={formStyles.error}>{fieldError}</p> : null}
      </div>

      <div className={formStyles.field}>
        <label className={formStyles.label}>
          Phiếu đánh giá doanh nghiệp hiện tại
          {requiresEnterpriseEval ? <span className={formStyles.required}> *</span> : null}
        </label>
        {hasOldEnterpriseEval && !oldEnterpriseEvalRemoved ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "8px 12px",
              background: "#f9fafb",
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              marginBottom: 4
            }}
          >
            <a
              className={adminStyles.detailLink}
              href={enterpriseEvalFileLink!}
              download={report!.enterpriseEvalFileName ?? undefined}
              target="_blank"
              rel="noreferrer"
            >
              {report!.enterpriseEvalFileName}
            </a>
            <button
              type="button"
              className={adminStyles.textLinkBtn}
              disabled={busy}
              onClick={onDeleteEnterpriseEvalFile}
              style={{ color: "#dc2626", marginLeft: "auto", flexShrink: 0 }}
            >
              Xóa file
            </button>
          </div>
        ) : null}

        {hasOldEnterpriseEval && !oldEnterpriseEvalRemoved ? (
          <p style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
            Vui lòng xóa file hiện tại trước khi tải lên file mới.
          </p>
        ) : (
          <>
            <label className={formStyles.label} style={{ marginTop: 12 }}>
              Tải lên phiếu đánh giá doanh nghiệp mới (PDF hoặc DOCX)
            </label>
            <input
              className={formStyles.input}
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              disabled={busy}
              onChange={(e) => onChooseEnterpriseEvalFile(e.target.files?.[0] ?? null)}
            />
          </>
        )}
        {enterpriseEvalFieldError ? <p className={formStyles.error}>{enterpriseEvalFieldError}</p> : null}
      </div>
    </FormPopup>
  );
}
