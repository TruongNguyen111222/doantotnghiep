"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "../../styles/register.module.css";

type Props = {
  labelId: string;
  value: string[];
  options: string[];
  disabled?: boolean;
  placeholder?: string;
  onChange: (next: string[]) => void;
};

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") //loại bỏ các ký tự unicode
    .trim(); //loại bỏ khoảng trắng ở đầu và cuối
}

export default function BusinessFieldsCombobox(props: Props) { //hàm render ra combobox lĩnh vực kinh doanh 
  const { labelId, value, options, disabled, placeholder, onChange } = props;
  const [open, setOpen] = useState(false); 
  const [q, setQ] = useState(""); //query tìm kiếm
  const rootRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);

  const selectedSet = useMemo(() => new Set(value), [value]);
  const filtered = useMemo(() => {
    const base = options.filter(Boolean);
    if (!q.trim()) return base;
    const nq = normalize(q);
    return base.filter((o) => normalize(o).includes(nq));
  }, [options, q]);

  useEffect(() => { //đóng combobox khi click ngoài
    if (!open) return;
    const onDocMouseDown = (e: MouseEvent) => {
      const el = rootRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [open]);

  useEffect(() => { //focus search khi combobox được mở
    if (!open) return;
    const t = window.setTimeout(() => searchRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  const toggle = (opt: string) => { //thêm hoặc xóa lĩnh vực khỏi combobox
    if (disabled) return;
    if (selectedSet.has(opt)) onChange(value.filter((v) => v !== opt));
    else onChange([...value, opt]);
  };

  const remove = (opt: string) => { //xóa lĩnh vực khỏi combobox
    if (disabled) return; 
    onChange(value.filter((v) => v !== opt));
  };

  return (
    <div ref={rootRef} className={styles.comboRoot}>
      <button
        type="button"
        className={`${styles.comboControl} ${open ? styles.comboControlOpen : ""}`}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={labelId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={styles.comboValue}>
          {value.length ? (
            <span className={styles.comboChips} aria-label={`Đã chọn ${value.length} lĩnh vực`}>
              {value.map((v) => (
                <span key={v} className={styles.comboChip}>
                  <span className={styles.comboChipText}>{v}</span>
                  <button
                    type="button"
                    className={styles.comboChipRemove}
                    onClick={(e) => {
                      e.stopPropagation();
                      remove(v);
                    }}
                    disabled={disabled}
                    aria-label={`Bỏ chọn ${v}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </span>
          ) : (
            <span className={styles.comboPlaceholder}>{placeholder || "Chọn lĩnh vực"}</span>
          )}
        </span>
        <span className={styles.comboCaret} aria-hidden="true">
          ▾
        </span>
      </button>

      {open ? (
        <div className={styles.comboDropdown} role="dialog" aria-label="Chọn lĩnh vực">
          <div className={styles.comboSearchRow}>
            <input
              ref={searchRef}
              className={styles.comboSearch}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm kiếm lĩnh vực…"
              disabled={disabled}
            />
          </div>

          <div className={styles.comboList} role="listbox" aria-multiselectable="true">
            {filtered.length ? (
              filtered.map((opt) => {
                const selected = selectedSet.has(opt);
                return (
                  <button
                    key={opt}
                    type="button"
                    className={`${styles.comboOption} ${selected ? styles.comboOptionSelected : ""}`}
                    onClick={() => toggle(opt)}
                    disabled={disabled}
                    role="option"
                    aria-selected={selected}
                  >
                    <span className={styles.comboOptionCheck} aria-hidden="true">
                      {selected ? "✓" : ""}
                    </span>
                    <span className={styles.comboOptionText}>{opt}</span>
                  </button>
                );
              })
            ) : (
              <div className={styles.comboEmpty}>Không có kết quả.</div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

