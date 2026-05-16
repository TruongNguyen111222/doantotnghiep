"use client";
//popup “Xem chi tiết doanh nghiệp”.
//Nó chỉ lo phần hiển thị giao diện modal popup,
import type { AdminEnterpriseDetail } from "@/lib/types/admin"; //kiểu dữ liệu cho thành phần AdminEnterpriseViewPopup
import { EnterpriseViewDetailTable } from "../../components/EnterpriseViewDetailTable"; //component hiển thị thông tin doanh nghiệp trong modal “Xem chi tiết”.
import MessagePopup from "../../../components/MessagePopup"; //component hiển thị thông báo   

import styles from "../../styles/dashboard.module.css";
import { ChartStyleLoading } from "@/app/components/ChartStyleLoading"; //component hiển thị loading khi đang tải dữ liệu

type Props = {
  viewLoading: boolean;
  viewDetail: AdminEnterpriseDetail | null;
  onClose: () => void;
};

export default function AdminEnterpriseViewPopup(props: Props) { //hàm hiển thị thông tin doanh nghiệp trong modal “Xem chi tiết”.
  const { viewLoading, viewDetail, onClose } = props;

  if (!viewLoading && !viewDetail) return null; //nếu không có dữ liệu thì không hiển thị

  return ( //trả về giao diện hiển thị thông tin doanh nghiệp trong modal “Xem chi tiết”.
    <MessagePopup open title="Xem thông tin doanh nghiệp" size="extraWide">
      {viewLoading ? <ChartStyleLoading variant="compact" /> : null}
      {!viewLoading && viewDetail ? <EnterpriseViewDetailTable item={viewDetail} /> : null}
      <div className={styles.modalActions}>
        <button type="button" className={styles.btn} onClick={onClose}>
          Đóng
        </button>
      </div>
    </MessagePopup>
  );
}

