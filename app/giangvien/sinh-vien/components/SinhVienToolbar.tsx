import type { BatchOption, GuidanceStatus } from "@/lib/types/giangvien-sinh-vien";
import { guidanceStatusLabel } from "@/lib/constants/giangvien-sinh-vien";
import adminStyles from "../../../admin/styles/dashboard.module.css";

type Props = {
  q: string;
  batchId: string;
  guidanceStatus: "all" | GuidanceStatus;
  batches: BatchOption[];
  onQChange: (v: string) => void;
  onBatchIdChange: (v: string) => void;
  onGuidanceStatusChange: (v: "all" | GuidanceStatus) => void;
  onSearch: () => void;
};

export default function SinhVienToolbar({ //component toolbar sinh viên
  q,
  batchId,
  guidanceStatus,
  batches,
  onQChange,
  onBatchIdChange,
  onGuidanceStatusChange,
  onSearch
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
        <label>Đợt thực tập</label>
        <select
          className={adminStyles.selectInput}
          value={batchId}
          onChange={(e) => onBatchIdChange(e.target.value)}
        >
          <option value="">Tất cả</option>
          {batches.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>
      <div className={adminStyles.searchField}>
        <label>Trạng thái hướng dẫn</label>
        <select
          className={adminStyles.selectInput}
          value={guidanceStatus}
          onChange={(e) => onGuidanceStatusChange(e.target.value as "all" | GuidanceStatus)}
        >
          <option value="all">Tất cả</option>
          <option value="GUIDING">{guidanceStatusLabel.GUIDING}</option>
          <option value="COMPLETED">{guidanceStatusLabel.COMPLETED}</option>
        </select>
      </div>
      <button
        type="button"
        className={`${adminStyles.btn} ${adminStyles.btnPrimary}`}
        onClick={onSearch}
      >
        Tìm kiếm
      </button>
    </div>
  );
}
