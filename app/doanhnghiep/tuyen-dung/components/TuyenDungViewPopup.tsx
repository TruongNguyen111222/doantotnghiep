import type { JobDetailResponse, JobStatus, WorkType } from "@/lib/types/doanhnghiep-tuyen-dung";
import { DOANHNGHIEP_TUYEN_DUNG_STATUS_LABEL, 
  DOANHNGHIEP_TUYEN_DUNG_WORK_TYPE_LABEL } from "@/lib/constants/doanhnghiep-tuyen-dung"; //hằng số cho API
import { formatDateVi } from "@/lib/utils/doanhnghiep-tuyen-dung"; //hàm xử lý logic nghiệp vụ tin tuyển dụng trc khi gửi lên API
import adminStyles from "../../../admin/styles/dashboard.module.css";
import { ChartStyleLoading } from "@/app/components/ChartStyleLoading";

/**
 * TỔNG QUAN FILE:
 * Component TuyenDungViewPopup hiển thị một cửa sổ bật lên (Modal/Popup) để xem toàn bộ thông tin chi tiết
 * của một tin tuyển dụng cụ thể, bao gồm thông tin hồ sơ Doanh nghiệp và nội dung chi tiết bài đăng tuyển.
 * Hỗ trợ trạng thái tải dữ liệu bất đồng bộ (viewLoading) khi đang đợi phản hồi chi tiết từ API.
 */
type Props = { 
  viewJob: JobDetailResponse | null;
  viewLoading: boolean;
  onClose: () => void;
};

export default function TuyenDungViewPopup({ viewJob, viewLoading, onClose }: Props) {
  if (!viewJob && !viewLoading) return null;

  return (
    <div className={adminStyles.modalBackdrop} role="dialog" aria-modal="true" aria-labelledby="job-view-title">
      <div className={`${adminStyles.modal} ${adminStyles.modalExtraWide}`}>
        <h2 id="job-view-title">Xem chi tiết tin tuyển dụng</h2>
        {viewLoading ? <ChartStyleLoading variant="compact" /> : null}
        {viewJob ? (
          <div>
            <div className={adminStyles.detailCard}>
              <div className={adminStyles.detailSectionTitle}>Tiêu đề</div>
              <div style={{ fontWeight: 600 }}>{viewJob.job.title || "—"}</div>
            </div>
            <table className={adminStyles.viewModalDetailTable} style={{ marginTop: 14 }}>
              <tbody>
                <tr>
                  <th scope="row">Thông tin doanh nghiệp</th>
                  <td />
                </tr>
                <tr>
                  <th scope="row">Tên doanh nghiệp</th>
                  <td>{viewJob.enterprise.companyName || "—"}</td>
                </tr>
                <tr>
                  <th scope="row">MST</th>
                  <td>{viewJob.enterprise.taxCode || "—"}</td>
                </tr>
                <tr>
                  <th scope="row">Lĩnh vực</th>
                  <td>{viewJob.enterprise.businessFields || "—"}</td>
                </tr>
                <tr>
                  <th scope="row">Địa điểm trụ sở chính</th>
                  <td>{viewJob.enterprise.headquartersAddress || "—"}</td>
                </tr>
                <tr>
                  <th scope="row">Giới thiệu về công ty</th>
                  <td>{viewJob.enterprise.intro || "—"}</td>
                </tr>
                <tr>
                  <th scope="row">Website</th>
                  <td>
                    {viewJob.enterprise.website ? (
                      <a href={viewJob.enterprise.website} target="_blank" rel="noopener noreferrer">
                        {viewJob.enterprise.website}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
                <tr>
                  <th scope="row">Mức lương</th>
                  <td>{viewJob.job.salary || "—"}</td>
                </tr>
                <tr>
                  <th scope="row">Vị trí tuyển dụng</th>
                  <td>{viewJob.job.expertise || "—"}</td>
                </tr>
                <tr>
                  <th scope="row">Yêu cầu kinh nghiệm</th>
                  <td>{viewJob.job.experienceRequirement || "—"}</td>
                </tr>
                <tr>
                  <th scope="row">Số lượng tuyển dụng</th>
                  <td>{viewJob.job.recruitmentCount || "—"}</td>
                </tr>
                <tr>
                  <th scope="row">Hình thức làm việc</th>
                  <td>{DOANHNGHIEP_TUYEN_DUNG_WORK_TYPE_LABEL[viewJob.job.workType as WorkType] ?? "—"}</td>
                </tr>
                <tr>
                  <th scope="row">Hạn tuyển dụng</th>
                  <td>{formatDateVi(viewJob.job.deadlineAt)}</td>
                </tr>
                <tr>
                  <th scope="row">Mô tả công việc</th>
                  <td>{viewJob.job.jobDescription || "—"}</td>
                </tr>
                <tr>
                  <th scope="row">Yêu cầu ứng viên</th>
                  <td>{viewJob.job.candidateRequirements || "—"}</td>
                </tr>
                <tr>
                  <th scope="row">Quyền lợi</th>
                  <td>{viewJob.job.benefits || "—"}</td>
                </tr>
                <tr>
                  <th scope="row">Địa điểm làm việc</th>
                  <td>{viewJob.job.workLocation || "—"}</td>
                </tr>
                <tr>
                  <th scope="row">Thời gian làm việc</th>
                  <td>{viewJob.job.workTime || "—"}</td>
                </tr>
                <tr>
                  <th scope="row">Cách thức ứng tuyển</th>
                  <td>{viewJob.job.applicationMethod || "—"}</td>
                </tr>
                <tr>
                  <th scope="row">Trạng thái hiện tại của tin</th>
                  <td>{DOANHNGHIEP_TUYEN_DUNG_STATUS_LABEL[viewJob.job.status as JobStatus] ?? "—"}</td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : null}
        <div className={adminStyles.modalActions}>
          <button type="button" className={adminStyles.btn} onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
