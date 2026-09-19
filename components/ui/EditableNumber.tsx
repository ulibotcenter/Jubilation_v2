"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { htmlLang } from "@/lib/i18n/htmlLang";
import { useTranslation } from "@/lib/i18n/useTranslation";

interface EditableNumberProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  format?: "integer" | "currency" | "percent";
  currencySymbol?: string;
  className?: string;
  inputClassName?: string;
  compact?: boolean;
  disabled?: boolean;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function formatDisplay(
  value: number,
  format: "integer" | "currency" | "percent",
  decimals: number,
  currencySymbol: string,
  compact: boolean,
  locale: string
): string {
  const grouping = {
    maximumFractionDigits: decimals,
    minimumFractionDigits: 0,
  };
  if (format === "currency") {
    if (compact && Math.abs(value) >= 1000) {
      const suffix =
        Math.abs(value) >= 1_000_000
          ? "M"
          : Math.abs(value) >= 1000
            ? "K"
            : "";
      const divisor =
        Math.abs(value) >= 1_000_000
          ? 1_000_000
          : Math.abs(value) >= 1000
            ? 1000
            : 1;
      return `${currencySymbol}${(value / divisor).toFixed(1)}${suffix}`;
    }
    return value.toLocaleString(locale, grouping);
  }
  if (format === "percent") {
    return value.toFixed(decimals);
  }
  return value.toLocaleString(locale, grouping);
}

function parseRawInput(raw: string, decimals: number): number | null {
  const cleaned =
    decimals <= 0
      ? raw.replace(/[^0-9\-]/g, "")
      : raw.replace(/[^0-9.\-]/g, "");
  if (cleaned === "" || cleaned === "-" || cleaned === ".") return null;
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

export function EditableNumber({
  value,
  onChange,
  min = -Infinity,
  max = Infinity,
  step = 1,
  decimals = 0,
  prefix,
  suffix,
  format = "integer",
  currencySymbol = "$",
  className = "",
  inputClassName = "",
  compact = false,
  disabled = false,
}: EditableNumberProps) {
  const { t, locale } = useTranslation();
  const groupingLocale = htmlLang(locale);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const displayValue = formatDisplay(
    value,
    format,
    decimals,
    currencySymbol,
    compact,
    groupingLocale
  );

  const commit = useCallback(
    (raw: string) => {
      const parsed = parseRawInput(raw, decimals);
      if (parsed === null) {
        setDraft(displayValue);
        return;
      }
      const rounded =
        decimals > 0
          ? Math.round(parsed * Math.pow(10, decimals)) / Math.pow(10, decimals)
          : Math.round(parsed);
      const clamped = clamp(rounded, min, max);
      onChange(clamped);
    },
    [decimals, min, max, onChange, displayValue, setDraft]
  );

  const startEditing = useCallback(() => {
    if (disabled) return;
    setDraft(
      format === "percent" ? value.toFixed(decimals) : String(value)
    );
    setIsEditing(true);
  }, [disabled, format, value, decimals, setDraft, setIsEditing]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleBlur = () => {
    commit(draft);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      commit(draft);
      setIsEditing(false);
      inputRef.current?.blur();
    }
    if (e.key === "Escape") {
      setIsEditing(false);
      setDraft(displayValue);
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const next = clamp(value + step, min, max);
      onChange(next);
      setDraft(String(next));
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = clamp(value - step, min, max);
      onChange(next);
      setDraft(String(next));
    }
  };

  return (
    <motion.div
      className={`inline-flex items-baseline gap-1 min-w-0 ${className}`}
      whileTap={disabled ? undefined : { scale: 0.99 }}
      animate={
        isEditing
          ? { boxShadow: "0 0 0 3px rgba(255,112,64,0.15)" }
          : { boxShadow: "0 0 0 0px rgba(255,112,64,0)" }
      }
      style={{ borderRadius: "var(--radius-sm)" }}
      transition={{ duration: 0.2 }}
    >
      {prefix && !isEditing && (
        <span className="text-muted-foreground text-inherit shrink-0">
          {prefix}
        </span>
      )}
          {format === "currency" && !isEditing && (
        <span className="text-inherit shrink-0">{`${currencySymbol} `}</span>
      )}

      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={`editable-number-input text-inherit font-inherit ${inputClassName}`}
          aria-label={t("common.editValue")}
        />
      ) : (
        <button
          type="button"
          onClick={startEditing}
          disabled={disabled}
          className={`editable-number-input text-left cursor-text font-inherit disabled:cursor-not-allowed disabled:opacity-50 ${inputClassName}`}
          aria-label={t("common.editValueCurrent", {
            value: displayValue,
            suffix: suffix ?? "",
          })}
        >
          {format === "currency"
            ? displayValue.replace(currencySymbol, "")
            : displayValue}
        </button>
      )}

      {suffix && !isEditing && (
        <span className="text-muted-foreground text-inherit shrink-0">
          {suffix}
        </span>
      )}
    </motion.div>
  );
}