"use client";
//Thanh tìm kiếm + lọc doanh nghiệp -Hiển thị giao diện tìm kiếm + lọc
import { EnterpriseStatus } from "@prisma/client";

import styles from "../../styles/dashboard.module.css";

type Props = { //kiểu dữ liệu cho toolbar
  searchQ: string; //từ khóa tìm kiếm
  searchStatus: string; //trạng thái lọc
  onChangeSearchQ: (v: string) => void; //hàm thay đổi từ khóa tìm kiếm
  onChangeSearchStatus: (v: string) => void; //hàm thay đổi trạng thái lọc
  onSearch: () => void; //hàm tìm kiếm
};

export default function AdminEnterpriseToolbar(props: Props) { //hàm tạo toolbar
  const { searchQ, searchStatus, onChangeSearchQ, onChangeSearchStatus, onSearch } = props; //lấy dữ liệu từ props

  return ( //hiển thị toolbar
    <div className={styles.searchToolbar}> 
      <div className={styles.searchField}>
        <label htmlFor="admin-dn-q">Tìm theo tên / MST</label>
        <input
          id="admin-dn-q"
          className={styles.textInputSearch}
          value={searchQ}
          onChange={(e) => onChangeSearchQ(e.target.value)}
          placeholder="Tên doanh nghiệp hoặc mã số thuế"
        />
      </div>
      <div className={styles.searchField}>
        <label htmlFor="admin-dn-status">Trạng thái</label>
        <select
          id="admin-dn-status"
          className={styles.selectInput}
          value={searchStatus}
          onChange={(e) => onChangeSearchStatus(e.target.value)}
        >
          <option value="all">Tất cả</option>
          <option value={EnterpriseStatus.PENDING}>Chờ phê duyệt</option>
          <option value={EnterpriseStatus.APPROVED}>Đã phê duyệt</option>
          <option value={EnterpriseStatus.REJECTED}>Từ chối</option>
        </select>
      </div>
      <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={onSearch}>
        Tìm kiếm
      </button>
    </div>
  );
}

