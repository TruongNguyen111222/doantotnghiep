"use client";

import type { InternshipBatchRow } from "@/lib/types/admin-quan-ly-dot-thuc-tap"; //kiểu dữ liệu đợt thực tập
import {
  ADMIN_QUAN_LY_DOT_THUC_TAP_PAGE_SIZE,
  ADMIN_QUAN_LY_DOT_THUC_TAP_SEMESTER_OPTIONS,
  ADMIN_QUAN_LY_DOT_THUC_TAP_STATUS_LABEL
} from "@/lib/constants/admin-quan-ly-dot-thuc-tap"; //hằng số thiết lập cho đợt thực tập
import { formatDateVi } from "@/lib/utils/admin-quan-ly-dot-thuc-tap-dates"; //hàm tiện ích cho đợt thực tập

import Pagination from "../../../components/Pagination"; //phân trang
import TableIconButton from "../../../components/TableIconButton"; //icon button
import { FiDownload, FiEdit2, FiEye, FiRefreshCw, FiTrash2 } from "react-icons/fi";
import styles from "../../styles/dashboard.module.css";
import { ChartStyleLoading } from "@/app/components/ChartStyleLoading"; //loading

type Props = { //props cho bảng đợt thực tập , nhạn dữ liệu vào để hiển thị và báo ngược lại cho component cha xử lý
  loading: boolean;
  items: InternshipBatchRow[]; //danh sách đợt thực tập
  page: number; //trang hiện tại
  busyId: string | null; //id đợt thực tập đang xử lý
  canClose: (row: InternshipBatchRow) => boolean; //hàm kiểm tra xem đợt thực tập có thể đóng không 
  onPageChange: (p: number) => void; //hàm thay đổi trang
  onView: (row: InternshipBatchRow) => void; //hàm xem đợt thực tập
  onEdit: (row: InternshipBatchRow) => void; //hàm sửa đợt thực tập
  onDelete: (row: InternshipBatchRow) => void; //hàm xóa đợt thực tập
  onOpenStatus: (row: InternshipBatchRow) => void; //hàm mở trạng thái đợt thực tập
  onExportStudentsExcel: (row: InternshipBatchRow) => void; //hàm xuất excel danh sách sinh viên theo đợt thực tập
};

export default function AdminInternshipBatchTableSection(props: Props) { //render bảng đợt thực tập
  const { loading, //trạng thái loading
    items, //danh sách đợt thực tập
    page, //trang hiện tại
    busyId, //id đợt thực tập đang xử lý
    canClose, //hàm kiểm tra xem đợt thực tập có thể đóng không
    onPageChange, //hàm thay đổi trang
    onView, //hàm xem đợt thực tập
    onEdit, //hàm sửa đợt thực tập
    onDelete, //hàm xóa đợt thực tập
    onOpenStatus, //hàm mở trạng thái đợt thực tập
    onExportStudentsExcel } = //hàm xuất excel danh sách sinh viên theo đợt thực tập
    props;

  if (loading && items.length === 0) { //nếu đang loading và không có đợt thực tập
    return <ChartStyleLoading variant="compact" />; //hiển thị loading
  }
//lấy danh sách đợt thực tập theo trang
  const pagedItems = items.slice((page - 1) * ADMIN_QUAN_LY_DOT_THUC_TAP_PAGE_SIZE, (page - 1) * ADMIN_QUAN_LY_DOT_THUC_TAP_PAGE_SIZE + ADMIN_QUAN_LY_DOT_THUC_TAP_PAGE_SIZE);

  return ( //render bảng đợt thực tập
    <>
      <div className={styles.tableWrap}>
        <table className={styles.dataTable}>
          <thead>
            <tr>
              <th>STT</th>
              <th>Tên đợt thực tập</th>
              <th>Học kỳ</th>
              <th>Năm học</th>
              <th>Thời gian</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? ( //nếu không có đợt thực tập
              <tr>
                <td colSpan={7} className={styles.modulePlaceholder}>
                  Không có đợt thực tập phù hợp.
                </td>
              </tr>
            ) : (
              pagedItems.map((row, idx) => ( //render từng đợt thực tập
                <tr key={row.id}>
                  <td data-label="STT">{(page - 1) * ADMIN_QUAN_LY_DOT_THUC_TAP_PAGE_SIZE + idx + 1}</td>
                  <td data-label="Tên đợt thực tập">{row.name}</td>
                  <td data-label="Học kỳ">
                    {ADMIN_QUAN_LY_DOT_THUC_TAP_SEMESTER_OPTIONS.find((s) => s.value === row.semester)?.label ?? row.semester}
                  </td>
                  <td data-label="Năm học">{row.schoolYear}</td>
                  <td data-label="Thời gian">
                    {formatDateVi(row.startDate)} - {formatDateVi(row.endDate)}
                  </td>
                  <td data-label="Trạng thái">{ADMIN_QUAN_LY_DOT_THUC_TAP_STATUS_LABEL[row.status]}</td>
                  <td data-label="Thao tác">
                    <div className={styles.rowActions} style={{ gap: 6 }}>
                      <TableIconButton label="Xem chi tiết đợt" disabled={busyId !== null} onClick={() => onView(row)}>
                        <FiEye size={18} />
                      </TableIconButton>
                      <TableIconButton label="Sửa đợt thực tập" disabled={busyId !== null} onClick={() => onEdit(row)}>
                        <FiEdit2 size={18} />
                      </TableIconButton>
                      <TableIconButton label="Cập nhật trạng thái đợt" disabled={busyId !== null || !canClose(row)} onClick={() => onOpenStatus(row)}>
                        <FiRefreshCw size={18} />
                      </TableIconButton>
                      <TableIconButton
                        label="Xuất Excel danh sách sinh viên theo đợt"
                        disabled={busyId !== null}
                        onClick={() => onExportStudentsExcel(row)} //hàm xuất excel danh sách sinh viên theo đợt thực tập
                      >
                        <FiDownload size={18} />
                      </TableIconButton>
                      <TableIconButton label="Xóa đợt thực tập" variant="danger" disabled={busyId !== null} onClick={() => onDelete(row)}>
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

      <Pagination //phân trang
        page={page} //trang hiện tại
        pageSize={ADMIN_QUAN_LY_DOT_THUC_TAP_PAGE_SIZE} //số lượng đợt thực tập trên mỗi trang
        totalItems={items.length} //tổng số đợt thực tập
        onPageChange={onPageChange} //hàm thay đổi trang
        buttonClassName={styles.btn} //class cho nút phân trang
      />
    </>
  );
}

