import Pagination from "../../../components/Pagination";
import TableIconButton from "../../../components/TableIconButton";
import { FiEdit2, FiEye, FiPauseCircle, FiTrash2 } from "react-icons/fi";
import type { JobListItem, JobStatus } from "@/lib/types/doanhnghiep-tuyen-dung"; //type dữ liệu tin tuyển dụng
import { DOANHNGHIEP_TUYEN_DUNG_PAGE_SIZE, DOANHNGHIEP_TUYEN_DUNG_STATUS_LABEL, 
  DOANHNGHIEP_TUYEN_DUNG_WORK_TYPE_LABEL } from "@/lib/constants/doanhnghiep-tuyen-dung"; //hằng số cho API
import { canEditStatus, 
  canStopStatus, 
  formatDateVi } from "@/lib/utils/doanhnghiep-tuyen-dung"; //hàm xử lý logic nghiệp vụ tin tuyển dụng trc khi gửi lên API
import adminStyles from "../../../admin/styles/dashboard.module.css";
import styles from "../../styles/dashboard.module.css";
import { ChartStyleLoading } from "@/app/components/ChartStyleLoading"; //component loading

/**
 * TỔNG QUAN FILE:
 * Component TuyenDungTableSection chịu trách nhiệm hiển thị danh sách tin tuyển dụng dưới dạng bảng dữ liệu (DataTable).
 * Component hỗ trợ giao diện responsive qua data-label, tích hợp phân trang, hiển thị trạng thái tải dữ liệu (Loading),
 * và phân quyền bật/tắt các nút Thao tác (Xem, Sửa, Dừng, Xóa) dựa trên trạng thái (Status) hiện tại của từng tin.
 */
const PAGE_SIZE = DOANHNGHIEP_TUYEN_DUNG_PAGE_SIZE;

type Props = {
  loading: boolean;
  items: JobListItem[];
  totalItems: number;
  page: number;
  busyId: string | null;
  onView: (row: JobListItem) => void;
  onEdit: (row: JobListItem) => void;
  onStop: (row: JobListItem) => void;
  onDelete: (row: JobListItem) => void;
  onPageChange: (p: number) => void;
};

export default function TuyenDungTableSection({
  loading,
  items,
  totalItems,
  page,
  busyId,
  onView,
  onEdit,
  onStop,
  onDelete,
  onPageChange
}: Props) {
  if (loading && items.length === 0) {
    return <ChartStyleLoading variant="compact" />;
  }

  return (
    <>
      <div className={adminStyles.tableWrap}>
        <table className={adminStyles.dataTable}>
          <thead>
            <tr>
              <th>STT</th>
              <th>Tiêu đề</th>
              <th>Ngày đăng tin</th>
              <th>Số lượng tuyển dụng</th>
              <th>Vị trí tuyển dụng</th>
              <th>Hình thức làm việc</th>
              <th>Trạng thái tin</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={8} className={styles.modulePlaceholder}>
                  Không có tin tuyển dụng phù hợp.
                </td>
              </tr>
            ) : (
              items.map((row, idx) => (
                <tr key={row.id}>
                  <td data-label="STT">{(page - 1) * PAGE_SIZE + idx + 1}</td>
                  <td data-label="Tiêu đề">{row.title}</td>
                  <td data-label="Ngày đăng tin">{formatDateVi(row.createdAt)}</td>
                  <td data-label="Số lượng tuyển dụng">{row.recruitmentCount}</td>
                  <td data-label="Vị trí tuyển dụng">{row.expertise}</td>
                  <td data-label="Hình thức làm việc">{DOANHNGHIEP_TUYEN_DUNG_WORK_TYPE_LABEL[row.workType]}</td>
                  <td data-label="Trạng thái tin">{DOANHNGHIEP_TUYEN_DUNG_STATUS_LABEL[row.status as JobStatus]}</td>
                  <td data-label="Thao tác">
                    <div className={adminStyles.rowActions} style={{ gap: 6 }}>
                      <TableIconButton label="Xem chi tiết tin tuyển dụng" onClick={() => onView(row)}>
                        <FiEye size={18} />
                      </TableIconButton>
                      {canEditStatus(row.status) ? (
                        <TableIconButton label="Sửa tin tuyển dụng" disabled={busyId !== null} onClick={() => onEdit(row)}>
                          <FiEdit2 size={18} />
                        </TableIconButton>
                      ) : null}
                      {canStopStatus(row.status) ? (
                        <TableIconButton label="Dừng hoạt động tin" disabled={busyId !== null} onClick={() => onStop(row)}>
                          <FiPauseCircle size={18} />
                        </TableIconButton>
                      ) : null}
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
        pageSize={PAGE_SIZE}
        totalItems={totalItems}
        onPageChange={onPageChange}
        buttonClassName={adminStyles.btn}
        activeButtonClassName={`${adminStyles.btn} ${adminStyles.btnPrimary}`}
      />
    </>
  );
}
