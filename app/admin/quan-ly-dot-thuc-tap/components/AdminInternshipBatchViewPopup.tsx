"use client";

import type { InternshipBatchRow } from "@/lib/types/admin-quan-ly-dot-thuc-tap"; //kiểu dữ liệu đợt thực tập
import {
  ADMIN_QUAN_LY_DOT_THUC_TAP_SEMESTER_OPTIONS,
  ADMIN_QUAN_LY_DOT_THUC_TAP_STATUS_LABEL
} from "@/lib/constants/admin-quan-ly-dot-thuc-tap"; //hằng số thiết lập cho đợt thực tập
import { formatDateVi } from "@/lib/utils/admin-quan-ly-dot-thuc-tap-dates"; //hàm tiện ích cho đợt thực tập

import MessagePopup from "../../../components/MessagePopup"; //popup thông báo
import styles from "../../styles/dashboard.module.css";

type Props = { //props cho popup xem đợt thực tập , nhạn dữ liệu vào để hiển thị và báo ngược lại cho component cha xử lý
  viewTarget: InternshipBatchRow | null; //đợt thực tập cần xem
  onClose: () => void; //hàm đóng popup
};

export default function AdminInternshipBatchViewPopup(props: Props) { //render popup xem đợt thực tập
  const { viewTarget, onClose } = props; //dữ liệu popup xem đợt thực tập
  if (!viewTarget) return null; //nếu không có đợt thực tập

  return ( //render popup xem đợt thực tập
    <MessagePopup open title="Xem thông tin đợt thực tập" size="wide" onClose={onClose}>
      <table className={styles.viewModalDetailTable}>
        <tbody>
          <tr>
            <th scope="row">Tên đợt thực tập</th>
            <td>{viewTarget.name}</td>
          </tr>
          <tr>
            <th scope="row">Học kỳ</th>
            <td>
              {ADMIN_QUAN_LY_DOT_THUC_TAP_SEMESTER_OPTIONS.find((s) => s.value === viewTarget.semester)?.label ??
                viewTarget.semester}
            </td>
          </tr>
          <tr>
            <th scope="row">Năm học</th>
            <td>{viewTarget.schoolYear}</td>
          </tr>
          <tr>
            <th scope="row">Thời gian bắt đầu</th>
            <td>{formatDateVi(viewTarget.startDate)}</td>
          </tr>
          <tr>
            <th scope="row">Thời gian kết thúc</th>
            <td>{formatDateVi(viewTarget.endDate)}</td>
          </tr>
          <tr>
            <th scope="row">Trạng thái</th>
            <td>{ADMIN_QUAN_LY_DOT_THUC_TAP_STATUS_LABEL[viewTarget.status]}</td>
          </tr>
          <tr>
            <th scope="row">Ghi chú</th>
            <td>{viewTarget.notes || "—"}</td>
          </tr>
        </tbody>
      </table>
    </MessagePopup>
  );
}

