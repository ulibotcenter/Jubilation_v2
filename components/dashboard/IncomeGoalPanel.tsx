"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Sparkles, Target } from "lucide-react";
import { EditableNumber } from "@/components/ui/EditableNumber";
import { usePlanSolve } from "@/hooks/usePlanSolve";
import { analyzeIncomeGap } from "@/lib/incomeGoals";
import { getIncomeStatusKey } from "@/lib/i18n/resolve";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { fadeUp } from "@/lib/uiMotion";
import { useAppStore } from "@/store/useAppStore";
import { CURRENCY_SYMBOLS, formatCurrencyValue } from "@/types";

interface IncomeGoalPanelProps {
  /** Kept for callers; the panel uses liveSolve → solvePlan (one engine path). */
  projectedPortfolio?: number;
  mode?: "real" | "playground";
}

export function IncomeGoalPanel({
  mode = "real",
}: IncomeGoalPanelProps) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const setKPI = useAppStore((s) => s.setKPI);
  const setSimKPI = useAppStore((s) => s.setSimKPI);
  const setIncome = mode === "playground" ? setSimKPI : setKPI;
  const setRetirement = mode === "playground" ? setSimKPI : setKPI;
  const { kpis, currency, incomeSolve, dateSolve } = usePlanSolve(mode);
  const currencySymbol = CURRENCY_SYMBOLS[currency];

  const suggested = incomeSolve.feasible ? incomeSolve.value : 0;
  const analysis = analyzeIncomeGap(suggested, kpis.desiredMonthlyIncome);

  const statusColors = {
    ahead: "text-gain",
    "on-track": "text-accent",
    behind: "text-amber-500",
    "far-behind": "text-loss",
  } as const;

  const barColors = {
    ahead: "bg-green-500",
    "on-track": "bg-accent",
    behind: "bg-amber-500",
    "far-behind": "bg-red-500",
  } as const;

  return (
    <motion.div
      className="income-goal-panel card-surface"
      {...fadeUp(reduced, 0.12)}
    >
      <div className="income-goal-header">
        <Sparkles className="w-4 h-4 text-accent" size={16} />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t("income.section")}
        </span>
      </div>

      <div className="income-goal-columns">
        <div className="income-goal-col">
          <p className="income-goal-label">{t("income.solve.income")}</p>
          <p className="income-goal-value tabular-nums">
            {incomeSolve.feasible
              ? formatCurrencyValue(suggested, currency)
              : "—"}
            <span className="income-goal-period">{t("common.perMonth")}</span>
          </p>
          <p className="income-goal-hint">{t("income.solve.incomeHint")}</p>
        </div>

        <div className="income-goal-divider" aria-hidden="true">
          <ArrowRight className="w-4 h-4 text-muted" size={16} />
        </div>

        <div className="income-goal-col income-goal-col--editable">
          <p className="income-goal-label flex items-center gap-1">
            <Target className="w-3 h-3" size={12} />
            {t("income.yourGoal")}
          </p>
          <div className="income-goal-editable">
            <EditableNumber
              value={kpis.desiredMonthlyIncome}
              onChange={(v) => setIncome("desiredMonthlyIncome", v)}
              min={0}
              max={500_000}
              step={100}
              decimals={0}
              format="currency"
              currencySymbol={currencySymbol}
              compact
              inputClassName="text-lg sm:text-xl font-bold bg-transparent"
            />
            <span className="income-goal-period">{t("common.perMonth")}</span>
          </div>
          <p className="income-goal-hint">{t("income.goalHint")}</p>
        </div>
      </div>

      <div className="income-solve-date">
        <div>
          <p className="income-goal-label">{t("income.solve.date")}</p>
          <p className="text-sm font-semibold tabular-nums mt-0.5">
            {dateSolve.feasible
              ? t("income.solve.dateResult", {
                  n: Math.round(dateSolve.value),
                })
              : t("income.solve.infeasible")}
          </p>
          <p className="income-goal-hint">{t("income.solve.dateHint")}</p>
        </div>
        {dateSolve.feasible ? (
          <button
            type="button"
            className="btn-ghost text-xs"
            onClick={() =>
              setRetirement("retirementAge", Math.round(dateSolve.value))
            }
          >
            {t("income.solve.useAge")}
          </button>
        ) : null}
      </div>

      <div className="income-goal-progress">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span
            className={`text-xs font-semibold ${statusColors[analysis.status]}`}
          >
            {t(getIncomeStatusKey(analysis))}
          </span>
          <span className="text-xs text-muted-foreground tabular-nums">
            {t("income.progressOfGoal", { n: analysis.progressPct })}
          </span>
        </div>
        <div className="income-goal-bar-track">
          <motion.div
            className={`income-goal-bar-fill ${barColors[analysis.status]}`}
            initial={{
              width: reduced ? `${Math.min(100, analysis.progressPct)}%` : 0,
            }}
            animate={{ width: `${Math.min(100, analysis.progressPct)}%` }}
            transition={
              reduced ? { duration: 0 } : { duration: 0.7, ease: [0.4, 0, 0.2, 1] }
            }
          />
        </div>
        {kpis.desiredMonthlyIncome > 0 && analysis.gap > 0 && (
          <p className="text-[11px] text-muted-foreground mt-2">
            {t("income.shortfall", {
              amount: formatCurrencyValue(analysis.gap, currency),
            })}
          </p>
        )}
        {analysis.gap < 0 && (
          <p className="text-[11px] text-gain mt-2">
            {t("income.surplus", {
              amount: formatCurrencyValue(Math.abs(analysis.gap), currency),
            })}
          </p>
        )}
      </div>
    </motion.div>
  );
}
