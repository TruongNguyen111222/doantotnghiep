"use client";

import type { JobListItem } from "@/lib/types/admin-quan-ly-tin-tuyen-dung";
import {
  ADMIN_QUAN_LY_TIN_TUYEN_DUNG_PAGE_SIZE,
  statusLabel
} from "@/lib/constants/admin-quan-ly-tin-tuyen-dung";
import { formatDateVi } from "@/lib/utils/admin-quan-ly-tin-tuyen-dung";
import Pagination from "../../../components/Pagination";
import TableIconButton from "../../../components/TableIconButton";
import { FiCheckCircle, FiEye, FiTrash2 } from "react-icons/fi";
import styles from "../../styles/dashboard.module.css";
import { ChartStyleLoading } from "@/app/components/ChartStyleLoading";

type Props = { //type dữ liệu table việc làm
  loading: boolean; //trạng thái tải việc làm
  items: JobListItem[]; //danh sách việc làm
  page: number; //trang hiện tại
  busyId: string | null; //id việc làm đang xử lý
  onPageChange: (p: number) => void; //hàm thay đổi trang
  onView: (row: JobListItem) => void; //hàm xem chi tiết việc làm
  onStatus: (row: JobListItem) => void; //hàm duyệt việc làm
  onDelete: (row: JobListItem) => void; //hàm xóa việc làm
};

export default function AdminTinTuyenDungTableSection(props: Props) { //hàm tạo table việc làm
  const { loading, items, page, busyId, onPageChange, onView, onStatus, onDelete } = props; //lấy dữ liệu từ props

  if (loading && items.length === 0) return <ChartStyleLoading variant="compact" />; //hiển thị loading nếu đang tải việc làm và không có việc làm

  const pagedItems = items.slice(
    (page - 1) * ADMIN_QUAN_LY_TIN_TUYEN_DUNG_PAGE_SIZE,
    (page - 1) * ADMIN_QUAN_LY_TIN_TUYEN_DUNG_PAGE_SIZE + ADMIN_QUAN_LY_TIN_TUYEN_DUNG_PAGE_SIZE
  );

  return (
    <>
      <div className={styles.tableWrap}>
        <table className={styles.dataTable}>
          <thead>
            <tr>
              <th>STT</th>
              <th>Tiêu đề</th>
              <th>Tên doanh nghiệp</th>
              <th>Ngày đăng tin</th>
              <th>Đợt thực tập</th>
              <th>Trạng thái tin</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={7} className={styles.modulePlaceholder}>
                  Không có tin tuyển dụng phù hợp.
                </td>
              </tr>
            ) : (
              pagedItems.map((row, idx) => (
                <tr key={row.id}>
                  <td data-label="STT">{(page - 1) * ADMIN_QUAN_LY_TIN_TUYEN_DUNG_PAGE_SIZE + idx + 1}</td>
                  <td data-label="Tiêu đề">{row.title}</td>
                  <td data-label="Tên doanh nghiệp">{row.enterpriseName || "—"}</td>
                  <td data-label="Ngày đăng tin">{formatDateVi(row.createdAt)}</td>
                  <td data-label="Đợt thực tập">{row.batchName || "—"}</td>
                  <td data-label="Trạng thái tin">{statusLabel[row.status]}</td>
                  <td data-label="Thao tác">
                    <div className={styles.rowActions} style={{ gap: 6 }}>
                      <TableIconButton label="Xem chi tiết tin tuyển dụng" disabled={busyId !== null} onClick={() => onView(row)}>
                        <FiEye size={18} />
                      </TableIconButton>
                      <TableIconButton label="Duyệt tin tuyển dụng" disabled={busyId !== null} onClick={() => onStatus(row)}>
                        <FiCheckCircle size={18} />
                      </TableIconButton>
                      <TableIconButton label="Xóa tin tuyển dụng" variant="danger" disabled={busyId !== null} onClick={() => onDelete(row)}>
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
        pageSize={ADMIN_QUAN_LY_TIN_TUYEN_DUNG_PAGE_SIZE}
        totalItems={items.length}
        onPageChange={onPageChange}
        buttonClassName={styles.btn}
        activeButtonClassName={`${styles.btn} ${styles.btnPrimary}`}
      />
    </>
  );
}
