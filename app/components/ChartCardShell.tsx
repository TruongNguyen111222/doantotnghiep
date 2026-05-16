"use client";
//chart sẽ mở to ra như popup/modal để xem chi tiết và có thể zoom in/out
//quản lý UI phóng to chart khi click vào chart
import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactElement,
  type ReactNode
} from "react";
import { FiX } from "react-icons/fi";
import shellStyles from "./chart-card-shell.module.css";

export type ChartCardShellProps = {
  children: ReactNode;
  /** Ô chart cao hơn (full width) */
  wide?: boolean;
  style?: CSSProperties;
};

export function ChartCardShell({ children, wide, style }: ChartCardShellProps) {
  const shellRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [expanded]);

  useEffect(() => {
    if (!expanded) return;
    const onDown = (e: PointerEvent) => {
      const shell = shellRef.current;
      if (!shell) return;
      if (!shell.contains(e.target as Node)) setExpanded(false);
    };
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, [expanded]);

  const child = Children.only(children);
  if (!isValidElement(child)) {
    throw new Error("ChartCardShell cần đúng một phần tử con (vd. <article className={styles.card}>…</article>)");
  }

  const el = child as ReactElement<{
    className?: string;
    "data-chart-expanded"?: string;
    onClick?: (e: MouseEvent<HTMLElement>) => void;
  }>;

  const merged = cloneElement(el, {
    "data-chart-expanded": expanded ? "true" : undefined,
    className: [el.props.className, expanded ? shellStyles.expandedCard : shellStyles.cardClickable]
      .filter(Boolean)
      .join(" "),
    onClick: (e: MouseEvent<HTMLElement>) => {
      el.props.onClick?.(e);
      if (expanded) return;
      setExpanded(true);
    }
  });

  return (
    <div
      ref={shellRef}
      className={[shellStyles.shell, wide ? shellStyles.shellWide : "", expanded ? shellStyles.shellActive : ""]
        .filter(Boolean)
        .join(" ")}
      style={style}
    >
      {expanded ? (
        <>
          <div
            className={shellStyles.backdrop}
            role="presentation"
            aria-hidden
            onClick={() => setExpanded(false)}
          />
          <button
            type="button"
            className={shellStyles.closeBtn}
            aria-label="Đóng"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(false);
            }}
          >
            <FiX size={28} strokeWidth={2.5} aria-hidden />
          </button>
        </>
      ) : null}
      {merged}
    </div>
  );
}
