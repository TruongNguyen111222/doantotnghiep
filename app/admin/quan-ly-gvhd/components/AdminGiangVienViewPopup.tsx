"use client";

import type { SupervisorListItem } from "@/lib/types/admin-quan-ly-gvhd";
import {
  ADMIN_QUAN_LY_GVHD_DEGREE_LABEL,
  ADMIN_QUAN_LY_GVHD_EXTERNAL_TEACHER_LABEL,
  ADMIN_QUAN_LY_GVHD_GENDER_LABEL
} from "@/lib/constants/admin-quan-ly-gvhd";
import { toBirthDateInputValue } from "@/lib/utils/admin-quan-ly-gvhd-dates";

import MessagePopup from "../../../components/MessagePopup";
import styles from "../../styles/dashboard.module.css";

type Props = { //type props popup xem giảng viên
  open: boolean; //trạng thái popup
  item: SupervisorListItem | null; //dữ liệu giảng viên
  onClose: () => void; //hàm đóng popup
};

export default function AdminGiangVienViewPopup(props: Props) { //component popup xem giảng viên
  const { open, item, onClose } = props;
  if (!open || !item) return null;

  return ( //render component
    <MessagePopup open title="Xem thông tin giảng viên hướng dẫn" size="extraWide" onClose={onClose}>
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
            <td>{item.birthDate ? toBirthDateInputValue(item.birthDate) : "—"}</td>
          </tr>
          <tr>
            <th scope="row">Giới tính</th>
            <td>{ADMIN_QUAN_LY_GVHD_GENDER_LABEL[item.gender]}</td>
          </tr>
          <tr>
            <th scope="row">Địa chỉ thường trú</th>
            <td>{[item.permanentProvinceName, item.permanentWardName].filter(Boolean).join(" - ") || "—"}</td>
          </tr>
          <tr>
            <th scope="row">Khoa</th>
            <td>{item.faculty}</td>
          </tr>
          <tr>
            <th scope="row">Bậc</th>
            <td>{ADMIN_QUAN_LY_GVHD_DEGREE_LABEL[item.degree]}</td>
          </tr>
          <tr>
            <th scope="row">Loại giảng viên</th>
            <td>
              {item.isExternalTeacher
                ? ADMIN_QUAN_LY_GVHD_EXTERNAL_TEACHER_LABEL.external
                : ADMIN_QUAN_LY_GVHD_EXTERNAL_TEACHER_LABEL.internal}
            </td>
          </tr>
        </tbody>
      </table>
    </MessagePopup>
  );
}

