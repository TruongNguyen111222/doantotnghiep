"use client";
//render bảng doanh nghiệp
import type { AdminEnterpriseListItem } from "@/lib/types/admin";
import { ADMIN_QUAN_LY_DOANH_NGHIEP_PAGE_SIZE } from "@/lib/constants/admin-quan-ly-doanh-nghiep"; //lấy số lượng doanh nghiệp trên mỗi trang
import { EnterpriseStatusCell } from "../../components/EnterpriseStatusCell"; //hiển thị trạng thái doanh nghiệp trong bảng / modal (có hậu tố khi đã phê duyệt).
import TableIconButton from "../../../components/TableIconButton"; //component nút icon dùng chung cho bảng
import { FiEye, FiRefreshCw, FiTrash2 } from "react-icons/fi";
//icon nút icon dùng chung cho bảng
import styles from "../../styles/dashboard.module.css";

type Props = { //kiểu dữ liệu cho bảng
  items: AdminEnterpriseListItem[];
  page: number; //số trang hiện tại
  busyId: string | null; //id doanh nghiệp đang xử lý
  onView: (row: AdminEnterpriseListItem) => void; //hàm xem chi tiết doanh nghiệp
  onDelete: (row: AdminEnterpriseListItem) => void; //hàm xóa doanh nghiệp
  onOpenStatus: (row: AdminEnterpriseListItem) => void; //hàm mở trạng thái doanh nghiệp
};

export default function AdminEnterpriseTable(props: Props) { //hàm render bảng doanh nghiệp
  const { items, page, busyId, onView, onDelete, onOpenStatus } = props; //lấy dữ liệu từ props

  const pagedItems = items.slice( //lấy dữ liệu cho trang hiện tại
    (page - 1) * ADMIN_QUAN_LY_DOANH_NGHIEP_PAGE_SIZE,
    (page - 1) * ADMIN_QUAN_LY_DOANH_NGHIEP_PAGE_SIZE + ADMIN_QUAN_LY_DOANH_NGHIEP_PAGE_SIZE
  );

  return ( //hiển thị bảng doanh nghiệp
    <div className={styles.tableWrap}>
      <table className={styles.dataTable}>
        <thead>
          <tr>
            <th>STT</th>
            <th>Tên doanh nghiệp</th>
            <th>Mã số thuế</th>
            <th>Trạng thái</th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? ( //nếu không có doanh nghiệp thì hiển thị thông báo
            <tr>
              <td colSpan={5} className={styles.modulePlaceholder}>
                Không có doanh nghiệp phù hợp.
              </td>
            </tr>
          ) : (
            pagedItems.map((row, idx) => ( //hiển thị doanh nghiệp
              <tr key={row.id}>
                <td data-label="STT">{(page - 1) * ADMIN_QUAN_LY_DOANH_NGHIEP_PAGE_SIZE + idx + 1}</td>
                <td data-label="Tên doanh nghiệp">{row.companyName || "—"}</td>
                <td data-label="MST">{row.taxCode || "—"}</td>
                <td data-label="Trạng thái"> 
                  <EnterpriseStatusCell status={row.enterpriseStatus} isLocked={row.isLocked} /> 
                </td>
                <td data-label="Thao tác">
                  <div className={styles.rowActions} style={{ gap: 6 }}>
                    <TableIconButton label="Xem chi tiết" disabled={busyId !== null} onClick={() => onView(row)}>
                      <FiEye size={18} />
                    </TableIconButton>
                    <TableIconButton label="Cập nhật trạng thái phê duyệt" disabled={busyId !== null} onClick={() => onOpenStatus(row)}>
                      <FiRefreshCw size={18} />
                    </TableIconButton>
                    <TableIconButton label="Xóa doanh nghiệp" variant="danger" disabled={busyId !== null} onClick={() => onDelete(row)}>
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

