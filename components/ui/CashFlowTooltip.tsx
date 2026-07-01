"use client";

import { formatCurrencyValue, type Currency } from "@/types";

interface CashFlowTooltipProps {
  active?: boolean;
  payload?: { name: string; value: number; color: string; dataKey?: string }[];
  label?: string | number;
  currency: Currency;
}

export function CashFlowTooltip({
  active,
  payload,
  label,
  currency,
}: CashFlowTooltipProps) {
  if (!active || !payload?.length) return null;

  const byKey = Object.fromEntries(
    payload.map((p) => [p.dataKey ?? p.name, p.value])
  );
  const expenses = byKey.expenses ?? 0;
  const invested = byKey.invested ?? 0;
  const returns = byKey.returns ?? 0;
  const required = expenses + invested;

  const rows = [
    { label: "Living expenses", value: expenses, color: "#f87171" },
    { label: "Invested", value: invested, color: "#22c55e" },
    { label: "Income need", value: required, color: "#ff7040", bold: true },
    { label: "Market returns", value: returns, color: "#60a5fa" },
  ].filter((r) => r.value > 0 || r.bold);

  return (
    <div className="rounded-xl border border-border bg-surface-elevated/95 backdrop-blur-md px-3.5 py-2.5 shadow-lg min-w-[11rem]">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
        Age {label}
      </p>
      <div className="space-y-1.5">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between gap-4 text-xs"
          >
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span
                className="w-2 h-2 rounded-sm shrink-0"
                style={{ background: row.color }}
              />
              {row.label}
            </span>
            <span
              className={`tabular-nums ${row.bold ? "font-bold text-foreground" : "font-semibold text-foreground"}`}
            >
              {formatCurrencyValue(row.value, currency)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}