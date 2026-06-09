import FormPopup from "../../../components/FormPopup";
import adminStyles from "../../../admin/styles/dashboard.module.css";
import formStyles from "../../../auth/styles/register.module.css";

type Props = {
  busy: boolean;
  requiresEnterpriseEval: boolean;
  fieldError: string;
  enterpriseEvalFieldError: string;
  onChooseFile: (file: File | null) => void;
  onChooseEnterpriseEvalFile: (file: File | null) => void;
  onClose: () => void;
  onSubmit: () => void;
};

export default function BaoCaoThucTapUploadPopup({
  busy,
  requiresEnterpriseEval,
  fieldError,
  enterpriseEvalFieldError,
  onChooseFile,
  onChooseEnterpriseEvalFile,
  onClose,
  onSubmit
}: Props) {
  return (
    <FormPopup
      open
      title="Nộp BCTT"
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
            Nộp BCTT
          </button>
        </>
      }
    >
      <div className={formStyles.field}>
        <label className={formStyles.label}>File báo cáo thực tập (PDF hoặc DOCX)</label>
        <input
          className={formStyles.input}
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          disabled={busy}
          onChange={(e) => onChooseFile(e.target.files?.[0] ?? null)}
        />
        {fieldError ? <p className={formStyles.error}>{fieldError}</p> : null}
      </div>

      <div className={formStyles.field}>
        <label className={formStyles.label}>
          File phiếu đánh giá kết quả thực tập của doanh nghiệp (PDF hoặc DOCX)
          {requiresEnterpriseEval ? <span className={formStyles.required}> *</span> : null}
        </label>
        <input
          className={formStyles.input}
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          disabled={busy}
          onChange={(e) => onChooseEnterpriseEvalFile(e.target.files?.[0] ?? null)}
        />
        {!requiresEnterpriseEval ? (
          <p style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
            Không bắt buộc đối với sinh viên thực tập tự túc.
          </p>
        ) : null}
        {enterpriseEvalFieldError ? <p className={formStyles.error}>{enterpriseEvalFieldError}</p> : null}
      </div>
    </FormPopup>
  );
}
