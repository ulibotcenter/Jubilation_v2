"use client";

import { formatCurrencyValue, type Currency } from "@/types";

interface ChartTooltipPayloadItem {
  name: string;
  value: number;
  color: string;
  dataKey?: string;
  payload?: {
    invested?: number;
    expenses?: number;
    returns?: number;
    requiredIncome?: number;
  };
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: ChartTooltipPayloadItem[];
  label?: string | number;
  currency: Currency;
}

const LABELS: Record<string, string> = {
  value: "Base Case",
  pessimistic: "Pessimistic",
  optimistic: "Optimistic",
  "Base Case": "Base Case",
  Pessimistic: "Pessimistic",
  Optimistic: "Optimistic",
};

const DISPLAY_NAMES = new Set(["Base Case", "Pessimistic", "Optimistic"]);

export function ChartTooltip({
  active,
  payload,
  label,
  currency,
}: ChartTooltipProps) {
  if (!active || !payload?.length) return null;

  const entries = payload.filter((p) => DISPLAY_NAMES.has(p.name));
  const pessimistic = entries.find((p) => p.name === "Pessimistic");
  const optimistic = entries.find((p) => p.name === "Optimistic");
  const spread =
    pessimistic && optimistic
      ? Math.abs(optimistic.value - pessimistic.value)
      : null;

  const raw = payload[0]?.payload;
  const hasCashFlow =
    raw &&
    ((raw.invested ?? 0) > 0 ||
      (raw.expenses ?? 0) > 0 ||
      (raw.returns ?? 0) > 0);

  return (
    <div className="rounded-xl border border-border bg-surface-elevated/95 backdrop-blur-md px-3.5 py-2.5 shadow-lg min-w-[10rem]">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
        Age {label}
      </p>
      <div className="space-y-1.5">
        {entries.map((entry) => (
          <div
            key={entry.name}
            className="flex items-center justify-between gap-4 text-xs"
          >
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: entry.color }}
              />
              {LABELS[entry.name] ?? entry.name}
            </span>
            <span className="font-semibold text-foreground tabular-nums">
              {formatCurrencyValue(entry.value, currency)}
            </span>
          </div>
        ))}
        {spread != null && spread > 0 && (
          <div className="flex items-center justify-between gap-4 text-xs pt-1.5 mt-1.5 border-t border-border">
            <span className="text-muted-foreground">Confidence spread</span>
            <span className="font-semibold text-foreground tabular-nums">
              {formatCurrencyValue(spread, currency)}
            </span>
          </div>
        )}
        {hasCashFlow && raw && (
          <div className="space-y-1 pt-1.5 mt-1.5 border-t border-border">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-muted">
              This year (base)
            </p>
            {(raw.expenses ?? 0) > 0 && (
              <div className="flex items-center justify-between gap-4 text-xs">
                <span className="text-muted-foreground">Living expenses</span>
                <span className="font-semibold tabular-nums text-red-400/90">
                  {formatCurrencyValue(raw.expenses!, currency)}
                </span>
              </div>
            )}
            {(raw.invested ?? 0) > 0 && (
              <div className="flex items-center justify-between gap-4 text-xs">
                <span className="text-muted-foreground">Invested</span>
                <span className="font-semibold tabular-nums text-green-400/90">
                  {formatCurrencyValue(raw.invested!, currency)}
                </span>
              </div>
            )}
            {(raw.returns ?? 0) > 0 && (
              <div className="flex items-center justify-between gap-4 text-xs">
                <span className="text-muted-foreground">Market returns</span>
                <span className="font-semibold tabular-nums text-blue-400/90">
                  {formatCurrencyValue(raw.returns!, currency)}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}