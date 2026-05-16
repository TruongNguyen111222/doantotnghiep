//component loading dùng chung trong React/Next.js.
import styles from "./chart-style-loading.module.css";

export type ChartStyleLoadingProps = { //kiểu dữ liệu cho component loading
  /** Mặc định: Đang tải… */
  message?: string;
  className?: string;
  /** block = khu vực trang; compact = bảng / popup gọn; inline = trong một dòng (vd. địa chỉ) */
  variant?: "block" | "compact" | "inline";
};

export function ChartStyleLoading({
  message = "Đang tải…",
  className,
  variant = "block"
}: ChartStyleLoadingProps) {
  if (variant === "inline") {
    return (
      <span className={`${styles.rootInline} ${className ?? ""}`} role="status" aria-live="polite" aria-busy="true">
        <span className={styles.spinnerInline} aria-hidden />
        <span className={styles.textInline}>{message}</span>
      </span>
    );
  }

  if (variant === "compact") {
    return (
      <div className={`${styles.rootCompact} ${className ?? ""}`} role="status" aria-live="polite" aria-busy="true">
        <div className={styles.spinnerCompact} aria-hidden />
        <p className={styles.textCompact}>{message}</p>
      </div>
    );
  }

  return (
    <div className={`${styles.rootBlock} ${className ?? ""}`} role="status" aria-live="polite" aria-busy="true">
      <div className={styles.spinner} aria-hidden />
      <p className={styles.text}>{message}</p>
    </div>
  );
}
