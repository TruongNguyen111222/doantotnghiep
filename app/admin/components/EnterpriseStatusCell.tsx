 "use client";
//component hiển thị trạng thái doanh nghiệp trong bảng / modal (có hậu tố khi đã phê duyệt).
//render string ra giao diện 
import type { EnterpriseStatus } from "@prisma/client";
import { formatAdminEnterpriseStatusWithLock } from "@/lib/utils/admin-enterprise-display";
import styles from "../styles/dashboard.module.css";

type Props = { 
  status: EnterpriseStatus | null | undefined; isLocked?: boolean | null | undefined };

export function EnterpriseStatusCell({ status, isLocked }: Props) {
  return (
    <span className={styles.statusTextPlain}>
      {formatAdminEnterpriseStatusWithLock({ 
        enterpriseStatus: status, 
        isLocked })}
    </span>
  );
}

//<span className={styles.statusTextPlain}>
//Đã phê duyệt — Đang hoạt động
//</span>
