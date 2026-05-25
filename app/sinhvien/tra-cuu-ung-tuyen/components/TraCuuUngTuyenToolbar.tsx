import type { WorkTypeFilter } from "@/lib/types/sinhvien-tra-cuu-ung-tuyen"; //import type kiểu làm việc
import { SINHVIEN_TRA_CUU_UNG_TUYEN_SEARCH_BUTTON_TEXT } from "@/lib/constants/sinhvien-tra-cuu-ung-tuyen"; //import constants thông tin tin tuyển dụng
import adminStyles from "../../../admin/styles/dashboard.module.css";

type Props = { //type props toolbar tra cứu ứng tuyển
  q: string;
  workType: WorkTypeFilter;
  province: string;
  provinceOptions: string[];
  onQChange: (v: string) => void;
  onWorkTypeChange: (v: WorkTypeFilter) => void;
  onProvinceChange: (v: string) => void;
  onSearch: () => void;
};

export default function TraCuuUngTuyenToolbar({ //hàm toolbar tra cứu ứng tuyển
  q,
  workType,
  province,
  provinceOptions,
  onQChange,
  onWorkTypeChange,
  onProvinceChange,
  onSearch
}: Props) {
  return (
    <div className={adminStyles.searchToolbar}>
      <div className={`${adminStyles.searchField} ${adminStyles.searchFieldGrow}`}>
        <input
          className={adminStyles.textInputSearch}
          value={q}
          onChange={(e) => onQChange(e.target.value)}
          placeholder="Tìm theo vị trí tuyển dụng/tên doanh nghiệp"
        />
      </div>
      <div className={adminStyles.searchField}>
        <label>Hình thức làm việc</label>
        <select
          className={adminStyles.selectInput}
          value={workType}
          onChange={(e) => onWorkTypeChange(e.target.value as WorkTypeFilter)}
        >
          <option value="all">Tất cả</option>
          <option value="PART_TIME">Part-time</option>
          <option value="FULL_TIME">Full-time</option>
        </select>
      </div>
      <div className={adminStyles.searchField}>
        <label>Địa điểm (Tỉnh/Thành)</label>
        <select className={adminStyles.selectInput} value={province} onChange={(e) => onProvinceChange(e.target.value)}>
          <option value="all">Tất cả</option>
          {provinceOptions.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>
      <button type="button" className={`${adminStyles.btn} ${adminStyles.btnPrimary}`} onClick={onSearch}>
        {SINHVIEN_TRA_CUU_UNG_TUYEN_SEARCH_BUTTON_TEXT}
      </button>
    </div>
  );
}
