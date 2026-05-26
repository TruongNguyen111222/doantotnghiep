import type { SinhVienHoSoProfile, Province, Ward } from "@/lib/types/sinhvien-ho-so";
import adminStyles from "../../../admin/styles/dashboard.module.css";
import formStyles from "../../../auth/styles/register.module.css";
import { openFilePreviewWithCredentials } from "@/lib/utils/client-download-blob";

async function openStudentCvPreview() {
  const result = await openFilePreviewWithCredentials("/api/files/sinhvien/cv");
  if (!result.ok) window.alert(result.message);
}

type Props = {
  isEditing: boolean;
  saving: boolean;
  profile: SinhVienHoSoProfile | null;
  phone: string;
  email: string;
  currentProvinceCode: string;
  currentWardCode: string;
  intro: string;
  cvFileName: string | null;
  cvMime: string | null;
  provinces: Province[];
  wards: Ward[];
  wardLoading: boolean;
  fieldErrors: Record<string, string>;
  onPhoneChange: (v: string) => void;
  onEmailChange: (v: string) => void;
  onProvinceCodeChange: (v: string) => void;
  onWardCodeChange: (v: string) => void;
  onIntroChange: (v: string) => void;
  onPickCv: (file: File | null) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
};

export default function SinhVienProfileEditSection({
  isEditing,
  saving,
  profile,
  phone,
  email,
  currentProvinceCode,
  currentWardCode,
  intro,
  cvFileName,
  cvMime,
  provinces,
  wards,
  wardLoading,
  fieldErrors,
  onPhoneChange,
  onEmailChange,
  onProvinceCodeChange,
  onWardCodeChange,
  onIntroChange,
  onPickCv,
  onStartEdit,
  onCancelEdit
}: Props) {
  if (isEditing) {
    return (
      <>
        <div className={formStyles.grid2} style={{ marginTop: 8 }}>
          <div className={formStyles.field}>
            <label className={formStyles.label}>SĐT</label>
            <input
              className={formStyles.input}
              value={phone}
              onChange={(e) => onPhoneChange(e.target.value.replace(/\D/g, "").slice(0, 12))}
              placeholder="Nhập số điện thoại"
              disabled={saving}
            />
            {fieldErrors.phone ? <p className={formStyles.error}>{fieldErrors.phone}</p> : null}
          </div>
          <div className={formStyles.field}>
            <label className={formStyles.label}>Email</label>
            <input
              className={formStyles.input}
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              placeholder="Nhập email"
              disabled={saving}
            />
            {fieldErrors.email ? <p className={formStyles.error}>{fieldErrors.email}</p> : null}
          </div>
        </div>

        <div className={formStyles.grid2}>
          <div className={formStyles.field}>
            <label className={formStyles.label}>Địa chỉ hiện tại - Tỉnh/Thành</label>
            <select
              className={formStyles.select}
              value={currentProvinceCode}
              onChange={(e) => onProvinceCodeChange(e.target.value)}
              disabled={saving}
            >
              <option value="">Chọn tỉnh/thành</option>
              {provinces.map((p) => (
                <option key={p.code} value={String(p.code)}>{p.name}</option>
              ))}
            </select>
            {fieldErrors.currentProvinceCode ? <p className={formStyles.error}>{fieldErrors.currentProvinceCode}</p> : null}
          </div>
          <div className={formStyles.field}>
            <label className={formStyles.label}>Địa chỉ hiện tại - Phường/Xã</label>
            <select
              className={formStyles.select}
              value={currentWardCode}
              onChange={(e) => onWardCodeChange(e.target.value)}
              disabled={!currentProvinceCode || wardLoading || saving}
            >
              <option value="">
                {wardLoading ? "Đang tải…" : !currentProvinceCode ? "Chọn tỉnh trước" : "Chọn phường/xã"}
              </option>
              {wards.map((w) => (
                <option key={w.code} value={String(w.code)}>{w.name}</option>
              ))}
            </select>
            {fieldErrors.currentWardCode ? <p className={formStyles.error}>{fieldErrors.currentWardCode}</p> : null}
          </div>
        </div>

        <div className={formStyles.field}>
          <label className={formStyles.label}>Thư giới thiệu bản thân</label>
          <textarea
            className={formStyles.input}
            style={{ minHeight: 120, resize: "vertical", paddingTop: 10, paddingBottom: 10 }}
            value={intro}
            onChange={(e) => onIntroChange(e.target.value)}
            placeholder="Nhập thư giới thiệu bản thân"
            rows={5}
            disabled={saving}
          />
          {fieldErrors.intro ? <p className={formStyles.error}>{fieldErrors.intro}</p> : null}
        </div>

        <div className={formStyles.field}>
          <label className={formStyles.label}>File CV đính kèm (.doc, .docx, .pdf)</label>
          <input
            className={formStyles.input}
            type="file"
            accept=".doc,.docx,.pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf"
            onChange={(e) => onPickCv(e.target.files?.[0] || null)}
            disabled={saving}
          />
          {cvFileName ? (
            <p style={{ marginTop: 6, fontSize: 13, color: "#475467" }}>
              Đã chọn:{" "}
              {cvFileName}
            </p>
          ) : null}
          {fieldErrors.cv ? <p className={formStyles.error}>{fieldErrors.cv}</p> : null}
        </div>

        <div className={formStyles.section} style={{ marginTop: 18, display: "flex", gap: 10, alignItems: "center" }}>
          <button type="button" className={adminStyles.btn} onClick={onCancelEdit} disabled={saving}>
            Hủy
          </button>
          <button type="submit" className={`${adminStyles.btn} ${adminStyles.btnPrimary}`} disabled={saving}>
            {saving ? "Đang cập nhật…" : "Cập nhật"}
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <table className={adminStyles.viewModalDetailTable} style={{ marginTop: 8 }}>
        <tbody>
          <tr>
            <th scope="row">SĐT</th>
            <td>{phone || "—"}</td>
          </tr>
          <tr>
            <th scope="row">Email</th>
            <td>{email || "—"}</td>
          </tr>
          <tr>
            <th scope="row">Địa chỉ hiện tại</th>
            <td>{[profile?.currentProvinceName, profile?.currentWardName].filter(Boolean).join(" - ") || "—"}</td>
          </tr>
          <tr>
            <th scope="row">Thư giới thiệu bản thân</th>
            <td style={{ whiteSpace: "pre-wrap" }}>{intro || "—"}</td>
          </tr>
          <tr>
            <th scope="row">File CV đính kèm</th>
            <td>
              {cvFileName ? (
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button type="button" className={adminStyles.textLinkBtn} onClick={() => void openStudentCvPreview()}>
                    Xem CV
                  </button>
                  <a className={adminStyles.detailLink} href="/api/files/sinhvien/cv?download=1">
                    Tải CV
                  </a>
                </div>
              ) : (
                "—"
              )}
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
