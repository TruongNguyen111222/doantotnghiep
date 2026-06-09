"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import styles from "../styles/dashboard.module.css";
import adminStyles from "../../admin/styles/dashboard.module.css";
import MessagePopup from "../../components/MessagePopup";
import { ChartStyleLoading } from "@/app/components/ChartStyleLoading";
import { readFileAsBase64Payload } from "@/lib/utils/file-payload";
import type {
  InternshipStatus,
  Report,
  SupervisorInfo,
  StatusHistoryEvent
} from "@/lib/types/sinhvien-bao-cao-thuc-tap"; //hàm type sinh viên báo cáo thực tập
import {
  SINHVIEN_BAO_CAO_THUC_TAP_ENDPOINT,
  SINHVIEN_BAO_CAO_THUC_TAP_LOAD_ERROR_DEFAULT,
  SINHVIEN_BAO_CAO_THUC_TAP_SUBMIT_EDIT_ERROR_DEFAULT,
  SINHVIEN_BAO_CAO_THUC_TAP_SUBMIT_EDIT_SUCCESS_DEFAULT,
  SINHVIEN_BAO_CAO_THUC_TAP_SUBMIT_NEW_ERROR_DEFAULT,
  SINHVIEN_BAO_CAO_THUC_TAP_SUBMIT_NEW_SUCCESS_DEFAULT,
  BCTT_ERROR_INVALID_MIME,
  BCTT_ERROR_INVALID_ENTERPRISE_EVAL_MIME,
  BCTT_ERROR_REQUIRED_ENTERPRISE_EVAL,
  BCTT_ERROR_REQUIRED_FILE_BEFORE_EDIT,
  BCTT_ERROR_REQUIRED_FILE_BEFORE_SUBMIT
} from "@/lib/constants/sinhvien-bao-cao-thuc-tap"; //hàm constants sinh viên báo cáo thực tập
import { getSinhVienBaoCaoStatusHintText, isAllowedBcttMime } from "@/lib/utils/sinhvien-bao-cao-thuc-tap"; //hàm utils sinh viên báo cáo thực tập
import { getCachedValue, getOrFetchCached, hasCachedValue } from "@/lib/utils/client-query-cache";
import BaoCaoThucTapStatusSection from "./components/BaoCaoThucTapStatusSection"; //hàm component sinh viên báo cáo thực tập
import BaoCaoThucTapSupervisorSection from "./components/BaoCaoThucTapSupervisorSection"; //hàm component sinh viên báo cáo thực tập
import BaoCaoThucTapStatusHistorySection from "./components/BaoCaoThucTapStatusHistorySection"; //hàm component sinh viên báo cáo thực tập
import BaoCaoThucTapResultSection from "./components/BaoCaoThucTapResultSection"; //hàm component sinh viên báo cáo thực tập
const BaoCaoThucTapUploadPopup = dynamic(() => import("./components/BaoCaoThucTapUploadPopup"), { ssr: false }); //hàm component sinh viên báo cáo thực tập
const BaoCaoThucTapEditPopup = dynamic(() => import("./components/BaoCaoThucTapEditPopup"), { ssr: false }); //hàm component sinh viên báo cáo thực tập

const SV_BAO_CAO_THUC_TAP_ME_KEY = "sv:bao-cao-thuc-tap:me";

function readSvBaoCaoThucTapSeed() { //hàm lấy seed sinh viên báo cáo thực tập
  const data = getCachedValue<{ item?: Record<string, unknown> }>(SV_BAO_CAO_THUC_TAP_ME_KEY);
  const item = data?.item;
  if (!item) return null;
  return { //trả về seed sinh viên báo cáo thực tập
    internshipStatus: item.internshipStatus as InternshipStatus,
    supervisor: (item.supervisor ?? null) as SupervisorInfo | null,
    report: (item.report ?? null) as Report | null,
    statusHistory: (Array.isArray(item.statusHistory) ? item.statusHistory : []) as StatusHistoryEvent[],
    canSubmitReport: Boolean((item.ui as { canSubmitReport?: boolean } | undefined)?.canSubmitReport),
    canEditReport: Boolean((item.ui as { canEditReport?: boolean } | undefined)?.canEditReport),
    requiresEnterpriseEval: Boolean((item.ui as { requiresEnterpriseEval?: boolean } | undefined)?.requiresEnterpriseEval)
  };
}

export default function SinhvienBaoCaoThucTapPage() { //hàm render trang sinh viên báo cáo thực tập
  const seed = readSvBaoCaoThucTapSeed();
  const [bootstrapped, setBootstrapped] = useState(() => Boolean(seed));
  const [loading, setLoading] = useState(() => !hasCachedValue(SV_BAO_CAO_THUC_TAP_ME_KEY));
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const [internshipStatus, setInternshipStatus] = useState<InternshipStatus>(seed?.internshipStatus ?? "NOT_STARTED");
  const [supervisor, setSupervisor] = useState<SupervisorInfo | null>(seed?.supervisor ?? null);
  const [report, setReport] = useState<Report | null>(seed?.report ?? null);
  const [statusHistory, setStatusHistory] = useState<StatusHistoryEvent[]>(seed?.statusHistory ?? []);
  const [canSubmitReport, setCanSubmitReport] = useState(seed?.canSubmitReport ?? false);
  const [canEditReport, setCanEditReport] = useState(seed?.canEditReport ?? false);
  const [requiresEnterpriseEval, setRequiresEnterpriseEval] = useState(seed?.requiresEnterpriseEval ?? false);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [selectedFileMime, setSelectedFileMime] = useState<string | null>(null);
  const [selectedFileBase64, setSelectedFileBase64] = useState<string | null>(null);
  const [selectedEnterpriseEvalFileName, setSelectedEnterpriseEvalFileName] = useState<string | null>(null);
  const [selectedEnterpriseEvalMime, setSelectedEnterpriseEvalMime] = useState<string | null>(null);
  const [selectedEnterpriseEvalBase64, setSelectedEnterpriseEvalBase64] = useState<string | null>(null);
  const [deleteLocalFile, setDeleteLocalFile] = useState(false);
  const [deleteLocalEnterpriseEval, setDeleteLocalEnterpriseEval] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function load(opts?: { force?: boolean; silent?: boolean }) { //hàm load sinh viên báo cáo thực tập
    const force = Boolean(opts?.force);
    const silent = Boolean(opts?.silent);
    try {
      if (!silent && !hasCachedValue(SV_BAO_CAO_THUC_TAP_ME_KEY)) setLoading(true);
      setError("");
      const data = await getOrFetchCached<any>(
        SV_BAO_CAO_THUC_TAP_ME_KEY,
        async () => {
          const res = await fetch(SINHVIEN_BAO_CAO_THUC_TAP_ENDPOINT);
          const payload = await res.json();
          if (!res.ok || !payload?.success) throw new Error(payload?.message || SINHVIEN_BAO_CAO_THUC_TAP_LOAD_ERROR_DEFAULT);
          return payload;
        },
        { force }
      );
      const item = data.item; 
      setInternshipStatus(item.internshipStatus); 
      setSupervisor(item.supervisor ?? null); 
      setReport(item.report ?? null); 
      setStatusHistory(Array.isArray(item.statusHistory) ? item.statusHistory : []); 
      setCanSubmitReport(Boolean(item.ui?.canSubmitReport));
      setCanEditReport(Boolean(item.ui?.canEditReport));
      setRequiresEnterpriseEval(Boolean(item.ui?.requiresEnterpriseEval));
      setBootstrapped(true);
    } catch (e: any) {
      setError(e?.message || SINHVIEN_BAO_CAO_THUC_TAP_LOAD_ERROR_DEFAULT); 
      setBootstrapped(true);
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
  }, []);

  const canShowResults = internshipStatus === "COMPLETED";

  const statusHint = useMemo(() => { 
    return getSinhVienBaoCaoStatusHintText({ 
      canShowResults,
      canSubmitReport,
      canEditReport,
      internshipStatus,
      report
    });
  }, [canShowResults, canSubmitReport, canEditReport, internshipStatus, report?.supervisorRejectReason, report?.reviewStatus, report]);

  function resetUploadState() {
    setSelectedFileName(null);
    setSelectedFileMime(null);
    setSelectedFileBase64(null);
    setSelectedEnterpriseEvalFileName(null);
    setSelectedEnterpriseEvalMime(null);
    setSelectedEnterpriseEvalBase64(null);
    setDeleteLocalFile(false);
    setDeleteLocalEnterpriseEval(false);
    setFieldErrors({});
  }

  async function onChooseFile(file: File | null) {
    if (!file) return;
    const payload = await readFileAsBase64Payload(file);
    const mime = payload.mime;
    if (!isAllowedBcttMime(mime)) {
      setFieldErrors((prev) => ({ ...prev, file: BCTT_ERROR_INVALID_MIME }));
      return;
    }
    setFieldErrors((prev) => ({ ...prev, file: "" }));
    setSelectedFileName(file.name);
    setSelectedFileMime(mime);
    setSelectedFileBase64(payload.base64);
    setDeleteLocalFile(false);
  }

  async function onChooseEnterpriseEvalFile(file: File | null) {
    if (!file) return;
    const payload = await readFileAsBase64Payload(file);
    const mime = payload.mime;
    if (!isAllowedBcttMime(mime)) {
      setFieldErrors((prev) => ({ ...prev, enterpriseEval: BCTT_ERROR_INVALID_ENTERPRISE_EVAL_MIME }));
      return;
    }
    setFieldErrors((prev) => ({ ...prev, enterpriseEval: "" }));
    setSelectedEnterpriseEvalFileName(file.name);
    setSelectedEnterpriseEvalMime(mime);
    setSelectedEnterpriseEvalBase64(payload.base64);
    setDeleteLocalEnterpriseEval(false);
  }

  async function submitNewReport() {
    const nextErrors: Record<string, string> = {};
    if (!selectedFileBase64 || !selectedFileMime || !selectedFileName || deleteLocalFile) {
      nextErrors.file = BCTT_ERROR_REQUIRED_FILE_BEFORE_SUBMIT;
    }
    if (
      requiresEnterpriseEval &&
      (!selectedEnterpriseEvalBase64 || !selectedEnterpriseEvalMime || !selectedEnterpriseEvalFileName)
    ) {
      nextErrors.enterpriseEval = BCTT_ERROR_REQUIRED_ENTERPRISE_EVAL;
    }
    if (Object.keys(nextErrors).length) {
      setFieldErrors(nextErrors);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/sinhvien/bao-cao-thuc-tap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportFileName: selectedFileName,
          reportMime: selectedFileMime,
          reportBase64: selectedFileBase64,
          ...(requiresEnterpriseEval
            ? {
                enterpriseEvalFileName: selectedEnterpriseEvalFileName,
                enterpriseEvalMime: selectedEnterpriseEvalMime,
                enterpriseEvalBase64: selectedEnterpriseEvalBase64
              }
            : {})
        })
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.message || SINHVIEN_BAO_CAO_THUC_TAP_SUBMIT_NEW_ERROR_DEFAULT);
      setUploadOpen(false);
      resetUploadState();
      setToast(data?.message || SINHVIEN_BAO_CAO_THUC_TAP_SUBMIT_NEW_SUCCESS_DEFAULT);
      await load({ force: true });
    } catch (e: any) {
      setFieldErrors({ file: e?.message || SINHVIEN_BAO_CAO_THUC_TAP_SUBMIT_NEW_ERROR_DEFAULT });
    } finally {
      setBusy(false);
    }
  }

  async function submitEditReport() {
    const nextErrors: Record<string, string> = {};
    const hasReportFile = selectedFileBase64 && selectedFileMime && selectedFileName && !deleteLocalFile;
    const hasExistingReportFile = Boolean(report?.reportFileName) && !deleteLocalFile && !selectedFileBase64;
    if (!hasReportFile) {
      nextErrors.file = BCTT_ERROR_REQUIRED_FILE_BEFORE_EDIT;
    }

    const hasEnterpriseEvalFile =
      selectedEnterpriseEvalBase64 && selectedEnterpriseEvalMime && selectedEnterpriseEvalFileName;
    const hasExistingEnterpriseEval =
      Boolean(report?.enterpriseEvalFileName) && !deleteLocalEnterpriseEval && !selectedEnterpriseEvalBase64;
    if (requiresEnterpriseEval && !hasEnterpriseEvalFile && !hasExistingEnterpriseEval) {
      nextErrors.enterpriseEval = BCTT_ERROR_REQUIRED_ENTERPRISE_EVAL;
    }

    if (Object.keys(nextErrors).length) {
      setFieldErrors(nextErrors);
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/sinhvien/bao-cao-thuc-tap", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportFileName: selectedFileName,
          reportMime: selectedFileMime,
          reportBase64: selectedFileBase64,
          ...(requiresEnterpriseEval && hasEnterpriseEvalFile
            ? {
                enterpriseEvalFileName: selectedEnterpriseEvalFileName,
                enterpriseEvalMime: selectedEnterpriseEvalMime,
                enterpriseEvalBase64: selectedEnterpriseEvalBase64
              }
            : {})
        })
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.message || SINHVIEN_BAO_CAO_THUC_TAP_SUBMIT_EDIT_ERROR_DEFAULT);
      setEditOpen(false);
      resetUploadState();
      setToast(data?.message || SINHVIEN_BAO_CAO_THUC_TAP_SUBMIT_EDIT_SUCCESS_DEFAULT);
      await load({ force: true });
    } catch (e: any) {
      setFieldErrors({ file: e?.message || SINHVIEN_BAO_CAO_THUC_TAP_SUBMIT_EDIT_ERROR_DEFAULT });
    } finally {
      setBusy(false);
    }
  }

  const reportFileLink = report?.reportUrl || null;
  const enterpriseEvalFileLink = report?.enterpriseEvalUrl || null;

  return ( //hàm render trang sinh viên báo cáo thực tập
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Theo dõi tiến độ thực tập</h1>
        <p className={styles.subtitle}>
          Theo dõi Giảng viên hướng dẫn, trạng thái thực tập và lịch sử thay đổi trạng thái (không cập nhật trạng thái).
        </p>
      </header>

      {error ? <p className={adminStyles.error}>{error}</p> : null}

      {loading && !bootstrapped ? (
        <ChartStyleLoading variant="block" />
      ) : (
        <>
          <BaoCaoThucTapStatusSection
            internshipStatus={internshipStatus}
            statusHint={statusHint}
            canSubmitReport={canSubmitReport}
            canEditReport={canEditReport}
            hasReport={!!report}
            busy={busy}
            onOpenUpload={() => { resetUploadState(); setUploadOpen(true); }}
            onOpenEdit={() => { resetUploadState(); setEditOpen(true); }}
          />

          {canShowResults ? (
            <BaoCaoThucTapResultSection report={report} reportFileLink={reportFileLink} />
          ) : null}

          <BaoCaoThucTapSupervisorSection supervisor={supervisor} />

          <BaoCaoThucTapStatusHistorySection statusHistory={statusHistory} />
        </>
      )}

      {uploadOpen ? (
        <BaoCaoThucTapUploadPopup
          busy={busy}
          requiresEnterpriseEval={requiresEnterpriseEval}
          fieldError={fieldErrors.file ?? ""}
          enterpriseEvalFieldError={fieldErrors.enterpriseEval ?? ""}
          onChooseFile={(f) => void onChooseFile(f)}
          onChooseEnterpriseEvalFile={(f) => void onChooseEnterpriseEvalFile(f)}
          onClose={() => setUploadOpen(false)}
          onSubmit={() => void submitNewReport()}
        />
      ) : null}

      {editOpen ? (
        <BaoCaoThucTapEditPopup
          busy={busy}
          requiresEnterpriseEval={requiresEnterpriseEval}
          report={report}
          reportFileLink={reportFileLink}
          enterpriseEvalFileLink={enterpriseEvalFileLink}
          selectedFileBase64={selectedFileBase64}
          selectedEnterpriseEvalBase64={selectedEnterpriseEvalBase64}
          deleteLocalFile={deleteLocalFile}
          deleteLocalEnterpriseEval={deleteLocalEnterpriseEval}
          fieldError={fieldErrors.file ?? ""}
          enterpriseEvalFieldError={fieldErrors.enterpriseEval ?? ""}
          onChooseFile={(f) => void onChooseFile(f)}
          onChooseEnterpriseEvalFile={(f) => void onChooseEnterpriseEvalFile(f)}
          onDeleteFile={() => {
            setDeleteLocalFile(true);
            setSelectedFileName(null);
            setSelectedFileMime(null);
            setSelectedFileBase64(null);
          }}
          onDeleteEnterpriseEvalFile={() => {
            setDeleteLocalEnterpriseEval(true);
            setSelectedEnterpriseEvalFileName(null);
            setSelectedEnterpriseEvalMime(null);
            setSelectedEnterpriseEvalBase64(null);
          }}
          onClose={() => setEditOpen(false)}
          onSubmit={() => void submitEditReport()}
        />
      ) : null}

      {toast ? <MessagePopup open message={toast} onClose={() => setToast("")} /> : null}
    </main>
  );
}

