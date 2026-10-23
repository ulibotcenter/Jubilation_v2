"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowRightLeft, Minus, Plus } from "lucide-react";
import { computePlaygroundDiff } from "@/lib/playgroundDiff";
import type { MessageKey } from "@/lib/i18n/messages";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useAppStore } from "@/store/useAppStore";
import { formatCurrencyValue, type KPIField } from "@/types";

function formatKpiValue(
  field: KPIField,
  value: number,
  currency: ReturnType<typeof useAppStore.getState>["currency"]
): string {
  if (field === "currentAge" || field === "retirementAge") {
    return String(value);
  }
  if (field === "expectedCAGR" || field === "annualInflation") {
    return `${value.toFixed(1)}%`;
  }
  return formatCurrencyValue(value, currency, true);
}

function DeltaBadge({
  delta,
  currency,
  format = "currency",
  noChangeLabel,
}: {
  delta: number;
  currency: ReturnType<typeof useAppStore.getState>["currency"];
  format?: "currency" | "integer" | "percent";
  noChangeLabel: string;
}) {
  if (delta === 0) {
    return (
      <span className="playground-diff-neutral">
        <Minus className="w-3 h-3" size={12} />
        {noChangeLabel}
      </span>
    );
  }

  const positive = delta > 0;
  const label =
    format === "integer"
      ? `${positive ? "+" : ""}${delta}`
      : format === "percent"
        ? `${positive ? "+" : ""}${delta.toFixed(1)}%`
        : `${delta >= 0 ? "+" : "-"}${formatCurrencyValue(Math.abs(delta), currency, true)}`;

  return (
    <span
      className={
        positive ? "playground-diff-positive" : "playground-diff-negative"
      }
    >
      {positive ? (
        <Plus className="w-3 h-3" size={12} />
      ) : (
        <Minus className="w-3 h-3" size={12} />
      )}
      {label}
    </span>
  );
}

export function PlaygroundDiffPanel() {
  const { t } = useTranslation();
  const realKpis = useAppStore((s) => s.kpis);
  const realProjections = useAppStore((s) => s.projections);
  const realPortfolio = useAppStore((s) => s.portfolio);
  const sim = useAppStore((s) => s.simPlayground);
  const currency = useAppStore((s) => s.currency);

  const diff = useMemo(
    () =>
      computePlaygroundDiff(
        {
          kpis: realKpis,
          projections: realProjections,
          portfolio: realPortfolio,
        },
        sim
      ),
    [realKpis, realProjections, realPortfolio, sim]
  );

  const changedKpis = diff.kpiDeltas.filter((k) => k.changed);

  return (
    <motion.section
      className="playground-diff-panel card-surface"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      aria-label={t("simulation.diff.title")}
    >
      <div className="playground-diff-header">
        <ArrowRightLeft className="w-4 h-4 text-accent" size={16} />
        <div>
          <h2 className="playground-diff-title">{t("simulation.diff.title")}</h2>
          <p className="playground-diff-subtitle">
            {diff.hasChanges
              ? t("simulation.diff.subtitle.differs")
              : t("simulation.diff.subtitle.matches")}
          </p>
        </div>
      </div>

      <div className="playground-diff-highlights">
        <div className="playground-diff-highlight">
          <p className="playground-diff-highlight-label">
            {t("simulation.diff.projectedAtRetirement")}
          </p>
          <DeltaBadge
            delta={diff.projectedDelta}
            currency={currency}
            noChangeLabel={t("simulation.diff.noChange")}
          />
        </div>
        <div className="playground-diff-highlight">
          <p className="playground-diff-highlight-label">
            {t("simulation.diff.netWorthToday")}
          </p>
          <DeltaBadge
            delta={diff.netWorthDelta}
            currency={currency}
            noChangeLabel={t("simulation.diff.noChange")}
          />
        </div>
        <div className="playground-diff-highlight">
          <p className="playground-diff-highlight-label">
            {t("simulation.diff.holdings")}
          </p>
          <span className="playground-diff-highlight-pair">
            <DeltaBadge
              delta={diff.holdingsDelta}
              currency={currency}
              format="integer"
              noChangeLabel={t("simulation.diff.noChange")}
            />
            <span className="playground-diff-hint">
              {t("simulation.diff.holdingsHint", {
                sandbox: diff.simHoldings,
                real: diff.realHoldings,
              })}
            </span>
          </span>
        </div>
      </div>

      {changedKpis.length > 0 && (
        <div className="playground-diff-assumptions">
          <p className="playground-diff-assumptions-label">
            {t("simulation.diff.changedAssumptions")}
          </p>
          <ul className="playground-diff-list">
            {changedKpis.map((k) => (
              <li key={k.field} className="playground-diff-row">
                <span className="playground-diff-row-label">
                  {t(`kpi.field.${k.field}` as MessageKey)}
                </span>
                <span className="playground-diff-row-values tabular-nums">
                  <span className="text-muted-foreground">
                    {formatKpiValue(k.field, k.real, currency)}
                  </span>
                  <ArrowRightLeft className="w-3 h-3 text-muted shrink-0" size={12} />
                  <span className="text-foreground font-medium">
                    {formatKpiValue(k.field, k.sim, currency)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </motion.section>
  );
}