"use client";
//popup xác nhận xóa tài khoản sinh viên, giảng viên hoặc doanh nghiệp
import type { AccountRow } from "@/lib/types/admin-quan-ly-tai-khoan";
import { roleLabel } from "@/lib/constants/admin-quan-ly-tai-khoan";
import MessagePopup from "../../../components/MessagePopup";
import styles from "../../styles/dashboard.module.css";

type Props = { //props popup xóa tài khoản
  target: AccountRow | null;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export default function AdminTaiKhoanDeletePopup(props: Props) { //hàm hiển thị popup xóa tài khoản
  const { target, busy, onClose, onConfirm } = props;
  if (!target) return null;

  return (
    <MessagePopup
      open
      title="Xóa tài khoản"
      size="wide"
      onClose={onClose}
      actions={
        <>
          <button type="button" className={styles.btn} onClick={onClose} disabled={busy}>
            Hủy
          </button>
          <button type="button" className={`${styles.btn} ${styles.btnDanger}`} onClick={onConfirm} disabled={busy}>
            Xóa
          </button>
        </>
      }
    >
      <p>
        Bạn có chắc chắn muốn xóa tài khoản <strong>[{roleLabel[target.role]}]</strong> -{" "}
        <strong>[{target.fullName}]</strong>-<strong>[{target.email}]</strong> không?
      </p>
    </MessagePopup>
  );
}
