import type { EChartsOption } from "echarts";
import type { DonutSegment, SimpleChartSeries } from "@/lib/types/admin-dashboard";
import { formatChartInt } from "@/lib/constants/recharts-dashboard-ui";
import { darkenHex, withAlpha } from "@/lib/utils/chart-colors";

/** Trùng `app/globals.css` — canvas ECharts không kế thừa font document, phải set để tiếng Việt không bị fallback lệch từng ký tự */
const CHART_FONT_FAMILY =
  'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Tahoma, Roboto, Arial, "Noto Sans", sans-serif';

/** Dùng trong HTML tooltip (attribute style="...") */
const CHART_FONT_INLINE_CSS =
  "font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Tahoma,Roboto,Arial,'Noto Sans',sans-serif;";

const CHART_MOTION = {
  animation: true,
  animationDuration: 900,
  animationDurationUpdate: 650,
  animationEasing: "cubicOut" as const,
  animationEasingUpdate: "cubicInOut" as const
};

const AXIS = {
  axisLabel: { color: "#64748b", fontSize: 11, fontWeight: 500, fontFamily: CHART_FONT_FAMILY },
  axisLine: { lineStyle: { color: "#cbd5e1" } },
  splitLine: { lineStyle: { color: "#e2e8f0", type: [4, 6] as [number, number] } }
};

const TOOLTIP_CARD = {
  backgroundColor: "rgba(255,255,255,0.96)",
  borderWidth: 0,
  borderRadius: 14,
  padding: [14, 18] as [number, number],
  textStyle: { color: "#1e293b", fontSize: 13, fontWeight: 500, fontFamily: CHART_FONT_FAMILY },
  extraCssText:
    `box-shadow:0 20px 50px rgba(15,23,42,0.14);border:1px solid rgba(226,232,240,0.95);backdrop-filter:blur(8px);font-family:${CHART_FONT_FAMILY};`
};

const TOOLTIP_AXIS = {
  trigger: "axis" as const,
  ...TOOLTIP_CARD,
  axisPointer: { type: "line" as const, lineStyle: { color: "#94a3b8", width: 1, type: [4, 4] as [number, number] } }
};

const TOOLTIP_AXIS_BAR = {
  trigger: "axis" as const,
  ...TOOLTIP_CARD,
  axisPointer: { type: "shadow" as const, shadowStyle: { color: "rgba(15,23,42,0.07)" } }
};

const TOOLTIP_ITEM = {
  trigger: "item" as const,
  ...TOOLTIP_CARD
};

const LEGEND_BOTTOM = {
  bottom: 4,
  icon: "circle",
  itemWidth: 10,
  itemHeight: 10,
  textStyle: { color: "#475569", fontSize: 12, fontWeight: 500, fontFamily: CHART_FONT_FAMILY }
};

function linearGradient(c0: string, c1: string): { type: "linear"; x: number; y: number; x2: number; y2: number; colorStops: { offset: number; color: string }[] } {
  return {
    type: "linear",
    x: 0,
    y: 0,
    x2: 0,
    y2: 1,
    colorStops: [
      { offset: 0, color: c0 },
      { offset: 1, color: c1 }
    ]
  };
}

export function buildDonutChartOption(segments: DonutSegment[]): EChartsOption {
  const data = segments.map((s) => ({
    name: s.label,
    value: s.value,
    itemStyle: {
      color: linearGradient(s.color, darkenHex(s.color, 0.28)),
      borderColor: "#fff",
      borderWidth: 2,
      borderRadius: 6
    }
  }));
  const total = data.reduce((a, d) => a + (Number(d.value) || 0), 0);

  return {
    ...CHART_MOTION,
    textStyle: { fontFamily: CHART_FONT_FAMILY },
    tooltip: {
      ...TOOLTIP_ITEM,
      formatter: (p: unknown) => {
        const x = p as { name?: string; value?: number; percent?: number };
        const pct =
          typeof x.percent === "number" ? `${x.percent.toFixed(1)}%` : "";
        return `<div style="${CHART_FONT_INLINE_CSS}font-weight:700;margin-bottom:6px;color:#0f172a">${x.name ?? ""}</div>` +
          `<div style="${CHART_FONT_INLINE_CSS}font-size:22px;font-weight:800;color:#1d4ed8;line-height:1.1">${formatChartInt(x.value)}</div>` +
          (pct ? `<div style="${CHART_FONT_INLINE_CSS}margin-top:6px;font-size:12px;color:#64748b">${pct} tổng vòng</div>` : "");
      }
    },
    legend: { ...LEGEND_BOTTOM, bottom: 6, left: "center" },
    graphic: [
      {
        type: "group",
        left: "center",
        top: "38%",
        children: [
          {
            type: "text",
            left: "center",
            top: 0,
            style: {
              text: "TỔNG",
              fontSize: 11,
              fontWeight: 600,
              fill: "#64748b",
              fontFamily: CHART_FONT_FAMILY
            }
          },
          {
            type: "text",
            left: "center",
            top: 18,
            style: {
              text: formatChartInt(total),
              fontSize: 26,
              fontWeight: 700,
              fill: "#0f172a",
              fontFamily: CHART_FONT_FAMILY
            }
          }
        ]
      }
    ],
    series: [
      {
        type: "pie",
        radius: ["44%", "70%"],
        center: ["50%", "42%"],
        padAngle: 2.5,
        label: { show: false },
        emphasis: {
          scale: true,
          scaleSize: 6,
          itemStyle: { shadowBlur: 28, shadowColor: "rgba(15,23,42,0.22)" }
        },
        data
      }
    ]
  };
}

export function buildSingleBarChartOption(
  labels: string[],
  values: number[],
  opts?: { valueLabel?: string; gradient?: [string, string] }
): EChartsOption {
  const g = opts?.gradient ?? ["#60a5fa", "#1e3a8a"];
  const categories = labels.map((n) => n);
  const seriesData = labels.map((_, i) => ({
    value: values[i] ?? 0,
    itemStyle: {
      color: linearGradient(g[0], g[1]),
      borderRadius: [10, 10, 0, 0],
      shadowBlur: 8,
      shadowColor: "rgba(37,99,235,0.12)",
      shadowOffsetY: 4
    }
  }));

  return {
    ...CHART_MOTION,
    textStyle: { fontFamily: CHART_FONT_FAMILY },
    tooltip: {
      ...TOOLTIP_AXIS_BAR,
      formatter: (params: unknown) => {
        const arr = params as { name?: string; value?: number }[];
        const p = Array.isArray(arr) ? arr[0] : (params as { name?: string; value?: number });
        const name = p?.name ?? "";
        const v = p?.value ?? 0;
        const unit = (opts?.valueLabel ?? "").trim();
        return `<div style="${CHART_FONT_INLINE_CSS}color:#0f172a">${name}</div>` +
          `<div style="${CHART_FONT_INLINE_CSS}margin-top:6px;font-size:18px;font-weight:800;color:#1d4ed8">${formatChartInt(v)}</div>` +
          (unit ? `<div style="${CHART_FONT_INLINE_CSS}margin-top:4px;font-size:12px;color:#64748b">${unit}</div>` : "");
      }
    },
    grid: { left: 8, right: 16, top: 20, bottom: 56, containLabel: true },
    xAxis: {
      type: "category",
      data: categories,
      axisLabel: { ...AXIS.axisLabel, rotate: 28, interval: 0 },
      axisLine: AXIS.axisLine,
      axisTick: { show: false }
    },
    yAxis: {
      type: "value",
      splitLine: AXIS.splitLine,
      axisLabel: AXIS.axisLabel,
      axisLine: { show: false },
      axisTick: { show: false }
    },
    series: [
      {
        type: "bar",
        name: opts?.valueLabel ?? "Số lượng",
        barMaxWidth: 52,
        data: seriesData,
        emphasis: { focus: "series" as const, itemStyle: { shadowBlur: 16, shadowColor: "rgba(37,99,235,0.38)" } }
      }
    ]
  };
}

export function buildPerBarColorChartOption( // Hàm xây dựng đồ thị cột nhiều màu
  labels: string[],
  values: number[],
  colors: string[],
  valueAxisName: string
): EChartsOption {
  const categories = labels.map((n) => n);
  const seriesData = labels.map((_, i) => {
    const c = colors[i % colors.length];
    return {
      value: values[i] ?? 0,
      itemStyle: {
        color: linearGradient(c, darkenHex(c, 0.25)),
        borderRadius: [10, 10, 0, 0],
        shadowBlur: 6,
        shadowColor: "rgba(15,23,42,0.08)",
        shadowOffsetY: 3
      }
    };
  });

  return {
    ...CHART_MOTION,
    textStyle: { fontFamily: CHART_FONT_FAMILY },
    tooltip: {
      ...TOOLTIP_AXIS_BAR,
      formatter: (params: unknown) => {
        const arr = params as { name?: string; value?: number }[];
        const p = Array.isArray(arr) ? arr[0] : (params as { name?: string; value?: number });
        const name = p?.name ?? "";
        const val = formatChartInt(p?.value);
        return `<div style="${CHART_FONT_INLINE_CSS}color:#0f172a;font-weight:600">${name}</div>` +
          `<div style="${CHART_FONT_INLINE_CSS}margin-top:6px;font-size:18px;font-weight:800;color:#1d4ed8">${val}</div>` +
          `<div style="${CHART_FONT_INLINE_CSS}margin-top:4px;font-size:12px;color:#64748b">${valueAxisName}</div>`;
      }
    },
    grid: { left: 8, right: 16, top: 20, bottom: 56, containLabel: true },
    xAxis: {
      type: "category",
      data: categories,
      axisLabel: { ...AXIS.axisLabel, rotate: 28, interval: 0 },
      axisLine: AXIS.axisLine,
      axisTick: { show: false }
    },
    yAxis: {
      type: "value",
      splitLine: AXIS.splitLine,
      axisLabel: AXIS.axisLabel,
      axisLine: { show: false },
      axisTick: { show: false }
    },
    series: [
      {
        type: "bar",
        name: valueAxisName,
        barMaxWidth: 52,
        data: seriesData,
        emphasis: { focus: "series" as const, itemStyle: { shadowBlur: 12, shadowColor: "rgba(15,23,42,0.12)" } }
      }
    ]
  };
}

export function buildLineMultiSeriesOption(labels: string[], series: SimpleChartSeries[]): EChartsOption {
  const categories = labels.slice();
  const ser = series.map((s) => ({
    name: s.name,
    type: "line" as const,
    smooth: 0.35,
    symbol: "circle",
    symbolSize: 9,
    showSymbol: true,
    lineStyle: { width: 3.2, color: s.color, cap: "round" as const, join: "round" as const },
    itemStyle: { color: s.color, borderColor: "#fff", borderWidth: 2 },
    areaStyle: {
      color: {
        type: "linear" as const,
        x: 0,
        y: 0,
        x2: 0,
        y2: 1,
        colorStops: [
          { offset: 0, color: withAlpha(s.color, 0.28) },
          { offset: 1, color: withAlpha(s.color, 0.02) }
        ]
      }
    },
    emphasis: { focus: "series" as const, lineStyle: { width: 4.5 } },
    data: labels.map((_, i) => s.data[i] ?? 0)
  }));

  return {
    ...CHART_MOTION,
    textStyle: { fontFamily: CHART_FONT_FAMILY },
    tooltip: {
      ...TOOLTIP_AXIS,
      formatter: (params: unknown) => {
        const list = Array.isArray(params) ? params : [params];
        let html = "";
        for (const raw of list) {
          const p = raw as { seriesName?: string; value?: number; marker?: string; name?: string };
          if (!html) {
            html += `<div style="${CHART_FONT_INLINE_CSS}font-weight:700;color:#0f172a;margin-bottom:8px">${p.name ?? ""}</div>`;
          }
          html +=
            `<div style="${CHART_FONT_INLINE_CSS}margin-top:4px;color:#334155">${p.marker ?? ""} ` +
            `<span style="font-weight:600">${p.seriesName ?? ""}</span>: ` +
            `<b style="color:#1d4ed8">${formatChartInt(p.value)}</b></div>`;
        }
        return html;
      }
    },
    legend: { ...LEGEND_BOTTOM, top: 4, data: series.map((s) => s.name) },
    grid: { left: 8, right: 20, top: 48, bottom: 24, containLabel: true },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: categories,
      axisLabel: AXIS.axisLabel,
      axisLine: AXIS.axisLine,
      axisTick: { show: false }
    },
    yAxis: {
      type: "value",
      splitLine: { lineStyle: { color: "#e2e8f0", type: [4, 6] as [number, number] } },
      axisLabel: AXIS.axisLabel,
      axisLine: { show: false },
      axisTick: { show: false }
    },
    series: ser
  };
}

export function buildGroupedBarChartOption(
  categories: string[],
  groups: { name: string; data: number[]; colorTop: string; colorBottom: string }[]
): EChartsOption {
  const series = groups.map((g) => ({
    name: g.name,
    type: "bar" as const,
    barMaxWidth: 44,
    barGap: "12%",
    itemStyle: {
      color: linearGradient(g.colorTop, g.colorBottom),
      borderRadius: [10, 10, 0, 0]
    },
    emphasis: { focus: "series" as const },
    data: g.data
  }));

  return {
    ...CHART_MOTION,
    textStyle: { fontFamily: CHART_FONT_FAMILY },
    tooltip: {
      ...TOOLTIP_AXIS_BAR,
      formatter: (params: unknown) => {
        const list = Array.isArray(params) ? params : [params];
        let html = "";
        for (const raw of list) {
          const p = raw as { seriesName?: string; value?: number; marker?: string; name?: string };
          if (!html) {
            html += `<div style="${CHART_FONT_INLINE_CSS}font-weight:700;color:#0f172a;margin-bottom:8px">${p.name ?? ""}</div>`;
          }
          html +=
            `<div style="${CHART_FONT_INLINE_CSS}margin-top:4px;color:#334155">${p.marker ?? ""} ` +
            `<span style="font-weight:600">${p.seriesName ?? ""}</span>: ` +
            `<b style="color:#1d4ed8">${formatChartInt(p.value)}</b></div>`;
        }
        return html;
      }
    },
    legend: { ...LEGEND_BOTTOM, top: 4, data: groups.map((g) => g.name) },
    grid: { left: 8, right: 16, top: 48, bottom: 52, containLabel: true },
    xAxis: {
      type: "category",
      data: categories,
      axisLabel: { ...AXIS.axisLabel, rotate: 28, interval: 0 },
      axisLine: AXIS.axisLine,
      axisTick: { show: false }
    },
    yAxis: {
      type: "value",
      splitLine: AXIS.splitLine,
      axisLabel: AXIS.axisLabel,
      axisLine: { show: false },
      axisTick: { show: false }
    },
    series
  };
}
