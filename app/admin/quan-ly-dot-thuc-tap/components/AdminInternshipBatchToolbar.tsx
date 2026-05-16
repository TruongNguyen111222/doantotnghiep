"use client";
//File này chính là giao diện Thanh công cụ tìm kiếm và Thao tác nhanh (Toolbar Component)
import type { InternshipBatchStatus } from "@/lib/types/admin-quan-ly-dot-thuc-tap"; //kiểu dữ liệu đợt thực tập

import styles from "../../styles/dashboard.module.css";

type Props = { //props cho toolbar đợt thực tập , nhạn dữ liệu vào để hiển thị và báo ngược lại cho component cha xử lý
  searchName: string;
  searchStart: string;
  searchEnd: string;
  searchStatus: "all" | InternshipBatchStatus;
  onChangeSearchName: (v: string) => void;
  onChangeSearchStart: (v: string) => void;
  onChangeSearchEnd: (v: string) => void;
  onChangeSearchStatus: (v: "all" | InternshipBatchStatus) => void;
  onSearch: () => void;
  onCreate: () => void;
};

export default function AdminInternshipBatchToolbar(props: Props) { //render toolbar đợt thực tập
  const {
    searchName,
    searchStart,
    searchEnd,
    searchStatus,
    onChangeSearchName,
    onChangeSearchStart,
    onChangeSearchEnd,
    onChangeSearchStatus,
    onSearch,
    onCreate
  } = props;

  return (
    <div className={styles.searchToolbar}>
      <div className={`${styles.searchField} ${styles.searchFieldGrow}`}>
        <label>Tên đợt thực tập</label>
        <input
          className={styles.textInputSearch}
          value={searchName}
          onChange={(e) => onChangeSearchName(e.target.value)}
          placeholder="Nhập tên"
        />
      </div>
      <div className={styles.searchField}>
        <label>Thời gian bắt đầu</label>
        <input
          className={styles.textInputSearch}
          type="date"
          value={searchStart}
          onChange={(e) => onChangeSearchStart(e.target.value)}
          placeholder="Chọn ngày"
        />
      </div>
      <div className={styles.searchField}>
        <label>Thời gian kết thúc</label>
        <input
          className={styles.textInputSearch}
          type="date"
          value={searchEnd}
          onChange={(e) => onChangeSearchEnd(e.target.value)}
          placeholder="Chọn ngày"
        />
      </div>
      <div className={styles.searchField}>
        <label>Trạng thái</label>
        <select
          className={styles.selectInput}
          value={searchStatus}
          onChange={(e) => onChangeSearchStatus(e.target.value as any)}
        >
          <option value="all">Tất cả</option>
          <option value="OPEN">Đang mở</option>
          <option value="CLOSED">Đóng</option>
        </select>
      </div>
      <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={onSearch}>
        Tìm kiếm
      </button>
      <div className={styles.searchToolbarActions}>
        <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={onCreate}>
          Thêm đợt thực tập
        </button>
      </div>
    </div>
  );
}

