"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import adminStyles from "../../admin/styles/dashboard.module.css";
import { DashboardStatSummaryCard } from "@/app/components/DashboardStatSummaryCard";
import {
  FiActivity,
  FiAlertCircle,
  FiBarChart2,
  FiCheckCircle,
  FiClock,
  FiLayers,
  FiUploadCloud,
  FiXCircle
} from "react-icons/fi";
import MessagePopup from "../../components/MessagePopup";
import type { Degree, InternshipStatus, Row } from "@/lib/types/giangvien-bao-cao-thuc-tap";
import { validateGiangVienBaoCaoApprove } from "@/lib/utils/giangvien-bao-cao-thuc-tap";
import { getOrFetchCached, hasCachedValue } from "@/lib/utils/client-query-cache";
import BaoCaoToolbar from "./components/BaoCaoToolbar";
import BaoCaoTableSection from "./components/BaoCaoTableSection";
const BaoCaoViewPopup = dynamic(() => import("./components/BaoCaoViewPopup"), { ssr: false });
const BaoCaoUpdatePopup = dynamic(() => import("./components/BaoCaoUpdatePopup"), { ssr: false });
const BaoCaoReviewPopup = dynamic(() => import("./components/BaoCaoReviewPopup"), { ssr: false });

export default function GiangvienQuanLyBCPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [q, setQ] = useState("");
  const [degreeFilter, setDegreeFilter] = useState<"all" | Degree>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | InternshipStatus>("all");

  const [rows, setRows] = useState<Row[]>([]);
  const [toast, setToast] = useState("");

  const [latestBatchInternshipStats, setLatestBatchInternshipStats] = useState<{
    batchId: string | null;
    batchName: string | null;
    totalAssigned: number;
    notStarted: number;
    doing: number;
    selfFinanced: number;
    reportSubmitted: number;
    reportRejected: number;
    reportApproved: number;
    internshipCompleted: number;
    reportNotCompleted: number;
  } | null>(null);

  const [viewTarget, setViewTarget] = useState<Row | null>(null);

  const [updateTarget, setUpdateTarget] = useState<Row | null>(null);

  const [reviewTarget, setReviewTarget] = useState<Row | null>(null);
  const [reviewAction, setReviewAction] = useState<"APPROVE" | "REJECT">("APPROVE");
  const [rejectReason, setRejectReason] = useState("");
  const [evaluation, setEvaluation] = useState("");
  const [dqtPoint, setDqtPoint] = useState("");
  const [kthpPoint, setKthpPoint] = useState("");
  const [busy, setBusy] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);

  async function exportFilteredExcel() { //hàm xuất file Excel theo điều kiện
    setExportBusy(true);
    try {
      const params = new URLSearchParams(); //hàm xử lý điều kiện
      if (q.trim()) params.set("q", q.trim());
      if (degreeFilter !== "all") params.set("degree", degreeFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/giangvien/bao-cao-thuc-tap/export?${params.toString()}`);
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { message?: string } | null;
        throw new Error(j?.message || "Không xuất được file Excel.");
      }
      const cd = res.headers.get("Content-Disposition");
      let fn = "bao_cao_thuc_tap_theo_loc.xlsx";
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
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      setToast(e instanceof Error ? e.message : "Không xuất được file Excel.");
    } finally {
      setExportBusy(false);
    }
  }

  async function load(opts?: { force?: boolean; silent?: boolean }) {
    const force = Boolean(opts?.force);
    const silent = Boolean(opts?.silent);
    try {
      const sp = new URLSearchParams();
      if (q.trim()) sp.set("q", q.trim());
      if (degreeFilter !== "all") sp.set("degree", degreeFilter);
      if (statusFilter !== "all") sp.set("status", statusFilter);
      const url = `/api/giangvien/bao-cao-thuc-tap?${sp.toString()}`;
      const cacheKey = `gv:bao-cao:list:${url}`;
      if (!silent && !hasCachedValue(cacheKey)) setLoading(true);
      setError("");
      const data = await getOrFetchCached<any>(
        cacheKey,
        async () => {
          const res = await fetch(url);
          const payload = await res.json();
          if (!res.ok || !payload?.success) throw new Error(payload?.message || "Không thể tải danh sách BCTT.");
          return payload;
        },
        { force }
      );
      setRows(Array.isArray(data.items) ? data.items : []);
      setLatestBatchInternshipStats(data.latestBatchInternshipStats ?? null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Không thể tải danh sách BCTT.");
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
  }, [q, degreeFilter, statusFilter]);

  async function submitUpdateInternship() { //hàm cập nhật trạng thái thực tập tự túc
    if (!updateTarget) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/giangvien/bao-cao-thuc-tap/update-internship-status/${updateTarget.studentProfileId}`, {
        method: "PATCH"
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.message || "Cập nhật thất bại.");
      setUpdateTarget(null);
      setToast(data?.message || "Cập nhật thành công.");
      await load({ force: true });
    } catch (e: unknown) {
      setToast(e instanceof Error ? e.message : "Cập nhật thất bại.");
    } finally {
      setBusy(false);
    }
  }

  async function submitApprove() { //hàm duyệt báo cáo thực tập
    if (!reviewTarget?.report) return;
    const err = validateGiangVienBaoCaoApprove({ reviewTarget, evaluation, dqtPoint, kthpPoint });
    if (err) { setToast(err); return; }
    setBusy(true);
    try {
      const res = await fetch(`/api/giangvien/bao-cao-thuc-tap/${reviewTarget.report.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "APPROVE",
          supervisorEvaluation: evaluation.trim() || null,
          supervisorPoint: Number(dqtPoint.trim()),
          enterpriseEvaluation: null,
          enterprisePoint: reviewTarget.enterprise ? Number(kthpPoint.trim()) : null
        })
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.message || "Duyệt thất bại.");
      setReviewTarget(null);
      setToast(data?.message || "Duyệt thành công.");
      await load({ force: true });
    } catch (e: unknown) {
      setToast(e instanceof Error ? e.message : "Duyệt thất bại.");
    } finally {
      setBusy(false);
    }
  }

  async function submitReject() {
    if (!reviewTarget?.report) return;
    const rr = rejectReason.trim();
    if (!rr) { setToast("Lý do từ chối là bắt buộc."); return; }
    setBusy(true);
    try {
      const res = await fetch(`/api/giangvien/bao-cao-thuc-tap/${reviewTarget.report.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "REJECT", rejectReason: rr })
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.message || "Từ chối thất bại.");
      setReviewTarget(null);
      setRejectReason("");
      setEvaluation("");
      setDqtPoint("");
      setKthpPoint("");
      setToast(data?.message || "Từ chối thành công.");
      await load({ force: true });
    } catch (e: unknown) {
      setToast(e instanceof Error ? e.message : "Từ chối thất bại.");
    } finally {
      setBusy(false);
    }
  }

  const openReview = (r: Row) => {
    setReviewTarget(r);
    setReviewAction("APPROVE");
    setRejectReason("");
    setEvaluation(r.report?.supervisorEvaluation ?? "");
    setDqtPoint(r.report?.supervisorPoint != null ? String(r.report.supervisorPoint) : "");
    setKthpPoint(r.report?.enterprisePoint != null ? String(r.report.enterprisePoint) : "");
  };

  const closeReview = () => {
    setReviewTarget(null);
  };

  function submitReview() {
    if (reviewAction === "REJECT") {
      void submitReject();
      return;
    }
    void submitApprove();
  }

  return (
    <main className={adminStyles.page}>
      <header className={adminStyles.header}>
        <h1 className={adminStyles.title}>Quản lý BCTT</h1>
        <p className={adminStyles.subtitle}>Duyệt/từ chối BCTT và cập nhật trạng thái thực tập cho sinh viên được phân công.</p>
      </header>

      {error ? <p className={adminStyles.error}>{error}</p> : null}

      {!loading && latestBatchInternshipStats?.batchId ? (
        <section aria-label="Thống kê tiến độ thực tập đợt mới nhất">
          <div className={adminStyles.statusNote} style={{ marginBottom: 10 }}>
            Đợt thực tập mới nhất: <strong>{latestBatchInternshipStats.batchName ?? "—"}</strong>
          </div>

          <div className={adminStyles.statsGrid8}>
            <DashboardStatSummaryCard
              cardClassName={adminStyles.statCard}
              labelClassName={adminStyles.statLabel}
              valueClassName={adminStyles.statValue}
              label="Chưa thực tập"
              value={latestBatchInternshipStats.notStarted}
              Icon={FiClock}
            />
            <DashboardStatSummaryCard
              cardClassName={adminStyles.statCard}
              labelClassName={adminStyles.statLabel}
              valueClassName={adminStyles.statValue}
              label="Đang thực tập"
              value={latestBatchInternshipStats.doing}
              Icon={FiActivity}
            />
            <DashboardStatSummaryCard
              cardClassName={adminStyles.statCard}
              labelClassName={adminStyles.statLabel}
              valueClassName={adminStyles.statValue}
              label="Thực tập tự túc"
              value={latestBatchInternshipStats.selfFinanced}
              Icon={FiLayers}
            />
            <DashboardStatSummaryCard
              cardClassName={adminStyles.statCard}
              labelClassName={adminStyles.statLabel}
              valueClassName={adminStyles.statValue}
              label="Đã nộp BCTT"
              value={latestBatchInternshipStats.reportSubmitted}
              Icon={FiUploadCloud}
            />
            <DashboardStatSummaryCard
              cardClassName={adminStyles.statCard}
              labelClassName={adminStyles.statLabel}
              valueClassName={adminStyles.statValue}
              label="Từ chối duyệt BCTT"
              value={latestBatchInternshipStats.reportRejected}
              Icon={FiXCircle}
            />
            <DashboardStatSummaryCard
              cardClassName={adminStyles.statCard}
              labelClassName={adminStyles.statLabel}
              valueClassName={adminStyles.statValue}
              label="Đã hoàn thành BCTT"
              value={latestBatchInternshipStats.reportApproved}
              Icon={FiCheckCircle}
            />
            <DashboardStatSummaryCard
              cardClassName={adminStyles.statCard}
              labelClassName={adminStyles.statLabel}
              valueClassName={adminStyles.statValue}
              label="Hoàn thành thực tập"
              value={latestBatchInternshipStats.internshipCompleted}
              Icon={FiBarChart2}
            />
            <DashboardStatSummaryCard
              cardClassName={adminStyles.statCard}
              labelClassName={adminStyles.statLabel}
              valueClassName={adminStyles.statValue}
              label="Chưa hoàn thành BCTT"
              value={latestBatchInternshipStats.reportNotCompleted}
              Icon={FiAlertCircle}
            />
          </div>
        </section>
      ) : null}

      <BaoCaoToolbar
        q={q}
        degreeFilter={degreeFilter}
        statusFilter={statusFilter}
        busy={busy || exportBusy}
        onQChange={setQ}
        onDegreeFilterChange={setDegreeFilter}
        onStatusFilterChange={setStatusFilter}
        onSearch={() => void load({ force: true })}
        onExportFiltered={() => void exportFilteredExcel()}
      />

      <BaoCaoTableSection
        loading={loading}
        rows={rows}
        busy={busy}
        onView={setViewTarget}
        onUpdate={setUpdateTarget}
        onReview={openReview}
      />

      <BaoCaoViewPopup
        viewTarget={viewTarget}
        onClose={() => setViewTarget(null)}
      />

      <BaoCaoUpdatePopup
        updateTarget={updateTarget}
        busy={busy}
        onConfirm={() => void submitUpdateInternship()}
        onCancel={() => setUpdateTarget(null)}
      />

      <BaoCaoReviewPopup
        reviewTarget={reviewTarget}
        busy={busy}
        reviewAction={reviewAction}
        evaluation={evaluation}
        dqtPoint={dqtPoint}
        kthpPoint={kthpPoint}
        rejectReason={rejectReason}
        onReviewActionChange={setReviewAction}
        onEvaluationChange={setEvaluation}
        onDqtPointChange={setDqtPoint}
        onKthpPointChange={setKthpPoint}
        onRejectReasonChange={setRejectReason}
        onConfirm={submitReview}
        onClose={closeReview}
      />

      {toast ? (
        <MessagePopup
          open
          title="Thông báo"
          message={toast}
          onClose={() => setToast("")}
          actions={
            <button type="button" className={`${adminStyles.btn} ${adminStyles.btnPrimary}`} onClick={() => setToast("")}>
              Đóng
            </button>
          }
        />
      ) : null}
    </main>
  );
}
