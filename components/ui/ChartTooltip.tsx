"use client";

import {
  getChartScenarioLabel,
  isChartScenarioEntry,
  resolveChartScenarioFromEntry,
} from "@/lib/i18n/resolve";
import { useTranslation } from "@/lib/i18n/useTranslation";
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

export function ChartTooltip({
  active,
  payload,
  label,
  currency,
}: ChartTooltipProps) {
  const { t, locale } = useTranslation();

  if (!active || !payload?.length) return null;

  const entries = payload.filter((p) =>
    isChartScenarioEntry(p.dataKey, p.name)
  );
  const pessimistic = entries.find(
    (p) => resolveChartScenarioFromEntry(p.dataKey, p.name) === "pessimistic"
  );
  const optimistic = entries.find(
    (p) => resolveChartScenarioFromEntry(p.dataKey, p.name) === "optimistic"
  );
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
        {t("chart.tooltip.age", { n: label ?? "" })}
      </p>
      <div className="space-y-1.5">
        {entries.map((entry) => {
          const scenario = resolveChartScenarioFromEntry(
            entry.dataKey,
            entry.name
          );
          const entryLabel = scenario
            ? getChartScenarioLabel(locale, scenario)
            : entry.name;

          return (
            <div
              key={entry.dataKey ?? entry.name}
              className="flex items-center justify-between gap-4 text-xs"
            >
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: entry.color }}
                />
                {entryLabel}
              </span>
              <span className="font-semibold text-foreground tabular-nums">
                {formatCurrencyValue(entry.value, currency)}
              </span>
            </div>
          );
        })}
        {spread != null && spread > 0 && (
          <div className="flex items-center justify-between gap-4 text-xs pt-1.5 mt-1.5 border-t border-border">
            <span className="text-muted-foreground">
              {t("chart.tooltip.confidenceSpread")}
            </span>
            <span className="font-semibold text-foreground tabular-nums">
              {formatCurrencyValue(spread, currency)}
            </span>
          </div>
        )}
        {hasCashFlow && raw && (
          <div className="space-y-1 pt-1.5 mt-1.5 border-t border-border">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-muted">
              {t("chart.tooltip.thisYearBase")}
            </p>
            {(raw.expenses ?? 0) > 0 && (
              <div className="flex items-center justify-between gap-4 text-xs">
                <span className="text-muted-foreground">
                  {t("chart.cashflow.living")}
                </span>
                <span className="font-semibold tabular-nums text-red-400/90">
                  {formatCurrencyValue(raw.expenses!, currency)}
                </span>
              </div>
            )}
            {(raw.invested ?? 0) > 0 && (
              <div className="flex items-center justify-between gap-4 text-xs">
                <span className="text-muted-foreground">
                  {t("chart.cashflow.invested")}
                </span>
                <span className="font-semibold tabular-nums text-green-400/90">
                  {formatCurrencyValue(raw.invested!, currency)}
                </span>
              </div>
            )}
            {(raw.returns ?? 0) > 0 && (
              <div className="flex items-center justify-between gap-4 text-xs">
                <span className="text-muted-foreground">
                  {t("chart.cashflow.returns")}
                </span>
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