"use client";

import { EnterpriseStatus } from "@prisma/client";
import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic"; 
import type { AdminEnterpriseDetail, AdminEnterpriseListItem } from "@/lib/types/admin"; // lấy dữ liệu doanh nghiệp
import {
  ADMIN_ENTERPRISE_MSG,
  buildApproveEnterpriseConfirmMessage,
  buildDeleteEnterpriseConfirmMessage,
  buildRejectEnterpriseStartConfirmMessage
} from "@/lib/constants/admin-enterprise"; // lấy thông báo doanh nghiệp và hàm xây dựng thông báo xác nhận xóa doanh nghiệp, phê duyệt doanh nghiệp, từ chối doanh nghiệp
import { ADMIN_PENDING_ENTERPRISES_CHANGED_EVENT } from "@/hooks/useAdminPendingEnterpriseCount"; // lấy sự kiện thay đổi số lượng doanh nghiệp chờ duyệt
import { buildEnterpriseHeadquartersAddress, normalizeEnterpriseStatus } from "@/lib/utils/enterprise-admin-display"; //xử lý dữ liệu hiển thị cho doanh nghiệp. Địa chỉ trụ sở chính, trạng thái doanh nghiệp
import { companyTaxLabel } from "@/lib/utils/admin-enterprise-display"; //hiển thị tên doanh nghiệp và mã số thuế và trạng thái doanh nghiệp trong bảng / modal (có hậu tố khi đã phê duyệt).
import { ADMIN_QUAN_LY_DOANH_NGHIEP_PAGE_SIZE } from "@/lib/constants/admin-quan-ly-doanh-nghiep"; //lấy số lượng doanh nghiệp trên mỗi trang
import { 
  buildAdminEnterprisesListQueryParams,
  parseAdminEnterprisesStatusQueryParam
} from "@/lib/utils/admin-quan-ly-doanh-nghiep"; //xử lý query params, tìm kiếm , lọc theo tên doanh nghiệp, mã số thuế, trạng thái doanh nghiệp cho danh sách doanh nghiệp
import { getOrFetchCached, hasCachedValue } from "@/lib/utils/client-query-cache"; //lưu dữ liệu tạm trong RAM để khỏi gọi API nhiều lần.
import MessagePopup from "../../components/MessagePopup"; //hiển thị thông báo
import Pagination from "../../components/Pagination"; //phân trang
import { DashboardStatSummaryCard } from "@/app/components/DashboardStatSummaryCard"; //hiển thị thống kê trạng thái doanh nghiệp
import { ChartStyleLoading } from "@/app/components/ChartStyleLoading"; //hiển thị loading khi đang tải dữ liệu
import styles from "../styles/dashboard.module.css";
import { FiCheckCircle, FiClock, FiXCircle } from "react-icons/fi";
import AdminEnterpriseToolbar from "./components/AdminEnterpriseToolbar"; //toolbar tìm kiếm, lọc, tải dữ liệu
import AdminEnterpriseTable from "./components/AdminEnterpriseTable";
const AdminEnterpriseStatusPopup = dynamic(() => import("./components/AdminEnterpriseStatusPopup"), { ssr: false }); //popup xác nhận phê duyệt, từ chối doanh nghiệp
const AdminEnterpriseViewPopup = dynamic(() => import("./components/AdminEnterpriseViewPopup"), { ssr: false }); //popup xem chi tiết doanh nghiệp

export default function AdminQuanLyDoanhNghiepPage() { //hàm hiển thị trang quản lý doanh nghiệp
  const [items, setItems] = useState<AdminEnterpriseListItem[]>([]); //danh sách doanh nghiệp
  const [loading, setLoading] = useState(true); //loading khi đang tải dữ liệu
  const [error, setError] = useState(""); //lỗi khi tải dữ liệu
  const [toast, setToast] = useState(""); //thông báo khi tải dữ liệu
  const [enterpriseStatusStats, setEnterpriseStatusStats] = useState<{
    pending: number; //số lượng doanh nghiệp chờ phê duyệt
    approved: number; //số lượng doanh nghiệp đã phê duyệt
    rejected: number; //số lượng doanh nghiệp bị từ chối
  } | null>(null);

  const [searchQ, setSearchQ] = useState(""); //từ khóa tìm kiếm
  const [searchStatus, setSearchStatus] = useState<string>("all"); //trạng thái tìm kiếm
  const [appliedQ, setAppliedQ] = useState("");
  const [appliedStatus, setAppliedStatus] = useState("all"); //trạng thái tìm kiếm đã áp dụng
  const urlSynced = useRef(false); //đã đồng bộ url

  const [busyId, setBusyId] = useState<string | null>(null); //id của doanh nghiệp đang xử lý
  const [page, setPage] = useState(1); //trang hiển thị   

  const [viewDetail, setViewDetail] = useState<AdminEnterpriseDetail | null>(null); //chi tiết doanh nghiệp đang xem
  const [viewLoading, setViewLoading] = useState(false); //loading khi đang tải dữ liệu

  const [statusTarget, setStatusTarget] = useState<AdminEnterpriseListItem | null>(null); //doanh nghiệp đang xử lý
  const [statusDetail, setStatusDetail] = useState<AdminEnterpriseDetail | null>(null); //chi tiết doanh nghiệp đang xử lý
  const [rejectText, setRejectText] = useState(""); //lỗi từ chối doanh nghiệp
  const [rejectTextError, setRejectTextError] = useState(""); //lỗi từ chối doanh nghiệp
  const [rejectOpen, setRejectOpen] = useState(false); //đã mở modal từ chối doanh nghiệp

  const fetchEnterpriseDetailCached = async (id: string, force = false) => //hàm tải dữ liệu chi tiết doanh nghiệp ddeer lát sài
    getOrFetchCached<any>(
      `admin:enterprises:detail:${id}`, //cache key
      async () => { //hàm tải dữ liệu chi tiết doanh nghiệp
        const res = await fetch(`/api/admin/enterprises/${id}`); //fetch dữ liệu chi tiết doanh nghiệp theo id 
        const payload = await res.json(); //lấy dữ liệu chi tiết doanh nghiệp
        if (!res.ok) throw new Error(payload.message || ADMIN_ENTERPRISE_MSG.detailLoadFail); //nếu không tải được dữ liệu thì throw lỗi
        return payload; //trả về dữ liệu chi tiết doanh nghiệp
      },
      { force } //force tải dữ liệu
    );

  const closeStatusModal = () => { //hàm đóng modal từ chối doanh nghiệp , xóa dữ liệu khi đóng modal
    setStatusTarget(null); //reset doanh nghiệp đang xử lý
    setStatusDetail(null); //reset chi tiết doanh nghiệp đang xử lý
    setRejectOpen(false); //reset modal từ chối doanh nghiệp
    setRejectText(""); //reset lỗi từ chối doanh nghiệp
    setRejectTextError(""); //reset lỗi từ chối doanh nghiệp
  };

  const openStatusModal = (row: AdminEnterpriseListItem) => { //hàm mở modal từ chối doanh nghiệp , tải dữ liệu chi tiết doanh nghiệp khi mở modal
    setStatusTarget(row); //set doanh nghiệp đang xử lý
    setStatusDetail(null); //reset chi tiết doanh nghiệp đang xử lý
    setRejectOpen(false); //reset modal từ chối doanh nghiệp
    setRejectText(""); //reset lỗi từ chối doanh nghiệp
    setRejectTextError(""); //reset lỗi từ chối doanh nghiệp
    void (async () => { //hàm tải dữ liệu chi tiết doanh nghiệp khi mở modal
      try {
        const data = await fetchEnterpriseDetailCached(row.id); //tải dữ liệu chi tiết doanh nghiệp theo id
        setStatusDetail(data.item as AdminEnterpriseDetail); //set chi tiết doanh nghiệp đang xử lý
      } catch {
        setStatusDetail(null); //reset chi tiết doanh nghiệp đang xử lý
      }
    })(); //tải dữ liệu chi tiết doanh nghiệp khi mở modal
  };

  const load = useCallback(async (opts?: { force?: boolean; silent?: boolean }) => { //hàm tải dữ liệu danh sách doanh nghiệp
    const force = Boolean(opts?.force); //force tải dữ liệu
    const silent = Boolean(opts?.silent); //silent tải dữ liệu
    try {

      //hàm gọi api tìm kiếm doanh nghiệp
      const params = buildAdminEnterprisesListQueryParams(appliedQ, appliedStatus); //tạo query params
      const url = `/api/admin/enterprises?${params.toString()}`; //tạo url để gọi APi
      const cacheKey = `admin:enterprises:list:${url}`; //tạo cache key
      if (!silent && !hasCachedValue(cacheKey)) setLoading(true); // ánh dấu trong bộ nhớ RAM. Nếu link giống hệt nhau, nghĩa là dữ liệu cần tìm giống nhau.
      setError(""); //reset lỗi
      const data = await getOrFetchCached<any>( //tải dữ liệu danh sách doanh nghiệp từ cache hoặc từ API
        cacheKey,
        async () => {
          const res = await fetch(url); //fetch dữ liệu danh sách doanh nghiệp từ API
          const payload = await res.json(); //lấy dữ liệu danh sách doanh nghiệp từ API
          if (!res.ok || payload?.success === false) throw new Error(payload.message || ADMIN_ENTERPRISE_MSG.listLoadFail); //nếu không tải được dữ liệu thì throw lỗi
          return payload; //trả về dữ liệu danh sách doanh nghiệp
        },
        { force } //force tải dữ liệu
      );
      setItems(data.items as AdminEnterpriseListItem[]); //set danh sách doanh nghiệp
      setEnterpriseStatusStats(data.enterpriseStatusStats ?? null); //set thống kê trạng thái doanh nghiệp
    } catch (e) { //nếu có lỗi thì set lỗi
      setError(e instanceof Error ? e.message : ADMIN_ENTERPRISE_MSG.genericError);
      setItems([]); //reset danh sách doanh nghiệp
      setEnterpriseStatusStats(null); //reset thống kê trạng thái doanh nghiệp
    } finally { //finally khi tải dữ liệu
      if (!silent) setLoading(false); //reset loading
    }
  }, [appliedQ, appliedStatus]); //hàm tải dữ liệu danh sách doanh nghiệp khi đã áp dụng

  useEffect(() => { //Khởi động ngay lập tức khi mở trang
    void load();
  }, [load]); //hàm tải dữ liệu danh sách doanh nghiệp khi load trang

  useEffect(() => { //Giữ cho dữ liệu luôn tươi mới bằng cách cập nhật ngầm định kỳ
    const timer = setInterval(() => {
      void load({ force: true, silent: true });
    }, 30000); //cập nhật dữ liệu mỗi 30 giây
    return () => clearInterval(timer); //clear interval khi unmount
  }, [load]);

  useEffect(() => { //Đồng bộ hóa dữ liệu từ thanh địa chỉ URL vào giao diện
    if (urlSynced.current || typeof window === "undefined") return;
    urlSynced.current = true; //đã đồng bộ url
    const st = new URLSearchParams(window.location.search).get("status"); //lấy trạng thái tìm kiếm từ url
    const parsed = parseAdminEnterprisesStatusQueryParam(st); //parse trạng thái tìm kiếm
    if (parsed) { //nếu có trạng thái tìm kiếm thì set trạng thái tìm kiếm
      setSearchStatus(parsed); //set trạng thái tìm kiếm
      setAppliedStatus(parsed); //set trạng thái tìm kiếm đã áp dụng
    }
  }, []); //chỉ chạy một lần khi mở trang

  const openView = async (row: AdminEnterpriseListItem) => { //Kích hoạt Modal "Xem chi tiết doanh nghiệp"
    setViewDetail(null); //reset chi tiết doanh nghiệp đang xem
    setViewLoading(true); //set loading khi đang tải dữ liệu
    try {
      const data = await fetchEnterpriseDetailCached(row.id); //tải dữ liệu chi tiết doanh nghiệp theo id
      setViewDetail(data.item as AdminEnterpriseDetail); //set chi tiết doanh nghiệp đang xem
    } catch (e) { //nếu có lỗi thì set lỗi
      setToast(e instanceof Error ? e.message : ADMIN_ENTERPRISE_MSG.detailLoadError);
    } finally {
      setViewLoading(false); //reset loading
    }
  };

  const applySearch = () => { //kích hoạt khi Admin click vào nút "Tìm kiếm" hoặc "Lọc" trên thanh công cụ (Toolbar).
    setAppliedQ(searchQ); //set từ khóa tìm kiếm
    setAppliedStatus(searchStatus); //set trạng thái tìm kiếm từ ô tạm thời vào chính thức
    setPage(1); //set trang hiển thị
  };
 
  const pagedItems = items.slice( //lấy danh sách doanh nghiệp theo trang hiển thị
    (page - 1) * ADMIN_QUAN_LY_DOANH_NGHIEP_PAGE_SIZE, //vị trí bắt đầu
    (page - 1) * ADMIN_QUAN_LY_DOANH_NGHIEP_PAGE_SIZE + ADMIN_QUAN_LY_DOANH_NGHIEP_PAGE_SIZE //vị trí kết thúc
  );

  //chủ động tải sẵn dữ liệu chi tiết của toàn bộ doanh nghiệp đang hiện trên màn hình và cất vào bộ nhớ đệm (Cache).
  useEffect(() => { //tải dữ liệu chi tiết doanh nghiệp khi chuyển trang
    if (!pagedItems.length) return; //nếu không có doanh nghiệp thì không tải dữ liệu
    void Promise.allSettled(pagedItems.map((row) => fetchEnterpriseDetailCached(row.id))); //tải dữ liệu chi tiết doanh nghiệp theo id
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagedItems]);

  const dismissToast = () => setToast(""); //reset thông báo

  const deleteEnterprise = async (row: AdminEnterpriseListItem) => {  //kích hoạt khi Admin bấm vào nút "Xóa" (icon thùng rác) ở một dòng nào đó trên bảng.
    const name = row.companyName || "—"; //tên doanh nghiệp
    const tax = row.taxCode || "—"; //mã số thuế
    if (!window.confirm(buildDeleteEnterpriseConfirmMessage(name, tax))) { //xác nhận xóa doanh nghiệp
      return; //nếu không xác nhận thì không xóa doanh nghiệp
    }

    setBusyId(row.id); //set id của doanh nghiệp đang xử lý
    setToast(""); //reset thông báo
    try {
      const res = await fetch(`/api/admin/enterprises/${row.id}`, { method: "DELETE" }); //fetch dữ liệu xóa doanh nghiệp theo id
      const data = await res.json(); //lấy dữ liệu xóa doanh nghiệp từ API
      if (!res.ok) {
        setToast(data.message || ADMIN_ENTERPRISE_MSG.deleteFail); //set thông báo lỗi
        return; //nếu không xóa được doanh nghiệp thì không xóa doanh nghiệp
      }
      setToast(String(data.message)); //set thông báo thành công
      await load({ force: true }); //tải dữ liệu danh sách doanh nghiệp
      window.dispatchEvent(new Event(ADMIN_PENDING_ENTERPRISES_CHANGED_EVENT)); //dispatch event để cập nhật danh sách doanh nghiệp
    } catch {
      setToast(ADMIN_ENTERPRISE_MSG.serverUnreachable); //set thông báo lỗi
    } finally {
      setBusyId(null); //reset id của doanh nghiệp đang xử lý
    }
  };

  //kích hoạt khi Admin bấm vào nút "Phê duyệt" (icon check) ở một dòng nào đó trên bảng.
  const approveRow = (row: AdminEnterpriseListItem) => {
    const label = companyTaxLabel(row); //tạo label tên doanh nghiệp và mã số thuế
    if (!window.confirm(buildApproveEnterpriseConfirmMessage(label))) return; //xác nhận phê duyệt doanh nghiệp
    void (async () => { //hàm phê duyệt doanh nghiệp
      setBusyId(row.id); //set id của doanh nghiệp đang xử lý
      setToast(""); //reset thông báo
      try {
        const res = await fetch(`/api/admin/enterprises/${row.id}/status`, { //fetch dữ liệu phê duyệt doanh nghiệp theo id
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "approve" })
        });
        const data = await res.json(); //lấy dữ liệu phê duyệt doanh nghiệp từ API
        if (!res.ok) throw new Error(data.message || ADMIN_ENTERPRISE_MSG.approveFail);
        setToast(String(data.message)); //set thông báo thành công
        if (statusTarget?.id === row.id) closeStatusModal(); //đóng modal từ chối doanh nghiệp
        await load({ force: true }); //tải dữ liệu danh sách doanh nghiệp
        window.dispatchEvent(new Event(ADMIN_PENDING_ENTERPRISES_CHANGED_EVENT)); //dispatch event để cập nhật danh sách doanh nghiệp
      } catch (e) {
        setToast(e instanceof Error ? e.message : ADMIN_ENTERPRISE_MSG.genericError); //set thông báo lỗi
      } finally {
        setBusyId(null); //reset id của doanh nghiệp đang xử lý
      }
    })(); //hàm phê duyệt doanh nghiệp
  };

  const submitApprove = () => { //kích hoạt khi Admin click vào nút "Phê duyệt" (icon check) trong modal từ chối doanh nghiệp.
    if (!statusTarget) return; //nếu không có doanh nghiệp đang xử lý thì không phê duyệt doanh nghiệp
    approveRow(statusTarget); //gọi hàm phê duyệt doanh nghiệp
  };

  const startReject = () => { //kích hoạt khi Admin click vào nút "Từ chối" (icon x) trong modal từ chối doanh nghiệp.
    if (!statusTarget) return; //nếu không có doanh nghiệp đang xử lý thì không từ chối doanh nghiệp
    const label = companyTaxLabel(statusTarget); //tạo label tên doanh nghiệp và mã số thuế
    if (!window.confirm(buildRejectEnterpriseStartConfirmMessage(label))) return; //xác nhận từ chối doanh nghiệp
    setRejectOpen(true); //set modal từ chối doanh nghiệp
    setRejectText(""); //reset lỗi từ chối doanh nghiệp
    setRejectTextError(""); //reset lỗi từ chối doanh nghiệp
  };

  const submitReject = async () => { //kích hoạt khi Admin click vào nút "Gửi từ chối" (icon x) trong modal từ chối doanh nghiệp.
    if (!statusTarget) return; //nếu không có doanh nghiệp đang xử lý thì không từ chối doanh nghiệp
    setRejectTextError(""); //reset lỗi từ chối doanh nghiệp
    const reasons = rejectText //lấy lý do từ chối doanh nghiệp
      .split("\n")
      .map((l) => l.trim()) //loại bỏ khoảng trắng
      .filter(Boolean); //loại bỏ khoảng trắng
    if (!reasons.length) { //nếu không có lý do từ chối doanh nghiệp thì set lỗi
      setRejectTextError(ADMIN_ENTERPRISE_MSG.rejectReasonRequired); //set lỗi từ chối doanh nghiệp
      return; //nếu không có lý do từ chối doanh nghiệp thì không từ chối doanh nghiệp
    }
    setBusyId(statusTarget.id); //set id của doanh nghiệp đang xử lý
    setToast(""); //reset thông báo
    try {
      const res = await fetch(`/api/admin/enterprises/${statusTarget.id}/status`, { //fetch dữ liệu từ chối doanh nghiệp theo id
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", reasons })
      });
      const data = await res.json(); //lấy dữ liệu từ chối doanh nghiệp từ API
      if (!res.ok) throw new Error(data.message || ADMIN_ENTERPRISE_MSG.rejectFail);
      setToast(String(data.message)); //set thông báo thành công
      closeStatusModal(); //đóng modal từ chối doanh nghiệp
      await load({ force: true }); //tải dữ liệu danh sách doanh nghiệp
      window.dispatchEvent(new Event(ADMIN_PENDING_ENTERPRISES_CHANGED_EVENT)); //dispatch event để cập nhật danh sách doanh nghiệp
    } catch (e) {
      const msg = e instanceof Error ? e.message : ADMIN_ENTERPRISE_MSG.genericError; //set thông báo lỗi
      setToast(msg); //set thông báo lỗi
      if (typeof msg === "string") setRejectTextError(msg); //set lỗi từ chối doanh nghiệp
    } finally {
      setBusyId(null); //reset id của doanh nghiệp đang xử lý
    }
  }; //hàm từ chối doanh nghiệp

  return ( //trả về giao diện quản lý doanh nghiệp
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Quản lý doanh nghiệp</h1>
      </header>

      {toast ? <MessagePopup open message={toast} onClose={dismissToast} /> : null}

      {!loading && enterpriseStatusStats ? (
        <section aria-label="Thống kê trạng thái doanh nghiệp" style={{ marginBottom: 8 }}>
          <div className={styles.statsGrid3}>
            <DashboardStatSummaryCard
              cardClassName={`${styles.statCard} ${styles.statCardTintPending}`}
              labelClassName={styles.statLabel}
              valueClassName={styles.statValue}
              label="DN chờ phê duyệt"
              value={enterpriseStatusStats.pending}
              Icon={FiClock}
            />
            <DashboardStatSummaryCard
              cardClassName={`${styles.statCard} ${styles.statCardTintApproved}`}
              labelClassName={styles.statLabel}
              valueClassName={styles.statValue}
              label="DN đã phê duyệt"
              value={enterpriseStatusStats.approved}
              Icon={FiCheckCircle}
            />
            <DashboardStatSummaryCard
              cardClassName={`${styles.statCard} ${styles.statCardTintRejected}`}
              labelClassName={styles.statLabel}
              valueClassName={styles.statValue}
              label="DN bị từ chối"
              value={enterpriseStatusStats.rejected}
              Icon={FiXCircle}
            />
          </div>
        </section>
      ) : null}

      <AdminEnterpriseToolbar
        searchQ={searchQ}
        searchStatus={searchStatus}
        onChangeSearchQ={setSearchQ}
        onChangeSearchStatus={setSearchStatus}
        onSearch={applySearch}
      />

      {loading && items.length === 0 ? <ChartStyleLoading variant="block" /> : null}
      {error ? <p className={styles.error}>{error}</p> : null}

      {!loading && !error ? (
        <AdminEnterpriseTable
          items={items}
          page={page}
          busyId={busyId}
          onView={(row) => void openView(row)} //kích hoạt khi Admin click vào nút "Xem" (icon eye) ở một dòng nào đó trên bảng.
          onDelete={(row) => void deleteEnterprise(row)} //kích hoạt khi Admin click vào nút "Xóa" (icon trash) ở một dòng nào đó trên bảng.
          onOpenStatus={(row) => openStatusModal(row)} //kích hoạt khi Admin click vào nút "Phê duyệt" (icon check) hoặc "Từ chối" (icon x) ở một dòng nào đó trên bảng.
        />
      ) : null}

      {!loading && !error ? (
        <Pagination
          page={page}
          pageSize={ADMIN_QUAN_LY_DOANH_NGHIEP_PAGE_SIZE}
          totalItems={items.length}
          onPageChange={setPage}
          buttonClassName={styles.btn}
        />
      ) : null}

      <AdminEnterpriseViewPopup
        viewLoading={viewLoading}
        viewDetail={viewDetail}
        onClose={() => {
          setViewDetail(null);
          setViewLoading(false);
        }}
      />

      <AdminEnterpriseStatusPopup
        statusTarget={statusTarget}
        statusDetail={statusDetail}
        rejectOpen={rejectOpen}
        rejectText={rejectText}
        rejectTextError={rejectTextError}
        busyId={busyId}
        onClose={closeStatusModal}
        onStartReject={startReject}
        onSubmitApprove={submitApprove}
        onSubmitReject={() => void submitReject()}
        onChangeRejectText={setRejectText}
        onBackFromReject={() => {
          setRejectOpen(false);
          setRejectText("");
        }}
      />
    </main>
  );
}
