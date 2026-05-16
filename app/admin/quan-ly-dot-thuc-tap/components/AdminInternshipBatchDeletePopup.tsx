"use client";
//xác nhận xóa đợt thực tập khi click vào icon xóa
import type { InternshipBatchRow } from "@/lib/types/admin-quan-ly-dot-thuc-tap"; //kiểu dữ liệu đợt thực tập
import MessagePopup from "../../../components/MessagePopup"; //popup thông báo
import styles from "../../styles/dashboard.module.css";

type Props = { //props cho popup xóa đợt thực tập , nhạn dữ liệu vào để hiển thị và báo ngược lại cho component cha xử lý
  deleteTarget: InternshipBatchRow | null; //đợt thực tập cần xóa
  busy: boolean; //trạng thái loading
  onClose: () => void; //hàm đóng popup
  onConfirm: () => void; //hàm xác nhận xóa đợt thực tập
};

export default function AdminInternshipBatchDeletePopup(props: Props) { //render popup xóa đợt thực tập
  const { deleteTarget, busy, onClose, onConfirm } = props; //dữ liệu popup xóa đợt thực tập
  if (!deleteTarget) return null; //nếu không có đợt thực tập

  return ( //render popup xóa đợt thực tập
    <MessagePopup
      open
      title="Xóa đợt thực tập"
      size="wide"
      onClose={onClose}
      actions={
        <>
          <button type="button" className={styles.btn} onClick={onClose}>
            Hủy
          </button>
          <button type="button" className={`${styles.btn} ${styles.btnDanger}`} disabled={busy} onClick={onConfirm}>
            Xóa
          </button>
        </>
      }
    >
      <p>
        Bạn có chắc chắn muốn xóa Đợt thực tập <strong>{deleteTarget.name}</strong> không?
      </p>
    </MessagePopup>
  );
}

