"use client";

import { formatCurrencyValue, type Currency } from "@/types";

interface ChartTooltipProps {
  active?: boolean;
  payload?: { name: string; value: number; color: string; dataKey?: string }[];
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
      </div>
    </div>
  );
}