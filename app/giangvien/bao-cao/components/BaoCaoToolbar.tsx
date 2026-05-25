import type { Degree, InternshipStatus } from "@/lib/types/giangvien-bao-cao-thuc-tap";
import adminStyles from "../../../admin/styles/dashboard.module.css";

type Props = {
  q: string;
  degreeFilter: "all" | Degree;
  statusFilter: "all" | InternshipStatus;
  onQChange: (v: string) => void;
  onDegreeFilterChange: (v: "all" | Degree) => void;
  onStatusFilterChange: (v: "all" | InternshipStatus) => void;
  onSearch: () => void;
  onExportFiltered: () => void;
  busy: boolean;
};

export default function BaoCaoToolbar({ 
  q,
  degreeFilter,
  statusFilter,
  onQChange,
  onDegreeFilterChange,
  onStatusFilterChange,
  onSearch,
  onExportFiltered,
  busy
}: Props) {
  return (
    <div className={adminStyles.searchToolbar}>
      <div className={`${adminStyles.searchField} ${adminStyles.searchFieldGrow}`}>
        <label>Tìm theo MSV / Họ tên</label>
        <input
          className={adminStyles.textInputSearch}
          value={q}
          onChange={(e) => onQChange(e.target.value)}
          placeholder="Nhập MSV hoặc họ tên"
        />
      </div>
      <div className={adminStyles.searchField}>
        <label>Bậc</label>
        <select
          className={adminStyles.selectInput}
          value={degreeFilter}
          onChange={(e) => onDegreeFilterChange(e.target.value as "all" | Degree)}
        >
          <option value="all">Tất cả</option>
          <option value="BACHELOR">Cử nhân</option>
          <option value="ENGINEER">Kỹ sư</option>
        </select>
      </div>
      <div className={adminStyles.searchField}>
        <label>Trạng thái thực tập</label>
        <select
          className={adminStyles.selectInput}
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value as "all" | InternshipStatus)}
        >
          <option value="all">Tất cả</option>
          <option value="NOT_STARTED">Chưa thực tập</option>
          <option value="DOING">Đang thực tập</option>
          <option value="SELF_FINANCED">Thực tập tự túc</option>
          <option value="REPORT_SUBMITTED">Đã nộp BCTT</option>
          <option value="COMPLETED">Hoàn thành thực tập</option>
          <option value="REJECTED">Từ chối duyệt BCTT</option>
        </select>
      </div>
      <button
        type="button"
        className={`${adminStyles.btn} ${adminStyles.btnPrimary}`}
        onClick={onSearch}
      >
        Tìm kiếm
      </button>
      <button type="button" className={adminStyles.btn} onClick={onExportFiltered} disabled={busy}>
        Xuất Excel theo bộ lọc
      </button>
    </div>
  );
}
