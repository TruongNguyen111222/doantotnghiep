"use client";
 // popup form để hiển thị form bọc các popup khá
 //Vì tất cả các form (Đợt thực tập, Sinh viên, Doanh nghiệp) đều dùng chung cái "Khung nhà mẫu" (FormPopup) này,
import type { ReactNode } from "react";
import adminStyles from "../admin/styles/dashboard.module.css";
import type { PopupSize } from "./MessagePopup";
import MessagePopup from "./MessagePopup";

export default function FormPopup({  //nhận các props từ component cha
  open, //trạng thái open của popup
  title, //tiêu đề của popup
  busy,
  size = "wide", //kích thước của popup
  children, //nội dung của popup
  actions, //hành động của popup
  onClose, //hàm đóng popup
  backdropZIndex,
  disableFieldset = false,
}: {
  open: boolean; 
  title: string;
  busy: boolean;
  size?: PopupSize;
  children: ReactNode;
  actions?: ReactNode;
  onClose?: () => void;
  backdropZIndex?: number;
  /** Popup chỉ xem (AI, preview) — tránh fieldset ảnh hưởng style con */
  disableFieldset?: boolean;
}) {
  return ( //render popup form
    <MessagePopup
      open={open}
      title={title}
      size={size}
      onClose={onClose}
      backdropZIndex={backdropZIndex}
      actions={
        actions ?? (
          <div style={{ display: "flex", justifyContent: "flex-end", width: "100%" }}>
            <button type="button" className={adminStyles.btn} onClick={onClose} disabled={busy}>
              Đóng
            </button>
          </div>
        )
      }
    >
      {disableFieldset ? (
        children
      ) : (
        <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0 }}>
          {children}
        </fieldset>
      )}
    </MessagePopup>
  );
}

