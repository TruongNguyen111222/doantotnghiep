"use client";
//popup thêm/sửa thông tin sinh viên
import type { Dispatch, SetStateAction } from "react";
import type { Degree, Gender, Province, StudentFormState, Ward } from "@/lib/types/admin-quan-ly-sinh-vien";
import {
  ADMIN_QUAN_LY_SINH_VIEN_DEGREE_OPTIONS,
  ADMIN_QUAN_LY_SINH_VIEN_FACULTY_CUSTOM_VALUE,
  ADMIN_QUAN_LY_SINH_VIEN_SEMESTER_GENDER_OPTIONS
} from "@/lib/constants/admin-quan-ly-sinh-vien"; //hằng số sinh viên
import FormPopup from "../../../components/FormPopup";
import styles from "../../styles/dashboard.module.css";
import formStyles from "../../../auth/styles/register.module.css";

type Props = {
  open: boolean;
  mode: "create" | "edit";
  busy: boolean;
  form: StudentFormState;
  fieldErrors: Record<string, string>;
  faculties: string[];
  provinces: Province[];
  wards: Ward[];
  addrLoading: { provinces: boolean; wards: boolean };
  editEmail?: string;
  onClose: () => void;
  onSubmit: () => void;
  setForm: Dispatch<SetStateAction<StudentFormState>>;
};

export default function AdminSinhVienFormPopup(props: Props) {
  const {
    open,
    mode,
    busy,
    form,
    fieldErrors,
    faculties,
    provinces,
    wards,
    addrLoading,
    editEmail,
    onClose,
    onSubmit,
    setForm
  } = props;

  if (!open) return null;

  const isCreate = mode === "create"; //trạng thái thêm/sửa

  return ( //render component popup thêm/sửa thông tin sinh viên
    <FormPopup
      open
      title={isCreate ? "Thêm từng SV" : "Sửa thông tin SV"}
      busy={busy}
      onClose={onClose}
      size="extraWide"
      actions={
        <>
          <button type="button" className={styles.btn} onClick={onClose} disabled={busy}>
            Hủy
          </button>
          <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={onSubmit} disabled={busy}>
            {isCreate ? "Tạo" : "Lưu"}
          </button>
        </>
      }
    >
      <div className={formStyles.field}>
        <label className={formStyles.label}>
          Mã sinh viên <span className={formStyles.required}>*</span>
        </label>
        <input
          className={formStyles.input}
          value={form.msv}
          onChange={(e) => setForm((p) => ({ ...p, msv: e.target.value.replace(/[^\d]/g, "").slice(0, 15) }))}
          placeholder={isCreate ? "Nhập mã sinh viên (8–15 số)" : "MSV"}
        />
        {fieldErrors.msv ? <p className={formStyles.error}>{fieldErrors.msv}</p> : null}
      </div>

      <div className={formStyles.field}>
        <label className={formStyles.label}>
          Họ tên <span className={formStyles.required}>*</span>
        </label>
        <input
          className={formStyles.input}
          value={form.fullName}
          onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
          placeholder={isCreate ? "Nhập họ tên" : "Họ tên"}
        />
        {fieldErrors.fullName ? <p className={formStyles.error}>{fieldErrors.fullName}</p> : null}
      </div>

      <div className={formStyles.grid2}>
        <div className={formStyles.field}>
          <label className={formStyles.label}>
            SĐT <span className={formStyles.required}>*</span>
          </label>
          <input
            className={formStyles.input}
            value={form.phone}
            onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value.replace(/[^\d]/g, "").slice(0, 12) }))}
            placeholder={isCreate ? "Nhập số điện thoại (8–12 số)" : "SĐT"}
          />
          {fieldErrors.phone ? <p className={formStyles.error}>{fieldErrors.phone}</p> : null}
        </div>
        <div className={formStyles.field}>
          <label className={formStyles.label}>
            Email <span className={formStyles.required}>*</span>
          </label>
          <input
            className={formStyles.input}
            value={isCreate ? form.email : form.email}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            placeholder="example@domain.com"
            disabled={busy}
          />
          {fieldErrors.email ? <p className={formStyles.error}>{fieldErrors.email}</p> : null}
        </div>
      </div>

      <div className={formStyles.grid2}>
        <div className={formStyles.field}>
          <label className={formStyles.label}>
            Ngày sinh <span className={formStyles.required}>*</span>
          </label>
          <input
            type="date"
            className={formStyles.input}
            value={form.birthDate}
            onChange={(e) => setForm((p) => ({ ...p, birthDate: e.target.value }))}
          />
          {fieldErrors.birthDate ? <p className={formStyles.error}>{fieldErrors.birthDate}</p> : null}
        </div>
        <div className={formStyles.field}>
          <label className={formStyles.label}>
            Giới tính <span className={formStyles.required}>*</span>
          </label>
          <div style={{ display: "flex", gap: 14, paddingTop: 6 }}>
            {ADMIN_QUAN_LY_SINH_VIEN_SEMESTER_GENDER_OPTIONS.map((g) => (
              <label key={g.value} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input
                  type="radio"
                  checked={form.gender === g.value}
                  onChange={() => setForm((p) => ({ ...p, gender: g.value as Gender }))}
                />
                {g.label}
              </label>
            ))}
          </div>
          {fieldErrors.gender ? <p className={formStyles.error}>{fieldErrors.gender}</p> : null}
        </div>
      </div>

      <div className={formStyles.field}>
        <label className={formStyles.label}>
          Địa chỉ thường trú (Tỉnh/Phường) <span className={formStyles.required}>*</span>
        </label>
        <div className={formStyles.grid2}>
          <div className={formStyles.field} style={{ marginBottom: 0 }}>
            <select
              className={formStyles.select}
              value={form.permanentProvinceCode}
              onChange={(e) => setForm((p) => ({ ...p, permanentProvinceCode: e.target.value, permanentWardCode: "" }))}
            >
              <option value="">{addrLoading.provinces ? "Đang tải…" : "Chọn tỉnh/thành"}</option>
              {provinces.map((p) => (
                <option key={p.code} value={String(p.code)}>
                  {p.name}
                </option>
              ))}
            </select>
            {fieldErrors.permanentProvinceCode ? <p className={formStyles.error}>{fieldErrors.permanentProvinceCode}</p> : null}
          </div>
          <div className={formStyles.field} style={{ marginBottom: 0 }}>
            <select
              className={formStyles.select}
              value={form.permanentWardCode}
              onChange={(e) => setForm((p) => ({ ...p, permanentWardCode: e.target.value }))}
              disabled={!form.permanentProvinceCode || addrLoading.wards}
            >
              <option value="">
                {addrLoading.wards ? "Đang tải…" : !form.permanentProvinceCode ? "Chọn tỉnh trước" : "Chọn phường/xã"}
              </option>
              {wards.map((w) => (
                <option key={w.code} value={String(w.code)}>
                  {w.name}
                </option>
              ))}
            </select>
            {fieldErrors.permanentWardCode ? <p className={formStyles.error}>{fieldErrors.permanentWardCode}</p> : null}
          </div>
        </div>
      </div>

      <div className={formStyles.grid2}>
        <div className={formStyles.field}>
          <label className={formStyles.label}>
            Lớp <span className={formStyles.required}>*</span>
          </label>
          <input
            className={formStyles.input}
            value={form.className}
            onChange={(e) => setForm((p) => ({ ...p, className: e.target.value }))}
            placeholder={isCreate ? "Nhập lớp" : "Lớp"}
          />
          {fieldErrors.className ? <p className={formStyles.error}>{fieldErrors.className}</p> : null}
        </div>
        <div className={formStyles.field}>
          <label className={formStyles.label}>
            Khoa <span className={formStyles.required}>*</span>
          </label>
          <select
            className={formStyles.select}
            value={form.faculty}
            onChange={(e) => {
              const v = e.target.value;
              setForm((p) => ({
                ...p,
                faculty: v,
                facultyCustom: v === ADMIN_QUAN_LY_SINH_VIEN_FACULTY_CUSTOM_VALUE ? "" : p.facultyCustom
              }));
            }}
          >
            <option value="">Chọn khoa</option>
            {faculties.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
            <option value={ADMIN_QUAN_LY_SINH_VIEN_FACULTY_CUSTOM_VALUE}>Tự nhập</option>
          </select>
          {fieldErrors.faculty ? <p className={formStyles.error}>{fieldErrors.faculty}</p> : null}
          {form.faculty === ADMIN_QUAN_LY_SINH_VIEN_FACULTY_CUSTOM_VALUE ? (
            <div style={{ marginTop: 8 }}>
              <input
                className={formStyles.input}
                value={form.facultyCustom}
                onChange={(e) => setForm((p) => ({ ...p, facultyCustom: e.target.value }))}
                placeholder="Nhập khoa"
              />
              {fieldErrors.facultyCustom ? <p className={formStyles.error}>{fieldErrors.facultyCustom}</p> : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className={formStyles.grid2}>
        <div className={formStyles.field}>
          <label className={formStyles.label}>
            Khóa <span className={formStyles.required}>*</span>
          </label>
          <input
            className={formStyles.input}
            value={form.cohort}
            onChange={(e) => setForm((p) => ({ ...p, cohort: e.target.value }))}
            placeholder={isCreate ? "Nhập khóa (1–10 ký tự chữ/số)" : "Khóa"}
          />
          {fieldErrors.cohort ? <p className={formStyles.error}>{fieldErrors.cohort}</p> : null}
        </div>
        <div className={formStyles.field}>
          <label className={formStyles.label}>
            Bậc <span className={formStyles.required}>*</span>
          </label>
          <select
            className={formStyles.select}
            value={form.degree}
            onChange={(e) => setForm((p) => ({ ...p, degree: e.target.value as Degree }))}
          >
            <option value="">Chọn bậc</option>
            {ADMIN_QUAN_LY_SINH_VIEN_DEGREE_OPTIONS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
          {fieldErrors.degree ? <p className={formStyles.error}>{fieldErrors.degree}</p> : null}
        </div>
      </div>
    </FormPopup>
  );
}
