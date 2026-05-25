import type { JobListItem } from "@/lib/types/doanhnghiep-tuyen-dung";
import adminStyles from "../../../admin/styles/dashboard.module.css";

/**
 * TỔNG QUAN FILE:
 * Component TuyenDungDeletePopup hiển thị một cửa sổ bật lên (Modal/Popup) để xác nhận và thực hiện thao tác XÓA
 * một tin tuyển dụng cụ thể. Hỗ trợ trạng thái tải dữ liệu bất đồng bộ (busyId) khi đang đợi phản hồi từ API.
 */

type Props = {
  deleteTarget: JobListItem | null;
  busyId: string | null;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function TuyenDungDeletePopup({ deleteTarget, busyId, onConfirm, onCancel }: Props) {
  if (!deleteTarget) return null;

  return (
    <div className={adminStyles.modalBackdrop} role="dialog" aria-modal="true" aria-labelledby="job-del-title">
      <div className={`${adminStyles.modalWide} ${adminStyles.modal}`}>
        <h2 id="job-del-title">Xóa tin tuyển dụng</h2>
        <p>
          Bạn có chắc chắn muốn xóa tin tuyển dụng: <strong>{deleteTarget.title}</strong> không?
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
            Xóa tin
          </button>
        </div>
      </div>
    </div>
  );
}
