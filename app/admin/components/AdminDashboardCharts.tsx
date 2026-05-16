"use client";

import { useMemo } from "react";
import styles from "../styles/dashboard.module.css";
import type { DonutSegment, SimpleChartSeries } from "@/lib/types/admin-dashboard"; // Kiểu dữ liệu cho đồ thị tròn và đồ thị đường
import { PROGRESS_STATUS_COLORS } from "@/lib/constants/admin-dashboard-charts"; // Màu sắc cho đồ thị cột
import { ReactEchart } from "@/app/components/charts/ReactEchart"; // Component đồ thị
import {
  buildDonutChartOption,
  buildGroupedBarChartOption,
  buildLineMultiSeriesOption,
  buildPerBarColorChartOption,
  buildSingleBarChartOption
} from "@/lib/utils/echarts-dashboard-options"; // Hàm xây dựng đồ thị

export type GroupedBarSeries = {  // Kiểu dữ liệu cho đồ thị cột nhóm
  name: string; // Tên của đồ thị cột nhóm
  data: number[]; // Danh sách các giá trị của đồ thị cột nhóm
  colorTop: string; // Màu sắc của đồ thị cột nhóm
  colorBottom: string; // Màu sắc của đồ thị cột nhóm
};
//Component đồ thị tròn
export function DonutChart({ segments }: { segments: DonutSegment[] }) { // Component đồ thị tròn
  const option = useMemo( //“Tạo option cho ECharts” - các thuộc tính của đồ thị
    () => buildDonutChartOption(segments), 
    [segments]
  ); // Xây dựng đồ thị tròn
  if (segments.length === 0) return <div className={styles.muted}>Chưa có dữ liệu.</div>; // Nếu không có dữ liệu sẽ hiển thị thông báo
  return <ReactEchart option={option} height={280} clickReloadPulse />; // gửi dữ liệu đồ thị đến component ReactEchart
}

//Component đồ thị cột
export function BarChart(
  { labels, values }: { labels: string[]; values: number[] } // props của component đồ thị cột
) { // Component đồ thị cột
  // Tạo object option cho thư viện ECharts
  // useMemo để tránh thạo lại option nếu labels và values chưa đổi
  const option = useMemo( //“Tạo option cho ECharts” - các thuộc tính của đồ thị
    () => buildSingleBarChartOption(labels, values, { valueLabel: "Số lượng" }), // Xây dựng đồ thị cột
    [labels, values] // phụ thuộc vào labels và values
  ); // Xây dựng đồ thị cột
  if (labels.length === 0) return <div className={styles.muted}>Chưa có dữ liệu.</div>; // Nếu không có dữ liệu sẽ hiển thị thông báo
  return <ReactEchart option={option} height={248} clickReloadPulse />; // gửi dữ liệu đồ thị đến component ReactEchart
}

export function ProgressColumnChart({  // Component đồ thị cột nhiều màu
  labels,
  values,
  valueAxisName = "Sinh viên",
  colors = PROGRESS_STATUS_COLORS // màu sắc cho đồ thị cột nhiều màu
}: {
  labels: string[]; // danh sách các nhãn của đồ thị cột nhiều màu
  values: number[]; // danh sách các giá trị của đồ thị cột nhiều màu
  valueAxisName?: string; // tên trục y của đồ thị cột nhiều màu
  colors?: string[];
}) { // Component đồ thị cột nhiều màu
  const option = useMemo( //“Tạo option cho ECharts” - các thuộc tính của đồ thị
    () => buildPerBarColorChartOption(labels, values, colors, valueAxisName), // Xây dựng đồ thị cột nhiều màu
    [labels, values, valueAxisName, colors]
  ); // Xây dựng đồ thị cột nhiều màu
  if (labels.length === 0) return <div className={styles.muted}>Chưa có dữ liệu.</div>; // Nếu không có dữ liệu sẽ hiển thị thông báo
  return <ReactEchart option={option} height={248} clickReloadPulse />; // gửi dữ liệu đồ thị đến component ReactEchart
}

export function LineChart({ labels, series }: { labels: string[]; series: SimpleChartSeries[] }) { // Component đồ thị đường
  const option = useMemo(() => buildLineMultiSeriesOption(labels, series), [labels, series]); // Xây dựng đồ thị đường
  if (series.length === 0 || labels.length === 0) return <div className={styles.muted}>Chưa có dữ liệu.</div>; // Nếu không có dữ liệu sẽ hiển thị thông báo
  return <ReactEchart option={option} height={292} clickReloadPulse />; // gửi dữ liệu đồ thị đến component ReactEchart
} // Component đồ thị đường

export function GroupedBarChart({ labels, groups }: { labels: string[]; groups: GroupedBarSeries[] }) { // Component đồ thị cột nhóm
  const option = useMemo(() => buildGroupedBarChartOption(labels, groups), [labels, groups]); // Xây dựng đồ thị cột nhóm
  if (labels.length === 0 || groups.length === 0) return <div className={styles.muted}>Chưa có dữ liệu.</div>; // Nếu không có dữ liệu sẽ hiển thị thông báo
  return <ReactEchart option={option} height={280} clickReloadPulse />; // gửi dữ liệu đồ thị đến component ReactEchart
} // Component đồ thị cột nhóm

export function TopFacultiesCard({ // Component bảng dữ liệu
  title,
  items
}: {
  title: string; // tên của bảng dữ liệu
  items: Array<{ label: string; applications: number; offered: number }>; // danh sách các dữ liệu của bảng dữ liệu
}) {
  return ( // render bảng dữ liệu
    <article className={styles.card}>
      <h2 className={styles.panelTitle}>{title}</h2>
      {items.length === 0 ? (
        <div className={styles.modulePlaceholder}>Chưa có dữ liệu.</div>
      ) : (
        <table className={styles.dataTable} style={{ marginTop: 8 }}>
          <thead>
            <tr>
              <th>Khoa/Ngành</th>
              <th>Ứng tuyển</th>
              <th>Trúng tuyển</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.label}>
                <td>{it.label}</td>
                <td>{it.applications}</td>
                <td>{it.offered}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </article>
  );
}
