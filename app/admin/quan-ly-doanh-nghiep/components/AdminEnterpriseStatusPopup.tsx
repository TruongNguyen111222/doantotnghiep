"use client";
//popup xác nhận phê duyệt, từ chối doanh nghiệp
import { EnterpriseStatus } from "@prisma/client";
import type { AdminEnterpriseDetail, AdminEnterpriseListItem } from "@/lib/types/admin";
import { buildEnterpriseHeadquartersAddress, normalizeEnterpriseStatus } from "@/lib/utils/enterprise-admin-display";
//hiển thị trạng thái doanh nghiệp trong bảng / modal (có hậu tố khi đã phê duyệt).
import { EnterpriseStatusCell } from "../../components/EnterpriseStatusCell"; //component hiển thị trạng thái doanh nghiệp trong bảng / modal (có hậu tố khi đã phê duyệt).
import MessagePopup from "../../../components/MessagePopup"; //hiển thị thông báo

import styles from "../../styles/dashboard.module.css";
import { ChartStyleLoading } from "@/app/components/ChartStyleLoading";

type Props = { //kiểu dữ liệu cho popup
  statusTarget: AdminEnterpriseListItem | null; //doanh nghiệp đang xử lý
  statusDetail: AdminEnterpriseDetail | null; //chi tiết doanh nghiệp
  rejectOpen: boolean; //trạng thái xác nhận từ chối
  rejectText: string; //lý do từ chối
  rejectTextError: string; //lý do từ chối lỗi
  busyId: string | null; //id doanh nghiệp đang xử lý

  onClose: () => void; //hàm đóng popup
  onStartReject: () => void; //hàm bắt đầu từ chối
  onSubmitApprove: () => void; //hàm xác nhận phê duyệt
  onSubmitReject: () => void; //hàm xác nhận từ chối

  onChangeRejectText: (v: string) => void; //hàm thay đổi lý do từ chối
  onBackFromReject: () => void; //hàm quay lại
};

export default function AdminEnterpriseStatusPopup(props: Props) { //hàm render popup xác nhận phê duyệt, từ chối doanh nghiệp
  const {
    statusTarget, //doanh nghiệp đang xử lý
    statusDetail, //chi tiết doanh nghiệp
    rejectOpen, //trạng thái xác nhận từ chối
    rejectText, //lý do từ chối
    rejectTextError, //lý do từ chối lỗi
    busyId, //id doanh nghiệp đang xử lý
    onClose, //hàm đóng popup
    onStartReject, //hàm bắt đầu từ chối
    onSubmitApprove, //hàm xác nhận phê duyệt
    onSubmitReject, //hàm xác nhận từ chối
    onChangeRejectText, //hàm thay đổi lý do từ chối
    onBackFromReject, //hàm quay lại
  } = props;

  if (!statusTarget) return null; //nếu không có doanh nghiệp đang xử lý thì không hiển thị popup

  const isRejected = normalizeEnterpriseStatus(statusTarget.enterpriseStatus) === EnterpriseStatus.REJECTED; //nếu trạng thái doanh nghiệp là từ chối thì trả về true
  const isApproved = normalizeEnterpriseStatus(statusTarget.enterpriseStatus) === EnterpriseStatus.APPROVED; //nếu trạng thái doanh nghiệp là phê duyệt thì trả về true
  const canToggleActive = isApproved; //nếu trạng thái doanh nghiệp là phê duyệt thì có thể chuyển đổi trạng thái
  const activeLabel = statusTarget.isLocked ? "Đang hoạt động" : "Dừng hoạt động"; //nếu trạng thái doanh nghiệp là khóa thì trả về "Đang hoạt động", nếu không thì trả về "Dừng hoạt động"

  return ( //hiển thị popup xác nhận phê duyệt, từ chối doanh nghiệp
    <MessagePopup open title="Cập nhật trạng thái phê duyệt" size="wide">
      {!rejectOpen ? (
        <>
          <div className={styles.statusCurrentRow}> 
            <strong>Trạng thái hiện tại:</strong>{" "} 
            <EnterpriseStatusCell status={statusTarget.enterpriseStatus} isLocked={statusTarget.isLocked} />
          </div>
          <p>
            <strong>Tên doanh nghiệp:</strong> {statusTarget.companyName || "—"}
            <br />
            <strong>Mã số thuế:</strong> {statusTarget.taxCode || "—"}
            <br />
            <strong>Email:</strong> {statusTarget.email}
            <br />
            <strong>Địa chỉ:</strong>{" "} 
            {statusDetail ? ( //nếu có chi tiết doanh nghiệp thì hiển thị địa chỉ
              buildEnterpriseHeadquartersAddress(statusDetail.enterpriseMeta)
            ) : (
              <ChartStyleLoading variant="inline" /> //nếu không có chi tiết doanh nghiệp thì hiển thị loading
            )}
          </p>

          <div className={styles.modalActions}> 
            <button type="button" className={styles.btn} onClick={onClose}> 
              Đóng
            </button>
            {canToggleActive ? ( //nếu có thể chuyển đổi trạng thái thì hiển thị nút chuyển đổi trạng thái
              <button //nút chuyển đổi trạng thái
                type="button" 
                className={`${styles.btn} ${statusTarget.isLocked ? styles.btnPrimary : styles.btnDanger}`}
                disabled={busyId !== null} //nếu đang xử lý thì không cho click
                title={
                  statusTarget.isLocked
                    ? "Doanh nghiệp đang dừng hoạt động — chỉ có thể kích hoạt lại." //nếu doanh nghiệp đang dừng hoạt động thì chỉ có thể kích hoạt lại
                    : "Doanh nghiệp đã phê duyệt — chỉ có thể cập nhật sang dừng hoạt động." //nếu doanh nghiệp đã phê duyệt thì chỉ có thể cập nhật sang dừng hoạt động
                }
                onClick={() => { //hàm xác nhận chuyển đổi trạng thái
                  const next = statusTarget.isLocked ? "ACTIVE" : "STOPPED";
                  const ok = window.confirm(`Xác nhận cập nhật trạng thái tài khoản doanh nghiệp sang "${activeLabel}"?`); //xác nhận chuyển đổi trạng thái
                  if (!ok) return; //nếu không xác nhận thì không thực hiện
                  void (async () => { //hàm xác nhận chuyển đổi trạng thái
                    // use accounts status endpoint (locks/unlocks user) //sử dụng endpoint chuyển đổi trạng thái doanh nghiệp
                    try { 
                      const res = await fetch(`/api/admin/accounts/${statusTarget.id}/status`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ status: next })
                      });
                      if (!res.ok) {
                        const data = await res.json().catch(() => ({})); //lấy dữ liệu từ response
                        alert(data?.message || "Cập nhật trạng thái thất bại."); //hiển thị thông báo lỗi
                        return;
                      }
                      window.location.reload(); //tải lại trang
                    } catch {
                      alert("Không thể kết nối hệ thống. Vui lòng thử lại.");
                    }
                  })();
                }}
              >
                {activeLabel}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnDanger}`} //nút từ chối
                  disabled={busyId !== null || isRejected} //nếu đang xử lý hoặc hồ sơ đã bị từ chối thì không cho click
                  title={isRejected ? "Hồ sơ đã bị từ chối — không thể từ chối thêm lần nữa." : undefined} //nếu hồ sơ đã bị từ chối thì không thể từ chối thêm lần nữa
                  onClick={onStartReject} //hàm bắt đầu từ chối
                >
                  Từ chối
                </button>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnPrimary}`} //nút phê duyệt
                  disabled={busyId !== null || isApproved} //nếu đang xử lý hoặc hồ sơ đã được phê duyệt thì không cho click
                  title={isApproved ? "Hồ sơ đã được phê duyệt — không cần phê duyệt lại." : undefined} //nếu hồ sơ đã được phê duyệt thì không cần phê duyệt lại
                  onClick={onSubmitApprove} //hàm xác nhận phê duyệt
                >
                  Phê duyệt
                </button>
              </>
            )}
          </div>
        </>
      ) : (
        <>
          <p>
            <strong>Từ chối:</strong> {statusTarget.companyName || "—"} — MST {statusTarget.taxCode || "—"}
          </p>
          <p>Lý do từ chối (mỗi dòng một ý, hiển thị trong email).</p>
          <textarea
            value={rejectText} //lý do từ chối
            disabled={busyId !== null} //nếu đang xử lý thì không cho click
            onChange={(e) => onChangeRejectText(e.target.value)} //hàm thay đổi lý do từ chối
            placeholder="Ví dụ: Hồ sơ chưa đầy đủ." //placeholder lý do từ chối
          />
          {rejectTextError ? ( //nếu có lý do từ chối lỗi thì hiển thị thông báo lỗi
            <p className={styles.error} style={{ marginTop: 6 }}>
              {rejectTextError}
            </p>
          ) : null}
          <div className={styles.modalActions}> 
            <button type="button" className={styles.btn} onClick={onBackFromReject}>
              Quay lại
            </button>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnDanger}`}
              disabled={busyId !== null}
              onClick={() => void onSubmitReject()}
            >
              Gửi từ chối
            </button>
          </div>
        </>
      )}
    </MessagePopup>
  );
}

