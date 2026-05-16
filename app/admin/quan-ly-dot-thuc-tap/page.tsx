"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { FiLock, FiUnlock } from "react-icons/fi";
import { DashboardStatSummaryCard } from "@/app/components/DashboardStatSummaryCard"; //card thống kê trạng thái đợt thực tập
import styles from "../styles/dashboard.module.css";
import formStyles from "../../auth/styles/register.module.css"; //style đăng ký
import MessagePopup from "../../components/MessagePopup"; //popup thông báo
import FormPopup from "../../components/FormPopup"; //popup form

import type { ApiResponse, 
  BatchFormState, 
  InternshipBatchRow, 
  InternshipBatchStatus } from "@/lib/types/admin-quan-ly-dot-thuc-tap"; //kiểu dữ liệu đợt thực tập
import {
  ADMIN_QUAN_LY_DOT_THUC_TAP_PAGE_SIZE,
  ADMIN_QUAN_LY_DOT_THUC_TAP_SEMESTER_OPTIONS,
  ADMIN_QUAN_LY_DOT_THUC_TAP_STATUS_LABEL
} from "@/lib/constants/admin-quan-ly-dot-thuc-tap"; //hằng số thiết lập cho đợt thực tập
import { buildEmptyBatchForm } from "@/lib/utils/admin-quan-ly-dot-thuc-tap-form"; //hàm tạo form rỗng cho đợt thực tập
import { 
  formatDateVi, 
  getTodayStart, 
  parseDateOnly, 
  todayDateInputValue } from "@/lib/utils/admin-quan-ly-dot-thuc-tap-dates"; //hàm tiện ích cho đợt thực tập
import { getOrFetchCached, hasCachedValue } from "@/lib/utils/client-query-cache"; //hàm tiện ích cho cache

import AdminInternshipBatchToolbar from "./components/AdminInternshipBatchToolbar"; //toolbar đợt thực tập
import AdminInternshipBatchTableSection from "./components/AdminInternshipBatchTableSection"; //bảng đợt thực tập
import AdminInternshipBatchEditModal from "./components/AdminInternshipBatchEditModal"; //modal sửa đợt thực tập
const AdminInternshipBatchDeletePopup = dynamic(() => import("./components/AdminInternshipBatchDeletePopup"), { ssr: false }); //popup xóa đợt thực tập
const AdminInternshipBatchStatusPopup = dynamic(() => import("./components/AdminInternshipBatchStatusPopup"), { ssr: false }); //popup mở đóng đợt thực tập
const AdminInternshipBatchViewPopup = dynamic(() => import("./components/AdminInternshipBatchViewPopup"), { ssr: false }); //popup xem đợt thực tập

export default function AdminQuanLyDotThucTapPage() {  //render trang quản lý đợt thực tập
  const [loading, setLoading] = useState(true); // trạng thái loading
  const [error, setError] = useState(""); // lỗi  
  const [toast, setToast] = useState(""); // thông báo

  const [items, setItems] = useState<InternshipBatchRow[]>([]); // danh sách đợt thực tập
  const [batchStatusStats, setBatchStatusStats] = useState<{ open: number; closed: number } | null>(null); // thống kê trạng thái đợt thực tập

  const [searchName, setSearchName] = useState(""); // tên đợt thực tập
  const [searchStart, setSearchStart] = useState(""); // ngày bắt đầu
  const [searchEnd, setSearchEnd] = useState(""); // ngày kết thúc
  const [searchStatus, setSearchStatus] = useState<"all" | InternshipBatchStatus>("all"); // trạng thái đợt thực tập

  const [busyId, setBusyId] = useState<string | null>(null); // id đợt thực tập đang xử lý
  const [page, setPage] = useState(1); // trang hiện tại

  const [viewTarget, setViewTarget] = useState<InternshipBatchRow | null>(null); // đợt thực tập cần xem

  const [editTarget, setEditTarget] = useState<InternshipBatchRow | null>(null); // đợt thực tập cần sửa
  const [form, setForm] = useState<BatchFormState>(() => buildEmptyBatchForm()); // dữ liệu form đợt thực tập
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({}); // lỗi form đợt thực tập

  const [deleteTarget, setDeleteTarget] = useState<InternshipBatchRow | null>(null); // đợt thực tập cần xóa
  const [statusTarget, setStatusTarget] = useState<InternshipBatchRow | null>(null); // đợt thực tập cần mở đóng

  //Hàm đổ dữ liệu vào biểu mẫu sửa đợt thực tập khi click vào icon sửa
  const syncFormFromTarget = (t: InternshipBatchRow) => { //hàm đồng bộ dữ liệu form từ đợt thực tập
    setFieldErrors({}); //xóa lỗi form
    setForm({
      name: t.name || "", //tên đợt thực tập
      semester: t.semester, //học kỳ
      schoolYear: t.schoolYear || "", //năm học
      startDate: t.startDate ? new Date(t.startDate).toISOString().slice(0, 10) : todayDateInputValue(), //ngày bắt đầu
      endDate: t.endDate ? new Date(t.endDate).toISOString().slice(0, 10) : todayDateInputValue(), //ngày kết thúc
      notes: t.notes || "" //ghi chú
    });
  }; 

  const load = useCallback(async (opts?: { force?: boolean; silent?: boolean }) => { //hàm tải dữ liệu đợt thực tập
    const force = Boolean(opts?.force); //nếu force là true thì tải dữ liệu mới
    const silent = Boolean(opts?.silent); //nếu silent là true thì không hiển thị thông báo lỗi
    try {
      //kiểm tra xem Admin có nhập tên, ngày bắt đầu, ngày kết thúc hay chọn trạng thái nào không. 
      // Nếu có, nó sẽ tự động biến thành các tham số trên đường dẫn (Query Parameters).
      const params = new URLSearchParams(); //tạo query params
      if (searchName.trim()) params.set("q", searchName.trim()); //tên đợt thực tập
      if (searchStart) params.set("startDate", searchStart); //ngày bắt đầu
      if (searchEnd) params.set("endDate", searchEnd); //ngày kết thúc
      if (searchStatus !== "all") params.set("status", searchStatus); //trạng thái đợt thực tập
      const url = `/api/admin/internship-batches?${params.toString()}`; //tạo url để gọi API
      const cacheKey = `admin:internship-batches:list:${url}`; //tạo cache key
      if (!silent && !hasCachedValue(cacheKey)) setLoading(true); //nếu silent là false và cache key không tồn tại thì set loading là true
      setError(""); //reset lỗi
      setPage(1); //reset trang
      const data = await getOrFetchCached<any> ( //tải dữ liệu đợt thực tập từ cache hoặc từ API
        cacheKey,
        async () => {
          const res = await fetch(url); //fetch dữ liệu đợt thực tập từ API vào res
          const payload = (await res.json()) as ApiResponse<InternshipBatchRow>; //lấy dữ liệu đợt thực tập từ API
          if (!res.ok || !payload.success) throw new Error(payload.message || "Không tải được danh sách đợt thực tập.");
          return payload; //trả về dữ liệu đợt thực tập
        },
        { force } //nếu force là true thì tải dữ liệu mới
      );
      setItems((data.items || []) as any); //set dữ liệu đợt thực tập vào items
      setBatchStatusStats((data as any).batchStatusStats ?? null); //set thống kê trạng thái đợt thực tập vào batchStatusStats
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi."); //set lỗi
      setItems([]); //reset items
      setBatchStatusStats(null); //reset batchStatusStats
    } finally { //nếu không có lỗi thì set loading là false
      if (!silent) setLoading(false); //nếu silent là false thì set loading là false
    }
  }, [searchName, searchStart, searchEnd, searchStatus]); //phụ thuộc vào searchName, searchStart, searchEnd, searchStatus

  useEffect(() => { //Khởi động ngay lập tức khi mở trang
    void load(); //tải dữ liệu đợt thực tập
  }, [load]); //phụ thuộc vào load

  useEffect(() => { //Giữ cho dữ liệu luôn tươi mới bằng cách cập nhật ngầm định kỳ
    const timer = setInterval(() => {
      void load({ force: true, silent: true }); //tải dữ liệu đợt thực tập
    }, 30000); //cập nhật ngầm định kỳ 30 giây
    return () => clearInterval(timer); //xóa timer
  }, [load]); //phụ thuộc vào load

  const dismissToast = () => setToast(""); //reset thông báo

  const validateCreate = () => { //hàm kiểm tra dữ liệu đợt thực tập khi tạo mới
    const next: Record<string, string> = {}; // dữ liệu lỗi
    const name = form.name.trim(); //tên đợt thực tập
    const semester = form.semester; //học kỳ
    const schoolYear = form.schoolYear.trim(); //năm học

    if (!name || name.length < 1 || name.length > 255) next.name = "Tên đợt thực tập từ 1–255 ký tự."; //nếu tên đợt thực tập không hợp lệ
    if (!semester) next.semester = "Học kỳ bắt buộc."; //nếu học kỳ không hợp lệ
    if (!/^\d{4}-\d{4}$/.test(schoolYear)) next.schoolYear = "Năm học chỉ cho phép số, dấu '-' (ví dụ 2024-2025)."; //nếu năm học không hợp lệ
    if (!form.startDate) next.startDate = "Thời gian bắt đầu bắt buộc."; //nếu thời gian bắt đầu không hợp lệ
    if (!form.endDate) next.endDate = "Thời gian kết thúc bắt buộc."; //nếu thời gian kết thúc không hợp lệ

    if (form.startDate && form.endDate) { //nếu thời gian bắt đầu và thời gian kết thúc không hợp lệ
      const start = parseDateOnly(form.startDate); //ngày bắt đầu
      const end = parseDateOnly(form.endDate); //ngày kết thúc
      const today = new Date(); //ngày hiện tại
      today.setHours(0, 0, 0, 0);
      if (end.getTime() <= start.getTime()) next.endDate = "Thời gian kết thúc phải > thời gian bắt đầu."; //nếu thời gian kết thúc nhỏ hơn thời gian bắt đầu
      if (end.getTime() <= today.getTime()) next.endDate = "Thời gian kết thúc phải > ngày hiện tại."; //nếu thời gian kết thúc nhỏ hơn ngày hiện tại
    }

    setFieldErrors(next); //set dữ liệu lỗi vào fieldErrors
    return Object.keys(next).length === 0; //nếu không có lỗi thì trả về true
  };

  const validateEdit = () => { //hàm kiểm tra dữ liệu đợt thực tập khi sửa
    // Cho phép endDate <= ngày hiện tại (tự động đóng)
    const next = {} as Record<string, string>;  // dữ liệu lỗi rỗng
    if (!form.name.trim() || form.name.trim().length < 1 || form.name.trim().length > 255) next.name = "Tên đợt thực tập từ 1–255 ký tự.";
    if (!form.semester) next.semester = "Học kỳ bắt buộc.";
    if (!/^\d{4}-\d{4}$/.test(form.schoolYear.trim())) next.schoolYear = "Năm học chỉ cho phép số, dấu '-' (ví dụ 2024-2025).";
    if (!form.startDate) next.startDate = "Thời gian bắt đầu bắt buộc.";
    if (!form.endDate) next.endDate = "Thời gian kết thúc bắt buộc.";
    if (form.startDate && form.endDate) { //nếu thời gian bắt đầu và thời gian kết thúc không hợp lệ
      const start = parseDateOnly(form.startDate); //ngày bắt đầu
      const end = parseDateOnly(form.endDate); //ngày kết thúc
      if (end.getTime() <= start.getTime()) next.endDate = "Thời gian kết thúc phải > thời gian bắt đầu."; //nếu thời gian kết thúc nhỏ hơn thời gian bắt đầu
    }
    setFieldErrors(next); //set dữ liệu lỗi vào fieldErrors
    return Object.keys(next).length === 0; //nếu không có lỗi thì trả về true
  };

  const startCreate = () => { //hàm mở modal tạo đợt thực tập
    setEditTarget(null); //reset đợt thực tập cần sửa
    setFieldErrors({});
    setForm(buildEmptyBatchForm());
    setViewTarget(null);
    setDeleteTarget(null);
    setStatusTarget(null);
    // Use edit modal for create 
    setEditTarget({
      id: "new", //id đợt thực tập mới
      name: "",
      semester: "HK_I", //học kỳ
      schoolYear: "", //năm học
      startDate: todayDateInputValue(), //ngày bắt đầu
      endDate: todayDateInputValue(), //ngày kết thúc
      status: "OPEN", //trạng thái đợt thực tập
      notes: "" //ghi chú
    });
  };

  const closeEditModal = () => { //hàm đóng modal tạo đợt thực tập
    setEditTarget(null); //reset đợt thực tập cần sửa
    setFieldErrors({}); //reset lỗi form
  };

  const submitCreate = async () => { //hàm gửi dữ liệu đợt thực tập khi tạo mới
    if (!validateCreate()) return; //nếu không hợp lệ thì không gửi dữ liệu
    setBusyId("new"); //set id đợt thực tập đang xử lý
    setToast(""); //reset thông báo
    try {
      const payload = { //dữ liệu gửi đi
        name: form.name.trim(), //tên đợt thực tập
        semester: form.semester, //học kỳ
        schoolYear: form.schoolYear.trim(), //năm học
        startDate: form.startDate, //ngày bắt đầu
        endDate: form.endDate, //ngày kết thúc
        notes: form.notes.trim() //ghi chú
      };
      const res = await fetch("/api/admin/internship-batches", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); //gửi dữ liệu đợt thực tập đến API
      const data = (await res.json()) as ApiResponse<unknown>;
      if (!res.ok || !data.success) { //nếu không thành công thì set lỗi
        const maybeErrors = (data as any)?.errors as Record<string, string> | undefined;
        if (maybeErrors && typeof maybeErrors === "object") { //nếu có lỗi thì set lỗi
          setFieldErrors(maybeErrors); //set lỗi vào form
          return; //không gửi dữ liệu
        }
        setToast(data.message || "Tạo đợt thực tập thất bại."); //set thông báo lỗi
        return; //không gửi dữ liệu
      }
      setToast(data.message || "Tạo đợt thực tập thành công."); //set thông báo thành công
      closeEditModal(); //đóng modal tạo đợt thực tập
      await load({ force: true }); //tải dữ liệu đợt thực tập
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Tạo đợt thực tập thất bại."); //set thông báo lỗi
    } finally {
      setBusyId(null); //reset id đợt thực tập đang xử lý
    }
  };

  const submitEdit = async () => { //hàm gửi dữ liệu đợt thực tập khi sửa 
    if (!editTarget || editTarget.id === "new") return;
    if (!validateEdit()) return; //nếu không hợp lệ thì không gửi dữ liệu
    setBusyId(editTarget.id); //set id đợt thực tập đang xử lý
    setToast(""); //reset thông báo
    try {
      const payload = {
        name: form.name.trim(), //tên đợt thực tập
        semester: form.semester, //học kỳ
        schoolYear: form.schoolYear.trim(), //năm học
        startDate: form.startDate, //ngày bắt đầu
        endDate: form.endDate, //ngày kết thúc
        notes: form.notes.trim() //ghi chú
      };
      const res = await fetch(`/api/admin/internship-batches/${editTarget.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = (await res.json()) as ApiResponse<unknown>;
      if (!res.ok || !data.success) {
        const maybeErrors = (data as any)?.errors as Record<string, string> | undefined;
        if (maybeErrors && typeof maybeErrors === "object") {
          setFieldErrors(maybeErrors);
          return; //không gửi dữ liệu
        }
        setToast(data.message || "Cập nhật đợt thực tập thất bại."); //set thông báo lỗi
        return; //không gửi dữ liệu
      }
      setToast(data.message || "Cập nhật đợt thực tập thành công."); //set thông báo thành công
      closeEditModal(); //đóng modal sửa đợt thực tập
      await load({ force: true }); //tải dữ liệu đợt thực tập
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Cập nhật đợt thực tập thất bại."); //set thông báo lỗi
    } finally {
      setBusyId(null); //reset id đợt thực tập đang xử lý
    }
  };

  const doDelete = async () => { //hàm xóa đợt thực tập
    if (!deleteTarget) return; //nếu không có đợt thực tập cần xóa thì không xóa
    setBusyId(deleteTarget.id); //set id đợt thực tập đang xử lý
    setToast(""); //reset thông báo
    try {
      const res = await fetch(`/api/admin/internship-batches/${deleteTarget.id}`, { method: "DELETE" }); //xóa đợt thực tập theo id
      const data = (await res.json()) as ApiResponse<unknown>;
      if (!res.ok || !data.success) throw new Error(data.message || "Xóa đợt thực tập thất bại.");
      setToast(data.message || "Xóa đợt thực tập thành công."); //set thông báo thành công
      setDeleteTarget(null); //reset đợt thực tập cần xóa
      await load({ force: true }); //tải dữ liệu đợt thực tập
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Xóa đợt thực tập thất bại."); //set thông báo lỗi
    } finally {
      setBusyId(null); //reset id đợt thực tập đang xử lý
    }
  };

  const doCloseStatus = async () => { //hàm đóng đợt thực tập
    if (!statusTarget) return; //nếu không có đợt thực tập cần đóng thì không đóng
    setBusyId(statusTarget.id); //set id đợt thực tập đang xử lý
    setToast(""); //reset thông báo
    try {
      const res = await fetch(`/api/admin/internship-batches/${statusTarget.id}/status`, { //đóng đợt thực tập theo id
        method: "PATCH", //phương thức gửi dữ liệu
        headers: { "Content-Type": "application/json" }, //header gửi dữ liệu
        body: JSON.stringify({ action: "close" }) //dữ liệu gửi đi
      });
      const data = (await res.json()) as ApiResponse<unknown>; //lấy dữ liệu đợt thực tập từ API
      if (!res.ok || !data.success) throw new Error(data.message || "Cập nhật trạng thái thất bại.");
      setToast(data.message || "Đã đóng đợt thực tập."); //set thông báo thành công
      setStatusTarget(null); //reset đợt thực tập cần đóng
      await load({ force: true });
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Cập nhật trạng thái thất bại."); //set thông báo lỗi
    } finally {
      setBusyId(null); //reset id đợt thực tập đang xử lý
    }
  };

  const canClose = (t: InternshipBatchRow) => t.status === "OPEN"; //hàm kiểm tra trạng thái đợt thực tập

  const exportStudentsExcel = async (row: InternshipBatchRow) => { //hàm xuất excel danh sách sinh viên theo đợt thực tập
    setBusyId(row.id); //set id đợt thực tập đang xử lý
    setToast(""); //reset thông báo
    try { 
      const res = await fetch(`/api/admin/internship-batches/${encodeURIComponent(row.id)}/export-students`); //xuất excel danh sách sinh viên theo đợt thực tập theo id
      if (!res.ok) { //nếu không thành công thì set lỗi
        const j = (await res.json().catch(() => null)) as { message?: string } | null;
        throw new Error(j?.message || "Không xuất được file Excel.");
      }
      const cd = res.headers.get("Content-Disposition"); //lấy header gửi dữ liệu 
      let fn = "danh_sach_sinh_vien.xlsx"; //tên file excel
      if (cd) {
        const star = /filename\*=UTF-8''([^;\s]+)/i.exec(cd); //lấy tên file excel từ header gửi dữ liệu
        if (star?.[1]) { //nếu có tên file excel thì lấy tên file excel
          try {
            fn = decodeURIComponent(star[1]); //giải mã tên file excel
          } catch {
            fn = star[1]; //nếu không có tên file excel thì lấy tên file excel từ header gửi dữ liệu
          }
        } else { //nếu không có tên file excel thì lấy tên file excel từ header gửi dữ liệu
          const plain = /filename="([^"]+)"/i.exec(cd); //lấy tên file excel từ header gửi dữ liệu
          if (plain?.[1]) fn = plain[1]; //nếu có tên file excel thì lấy tên file excel
        }
      }
      const blob = await res.blob();        // 1. Chuyển dữ liệu trả về thành đối tượng Blob (khối dữ liệu nhị phân thô)
      const url = URL.createObjectURL(blob);// 2. Tạo một đường dẫn (URL) tạm thời trong bộ nhớ đại diện cho khối Blob này
      const a = document.createElement("a");// 3. Tạo ra một thẻ link <a> nằm ẩn trong bộ nhớ Javascript
      a.href = url;
      a.download = fn;                      // 4. Gán tên file đã bắt được ở Giai đoạn 3 vào thuộc tính download
      document.body.appendChild(a);         // 5. Gắn tạm thẻ <a> này vào trang web
      a.click();                            // 6. Giả lập hành động Admin click chuột vào link để kích hoạt hộp thoại lưu file của trình duyệt
      a.remove();                           // 7. Click xong thì xóa ngay thẻ <a> này đi cho sạch code
      URL.revokeObjectURL(url);             // 8. Giải phóng vùng bộ nhớ tạm thời vừa tạo để tránh tràn bộ nhớ (Memory Leak)
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Không xuất được file Excel.");
    } finally {
      setBusyId(null); //reset id đợt thực tập đang xử lý
    }
  };

  return ( //trả về trang quan lý đợt thực tập
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Quản lý đợt thực tập</h1>
        <p className={styles.subtitle}>Thêm, sửa, xóa và cập nhật trạng thái mở/đóng của các đợt.</p>
      </header>

      {toast ? <MessagePopup open message={toast} onClose={dismissToast} /> : null}

      {error ? <p className={styles.error}>{error}</p> : null}

      {!loading && batchStatusStats ? (
        <section aria-label="Thống kê trạng thái đợt thực tập">
          <div className={styles.statsGrid2}>
            <DashboardStatSummaryCard
              cardClassName={styles.statCard}
              labelClassName={styles.statLabel}
              valueClassName={styles.statValue}
              label="Đợt thực tập đang mở"
              value={batchStatusStats.open}
              Icon={FiUnlock}
            />
            <DashboardStatSummaryCard
              cardClassName={styles.statCard}
              labelClassName={styles.statLabel}
              valueClassName={styles.statValue}
              label="Đợt thực tập đã đóng"
              value={batchStatusStats.closed}
              Icon={FiLock}
            />
          </div>
        </section>
      ) : null}

      <AdminInternshipBatchToolbar
        searchName={searchName}
        searchStart={searchStart}
        searchEnd={searchEnd}
        searchStatus={searchStatus}
        onChangeSearchName={setSearchName}
        onChangeSearchStart={setSearchStart}
        onChangeSearchEnd={setSearchEnd}
        onChangeSearchStatus={setSearchStatus}
        onSearch={() => void load()}
        onCreate={startCreate}
      />

      <AdminInternshipBatchTableSection
        loading={loading}
        items={items}
        page={page}
        busyId={busyId}
        canClose={canClose}
        onPageChange={setPage}
        onView={setViewTarget}
        onEdit={(row) => {
          setEditTarget(row);
          syncFormFromTarget(row);
        }}
        onDelete={setDeleteTarget}
        onOpenStatus={setStatusTarget}
        onExportStudentsExcel={(r) => void exportStudentsExcel(r)}
      />

      <AdminInternshipBatchViewPopup viewTarget={viewTarget} onClose={() => setViewTarget(null)} />

      <AdminInternshipBatchEditModal
        editTarget={editTarget}
        form={form}
        fieldErrors={fieldErrors}
        busy={busyId !== null}
        onClose={closeEditModal}
        onSubmitCreate={() => void submitCreate()}
        onSubmitEdit={() => void submitEdit()}
        onOpenStatus={(t) => setStatusTarget(t)}
        setForm={setForm}
      />

      <AdminInternshipBatchDeletePopup
        deleteTarget={deleteTarget}
        busy={busyId !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void doDelete()}
      />

      <AdminInternshipBatchStatusPopup
        statusTarget={statusTarget}
        busy={busyId !== null}
        onClose={() => setStatusTarget(null)}
        onConfirmClose={() => void doCloseStatus()}
      />
    </main>
  );
}

