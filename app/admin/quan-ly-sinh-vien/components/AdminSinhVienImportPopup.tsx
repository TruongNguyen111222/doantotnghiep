"use client";
//popup import sinh viên
import MessagePopup from "../../../components/MessagePopup";
import styles from "../../styles/dashboard.module.css";

type Props = {
  open: boolean;
  importBusy: boolean;
  importFile: File | null;
  onClose: () => void;
  onSetImportFile: (file: File | null) => void;
  onDownloadTemplate: () => void;
  onSubmitImport: () => void;
};

export default function AdminSinhVienImportPopup(props: Props) {
  const { open, importBusy, importFile, onClose, onSetImportFile, onDownloadTemplate, onSubmitImport } = props;

  if (!open) return null;

  return (
    <MessagePopup
      open
      title="Thêm danh sách SV"
      size="wide"
      onClose={onClose}
      actions={
        <>
          <button type="button" className={styles.btn} onClick={onClose} disabled={importBusy}>
            Hủy
          </button>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary}`}
            disabled={importBusy}
            onClick={onSubmitImport}
          >
            Tạo
          </button>
        </>
      }
    >
      <div style={{ marginTop: 8 }}>
        <p style={{ marginTop: 0 }}>Tải file excel mẫu:</p>
        <button type="button" className={styles.btn} onClick={onDownloadTemplate} disabled={importBusy}>
          Tải mẫu Excel
        </button>
      </div>

      <div style={{ marginTop: 14 }}>
        <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151" }}>Upload file Excel</label>
        <input
          type="file"
          accept=".xlsx,.xls"
          disabled={importBusy}
          style={{ width: "100%", marginTop: 6 }}
          onChange={(e) => onSetImportFile(e.target.files?.[0] || null)}
        />
        <p className={styles.modulePlaceholder} style={{ marginTop: 8, fontSize: 12 }}>
          Sau khi chọn file, bấm `Tạo` để hệ thống import.
        </p>
        <p className={styles.modulePlaceholder} style={{ marginTop: 10 }}>
          Khi import thành công, hệ thống sẽ cấp tài khoản đăng nhập cho sinh viên (mật khẩu = ngày sinh).
        </p>
      </div>
    </MessagePopup>
  );
}
