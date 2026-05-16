"use client";
 // popup form để hiển thị form bọc các popup khác
 //Trong trang Admin của bạn, sau này sẽ có rất nhiều loại Pop-up (cửa sổ hiện lên)
 //không có file FormPopup này, thì ở mỗi file (Đợt thực tập, Sinh viên, Doanh nghiệp...), 
 // bạn đều phải tự tay viết lại từ đầu những thứ lặp đi lặp lại
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
}: {
  open: boolean; 
  title: string;
  busy: boolean;
  size?: PopupSize;
  children: ReactNode;
  actions?: ReactNode;
  onClose?: () => void;
}) {
  return ( //render popup form
    <MessagePopup
      open={open}
      title={title}
      size={size}
      onClose={onClose}
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
      <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0 }}>
        {children}
      </fieldset>
    </MessagePopup>
  );
}

