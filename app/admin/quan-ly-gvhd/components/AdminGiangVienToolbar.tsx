"use client";

import type { Degree, ExternalTeacherFilter } from "@/lib/types/admin-quan-ly-gvhd";
import {
  ADMIN_QUAN_LY_GVHD_DEGREE_OPTIONS,
  ADMIN_QUAN_LY_GVHD_EXTERNAL_TEACHER_FILTER_OPTIONS
} from "@/lib/constants/admin-quan-ly-gvhd";

import styles from "../../styles/dashboard.module.css";

type Props = { //type props toolbar giảng viên
  searchQ: string;
  filterFaculty: string;
  filterDegree: Degree | "all";
  filterExternalTeacher: ExternalTeacherFilter;
  faculties: string[];
  busy: boolean;
  onChangeSearchQ: (v: string) => void;
  onChangeFilterFaculty: (v: string) => void;
  onChangeFilterDegree: (v: Degree | "all") => void;
  onChangeFilterExternalTeacher: (v: ExternalTeacherFilter) => void;
  onSearch: () => void;
  onOpenAdd: () => void;
  onOpenImport: () => void;
};

export default function AdminGiangVienToolbar(props: Props) {
  const {
    searchQ,
    filterFaculty,
    filterDegree,
    filterExternalTeacher,
    faculties,
    busy,
    onChangeSearchQ,
    onChangeFilterFaculty,
    onChangeFilterDegree,
    onChangeFilterExternalTeacher,
    onSearch,
    onOpenAdd,
    onOpenImport
  } = props;

  return (
    <div className={styles.searchToolbar}>
      <div className={`${styles.searchField} ${styles.searchFieldGrow}`}>
        <label>Tìm theo Họ tên / SĐT / Email</label>
        <input
          className={styles.textInputSearch}
          value={searchQ}
          onChange={(e) => onChangeSearchQ(e.target.value)}
          placeholder="Nhập từ khóa"
        />
      </div>
      <div className={styles.searchField}>
        <label>Khoa</label>
        <select
          className={styles.selectInput}
          value={filterFaculty}
          onChange={(e) => onChangeFilterFaculty(e.target.value)}
        >
          <option value="all">Tất cả</option>
          {faculties.map((f) => (
            <option key={f} value={f}>
              {f}
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
          {ADMIN_QUAN_LY_GVHD_DEGREE_OPTIONS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.searchField}>
        <label>Loại giảng viên</label>
        <select
          className={styles.selectInput}
          value={filterExternalTeacher}
          onChange={(e) => onChangeFilterExternalTeacher(e.target.value as ExternalTeacherFilter)}
        >
          {ADMIN_QUAN_LY_GVHD_EXTERNAL_TEACHER_FILTER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={onSearch}>
        Tìm kiếm
      </button>
      <div className={styles.searchToolbarActions}>
        <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={onOpenAdd} disabled={busy}>
          Thêm GVHD
        </button>
        <button type="button" className={styles.btn} onClick={onOpenImport} disabled={busy}>
          Thêm danh sách (Excel)
        </button>
      </div>
    </div>
  );
}

