"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import styles from "../styles/dashboard.module.css";
import { DashboardStatSummaryCard } from "@/app/components/DashboardStatSummaryCard";
import MessagePopup from "../../components/MessagePopup";
import { FiUserCheck, FiUserX } from "react-icons/fi";
import { AUTH_EMAIL_REGISTER_PATTERN } from "@/lib/constants/auth/patterns"; //hằng số email đăng ký
import { ADMIN_SUPERVISOR_EXCEL_HEADER, ADMIN_SUPERVISOR_EXCEL_SAMPLE_ROWS } from "@/lib/constants/admin-supervisors-excel"; //hằng số excel giảng viên

import type {
  Degree,
  ExternalTeacherFilter,
  Province,
  SupervisorFormState,
  SupervisorListItem,
  Ward
} from "@/lib/types/admin-quan-ly-gvhd";
import {
  ADMIN_QUAN_LY_GVHD_FACULTY_CUSTOM_VALUE,
  ADMIN_QUAN_LY_GVHD_NAME_PATTERN,
  ADMIN_QUAN_LY_GVHD_PHONE_PATTERN,
  ADMIN_QUAN_LY_GVHD_PAGE_SIZE
} from "@/lib/constants/admin-quan-ly-gvhd"; //hằng số giảng viên
import { calcAgeFromBirthDate, toBirthDateInputValue } from "@/lib/utils/admin-quan-ly-gvhd-dates"; //hàm tính tuổi từ ngày sinh
import { buildEmptySupervisorFormState } from "@/lib/utils/admin-quan-ly-gvhd-form"; //hàm tạo form giảng viên
import { deleteCacheByPrefix, getOrFetchCached, hasCachedValue } from "@/lib/utils/client-query-cache"; //hàm xóa cache và lấy dữ liệu từ cache

import AdminGiangVienToolbar from "./components/AdminGiangVienToolbar"; //component toolbar giảng viên
import AdminGiangVienTableSection from "./components/AdminGiangVienTableSection"; //component table giảng viên
const AdminGiangVienViewPopup = dynamic(() => import("./components/AdminGiangVienViewPopup"), { ssr: false });
const AdminGiangVienDeletePopup = dynamic(() => import("./components/AdminGiangVienDeletePopup"), { ssr: false });
const AdminGiangVienFormPopup = dynamic(() => import("./components/AdminGiangVienFormPopup"), { ssr: false });
const AdminGiangVienImportPopup = dynamic(() => import("./components/AdminGiangVienImportPopup"), { ssr: false });

export default function AdminQuanLyGVHDPage() { //component quan ly giảng viên hướng dẫn state giữ dữ liệu giảng viên
  const [items, setItems] = useState<SupervisorListItem[]>([]);
  const [faculties, setFaculties] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [latestBatchSupervisorStats, setLatestBatchSupervisorStats] = useState<{
    batchId: string | null;
    batchName: string | null;
    assigned: number;
    unassigned: number;
  } | null>(null);

  const [searchQ, setSearchQ] = useState("");
  const [filterFaculty, setFilterFaculty] = useState<string>("all");
  const [filterDegree, setFilterDegree] = useState<Degree | "all">("all");
  const [filterExternalTeacher, setFilterExternalTeacher] = useState<ExternalTeacherFilter>("all");

  const [toastPopup, setToastPopup] = useState<{ open: boolean; message: string }>({ open: false, message: "" });
  const showPopup = (message: string) => setToastPopup({ open: true, message });

  const [viewOpen, setViewOpen] = useState(false);
  const [viewItem, setViewItem] = useState<SupervisorListItem | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<SupervisorListItem | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<SupervisorListItem | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);

  const [form, setForm] = useState<SupervisorFormState>(() => buildEmptySupervisorFormState());
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  //hàm lấy dữ liệu giảng viên từ cache
  const fetchSupervisorDetailCached = async (id: string, force = false) =>
    getOrFetchCached<any>(
      `admin:supervisors:detail:${id}`,
      async () => {
        const res = await fetch(`/api/admin/supervisors/${id}`); //gửi request lấy dữ liệu giảng viên từ API
        const payload = await res.json();
        if (!res.ok || !payload.success || !payload.item) throw new Error(payload.message || "Không tải được thông tin giảng viên hướng dẫn.");
        return payload;
      },
      { force }
    );

  const [provinces, setProvinces] = useState<Province[]>([]); //danh sách tỉnh/thành
  const [wards, setWards] = useState<Ward[]>([]); //danh sách huyện/xã  
  const [addrLoading, setAddrLoading] = useState({ provinces: true, wards: false }); //trạng thái loading danh sách tỉnh/thành và huyện/xã

  useEffect(() => { //tải danh sách tỉnh/thành
    let cancelled = false;
    void (async () => {
      try {
        setAddrLoading({ provinces: true, wards: false });
        const res = await fetch("/api/vn-address/provinces"); //gửi request lấy danh sách tỉnh/thành từ API
        const data = await res.json(); //lấy dữ liệu từ API
        if (!cancelled) setProvinces((data.provinces || []) as Province[]); //lưu danh sách tỉnh/thành vào state
      } catch {
        if (!cancelled) setProvinces([]); //nếu lỗi thì không hiển thị danh sách tỉnh/thành
      } finally {
        if (!cancelled) setAddrLoading((s) => ({ ...s, provinces: false })); //ẩn loading
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => { //tải danh sách huyện/xã
    let cancelled = false;
    void (async () => {
      if (!form.permanentProvinceCode) {
        setWards([]);
        return;
      }
      setAddrLoading((s) => ({ ...s, wards: true }));
      try {
        const res = await fetch(`/api/vn-address/provinces/${form.permanentProvinceCode}/wards`);
        const data = await res.json();
        if (!cancelled) setWards((data.wards || []) as Ward[]);
      } catch {
        if (!cancelled) setWards([]);
      } finally {
        if (!cancelled) setAddrLoading((s) => ({ ...s, wards: false }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [form.permanentProvinceCode]);

  const load = async (opts?: { force?: boolean; silent?: boolean; targetPage?: number }) => { //hàm tải danh sách giảng viên hướng dẫn
    const force = Boolean(opts?.force); //kiểm tra xem có force tải lại dữ liệu không
    const silent = Boolean(opts?.silent); //kiểm tra xem có silent tải lại dữ liệu không
    const targetPage = opts?.targetPage ?? page; //lấy trang hiện tại
    try {
      const params = new URLSearchParams(); //tạo URLSearchParams
      if (searchQ.trim()) params.set("q", searchQ.trim()); //thêm từ khóa tìm kiếm vào URLSearchParams
      if (filterFaculty !== "all") params.set("faculty", filterFaculty);
      if (filterDegree !== "all") params.set("degree", filterDegree);
      if (filterExternalTeacher !== "all") params.set("externalTeacher", filterExternalTeacher);
      params.set("page", String(targetPage));
      params.set("pageSize", String(ADMIN_QUAN_LY_GVHD_PAGE_SIZE));
      const url = `/api/admin/supervisors?${params.toString()}`; //tạo URL từ URLSearchParams
      const cacheKey = `admin:supervisors:list:${url}`;
      if (!silent && !hasCachedValue(cacheKey)) setLoading(true);
      setError("");
      const data = await getOrFetchCached<any>(
        cacheKey,
        async () => {
          const res = await fetch(url); //gửi request tải danh sách giảng viên hướng dẫn từ API
          const payload = await res.json();
          if (!res.ok || !payload.success) throw new Error(payload.message || "Không tải được danh sách giảng viên hướng dẫn.");
          return payload;
        },
        { force }
      );
      setItems(data.items || []);
      setFaculties(data.faculties || []);
      setLatestBatchSupervisorStats(data.latestBatchSupervisorStats ?? null);
      setTotalItems(Number(data.totalItems || 0));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi.");
      setItems([]);
      setFaculties([]);
      setLatestBatchSupervisorStats(null);
      setTotalItems(0);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => { 
    void load({ targetPage: page });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => {
    const timer = setInterval(() => {
      void load({ force: true, silent: true, targetPage: page });
    }, 30000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQ, filterFaculty, filterDegree, filterExternalTeacher, page]);

  useEffect(() => {  
    if (!items.length) return;
    void Promise.allSettled(items.map((row) => fetchSupervisorDetailCached(row.id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const resetForm = () => { 
    setFieldErrors({});
    setForm(buildEmptySupervisorFormState());
  };

  const openAdd = () => { 
    setEditTarget(null);
    resetForm();
    setAddOpen(true);
  };

  const openEdit = (row: SupervisorListItem) => { 
    setEditTarget(row);
    setFieldErrors({});
    setForm({
      fullName: row.fullName,
      phone: row.phone || "",
      email: row.email,
      birthDate: toBirthDateInputValue(row.birthDate),
      gender: row.gender,
      permanentProvinceCode: row.permanentProvinceCode,
      permanentWardCode: row.permanentWardCode,
      faculty: row.faculty,
      facultyCustom: "",
      degree: row.degree,
      isExternalTeacher: row.isExternalTeacher
    });
  };

  const computeValidationErrors = (draft: SupervisorFormState) => { //hàm kiểm tra lỗi form giảng viên hướng dẫn
    const next: Record<string, string> = {};
    const effectiveFaculty =
      draft.faculty === ADMIN_QUAN_LY_GVHD_FACULTY_CUSTOM_VALUE //kiểm tra xem có phải khoa tùy chỉnh không
        ? draft.facultyCustom.trim() //lấy tên khoa tùy chỉnh
        : draft.faculty.trim(); //lấy tên khoa

    if (!draft.fullName || !ADMIN_QUAN_LY_GVHD_NAME_PATTERN.test(draft.fullName.trim()))
      next.fullName = "Họ tên chỉ gồm chữ và dấu cách (1–255 ký tự).";
    if (!draft.phone || !ADMIN_QUAN_LY_GVHD_PHONE_PATTERN.test(draft.phone.trim()))
      next.phone = "Số điện thoại chỉ gồm số (8–12 ký tự).";
    if (!draft.email || !AUTH_EMAIL_REGISTER_PATTERN.test(draft.email.trim())) next.email = "Email không đúng định dạng (ví dụ: example@domain.com).";

    if (!draft.birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(draft.birthDate)) next.birthDate = "Ngày sinh không hợp lệ (YYYY-MM-DD).";
    else {
      const age = calcAgeFromBirthDate(draft.birthDate);
      if (age == null) next.birthDate = "Ngày sinh không hợp lệ.";
      else if (age < 18) next.birthDate = "Giảng viên hướng dẫn phải đủ 18 tuổi trở lên.";
    }

    if (!draft.gender || !["MALE", "FEMALE", "OTHER"].includes(draft.gender)) next.gender = "Giới tính không hợp lệ.";
    if (!draft.permanentProvinceCode || !/^\d+$/.test(draft.permanentProvinceCode)) next.permanentProvinceCode = "Tỉnh/thành không hợp lệ.";
    if (!draft.permanentWardCode || !/^\d+$/.test(draft.permanentWardCode)) next.permanentWardCode = "Phường/xã không hợp lệ.";

    if (!effectiveFaculty) next.faculty = "Khoa bắt buộc.";
    if (
      draft.faculty === ADMIN_QUAN_LY_GVHD_FACULTY_CUSTOM_VALUE &&
      draft.facultyCustom &&
      !ADMIN_QUAN_LY_GVHD_NAME_PATTERN.test(draft.facultyCustom.trim())
    ) {
      next.facultyCustom = "Khoa chỉ gồm chữ và dấu cách (1–255 ký tự).";
    }

    if (!draft.degree || !["MASTER", "PHD", "ASSOC_PROF", "PROF"].includes(draft.degree)) next.degree = "Bậc không hợp lệ.";
    return next;
  };

  const submitCreate = async () => { //hàm gửi dữ liệu giảng viên hướng dẫn để tạo mới
    setBusyId("add");
    setFieldErrors({});
    try {
      const errors = computeValidationErrors(form);
      if (Object.keys(errors).length) {
        setFieldErrors(errors);
        return;
      }
      const res = await fetch("/api/admin/supervisors", { //gửi request tạo giảng viên hướng dẫn từ API
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          phone: form.phone.trim(),
          email: form.email.trim().toLowerCase(),
          birthDate: form.birthDate,
          gender: form.gender,
          permanentProvinceCode: form.permanentProvinceCode,
          permanentWardCode: form.permanentWardCode,
          faculty: (form.faculty === ADMIN_QUAN_LY_GVHD_FACULTY_CUSTOM_VALUE ? form.facultyCustom : form.faculty).trim(),
          degree: form.degree,
          isExternalTeacher: form.isExternalTeacher
        })
      });
      const data = await res.json(); //lấy dữ liệu từ API
      if (!res.ok) {
        if (data.errors) setFieldErrors(data.errors);
        showPopup(data.message || "Tạo giảng viên hướng dẫn thất bại.");
        return;
      }
      showPopup(data.message || "Tạo giảng viên hướng dẫn thành công.");
      setAddOpen(false);
      resetForm();
      deleteCacheByPrefix("admin:supervisors:");
      setPage(1);
      await load({ force: true, targetPage: 1 });
    } catch (e) {
      showPopup(e instanceof Error ? e.message : "Tạo giảng viên hướng dẫn thất bại.");
    } finally {
      setBusyId(null);
    }
  };

  const submitEdit = async () => { //hàm gửi dữ liệu giảng viên hướng dẫn để sửa
    if (!editTarget) return;
    setBusyId(editTarget.id);
    setFieldErrors({});
    try {
      const errors = computeValidationErrors(form);
      if (Object.keys(errors).length) {
        setFieldErrors(errors);
        return;
      }
      const res = await fetch(`/api/admin/supervisors/${editTarget.id}`, { //gửi request sửa giảng viên hướng dẫn từ API
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          phone: form.phone.trim(),
          email: editTarget.email,
          birthDate: form.birthDate,
          gender: form.gender,
          permanentProvinceCode: form.permanentProvinceCode,
          permanentWardCode: form.permanentWardCode,
          faculty: (form.faculty === ADMIN_QUAN_LY_GVHD_FACULTY_CUSTOM_VALUE ? form.facultyCustom : form.faculty).trim(),
          degree: form.degree,
          isExternalTeacher: form.isExternalTeacher
        })
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.errors) setFieldErrors(data.errors);
        showPopup(data.message || "Cập nhật giảng viên hướng dẫn thất bại.");
        return;
      }
      showPopup(data.message || "Cập nhật giảng viên hướng dẫn thành công.");
      setEditTarget(null);
      resetForm();
      deleteCacheByPrefix("admin:supervisors:");
      await load({ force: true, targetPage: page });
    } catch (e) {
      showPopup(e instanceof Error ? e.message : "Cập nhật giảng viên hướng dẫn thất bại.");
    } finally {
      setBusyId(null);
    }
  };

  const openView = async (row: SupervisorListItem) => { //hàm mở popup xem giảng viên hướng dẫn
    try {
      const data = await fetchSupervisorDetailCached(row.id); //tải thông tin chi tiết giảng viên hướng dẫn từ API
      setViewItem(data.item as SupervisorListItem); //set dữ liệu giảng viên hướng dẫn vào viewItem
      setViewOpen(true);
    } catch (e) {
      showPopup(e instanceof Error ? e.message : "Không tải được thông tin giảng viên hướng dẫn.");
    }
  };

  const submitDelete = async () => { //hàm gửi dữ liệu giảng viên hướng dẫn để xóa
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    try {
      const res = await fetch(`/api/admin/supervisors/${deleteTarget.id}`, { method: "DELETE" }); //gửi request xóa giảng viên hướng dẫn từ API
      const data = await res.json();
      if (!res.ok || !data.success) {
        showPopup(data.message || "Xóa thất bại.");
        return;
      }
      showPopup(data.message || "Xóa giảng viên hướng dẫn thành công."); //hiển thị thông báo xóa giảng viên hướng dẫn thành công
      setDeleteTarget(null);
      deleteCacheByPrefix("admin:supervisors:");
      await load({ force: true, targetPage: page }); //tải lại danh sách giảng viên hướng dẫn
    } catch (e) {
      showPopup(e instanceof Error ? e.message : "Xóa thất bại.");
    } finally {
      setBusyId(null);
    }
  };

  const downloadExcelTemplate = async () => { //hàm tải file Excel mẫu giảng viên hướng dẫn
    const XLSXMod = await import("xlsx");
    const XLSX = XLSXMod as any;
    const ws = XLSX.utils.aoa_to_sheet([
      [...ADMIN_SUPERVISOR_EXCEL_HEADER],
      ...ADMIN_SUPERVISOR_EXCEL_SAMPLE_ROWS.map((r) => [
        r.fullName,
        r.phone,
        r.email,
        r.birthDate,
        r.gender,
        r.provinceName,
        r.wardName,
        r.faculty,
        r.degree
      ])
    ]);

    const range = XLSX.utils.decode_range(ws["!ref"]);
    for (let c = range.s.c; c <= range.e.c; c++) {
      for (let r = range.s.r + 1; r <= range.e.r; r++) {
        const addr = XLSX.utils.encode_cell({ r, c });
        const cell = ws[addr];
        if (!cell) continue;
        cell.t = "s";
        cell.v = String(cell.v ?? "");
      }
    }

    ws["!cols"] = [
      { wch: 22 },
      { wch: 14 },
      { wch: 26 },
      { wch: 12 },
      { wch: 10 },
      { wch: 14 },
      { wch: 26 },
      { wch: 22 },
      { wch: 12 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Giảng viên hướng dẫn");   
    const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mau_gvhd_co_du_lieu.xlsx";
    document.body.appendChild(a); //thêm element vào body
    a.click(); //click vào element
    a.remove();
    URL.revokeObjectURL(url); //revoke object URL
  };

  const handleImportFile = async (file: File | null) => { //hàm import file Excel giảng viên hướng dẫn
    if (!file) return;
    setImportBusy(true); //set trạng thái loading import giảng viên hướng dẫn
    try {
      const lower = file.name.toLowerCase();
      if (!lower.endsWith(".xlsx") && !lower.endsWith(".xls")) {
        showPopup("Chỉ hỗ trợ file Excel (.xlsx, .xls).");
        return; //hiển thị thông báo lỗi nếu file không phải file Excel
      }

      const XLSXMod = await import("xlsx"); //import module xlsx
      const XLSX = XLSXMod as any;
      const buf = await file.arrayBuffer(); //lấy dữ liệu file Excel từ API
      const wb = XLSX.read(buf, { type: "array" }); //read file Excel
      const ws = wb.Sheets[wb.SheetNames[0]]; //lấy sheet từ file Excel
      const rows2d: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }); //lấy dữ liệu file Excel từ API
      if (!rows2d || rows2d.length <= 1 || rows2d.slice(1).every((r) => r.every((c) => String(c || "").trim() === ""))) {
        showPopup("File Excel không có dữ liệu. Vui lòng kiểm tra lại."); //hiển thị thông báo lỗi nếu file không có dữ liệu
        return;
      }

      const header = (rows2d[0] || []).map((h) => String(h).trim()); //lấy header từ file Excel
      const idx = (name: string) => header.findIndex((h) => h.toLowerCase() === name.toLowerCase()); //lấy index của header từ file Excel
      const i = {
        fullName: idx("Họ tên"),
        phone: idx("SĐT"),
        email: idx("Email"),
        birthDate: idx("Ngày sinh"),
        gender: idx("Giới tính"),
        province: idx("Tỉnh"),
        ward: idx("Phường/Xã"),
        faculty: idx("Khoa"),
        degree: idx("Bậc")
      };
      const hasAll = Object.values(i).every((x) => x >= 0); //kiểm tra xem có tất cả các cột có dữ liệu không
      if (!hasAll) {
        showPopup("File Excel không đúng cột dữ liệu. Vui lòng kiểm tra lại."); //hiển thị thông báo lỗi nếu file không đúng cột dữ liệu
        return;
      }

      const payloadRows: any[] = []; //dữ liệu giảng viên hướng dẫn import
      for (let rIdx = 1; rIdx < rows2d.length; rIdx++) {
        const line = rIdx + 1; //lấy số dòng từ file Excel  
        const row = rows2d[rIdx] || [];
        const get = (k: keyof typeof i) => String(row[i[k]] ?? "").trim();
        payloadRows.push({
          line,
          fullName: get("fullName"),
          phone: get("phone"),
          email: get("email"),
          birthDate: get("birthDate"),
          gender: get("gender"),
          permanentProvinceName: get("province"),
          permanentWardName: get("ward"),
          faculty: get("faculty"),
          degree: get("degree")
        });
      }

      const res = await fetch("/api/admin/supervisors/import", { //gửi request import giảng viên hướng dẫn từ API
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: payloadRows })
      });
      const data = await res.json(); //lấy dữ liệu từ API
      if (!res.ok || !data.success) {
        showPopup(data.message || "Tạo danh sách giảng viên hướng dẫn thất bại."); //hiển thị thông báo lỗi nếu tạo giảng viên hướng dẫn thất bại
        return;
      }
      showPopup(data.message || "Tạo danh sách giảng viên hướng dẫn thành công.");
      setImportOpen(false); //đóng popup import giảng viên hướng dẫn
      setImportFile(null);
      deleteCacheByPrefix("admin:supervisors:");
      setPage(1);
      await load({ force: true, targetPage: 1 });
    } catch (e) {
      showPopup(e instanceof Error ? e.message : "Tạo danh sách giảng viên hướng dẫn thất bại.");
    } finally {
      setImportBusy(false);
    }
  };

  return ( //render component
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Quản lý giảng viên hướng dẫn</h1>
      </header>

      {error ? <p className={styles.error}>{error}</p> : null}

      {!loading && latestBatchSupervisorStats?.batchId ? (
        <section aria-label="Thống kê phân công giảng viên hướng dẫn đợt mới nhất">
          <div className={styles.statusNote} style={{ marginBottom: 10 }}>
            Đợt thực tập mới nhất: <strong>{latestBatchSupervisorStats.batchName ?? "—"}</strong>
          </div>
          <div className={styles.statsGrid2}>
            <DashboardStatSummaryCard
              cardClassName={styles.statCard}
              labelClassName={styles.statLabel}
              valueClassName={styles.statValue}
              label="Giảng viên hướng dẫn đã được phân công"
              value={latestBatchSupervisorStats.assigned}
              Icon={FiUserCheck}
            />
            <DashboardStatSummaryCard
              cardClassName={styles.statCard}
              labelClassName={styles.statLabel}
              valueClassName={styles.statValue}
              label="Giảng viên hướng dẫn chưa được phân công"
              value={latestBatchSupervisorStats.unassigned}
              Icon={FiUserX}
            />
          </div>
        </section>
      ) : null}

      <AdminGiangVienToolbar
        searchQ={searchQ}
        filterFaculty={filterFaculty}
        filterDegree={filterDegree}
        filterExternalTeacher={filterExternalTeacher}
        faculties={faculties}
        busy={busyId !== null}
        onChangeSearchQ={setSearchQ}
        onChangeFilterFaculty={setFilterFaculty}
        onChangeFilterDegree={setFilterDegree}
        onChangeFilterExternalTeacher={setFilterExternalTeacher}
        onSearch={() => {
          setPage(1);
          void load({ force: true, targetPage: 1 });
        }}
        onOpenAdd={openAdd}
        onOpenImport={() => setImportOpen(true)}
      />

      <AdminGiangVienTableSection
        loading={loading}
        items={items}
        totalItems={totalItems}
        page={page}
        busyId={busyId}
        onPageChange={setPage}
        onView={(row) => void openView(row)}
        onEdit={openEdit}
        onDelete={setDeleteTarget}
      />

      <AdminGiangVienViewPopup
        open={viewOpen}
        item={viewItem}
        onClose={() => { setViewOpen(false); setViewItem(null); }}
      />

      <AdminGiangVienDeletePopup
        target={deleteTarget}
        busy={busyId !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void submitDelete()}
      />

      <AdminGiangVienFormPopup
        open={addOpen}
        mode="create"
        busy={busyId !== null}
        form={form}
        fieldErrors={fieldErrors}
        faculties={faculties}
        provinces={provinces}
        wards={wards}
        addrLoading={addrLoading}
        onClose={() => { setAddOpen(false); resetForm(); }}
        onSubmit={() => void submitCreate()}
        setForm={setForm}
      />

      <AdminGiangVienFormPopup
        open={editTarget !== null}
        mode="edit"
        busy={busyId !== null}
        form={form}
        fieldErrors={fieldErrors}
        faculties={faculties}
        provinces={provinces}
        wards={wards}
        addrLoading={addrLoading}
        editEmail={editTarget?.email}
        onClose={() => { setEditTarget(null); resetForm(); }}
        onSubmit={() => void submitEdit()}
        setForm={setForm}
      />

      <AdminGiangVienImportPopup
        open={importOpen}
        importBusy={importBusy}
        importFile={importFile}
        onClose={() => { setImportOpen(false); setImportFile(null); setImportBusy(false); }}
        onSetImportFile={setImportFile}
        onDownloadTemplate={() => void downloadExcelTemplate()}
        onSubmitImport={() => {
          if (!importFile) { showPopup("Vui lòng chọn file Excel để import."); return; }
          void handleImportFile(importFile);
        }}
      />

      {toastPopup.open ? (
        <MessagePopup open title="Thông báo" message={toastPopup.message} onClose={() => setToastPopup({ open: false, message: "" })} />
      ) : null}
    </main>
  );
}

