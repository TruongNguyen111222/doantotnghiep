"use client";

import styles from "./ai-cv-screening.module.css";

/**
 * Neo CSS module AI vào bundle layout doanh nghiệp (một hash ổn định).
 * Tránh popup lazy/HMR làm panel AI mất class.
 */
export default function AiCvScreeningCssAnchor() {
  return (
    <span className={styles.panel} aria-hidden style={{ display: "none" }} />
  );
}
