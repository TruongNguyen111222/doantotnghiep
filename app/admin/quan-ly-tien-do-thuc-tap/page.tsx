"use client";

import { useEffect, useState } from "react";
import styles from "../styles/dashboard.module.css";
import { DashboardStatSummaryCard } from "@/app/components/DashboardStatSummaryCard";
import MessagePopup from "../../components/MessagePopup";
import {
  FiActivity,
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiFileText,
  FiLayers
} from "react-icons/fi";

import type { Detail, ListRow } from "@/lib/types/admin-quan-ly-tien-do-thuc-tap";
import { getOrFetchCached, hasCachedValue } from "@/lib/utils/client-query-cache";

import AdminTienDoToolbar from "./components/AdminTienDoToolbar";
import AdminTienDoTableSection from "./components/AdminTienDoTableSection";
import AdminTienDoViewPopup from "./components/AdminTienDoViewPopup";
import AdminTienDoEditModal from "./components/AdminTienDoEditModal";

export default function AdminTienDoThucTapPage() { //hàm tạo trang quản lý tiến độ thực tập
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [page, setPage] = useState(1);
  const [items, setItems] = useState<ListRow[]>([]);
  const [progressStats, setProgressStats] = useState<{
    notStarted: number;
    doing: number;
    selfFinanced: number;
    approvedReport: number;
    completed: number;
    notCompletedInternship: number;
  } | null>(null);

  const [faculties, setFaculties] = useState<string[]>([]);

  const [q, setQ] = useState("");
  const [filterFaculty, setFilterFaculty] = useState("all");
  const [filterDegree, setFilterDegree] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all"); // includes APPROVED_REPORT

  const [viewOpen, setViewOpen] = useState(false);
  const [viewTarget, setViewTarget] = useState<Detail | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Detail | null>(null);
  const [finalStatusDraft, setFinalStatusDraft] = useState<"COMPLETED" | "REJECTED">("COMPLETED");

  const [busyId, setBusyId] = useState<string | null>(null);
  const [exportBusy, setExportBusy] = useState(false);
  const [toast, setToast] = useState("");

  const fetchProgressDetailCached = async (id: string, force = false) => //hàm lấy chi tiết tiến độ thực tập từ cache
    getOrFetchCached<any>(
      `admin:tien-do:detail:${id}`,
      async () => {
        const res = await fetch(`/api/admin/tien-do-thuc-tap/${id}`);
        const payload = await res.json();
        if (!res.ok || !payload?.success || !payload?.item) {
          throw new Error(payload?.message || "Không thể tải thông tin tiến độ.");
        }
        return payload;
      },
      { force }
    );
 
  async function load(opts?: { force?: boolean; silent?: boolean }) { //hàm tải dữ liệu tiến độ thực tập
    const force = Boolean(opts?.force);
    const silent = Boolean(opts?.silent);
    try {
      const sp = new URLSearchParams();
      if (q.trim()) sp.set("q", q.trim());
      if (filterFaculty !== "all") sp.set("faculty", filterFaculty);
      if (filterDegree !== "all") sp.set("degree", filterDegree);
      if (filterStatus !== "all") sp.set("status", filterStatus);
      const url = `/api/admin/tien-do-thuc-tap?${sp.toString()}`; //url tải dữ liệu tiến độ thực tập
      const cacheKey = `admin:tien-do:list:${url}`; //key cache tải dữ liệu tiến độ thực tập
      if (!silent && !hasCachedValue(cacheKey)) setLoading(true);
      setError("");
      const data = await getOrFetchCached<any>(
        cacheKey,
        async () => {
          const res = await fetch(url);
          const payload = await res.json();
          if (!res.ok || !payload?.success) throw new Error(payload?.message || "Không thể tải dữ liệu.");
          return payload;
        },
        { force }
      );

      setItems(Array.isArray(data.items) ? data.items : []); //set dữ liệu tiến độ thực tập vào items
      setFaculties(Array.isArray(data.faculties) ? data.faculties : []); //set dữ liệu khoa vào faculties
      setProgressStats(data.progressStats ?? null); //set dữ liệu thống kê tiến độ thực tập vào progressStats
      setPage(1);
    } catch (e: any) {
      setError(e?.message || "Không thể tải dữ liệu.");
      setProgressStats(null);
    } finally {
      if (!silent) setLoading(false);
    }
  }

  async function openView(row: ListRow) { //hàm mở popup xem chi tiết tiến độ thực tập
    try {
      const data = await fetchProgressDetailCached(row.id); //lấy chi tiết tiến độ thực tập từ cache
      setViewTarget(data.item as Detail);
      setViewOpen(true);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Không thể tải thông tin tiến độ.");
    }
  }

  async function openEdit(row: ListRow) { //hàm mở popup cập nhật trạng thái cuối cùng
    if (!row.canFinalUpdate) return;
    try {
      const data = await fetchProgressDetailCached(row.id); //lấy chi tiết tiến độ thực tập từ cache
      setEditTarget(data.item as Detail);
      setFinalStatusDraft("COMPLETED");
      setEditOpen(true);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Không thể tải thông tin để cập nhật.");
    }
  }

  async function exportFilteredExcel() { //hàm xuất file Excel theo điều kiện lọc
    setExportBusy(true);
    try {
      const params = new URLSearchParams(); //tạo đối tượng URLSearchParams để lưu các tham số query
      if (q.trim()) params.set("q", q.trim());
      if (filterFaculty !== "all") params.set("faculty", filterFaculty); //thêm tham số faculty vào query
      if (filterDegree !== "all") params.set("degree", filterDegree); //thêm tham số degree vào query
      if (filterStatus !== "all") params.set("status", filterStatus); //thêm tham số status vào query
      const res = await fetch(`/api/admin/tien-do-thuc-tap/export?${params.toString()}`); //gửi request xuất file Excel
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { message?: string } | null;
        throw new Error(j?.message || "Không xuất được file Excel.");
      }
      const cd = res.headers.get("Content-Disposition");
      let fn = "tien_do_thuc_tap_theo_loc.xlsx";
      if (cd) {
        const star = /filename\*=UTF-8''([^;\s]+)/i.exec(cd);
        if (star?.[1]) {
          try {
            fn = decodeURIComponent(star[1]);
          } catch {
            fn = star[1];
          }
        } else {
          const plain = /filename="([^"]+)"/i.exec(cd);
          if (plain?.[1]) fn = plain[1];
        }
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fn;
      document.body.appendChild(a);
      a.click(); //click vào link để tải file Excel
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Không xuất được file Excel.");
    } finally {
      setExportBusy(false);
    }
  }

  async function submitEdit() { //hàm gửi dữ liệu cập nhật trạng thái cuối cùng
    if (!editTarget) return; //nếu không có dữ liệu cập nhật thì không xử lý
    if (!editTarget.ui.canFinalUpdate) return; //nếu không có quyền cập nhật thì không xử lý

    setBusyId(editTarget.student.id);
    try {
      const res = await fetch(`/api/admin/tien-do-thuc-tap/${editTarget.student.id}`, { //gửi request cập nhật trạng thái cuối cùng từ API
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ finalStatus: finalStatusDraft })
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.message || "Cập nhật thất bại.");

      setEditOpen(false);
      setToast(data?.message || "Cập nhật thành công.");
      await load({ force: true });
    } catch (e: any) {
      setToast(e?.message || "Cập nhật thất bại.");
    } finally {
      setBusyId(null);
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
  }, [q, filterFaculty, filterDegree, filterStatus]);

  useEffect(() => {
    if (!items.length) return;
    void Promise.allSettled(items.map((row) => fetchProgressDetailCached(row.id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  return ( //render trang quản lý tiến độ thực tập
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Quản lý tiến độ thực tập</h1>
      </header>

      {error ? <p className={styles.error}>{error}</p> : null}

      {progressStats ? (
        <section aria-label="Thống kê trạng thái thực tập">
          <div className={styles.statsGrid3}>
            <DashboardStatSummaryCard
              cardClassName={styles.statCard}
              labelClassName={styles.statLabel}
              valueClassName={styles.statValue}
              label="Chưa thực tập"
              value={progressStats.notStarted}
              Icon={FiClock}
            />
            <DashboardStatSummaryCard
              cardClassName={styles.statCard}
              labelClassName={styles.statLabel}
              valueClassName={styles.statValue}
              label="Đang thực tập"
              value={progressStats.doing}
              Icon={FiActivity}
            />
            <DashboardStatSummaryCard
              cardClassName={styles.statCard}
              labelClassName={styles.statLabel}
              valueClassName={styles.statValue}
              label="Thực tập tự túc"
              value={progressStats.selfFinanced}
              Icon={FiLayers}
            />
            <DashboardStatSummaryCard
              cardClassName={styles.statCard}
              labelClassName={styles.statLabel}
              valueClassName={styles.statValue}
              label="Đã hoàn thành BCTT"
              value={progressStats.approvedReport}
              Icon={FiFileText}
            />
            <DashboardStatSummaryCard
              cardClassName={styles.statCard}
              labelClassName={styles.statLabel}
              valueClassName={styles.statValue}
              label="Hoàn thành thực tập"
              value={progressStats.completed}
              Icon={FiCheckCircle}
            />
            <DashboardStatSummaryCard
              cardClassName={styles.statCard}
              labelClassName={styles.statLabel}
              valueClassName={styles.statValue}
              label="Chưa hoàn thành thực tập"
              value={progressStats.notCompletedInternship}
              Icon={FiAlertCircle}
            />
          </div>
        </section>
      ) : null}

      <AdminTienDoToolbar
        q={q}
        filterFaculty={filterFaculty}
        filterStatus={filterStatus}
        filterDegree={filterDegree}
        faculties={faculties}
        busy={busyId !== null || exportBusy}
        onChangeQ={setQ}
        onChangeFilterFaculty={setFilterFaculty}
        onChangeFilterStatus={setFilterStatus}
        onChangeFilterDegree={setFilterDegree}
        onSearch={() => void load({ force: true })}
        onExportFiltered={() => void exportFilteredExcel()}
      />

      <AdminTienDoTableSection
        loading={loading}
        items={items}
        page={page}
        busyId={busyId}
        onPageChange={setPage}
        onView={(row) => void openView(row)}
        onEdit={(row) => void openEdit(row)}
      />

      <AdminTienDoViewPopup
        open={viewOpen}
        item={viewTarget}
        onClose={() => { setViewOpen(false); setViewTarget(null); }}
      />

      <AdminTienDoEditModal
        open={editOpen}
        item={editTarget}
        finalStatusDraft={finalStatusDraft}
        busy={busyId !== null}
        onClose={() => { setEditOpen(false); setEditTarget(null); }}
        onSubmit={() => void submitEdit()}
        onChangeFinalStatus={setFinalStatusDraft}
      />

      {toast ? (
        <MessagePopup
          open
          title="Thông báo"
          message={toast}
          onClose={() => setToast("")}
          actions={
            <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setToast("")}>
              Đóng
            </button>
          }
        />
      ) : null}
    </main>
  );
}

