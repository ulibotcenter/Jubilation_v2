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

  return (
    <span className={className}>
      {formatCurrencyValue(display, currency, compact, htmlLang(locale))}
    </span>
  );
}
