"use client";

import { useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "@/lib/i18n/useTranslation";
import type { MessageKey } from "@/lib/i18n/messages";

const TERMS = {
  cagr: { hint: "term.cagr.hint" },
  pnl: { hint: "term.pnl.hint" },
  etf: { hint: "term.etf.hint" },
  reit: { hint: "term.reit.hint" },
  bdr: { hint: "term.bdr.hint" },
  mc: { hint: "term.mc.hint" },
} as const satisfies Record<string, { hint: MessageKey }>;

export type TermId = keyof typeof TERMS;

const TOKEN = /(CAGR|P&L|ETFs?|REITs?|BDRs?)/g;

const TOKEN_TERM: Record<string, TermId> = {
  CAGR: "cagr",
  "P&L": "pnl",
  ETF: "etf",
  ETFs: "etf",
  REIT: "reit",
  REITs: "reit",
  BDR: "bdr",
  BDRs: "bdr",
};

export function TermHint({
  term,
  children,
}: {
  term: TermId;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(
    null
  );
  const triggerRef = useRef<HTMLSpanElement>(null);
  const id = useId();
  const hint = t(TERMS[term].hint);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) {
      setCoords(null);
      return;
    }
    const place = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const left = Math.min(
        Math.max(rect.left + rect.width / 2, 96),
        window.innerWidth - 96
      );
      setCoords({ top: rect.top, left });
    };
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <span
      ref={triggerRef}
      className="term-hint"
      tabIndex={0}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={close}
      onFocus={() => setOpen(true)}
      onBlur={close}
      onClick={(event) => {
        event.stopPropagation();
        setOpen((current) => !current);
      }}
      aria-describedby={open ? id : undefined}
      data-term={term}
    >
      <span className="term-hint-text">{children}</span>
      {open && coords
        ? createPortal(
            <span
              id={id}
              role="tooltip"
              className="term-hint-tooltip term-hint-tooltip--portal"
              style={{ top: coords.top, left: coords.left }}
            >
              {hint}
            </span>,
            document.body
          )
        : null}
    </span>
  );
}

export function HintedText({ text }: { text: string }) {
  const parts = text.split(TOKEN);
  if (parts.length === 1) return <>{text}</>;
  return (
    <>
      {parts.map((part, index) => {
        const term = TOKEN_TERM[part];
        if (!term) return <span key={`${part}-${index}`}>{part}</span>;
        return (
          <TermHint key={`${part}-${index}`} term={term}>
            {part}
          </TermHint>
        );
      })}
    </>
  );
}
