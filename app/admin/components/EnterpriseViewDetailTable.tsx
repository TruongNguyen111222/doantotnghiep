 "use client";
//component giao diện hiển thị chi tiết doanh nghiệp trong modal “Xem chi tiết”.
import type { AdminEnterpriseDetail } from "@/lib/types/admin";
import { metaRecord } from "@/lib/utils/enterprise-meta"; //xử lý thông tin doanh nghiệp
import {
  buildEnterpriseHeadquartersAddress,
  dataUrlFromBase64,
  formatBusinessFields
} from "@/lib/utils/enterprise-admin-display"; //xử lý hiển thị cho quản lý doanh nghiệp. 
import { formatAdminEnterpriseStatusLine } from "@/lib/utils/admin-enterprise-display"; //xử lý hiển thị trạng thái doanh nghiệp
import { resolveRepresentativeTitle } from "@/lib/utils/enterprise-representative"; //xử lý hiển thị tên người đại diện
import {
  buildCloudinaryImageDeliveryUrl,
  enterpriseLicensePublicIdFromStored,
  fromCloudinaryRef
} from "@/lib/storage/cloudinary-public";
import { downloadWithCredentials } from "@/lib/utils/client-download-blob"; //xử lý tải file qua fetch (credentials) rồi blob — ổn định hơn `<a href>` với API có cookie / lỗi mạng.
import styles from "../styles/dashboard.module.css";

type Props = { item: AdminEnterpriseDetail }; //kiểu dữ liệu cho thành phần EnterpriseViewDetailTable

export function EnterpriseViewDetailTable({ item }: Props) { //hàm hiển thị thông tin doanh nghiệp
  const m = metaRecord(item.enterpriseMeta); //lấy metaRecord từ enterpriseMeta
  const fields = formatBusinessFields(item.enterpriseMeta); //lấy fields từ enterpriseMeta
  const address = buildEnterpriseHeadquartersAddress(item.enterpriseMeta); //lấy address từ enterpriseMeta
  const repName = typeof m.representativeName === "string" ? m.representativeName : item.fullName; //lấy representativeName từ metaRecord
  const titleDisplay = resolveRepresentativeTitle(item.representativeTitle, item.enterpriseMeta); //lấy titleDisplay từ metaRecord
  const licName = typeof m.businessLicenseName === "string" ? m.businessLicenseName : "—"; //lấy licName từ metaRecord
  const licB64 = typeof m.businessLicenseBase64 === "string" ? m.businessLicenseBase64 : null; //lấy licB64 từ metaRecord
  const logoMime = typeof m.companyLogoMime === "string" ? m.companyLogoMime : ""; //lấy logoMime từ metaRecord
  const logoB64 = typeof m.companyLogoBase64 === "string" ? m.companyLogoBase64 : null; //lấy logoB64 từ metaRecord
  const website = typeof m.website === "string" && m.website ? m.website : null; //lấy website từ metaRecord

  const licPublicId = enterpriseLicensePublicIdFromStored(typeof m.businessLicensePublicId === "string" ? m.businessLicensePublicId : null); //lấy licPublicId từ metaRecord
  const logoPublicId = fromCloudinaryRef(typeof m.companyLogoPublicId === "string" ? m.companyLogoPublicId : null); //lấy logoPublicId từ metaRecord
  const licHref = licB64 || licPublicId || (licName && licName !== "—") ? `/api/files/enterprise-business-license/${item.id}` : null; //lấy licHref từ metaRecord
  const logoFromCloud = logoPublicId ? buildCloudinaryImageDeliveryUrl(logoPublicId) : null; //lấy logoFromCloud từ metaRecord
  const logoSrc =
    logoFromCloud ??
    (logoB64 && logoMime.startsWith("image/") ? dataUrlFromBase64(logoMime, logoB64) : null); //lấy logoSrc từ metaRecord

  const statusLine = formatAdminEnterpriseStatusLine(item.enterpriseStatus); //lấy statusLine từ item

  return (//trả về giao diện hiển thị thông tin doanh nghiệp
    <div className={styles.viewModalDetailTableWrap}>
      <table className={styles.viewModalDetailTable}>
        <thead>
          <tr>
            <th scope="col">Trường thông tin</th>
            <th scope="col">Nội dung</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Tên doanh nghiệp</th>
            <td>{item.companyName || "—"}</td>
          </tr>
          <tr>
            <th scope="row">Mã số thuế</th>
            <td>{item.taxCode || "—"}</td>
          </tr>
          <tr>
            <th scope="row">Lĩnh vực hoạt động</th>
            <td>{fields}</td>
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
                  className={styles.detailLink}
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
            <th scope="row">Image logo</th>
            <td>{logoSrc ? <img className={styles.previewLogo} src={logoSrc} alt="Logo công ty" /> : "—"}</td>
          </tr>
          <tr>
            <th scope="row">Website</th>
            <td>
              {website ? (
                <a href={website} target="_blank" rel="noopener noreferrer">
                  {website}
                </a>
              ) : (
                "—"
              )}
            </td>
          </tr>
          <tr>
            <th scope="row">Người đại diện</th>
            <td>{repName || "—"}</td>
          </tr>
          <tr>
            <th scope="row">Chức vụ</th>
            <td>{titleDisplay}</td>
          </tr>
          <tr>
            <th scope="row">Số điện thoại</th>
            <td>{item.phone || "—"}</td>
          </tr>
          <tr>
            <th scope="row">Email</th>
            <td>{item.email}</td>
          </tr>
          <tr>
            <th scope="row">Trạng thái phê duyệt</th>
            <td>{statusLine}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
