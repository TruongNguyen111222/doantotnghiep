"use client";
//tạo component đồ thị ReactEchart render canvas đồ thị và xử lý click
import { useCallback, useEffect, useRef, useState } from "react";
import type { EChartsOption } from "echarts"; // Kiểu dữ liệu cho đồ thị
import { echarts } from "@/lib/echarts/register"; // Đăng ký modular đồ thị
import shellStyles from "./react-echart.module.css"; // CSS overlay pulse

type Props = { // Kiểu dữ liệu cho props của component ReactEchart nhận vào
  option: EChartsOption; // Kiểu dữ liệu cho đồ thị
  /** Chiều cao cố định (px); chiều ngang 100% */
  height?: number;
  className?: string;
  onChartClick?: (params: unknown) => void; // click sẽ gọi hàm này
  /**
   * Click → overlay loading ngắn → setOption lại để chạy lại animation (không popup).
   * Dùng cho dashboard; tắt nếu không cần.
   */
  clickReloadPulse?: boolean;
};

const PULSE_MS = 520; // Thời gian overlay loading ngắn

export function ReactEchart({ //để tạo component đồ thị ReactEchart
  option,
  height = 280,
  className,
  onChartClick,
  clickReloadPulse = false
}: Props) {
  const host = useRef<HTMLDivElement>(null); //tạo ô nhớ để render đồ thị
  const chart = useRef<ReturnType<typeof echarts.init> | null>(null); //tạo ô nhớ để lưu đồ thị
  const lastJson = useRef<string>(""); //tạo ô nhớ để lưu đồ thị
  const clickRef = useRef(onChartClick); //tạo ô nhớ để lưu hàm click
  clickRef.current = onChartClick;
  const pulseRef = useRef(clickReloadPulse); //tạo ô nhớ để lưu clickReloadPulse
  pulseRef.current = clickReloadPulse;
  const pulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null); //tạo ô nhớ để lưu thời gian overlay loading ngắn

  const [pulse, setPulse] = useState(false); //tạo ô nhớ để lưu trạng thái overlay loading ngắn
  const [replayTick, setReplayTick] = useState(0); //tạo ô nhớ để lưu số lần replay animation ép chart chạy animation lại

  useEffect(() => { //khi component vừa xuất hiện sẽ tạo đồ thị
    const el = host.current;
    if (!el) return;
    const c = echarts.init(el, undefined, { renderer: "canvas" }); //Tạo chart bên trong div HTML
    chart.current = c; //lưu đồ thị vào ô nhớ
    const ro = new ResizeObserver(() => {
      c.resize(); //khi đồ thị thay đổi kích thước sẽ resize đồ thị
    });
    ro.observe(el); //khi đồ thị thay đổi kích thước sẽ resize đồ thị
    return () => {
      if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current); //xóa thời gian overlay loading ngắn
      ro.disconnect(); //xóa observer
      c.dispose(); //xóa đồ thị
      chart.current = null; //xóa đồ thị vào ô nhớ
    };
  }, []);

  const applyOption = useCallback(() => { //khi đồ thị thay đổi sẽ applyOption -“cập nhật dữ liệu biểu đồ”
    const c = chart.current;
    if (!c || c.isDisposed?.()) return; //nếu đồ thị không tồn tại hoặc đã bị xóa sẽ không applyOption
    const next = JSON.stringify(option);  //biến object thành text. dùng để so sánh với lastJson.current
    if (replayTick === 0 && next === lastJson.current) return; //nếu replayTick bằng 0 và next bằng lastJson.current sẽ không RENDER lại đồ thị
    lastJson.current = next; //lưu next vào lastJson.current
    c.setOption(option, { notMerge: true, lazyUpdate: false }); //cập nhật dữ liệu đồ thị
  }, [option, replayTick]);

  useEffect(() => {//“Khi dữ liệu đổi thì cập nhật chart”
    applyOption();
  }, [applyOption]);

  useEffect(() => { //“Khi click thì overlay loading ngắn và replay animation”
    const c = chart.current; //lấy đồ thị từ ô nhớ
    if (!c || c.isDisposed?.()) return; //nếu đồ thị không tồn tại hoặc đã bị xóa sẽ không applyOption
    const handler = (params: unknown) => {
      clickRef.current?.(params); //gọi hàm click  
      if (!pulseRef.current) return; //nếu không có pulseRef.current sẽ không applyOption
      if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current); //xóa thời gian overlay loading ngắn
      setPulse(true); //set trạng thái overlay loading ngắn
      pulseTimerRef.current = setTimeout(() => {
        pulseTimerRef.current = null; //xóa thời gian overlay loading ngắn
        setReplayTick((t) => t + 1); //tăng số lần replay animation ép chart chạy animation lại
        setPulse(false);
      }, PULSE_MS); //thời gian overlay loading ngắn
    };
    c.on("click", handler); //khi click sẽ gọi hàm handler
    return () => {
      c.off("click", handler); //khi click sẽ gọi hàm handler
      if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current); //xóa thời gian overlay loading ngắn
    };
  }, []);

  return ( //render đồ thị
    <div
      className={`${shellStyles.shell} ${className ?? ""}`}
      style={{ height }}
      data-echart-host=""
    >
      {pulse ? (
        <div className={shellStyles.overlay} aria-live="polite" aria-busy="true">
          <div className={shellStyles.spinner} />
          <p className={shellStyles.overlayText}>Đang cập nhật biểu đồ…</p>
        </div>
      ) : null}
      <div ref={host} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
