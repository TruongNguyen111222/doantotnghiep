"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import styles from "../styles/dashboard.module.css";
import { DashboardStatSummaryCard } from "@/app/components/DashboardStatSummaryCard"; 
import MessagePopup from "../../components/MessagePopup";
import { FiPauseCircle, FiUserCheck } from "react-icons/fi";

import type { AccountRow, AccountStatus, Role } from "@/lib/types/admin-quan-ly-tai-khoan"; //type tài khoản
import { ADMIN_QUAN_LY_TAI_KHOAN_PAGE_SIZE, roleLabel } from "@/lib/constants/admin-quan-ly-tai-khoan"; // hằng số tài khoản
import { deleteCacheByPrefix, getOrFetchCached, hasCachedValue } from "@/lib/utils/client-query-cache"; //hàm xử lý cache

import AdminTaiKhoanToolbar from "./components/AdminTaiKhoanToolbar"; //component toolbar tài khoản
import AdminTaiKhoanTableSection from "./components/AdminTaiKhoanTableSection"; //component bảng tài khoản
const AdminTaiKhoanViewPopup = dynamic(() => import("./components/AdminTaiKhoanViewPopup"), { ssr: false }); //component popup xem tài khoản
const AdminTaiKhoanStatusPopup = dynamic(() => import("./components/AdminTaiKhoanStatusPopup"), { ssr: false }); //component popup sửa trạng thái tài khoản
const AdminTaiKhoanDeletePopup = dynamic(() => import("./components/AdminTaiKhoanDeletePopup"), { ssr: false }); //component popup xóa tài khoản

export default function AdminQuanLyTaiKhoanPage() { //hàm hiển thị trang quản lý tài khoản
  const [items, setItems] = useState<AccountRow[]>([]); //danh sách tài khoản
  const [loading, setLoading] = useState(true); //loading
  const [error, setError] = useState(""); //lỗi
  const [latestBatchAccountStats, setLatestBatchAccountStats] = useState<{ //thống kê đợt thực tập
    batchId: string | null; //id đợt thực tập
    batchName: string | null; //tên đợt thực tập
    active: number; //số lượng tài khoản đang hoạt động
    stopped: number; //số lượng tài khoản dừng hoạt động
  } | null>(null); //thống kê đợt thực tập

  const [searchQ, setSearchQ] = useState(""); //từ khóa tìm kiếm
  const [filterRole, setFilterRole] = useState<Role | "all">("all"); //vai trò tìm kiếm
  const [filterStatus, setFilterStatus] = useState<AccountStatus | "all">("all"); //trạng thái tìm kiếm

  const [toast, setToast] = useState<string | null>(null); //thông báo

  const [viewTarget, setViewTarget] = useState<any | null>(null); //tài khoản cần xem
  const [deleteTarget, setDeleteTarget] = useState<AccountRow | null>(null); //tài khoản cần xóa
  const [statusTarget, setStatusTarget] = useState<AccountRow | null>(null); //tài khoản cần sửa trạng thái
  const [statusDraft, setStatusDraft] = useState<AccountStatus>("ACTIVE"); //trạng thái tài khoản

  const [busyId, setBusyId] = useState<string | null>(null); //id tài khoản đang xử lý
  const [page, setPage] = useState(1); //trang hiện tại
  const [totalItems, setTotalItems] = useState(0); //tổng số lượng tài khoản

  const fetchAccountDetailCached = async (id: string, force = false) => //hàm tải thông tin tài khoản từ cache hoặc từ API
    getOrFetchCached<any>( //hàm tải thông tin tài khoản từ cache hoặc từ API
      `admin:accounts:detail:${id}`,
      async () => { //hàm tải thông tin tài khoản từ cache hoặc từ API
        const res = await fetch(`/api/admin/accounts/${id}`);  //gửi request tải thông tin tài khoản từ API
        const payload = await res.json(); //lấy dữ liệu tài khoản
        if (!res.ok || !payload.success) throw new Error(payload.message || "Không tải được thông tin tài khoản.");
        return payload; //trả về dữ liệu tài khoản
      },
      { force } //options tải thông tin tài khoản từ cache hoặc từ API
    );

  const load = async (opts?: { force?: boolean; silent?: boolean; targetPage?: number }) => { //hàm tải danh sách tài khoản
    const force = Boolean(opts?.force);
    const silent = Boolean(opts?.silent);
    const targetPage = opts?.targetPage ?? page;
    try {
      const params = new URLSearchParams(); //tạo query params
      if (searchQ.trim()) params.set("q", searchQ.trim()); //từ khóa tìm kiếm
      if (filterRole !== "all") params.set("role", filterRole); //vai trò tìm kiếm
      if (filterStatus !== "all") params.set("status", filterStatus); //trạng thái tìm kiếm
      params.set("page", String(targetPage)); //trang hiện tại
      params.set("pageSize", String(ADMIN_QUAN_LY_TAI_KHOAN_PAGE_SIZE)); //số lượng tài khoản trên mỗi trang
      const url = `/api/admin/accounts?${params.toString()}`; //url tải danh sách tài khoản
      const cacheKey = `admin:accounts:list:${url}`;
      if (!silent && !hasCachedValue(cacheKey)) setLoading(true);
      setError("");
      const data = await getOrFetchCached<any>(
        cacheKey,
        async () => {
          const res = await fetch(url); //gửi request tải danh sách tài khoản từ API
          const payload = await res.json(); //lấy dữ liệu danh sách tài khoản từ API
          if (!res.ok || !payload.success) throw new Error(payload.message || "Không tải được danh sách tài khoản.");
          return payload; //trả về dữ liệu danh sách tài khoản
        },
        { force }
      );
      setItems((data.items || []) as AccountRow[]);
      setLatestBatchAccountStats(data.latestBatchAccountStats ?? null);
      setTotalItems(Number(data.totalItems || 0));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi.");
      setItems([]);
      setLatestBatchAccountStats(null);
      setTotalItems(0);
    } finally {
      if (!silent) setLoading(false);
    }
  };
  useEffect(() => { //hàm tải danh sách tài khoản khi trang thay đổi
    void load({ targetPage: page });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => { //hàm tải danh sách tài khoản khi từ khóa tìm kiếm, vai trò tìm kiếm, trạng thái tìm kiếm thay đổi
    const timer = setInterval(() => {
      void load({ force: true, silent: true, targetPage: page });
    }, 30000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQ, filterRole, filterStatus, page]);

  useEffect(() => { //hàm tải thông tin tài khoản khi danh sách tài khoản thay đổi
    if (!items.length) return; //nếu danh sách tài khoản rỗng thì không tải thông tin tài khoản
    void Promise.allSettled(items.map((row) => fetchAccountDetailCached(row.id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const openView = async (row: AccountRow) => { //hàm mở popup xem tài khoản
    try {
      const data = await fetchAccountDetailCached(row.id); //tải thông tin tài khoản từ API
      setViewTarget(data.item); //set thông tin tài khoản vào state
    } catch (e) { //nếu có lỗi thì hiển thị thông báo lỗi
      setToast(e instanceof Error ? e.message : "Không tải được thông tin tài khoản.");
    }
  };

  const openStatus = (row: AccountRow) => { //hàm mở popup sửa trạng thái tài khoản
    setStatusTarget(row); //set tài khoản đang xử lý vào state
    setStatusDraft(row.status); //set trạng thái tài khoản vào state
  };

  const submitStatus = async () => { //hàm xử lý sửa trạng thái tài khoản
    if (!statusTarget) return; //nếu tài khoản đang xử lý rỗng thì không xử lý
    setBusyId(statusTarget.id); //set id tài khoản đang xử lý vào state
    try {
      if (statusDraft === "STOPPED") { //nếu trạng thái tài khoản là dừng hoạt động thì hiển thị popup xác nhận
        const ok = window.confirm( //xác nhận dừng hoạt động tài khoản
          `Bạn có chắc chắn muốn dừng hoạt động của tài khoản ${roleLabel[statusTarget.role]} - ${statusTarget.fullName}-${statusTarget.email} không?`
        );
        if (!ok) return; //nếu không xác nhận thì không xử lý
      }

      const res = await fetch(`/api/admin/accounts/${statusTarget.id}/status`, { //gửi request sửa trạng thái tài khoản từ API
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: statusDraft })
      });
      const data = await res.json(); //lấy dữ liệu sửa trạng thái tài khoản từ API
      if (!res.ok || !data.success) throw new Error(data.message || "Cập nhật trạng thái thất bại."); //nếu có lỗi thì hiển thị thông báo lỗi
      setToast(data.message || "Cập nhật trạng thái tài khoản thành công."); //set thông báo thành công vào state
      setStatusTarget(null); //reset tài khoản đang xử lý vào state
      deleteCacheByPrefix("admin:accounts:"); //xóa cache tài khoản
      await load({ force: true, targetPage: page }); //tải lại danh sách tài khoản
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Cập nhật trạng thái thất bại."); //set thông báo lỗi vào state
    } finally {
      setBusyId(null);
    }
  };

  const submitDelete = async () => {
    if (!deleteTarget) return; //nếu tài khoản đang xử lý rỗng thì không xử lý
    setBusyId(deleteTarget.id);
    try {
      const res = await fetch(`/api/admin/accounts/${deleteTarget.id}`, { method: "DELETE" }); //gửi request xóa tài khoản từ API
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Xóa tài khoản thất bại."); 
      setToast(data.message || "Xóa tài khoản thành công."); //set thông báo thành công vào state
      setDeleteTarget(null); //reset tài khoản đang xử lý vào state
      deleteCacheByPrefix("admin:accounts:"); //xóa cache tài khoản
      await load({ force: true, targetPage: page }); //tải lại danh sách tài khoản
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Xóa tài khoản thất bại."); //set thông báo lỗi vào state
    } finally { 
      setBusyId(null);
    }
  };

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Quản lý tài khoản</h1>
      </header>

      {error ? <p className={styles.error}>{error}</p> : null}

      {!loading && latestBatchAccountStats?.batchId ? (
        <section aria-label="Thống kê tài khoản đợt mới nhất">
          <div className={styles.statusNote} style={{ marginBottom: 10 }}>
            Đợt thực tập mới nhất: <strong>{latestBatchAccountStats.batchName ?? "—"}</strong>
          </div>
          <div className={styles.statsGrid2}>
            <DashboardStatSummaryCard
              cardClassName={styles.statCard}
              labelClassName={styles.statLabel}
              valueClassName={styles.statValue}
              label="Tài khoản đang hoạt động"
              value={latestBatchAccountStats.active}
              Icon={FiUserCheck}
            />
            <DashboardStatSummaryCard
              cardClassName={styles.statCard}
              labelClassName={styles.statLabel}
              valueClassName={styles.statValue}
              label="Tài khoản dừng hoạt động"
              value={latestBatchAccountStats.stopped}
              Icon={FiPauseCircle}
            />
          </div>
        </section>
      ) : null}

      <AdminTaiKhoanToolbar
        searchQ={searchQ}
        filterRole={filterRole}
        filterStatus={filterStatus}
        onChangeSearchQ={setSearchQ}
        onChangeFilterRole={setFilterRole}
        onChangeFilterStatus={setFilterStatus}
        onSearch={() => {
          setPage(1);
          void load({ force: true, targetPage: 1 });
        }}
      />

      <AdminTaiKhoanTableSection
        loading={loading}
        items={items}
        totalItems={totalItems}
        page={page}
        busyId={busyId}
        onPageChange={setPage}
        onView={(row) => void openView(row)}
        onStatus={openStatus}
        onDelete={setDeleteTarget}
      />

      <AdminTaiKhoanViewPopup
        item={viewTarget}
        onClose={() => setViewTarget(null)}
      />

      <AdminTaiKhoanStatusPopup
        open={statusTarget !== null}
        statusDraft={statusDraft}
        busy={busyId !== null}
        onClose={() => setStatusTarget(null)}
        onConfirm={() => void submitStatus()}
        onChangeStatus={setStatusDraft}
      />

      <AdminTaiKhoanDeletePopup
        target={deleteTarget}
        busy={busyId !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void submitDelete()}
      />

      {toast ? <MessagePopup open title="Thông báo" message={toast} onClose={() => setToast(null)} /> : null}
    </main>
  );
}

