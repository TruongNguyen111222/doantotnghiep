import type { JobFormState } from "@/lib/types/doanhnghiep-tuyen-dung"; //type dữ liệu form tuyển dụng
import TuyenDungJobFormFields from "./TuyenDungJobFormFields";
import adminStyles from "../../../admin/styles/dashboard.module.css";

/**
 * TỔNG QUAN FILE:
 * Component TuyenDungAddPopup hiển thị một cửa sổ bật lên (Modal/Popup) để thực hiện thao tác THÊM MỚI tin tuyển dụng.
 * Hỗ trợ trạng thái tải dữ liệu bất đồng bộ (busyId) khi đang đợi phản hồi từ API.
 */

type Props = {
  open: boolean;
  form: JobFormState; //form tuyển dụng
  facultyOptions: string[];
  fieldErrors: Record<string, string>;
  busyId: string | null;
  onChange: (updates: Partial<JobFormState>) => void;
  onCancel: () => void;
  onSubmit: () => void;
};

export default function TuyenDungAddPopup({ open, form, facultyOptions, fieldErrors, busyId, onChange, onCancel, onSubmit }: Props) {
  if (!open) return null;

  return (
    <div className={adminStyles.modalBackdrop} role="dialog" aria-modal="true" aria-labelledby="job-add-title">
      <div className={`${adminStyles.modalWide} ${adminStyles.modal}`}>
        <h2 id="job-add-title">Thêm tin tuyển dụng mới</h2>
        <TuyenDungJobFormFields
          form={form}
          facultyOptions={facultyOptions}
          fieldErrors={fieldErrors}
          disabled={busyId !== null}
          onChange={onChange}
          showCompanyIntroAndWebsite={false}
        />
        <div className={adminStyles.modalActions}>
          <button type="button" className={adminStyles.btn} onClick={onCancel}>
            Hủy
          </button>
          <button
            type="button"
            className={`${adminStyles.btn} ${adminStyles.btnPrimary}`}
            disabled={busyId !== null}
            onClick={onSubmit}
          >
            Tạo
          </button>
        </div>
      </div>
    </div>
  );
}
