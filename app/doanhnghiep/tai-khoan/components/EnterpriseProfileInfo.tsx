"use client";
//component hiển thị thông tin doanh nghiệp
import type { AdminEnterpriseDetail } from "@/lib/types/admin"; //kiểu dữ liệu trả về từ API
import { downloadWithCredentials } from "@/lib/utils/client-download-blob"; //hàm xử lý tải file
import adminStyles from "../../../admin/styles/dashboard.module.css";

type Props = {
  me: AdminEnterpriseDetail; //thông tin doanh nghiệp
  address: string; //địa chỉ doanh nghiệp
  licName: string; //tên file giấy phép kinh doanh
  licHref: string | null; //link file giấy phép kinh doanh
  logoSrc: string | null; //link ảnh logo doanh nghiệp
  statusText: string; //trạng thái phê duyệt doanh nghiệp
  /** When true, email/phone rows are omitted (shown in edit form). */
  hideContactFields?: boolean;
};

export default function EnterpriseProfileInfo({ //hàm xử lý thông tin doanh nghiệp
  me,
  address,
  licName,
  licHref,
  logoSrc,
  statusText,
  hideContactFields = false
}: Props) {
  return ( //trả về giao diện hiển thị thông tin doanh nghiệp
    <table className={adminStyles.viewModalDetailTable} style={{ marginTop: 12 }}>
      <tbody>
        <tr>
          <th scope="row">Tên doanh nghiệp</th>
          <td>{me.companyName || "—"}</td>
        </tr>
        <tr>
          <th scope="row">Mã số thuế</th>
          <td>{me.taxCode || "—"}</td>
        </tr>
        <tr>
          <th scope="row">Địa chỉ trụ sở chính</th>
          <td>{address}</td>
        </tr>
        <tr>
          <th scope="row">File giấy phép kinh doanh</th>
          <td>
            {licHref ? (
              <a
                className={adminStyles.detailLink}
                href={licHref}
                rel="noreferrer"
                onClick={async (e) => {
                  e.preventDefault();
                  const fn = licName !== "—" ? licName : "giay-phep.pdf";
                  const r = await downloadWithCredentials(licHref, fn);
                  if (!r.ok) window.alert(r.message);
                }}
              >
                {licName}
              </a>
            ) : (
              licName
            )}
          </td>
        </tr>
        <tr>
          <th scope="row">Logo công ty</th>
          <td>{logoSrc ? <img src={logoSrc} alt="Logo công ty" className={adminStyles.previewLogo} /> : "—"}</td>
        </tr>
        {hideContactFields ? null : (
          <>
            <tr>
              <th scope="row">Email</th>
              <td>{me.email}</td>
            </tr>
            <tr>
              <th scope="row">Số điện thoại</th>
              <td>{me.phone || "—"}</td>
            </tr>
          </>
        )}
        <tr>
          <th scope="row">Trạng thái phê duyệt</th>
          <td>{statusText}</td>
        </tr>
      </tbody>
    </table>
  );
}
