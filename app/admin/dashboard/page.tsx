"use client";

import { useEffect, useState } from "react"; 
import styles from "../styles/dashboard.module.css";

import type { OverviewPayload } from "@/lib/types/admin-dashboard"; // Kiểu dữ liệu trả về từ API , toàn bộ dữ liệu của dashboard
import { getCachedValue, getOrFetchCached, hasCachedValue } from "@/lib/utils/client-query-cache"; // Hàm lấy giá trị từ cache hoặc fetch từ API
import {
  BarChart,
  DonutChart,
  LineChart,
  ProgressColumnChart,
  TopFacultiesCard 
} from "../components/AdminDashboardCharts"; // Các component của dashboard admin chứa các đồ thị
import { ChartStyleLoading } from "@/app/components/ChartStyleLoading"; // Component loading dùng chung trong React/Next.js.
import { ChartCardShell } from "@/app/components/ChartCardShell"; // Component phóng to chart khi click vào chart

//“TẠO KEY CACHE cho dashboard”
function adminDashboardCacheKey(faculty: string, batchId: string) {  // nhận tham sô s khoa và đợt thực tập
  const qs = new URLSearchParams(); //tạo đối tượng URLSearchParams để lưu các tham số query
  if (faculty) qs.set("faculty", faculty); //thêm tham số query vào đối tượng URLSearchParams
  if (batchId) qs.set("batchId", batchId); //thêm tham số query vào đối tượng URLSearchParams
  return `admin:dashboard:overview:${qs.toString()}`; //trả về key cache dưới dạng string
}
//“TẠO KEY CACHE cho dashboard” - để khỏi phải gọi API lại nhiều lần
// nếu ko - không biết data nào thuộc filter nào - chưa cache lại


//“TẠO PAGE cho dashboard” - PHẦN KHAI BÁO STATE CHÍNH của dashboard
export default function AdminDashboardPage() { // trang dashboard admin
  const initialKey = adminDashboardCacheKey("all", "all"); // tạo key cache cho dashboard khi load trang đầu tiên
  const [loading, setLoading] = useState(() => !hasCachedValue(initialKey)); // trạng thái loading của dashboard - cache chưa có data - trạng thái loading sẽ là true
  const [error, setError] = useState<string | null>(null); // trạng thái lỗi của dashboard - nếu có lỗi sẽ hiển thị lỗi

  const [faculty, setFaculty] = useState("all"); // trạng thái khoa của dashboard - mặc định là tất cả
  const [batchId, setBatchId] = useState("all"); // trạng thái đợt thực tập của dashboard - mặc định là tất cả
  const [payload, setPayload] = useState<OverviewPayload | null>(() => getCachedValue<OverviewPayload>(initialKey) ?? null); // trạng thái dữ liệu của dashboard - nếu có dữ liệu sẽ hiển thị dữ liệu

  useEffect(() => { //“TẠO HOOK cho dashboard” - PHẦN XỬ LÝ DỮ LIỆU CỦA dashboard
    let cancelled = false; // biến để kiểm tra xem có bị hủy không - nếu bị hủy sẽ không load dữ liệu
    async function load(opts?: { force?: boolean; silent?: boolean }) {
      const force = Boolean(opts?.force); // biến để kiểm tra xem có bị hủy không - nếu bị hủy sẽ không load dữ liệu
      const silent = Boolean(opts?.silent); // biến để kiểm tra xem có bị hủy không - nếu bị hủy sẽ không load dữ liệu
      const qs = new URLSearchParams();
      if (faculty) qs.set("faculty", faculty); //thêm tham số query vào đối tượng URLSearchParams
      if (batchId) qs.set("batchId", batchId); //thêm tham số query vào đối tượng URLSearchParams
      const cacheKey = adminDashboardCacheKey(faculty, batchId);
      try { //phần try catch để xử lý lỗi
        if (!silent && !hasCachedValue(cacheKey)) setLoading(true); //nếu không silent và không có cached value thì set loading là true
        setError(null); //nếu không có lỗi thì set error là null
        const json = await getOrFetchCached<OverviewPayload>( //gọi API để lấy dữ liệu
          cacheKey,
          async () => { //gọi API để lấy dữ liệu
            const res = await fetch(`/api/admin/dashboard/overview?${qs.toString()}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`); //nếu không có lỗi thì set error là null
            return (await res.json()) as OverviewPayload; //gửi dữ liệu đến component
          },
          { force } //gọi API để lấy dữ liệu
        );
        if (cancelled) return; //nếu bị hủy thì không load dữ liệu
        setPayload(json); //gửi dữ liệu đến component
        setFaculty(json.selectedFaculty ?? "all"); //gửi dữ liệu đến component
        setBatchId(json.selectedBatchId ?? "all"); //gửi dữ liệu đến component
      } catch (e) { //phần catch để xử lý lỗi
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Không thể tải dữ liệu."); //nếu có lỗi thì set error là lỗi
      } finally { //phần finally để xử lý sau khi load dữ liệu
        if (!cancelled && !silent) setLoading(false); //nếu không bị hủy và không silent thì set loading là false
      }
    }
    void load(); //gọi hàm load để load dữ liệu 
    const timer = setInterval(() => { //gọi hàm load để load dữ liệu
      void load({ force: true, silent: true }); //gọi hàm load để load dữ liệu
    }, 30000); //thời gian load dữ liệu
    return () => { //gọi hàm clearInterval để clear interval
      cancelled = true; //biến để kiểm tra xem có bị hủy không - nếu bị hủy sẽ không load dữ liệu
      clearInterval(timer); //gọi hàm clearInterval để clear interval
    };
  }, [faculty, batchId]); //phụ thuộc vào faculty và batchId

  //“TÁCH dữ liệu từ payload ra từng phần để dùng cho UI/chart”
  const faculties = payload?.faculties ?? []; //danh sách khoa
  const batches = payload?.batches ?? []; //danh sách đợt thực tập
  const applicationStatusDonut = payload?.applicationStatusDonut ?? { segments: [], total: 0 }; //danh sách trạng thái ứng tuyển
  const jobStatusDonut = payload?.jobStatusDonut ?? { segments: [], total: 0 }; //danh sách trạng thái tin tuyển dụng
  const enterprisesByField = payload?.enterprisesByField ?? { labels: [], values: [] }; //danh sách doanh nghiệp theo ngành/khoa
  const progress = payload?.progress ?? { labels: [], values: [] }; //danh sách tiến độ thực tập
  const lineJobPosts = payload?.lineJobPosts ?? { labels: [], series: [] }; //danh sách thống kê tổng số bài đăng tuyển dụng theo doanh nghiệp
  const topFaculties = payload?.topFaculties ?? { top: [], bottom: [] }; //danh sách top khoa/ngành có ứng tuyển nhiều nhất

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Tổng quan Admin</h1>
      </header>

      <section className={styles.overviewControls}>
        <div className={styles.overviewControl}>
          <label>Khoa</label>
          <select
            className={styles.overviewSelect}
            value={faculty}
            onChange={(e) => setFaculty(e.target.value)}
            disabled={!payload || faculties.length === 0}
          >
            <option value="all">Tất cả</option>
            {faculties.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>

        <div className={styles.overviewControl}>
          <label>Đợt thực tập</label>
          <select
            className={styles.overviewSelect}
            value={batchId}
            onChange={(e) => setBatchId(e.target.value)}
            disabled={!payload || batches.length === 0}
          >
            {batches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      </section>

      {error ? <div className={styles.statusNote}>Lỗi: {error}</div> : null}
      {loading && !payload ? (
        <ChartStyleLoading variant="block" message="Đang tải dữ liệu…" />
      ) : null}

      {payload ? (
        <section className={styles.overviewGrid}>
          {/* Row 1: Two donuts */}
          <ChartCardShell>
            <article className={styles.card}>
              <h2 className={styles.panelTitle}>Trạng thái hồ sơ ứng tuyển</h2>
              <div className={styles.chartPadding}>
                <DonutChart segments={applicationStatusDonut.segments} />
                <div className={styles.muted} style={{ marginTop: 8, fontSize: 13 }}>
                  Tổng: {applicationStatusDonut.total} hồ sơ
                </div>
              </div>
            </article>
          </ChartCardShell>

          <ChartCardShell>
            <article className={styles.card}>
              <h2 className={styles.panelTitle}>Trạng thái tin tuyển dụng</h2>
              <div className={styles.chartPadding}>
                <DonutChart segments={jobStatusDonut.segments} />
                <div className={styles.muted} style={{ marginTop: 8, fontSize: 13 }}>
                  Tổng: {jobStatusDonut.total} tin
                </div>
              </div>
            </article>
          </ChartCardShell>

          {/* Row 2: Two bars */}
          <ChartCardShell>
            <article className={styles.card}>
              <h2 className={styles.panelTitle}>Số lượng doanh nghiệp liên kết theo ngành/khoa</h2>
              <div className={styles.chartPadding}>
                <BarChart labels={enterprisesByField.labels} values={enterprisesByField.values} />
              </div>
            </article>
          </ChartCardShell>

          <ChartCardShell>
            <article className={styles.card}>
              <h2 className={styles.panelTitle}>Tiến độ thực tập: số lượng sinh viên theo trạng thái</h2>
              <div className={styles.chartPadding}>
                <ProgressColumnChart labels={progress.labels} values={progress.values} />
              </div>
            </article>
          </ChartCardShell>

          {/* Row 3: Line chart full width */}
          <ChartCardShell wide style={{ gridColumn: "1 / -1" }}>
            <article className={styles.card}>
              <h2 className={styles.panelTitle}>Thống kê tổng số bài đăng tuyển dụng theo doanh nghiệp</h2>
              <div className={styles.chartPadding}>
                <LineChart labels={lineJobPosts.labels} series={lineJobPosts.series} />
              </div>
            </article>
          </ChartCardShell>

          {/* Row 4: Top/Bottom tables */}
          <div className={styles.topFieldsGrid}>
            <TopFacultiesCard
              title="Top 5 khoa/ngành có ứng tuyển nhiều nhất"
              items={topFaculties.top}
            />
            <TopFacultiesCard
              title="Top 5 khoa/ngành có ứng tuyển ít nhất"
              items={topFaculties.bottom}
            />
          </div>
        </section>
      ) : null}
    </main>
  );
}
