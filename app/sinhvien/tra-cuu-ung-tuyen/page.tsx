"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "../styles/dashboard.module.css";
import adminStyles from "../../admin/styles/dashboard.module.css";
import cardStyles from "./styles.module.css";
import type { SinhVienTraCuuUngTuyenItem, WorkTypeFilter } from "@/lib/types/sinhvien-tra-cuu-ung-tuyen";  //import type thông tin tin tuyển dụng và kiểu làm việc
import {
  SINHVIEN_TRA_CUU_UNG_TUYEN_EMPTY_TEXT,
  SINHVIEN_TRA_CUU_UNG_TUYEN_LOAD_ERROR_DEFAULT,
  SINHVIEN_TRA_CUU_UNG_TUYEN_SUBTITLE,
  SINHVIEN_TRA_CUU_UNG_TUYEN_TITLE,
  getSinhVienTraCuuUngTuyenStatusNoteText
} from "@/lib/constants/sinhvien-tra-cuu-ung-tuyen"; //import constants thông tin tin tuyển dụng
import { fetchSinhVienTraCuuUngTuyenList } from "@/lib/utils/sinhvien-tra-cuu-ung-tuyen"; //import hàm lấy danh sách tin tuyển dụng
import { fetchSinhVienTraCuuUngTuyenDetail } from "@/lib/utils/sinhvien-tra-cuu-ung-tuyen-detail"; //import hàm lấy chi tiết tin tuyển dụng
import { getOrFetchCached, hasCachedValue } from "@/lib/utils/client-query-cache";
import TraCuuUngTuyenToolbar from "./components/TraCuuUngTuyenToolbar";
import TraCuuUngTuyenJobGrid from "./components/TraCuuUngTuyenJobGrid";
import { ChartStyleLoading } from "@/app/components/ChartStyleLoading";
import type { VnProvince } from "@/lib/types/enterprise-register";

export default function SinhVienTraCuuUngTuyenPage() { //hàm trang tra cứu ứng tuyển
  const [loading, setLoading] = useState(true); //trạng thái loading
  const [error, setError] = useState(""); //lỗi
  const [items, setItems] = useState<SinhVienTraCuuUngTuyenItem[]>([]); //danh sách tin tuyển dụng
  const [canApply, setCanApply] = useState(false); //trạng thái có thể ứng tuyển
  const [internshipStatus, setInternshipStatus] = useState<"NOT_STARTED" | "DOING" | "SELF_FINANCED" | "REPORT_SUBMITTED" | "COMPLETED" | "REJECTED">("NOT_STARTED"); //trạng thái đăng ký thực tập

  const [q, setQ] = useState("");
  const [workType, setWorkType] = useState<WorkTypeFilter>("all");
  const [province, setProvince] = useState("all");
  const [provinceOptions, setProvinceOptions] = useState<string[]>([]);

  // Load full province list once for dropdown (not derived from result set)
  useEffect(() => { //hàm load danh sách tỉnh/thành
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/vn-address/provinces"); //gửi request lấy danh sách tỉnh/thành
        const data = await res.json();
        const items = Array.isArray(data?.provinces) ? (data.provinces as VnProvince[]) : []; //lấy danh sách tỉnh/thành
        const names = items.map((x) => String(x?.name || "").trim()).filter(Boolean); //lấy tên tỉnh/thành
        const dedup = Array.from(new Set(names)).sort((a, b) => a.localeCompare(b, "vi")); //lấy danh sách tỉnh/thành
        if (!cancelled) setProvinceOptions(dedup); //lấy danh sách tỉnh/thành
      } catch {
        if (!cancelled) setProvinceOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function load(opts?: { force?: boolean; silent?: boolean }) { //hàm load danh sách tin tuyển dụng
    const force = Boolean(opts?.force);
    const silent = Boolean(opts?.silent);
    try {
      const key = `sv:tra-cuu-ung-tuyen:list:q=${encodeURIComponent(q)}&workType=${workType}&province=${encodeURIComponent(province)}`;
      if (!silent && !hasCachedValue(key)) setLoading(true);
      setError("");
      const result = await getOrFetchCached(
        key,
        () => fetchSinhVienTraCuuUngTuyenList({ q, workType, province }), //api sinhvien/tra-cuu-ung-tuyen
        { force }
      );
      setItems(result.items);
      setCanApply(result.canApply);
      setInternshipStatus(result.internshipStatus);
    } catch (e: any) {
      setError(e?.message || SINHVIEN_TRA_CUU_UNG_TUYEN_LOAD_ERROR_DEFAULT);
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      void load({ force: true, silent: true });
    }, 30000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, workType, province]);

  useEffect(() => { //hàm load chi tiết tin tuyển dụng
    if (!items.length) return;
    void Promise.allSettled(
      items.map((it) =>
        getOrFetchCached(`sv:tra-cuu-ung-tuyen:detail:${it.id}`, () => fetchSinhVienTraCuuUngTuyenDetail(it.id)) //api sinhvien/tra-cuu-ung-tuyen/{id}
      )
    );
  }, [items]);

  const statusNote = useMemo(() => { //hàm lấy trạng thái ứng tuyển
    return getSinhVienTraCuuUngTuyenStatusNoteText(canApply, internshipStatus); //trả về trạng thái ứng tuyển
  }, [canApply, internshipStatus]);

  return ( //render trang tra cứu ứng tuyển
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>{SINHVIEN_TRA_CUU_UNG_TUYEN_TITLE}</h1> 
        <p className={styles.subtitle}>{SINHVIEN_TRA_CUU_UNG_TUYEN_SUBTITLE}</p>
      </header>

      {error ? <p className={adminStyles.error}>{error}</p> : null}

      <TraCuuUngTuyenToolbar
        q={q}
        workType={workType} //kiểu làm việc
        province={province} //tỉnh/thành
        provinceOptions={provinceOptions}
        onQChange={setQ}
        onWorkTypeChange={setWorkType}
        onProvinceChange={setProvince}
        onSearch={() => void load({ force: true })}
      />

      <p className={cardStyles.statusNote}>{statusNote}</p> 

      {loading && items.length === 0 ? (
        <ChartStyleLoading variant="block" /> //loading
      ) : items.length === 0 ? (
        <p className={styles.modulePlaceholder}>{SINHVIEN_TRA_CUU_UNG_TUYEN_EMPTY_TEXT}</p> //không có tin tuyển dụng
      ) : (
        <TraCuuUngTuyenJobGrid items={items} canApply={canApply} /> //render danh sách tin tuyển dụng
      )}
    </main>
  );
}

