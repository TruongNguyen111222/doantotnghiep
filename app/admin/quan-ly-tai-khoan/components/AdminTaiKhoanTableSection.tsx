"use client";
//bảng hiển thị danh sách tài khoản kèm các nút chức năng (xem chi tiết, 
// sửa trạng thái, xóa) và thanh phân trang ở phía dưới.
import type { AccountRow } from "@/lib/types/admin-quan-ly-tai-khoan"; //type tài khoản
import {
  ADMIN_QUAN_LY_TAI_KHOAN_PAGE_SIZE,
  roleLabel,
  statusLabel
} from "@/lib/constants/admin-quan-ly-tai-khoan"; //hằng số tài khoản
import Pagination from "../../../components/Pagination"; //component phân trang
import TableIconButton from "../../../components/TableIconButton"; //component nút icon 
import { FiEye, FiSliders, FiTrash2 } from "react-icons/fi"; //icon
import styles from "../../styles/dashboard.module.css"; //style
import { ChartStyleLoading } from "@/app/components/ChartStyleLoading"; //component loading

type Props = { //props bảng tài khoản
  loading: boolean;
  items: AccountRow[];
  totalItems: number;
  page: number;
  busyId: string | null;
  onPageChange: (p: number) => void;
  onView: (row: AccountRow) => void;
  onStatus: (row: AccountRow) => void;
  onDelete: (row: AccountRow) => void;
};

export default function AdminTaiKhoanTableSection(props: Props) { //hàm hiển thị bảng tài khoản
  const { loading, items, totalItems, page, busyId, onPageChange, onView, onStatus, onDelete } = props;

  if (loading && items.length === 0) return <ChartStyleLoading variant="compact" />;

  return (
    <>
      <div className={styles.tableWrap}>
        <table className={styles.dataTable}>
          <thead>
            <tr>
              <th>STT</th>
              <th>Họ tên</th>
              <th>Email</th>
              <th>SĐT</th>
              <th>Phân quyền</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={7} className={styles.modulePlaceholder}>
                  Không có tài khoản phù hợp.
                </td>
              </tr>
            ) : (
              items.map((row, idx) => (
                <tr key={row.id}>
                  <td data-label="STT">{(page - 1) * ADMIN_QUAN_LY_TAI_KHOAN_PAGE_SIZE + idx + 1}</td>
                  <td data-label="Họ tên">{row.fullName}</td>
                  <td data-label="Email">{row.email}</td>
                  <td data-label="SĐT">{row.phone ?? "—"}</td>
                  <td data-label="Phân quyền">{roleLabel[row.role]}</td>
                  <td data-label="Trạng thái">{statusLabel[row.status]}</td>
                  <td data-label="Thao tác">
                    <div className={styles.rowActions} style={{ gap: 6 }}>
                      <TableIconButton label="Xem chi tiết tài khoản" disabled={busyId !== null} onClick={() => onView(row)}>
                        <FiEye size={18} />
                      </TableIconButton>
                      <TableIconButton label="Sửa trạng thái tài khoản" disabled={busyId !== null} onClick={() => onStatus(row)}>
                        <FiSliders size={18} />
                      </TableIconButton>
                      <TableIconButton label="Xóa tài khoản" variant="danger" disabled={busyId !== null} onClick={() => onDelete(row)}>
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
        pageSize={ADMIN_QUAN_LY_TAI_KHOAN_PAGE_SIZE}
        totalItems={totalItems}
        onPageChange={onPageChange}
        buttonClassName={styles.btn}
        activeButtonClassName={`${styles.btn} ${styles.btnPrimary}`}
      />
    </>
  );
}
