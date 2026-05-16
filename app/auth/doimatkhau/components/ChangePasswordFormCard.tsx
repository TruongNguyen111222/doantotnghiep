import Link from "next/link"; 
import type { FormEvent } from "react";
import { useState } from "react";
import { AuthShell } from "../../components/AuthShell";
import styles from "../../styles/forgot-password.module.css";
//
function EyeIcon({ hidden }: { hidden: boolean }) {
  if (hidden) {
    return (
      <svg className={styles.togglePasswordIcon} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M3 3l18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M10.6 10.6a3 3 0 004.24 4.24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path
          d="M6.4 6.4C4.6 7.7 3.2 9.5 2.3 12c1.6 4.3 5.4 7.5 9.7 7.5 1.7 0 3.4-.5 4.9-1.4M12 4.5c4.3 0 8.1 3.2 9.7 7.5-.6 1.7-1.6 3.2-2.8 4.4"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg className={styles.togglePasswordIcon} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M2.3 12C3.9 7.7 7.7 4.5 12 4.5s8.1 3.2 9.7 7.5c-1.6 4.3-5.4 7.5-9.7 7.5S3.9 16.3 2.3 12z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

type Props = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  currentPasswordError: string;
  newPasswordError: string;
  confirmPasswordError: string;
  submitError: string;
  successMessage: string;
  isSubmitting: boolean;
  dashboardHome: string | null;
  onCurrentPasswordChange: (value: string) => void;
  onNewPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
};

export default function ChangePasswordFormCard(props: Props) {
  const {
    currentPassword,
    newPassword,
    confirmPassword,
    currentPasswordError,
    newPasswordError,
    confirmPasswordError,
    submitError,
    successMessage,
    isSubmitting,
    dashboardHome,
    onCurrentPasswordChange,
    onNewPasswordChange,
    onConfirmPasswordChange,
    onSubmit
  } = props;

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <AuthShell>
      <h2 className={styles.title}>Đổi mật khẩu</h2>
      <p className={styles.desc}>Bạn đã đăng nhập — nhập mật khẩu hiện tại và mật khẩu mới để cập nhật.</p>

      <form onSubmit={onSubmit} noValidate aria-busy={isSubmitting}>
        <div className={styles.field}>
          <label htmlFor="currentPassword" className={styles.label}>
            Mật khẩu hiện tại <span className={styles.required}>*</span>
          </label>
          <div className={styles.inputWrap}>
            <input
              id="currentPassword"
              type={showCurrent ? "text" : "password"}
              className={`${styles.input} ${styles.inputWithToggle}`}
              placeholder="Nhập mật khẩu hiện tại"
              value={currentPassword}
              onChange={(e) => onCurrentPasswordChange(e.target.value)}
              disabled={isSubmitting}
            />
            <button
              type="button"
              className={styles.togglePasswordBtn}
              onClick={() => setShowCurrent((s) => !s)}
              disabled={isSubmitting}
              aria-label={showCurrent ? "Ẩn mật khẩu hiện tại" : "Hiện mật khẩu hiện tại"}
            >
              <EyeIcon hidden={!showCurrent} />
            </button>
          </div>
          {currentPasswordError ? <p className={styles.error}>{currentPasswordError}</p> : null}
        </div>

        <div className={styles.field}>
          <label htmlFor="newPassword" className={styles.label}>
            Mật khẩu mới <span className={styles.required}>*</span>
          </label>
          <div className={styles.inputWrap}>
            <input
              id="newPassword"
              type={showNew ? "text" : "password"}
              className={`${styles.input} ${styles.inputWithToggle}`}
              placeholder="Nhập mật khẩu mới"
              value={newPassword}
              onChange={(e) => onNewPasswordChange(e.target.value)}
              disabled={isSubmitting}
            />
            <button
              type="button"
              className={styles.togglePasswordBtn}
              onClick={() => setShowNew((s) => !s)}
              disabled={isSubmitting}
              aria-label={showNew ? "Ẩn mật khẩu mới" : "Hiện mật khẩu mới"}
            >
              <EyeIcon hidden={!showNew} />
            </button>
          </div>
          <p className={styles.hint}>Mật khẩu gồm tối thiểu 8 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt.</p>
          {newPasswordError ? <p className={styles.error}>{newPasswordError}</p> : null}
        </div>

        <div className={styles.field}>
          <label htmlFor="confirmPassword" className={styles.label}>
            Xác nhận mật khẩu mới <span className={styles.required}>*</span>
          </label>
          <div className={styles.inputWrap}>
            <input
              id="confirmPassword"
              type={showConfirm ? "text" : "password"}
              className={`${styles.input} ${styles.inputWithToggle}`}
              placeholder="Nhập lại mật khẩu mới"
              value={confirmPassword}
              onChange={(e) => onConfirmPasswordChange(e.target.value)}
              disabled={isSubmitting}
            />
            <button
              type="button"
              className={styles.togglePasswordBtn}
              onClick={() => setShowConfirm((s) => !s)}
              disabled={isSubmitting}
              aria-label={showConfirm ? "Ẩn xác nhận mật khẩu" : "Hiện xác nhận mật khẩu"}
            >
              <EyeIcon hidden={!showConfirm} />
            </button>
          </div>
          {confirmPasswordError ? <p className={styles.error}>{confirmPasswordError}</p> : null}
        </div>

        <button type="submit" className={styles.button} disabled={isSubmitting}>
          {isSubmitting ? "Đang xử lý..." : "Đổi mật khẩu"}
        </button>
      </form>

      {submitError ? <p className={styles.errorGlobal}>{submitError}</p> : null}
      {successMessage ? <p className={styles.success}>{successMessage}</p> : null}

      {dashboardHome ? (
        <div className={styles.linkRow}>
          <Link href={dashboardHome}>Quay lại bảng điều khiển</Link>
        </div>
      ) : null}
    </AuthShell>
  );
}
