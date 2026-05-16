"use client";
//component nút icon dùng chung cho bảng
import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./table-icon-button.module.css";

function isAppInternalHref(href: string) {
  return href.startsWith("/") && !href.startsWith("//"); //kiểm tra href có phải là link nội bộ không
}

type Variant = "default" | "danger" | "success" | "muted"; //kiểu dữ liệu cho nút icon

type Props = {
  label: string; //label nút icon
  href?: string; //link nút icon
  onClick?: () => void; //hàm click nút icon
  disabled?: boolean; //trạng thái disabled nút icon
  children: ReactNode;
  variant?: Variant; //kiểu dữ liệu cho nút icon
}; 
 //hàm tạo nút icon
export default function TableIconButton({ label, href, onClick, disabled, children, variant = "default" }: Props) {
  const className = `${styles.iconBtn} ${variant !== "default" ? styles[variant] : ""}`; //tạo class cho nút icon

  if (href) {
    if (isAppInternalHref(href)) { //kiểm tra href có phải là link nội bộ không
      return (
        <Link href={href} className={className} title={label} aria-label={label}>
          {children}
        </Link>
      );
    }
    return (
      <a href={href} className={className} title={label} aria-label={label}>
        {children}
      </a>
    );
  }

  return (
    <button type="button" className={className} title={label} aria-label={label} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}
