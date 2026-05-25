import type { JobDetailResponse, JobFormState, JobListItem } from "@/lib/types/doanhnghiep-tuyen-dung";
import TuyenDungJobFormFields from "./TuyenDungJobFormFields";
import adminStyles from "../../../admin/styles/dashboard.module.css";
import { ChartStyleLoading } from "@/app/components/ChartStyleLoading";

/**
 * TỔNG QUAN FILE:
 * Component TuyenDungEditPopup hiển thị một cửa sổ bật lên (Modal/Popup) để thực hiện thao tác CẬP NHẬT (SỬA) tin tuyển dụng.
 * Hỗ trợ trạng thái tải dữ liệu bất đồng bộ (busyId) khi đang đợi phản hồi từ API.
 */

type Props = {
  editTarget: JobListItem | null;
  editDetail: JobDetailResponse | null;
  editLoading: boolean;
  form: JobFormState;
  facultyOptions: string[];
  fieldErrors: Record<string, string>;
  busyId: string | null;
  onChange: (updates: Partial<JobFormState>) => void;
  onCancel: () => void;
  onSubmit: () => void;
};

export default function TuyenDungEditPopup({
  editTarget,
  editDetail,
  editLoading,
  form,
  facultyOptions,
  fieldErrors,
  busyId,
  onChange,
  onCancel,
  onSubmit
}: Props) {
  if (!editTarget) return null;

  return (
    <div className={adminStyles.modalBackdrop} role="dialog" aria-modal="true" aria-labelledby="job-edit-title">
      <div className={`${adminStyles.modalWide} ${adminStyles.modal}`}>
        <h2 id="job-edit-title">Sửa tin tuyển dụng</h2>
        {editLoading || !editDetail ? <ChartStyleLoading variant="compact" /> : null}
        {editDetail ? (
          <div>
            {editDetail.job.status === "REJECTED" ? (
              <div style={{ marginBottom: 10 }}>
                <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>
                  Lý do từ chối: <strong>{editDetail.job.rejectionReason || "—"}</strong>
                </p>
              </div>
            ) : null}
            <TuyenDungJobFormFields
              form={form}
              facultyOptions={facultyOptions}
              fieldErrors={fieldErrors}
              disabled={busyId !== null}
              onChange={onChange}
            />
          </div>
        ) : null}
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
            Sửa
          </button>
        </div>
      </div>
    </div>
  );
}
