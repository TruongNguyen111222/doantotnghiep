"use client";
//component “thẻ thống kê nhỏ” trong dashboard admin.
import type { ReactNode } from "react";
import type { IconType } from "react-icons";
import summaryStyles from "./dashboard-stat-summary-card.module.css";

//gọi component này để tạo card thống kê.
export type DashboardStatSummaryCardProps = { //kiểu dữ liệu cho card thống kê
  cardClassName: string; //tên class cho card thống kê
  labelClassName: string; //tên class cho label thống kê
  valueClassName: string; //tên class cho value thống kê
  label: ReactNode; //label thống kê
  value: ReactNode; //value thống kê
  Icon: IconType; //icon thống kê
};

export function DashboardStatSummaryCard({ //hàm tạo card thống kê
  cardClassName,
  labelClassName,
  valueClassName,
  label,
  value,
  Icon
}: DashboardStatSummaryCardProps) { //hàm tạo card thống kê
  return (
    <div className={cardClassName}>
      <div className={summaryStyles.head}>
        <span className={summaryStyles.iconCell} aria-hidden>
          <Icon className={summaryStyles.icon} size={28} />
        </span>
        <div className={summaryStyles.body}>
          <p className={labelClassName}>{label}</p>
          <p className={valueClassName}>{value}</p>
        </div>
      </div>
    </div>
  );
}
