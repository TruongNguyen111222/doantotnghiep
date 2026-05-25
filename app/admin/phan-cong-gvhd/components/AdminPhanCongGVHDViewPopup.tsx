"use client";
//component xem chi tiết phân công giảng viên hướng dẫn
import type { AssignmentItem } from "@/lib/types/admin-phan-cong-gvhd";
import { ADMIN_PHAN_CONG_GVHD_STATUS_LABEL } from "@/lib/constants/admin-phan-cong-gvhd";
import { studentDisplay, supervisorDisplay } from "@/lib/utils/admin-phan-cong-gvhd-display";

import MessagePopup from "../../../components/MessagePopup";

import styles from "../../styles/dashboard.module.css";

type Props = { //props component xem phân công giảng viên hướng dẫn
  viewTarget: AssignmentItem | null;
  onClose: () => void;
};

export default function AdminPhanCongGVHDViewPopup(props: Props) { //component xem chi tiết phân công giảng viên hướng dẫn
  const { viewTarget, onClose } = props; //lấy props

  if (!viewTarget) return null; //nếu không có phân công giảng viên hướng dẫn thì không hiển thị

  return ( //render component
    <MessagePopup
      open
      title="Xem phân công"
      size="extraWide"
      onClose={onClose}
      actions={
        <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={onClose}>
          Đóng
        </button>
      }
    >
      <table className={styles.viewModalDetailTable}>
        <tbody>
          <tr>
            <th scope="row">Khoa</th>
            <td>{viewTarget.faculty}</td>
          </tr>
          <tr>
            <th scope="row">Đợt thực tập</th>
            <td>{viewTarget.batch?.name || "—"}</td>
          </tr>
          <tr>
            <th scope="row">Giảng viên hướng dẫn</th>
            <td>{supervisorDisplay(viewTarget.supervisor as any) || "—"}</td>
          </tr>
          <tr>
            <th scope="row">Trạng thái hướng dẫn</th>
            <td>{ADMIN_PHAN_CONG_GVHD_STATUS_LABEL[viewTarget.status]}</td>
          </tr>
          <tr>
            <th scope="row">SV hướng dẫn</th>
            <td>
              {viewTarget.student?.msv ? studentDisplay(viewTarget.student as any) : "—"}
            </td>
          </tr>
          <tr>
            <th scope="row">Ghi chú</th>
            <td style={{ color: "#667085" }}>
              Trạng thái thực tập của sinh viên xem chi tiết trong module Quản lý sinh viên.
            </td>
          </tr>
        </tbody>
      </table>
    </MessagePopup>
  );
}

