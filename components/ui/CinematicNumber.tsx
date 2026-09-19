"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { htmlLang } from "@/lib/i18n/htmlLang";
import type { AppLocale } from "@/lib/i18n/messages";
import { formatCurrencyValue, type Currency } from "@/types";

interface CinematicNumberProps {
  value: number;
  currency: Currency;
  locale: AppLocale;
  className?: string;
  compact?: boolean;
}

function splitCurrency(formatted: string): { symbol: string; digits: string } {
  const parts = formatted.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) {
    return { symbol: "", digits: formatted.trim() };
  }
  return { symbol: parts[0]!, digits: parts.slice(1).join(" ") };
}

export function CinematicNumber({
  value,
  currency,
  locale,
  className,
  compact = false,
}: CinematicNumberProps) {
  const reduced = useReducedMotion();
  const [animated, setAnimated] = useState(value);
  const fromRef = useRef(value);
  const first = useRef(true);

  useEffect(() => {
    if (reduced !== false) {
      fromRef.current = value;
      first.current = false;
      return;
    }

    const from = first.current ? 0 : fromRef.current;
    first.current = false;
    const to = value;
    const duration = 1100;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      setAnimated(from + (to - from) * eased);
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, reduced]);

  const display = reduced === false ? animated : value;
  const shown = compact ? display : Math.round(display);
  const { symbol, digits } = splitCurrency(
    formatCurrencyValue(shown, currency, compact, htmlLang(locale))
  );

  return (
    <span className="money-figure">
      {symbol ? <span className="money-figure-symbol">{symbol}</span> : null}
      <span className={className}>{digits}</span>
    </span>
  );
}
