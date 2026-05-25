"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "../styles/dashboard.module.css";
import { getCachedValue, getOrFetchCached, hasCachedValue } from "@/lib/utils/client-query-cache";
import { ChartStyleLoading } from "@/app/components/ChartStyleLoading";
import { ChartCardShell } from "@/app/components/ChartCardShell";
import {
  GroupedBarChart,
  LineChart,
  ProgressColumnChart
} from "@/app/admin/components/AdminDashboardCharts";
import type { SimpleChartSeries } from "@/lib/types/admin-dashboard";

type OverviewPayload = { //Kiểu dữ liệu trả về từ API , toàn bộ dữ liệu của dashboard
  success: boolean; //trả về true nếu thành công, false nếu thất bại
  doubleBar: { labels: string[]; accepted: number[]; declined: number[] }; //danh sách các nhãn và giá trị của đồ thị cột
  lineChart: { labels: string[]; series: SimpleChartSeries[] }; //danh sách các nhãn và danh sách các đồ thị đường của tin tuyển dụng
  applicationStatus: { labels: string[]; values: number[] }; //danh sách các nhãn và giá trị của đồ thị cột của hồ sơ ứng tuyển
  jobStatus: { labels: string[]; values: number[] }; //danh sách các nhãn và giá trị của đồ thị cột của tin tuyển dụng
};

const APP_STATUS_COLORS = ["#2563eb", "#f59e0b", "#16a34a", "#ef4444"]; //màu sắc cho đồ thị cột của hồ sơ ứng tuyển
const JOB_STATUS_COLORS = ["#f59e0b", "#ef4444", "#16a34a", "#6b7280"]; //màu sắc cho đồ thị cột của tin tuyển dụng

const shellChartMin = { minHeight: 300 } as const;

function enterpriseDashboardOverviewCacheKey(dateFrom: string, dateTo: string) { //hàm tạo key cache cho dashboard
  const qs = new URLSearchParams(); //tạo đối tượng URLSearchParams để lưu các tham số query
  if (dateFrom) qs.set("dateFrom", dateFrom); //thêm tham số query vào đối tượng URLSearchParams
  if (dateTo) qs.set("dateTo", dateTo); //thêm tham số query vào đối tượng URLSearchParams
  const url = `/api/doanhnghiep/dashboard/overview?${qs.toString()}`; //tạo url cho request
  return `enterprise:dashboard:overview:${url}`; //trả về key cache
}

const ENTERPRISE_DASHBOARD_INITIAL_KEY = enterpriseDashboardOverviewCacheKey("", ""); //tạo key cache cho dashboard

export default function EnterpriseDashboardPage() {
  const [loading, setLoading] = useState(() => !hasCachedValue(ENTERPRISE_DASHBOARD_INITIAL_KEY)); //trạng thái loading của dashboard
  const [error, setError] = useState<string | null>(null); //trạng thái lỗi của dashboard
  const [dateFrom, setDateFrom] = useState(""); //trạng thái ngày từ của dashboard
  const [dateTo, setDateTo] = useState(""); //trạng thái ngày đến của dashboard
  const [payload, setPayload] = useState<OverviewPayload | null>(() => getCachedValue<OverviewPayload>(ENTERPRISE_DASHBOARD_INITIAL_KEY) ?? null); //trạng thái dữ liệu của dashboard

  useEffect(() => { //hàm load dữ liệu cho dashboard
    let cancelled = false;
    async function load(opts?: { force?: boolean; silent?: boolean }) {
      const force = Boolean(opts?.force);
      const silent = Boolean(opts?.silent);
      try {
        const qs = new URLSearchParams(); 
        if (dateFrom) qs.set("dateFrom", dateFrom);
        if (dateTo) qs.set("dateTo", dateTo);
        const url = `/api/doanhnghiep/dashboard/overview?${qs.toString()}`; //tạo url cho request
        const cacheKey = `enterprise:dashboard:overview:${url}`;
        if (!silent && !hasCachedValue(cacheKey)) setLoading(true);
        setError(null);
        const json = await getOrFetchCached<OverviewPayload>(
          cacheKey,
          async () => {
            const res = await fetch(url); //gửi request đến API để lấy dữ liệu
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return (await res.json()) as OverviewPayload;
          },
          { force }
        );
        if (cancelled) return;
        setPayload(json);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Không thể tải dữ liệu.");
      } finally {
        if (!cancelled && !silent) setLoading(false);
      }
    }
    void load(); //gọi hàm load để load dữ liệu
    const timer = setInterval(() => {
      void load({ force: true, silent: true });
    }, 30000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [dateFrom, dateTo]);

  const doubleBar = payload?.doubleBar ?? { labels: [], accepted: [], declined: [] };
  const lineChart = payload?.lineChart ?? { labels: [], series: [] };
  const applicationStatus = payload?.applicationStatus ?? { labels: [], values: [] };
  const jobStatus = payload?.jobStatus ?? { labels: [], values: [] };

  const doubleBarGroups = useMemo( //hàm tạo danh sách các nhóm cho đồ thị cột
    () => [
      { name: "Chấp nhận", data: doubleBar.accepted, colorTop: "#4ade80", colorBottom: "#15803d" },
      { name: "Từ chối", data: doubleBar.declined, colorTop: "#fb7185", colorBottom: "#b91c1c" }
    ],
    [doubleBar.accepted, doubleBar.declined]
  ); //trả về danh sách các nhóm cho đồ thị cột

  return ( //trả về giao diện dashboard
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Tổng quan Doanh nghiệp</h1>
      </header>

      <section className={styles.overviewControls}>
        <div className={styles.overviewControl}>
          <label>Từ ngày</label>
          <input
            type="date"
            className={styles.overviewInput}
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>
        <div className={styles.overviewControl}>
          <label>Đến ngày</label>
          <input
            type="date"
            className={styles.overviewInput}
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
      </section>

      {error ? <div className={styles.statusNote}>Lỗi: {error}</div> : null}
      {loading && !payload ? (
        <ChartStyleLoading variant="block" message="Đang tải dữ liệu…" />
      ) : null}

      {payload ? ( //nếu có dữ liệu thì hiển thị giao diện dashboard
        <section className={styles.overviewGrid}>
          <ChartCardShell wide style={{ ...shellChartMin, gridColumn: "1 / -1" }}>
            <article className={styles.card}>
              <h2 className={styles.panelTitle}>Số SV chấp nhận &amp; từ chối thực tập theo ngành/khoa</h2>
              <div className={styles.chartPadding}>
                {doubleBar.labels.length === 0 ? (
                  <div className={styles.muted}>Chưa có dữ liệu.</div>
                ) : (
                  <GroupedBarChart labels={doubleBar.labels} groups={doubleBarGroups} />
                )}
              </div>
            </article>
          </ChartCardShell>

          <ChartCardShell style={shellChartMin}>
            <article className={styles.card}>
              <h2 className={styles.panelTitle}>Số lượng hồ sơ theo trạng thái</h2>
              <div className={styles.chartPadding}>
                {applicationStatus.values.every((v) => v === 0) ? (
                  <div className={styles.muted}>Chưa có dữ liệu.</div>
                ) : (
                  <ProgressColumnChart
                    labels={applicationStatus.labels}
                    values={applicationStatus.values}
                    valueAxisName="Hồ sơ"
                    colors={APP_STATUS_COLORS}
                  />
                )}
              </div>
            </article>
          </ChartCardShell>

          <ChartCardShell style={shellChartMin}>
            <article className={styles.card}>
              <h2 className={styles.panelTitle}>Số lượng tin tuyển dụng theo trạng thái</h2>
              <div className={styles.chartPadding}>
                {jobStatus.values.every((v) => v === 0) ? (
                  <div className={styles.muted}>Chưa có dữ liệu.</div>
                ) : (
                  <ProgressColumnChart
                    labels={jobStatus.labels}
                    values={jobStatus.values}
                    valueAxisName="Tin"
                    colors={JOB_STATUS_COLORS}
                  />
                )}
              </div>
            </article>
          </ChartCardShell>

          <ChartCardShell wide style={{ ...shellChartMin, gridColumn: "1 / -1" }}>
            <article className={styles.card}>
              <h2 className={styles.panelTitle}>Số lượng SV ứng tuyển theo ngành/khoa (theo tháng)</h2>
              <div className={styles.chartPadding}>
                <LineChart labels={lineChart.labels} series={lineChart.series} />
              </div>
            </article>
          </ChartCardShell>
        </section>
      ) : null}
    </main>
  );
}
