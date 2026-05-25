"use client";
//popup xác nhận xóa sinh viên
import type { StudentListItem } from "@/lib/types/admin-quan-ly-sinh-vien";
import MessagePopup from "../../../components/MessagePopup";
import styles from "../../styles/dashboard.module.css";

type Props = {
  target: StudentListItem | null;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export default function AdminSinhVienDeletePopup(props: Props) { //component popup xóa sinh viên
  const { target, busy, onClose, onConfirm } = props;
  if (!target) return null;

  return (
    <MessagePopup
      open
      title="Xóa sinh viên"
      size="wide"
      onClose={onClose}
      actions={
        <>
          <button type="button" className={styles.btn} onClick={onClose} disabled={busy}>
            Hủy
          </button>
          <button type="button" className={`${styles.btn} ${styles.btnDanger}`} disabled={busy} onClick={onConfirm}>
            Xóa
          </button>
        </>
      }
    >
      <p>
        Bạn có chắc chắn muốn xóa sinh viên - <strong>[{target.msv}]</strong>-<strong>[{target.fullName}]</strong> không?
      </p>
    </MessagePopup>
  );
}
