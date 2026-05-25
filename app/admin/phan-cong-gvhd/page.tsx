"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import styles from "../styles/dashboard.module.css";
import MessagePopup from "../../components/MessagePopup"; //component popup thông báo
import { ChartStyleLoading } from "@/app/components/ChartStyleLoading"; //component loading
import Pagination from "../../components/Pagination"; //component pagination

import type {
  AssignmentItem,
  AssignmentStatus,
  OpenBatch,
  SupervisorOption,
  StudentOption
} from "@/lib/types/admin-phan-cong-gvhd"; //type phân công giảng viên hướng dẫn

import {
  ADMIN_PHAN_CONG_GVHD_PAGE_SIZE,
  ADMIN_PHAN_CONG_GVHD_STATUS_LABEL
} from "@/lib/constants/admin-phan-cong-gvhd";

import { studentDisplay, supervisorDisplay } from "@/lib/utils/admin-phan-cong-gvhd-display"; //hàm hiển thị sinh viên và giảng viên hướng dẫn
import { getOrFetchCached, hasCachedValue } from "@/lib/utils/client-query-cache"; //hàm lấy dữ liệu từ cache hoặc từ API

import AdminPhanCongGVHDTable from "./components/AdminPhanCongGVHDTable"; //component bảng phân công giảng viên hướng dẫn
import AdminPhanCongGVHDToolbar from "./components/AdminPhanCongGVHDToolbar"; //component toolbar phân công giảng viên hướng dẫn
const AdminPhanCongGVHDDeletePopup = dynamic(() => import("./components/AdminPhanCongGVHDDeletePopup"), { ssr: false }); //component xóa phân công giảng viên hướng dẫn
const AdminPhanCongGVHDViewPopup = dynamic(() => import("./components/AdminPhanCongGVHDViewPopup"), { ssr: false }); //component xem chi tiết phân công giảng viên hướng dẫn
const AdminPhanCongGVHDFormPopup = dynamic(() => import("./components/AdminPhanCongGVHDFormPopup"), { ssr: false }); //component thêm phân công giảng viên hướng dẫn

export default function AdminPhanCongGVHDPage() { //page phân công giảng viên hướng dẫn
  const [items, setItems] = useState<AssignmentItem[]>([]); //danh sách phân công giảng viên hướng dẫn
  const [faculties, setFaculties] = useState<string[]>([]);
  const [openBatches, setOpenBatches] = useState<OpenBatch[]>([]); //danh sách đợt thực tập
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(""); //lỗi

  const [searchQ, setSearchQ] = useState("");
  const [filterFaculty, setFilterFaculty] = useState<string>("all"); //khoa tìm kiếm
  const [filterStatus, setFilterStatus] = useState<AssignmentStatus | "all">("all");

  const [toastPopup, setToastPopup] = useState<{ open: boolean; message: string }>({ open: false, message: "" }); //popup thông báo
  const showPopup = (message: string) => setToastPopup({ open: true, message }); //hàm hiển thị popup thông báo

  const [viewTarget, setViewTarget] = useState<AssignmentItem | null>(null); //phân công giảng viên hướng dẫn đang xem
  const [deleteTarget, setDeleteTarget] = useState<AssignmentItem | null>(null); //phân công giảng viên hướng dẫn đang xóa      

  const [addOpen, setAddOpen] = useState(false); //trạng thái open popup thêm phân công giảng viên hướng dẫn
  const [busyId, setBusyId] = useState<string | null>(null);

  const [page, setPage] = useState(1); //trang hiện tại

  const [formFaculty, setFormFaculty] = useState(""); //khoa đang chọn
  const [formBatchId, setFormBatchId] = useState(""); //đợt thực tập đang chọn
  const [formSupervisorId, setFormSupervisorId] = useState(""); //giảng viên hướng dẫn đang chọn
  const [formStudentIds, setFormStudentIds] = useState<string[]>([]); //danh sách sinh viên đang chọn

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({}); //lỗi form

  const [supervisorQ, setSupervisorQ] = useState(""); //từ khóa tìm kiếm giảng viên hướng dẫn
  const [studentQ, setStudentQ] = useState(""); //từ khóa tìm kiếm sinh viên
  const [supervisorOptions, setSupervisorOptions] = useState<SupervisorOption[]>([]); //danh sách giảng viên hướng dẫn
  const [studentOptions, setStudentOptions] = useState<StudentOption[]>([]); //danh sách sinh viên
  const [optionsLoading, setOptionsLoading] = useState(false); //trạng thái loading

  const paged = useMemo(() => { //danh sách phân công giảng viên hướng dẫn hiển thị
    const start = (page - 1) * ADMIN_PHAN_CONG_GVHD_PAGE_SIZE;
    return items.slice(start, start + ADMIN_PHAN_CONG_GVHD_PAGE_SIZE);
  }, [items, page]); //danh sách phân công giảng viên hướng dẫn hiển thị theo trang

  //tải danh sách phân công giảng viên hướng dẫn (GVHD) từ Server về Client.
  async function loadList(nextPage = 1, opts?: { force?: boolean; silent?: boolean }) { //hàm tải danh sách phân công giảng viên hướng dẫn
    const force = Boolean(opts?.force); 
    const silent = Boolean(opts?.silent);
    try {
      const url = new URL("/api/admin/assignments", window.location.origin); //url api phân công giảng viên hướng dẫn
      if (searchQ.trim()) url.searchParams.set("q", searchQ.trim()); //từ khóa tìm kiếm
      if (filterFaculty !== "all") url.searchParams.set("faculty", filterFaculty); //khoa tìm kiếm
      if (filterStatus !== "all") url.searchParams.set("status", filterStatus); //trạng thái tìm kiếm
      const reqUrl = url.toString();
      const cacheKey = `admin:assignments:list:${reqUrl}`; //key cache
      if (!silent && !hasCachedValue(cacheKey)) setLoading(true);
      setError("");
      const data = await getOrFetchCached<any>(
        cacheKey,
        async () => {
          const res = await fetch(reqUrl); //fetch api phân công giảng viên hướng dẫn
          const payload = await res.json();
          if (!res.ok || !payload?.success) throw new Error(payload?.message || "Không thể tải danh sách phân công.");
          return payload; //dữ liệu phân công giảng viên hướng dẫn
        },
        { force } //force: true để tải lại dữ liệu từ server
      );
      setItems(Array.isArray(data.items) ? data.items : []); //danh sách phân công giảng viên hướng dẫn
      setFaculties(Array.isArray(data.faculties) ? data.faculties : []); //danh sách khoa
      setPage(nextPage); //trang hiện tại
    } catch (e: any) {
      setError(e?.message || "Không thể tải danh sách phân công.");
    } finally {
      if (!silent) setLoading(false);
    }
  }
//tải các dữ liệu danh mục nền tảng (Base Options) từ Server về để đổ vào các ô chọn (Select/Dropdown) trên giao diện.
  async function loadBaseOptions(opts?: { force?: boolean }) {  //lấy danh sách các đợt thực tập đang mở
    const force = Boolean(opts?.force);
    try {
      const data = await getOrFetchCached<any>(
        "admin:assignments:options",
        async () => {
          const res = await fetch("/api/admin/assignments/options");
          const json = await res.json();
          if (!res.ok || !json?.success) throw new Error(json?.message || "options");
          return json;
        },
        { force }
      );
      setOpenBatches(Array.isArray(data.openBatches) ? data.openBatches : []); //set danh sách đợt thực tập đang mở vào state
      if (Array.isArray(data.faculties)) setFaculties(data.faculties); //set danh sách khoa vào state
    } catch { //nếu lỗi thì không làm gì
      // ignore
    }
  }
//ải danh sách Giảng viên hướng dẫn (GVHD) từ Server về dựa theo Khoa, Đợt thực tập và Từ khóa tìm kiếm hiện tại.
  async function loadSupervisorOptions(args: { faculty: string; batchId: string }) {
    const { faculty, batchId } = args;
    if (!faculty || !batchId) return;
    const url = new URL("/api/admin/assignments/options/supervisors", window.location.origin); //url api giảng viên hướng dẫn
    url.searchParams.set("faculty", faculty);
    url.searchParams.set("internshipBatchId", batchId); //đợt thực tập
    if (supervisorQ.trim()) url.searchParams.set("q", supervisorQ.trim()); //từ khóa tìm kiếm
    const res = await fetch(url.toString()); //fetch api giảng viên hướng dẫn
    const data = await res.json(); //dữ liệu giảng viên hướng dẫn
    if (res.ok && data?.success && Array.isArray(data.items)) setSupervisorOptions(data.items); //set danh sách giảng viên hướng dẫn vào state
  }
//tải danh sách Sinh viên từ Server về dựa theo Khoa, Đợt thực tập và Từ khóa tìm kiếm hiện tại.
  async function loadStudentOptions(args: { faculty: string; batchId: string }) { //hàm tải danh sách sinh viên
    const { faculty, batchId } = args;
    if (!faculty || !batchId) return;
    const url = new URL("/api/admin/assignments/options/students", window.location.origin); //url api sinh viên
    url.searchParams.set("faculty", faculty); //khoa
    url.searchParams.set("internshipBatchId", batchId); //đợt thực tập
    if (studentQ.trim()) url.searchParams.set("q", studentQ.trim()); //từ khóa tìm kiếm
    const res = await fetch(url.toString()); //fetch api sinh viên
    const data = await res.json(); //dữ liệu sinh viên
    if (res.ok && data?.success && Array.isArray(data.items)) setStudentOptions(data.items);
  }
//mở popup thêm phân công giảng viên hướng dẫn
  function openAdd() { //hàm mở popup thêm phân công giảng viên hướng dẫn
    setFieldErrors({}); //reset lỗi form
    setSupervisorQ(""); //reset từ khóa tìm kiếm giảng viên hướng dẫn
    setStudentQ(""); //reset từ khóa tìm kiếm sinh viên
    setSupervisorOptions([]); //reset danh sách giảng viên hướng dẫn
    setStudentOptions([]); //reset danh sách sinh viên
    setFormFaculty(""); //reset khoa
    setFormBatchId(""); //reset đợt thực tập
    setFormSupervisorId(""); //reset giảng viên hướng dẫn
    setFormStudentIds([]); //reset danh sách sinh viên
    setAddOpen(true); //set trạng thái open popup thêm phân công giảng viên hướng dẫn
  }

  function closeAdd() { //hàm đóng popup thêm phân công giảng viên hướng dẫn
    setAddOpen(false);
    setFieldErrors({});
  }

  //khởi tạo khi trang load Chạy duy nhất một lần ngay khi Admin vừa bấm vào trang quản lý này.
  useEffect(() => { //tải danh sách phân công giảng viên hướng dẫn (GVHD) từ Server về Client.
    loadBaseOptions();
    loadList(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  //Tự động cập nhật dữ liệu ngầm
  useEffect(() => { 
    const timer = setInterval(() => {
      void loadBaseOptions({ force: true });
      void loadList(page, { force: true, silent: true });
    }, 30000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, searchQ, filterFaculty, filterStatus]);

  //Đảm bảo Admin không bị lỗi "bảng trắng" khi đang xem ở trang sau mà lại gõ tìm kiếm.
  useEffect(() => {
    setPage(1);
  }, [searchQ, filterFaculty, filterStatus]);

  // /Tự động tải danh sách Giảng viên & Sinh viên khi mở Form
  useEffect(() => {
    if (!addOpen) return;
    if (!formFaculty || !formBatchId) return;
    setOptionsLoading(true);
    Promise.all([
      loadSupervisorOptions({ faculty: formFaculty, batchId: formBatchId }),
      loadStudentOptions({ faculty: formFaculty, batchId: formBatchId })
    ]).finally(() => setOptionsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addOpen, formFaculty, formBatchId]);

  //Tìm kiếm Giảng viên & Sinh viên theo thời gian thực (Debounce Search)
  useEffect(() => {
    if (!addOpen || !formFaculty || !formBatchId) return;
    loadSupervisorOptions({ faculty: formFaculty, batchId: formBatchId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supervisorQ]);

  useEffect(() => {
    if (!addOpen || !formFaculty || !formBatchId) return;
    loadStudentOptions({ faculty: formFaculty, batchId: formBatchId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentQ]);

  function validateForm() { //hàm kiểm tra dữ liệu form
    const next: Record<string, string> = {}; //dữ liệu form     
    if (!formFaculty) next.faculty = "Khoa bắt buộc.";
    if (!formBatchId) next.internshipBatchId = "Đợt thực tập bắt buộc.";
    if (!formSupervisorId) next.supervisorProfileId = "GVHD bắt buộc.";
    if (!formStudentIds.length) next.studentProfileIds = "Danh sách sinh viên hướng dẫn bắt buộc.";
    setFieldErrors(next);
    return Object.keys(next).length === 0; //trả về true nếu không có lỗi
  }

  async function submitCreate() { //hàm submit form thêm phân công giảng viên hướng dẫn
    if (!validateForm()) return;
    //kiểm tra dữ liệu form
    setBusyId("submit");
    setError("");
    try {
      const payload = { //dữ liệu form
        faculty: formFaculty,
        internshipBatchId: formBatchId,
        supervisorProfileId: formSupervisorId,
        studentProfileIds: formStudentIds
      };
      const res = await fetch("/api/admin/assignments", { //fetch api thêm phân công giảng viên hướng dẫn
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json(); //dữ liệu phân công giảng viên hướng dẫn
      if (!res.ok || !data?.success) { //nếu lỗi thì hiển thị lỗi
        if (data?.errors) setFieldErrors(data.errors);
        throw new Error(data?.message || "Không thể tạo phân công.");
      }
      showPopup(data?.message || "Tạo phân công thành công."); //hiển thị popup thông báo thành công
      closeAdd();
      await loadList(1, { force: true }); //tải lại danh sách phân công giảng viên hướng dẫn
    } catch (e: any) {
      showPopup(e?.message || "Không thể tạo phân công."); //hiển thị popup thông báo lỗi
    } finally {
      setBusyId(null); //reset trạng thái loading
    }
  }

  async function submitDelete() { //hàm submit form xóa phân công giảng viên hướng dẫn
    if (!deleteTarget) return; //nếu không có phân công giảng viên hướng dẫn đang xóa thì không làm gì
    setBusyId(deleteTarget.id); //set trạng thái loading
    try {
      const res = await fetch(`/api/admin/assignments/student-links/${deleteTarget.id}`, { method: "DELETE" }); //fetch api xóa phân công giảng viên hướng dẫn
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.message || "Không thể xóa phân công.");
      showPopup(data?.message || "Xóa phân công thành công.");
      setDeleteTarget(null);
      await loadList(1, { force: true });
    } catch (e: any) {
      showPopup(e?.message || "Không thể xóa phân công.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Phân công giảng viên hướng dẫn</h1>
      </header>

      {error ? <p className={styles.error}>{error}</p> : null}

      <AdminPhanCongGVHDToolbar
        searchQ={searchQ}
        filterFaculty={filterFaculty}
        filterStatus={filterStatus}
        faculties={faculties}
        loading={loading}
        onChangeSearchQ={setSearchQ}
        onChangeFilterFaculty={setFilterFaculty}
        onChangeFilterStatus={setFilterStatus}
        onSearch={() => void loadList(1)}
        onOpenAdd={openAdd}
      />

      {loading && items.length === 0 ? (
        <ChartStyleLoading variant="block" />
      ) : (
        <AdminPhanCongGVHDTable
          paged={paged}
          page={page}
          busyId={busyId}
          onView={(it) => setViewTarget(it)}
          onDelete={(it) => setDeleteTarget(it)}
        />
      )}

      <Pagination
        page={page}
        pageSize={ADMIN_PHAN_CONG_GVHD_PAGE_SIZE}
        totalItems={items.length}
        onPageChange={setPage}
        buttonClassName={styles.btn}
      />

      {addOpen ? (
        <AdminPhanCongGVHDFormPopup
          open
          busyId={busyId}
          faculties={faculties}
          openBatches={openBatches}
          supervisorOptions={supervisorOptions}
          studentOptions={studentOptions}
          optionsLoading={optionsLoading}
          formFaculty={formFaculty}
          formBatchId={formBatchId}
          formSupervisorId={formSupervisorId}
          formStudentIds={formStudentIds}
          fieldErrors={fieldErrors}
          supervisorQ={supervisorQ}
          studentQ={studentQ}
          onClose={closeAdd}
          onSubmit={() => void submitCreate()}
          setFormFaculty={setFormFaculty}
          setFormBatchId={setFormBatchId}
          setFormSupervisorId={setFormSupervisorId}
          setFormStudentIds={setFormStudentIds}
          setSupervisorQ={setSupervisorQ}
          setStudentQ={setStudentQ}
        />
      ) : null}

      <AdminPhanCongGVHDViewPopup viewTarget={viewTarget} onClose={() => setViewTarget(null)} />

      <AdminPhanCongGVHDDeletePopup
        deleteTarget={deleteTarget}
        busyId={busyId}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void submitDelete()}
      />

      {toastPopup.open ? (
        <MessagePopup
          open
          title="Thông báo"
          onClose={() => setToastPopup({ open: false, message: "" })}
          actions={
            <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setToastPopup({ open: false, message: "" })}>
              Đóng
            </button>
          }
        >
          {toastPopup.message}
        </MessagePopup>
      ) : null}
    </main>
  );
}
