"use client";

import type { Degree, InternshipStatus } from "@/lib/types/admin-quan-ly-sinh-vien";
import {
  ADMIN_QUAN_LY_SINH_VIEN_DEGREE_OPTIONS,
  ADMIN_QUAN_LY_SINH_VIEN_INTERNSHIP_STATUS_LABEL,
  ADMIN_QUAN_LY_SINH_VIEN_INTERNSHIP_STATUS_OPTIONS
} from "@/lib/constants/admin-quan-ly-sinh-vien"; 
import styles from "../../styles/dashboard.module.css";

type Props = { 
  searchQ: string;
  filterFaculty: string; 
  filterInternshipStatus: InternshipStatus | "all"; 
  filterDegree: Degree | "all"; 
  faculties: string[]; 
  busy: boolean; 
  onChangeSearchQ: (v: string) => void; 
  onChangeFilterFaculty: (v: string) => void; 
  onChangeFilterInternshipStatus: (v: InternshipStatus | "all") => void; 
  onChangeFilterDegree: (v: Degree | "all") => void; 
  onSearch: () => void; 
  onExportFiltered: () => void; 
  onOpenAdd: () => void; 
  onOpenImport: () => void; 
};

export default function AdminSinhVienToolbar(props: Props) { 
  const {
    searchQ,
    filterFaculty,
    filterInternshipStatus,
    filterDegree,
    faculties,
    busy,
    onChangeSearchQ,
    onChangeFilterFaculty,
    onChangeFilterInternshipStatus,
    onChangeFilterDegree,
    onSearch,
    onExportFiltered,
    onOpenAdd,
    onOpenImport
  } = props;

  return ( 
    <div className={styles.searchToolbar}>
      <div className={`${styles.searchField} ${styles.searchFieldGrow}`}>
        <label>Tìm theo MSV / Họ tên / SĐT / Email</label>
        <input
          className={styles.textInputSearch}
          value={searchQ}
          onChange={(e) => onChangeSearchQ(e.target.value)}
          placeholder="Nhập từ khóa"
        />
      </div>

      <div className={styles.searchField}>
        <label>Khoa</label>
        <select className={styles.selectInput} value={filterFaculty} onChange={(e) => onChangeFilterFaculty(e.target.value)}>
          <option value="all">Tất cả</option>
          {faculties.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.searchField}>
        <label>Trạng thái thực tập</label>
        <select
          className={styles.selectInput}
          value={filterInternshipStatus}
          onChange={(e) => onChangeFilterInternshipStatus(e.target.value as InternshipStatus | "all")}
        >
          <option value="all">Tất cả</option>
          {ADMIN_QUAN_LY_SINH_VIEN_INTERNSHIP_STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {ADMIN_QUAN_LY_SINH_VIEN_INTERNSHIP_STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.searchField}>
        <label>Bậc</label>
        <select
          className={styles.selectInput}
          value={filterDegree}
          onChange={(e) => onChangeFilterDegree(e.target.value as Degree | "all")}
        >
          <option value="all">Tất cả</option>
          {ADMIN_QUAN_LY_SINH_VIEN_DEGREE_OPTIONS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
      </div>

      <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={onSearch}>
        Tìm kiếm
      </button>
      <button type="button" className={styles.btn} onClick={onExportFiltered} disabled={busy}>
        Xuất Excel theo bộ lọc
      </button>
      <div className={styles.searchToolbarActions}>
        <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={onOpenAdd} disabled={busy}>
          Thêm sinh viên
        </button>
        <button type="button" className={styles.btn} onClick={onOpenImport} disabled={busy}>
          Thêm danh sách (Excel)
        </button>
      </div>
    </div>
  );
}
