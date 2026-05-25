"use client";
//popup xác nhận chuyển đổi trạng thái tài khoản sinh viên, giảng viên hoặc doanh nghiệp
import type { AccountStatus } from "@/lib/types/admin-quan-ly-tai-khoan";
import MessagePopup from "../../../components/MessagePopup";
import styles from "../../styles/dashboard.module.css";

type Props = { //props popup sửa trạng thái tài khoản
  open: boolean;
  statusDraft: AccountStatus;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onChangeStatus: (v: AccountStatus) => void;
};

export default function AdminTaiKhoanStatusPopup(props: Props) { //hàm hiển thị popup sửa trạng thái tài khoản
  const { open, statusDraft, busy, onClose, onConfirm, onChangeStatus } = props;
  if (!open) return null;

  return (
    <MessagePopup
      open
      title="Cập nhật trạng thái"
      size="wide"
      onClose={onClose}
      actions={
        <>
          <button type="button" className={styles.btn} onClick={onClose} disabled={busy}>
            Hủy
          </button>
          <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={onConfirm} disabled={busy}>
            Lưu
          </button>
        </>
      }
    >
      <div style={{ marginTop: 10 }}>
        <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151" }}>Trạng thái</label>
        <select
          style={{ width: "100%", marginTop: 6 }}
          value={statusDraft}
          onChange={(e) => onChangeStatus(e.target.value as AccountStatus)}
          disabled={busy}
        >
          <option value="ACTIVE">Đang hoạt động</option>
          <option value="STOPPED">Dừng hoạt động</option>
        </select>
      </div>
    </MessagePopup>
  );
}
