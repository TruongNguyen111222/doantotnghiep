"use client";

import { use, useEffect, useState } from "react";
import styles from "../../styles/dashboard.module.css";
import adminStyles from "../../../admin/styles/dashboard.module.css";
import MessagePopup from "../../../components/MessagePopup";
import { ChartStyleLoading } from "@/app/components/ChartStyleLoading";
import type { SinhVienApplyDraft, SinhVienTraCuuUngTuyenJobDetail } from "@/lib/types/sinhvien-tra-cuu-ung-tuyen-detail";
import {
  SINHVIEN_TRA_CUU_UNG_TUYEN_BACK_LINK_TEXT,
  SINHVIEN_TRA_CUU_UNG_TUYEN_LOAD_DETAIL_ERROR_DEFAULT,
  SINHVIEN_TRA_CUU_UNG_TUYEN_TITLE,
  SINHVIEN_TRA_CUU_UNG_TUYEN_SUBMIT_ERROR_DEFAULT
} from "@/lib/constants/sinhvien-tra-cuu-ung-tuyen-detail"; //import constants thông tin tin tuyển dụng
import { getCachedValue, getOrFetchCached, hasCachedValue } from "@/lib/utils/client-query-cache"; //import utils client query cache
import {
  buildSinhVienTraCuuUngTuyenApplyPayload,
  buildSinhVienTraCuuUngTuyenApplyUrl,
  fetchSinhVienHoSoProfileForApply,
  fetchSinhVienTraCuuUngTuyenDetail,
  getCvMimeValidationError,
  getSinhVienTraCuuUngTuyenOpenApplyErrorMessage,
  getSinhVienTraCuuUngTuyenSubmitErrorMessage,
  getSinhVienTraCuuUngTuyenSubmitSuccessMessage,
  validateSinhVienApplyDraft
} from "@/lib/utils/sinhvien-tra-cuu-ung-tuyen-detail"; //import utils sinh vien tra cuu ung tuyen detail
import JobDetailInfo from "./components/JobDetailInfo";
import ApplyFormPopup from "./components/ApplyFormPopup";

export default function SinhVienJobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: jobId } = use(params);
  const detailCacheKey = `sv:tra-cuu-ung-tuyen:detail:${jobId}`;
  const [loading, setLoading] = useState(() => !hasCachedValue(detailCacheKey));
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [job, setJob] = useState<SinhVienTraCuuUngTuyenJobDetail | null>(
    () => getCachedValue<{ item?: SinhVienTraCuuUngTuyenJobDetail | null }>(detailCacheKey)?.item ?? null
  );

  const [applyOpen, setApplyOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [intro, setIntro] = useState("");
  const [cvFileName, setCvFileName] = useState<string | null>(null);
  const [cvMime, setCvMime] = useState<string | null>(null);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [hasExistingCv, setHasExistingCv] = useState(false);
  const [removeCv, setRemoveCv] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function loadDetail(opts?: { force?: boolean; silent?: boolean }) { //hàm load chi tiết tin tuyển dụng
    const force = Boolean(opts?.force);
    const silent = Boolean(opts?.silent);
    const cacheKey = `sv:tra-cuu-ung-tuyen:detail:${jobId}`;
    if (!silent && !hasCachedValue(cacheKey)) setLoading(true);
    setError("");
    try {
      const data = await getOrFetchCached(cacheKey, () => fetchSinhVienTraCuuUngTuyenDetail(jobId), { force });
      setJob(data.item ?? null);
    } catch (e: any) {
      setError(e?.message || SINHVIEN_TRA_CUU_UNG_TUYEN_LOAD_DETAIL_ERROR_DEFAULT);
    } finally {
      if (!silent) setLoading(false);
    }
  }

  async function loadProfileForApply() { //hàm load hồ sơ sinh viên
    const profile = await fetchSinhVienHoSoProfileForApply();
    setFullName(profile.fullName);
    setPhone(profile.phone ?? "");
    setEmail(profile.email ?? "");
    setIntro(profile.intro ?? "");
    setCvFileName(profile.cvFileName ?? null);
    setCvMime(profile.cvMime ?? null);
    setCvFile(null);
    setHasExistingCv(Boolean(profile.hasCv));
    setRemoveCv(false);
    setFieldErrors({});
  }

  useEffect(() => {
    void loadDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  useEffect(() => {
    const timer = setInterval(() => {
      void loadDetail({ force: true, silent: true });
    }, 30000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  async function openApply() {
    try {
      await loadProfileForApply();
      setApplyOpen(true);
    } catch (e: any) {
      setToast(getSinhVienTraCuuUngTuyenOpenApplyErrorMessage(e));
    }
  }

  async function onChooseCv(file: File | null) {
    if (!file) return;
    const guessed = file.type || "";
    const guessedError = getCvMimeValidationError(guessed);
    if (guessedError) {
      setFieldErrors((prev) => ({ ...prev, cv: guessedError }));
      return;
    }
    setFieldErrors((prev) => ({ ...prev, cv: "" }));
    setCvFileName(file.name);
    setCvMime(guessed);
    setCvFile(file);
    setRemoveCv(false);
  }

  async function submitApply() { //hàm nộp hồ sơ ứng tuyển
    const draft: SinhVienApplyDraft = { //tạo draft hồ sơ sinh viên
      phone,
      email,
      intro,
      cvFileName,
      cvMime,
      cvFile,
      hasExistingCv,
      removeCv
    };

    const { isValid, errors } = validateSinhVienApplyDraft(draft); //kiểm tra hồ sơ sinh viên
    setFieldErrors(errors);
    if (!isValid) return;

    setBusy(true);
    try {
      const payload = buildSinhVienTraCuuUngTuyenApplyPayload(draft); //tạo payload ứng tuyển
      const fd = new FormData();
      fd.set("phone", payload.phone);
      fd.set("email", payload.email);
      fd.set("intro", payload.intro);
      if (cvFile) fd.set("cv", cvFile);
      if (removeCv) fd.set("removeCv", "1");

      const res = await fetch(buildSinhVienTraCuuUngTuyenApplyUrl(jobId), { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        if (data?.errors && typeof data.errors === "object") setFieldErrors(data.errors);
        throw new Error(data?.message || SINHVIEN_TRA_CUU_UNG_TUYEN_SUBMIT_ERROR_DEFAULT);
      }
      setApplyOpen(false);
      setToast(getSinhVienTraCuuUngTuyenSubmitSuccessMessage(data?.message));
      await loadDetail({ force: true });
    } catch (e: any) {
      setToast(getSinhVienTraCuuUngTuyenSubmitErrorMessage(e?.message));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>{SINHVIEN_TRA_CUU_UNG_TUYEN_TITLE}</h1>
        <p className={styles.subtitle}>
          <a className={adminStyles.detailLink} href="/sinhvien/tra-cuu-ung-tuyen">
            {SINHVIEN_TRA_CUU_UNG_TUYEN_BACK_LINK_TEXT}
          </a>
        </p>
      </header>

      {error ? <p className={adminStyles.error}>{error}</p> : null}

      {loading && !job ? (
        <ChartStyleLoading variant="block" />
      ) : job ? (
        <JobDetailInfo job={job} onOpenApply={() => void openApply()} />
      ) : null}

      {applyOpen ? (
        <ApplyFormPopup
          busy={busy}
          fullName={fullName}
          phone={phone}
          email={email}
          intro={intro}
          cvFileName={cvFileName}
          cvMime={cvMime}
          removeCv={removeCv}
          fieldErrors={fieldErrors}
          onPhoneChange={setPhone}
          onEmailChange={setEmail}
          onIntroChange={setIntro}
          onChooseCv={(f) => void onChooseCv(f)}
          onRemoveCv={() => {
            setRemoveCv(true);
            setCvFile(null);
            setCvMime(null);
            setCvFileName(null);
            setHasExistingCv(false);
          }}
          onClose={() => setApplyOpen(false)}
          onSubmit={() => void submitApply()}
        />
      ) : null}

      {toast ? <MessagePopup open message={toast} onClose={() => setToast("")} /> : null}
    </main>
  );
}

