"use client";
//hiển thị thông báo
import type { ReactNode } from "react";
import adminStyles from "../admin/styles/dashboard.module.css";

type ToastVariant = "success" | "error" | "info"; //kiểu dữ liệu cho thông báo

function guessVariant(message: string): ToastVariant { //chuyển đổi thành công thành success, thất bại thành error, thông báo thành info
  const m = message.toLowerCase();
  if (m.includes("thành công") || m.includes("thanh cong") || m.includes("thành công.")) return "success";
  if (
    m.includes("thất bại") ||
    m.includes("that bai") ||
    m.includes("lỗi") || 
    m.includes("loi") ||
    m.includes("không") ||
    m.includes("khong") ||
    m.includes("không thể") ||
    m.includes("ko thể") ||
    m.includes("không tìm") ||
    m.includes("invalid")
  ) {
    return "error"; //thất bại thành error
  }
  return "info"; //thông báo thành info
}

export type PopupSize = "normal" | "wide" | "extraWide";

export default function MessagePopup({ //popup thông báo 
  open,
  title = "Thông báo",
  message,
  children,
  actions,
  onClose,
  size = "normal"
}: {
  open: boolean;
  title?: string;
  message?: string;
  children?: ReactNode;
  actions?: ReactNode;
  onClose?: () => void;
  size?: PopupSize;
}) {
  if (!open) return null;

  const variant = message ? guessVariant(message) : "info"; //chuyển đổi thành công thành success, thất bại thành error, thông báo thành info
  const color = variant === "success" ? "#027a48" : variant === "error" ? "#b42318" : "#1e40af"; //màu sắc cho thành công, thất bại, thông báo

  const sizeClass =
    size === "wide" ? adminStyles.modalWide : size === "extraWide" ? adminStyles.modalExtraWide : undefined; //kích thước popup

  return ( //render popup thông báo
    <div className={adminStyles.modalBackdrop} role="dialog" aria-modal="true"> 
      <div className={`${adminStyles.modal} ${sizeClass || ""}`.trim()}>
        {title ? <h2 style={{ marginTop: 0, marginBottom: 10, fontSize: 16 }}>{title}</h2> : null}

        {children ? children : message ? <p style={{ margin: 0, color }}>{message}</p> : null}

        {actions ? (
          <div className={adminStyles.modalActions}>{actions}</div>
        ) : onClose ? (
          <div className={adminStyles.modalActions}>
            <button type="button" className={adminStyles.btn} onClick={onClose}>
              Đóng
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

