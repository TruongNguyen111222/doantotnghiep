"use client";
//component table sinh viên hiển thị danh sách sinh viên và các nút chức năng (xem chi tiết, sửa, xóa)
import type { StudentListItem } from "@/lib/types/admin-quan-ly-sinh-vien";
import {
  ADMIN_QUAN_LY_SINH_VIEN_DEGREE_LABEL,
  ADMIN_QUAN_LY_SINH_VIEN_INTERNSHIP_STATUS_LABEL,
  ADMIN_QUAN_LY_SINH_VIEN_PAGE_SIZE
} from "@/lib/constants/admin-quan-ly-sinh-vien";
import Pagination from "../../../components/Pagination";
import TableIconButton from "../../../components/TableIconButton";
import { FiEdit2, FiEye, FiTrash2 } from "react-icons/fi";
import styles from "../../styles/dashboard.module.css";
import { ChartStyleLoading } from "@/app/components/ChartStyleLoading";

type Props = {
  loading: boolean;
  items: StudentListItem[];
  totalItems: number;
  page: number;
  busyId: string | null;
  onPageChange: (p: number) => void;
  onView: (row: StudentListItem) => void;
  onEdit: (row: StudentListItem) => void;
  onDelete: (row: StudentListItem) => void;
};

export default function AdminSinhVienTableSection(props: Props) {
  const { loading, items, totalItems, page, busyId, onPageChange, onView, onEdit, onDelete } = props;

  if (loading && items.length === 0) return <ChartStyleLoading variant="compact" />;

  return (
    <>
      <div className={styles.tableWrap}>
        <table className={styles.dataTable}>
          <thead>
            <tr>
              <th>STT</th>
              <th>MSV</th>
              <th>Họ tên</th>
              <th>Lớp</th>
              <th>Khoa</th>
              <th>Bậc</th>
              <th>Trạng thái GVHD</th>
              <th>Trạng thái thực tập</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={9} className={styles.modulePlaceholder}>
                  Không có sinh viên phù hợp.
                </td>
              </tr>
            ) : (
              items.map((row, idx) => (
                <tr key={row.id}>
                  <td data-label="STT">{(page - 1) * ADMIN_QUAN_LY_SINH_VIEN_PAGE_SIZE + idx + 1}</td>
                  <td data-label="MSV">{row.msv}</td>
                  <td data-label="Họ tên">{row.fullName}</td>
                  <td data-label="Lớp">{row.className}</td>
                  <td data-label="Khoa">{row.faculty}</td>
                  <td data-label="Bậc">{ADMIN_QUAN_LY_SINH_VIEN_DEGREE_LABEL[row.degree]}</td>
                  <td data-label="Trạng thái GVHD">{row.hasSupervisor ? "Đã có GVHD" : "Chưa có GVHD"}</td>
                  <td data-label="Trạng thái thực tập">
                    {ADMIN_QUAN_LY_SINH_VIEN_INTERNSHIP_STATUS_LABEL[row.internshipStatus]}
                  </td>
                  <td data-label="Thao tác">
                    <div className={styles.rowActions} style={{ gap: 6 }}>
                      <TableIconButton label="Xem chi tiết" disabled={busyId !== null} onClick={() => onView(row)}>
                        <FiEye size={18} />
                      </TableIconButton>
                      <TableIconButton label="Sửa sinh viên" disabled={busyId !== null} onClick={() => onEdit(row)}>
                        <FiEdit2 size={18} />
                      </TableIconButton>
                      <TableIconButton label="Xóa sinh viên" variant="danger" disabled={busyId !== null} onClick={() => onDelete(row)}>
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
        pageSize={ADMIN_QUAN_LY_SINH_VIEN_PAGE_SIZE}
        totalItems={totalItems}
        onPageChange={onPageChange}
        buttonClassName={styles.btn}
        activeButtonClassName={`${styles.btn} ${styles.btnPrimary}`}
      />
    </>
  );
}
