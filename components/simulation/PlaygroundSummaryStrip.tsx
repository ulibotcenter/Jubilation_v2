"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  FlaskConical,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { computeFITargetFromDesired } from "@/lib/incomeGoals";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useAppStore } from "@/store/useAppStore";
import { formatCurrencyValue } from "@/types";

export function PlaygroundSummaryStrip() {
  const { t } = useTranslation();
  const sim = useAppStore((s) => s.simPlayground);
  const currency = useAppStore((s) => s.currency);

  const { score, onTrack, target, projectedValue, yearsLeft } = useMemo(() => {
    const finalRow = sim.projections[sim.projections.length - 1];
    const projected = finalRow?.portfolioValue ?? 0;
    const targetValue =
      sim.kpis.desiredMonthlyIncome > 0
        ? computeFITargetFromDesired(sim.kpis.desiredMonthlyIncome)
        : sim.kpis.currentNetWorth * 25;
    const rawScore =
      targetValue > 0 ? Math.min(100, (projected / targetValue) * 100) : 0;
    const mcBase = sim.monteCarlo.results.find((r) => r.scenario === "base");
    const blended = mcBase
      ? Math.round(rawScore * 0.6 + mcBase.successRate * 0.4)
      : Math.round(rawScore);

    return {
      score: blended,
      onTrack: blended >= 75,
      target: targetValue,
      projectedValue: projected,
      yearsLeft: sim.kpis.retirementAge - sim.kpis.currentAge,
    };
  }, [sim]);

  const metrics = [
    {
      icon: TrendingUp,
      label: t("hero.metric.fiTarget"),
      value: formatCurrencyValue(target, currency, true),
    },
    {
      icon: Wallet,
      label: t("hero.metric.projected"),
      value: formatCurrencyValue(projectedValue, currency, true),
    },
    {
      icon: Calendar,
      label: t("hero.metric.timeline"),
      value: `${yearsLeft}y`,
    },
  ];

  return (
    <motion.section
      className="playground-summary-strip"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      aria-label={t("simulation.playground.readiness")}
    >
      <div className="playground-summary-main">
        <div className="playground-summary-score" data-on-track={onTrack}>
          <FlaskConical className="w-4 h-4 text-accent" size={16} />
          <span className="playground-summary-score-value tabular-nums">
            {score}
          </span>
          <span className="playground-summary-score-caption">{t("hero.score")}</span>
        </div>

        <div className="playground-summary-copy">
          <p className="playground-summary-title">
            {t("simulation.playground.readiness")}
          </p>
          <div
            className={`playground-summary-status ${
              onTrack
                ? "playground-summary-status--ok"
                : "playground-summary-status--warn"
            }`}
          >
            {onTrack ? (
              <CheckCircle2 className="w-3.5 h-3.5" size={14} />
            ) : (
              <AlertCircle className="w-3.5 h-3.5" size={14} />
            )}
            {onTrack
              ? t("simulation.playground.status.onTrack")
              : t("simulation.playground.status.needsAttention")}
          </div>
          <p className="playground-summary-subline">
            <span className="text-foreground font-semibold tabular-nums">
              {formatCurrencyValue(projectedValue, currency, true)}
            </span>{" "}
            {t("simulation.playground.projectedAtAge", {
              n: sim.kpis.retirementAge,
            })}
          </p>
        </div>
      </div>

      <div className="playground-summary-metrics">
        {metrics.map((m) => (
          <div key={m.label} className="playground-summary-metric">
            <m.icon className="w-3.5 h-3.5 text-accent opacity-80" size={14} />
            <p className="playground-summary-metric-label">{m.label}</p>
            <p className="playground-summary-metric-value tabular-nums">
              {m.value}
            </p>
          </div>
        ))}
      </div>
    </motion.section>
  );
}