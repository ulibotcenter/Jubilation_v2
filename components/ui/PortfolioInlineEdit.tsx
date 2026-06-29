"use client";

import { useEffect, useState } from "react";

interface PortfolioInlineEditProps {
  value: number;
  onCommit: (value: number) => void;
  min?: number;
  step?: number;
  decimals?: number;
  className?: string;
  ariaLabel: string;
}

export function PortfolioInlineEdit({
  value,
  onCommit,
  min = 0,
  step = 1,
  decimals = 2,
  className = "",
  ariaLabel,
}: PortfolioInlineEditProps) {
  const [draft, setDraft] = useState(String(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setDraft(String(value));
  }, [value, focused]);

  const commit = () => {
    const parsed = parseFloat(draft);
    if (!Number.isFinite(parsed) || parsed < min) {
      setDraft(String(value));
      return;
    }
    const rounded =
      decimals === 0
        ? Math.round(parsed)
        : Math.round(parsed * 10 ** decimals) / 10 ** decimals;
    if (rounded !== value) onCommit(rounded);
    setDraft(String(rounded));
  };

  return (
    <input
      type="number"
      min={min}
      step={step}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false);
        commit();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.currentTarget.blur();
        }
      }}
      className={`portfolio-inline-edit ${className}`}
      aria-label={ariaLabel}
    />
  );
}