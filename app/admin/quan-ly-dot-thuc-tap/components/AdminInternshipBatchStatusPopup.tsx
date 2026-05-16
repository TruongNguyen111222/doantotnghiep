"use client";

import type { InternshipBatchRow } from "@/lib/types/admin-quan-ly-dot-thuc-tap"; //kiểu dữ liệu đợt thực tập
import { getTodayStart } from "@/lib/utils/admin-quan-ly-dot-thuc-tap-dates"; //hàm tiện ích cho đợt thực tập

import MessagePopup from "../../../components/MessagePopup"; //popup thông báo
import styles from "../../styles/dashboard.module.css"; //style dashboard

type Props = { //props cho popup mở đóng đợt thực tập , nhạn dữ liệu vào để hiển thị và báo ngược lại cho component cha xử lý
  statusTarget: InternshipBatchRow | null; //đợt thực tập cần mở đóng
  busy: boolean; //trạng thái loading
  onClose: () => void; //hàm đóng popup
  onConfirmClose: () => void; //hàm xác nhận mở đóng đợt thực tập
};

export default function AdminInternshipBatchStatusPopup(props: Props) { //render popup mở đóng đợt thực tập
  const { statusTarget, busy, onClose, onConfirmClose } = props;
  if (!statusTarget) return null; //nếu không có đợt thực tập

  const today = getTodayStart(); //ngày hiện tại
  const end = statusTarget.endDate ? new Date(statusTarget.endDate) : null; //ngày kết thúc đợt thực tập
  const tooLate = !end ? false : end.getTime() > today.getTime(); //nếu đã quá hạn thời gian đợt thực tập
  const msg = tooLate //nếu đã quá hạn thời gian đợt thực tập
    ? "Chưa quá hạn thời gian đợt thực tập, xác nhận đóng kỳ thực tập?"
    : "Đợt thực tập sẽ chuyển trạng thái Đóng."; //nếu chưa quá hạn thời gian đợt thực tập

  return ( //render popup mở đóng đợt thực tập
    <MessagePopup
      open
      title="Cập nhật trạng thái đợt thực tập"
      size="wide"
      onClose={onClose}
      actions={
        <>
          <button type="button" className={styles.btn} onClick={onClose}>
            Hủy
          </button>
          <button type="button" className={`${styles.btn} ${styles.btnDanger}`} disabled={busy} onClick={onConfirmClose}>
            Đóng
          </button>
        </>
      }
    >
      <p>{msg}</p>
    </MessagePopup>
  );
}

