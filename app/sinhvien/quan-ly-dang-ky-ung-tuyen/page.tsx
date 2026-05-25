"use client";

import { useEffect, useState } from "react";
import adminStyles from "../../admin/styles/dashboard.module.css";
import type { IconType } from "react-icons";
import { DashboardStatSummaryCard } from "@/app/components/DashboardStatSummaryCard";
import { FiClock, FiGift, FiMic, FiXCircle } from "react-icons/fi";
import MessagePopup from "../../components/MessagePopup";
import type {
  RespondAction,
  SinhVienQuanLyDangKyUngTuyenRow,
  StatusFilter
} from "@/lib/types/sinhvien-quan-ly-dang-ky-ung-tuyen";  
import { 
  SINHVIEN_QUAN_LY_DANG_KY_UNG_TUYEN_LOAD_ERROR_DEFAULT,
  SINHVIEN_QUAN_LY_DANG_KY_UNG_TUYEN_RESPOND_NETWORK_ERROR_DEFAULT,
  SINHVIEN_QUAN_LY_DANG_KY_UNG_TUYEN_RESPOND_SUCCESS_DEFAULT
} from "@/lib/constants/sinhvien-quan-ly-dang-ky-ung-tuyen"; //import constants quan ly dang ky ung tuyen
import {
  buildSinhVienQuanLyDangKyUngTuyenRespondEndpoint,
  buildSinhVienQuanLyDangKyUngTuyenListUrl
} from "@/lib/utils/sinhvien-quan-ly-dang-ky-ung-tuyen";
import { getCachedValue, getOrFetchCached, hasCachedValue } from "@/lib/utils/client-query-cache";
import QuanLyUngTuyenToolbar from "./components/QuanLyUngTuyenToolbar";
import QuanLyUngTuyenTableSection from "./components/QuanLyUngTuyenTableSection";
import { ChartStyleLoading } from "@/app/components/ChartStyleLoading";

type StatCard = { //hàm card thống kê
  label: string;
  count: number;
  Icon: IconType;
};

function computeStats(rows: SinhVienQuanLyDangKyUngTuyenRow[]): StatCard[] { //hàm tính số lượng ứng tuyển
  return [
    {
      label: "Chờ xem xét",
      count: rows.filter((r) => r.status === "PENDING_REVIEW").length,
      Icon: FiClock
    },
    {
      label: "Mời phỏng vấn",
      count: rows.filter((r) => r.status === "INTERVIEW_INVITED").length,
      Icon: FiMic
    },
    {
      label: "Trúng tuyển",
      count: rows.filter((r) => r.status === "OFFERED").length,
      Icon: FiGift
    },
    {
      label: "Từ chối",
      count: rows.filter((r) => r.status === "REJECTED" || r.status === "STUDENT_DECLINED").length,
      Icon: FiXCircle
    }
  ];
}

const SV_QL_UT_INIT_URL = buildSinhVienQuanLyDangKyUngTuyenListUrl("all"); //hàm tạo url danh sách ứng tuyển
const SV_QL_UT_INIT_KEY = `sv:ql-ung-tuyen:list:${SV_QL_UT_INIT_URL}`; //hàm tạo key cache danh sách ứng tuyển

function readSvQlUngTuyenInitialRows(): SinhVienQuanLyDangKyUngTuyenRow[] { //hàm lấy danh sách ứng tuyển
  const d = getCachedValue<{ items?: SinhVienQuanLyDangKyUngTuyenRow[] }>(SV_QL_UT_INIT_KEY);
  return Array.isArray(d?.items) ? d.items : [];
}

export default function SinhVienQuanLyUngTuyenPage() { //hàm render trang quan ly ứng tuyển
  const [loading, setLoading] = useState(() => !hasCachedValue(SV_QL_UT_INIT_KEY));
  const [error, setError] = useState("");
  // Always keep full dataset; filter client-side for table display
  const [allRows, setAllRows] = useState<SinhVienQuanLyDangKyUngTuyenRow[]>(readSvQlUngTuyenInitialRows);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [toast, setToast] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load(opts?: { force?: boolean; silent?: boolean }) {
    const force = Boolean(opts?.force);
    const silent = Boolean(opts?.silent);
    try {
      // Always fetch all so we can compute stats regardless of current filter
      const url = buildSinhVienQuanLyDangKyUngTuyenListUrl("all"); //hàm tạo url danh sách ứng tuyển
      const cacheKey = `sv:ql-ung-tuyen:list:${url}`;
      if (!silent && !hasCachedValue(cacheKey)) setLoading(true);
      setError("");
      const data = await getOrFetchCached<any>(
        cacheKey,
        async () => {
          const res = await fetch(url);
          const payload = await res.json();
          if (!res.ok || !payload?.success) throw new Error(payload?.message || SINHVIEN_QUAN_LY_DANG_KY_UNG_TUYEN_LOAD_ERROR_DEFAULT);
          return payload;
        },
        { force }
      );
      setAllRows(Array.isArray(data.items) ? data.items : []);
    } catch (e: unknown) {
      setError(
        e instanceof Error
          ? e.message
          : SINHVIEN_QUAN_LY_DANG_KY_UNG_TUYEN_LOAD_ERROR_DEFAULT
      );
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      void load({ force: true, silent: true });
    }, 30000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function respond(applicationId: string, action: RespondAction) { //hàm phản hồi ứng tuyển
    setBusyId(applicationId);
    try {
      const res = await fetch(buildSinhVienQuanLyDangKyUngTuyenRespondEndpoint(applicationId), { //gọi api phản hồi ứng tuyển
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (!res.ok || !data?.success)
        throw new Error(
          data?.message || SINHVIEN_QUAN_LY_DANG_KY_UNG_TUYEN_RESPOND_NETWORK_ERROR_DEFAULT
        );
      setToast(data?.message || SINHVIEN_QUAN_LY_DANG_KY_UNG_TUYEN_RESPOND_SUCCESS_DEFAULT);
      await load({ force: true });
    } catch (e: unknown) {
      setToast( //trả về lỗi phản hồi ứng tuyển
        e instanceof Error
          ? e.message
          : SINHVIEN_QUAN_LY_DANG_KY_UNG_TUYEN_RESPOND_NETWORK_ERROR_DEFAULT
      );
    } finally {
      setBusyId(null);
    }
  }

  const stats = computeStats(allRows);

  // Client-side filter for table
  const displayRows =
    statusFilter === "all"
      ? allRows
      : allRows.filter((r) => r.status === statusFilter);

  return (
    <main className={adminStyles.page}>
      <header className={adminStyles.header}>
        <h1 className={adminStyles.title}>Quản lý đăng ký ứng tuyển</h1>
        <p className={adminStyles.subtitle}>Theo dõi toàn bộ hồ sơ đã nộp và trạng thái phản hồi.</p>
      </header>

      {error ? <p className={adminStyles.error}>{error}</p> : null}

      {!loading && (
        <div className={adminStyles.statsGrid4}>
          {stats.map((stat) => (
            <DashboardStatSummaryCard
              key={stat.label}
              cardClassName={adminStyles.statCard}
              labelClassName={adminStyles.statLabel}
              valueClassName={adminStyles.statValue}
              label={stat.label}
              value={stat.count}
              Icon={stat.Icon}
            />
          ))}
        </div>
      )}

      <QuanLyUngTuyenToolbar
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        onSearch={() => void load({ force: true })}
      />

      {loading && allRows.length === 0 ? (
        <ChartStyleLoading variant="block" />
      ) : (
        <QuanLyUngTuyenTableSection
          rows={displayRows}
          busyId={busyId}
          onRespond={(id, action) => void respond(id, action)}
        />
      )}

      {toast ? <MessagePopup open message={toast} onClose={() => setToast("")} /> : null}
    </main>
  );
}
