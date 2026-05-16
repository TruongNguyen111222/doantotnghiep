"use client";
//thêm hoặc sửa đợt thực tập
import type { Dispatch, SetStateAction } from "react";
import type { BatchFormState, InternshipBatchRow } from "@/lib/types/admin-quan-ly-dot-thuc-tap"; //kiểu dữ liệu đợt thực tập
import {
  ADMIN_QUAN_LY_DOT_THUC_TAP_SEMESTER_OPTIONS,
  ADMIN_QUAN_LY_DOT_THUC_TAP_STATUS_LABEL
} from "@/lib/constants/admin-quan-ly-dot-thuc-tap"; //hằng số thiết lập cho đợt thực tập
import { getTodayStart, parseDateOnly } from "@/lib/utils/admin-quan-ly-dot-thuc-tap-dates"; //hàm tiện ích cho đợt thực tập

import styles from "../../styles/dashboard.module.css";
import formStyles from "../../../auth/styles/register.module.css";

type Props = { //props cho modal sửa đợt thực tập , nhạn dữ liệu vào để hiển thị và báo ngược lại cho component cha xử lý
  editTarget: InternshipBatchRow | null;
  form: BatchFormState; //dữ liệu form đợt thực tập
  fieldErrors: Record<string, string>; //lỗi form đợt thực tập
  busy: boolean; //trạng thái loading
  onClose: () => void; //hàm đóng modal
  onSubmitCreate: () => void; //hàm tạo đợt thực tập
  onSubmitEdit: () => void; //hàm sửa đợt thực tập
  onOpenStatus: (t: InternshipBatchRow) => void; //hàm mở trạng thái đợt thực tập
  setForm: Dispatch<SetStateAction<BatchFormState>>; //hàm set dữ liệu form đợt thực tập
};

export default function AdminInternshipBatchEditModal(props: Props) { //render modal sửa đợt thực tập
  const { editTarget, form, fieldErrors, busy, onClose, onSubmitCreate, onSubmitEdit, onOpenStatus, setForm } = props;
  if (!editTarget) return null; //nếu không có đợt thực tập

  return ( //render modal sửa đợt thực tập
    <div className={styles.modalBackdrop} role="dialog" aria-modal="true" aria-labelledby="batch-edit-title"> 
      <div className={`${styles.modal} ${styles.modalWide}`}>
        <h2 id="batch-edit-title">{editTarget.id === "new" ? "Thêm đợt thực tập" : "Cập nhật đợt thực tập"}</h2>
        <div className={styles.searchToolbar} style={{ marginBottom: 10 }}>
          <div />
        </div>

        <div className={styles.card} style={{ padding: 0, border: "none", margin: 0 }}>
          <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0 }}>
            <div className={formStyles.field}>
              <label className={formStyles.label}>
                Tên đợt thực tập <span className={formStyles.required}>*</span>
              </label>
              <input
                className={formStyles.input}
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="VD: Đợt thực tập 2026"
              />
              {fieldErrors.name ? <p className={formStyles.error}>{fieldErrors.name}</p> : null}
            </div>

            <div className={formStyles.field}>
              <label className={formStyles.label}>
                Học kỳ <span className={formStyles.required}>*</span>
              </label>
              <select
                className={formStyles.select}
                value={form.semester}
                onChange={(e) => setForm((p) => ({ ...p, semester: e.target.value as any }))}
              >
                <option value="" disabled>
                  Chọn học kỳ
                </option>
                {ADMIN_QUAN_LY_DOT_THUC_TAP_SEMESTER_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
              {fieldErrors.semester ? <p className={formStyles.error}>{fieldErrors.semester}</p> : null}
            </div>

            <div className={formStyles.field}>
              <label className={formStyles.label}>
                Năm học <span className={formStyles.required}>*</span>
              </label>
              <input
                className={formStyles.input}
                value={form.schoolYear}
                onChange={(e) => setForm((p) => ({ ...p, schoolYear: e.target.value }))}
                placeholder="VD: 2024-2025"
              />
              {fieldErrors.schoolYear ? <p className={formStyles.error}>{fieldErrors.schoolYear}</p> : null}
            </div>

            <div className={formStyles.grid2}>
              <div className={formStyles.field}>
                <label className={formStyles.label}>
                  Thời gian bắt đầu <span className={formStyles.required}>*</span>
                </label>
                <input
                  className={formStyles.input}
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
                />
                {fieldErrors.startDate ? <p className={formStyles.error}>{fieldErrors.startDate}</p> : null}
              </div>

              <div className={formStyles.field}>
                <label className={formStyles.label}>
                  Thời gian kết thúc <span className={formStyles.required}>*</span>
                </label>
                <input
                  className={formStyles.input}
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
                />
                {fieldErrors.endDate ? <p className={formStyles.error}>{fieldErrors.endDate}</p> : null}
              </div>
            </div>

            <div className={formStyles.field}>
              <label className={formStyles.label}>
                Ghi chú
              </label>
              <textarea
                className={formStyles.input as any}
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Nhập ghi chú"
              />
              {fieldErrors.notes ? <p className={formStyles.error}>{fieldErrors.notes}</p> : null}
            </div>

            {editTarget.id !== "new" ? (
              <div style={{ marginTop: 12 }}>
                <p className={styles.statusNote}>
                  Trạng thái hiện tại: <strong>{ADMIN_QUAN_LY_DOT_THUC_TAP_STATUS_LABEL[editTarget.status]}</strong>
                </p>
                {editTarget.status === "OPEN" ? (
                  (() => {
                    const end = parseDateOnly(form.endDate);
                    const today = getTodayStart();
                    const canCloseInline = end.getTime() > today.getTime();
                    return canCloseInline ? (
                      <button
                        type="button"
                        className={`${styles.btn} ${styles.btnDanger}`}
                        disabled={busy}
                        onClick={() => onOpenStatus(editTarget)}
                      >
                        Đóng kỳ thực tập
                      </button>
                    ) : (
                      <p className={styles.statusNote}>Ngày kết thúc chưa quá hạn? Trạng thái sẽ tự động Đóng nếu quá hạn.</p>
                    );
                  })()
                ) : null}
              </div>
            ) : null}
          </fieldset>
        </div>

        <div className={styles.modalActions}>
          <button type="button" className={styles.btn} onClick={onClose}>
            Hủy
          </button>
          {editTarget.id === "new" ? (
            <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} disabled={busy} onClick={onSubmitCreate}>
              Tạo
            </button>
          ) : (
            <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} disabled={busy} onClick={onSubmitEdit}>
              Lưu
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

