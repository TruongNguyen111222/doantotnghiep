"use client";
 //component bảng phân công giảng viên hướng dẫn
import type { AssignmentItem } from "@/lib/types/admin-phan-cong-gvhd";
import {
  ADMIN_PHAN_CONG_GVHD_PAGE_SIZE,
  ADMIN_PHAN_CONG_GVHD_STATUS_LABEL
} from "@/lib/constants/admin-phan-cong-gvhd";

import { studentDisplay, supervisorDisplay } from "@/lib/utils/admin-phan-cong-gvhd-display"; //hàm hiển thị sinh viên và giảng viên hướng dẫn

import TableIconButton from "../../../components/TableIconButton";
import { FiEye, FiTrash2 } from "react-icons/fi";
import styles from "../../styles/dashboard.module.css";

export type Props = { //props bảng phân công giảng viên hướng dẫn
  paged: AssignmentItem[]; //danh sách phân công giảng viên hướng dẫn
  page: number; //trang hiện tại
  busyId: string | null; //id phân công giảng viên hướng dẫn đang xử lý
  onView: (item: AssignmentItem) => void; //hàm xem phân công giảng viên hướng dẫn
  onDelete: (item: AssignmentItem) => void; //hàm xóa phân công giảng viên hướng dẫn
};

export default function AdminPhanCongGVHDTable(props: Props) { //component bảng phân công giảng viên hướng dẫn
  const { paged, page, busyId, onView, onDelete } = props; //lấy props

  return (
    <div className={styles.tableWrap}>
      <table className={styles.dataTable}>
        <thead>
          <tr>
            <th>STT</th>
            <th>MSV-Họ tên-Bậc</th>
            <th>Bậc-Họ tên giảng viên hướng dẫn</th>
            <th>Khoa</th>
            <th>Trạng thái</th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {paged.length === 0 ? (
            <tr>
              <td colSpan={6} className={styles.modulePlaceholder}>
                Không có dữ liệu.
              </td>
            </tr>
          ) : (
            paged.map((it, idx) => (
              <tr key={it.id}>
                <td data-label="STT">
                  {(page - 1) * ADMIN_PHAN_CONG_GVHD_PAGE_SIZE + idx + 1}
                </td>
                <td data-label="MSV-Họ tên-Bậc">
                  {it.student?.msv ? studentDisplay(it.student as any) : "—"}
                </td>
                <td data-label="Bậc-Họ tên GVHD">{supervisorDisplay(it.supervisor as any)}</td>
                <td data-label="Khoa">{it.faculty}</td>
                <td data-label="Trạng thái">{ADMIN_PHAN_CONG_GVHD_STATUS_LABEL[it.status]}</td>
                <td data-label="Thao tác">
                  <div className={styles.rowActions} style={{ gap: 6 }}>
                    <TableIconButton label="Xem phân công" onClick={() => onView(it)} disabled={busyId !== null}>
                      <FiEye size={18} />
                    </TableIconButton>
                    <TableIconButton label="Xóa phân công" variant="danger" onClick={() => onDelete(it)} disabled={busyId === it.id}>
                      <FiTrash2 size={18} />
                    </TableIconButton>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
