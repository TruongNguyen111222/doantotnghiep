import type { EnterpriseAccountFormState } from "@/lib/types/doanhnghiep-tai-khoan"; //kiểu dữ liệu trả về từ API   
import adminStyles from "../../../admin/styles/dashboard.module.css"; //style cho admin
import formStyles from "../../../auth/styles/register.module.css"; //style cho auth
import type { Province, Ward } from "@/lib/types/admin-quan-ly-sinh-vien"; //kiểu dữ liệu trả về từ API
//component hiển thị form doanh nghiệp
type FormState = EnterpriseAccountFormState; //kiểu dữ liệu trả về từ API

type Props = { //props cho component
  isEditing: boolean;
  saving: boolean;
  form: FormState;
  fieldErrors: Record<string, string>;
  onSetField: (key: keyof FormState, value: string | string[]) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  provinces: Province[];
  wards: Ward[];
  addrLoading: { provinces: boolean; wards: boolean };
  logoError: string;
  onSetLogoFile: (f: File | null) => void;
};

export default function EnterpriseAccountEditSection({ //hàm xử lý form doanh nghiệp
  isEditing,
  saving,
  form,
  fieldErrors,
  onSetField,
  onStartEdit,
  onCancelEdit,
  provinces,
  wards,
  addrLoading,
  logoError,
  onSetLogoFile
}: Props) {
  if (isEditing) {
    return (
      <>
        <div className={formStyles.field}>
          <label className={formStyles.label}>Email</label>
          <input
            type="email"
            className={formStyles.input}
            disabled={saving}
            autoComplete="email"
            value={form.email}
            onChange={(e) => onSetField("email", e.target.value)}
            placeholder="email@example.com"
          />
          {fieldErrors.email ? <p className={formStyles.error}>{fieldErrors.email}</p> : null}
        </div>

        <div className={formStyles.field}>
          <label className={formStyles.label}>So dien thoai</label>
          <input
            className={formStyles.input}
            disabled={saving}
            autoComplete="tel"
            inputMode="numeric"
            value={form.phone}
            onChange={(e) => onSetField("phone", e.target.value)}
            placeholder="Vi du: 0912345678"
          />
          {fieldErrors.phone ? <p className={formStyles.error}>{fieldErrors.phone}</p> : null}
        </div>

        <div className={formStyles.field}>
          <label className={formStyles.label}>Tên người đại diện</label>
          <input
            className={formStyles.input}
            disabled={saving}
            value={form.representativeName}
            onChange={(e) => onSetField("representativeName", e.target.value)}
            placeholder="Nhap ho va ten"
          />
          {fieldErrors.representativeName ? <p className={formStyles.error}>{fieldErrors.representativeName}</p> : null}
        </div>

        <div className={formStyles.field}>
          <label className={formStyles.label}>Chức vụ</label>
          <input
            className={formStyles.input}
            disabled={saving}
            value={form.representativeTitle}
            onChange={(e) => onSetField("representativeTitle", e.target.value)}
            placeholder="Nhập chức vụ"
          />
          {fieldErrors.representativeTitle ? <p className={formStyles.error}>{fieldErrors.representativeTitle}</p> : null}
        </div>

        <div className={formStyles.field}>
          <label className={formStyles.label}>Giới thiệu về doanh nghiệp</label>
          <textarea
            disabled={saving}
            className={formStyles.textarea}
            value={form.companyIntro}
            onChange={(e) => onSetField("companyIntro", e.target.value)}
            placeholder="Nhập giới thiệu ngắn về doanh nghiệp"
          />
          {fieldErrors.companyIntro ? <p className={formStyles.error}>{fieldErrors.companyIntro}</p> : null}
        </div>

        <div className={formStyles.field}>
          <label className={formStyles.label}>Website công ty</label>
          <input
            className={formStyles.input}
            disabled={saving}
            value={form.website}
            onChange={(e) => onSetField("website", e.target.value)}
            placeholder="https://company.vn"
          />
          {fieldErrors.website ? <p className={formStyles.error}>{fieldErrors.website}</p> : null}
        </div>

        <h3 className={formStyles.sectionTitle} style={{ marginTop: 18 }}>Địa chỉ trụ sở chính</h3>
        <div className={formStyles.grid2}>
          <div className={formStyles.field}>
            <label className={formStyles.label}>Tỉnh thành</label>
            <select
              className={formStyles.select}
              disabled={saving || addrLoading.provinces}
              value={form.provinceCode}
              onChange={(e) => {
                const code = e.target.value;
                const opt = e.target.selectedOptions[0];
                const name = opt?.text || "";
                onSetField("provinceCode", code);
                onSetField("provinceName", code ? name : "");
                onSetField("wardCode", "");
                onSetField("wardName", "");
              }}
            >
              <option value="">{addrLoading.provinces ? "Đang tải…" : "Chọn tỉnh thành"}</option>
              {provinces.map((p) => (
                <option key={p.code} value={String(p.code)}>
                  {p.name}
                </option>
              ))}
            </select>
            {fieldErrors.provinceCode ? <p className={formStyles.error}>{fieldErrors.provinceCode}</p> : null}
          </div>
          <div className={formStyles.field}>
            <label className={formStyles.label}>Phường/xã</label>
            <select
              className={formStyles.select}
              disabled={saving || addrLoading.wards || !form.provinceCode}
              value={form.wardCode}
              onChange={(e) => {
                const code = e.target.value;
                const opt = e.target.selectedOptions[0];
                const name = opt?.text || "";
                onSetField("wardCode", code);
                onSetField("wardName", code ? name : "");
              }}
            >
              <option value="">{addrLoading.wards ? "Đang tải…" : "Chọn phường/xã"}</option>
              {wards.map((w) => (
                <option key={w.code} value={String(w.code)}>
                  {w.name}
                </option>
              ))}
            </select>
            {fieldErrors.wardCode ? <p className={formStyles.error}>{fieldErrors.wardCode}</p> : null}
          </div>
        </div>

        <div className={formStyles.field}>
          <label className={formStyles.label}>Địa chỉ chi tiết</label>
          <input
            className={formStyles.input}
            disabled={saving}
            value={form.addressDetail}
            onChange={(e) => onSetField("addressDetail", e.target.value)}
            placeholder="Số nhà, đường..."
          />
          {fieldErrors.addressDetail ? <p className={formStyles.error}>{fieldErrors.addressDetail}</p> : null}
        </div>

        <div className={formStyles.field}>
          <label className={formStyles.label}>Logo công ty (mới)</label>
          <input
            type="file"
            disabled={saving}
            accept=".png,.jpg,.jpeg,.webp,.gif"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              onSetLogoFile(f);
            }}
          />
          {logoError ? <p className={formStyles.error}>{logoError}</p> : null}
        </div>

        <div className={formStyles.section} style={{ marginTop: 18, display: "flex", gap: 10, alignItems: "center" }}>
          <button type="button" className={adminStyles.btn} onClick={onCancelEdit} disabled={saving}>
            Hủy
          </button>
          <button type="submit" className={`${adminStyles.btn} ${adminStyles.btnPrimary}`} disabled={saving}>
            {saving ? "Đang cập nhật…" : "Lưu thay đổi"}
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <table className={adminStyles.viewModalDetailTable}>
        <tbody>
          <tr>
            <th scope="row">Tên người đại diện</th>
            <td>{form.representativeName || "—"}</td>
          </tr>
          <tr>
            <th scope="row">Chức vụ</th>
            <td>{form.representativeTitle || "—"}</td>
          </tr>
          <tr>
            <th scope="row">Giới thiệu về doanh nghiệp</th>
            <td>{form.companyIntro || "—"}</td>
          </tr>
          <tr>
            <th scope="row">Website công ty</th>
            <td>{form.website || "—"}</td>
          </tr>
          <tr>
            <th scope="row">Địa chỉ trụ sở chính</th>
            <td>
              {[form.addressDetail, form.wardName, form.provinceName].filter((x) => String(x || "").trim()).join(", ") || "—"}
            </td>
          </tr>
        </tbody>
      </table>
      <div className={formStyles.section} style={{ marginTop: 18 }}>
        <button type="button" className={`${adminStyles.btn} ${adminStyles.btnPrimary}`} onClick={onStartEdit}>
          Sửa
        </button>
      </div>
    </>
  );
}
