"use client";

import { useId, useState, type ReactNode } from "react";
import { useTranslation } from "@/lib/i18n/useTranslation";
import type { MessageKey } from "@/lib/i18n/messages";

const TERMS = {
  cagr: { hint: "term.cagr.hint" },
  pnl: { hint: "term.pnl.hint" },
  etf: { hint: "term.etf.hint" },
  reit: { hint: "term.reit.hint" },
  bdr: { hint: "term.bdr.hint" },
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
  const id = useId();
  const hint = t(TERMS[term].hint);

  return (
    <span
      className="term-hint"
      tabIndex={0}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onClick={(event) => {
        event.stopPropagation();
        setOpen((current) => !current);
      }}
      aria-describedby={open ? id : undefined}
      data-term={term}
    >
      <span className="term-hint-text">{children}</span>
      {open ? (
        <span id={id} role="tooltip" className="term-hint-tooltip">
          {hint}
        </span>
      ) : null}
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
