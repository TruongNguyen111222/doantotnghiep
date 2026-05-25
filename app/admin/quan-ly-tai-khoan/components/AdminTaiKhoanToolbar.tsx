"use client";
//component toolbar tài khoản
import type { AccountStatus, Role } from "@/lib/types/admin-quan-ly-tai-khoan";
import styles from "../../styles/dashboard.module.css";

type Props = { //props toolbar tài khoản
  searchQ: string; //từ khóa tìm kiếm
  filterRole: Role | "all"; //vai trò tìm kiếm
  filterStatus: AccountStatus | "all"; //trạng thái tìm kiếm
  onChangeSearchQ: (v: string) => void; //hàm xử lý từ khóa tìm kiếm
  onChangeFilterRole: (v: Role | "all") => void; //hàm xử lý vai trò tìm kiếm
  onChangeFilterStatus: (v: AccountStatus | "all") => void; //hàm xử lý trạng thái tìm kiếm
  onSearch: () => void; //hàm xử lý tìm kiếm
};

export default function AdminTaiKhoanToolbar(props: Props) {  //
  const { searchQ, filterRole, filterStatus, onChangeSearchQ, onChangeFilterRole, onChangeFilterStatus, onSearch } = props;

  return (
    <div className={styles.searchToolbar}>
      <div className={styles.searchField}>
        <label>Tìm kiếm (tên / SĐT / email / MST)</label>
        <input
          className={styles.textInputSearch}
          value={searchQ}
          onChange={(e) => onChangeSearchQ(e.target.value)}
          placeholder="Nhập từ khóa"
        />
      </div>
      <div className={styles.searchField}>
        <label>Phân quyền</label>
        <select className={styles.selectInput} value={filterRole} onChange={(e) => onChangeFilterRole(e.target.value as Role | "all")}>
          <option value="all">Tất cả</option>
          <option value="sinhvien">SV</option>
          <option value="giangvien">Giảng viên hướng dẫn</option>
          <option value="doanhnghiep">DN</option>
        </select>
      </div>
      <div className={styles.searchField}>
        <label>Trạng thái</label>
        <select className={styles.selectInput} value={filterStatus} onChange={(e) => onChangeFilterStatus(e.target.value as AccountStatus | "all")}>
          <option value="all">Tất cả</option>
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
