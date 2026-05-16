import type { ReactNode } from "react";
import styles from "../styles/login.module.css";

type AuthShellProps = {
  children: ReactNode;
  /** Chỉ dùng cho đăng ký: form căn giữa màn hình + card rộng hơn */
  variant?: "default" | "centeredWide";
};

export function AuthShell({ children, variant = "default" }: AuthShellProps) {
  if (variant === "centeredWide") {
    return (
      <main className={styles.pageCentered}>
        <div className={styles.pageCenteredInner}>
          <div className={`${styles.card} ${styles.cardWide}`}>
            <div className={styles.logoWrap}>
              <img src="/logo.png" alt="Logo Bộ Giáo dục và Đào tạo" width={72} height={72} />
            </div>
            {children}
          </div>
        </div>
      </main>
    );
  }
//
  return (
    <main className={styles.page}>
      <section className={styles.left}>
        <div className={styles.overlay} />
        <div className={styles.leftContent}>
          <h1 className={styles.leftTitle}>
            Cổng thông tin quản lý giáo dục
            <br />
            Bộ Giáo dục và Đào tạo
          </h1>
          <p className={styles.leftDesc}>
            Nền tảng hỗ trợ quản lý học tập, giảng dạy và kết nối sinh viên, giảng viên, doanh nghiệp trong hệ sinh thái số
            giáo dục.
          </p>
        </div>
      </section>

      <section className={styles.right}>
        <div className={styles.card}>
          <div className={styles.logoWrap}>
            <img src="/logo.png" alt="Logo Bộ Giáo dục và Đào tạo" width={72} height={72} />
          </div>
          {children}
        </div>
      </section>
    </main>
  );
}
