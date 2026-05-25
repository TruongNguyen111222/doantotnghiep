"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import styles from "../styles/dashboard.module.css";
import { DashboardStatSummaryCard } from "@/app/components/DashboardStatSummaryCard";
import MessagePopup from "../../components/MessagePopup";
import { FiClock, FiPauseCircle, FiXCircle, FiZap } from "react-icons/fi";

import type { ApiResponse, InternshipBatchRow, JobDetailResponse, JobListItem, StatusAction } from "@/lib/types/admin-quan-ly-tin-tuyen-dung"; //type dữ liệu việc làm
import { inferDefaultAction } from "@/lib/utils/admin-quan-ly-tin-tuyen-dung"; //hàm xác định hành động mặc định
import { deleteCacheByPrefix, getCachedValue, getOrFetchCached, hasCachedValue } from "@/lib/utils/client-query-cache";

import AdminTinTuyenDungToolbar from "./components/AdminTinTuyenDungToolbar"; //toolbar việc làm
import AdminTinTuyenDungTableSection from "./components/AdminTinTuyenDungTableSection"; //table việc làm
const AdminTinTuyenDungViewPopup = dynamic(() => import("./components/AdminTinTuyenDungViewPopup"), { ssr: false }); //popup xem chi tiết việc làm
const AdminTinTuyenDungStatusPopup = dynamic(() => import("./components/AdminTinTuyenDungStatusPopup"), { ssr: false }); //popup duyệt/từ chối việc làm
const AdminTinTuyenDungDeletePopup = dynamic(() => import("./components/AdminTinTuyenDungDeletePopup"), { ssr: false }); //popup xóa việc làm

function jobPostsListCacheKey( //hàm tạo key cache việc làm
  q: string,
  batchId: string,
  faculty: string,
  status: string
) {
  const params = new URLSearchParams(); //tạo đối tượng URLSearchParams để lưu các tham số query
  if (q.trim()) params.set("q", q.trim());
  if (batchId !== "all") params.set("batchId", batchId);
  if (faculty !== "all") params.set("expertise", faculty);
  if (status !== "all") params.set("status", status);
  return `admin:job-posts:list:/api/admin/job-posts?${params.toString()}`; //tạo key cache việc làm
}

const JOB_POSTS_LIST_INITIAL_KEY = jobPostsListCacheKey("", "all", "all", "all");   //key cache việc làm
const ADMIN_INTERNSHIP_BATCHES_ALL_CACHE_KEY = "admin:internship-batches:list:status=all"; //key cache đợt thực tập

function readJobPostsListFromCache(key: string) { //hàm lấy dữ liệu việc làm từ cache
  const data = getCachedValue<{
    items?: JobListItem[]; //danh sách việc làm
    expertises?: string[]; //danh sách chuyên môn
    statusStats?: { pending: number; rejected: number; active: number; stopped: number } | null; //thống kê trạng thái việc làm
  }>(key);
  return {
    items: (Array.isArray(data?.items) ? data.items : []) as JobListItem[], //danh sách việc làm
    expertises: Array.isArray(data?.expertises) ? data.expertises : [], //danh sách chuyên môn
    statusStats: (data as { statusStats?: { pending: number; rejected: number; active: number; stopped: number } | null })?.statusStats ?? null //thống kê trạng thái việc làm
  };
}

export default function AdminQuanLyTinTuyenDungPage() { //hàm tạo trang quản lý tin tuyển dụng
  const seeded = readJobPostsListFromCache(JOB_POSTS_LIST_INITIAL_KEY); //lấy dữ liệu việc làm từ cache
  const [loading, setLoading] = useState(() => !hasCachedValue(JOB_POSTS_LIST_INITIAL_KEY)); //trạng thái tải việc làm
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const [items, setItems] = useState<JobListItem[]>(seeded.items);
  const [statusStats, setStatusStats] = useState<{ pending: number; rejected: number; active: number; stopped: number } | null>(seeded.statusStats);

  const [batches, setBatches] = useState<InternshipBatchRow[]>([]); //danh sách đợt thực tập
  const [faculties, setFaculties] = useState<string[]>(seeded.expertises); //danh sách chuyên môn
  const [loadingBatches, setLoadingBatches] = useState(false); //trạng thái tải đợt thực tập

  const [searchQ, setSearchQ] = useState(""); //từ khóa tìm kiếm
  const [searchBatchId, setSearchBatchId] = useState<string>("all"); //tìm kiếm đợt thực tập
  const [searchFaculty, setSearchFaculty] = useState<string>("all");
  const [searchStatus, setSearchStatus] = useState<string>("all"); //tìm kiếm trạng thái

  const [busyId, setBusyId] = useState<string | null>(null);
  const [page, setPage] = useState(1); //trang hiện tại

  const [viewTarget, setViewTarget] = useState<JobListItem | null>(null); //việc làm cần xem      
  const [viewDetail, setViewDetail] = useState<JobDetailResponse | null>(null); //chi tiết việc làm cần xem
  const [viewLoading, setViewLoading] = useState(false); //trạng thái tải chi tiết việc làm

  const [statusTarget, setStatusTarget] = useState<JobListItem | null>(null);
    const [statusAction, setStatusAction] = useState<StatusAction>("approve"); //hành động duyệt/từ chối việc làm
  const [rejectReason, setRejectReason] = useState(""); //lý do từ chối việc làm

  const [deleteTarget, setDeleteTarget] = useState<JobListItem | null>(null);

  const fetchJobDetailCached = async (id: string, force = false) => //hàm tải dữ liệu chi tiết việc làm từ cache
    getOrFetchCached<any>(
      `admin:job-posts:detail:${id}`,
      async () => {
        const res = await fetch(`/api/admin/job-posts/${id}`); //gửi request lấy chi tiết việc làm từ API
        const payload = (await res.json()) as ApiResponse<JobDetailResponse>;
        if (!res.ok || !payload.success || !payload.item) throw new Error(payload.message || "Không tải được chi tiết tin.");
        return payload;
      },
      { force }
    );

  const loadBatches = async (opts?: { force?: boolean }) => { //hàm tải dữ liệu đợt thực tập
    const force = Boolean(opts?.force); //nếu force là true thì tải dữ liệu mới
    setLoadingBatches(true);
    try {
      const data = await getOrFetchCached<ApiResponse<InternshipBatchRow> & { items?: InternshipBatchRow[] }>( //tải dữ liệu đợt thực tập từ cache hoặc từ API
        ADMIN_INTERNSHIP_BATCHES_ALL_CACHE_KEY,
        async () => {
          const res = await fetch("/api/admin/internship-batches?status=all"); //fetch dữ liệu đợt thực tập từ API vào res
          const json = (await res.json()) as ApiResponse<InternshipBatchRow>; //lấy dữ liệu đợt thực tập từ API
          if (!res.ok || !json.success) throw new Error(json.message || "Lỗi tải đợt thực tập.");
          return json;
        },
        { force }
      );
      setBatches((data.items || []) as any); //set dữ liệu đợt thực tập vào batches
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Lỗi tải đợt thực tập."); //set thông báo lỗi
      setBatches([]); //reset batches
    } finally {
      setLoadingBatches(false); //set loadingBatches là false
    }
  };

  const load = async (opts?: { force?: boolean; silent?: boolean }) => { //hàm tải dữ liệu việc làm
    const force = Boolean(opts?.force); //nếu force là true thì tải dữ liệu mới
    const silent = Boolean(opts?.silent); //nếu silent là true thì không hiển thị thông báo lỗi
    try {
      const params = new URLSearchParams(); //tạo đối tượng URLSearchParams để lưu các tham số query
      if (searchQ.trim()) params.set("q", searchQ.trim());
      if (searchBatchId !== "all") params.set("batchId", searchBatchId); //tìm kiếm đợt thực tập
      if (searchFaculty !== "all") params.set("expertise", searchFaculty); //tìm kiếng chuyên môn
      if (searchStatus !== "all") params.set("status", searchStatus); //tìm kiếm trạng thái
      const url = `/api/admin/job-posts?${params.toString()}`; //tạo url để gọi API
      const cacheKey = jobPostsListCacheKey(searchQ, searchBatchId, searchFaculty, searchStatus);
      if (!silent && !hasCachedValue(cacheKey)) setLoading(true); //nếu silent là false và cache key không tồn tại thì set loading là true
      setError(""); //reset lỗi
      setPage(1); //reset trang
      const data = await getOrFetchCached<any>(
        cacheKey,
        async () => {
          const res = await fetch(url);
          const payload = (await res.json()) as ApiResponse<JobListItem> & { expertises?: string[] };
          if (!res.ok || !payload.success) throw new Error(payload.message || "Không tải được danh sách tin.");
          return payload;
        },
        { force }
      );
      setItems((data.items || []) as any); //set dữ liệu việc làm vào items
      if (Array.isArray(data.expertises)) setFaculties(data.expertises);
      setStatusStats((data as any).statusStats ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi."); 
      setItems([]);
      setStatusStats(null);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => { //hàm tải dữ liệu việc làm khi trang thay đổi
    void Promise.all([loadBatches(), load()]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { //hàm tải dữ liệu việc làm khi trang thay đổi
    const timer = setInterval(() => {
      void loadBatches({ force: true });
      void load({ force: true, silent: true });
    }, 30000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQ, searchBatchId, searchFaculty, searchStatus]);

  useEffect(() => {
    if (!items.length) return;
    void Promise.allSettled(items.map((row) => fetchJobDetailCached(row.id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const dismissToast = () => setToast(""); 

  const openView = async (row: JobListItem) => { //hàm mở popup xem chi tiết việc làm
    setViewTarget(row);
    setViewDetail(null);
    setViewLoading(true);
    try {
      const data = await fetchJobDetailCached(row.id);
      setViewDetail(data.item);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Lỗi tải chi tiết.");
    } finally {
      setViewLoading(false);
    }
  };

  const openStatus = (row: JobListItem) => { //hàm mở popup duyệt/từ chối việc làm
    setStatusTarget(row);
    setRejectReason(row.rejectionReason || "");
    setStatusAction(inferDefaultAction(row.status));
  };

  const closeStatus = () => {
    setStatusTarget(null);
    setRejectReason("");
    setStatusAction("approve");
  };

  const submitStatus = async () => { //hàm gửi dữ liệu duyệt/từ chối việc làm
    if (!statusTarget) return;
    if (statusAction === "reject" && !rejectReason.trim()) { //nếu hành động là từ chối và lý do từ chối rỗng thì set thông báo lỗi
      setToast("Lý do từ chối là bắt buộc.");
      return;
    }
    setBusyId(statusTarget.id); //set id việc làm đang xử lý vào busyId
    setToast("");
    try {
      const res = await fetch(`/api/admin/job-posts/${statusTarget.id}/status`, { //gửi request sửa trạng thái việc làm từ API
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: statusAction,
          rejectionReason: statusAction === "reject" ? rejectReason.trim() : undefined
        })
      });
      const data = (await res.json()) as ApiResponse<unknown>; //lấy dữ liệu sửa trạng thái việc làm từ API
      if (!res.ok || !data.success) throw new Error(data.message || "Cập nhật trạng thái thất bại.");
      setToast(data.message || "Cập nhật trạng thái thành công."); //set thông báo thành công vào state
      closeStatus(); //đóng popup duyệt/từ chối việc làm
      deleteCacheByPrefix("admin:job-posts:"); //xóa cache việc làm
      await load({ force: true });
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Cập nhật thất bại."); //set thông báo lỗi vào state
    } finally {
      setBusyId(null);
    }
  };

  const submitDelete = async () => { //hàm gửi dữ liệu xóa việc làm
    if (!deleteTarget) return; //nếu việc làm đang xử lý rỗng thì không xử lý
    setBusyId(deleteTarget.id); //set id việc làm đang xử lý vào busyId
    setToast("");
    try {
      const res = await fetch(`/api/admin/job-posts/${deleteTarget.id}`, { method: "DELETE" }); //gửi request xóa việc làm từ API
      const data = (await res.json()) as ApiResponse<unknown>; //lấy dữ liệu xóa việc làm từ API
      if (!res.ok || !data.success) throw new Error(data.message || "Xóa thất bại.");
      setToast(data.message || "Xóa tin tuyển dụng thành công"); //set thông báo thành công vào state
      setDeleteTarget(null);
      deleteCacheByPrefix("admin:job-posts:"); //xóa cache việc làm
      await load({ force: true });
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Xóa thất bại.");
    } finally {
      setBusyId(null);
    }
  };

  const search = async () => { //hàm tìm kiếm việc làm
    setPage(1); //reset trang
    await load({ force: true }); //tải lại danh sách việc làm
  };

  return ( //render trang quản lý tin tuyển dụng
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Quản lý tin tuyển dụng thực tập</h1>
        <p className={styles.subtitle}>Danh sách tin tuyển dụng của doanh nghiệp, có duyệt/từ chối và xóa theo điều kiện liên kết.</p>
      </header>

      {toast ? <MessagePopup open message={toast} onClose={dismissToast} /> : null}

      {error ? <p className={styles.error}>{error}</p> : null}

      {statusStats ? (
        <section aria-label="Thống kê trạng thái tin tuyển dụng">
          <div className={styles.statsGrid4}>
            <DashboardStatSummaryCard
              cardClassName={styles.statCard}
              labelClassName={styles.statLabel}
              valueClassName={styles.statValue}
              label="Chờ duyệt"
              value={statusStats.pending}
              Icon={FiClock}
            />
            <DashboardStatSummaryCard
              cardClassName={styles.statCard}
              labelClassName={styles.statLabel}
              valueClassName={styles.statValue}
              label="Từ chối duyệt"
              value={statusStats.rejected}
              Icon={FiXCircle}
            />
            <DashboardStatSummaryCard
              cardClassName={styles.statCard}
              labelClassName={styles.statLabel}
              valueClassName={styles.statValue}
              label="Đang hoạt động"
              value={statusStats.active}
              Icon={FiZap}
            />
            <DashboardStatSummaryCard
              cardClassName={styles.statCard}
              labelClassName={styles.statLabel}
              valueClassName={styles.statValue}
              label="Dừng hoạt động"
              value={statusStats.stopped}
              Icon={FiPauseCircle}
            />
          </div>
        </section>
      ) : null}

      <AdminTinTuyenDungToolbar
        searchQ={searchQ}
        searchBatchId={searchBatchId}
        searchExpertise={searchFaculty}
        searchStatus={searchStatus}
        batches={batches}
        expertises={faculties}
        loadingBatches={loadingBatches}
        onChangeSearchQ={setSearchQ}
        onChangeSearchBatchId={setSearchBatchId}
        onChangeSearchExpertise={setSearchFaculty}
        onChangeSearchStatus={setSearchStatus}
        onSearch={() => void search()}
      />

      <AdminTinTuyenDungTableSection
        loading={loading}
        items={items}
        page={page}
        busyId={busyId}
        onPageChange={setPage}
        onView={(row) => void openView(row)}
        onStatus={openStatus}
        onDelete={setDeleteTarget}
      />

      <AdminTinTuyenDungViewPopup
        viewTarget={viewTarget}
        viewLoading={viewLoading}
        viewDetail={viewDetail}
        onClose={() => setViewTarget(null)}
      />

      <AdminTinTuyenDungStatusPopup
        target={statusTarget}
        statusAction={statusAction}
        rejectReason={rejectReason}
        busy={busyId !== null}
        onClose={closeStatus}
        onSubmit={() => void submitStatus()}
        onChangeStatusAction={setStatusAction}
        onChangeRejectReason={setRejectReason}
      />

      <AdminTinTuyenDungDeletePopup
        target={deleteTarget}
        busy={busyId !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void submitDelete()}
      />
    </main>
  );
}
