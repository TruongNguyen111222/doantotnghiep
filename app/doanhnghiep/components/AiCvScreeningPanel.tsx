"use client";

import { useCallback, useEffect, useState } from "react";
import {
  FiAlertCircle,
  FiBriefcase,
  FiCheckCircle,
  FiCpu,
  FiFileText,
  FiInfo,
  FiRefreshCw,
  FiUser,
  FiZap
} from "react-icons/fi";
import styles from "./ai-cv-screening.module.css";
import {
  AI_CV_SCREENING_API_BASE,
  AI_CV_SCREENING_DISCLAIMER
} from "@/lib/constants/ai-cv-screening";
import type { AiCvScreeningContext, AiCvScreeningRecord } from "@/lib/types/ai-cv-screening";

type Props = {
  applicationId: string;
  active?: boolean;
};

function scoreLabel(score: number | null | undefined): string {
  if (score == null) return "—";
  return `${Math.round(score)}`;
}

function scoreRingClass(score: number | null | undefined): string {
  if (score == null) return styles.scoreRingNeutral;
  if (score >= 70) return styles.scoreRingHigh;
  if (score >= 40) return styles.scoreRingMid;
  return styles.scoreRingLow;
}

function scoreTitle(score: number | null | undefined): string {
  if (score == null) return "Chưa có điểm";
  if (score >= 70) return "Phù hợp tốt";
  if (score >= 40) return "Cân nhắc thêm";
  return "Chiếm ít ưu thế";
}

function formatErrorForDisplay(message: string): string {
  if (/429|quota|Too Many Requests|GEMINI|GoogleGenerativeAI/i.test(message)) {
    return "Không thể phân tích CV lúc này do hạn mức API Gemini (key hết quota hoặc chưa hợp lệ). Vui lòng thử lại sau.";
  }
  if (message.length > 180) {
    return "Phân tích CV thất bại. Vui lòng thử lại hoặc kiểm tra file CV (PDF/DOCX).";
  }
  return message;
}

function TagList({ items, warn }: { items: string[]; warn?: boolean }) {
  if (!items.length) return <p className={styles.emptyHint}>Không có dữ liệu.</p>;
  return (
    <div className={styles.tagRow}>
      {items.map((item, index) => (
        <span key={`${item}-${index}`} className={warn ? `${styles.tag} ${styles.tagWarn}` : styles.tag}>
          {item}
        </span>
      ))}
    </div>
  );
}

function ErrorAlert({ message }: { message: string }) {
  return (
    <div className={styles.errorAlert} role="alert">
      <FiAlertCircle className={styles.errorAlertIcon} aria-hidden />
      <span>{formatErrorForDisplay(message)}</span>
    </div>
  );
}

function ScreeningResultView({ screening }: { screening: AiCvScreeningRecord }) {
  if (screening.status === "FAILED") {
    return <ErrorAlert message={screening.errorMessage || "Phân tích thất bại."} />;
  }
  if (screening.status === "PENDING") {
    return (
      <div className={styles.loadingBox}>
        <span className={styles.spinner} aria-hidden />
        <span>Đang xử lý phân tích...</span>
      </div>
    );
  }

  return (
    <>
      <div className={styles.scoreHero}>
        <div className={`${styles.scoreRing} ${scoreRingClass(screening.matchScore)}`}>
          {scoreLabel(screening.matchScore)}
        </div>
        <div className={styles.scoreMeta}>
          <p className={styles.scoreLabel}>Điểm khớp</p>
          <p className={styles.scoreTitle}>{scoreTitle(screening.matchScore)}</p>
          <p className={styles.scoreSub}>
            {scoreLabel(screening.matchScore)}/100
            {screening.model ? ` · ${screening.model}` : ""}
          </p>
        </div>
      </div>

      <div className={styles.resultGrid}>
        <div className={`${styles.resultBlock} ${styles.resultBlockFull}`}>
          <h3 className={styles.sectionTitle}>
            <FiFileText className={styles.sectionIcon} aria-hidden />
            Tóm tắt
          </h3>
          <p className={styles.paragraph}>{screening.summary || "—"}</p>
        </div>

        <div className={styles.resultBlock}>
          <h3 className={styles.sectionTitle}>
            <FiZap className={styles.sectionIcon} aria-hidden />
            Kỹ năng trích xuất
          </h3>
          <TagList items={screening.extractedSkills} />
        </div>

        <div className={styles.resultBlock}>
          <h3 className={styles.sectionTitle}>
            <FiBriefcase className={styles.sectionIcon} aria-hidden />
            Kinh nghiệm / hoạt động
          </h3>
          <TagList items={screening.extractedExperience} />
        </div>

        <div className={styles.resultBlock}>
          <h3 className={styles.sectionTitle}>
            <FiCheckCircle className={styles.sectionIcon} aria-hidden />
            Điểm khớp yêu cầu
          </h3>
          {screening.matchedRequirements.length ? (
            <ul className={styles.list}>
              {screening.matchedRequirements.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          ) : (
            <p className={styles.emptyHint}>Không có.</p>
          )}
        </div>

        <div className={styles.resultBlock}>
          <h3 className={styles.sectionTitle}>
            <FiAlertCircle className={styles.sectionIcon} aria-hidden />
            Thiếu / cần lưu ý
          </h3>
          <TagList items={screening.gaps} warn />
        </div>

        <div className={`${styles.resultBlock} ${styles.resultBlockFull}`}>
          <h3 className={styles.sectionTitle}>
            <FiCpu className={styles.sectionIcon} aria-hidden />
            Nhận xét AI
          </h3>
          <p className={styles.paragraph}>{screening.reasoning || "—"}</p>
        </div>
      </div>
    </>
  );
}

export default function AiCvScreeningPanel({ applicationId, active = true }: Props) {
  const [context, setContext] = useState<AiCvScreeningContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${AI_CV_SCREENING_API_BASE}/${encodeURIComponent(applicationId)}`);
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.message || "Không tải được dữ liệu AI Screening.");
      setContext(data.item as AiCvScreeningContext);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được dữ liệu.");
      setContext(null);
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  useEffect(() => {
    if (!active) return;
    void load();
  }, [active, load]);

  async function runScreening() {
    setRunning(true);
    setError("");
    try {
      const res = await fetch(`${AI_CV_SCREENING_API_BASE}/${encodeURIComponent(applicationId)}`, {
        method: "POST"
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.message || "Phân tích CV thất bại.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Phân tích CV thất bại.");
    } finally {
      setRunning(false);
    }
  }

  const cvPreviewUrl = `/api/files/job-application/${encodeURIComponent(applicationId)}/cv`;

  return (
    <div className={styles.panel}>
      <div className={styles.infoBanner}>
        <FiInfo className={styles.infoBannerIcon} aria-hidden />
        <span>{AI_CV_SCREENING_DISCLAIMER}</span>
      </div>

      {loading ? (
        <div className={styles.loadingBox}>
          <span className={styles.spinner} aria-hidden />
          <span>Đang tải thông tin ứng viên...</span>
        </div>
      ) : null}

      {error ? <ErrorAlert message={error} /> : null}

      {context ? (
        <>
          <section className={styles.screenCard}>
            <h2 className={styles.cardTitle}>Thông tin hồ sơ</h2>
            <div className={styles.metaGrid}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Ứng viên</span>
                <span className={styles.metaValue}>{context.applicantName}</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Vị trí</span>
                <span className={styles.metaValue}>{context.jobTitle}</span>
              </div>
              {context.cvFileName ? (
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>File CV</span>
                  <span className={styles.metaValue}>{context.cvFileName}</span>
                </div>
              ) : null}
            </div>

            <div className={styles.actionBar}>
              <button
                type="button"
                className={`${styles.btnBase} ${styles.btnPrimary}`}
                onClick={() => void runScreening()}
                disabled={running}
              >
                <span className={styles.btnIconWrap}>
                  <FiRefreshCw className={running ? styles.spinIcon : undefined} aria-hidden />
                </span>
                {running ? "Đang phân tích..." : context.screening ? "Phân tích lại CV" : "Phân tích CV bằng AI"}
              </button>
              <a className={`${styles.btnBase} ${styles.btnSecondary}`} href={cvPreviewUrl} target="_blank" rel="noreferrer">
                <FiFileText aria-hidden />
                Xem CV gốc
              </a>
            </div>
          </section>

          <section className={styles.screenCard}>
            <h2 className={styles.cardTitle}>Kết quả phân tích</h2>
            {context.screening ? (
              <ScreeningResultView screening={context.screening} />
            ) : (
              <div className={styles.emptyState}>
                <FiUser className={styles.emptyStateIcon} aria-hidden />
                <p>Chưa có kết quả phân tích.</p>
                <p className={styles.emptyHint}>Bấm &quot;Phân tích CV bằng AI&quot; để bắt đầu.</p>
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
