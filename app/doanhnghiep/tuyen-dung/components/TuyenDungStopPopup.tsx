import type { JobListItem } from "@/lib/types/doanhnghiep-tuyen-dung"; //type dữ liệu tin tuyển dụng
import adminStyles from "../../../admin/styles/dashboard.module.css";
 
/**
 * TỔNG QUAN FILE:
 * Component TuyenDungStopPopup hiển thị một cửa sổ bật lên (Modal/Popup) để xác nhận và thực hiện thao tác DỪNG hoạt động
 * của một tin tuyển dụng cụ thể. Hỗ trợ trạng thái tải dữ liệu bất đồng bộ (busyId) khi đang đợi phản hồi từ API.
 */
type Props = { 
  stopTarget: JobListItem | null; //tin tuyển dụng cần dừng hoạt động
  busyId: string | null;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function TuyenDungStopPopup({ stopTarget, busyId, onConfirm, onCancel }: Props) {
  if (!stopTarget) return null;

  return (
    <div className={adminStyles.modalBackdrop} role="dialog" aria-modal="true" aria-labelledby="job-stop-title">
      <div className={`${adminStyles.modalWide} ${adminStyles.modal}`}>
        <h2 id="job-stop-title">Cập nhật trạng thái</h2>
        <p>
          Bạn xác nhận chắc chắn dừng hoạt động của tin: <strong>{stopTarget.title}</strong>?
        </p>
        <div className={adminStyles.modalActions}>
          <button type="button" className={adminStyles.btn} onClick={onCancel}>
            Hủy
          </button>
          <button
            type="button"
            className={`${adminStyles.btn} ${adminStyles.btnDanger}`}
            disabled={busyId !== null}
            onClick={onConfirm}
          >
            Dừng hoạt động
          </button>
        </div>
      </div>
    </div>
  );
}
