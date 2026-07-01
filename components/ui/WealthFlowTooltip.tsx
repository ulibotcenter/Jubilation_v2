"use client";

import { useTranslation } from "@/lib/i18n/useTranslation";
import type { CashFlowPhase } from "@/lib/cashFlowChartData";
import { formatCurrencyValue, type Currency } from "@/types";

interface WealthFlowTooltipProps {
  active?: boolean;
  payload?: {
    name: string;
    value: number;
    color: string;
    dataKey?: string;
    payload?: {
      phase?: CashFlowPhase;
      openingWealth?: number;
      contributions?: number;
      returns?: number;
      livingCost?: number;
      projectedBalance?: number;
      outflowAffectsBalance?: boolean;
    };
  }[];
  label?: string | number;
  currency: Currency;
  retirementAge?: number;
}

export function WealthFlowTooltip({
  active,
  payload,
  label,
  currency,
  retirementAge,
}: WealthFlowTooltipProps) {
  const { t } = useTranslation();

  if (!active || !payload?.length) return null;

  const raw = payload[0]?.payload;
  if (!raw) return null;

  const isRetired = raw.phase === "retirement";
  const age = typeof label === "number" ? label : Number(label);
  const phaseLabel =
    retirementAge != null && !Number.isNaN(age) && age >= retirementAge
      ? t("chart.phase.retirement")
      : t("chart.phase.accumulation");

  const buildTotal =
    (raw.openingWealth ?? 0) +
    (raw.contributions ?? 0) +
    (raw.returns ?? 0);

  const outflowLabel = isRetired
    ? t("chart.cashflow.withdrawals")
    : t("chart.cashflow.livingReference");

  const rows = [
    {
      key: "opening",
      label: t("chart.cashflow.openingWealth"),
      value: raw.openingWealth ?? 0,
      color: "#6366f1",
    },
    {
      key: "contrib",
      label: t("chart.cashflow.contributions"),
      value: raw.contributions ?? 0,
      color: "#22c55e",
    },
    {
      key: "returns",
      label: t("chart.cashflow.investmentReturns"),
      value: raw.returns ?? 0,
      color: "#60a5fa",
    },
    {
      key: "build",
      label: t("chart.cashflow.buildTotal"),
      value: buildTotal,
      color: "#ff7040",
      bold: true,
    },
    {
      key: "living",
      label: outflowLabel,
      value: raw.livingCost ?? 0,
      color: "#f87171",
    },
    {
      key: "balance",
      label: t("chart.cashflow.projectedBalance"),
      value: raw.projectedBalance ?? 0,
      color: "#ff7040",
      bold: true,
    },
  ].filter((r) => r.value > 0 || r.bold);

  return (
    <div className="rounded-xl border border-border bg-surface-elevated/95 backdrop-blur-md px-3.5 py-2.5 shadow-lg min-w-[12rem]">
      <div className="flex items-center justify-between gap-3 mb-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {t("chart.tooltip.age", { n: label ?? "" })}
        </p>
        <span className="text-[9px] font-semibold uppercase tracking-wider text-accent">
          {phaseLabel}
        </span>
      </div>
      <div className="space-y-1.5">
        {rows.map((row) => (
          <div
            key={row.key}
            className="flex items-center justify-between gap-4 text-xs"
          >
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span
                className={`shrink-0 ${row.key === "balance" ? "w-3 h-0.5 rounded" : "w-2 h-2 rounded-sm"}`}
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
      {!isRetired && (raw.livingCost ?? 0) > 0 && (
        <p className="text-[9px] text-muted mt-2 leading-snug">
          {t("chart.cashflow.tooltipAccumNote")}
        </p>
      )}
    </div>
  );
}