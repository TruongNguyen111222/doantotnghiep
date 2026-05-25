"use client";

import type { InternshipBatchRow } from "@/lib/types/admin-quan-ly-tin-tuyen-dung";
import styles from "../../styles/dashboard.module.css";

type Props = { //type dữ liệu toolbar việc làm
  searchQ: string; //tìm kiếm tiêu đề
  searchBatchId: string; //tìm kiếm đợt thực tập
  searchExpertise: string; //tìm kiếng ngành/khoa
  searchStatus: string; //tìm kiếm trạng thái
  batches: InternshipBatchRow[]; //danh sách đợt thực tập
  expertises: string[]; //danh sách ngành/khoa
  loadingBatches: boolean; //trạng thái tải danh sách đợt thực tập
  onChangeSearchQ: (v: string) => void; //hàm thay đổi tìm kiếm tiêu đề
  onChangeSearchBatchId: (v: string) => void; //hàm thay đổi tìm kiếm đợt thực tập
  onChangeSearchExpertise: (v: string) => void; //hàm thay đổi tìm kiếng ngành/khoa
  onChangeSearchStatus: (v: string) => void; //hàm thay đổi tìm kiếm trạng thái
  onSearch: () => void; //hàm tìm kiếm
};

export default function AdminTinTuyenDungToolbar(props: Props) { //hàm tạo toolbar việc làm
  const {
    searchQ, //tìm kiếm tiêu đề
    searchBatchId, //tìm kiếm đợt thực tập
    searchExpertise, //tìm kiếng ngành/khoa
    searchStatus, //tìm kiếm trạng thái
    batches, //danh sách đợt thực tập
    expertises, //danh sách ngành/khoa
    loadingBatches, //trạng thái tải danh sách đợt thực tập
    onChangeSearchQ, //hàm thay đổi tìm kiếm tiêu đề
    onChangeSearchBatchId, //hàm thay đổi tìm kiếm đợt thực tập
    onChangeSearchExpertise, //hàm thay đổi tìm kiếng ngành/khoa
    onChangeSearchStatus, //hàm thay đổi tìm kiếm trạng thái
    onSearch, //hàm tìm kiếm
  } = props;

  return ( //render toolbar việc làm
    <div className={styles.searchToolbar}>
      <div className={`${styles.searchField} ${styles.searchFieldGrow}`}>
        <label>Tiêu đề / Tên doanh nghiệp</label>
        <input
          className={styles.textInputSearch}
          value={searchQ}
          onChange={(e) => onChangeSearchQ(e.target.value)}
          placeholder="Nhập tiêu đề hoặc tên DN"
          onKeyDown={(e) => e.key === "Enter" && onSearch()}
        />
      </div>

      <div className={styles.searchField}>
        <label>Đợt thực tập</label>
        <select
          className={styles.selectInput}
          value={searchBatchId}
          onChange={(e) => onChangeSearchBatchId(e.target.value)}
          disabled={loadingBatches}
        >
          <option value="all">Tất cả</option>
          {batches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} ({b.semester} {b.schoolYear})
            </option>
          ))}
        </select>
      </div>

      <div className={styles.searchField}>
        <label>Ngành/Khoa</label>
        <select
          className={styles.selectInput}
          value={searchExpertise}
          onChange={(e) => onChangeSearchExpertise(e.target.value)}
        >
          <option value="all">Tất cả</option>
          {expertises.map((ex) => (
            <option key={ex} value={ex}>
              {ex}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.searchField}>
        <label>Trạng thái</label>
        <select
          className={styles.selectInput}
          value={searchStatus}
          onChange={(e) => onChangeSearchStatus(e.target.value)}
        >
          <option value="all">Tất cả</option>
          <option value="PENDING">Chờ duyệt</option>
          <option value="REJECTED">Từ chối duyệt</option>
          <option value="ACTIVE">Đang hoạt động</option>
          <option value="STOPPED">Dừng hoạt động</option>
        </select>
      </div>

      <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={onSearch}>
        Tìm kiếm
      </button>
    </div>
  );
}
