"use client";
//popup xem thông tin tài khoản sinh viên, giảng viên hoặc doanh nghiệp
import type { AccountStatus, Role } from "@/lib/types/admin-quan-ly-tai-khoan";
import type { Gender, StudentDegree, SupervisorDegree } from "@/lib/constants/admin-quan-ly-tai-khoan"; //type bậc sinh viên, giảng viên và giới tính
import {
  genderLabel,
  roleLabel,
  statusLabel,
  studentDegreeLabel,
  supervisorDegreeLabel
} from "@/lib/constants/admin-quan-ly-tai-khoan"; //hằng số bậc sinh viên, giảng viên và giới tính
import { getAccountViewTitle } from "@/lib/utils/admin-quan-ly-tai-khoan"; //hàm lấy tiêu đề popup xem tài khoản
import MessagePopup from "../../../components/MessagePopup"; //component popup
import styles from "../../styles/dashboard.module.css"; //style

type Props = { //props popup xem tài khoản
  item: any | null;
  onClose: () => void;
};

function ViewBody({ item }: { item: any }) {
  const r = item.role as Role;

  if (r === "sinhvien") {
    return (
      <table className={styles.viewModalDetailTable}>
        <tbody>
          <tr>
            <th scope="row">Mã sinh viên</th>
            <td>{item.msv ?? "—"}</td>
          </tr>
          <tr>
            <th scope="row">Họ tên</th>
            <td>{item.fullName}</td>
          </tr>
          <tr>
            <th scope="row">Số điện thoại</th>
            <td>{item.phone ?? "—"}</td>
          </tr>
          <tr>
            <th scope="row">Email</th>
            <td>{item.email}</td>
          </tr>
          <tr>
            <th scope="row">Ngày sinh</th>
            <td>{item.birthDate ? String(item.birthDate).slice(0, 10) : "—"}</td>
          </tr>
          <tr>
            <th scope="row">Giới tính</th>
            <td>{item.gender ? genderLabel[item.gender as Gender] ?? "—" : "—"}</td>
          </tr>
          <tr>
            <th scope="row">Địa chỉ thường trú</th>
            <td>{item.permanentAddress ?? "—"}</td>
          </tr>
          <tr>
            <th scope="row">Lớp</th>
            <td>{item.className ?? "—"}</td>
          </tr>
          <tr>
            <th scope="row">Khoa</th>
            <td>{item.faculty ?? "—"}</td>
          </tr>
          <tr>
            <th scope="row">Khóa</th>
            <td>{item.cohort ?? "—"}</td>
          </tr>
          <tr>
            <th scope="row">Bậc</th>
            <td>{item.degree ? studentDegreeLabel[item.degree as StudentDegree] ?? "—" : "—"}</td>
          </tr>
          <tr>
            <th scope="row">Trạng thái</th>
            <td>{statusLabel[item.status as AccountStatus] ?? "—"}</td>
          </tr>
        </tbody>
      </table>
    );
  }

  if (r === "giangvien") {
    return (
      <table className={styles.viewModalDetailTable}>
        <tbody>
          <tr>
            <th scope="row">Họ tên</th>
            <td>{item.fullName}</td>
          </tr>
          <tr>
            <th scope="row">Số điện thoại</th>
            <td>{item.phone ?? "—"}</td>
          </tr>
          <tr>
            <th scope="row">Email</th>
            <td>{item.email}</td>
          </tr>
          <tr>
            <th scope="row">Ngày sinh</th>
            <td>{item.birthDate ? String(item.birthDate).slice(0, 10) : "—"}</td>
          </tr>
          <tr>
            <th scope="row">Giới tính</th>
            <td>{item.gender ? genderLabel[item.gender as Gender] ?? "—" : "—"}</td>
          </tr>
          <tr>
            <th scope="row">Địa chỉ thường trú</th>
            <td>{item.permanentAddress ?? "—"}</td>
          </tr>
          <tr>
            <th scope="row">Khoa</th>
            <td>{item.faculty ?? "—"}</td>
          </tr>
          <tr>
            <th scope="row">Bậc</th>
            <td>{item.degree ? supervisorDegreeLabel[item.degree as SupervisorDegree] ?? "—" : "—"}</td>
          </tr>
          <tr>
            <th scope="row">Trạng thái</th>
            <td>{statusLabel[item.status as AccountStatus] ?? "—"}</td>
          </tr>
        </tbody>
      </table>
    );
  }

  return (
    <table className={styles.viewModalDetailTable}>
      <tbody>
        <tr>
          <th scope="row">Tên doanh nghiệp</th>
          <td>{item.companyName ?? item.fullName ?? "—"}</td>
        </tr>
        <tr>
          <th scope="row">Mã số thuế</th>
          <td>{item.taxCode ?? "—"}</td>
        </tr>
        <tr>
          <th scope="row">Email</th>
          <td>{item.email}</td>
        </tr>
        <tr>
          <th scope="row">SĐT</th>
          <td>{item.phone ?? "—"}</td>
        </tr>
        <tr>
          <th scope="row">Lĩnh vực hoạt động</th>
          <td>{item.businessFields ?? "—"}</td>
        </tr>
        <tr>
          <th scope="row">Địa chỉ trụ sở chính</th>
          <td>{item.address ?? "—"}</td>
        </tr>
        <tr>
          <th scope="row">Website</th>
          <td>{item.website ?? "—"}</td>
        </tr>
        <tr>
          <th scope="row">Giới thiệu</th>
          <td>{item.intro ?? "—"}</td>
        </tr>
        <tr>
          <th scope="row">Trạng thái</th>
          <td>{statusLabel[item.status as AccountStatus] ?? "—"}</td>
        </tr>
      </tbody>
    </table>
  );
}

export default function AdminTaiKhoanViewPopup(props: Props) {
  const { item, onClose } = props;
  if (!item) return null;

  const title = getAccountViewTitle(item.role as Role);

  return (
    <MessagePopup open title={title} size="extraWide" onClose={onClose}>
      <ViewBody item={item} />
    </MessagePopup>
  );
}
