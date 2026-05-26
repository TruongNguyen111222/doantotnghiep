"use client";

import { useEffect, useState } from "react";
import adminStyles from "../../admin/styles/dashboard.module.css";
import { DashboardStatSummaryCard } from "@/app/components/DashboardStatSummaryCard";
import { FiClock, FiGift, FiMic, FiXCircle } from "react-icons/fi";
import type { JobRow, JobStatus } from "@/lib/types/doanhnghiep-ung-vien"; //kiểu dữ liệu cho dòng tin tuyển dụng và trạng thái tin tuyển dụng
import {
  DOANHNGHIEP_UNG_VIEN_ERROR_DEFAULT,
  DOANHNGHIEP_UNG_VIEN_PAGE_SIZE
} from "@/lib/constants/doanhnghiep-ung-vien"; //constants cho danh sách tin tuyển dụng 
import { DOANHNGHIEP_UNG_VIEN_DETAIL_PAGE_SIZE } from "@/lib/constants/doanhnghiep-ung-vien-detail"; //constants cho chi tiết tin tuyển dụng
import { buildDoanhNghiepUngVienListUrl, getDoanhNghiepUngVienLoadErrorMessage } from "@/lib/utils/doanhnghiep-ung-vien"; //utils cho danh sách tin tuyển dụng
import { getCachedValue, getOrFetchCached, hasCachedValue } from "@/lib/utils/client-query-cache";
import UngVienToolbar from "./components/UngVienToolbar"; //component cho toolbar danh sách tin tuyển dụng
import UngVienTableSection from "./components/UngVienTableSection"; //component cho table danh sách tin tuyển dụng

type AppStats = { //kiểu dữ liệu cho thống kê số lượng tin tuyển dụng
  PENDING_REVIEW: number;
  INTERVIEW_INVITED: number;
  OFFERED: number;
  REJECTED: number;
  STUDENT_DECLINED: number;
};

const EMPTY_APP_STATS: AppStats = { //giá trị mặc định cho thống kê số lượng tin tuyển dụng 
  PENDING_REVIEW: 0, INTERVIEW_INVITED: 0, OFFERED: 0, REJECTED: 0, STUDENT_DECLINED: 0
};
 
function defaultListPage1CacheKey(): string | null {
  if (typeof window === "undefined") return null;
  const url = buildDoanhNghiepUngVienListUrl({
    origin: window.location.origin,
    q: "",
    createdDate: "",
    deadlineDate: "",
    status: "all"
  });
  url.searchParams.set("page", "1");
  url.searchParams.set("pageSize", String(DOANHNGHIEP_UNG_VIEN_PAGE_SIZE));
  return `enterprise:ung-vien:list:${url.toString()}`;
}
// * 1. Khởi tạo các State quản lý Dữ liệu và Trạng thái tải của trang (Ưu tiên lấy từ Cache)
export default function DoanhNghiepUngVienPage() {
  const [loading, setLoading] = useState(() => {
    const key = defaultListPage1CacheKey();
    return key ? !hasCachedValue(key) : true;
  });
  const [error, setError] = useState("");
  const [items, setItems] = useState<JobRow[]>(() => {
    const key = defaultListPage1CacheKey();
    if (!key) return [];
    const data = getCachedValue<{ items?: JobRow[] }>(key);
    return Array.isArray(data?.items) ? data.items : [];
  });
  const [appStats, setAppStats] = useState<AppStats>(() => {
    const key = defaultListPage1CacheKey();
    if (!key) return EMPTY_APP_STATS;
    const data = getCachedValue<{ appStats?: AppStats }>(key);
    return data?.appStats ?? EMPTY_APP_STATS;
  });

  const [q, setQ] = useState("");
  const [createdDate, setCreatedDate] = useState("");
  const [deadlineDate, setDeadlineDate] = useState("");
  const [status, setStatus] = useState<JobStatus | "all">("all");

  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(() => {
    const key = defaultListPage1CacheKey();
    if (!key) return 0;
    const data = getCachedValue<{ totalItems?: number }>(key);
    return Number(data?.totalItems || 0);
  });
  // * 2. Hàm load() để tải dữ liệu danh sách tin tuyển dụng từ API và cập nhật State
  async function load(nextPage = 1, opts?: { force?: boolean; silent?: boolean }) {
    const force = Boolean(opts?.force);
    const silent = Boolean(opts?.silent);
    try {
      // Xây dựng URL endpoint kèm theo các tham số bộ lọc và phân trang hiện tại
      const url = buildDoanhNghiepUngVienListUrl({
        origin: window.location.origin,
        q,
        createdDate,
        deadlineDate,
        status
      });
      url.searchParams.set("page", String(nextPage));
      url.searchParams.set("pageSize", String(DOANHNGHIEP_UNG_VIEN_PAGE_SIZE));
      const cacheKey = `enterprise:ung-vien:list:${url.toString()}`;
      // Nếu không phải tiến trình tải ngầm và chưa có dữ liệu trong cache thì hiển thị màn hình loading
      if (!silent && !hasCachedValue(cacheKey)) setLoading(true);
      setError("");
      const data = await getOrFetchCached<any>(
        cacheKey,
        async () => {
          const res = await fetch(url.toString()); //gọi API danh sách tin tuyển dụng 
          const payload = await res.json();
          if (!res.ok || !payload?.success) throw new Error(payload?.message || DOANHNGHIEP_UNG_VIEN_ERROR_DEFAULT);
          return payload;
        },
        { force }
      );
      // Cập nhật dữ liệu mới nhận được vào các State tương ứng
      setItems(Array.isArray(data.items) ? data.items : []);
      if (data.appStats) setAppStats(data.appStats as AppStats);
      setTotalItems(Number(data.totalItems || 0));
      setPage(nextPage);
    } catch (e: unknown) {
      setError(getDoanhNghiepUngVienLoadErrorMessage(e));
    } finally {
      if (!silent) setLoading(false);
    }
  }
 
  useEffect(() => {
    void load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      void load(page, { force: true, silent: true });
    }, 30000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, q, createdDate, deadlineDate, status]);

  // * Tự động tải trước thông tin chi tiết ứng viên của tất cả các tin tuyển dụng hiển thị trên bảng
  useEffect(() => { // * 3. Hàm useEffect để tải dữ liệu chi tiết ứng viên cho mỗi tin tuyển dụng
    if (!items.length) return;
    void Promise.allSettled(
      items.map((row) => {
        const url = `/api/doanhnghiep/ung-vien/${row.id}?page=1&pageSize=${DOANHNGHIEP_UNG_VIEN_DETAIL_PAGE_SIZE}`;
        const cacheKey = `enterprise:ung-vien:detail:${row.id}:1`;
        return getOrFetchCached(cacheKey, async () => {
          const res = await fetch(url);
          const payload = await res.json();
          if (!res.ok || !payload?.success) throw new Error(payload?.message || DOANHNGHIEP_UNG_VIEN_ERROR_DEFAULT);
          return payload;
        });
      })
    );
  }, [items]);
// * 4. Render Component chính với các Section tương ứng cho Toolbar, Table và Stat cards
  return (
    <main className={adminStyles.page}>
      <header className={adminStyles.header}>
        <h1 className={adminStyles.title}>Quản lý ứng viên</h1>
        <p className={adminStyles.subtitle}>Theo dõi số lượng ứng viên ứng tuyển theo từng tin và xem chi tiết hồ sơ.</p>
      </header>

      {error ? <p className={adminStyles.error}>{error}</p> : null}

      {/* Stat cards: application status counts — đồng bộ admin (statsGrid4 + pastel) */}
      {!loading && (
        <div className={adminStyles.statsGrid4}>
          {[
            { label: "Chờ xem xét", count: appStats.PENDING_REVIEW, Icon: FiClock },
            { label: "Mời phỏng vấn", count: appStats.INTERVIEW_INVITED, Icon: FiMic },
            { label: "Trúng tuyển", count: appStats.OFFERED, Icon: FiGift },
            { label: "Từ chối", count: appStats.REJECTED + appStats.STUDENT_DECLINED, Icon: FiXCircle }
          ].map((s) => (
            <DashboardStatSummaryCard
              key={s.label}
              cardClassName={adminStyles.statCard}
              labelClassName={adminStyles.statLabel}
              valueClassName={adminStyles.statValue}
              label={s.label}
              value={s.count}
              Icon={s.Icon}
            />
          ))}
        </div>
      )}

      <UngVienToolbar
        q={q}
        createdDate={createdDate}
        deadlineDate={deadlineDate}
        status={status}
        loading={loading}
        onQChange={setQ}
        onCreatedDateChange={setCreatedDate}
        onDeadlineDateChange={setDeadlineDate}
        onStatusChange={setStatus}
        onSearch={() => void load(1, { force: true })}
      />

      <UngVienTableSection
        loading={loading}
        items={items}
        totalItems={totalItems}
        page={page}
        onPageChange={(p) => void load(p, { force: true })}
      />
    </main>
  );
}
