"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import adminStyles from "../../admin/styles/dashboard.module.css";
import { DashboardStatSummaryCard } from "@/app/components/DashboardStatSummaryCard";
import MessagePopup from "../../components/MessagePopup";
import { FiClock, FiPauseCircle, FiXCircle, FiZap } from "react-icons/fi";
import type { AdminEnterpriseDetail } from "@/lib/types/admin";
import type { ApiResponse, JobDetailResponse, JobFormState, JobListItem, JobStatus } from "@/lib/types/doanhnghiep-tuyen-dung";
import { DOANHNGHIEP_TUYEN_DUNG_PAGE_SIZE } from "@/lib/constants/doanhnghiep-tuyen-dung"; //số lượng tin tuyển dụng trên mỗi trang
import { metaRecord } from "@/lib/utils/enterprise-meta"; //hàm xử lý meta doanh nghiệp
import {
  buildEmptyJobFormState,
  buildJobCreatePayload,
  buildJobEditPayload,
  buildJobFormForAdd,
  buildJobFormForEdit,
  validateJobForm
} from "@/lib/utils/doanhnghiep-tuyen-dung"; //validation form trc khi gửi lên API
import { deleteCacheByPrefix, getOrFetchCached, hasCachedValue } from "@/lib/utils/client-query-cache";
import TuyenDungToolbar from "./components/TuyenDungToolbar"; //component toolbar tuyển dụng
import TuyenDungTableSection from "./components/TuyenDungTableSection"; //component table tuyển dụng
const TuyenDungViewPopup = dynamic(() => import("./components/TuyenDungViewPopup"), { ssr: false });
const TuyenDungStopPopup = dynamic(() => import("./components/TuyenDungStopPopup"), { ssr: false });
const TuyenDungDeletePopup = dynamic(() => import("./components/TuyenDungDeletePopup"), { ssr: false });
const TuyenDungAddPopup = dynamic(() => import("./components/TuyenDungAddPopup"), { ssr: false });
const TuyenDungEditPopup = dynamic(() => import("./components/TuyenDungEditPopup"), { ssr: false });

/* KHỐI 1: KHAI BÁO CÁC STATE QUẢN LÝ GIAO DIỆN CHUNG & BỘ LỌC (UI, FILTERS & UTILITIES STATE) */
export default function DoanhNghiepTuyenDungPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<JobListItem[]>([]);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [facultyOptions, setFacultyOptions] = useState<string[]>([]);

  const [searchQ, setSearchQ] = useState("");
  const [searchDate, setSearchDate] = useState("");
  const [searchStatus, setSearchStatus] = useState<"all" | JobStatus>("all");

  const [busyId, setBusyId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [statusStats, setStatusStats] = useState({ PENDING: 0, REJECTED: 0, ACTIVE: 0, STOPPED: 0 });
/* KHỐI 2: KHAI BÁO CÁC STATE ĐIỀU KHIỂN HÀNH ĐỘNG POPUP (VIEW, EDIT, ADD, STOP, DELETE POPUPS STATE) */
  const [viewJob, setViewJob] = useState<JobDetailResponse | null>(null);
  const [viewLoading, setViewLoading] = useState(false);

  const [stopTarget, setStopTarget] = useState<JobListItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<JobListItem | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<JobListItem | null>(null);
  const [editDetail, setEditDetail] = useState<JobDetailResponse | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  const [enterpriseDefaults, setEnterpriseDefaults] = useState<{
    intro: string;
    website: string;
    address: { provinceCode: string; wardCode: string; provinceName: string; wardName: string; addressDetail: string };
  }>({
    intro: "",
    website: "",
    address: { provinceCode: "", wardCode: "", provinceName: "", wardName: "", addressDetail: "" }
  });

  const [form, setForm] = useState<JobFormState>(() => buildEmptyJobFormState());
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
/* KHỐI 3: CÁC HÀM TRỢ GIÚP DỮ LIỆU & CACHE (HELPER FUNCTIONS & FORM UTILS) */
  const fetchJobDetailCached = async (id: string, force = false) =>
    getOrFetchCached<any>(
      `enterprise:tuyen-dung:detail:${id}`,
      async () => {
        const res = await fetch(`/api/doanhnghiep/tuyen-dung/${id}`); //gọi API chi tiết tin tuyển dụng
        const payload = (await res.json()) as ApiResponse<JobDetailResponse>;
        if (!res.ok || !payload.success || !payload.item) throw new Error(payload.message || "Không tải được chi tiết tin tuyển dụng.");
        return payload;
      },
      { force }
    );

  const handleFormChange = (updates: Partial<JobFormState>) => {
    setForm((prev) => ({ ...prev, ...updates }));
  };
/* KHỐI 4: NHÓM HÀM GỌI API LẤY DANH SÁCH & THÔNG TIN DOANH NGHIỆP (DATA FETCHING ACTIONS) */
  const loadEnterpriseDefaults = async () => {
    const res = await fetch("/api/doanhnghiep/me");
    const data = (await res.json()) as ApiResponse<AdminEnterpriseDetail>;
    if (!res.ok || !data.success || !data.item) return;
    const m = metaRecord(data.item.enterpriseMeta);
    const website = typeof m.website === "string" ? m.website : "";
    setEnterpriseDefaults({
      intro: "",
      website,
      address: {
        provinceCode: typeof m.provinceCode === "string" ? m.provinceCode : "",
        wardCode: typeof m.wardCode === "string" ? m.wardCode : "",
        provinceName: typeof m.province === "string" ? m.province : "",
        wardName: typeof m.ward === "string" ? m.ward : "",
        addressDetail: typeof m.addressDetail === "string" ? m.addressDetail : ""
      }
    });
  };
/* KHỐI 5: NHÓM HÀM TẢI DỮ LIỆU TUYỂN DỤNG (DATA LOADING ACTIONS) */
  const load = async (params?: { q?: string; date?: string; status?: "all" | JobStatus; page?: number }, opts?: { force?: boolean; silent?: boolean }) => {
    const force = Boolean(opts?.force); 
    const silent = Boolean(opts?.silent);
    try {
      const url = new URL("/api/doanhnghiep/tuyen-dung", window.location.origin); //tạo URL để gọi API danh sách tin tuyển dụng
      if (params?.q !== undefined) url.searchParams.set("q", params.q || "");
      if (params?.date) url.searchParams.set("date", params.date);
      if (params?.status) url.searchParams.set("status", params.status);
      const nextPage = params?.page ?? page;
      url.searchParams.set("page", String(nextPage));
      url.searchParams.set("pageSize", String(DOANHNGHIEP_TUYEN_DUNG_PAGE_SIZE));
      const cacheKey = `enterprise:tuyen-dung:list:${url.toString()}`;
      if (!silent && !hasCachedValue(cacheKey)) setLoading(true);
      setError("");
      const data = await getOrFetchCached<any>(
        cacheKey,
        async () => {
          const res = await fetch(url.toString()); //gọi API danh sách tin tuyển dụng
          const payload = await res.json();
          if (!res.ok || !payload.success) throw new Error(payload.message || "Không tải được tin tuyển dụng.");
          return payload;
        },
        { force }
      );
      setItems((data.items || []) as JobListItem[]);
      setTotalItems(Number(data.totalItems || 0));
      setStatusStats(data.statusStats || { PENDING: 0, REJECTED: 0, ACTIVE: 0, STOPPED: 0 });
      setPage(nextPage);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi.");
      setItems([]);
      setTotalItems(0);
    } finally {
      if (!silent) setLoading(false);
    }
  };
/* KHỐI 6: NHÓM HÀM TẢI LẠI DỮ LIỆU TUYỂN DỤNG (DATA REFRESH ACTIONS) */
  const refresh = async () => {
    await load({ q: searchQ, date: searchDate, status: searchStatus, page }, { force: true });
  };
/* KHỐI 7: NHÓM HÀM TẢI DỮ LIỆU KHOA (FACULTY DATA LOADING ACTIONS) */
  useEffect(() => {
    void (async () => {
      await loadEnterpriseDefaults(); //tải dữ liệu doanh nghiệp mặc định
      try {
        const res = await fetch("/api/public/faculties"); //gọi API danh sách khoa
        const data = await res.json();
        setFacultyOptions(Array.isArray(data?.faculties) ? data.faculties : []);
      } catch {
        setFacultyOptions([]);
      }
      await load({ q: searchQ, date: searchDate, status: searchStatus, page: 1 }, { force: true });
    })();
  }, []);

  useEffect(() => { //hàm tải dữ liệu khoa khi trang thay đổi
    const timer = setInterval(() => {
      void load({ q: searchQ, date: searchDate, status: searchStatus, page }, { force: true, silent: true });
    }, 30000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQ, searchDate, searchStatus, page]);

  useEffect(() => { //hàm tải dữ liệu tin tuyển dụng khi danh sách tin tuyển dụng thay đổi
    if (!items.length) return;
    void Promise.allSettled(items.map((row) => fetchJobDetailCached(row.id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const resetFormForAdd = () => { //hàm reset form thêm tin tuyển dụng
    setFieldErrors({});
    setForm(buildJobFormForAdd({ enterpriseDefaults }));
  };

  const resetFormForEdit = (detail: JobDetailResponse) => { //hàm reset form sửa tin tuyển dụng
    setFieldErrors({});
    setForm(buildJobFormForEdit({ detail, enterpriseDefaults }));
  };

  const validateForm = (): boolean => { //hàm kiểm tra dữ liệu form tuyển dụng
    const { isValid, errors } = validateJobForm(form); 
    setFieldErrors(errors);
    return isValid;
  };

  const openView = async (row: JobListItem) => { //hàm mở popup xem chi tiết tin tuyển dụng
    setViewJob(null);
    setViewLoading(true);
    try {
      const data = await fetchJobDetailCached(row.id);
      setViewJob(data.item);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Lỗi.");
    } finally {
      setViewLoading(false);
    }
  };

  const openEdit = async (row: JobListItem) => { //hàm mở popup sửa tin tuyển dụng
    setEditTarget(row);
    setEditDetail(null);
    setEditLoading(true);
    try {
      const data = await fetchJobDetailCached(row.id);
      setEditDetail(data.item);
      resetFormForEdit(data.item);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Lỗi tải chi tiết.");
      setEditTarget(null);
    } finally {
      setEditLoading(false);
    }
  };

  const submitCreate = async () => { //hàm gửi dữ liệu thêm tin tuyển dụng
    setFieldErrors({});
    if (!validateForm()) return;
    setBusyId("add");
    setToast("");
    try {
      const res = await fetch("/api/doanhnghiep/tuyen-dung", { //gọi API thêm tin tuyển dụng
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildJobCreatePayload(form)) //gửi dữ liệu form tuyển dụng lên API
      });
      const data = (await res.json()) as ApiResponse<unknown>;
      if (!res.ok) {
        const maybeErrors = (data as { errors?: Record<string, string> })?.errors;
        if (maybeErrors && typeof maybeErrors === "object") { setFieldErrors(maybeErrors); return; }
        setToast(data.message || "Tạo tin thất bại.");
        return;
      }
      setToast(data.message || "Tạo tin tuyển dụng thành công."); 
      setAddOpen(false);
      deleteCacheByPrefix("enterprise:tuyen-dung:");
      await refresh();
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Tạo tin thất bại.");
    } finally {
      setBusyId(null);
    }
  };

  const submitEdit = async () => { //hàm gửi dữ liệu sửa tin tuyển dụng
    if (!editTarget) return;
    setFieldErrors({});
    if (!validateForm()) return;
    setBusyId(editTarget.id);
    setToast("");
    try {
      const res = await fetch(`/api/doanhnghiep/tuyen-dung/${editTarget.id}`, { //gọi API sửa tin tuyển dụng
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildJobEditPayload(form)) //gửi dữ liệu form tuyển dụng lên API
      });
      const data = (await res.json()) as ApiResponse<unknown>;
      if (!res.ok) {
        const maybeErrors = (data as { errors?: Record<string, string> })?.errors;
        if (maybeErrors && typeof maybeErrors === "object") { setFieldErrors(maybeErrors); return; }
        setToast(data.message || "Sửa tin thất bại.");
        return;
      }
      setToast(data.message || "Sửa tin tuyển dụng thành công."); //set thông báo thành công vào state
      setEditTarget(null);
      setEditDetail(null); //reset form sửa tin tuyển dụng
      deleteCacheByPrefix("enterprise:tuyen-dung:"); //xóa cache tin tuyển dụng
      await refresh(); //tải lại danh sách tin tuyển dụng
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Sửa tin thất bại.");
    } finally {
      setBusyId(null);
    }
  };

  const doStop = async () => { //hàm gửi dữ liệu dừng hoạt động tin tuyển dụng
    if (!stopTarget) return;
    setBusyId(stopTarget.id);
    setToast("");
    try {
      const res = await fetch(`/api/doanhnghiep/tuyen-dung/${stopTarget.id}/status`, { //gọi API dừng hoạt động tin tuyển dụng
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stop" }) //gửi dữ liệu action dừng hoạt động lên API
      });
      const data = (await res.json()) as ApiResponse<unknown>;
      if (!res.ok) throw new Error(data.message || "Dừng hoạt động thất bại.");
      setToast(data.message || "Đã dừng hoạt động.");
      setStopTarget(null);
      deleteCacheByPrefix("enterprise:tuyen-dung:");
      await refresh();
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Dừng hoạt động thất bại.");
    } finally {
      setBusyId(null);
    }
  };

  const doDelete = async () => { //hàm gửi dữ liệu xóa tin tuyển dụng
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    setToast("");
    try {
      const res = await fetch(`/api/doanhnghiep/tuyen-dung/${deleteTarget.id}`, { method: "DELETE" }); //gọi API xóa tin tuyển dụng
      const data = (await res.json()) as ApiResponse<unknown>;
      if (!res.ok) { setToast(data.message || "Xóa thất bại."); return; }
      setToast(data.message || "Xóa tin tuyển dụng thành công.");
      setDeleteTarget(null);
      deleteCacheByPrefix("enterprise:tuyen-dung:");
      await refresh();
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Xóa thất bại.");
    } finally {
      setBusyId(null);
    }
  };

  const openAdd = async () => { //hàm mở popup thêm tin tuyển dụng
    setToast("");
    try {
      const res = await fetch("/api/doanhnghiep/tuyen-dung/open-batch"); //gọi API kiểm tra đợt thực tập
      const data = (await res.json()) as ApiResponse<unknown>;
      if (!res.ok || !data.success) throw new Error(data.message || "Lỗi kiểm tra đợt thực tập.");
      if (!data.hasOpenBatch) {
        setToast("Phòng đào tạo chưa mở đợt thực tập. Vui lòng chờ đến khi mở đợt thực tập");
        return;
      }
      resetFormForAdd();
      setAddOpen(true);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Không thể mở form tạo tin.");
    }
  };

  // Stats computed from ALL items (before status filter)
  const statCards = [ //hàm tính toán thống kê tin tuyển dụng
    { label: "Chờ duyệt", status: "PENDING" as const, Icon: FiClock },
    { label: "Từ chối duyệt", status: "REJECTED" as const, Icon: FiXCircle },
    { label: "Đang hoạt động", status: "ACTIVE" as const, Icon: FiZap },
    { label: "Dừng hoạt động", status: "STOPPED" as const, Icon: FiPauseCircle }
  ].map((c) => ({ ...c, count: statusStats[c.status] || 0 }));

  return (
    <main className={adminStyles.page}>
      <header className={adminStyles.header}>
        <h1 className={adminStyles.title}>Tin tuyển dụng</h1>
        <p className={adminStyles.subtitle}>Quản lý tin tuyển dụng thực tập sinh của doanh nghiệp.</p>
      </header>

      {toast ? <MessagePopup open message={toast} onClose={() => setToast("")} /> : null}
      {error ? <p className={adminStyles.error}>{error}</p> : null}

      {/* Stat cards — đồng bộ admin */}
      {!loading && (
        <div className={adminStyles.statsGrid4}>
          {statCards.map((s) => (
            <DashboardStatSummaryCard
              key={s.status}
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

      <TuyenDungToolbar
        searchQ={searchQ}
        searchDate={searchDate}
        searchStatus={searchStatus}
        onSearchQChange={setSearchQ}
        onSearchDateChange={setSearchDate}
        onSearchStatusChange={setSearchStatus}
        onSearch={() => void load({ q: searchQ, date: searchDate, status: searchStatus, page: 1 }, { force: true })}
        onAdd={() => void openAdd()}
      />

      <TuyenDungTableSection
        loading={loading}
        items={items}
        totalItems={totalItems}
        page={page}
        busyId={busyId}
        onView={(row) => void openView(row)}
        onEdit={(row) => void openEdit(row)}
        onStop={setStopTarget}
        onDelete={setDeleteTarget}
        onPageChange={(p) => void load({ q: searchQ, date: searchDate, status: searchStatus, page: p }, { force: true })}
      />

      <TuyenDungViewPopup
        viewJob={viewJob}
        viewLoading={viewLoading}
        onClose={() => setViewJob(null)}
      />

      <TuyenDungStopPopup
        stopTarget={stopTarget}
        busyId={busyId}
        onConfirm={() => void doStop()}
        onCancel={() => setStopTarget(null)}
      />

      <TuyenDungDeletePopup
        deleteTarget={deleteTarget}
        busyId={busyId}
        onConfirm={() => void doDelete()}
        onCancel={() => setDeleteTarget(null)}
      />

      <TuyenDungAddPopup
        open={addOpen}
        form={form}
        facultyOptions={facultyOptions}
        fieldErrors={fieldErrors}
        busyId={busyId}
        onChange={handleFormChange}
        onCancel={() => setAddOpen(false)}
        onSubmit={() => void submitCreate()}
      />

      <TuyenDungEditPopup
        editTarget={editTarget}
        editDetail={editDetail}
        editLoading={editLoading}
        form={form}
        facultyOptions={facultyOptions}
        fieldErrors={fieldErrors}
        busyId={busyId}
        onChange={handleFormChange}
        onCancel={() => { setEditTarget(null); setEditDetail(null); }}
        onSubmit={() => void submitEdit()}
      />
    </main>
  );
}
