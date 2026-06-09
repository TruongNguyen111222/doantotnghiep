"use client";

import type { SupervisorListItem } from "@/lib/types/admin-quan-ly-gvhd";
import {
  ADMIN_QUAN_LY_GVHD_DEGREE_LABEL,
  ADMIN_QUAN_LY_GVHD_EXTERNAL_TEACHER_LABEL,
  ADMIN_QUAN_LY_GVHD_PAGE_SIZE
} from "@/lib/constants/admin-quan-ly-gvhd";

import Pagination from "../../../components/Pagination"; //component phân trang
import TableIconButton from "../../../components/TableIconButton";
import { FiEdit2, FiEye, FiTrash2 } from "react-icons/fi";
import styles from "../../styles/dashboard.module.css";
import { ChartStyleLoading } from "@/app/components/ChartStyleLoading"; //component loading

type Props = {
  loading: boolean;
  items: SupervisorListItem[];
  totalItems: number;
  page: number;
  busyId: string | null;
  onPageChange: (p: number) => void;
  onView: (row: SupervisorListItem) => void;
  onEdit: (row: SupervisorListItem) => void;
  onDelete: (row: SupervisorListItem) => void;
};

export default function AdminGiangVienTableSection(props: Props) {
  const { loading, items, totalItems, page, busyId, onPageChange, onView, onEdit, onDelete } = props;

  if (loading && items.length === 0) return <ChartStyleLoading variant="compact" />;

  return (
    <>
      <div className={styles.tableWrap}>
        <table className={styles.dataTable}>
          <thead>
            <tr>
              <th>STT</th>
              <th>Họ tên</th>
              <th>Số điện thoại</th>
              <th>Email</th>
              <th>Khoa</th>
              <th>Bậc</th>
              <th>Loại giảng viên</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={8} className={styles.modulePlaceholder}>
                  Không có GVHD phù hợp.
                </td>
              </tr>
            ) : (
              items.map((row, idx) => (
                <tr key={row.id}>
                  <td data-label="STT">{(page - 1) * ADMIN_QUAN_LY_GVHD_PAGE_SIZE + idx + 1}</td>
                  <td data-label="Họ tên">{row.fullName}</td>
                  <td data-label="Số điện thoại">{row.phone ?? "—"}</td>
                  <td data-label="Email">{row.email}</td>
                  <td data-label="Khoa">{row.faculty}</td>
                  <td data-label="Bậc">{ADMIN_QUAN_LY_GVHD_DEGREE_LABEL[row.degree]}</td>
                  <td data-label="Loại giảng viên">
                    {row.isExternalTeacher
                      ? ADMIN_QUAN_LY_GVHD_EXTERNAL_TEACHER_LABEL.external
                      : ADMIN_QUAN_LY_GVHD_EXTERNAL_TEACHER_LABEL.internal}
                  </td>
                  <td data-label="Thao tác">
                    <div className={styles.rowActions} style={{ gap: 6 }}>
                      <TableIconButton label="Xem chi tiết" disabled={busyId !== null} onClick={() => onView(row)}>
                        <FiEye size={18} />
                      </TableIconButton>
                      <TableIconButton label="Sửa giảng viên" disabled={busyId !== null} onClick={() => onEdit(row)}>
                        <FiEdit2 size={18} />
                      </TableIconButton>
                      <TableIconButton label="Xóa giảng viên" variant="danger" disabled={busyId !== null} onClick={() => onDelete(row)}>
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

      <Pagination
        page={page}
        pageSize={ADMIN_QUAN_LY_GVHD_PAGE_SIZE}
        totalItems={totalItems}
        onPageChange={onPageChange}
        buttonClassName={styles.btn}
        activeButtonClassName={`${styles.btn} ${styles.btnPrimary}`}
      />
    </>
  );
}

