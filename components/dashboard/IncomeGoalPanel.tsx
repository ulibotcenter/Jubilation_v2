"use client";

import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Target } from "lucide-react";
import { EditableNumber } from "@/components/ui/EditableNumber";
import {
  analyzeIncomeGap,
  computeSuggestedMonthlyIncome,
} from "@/lib/incomeGoals";
import { useAppStore } from "@/store/useAppStore";
import { CURRENCY_SYMBOLS, formatCurrencyValue } from "@/types";

interface IncomeGoalPanelProps {
  projectedPortfolio: number;
  mode?: "real" | "playground";
}

export function IncomeGoalPanel({
  projectedPortfolio,
  mode = "real",
}: IncomeGoalPanelProps) {
  const realKpis = useAppStore((s) => s.kpis);
  const simKpis = useAppStore((s) => s.simPlayground.kpis);
  const kpis = mode === "playground" ? simKpis : realKpis;
  const currency = useAppStore((s) => s.currency);
  const setKPI = useAppStore((s) => s.setKPI);
  const setSimKPI = useAppStore((s) => s.setSimKPI);
  const setIncome = mode === "playground" ? setSimKPI : setKPI;
  const currencySymbol = CURRENCY_SYMBOLS[currency];

  const suggested = computeSuggestedMonthlyIncome(projectedPortfolio);
  const analysis = analyzeIncomeGap(suggested, kpis.desiredMonthlyIncome);

  const statusColors = {
    ahead: "text-green-400",
    "on-track": "text-accent",
    behind: "text-amber-400",
    "far-behind": "text-red-400",
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
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <div className="income-goal-header">
        <Sparkles className="w-4 h-4 text-accent" size={16} />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Retirement income
        </span>
      </div>

      <div className="income-goal-columns">
        <div className="income-goal-col">
          <p className="income-goal-label">Suggested by app</p>
          <p className="income-goal-value tabular-nums">
            {formatCurrencyValue(suggested, currency)}
            <span className="income-goal-period">/mo</span>
          </p>
          <p className="income-goal-hint">4% rule on projected portfolio</p>
        </div>

        <div className="income-goal-divider" aria-hidden="true">
          <ArrowRight className="w-4 h-4 text-muted" size={16} />
        </div>

        <div className="income-goal-col income-goal-col--editable">
          <p className="income-goal-label flex items-center gap-1">
            <Target className="w-3 h-3" size={12} />
            Your goal
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
            <span className="income-goal-period">/mo</span>
          </div>
          <p className="income-goal-hint">Tap to set your target lifestyle</p>
        </div>
      </div>

      <div className="income-goal-progress">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span
            className={`text-xs font-semibold ${statusColors[analysis.status]}`}
          >
            {analysis.statusLabel}
          </span>
          <span className="text-xs text-muted-foreground tabular-nums">
            {analysis.progressPct}% of goal
          </span>
        </div>
        <div className="income-goal-bar-track">
          <motion.div
            className={`income-goal-bar-fill ${barColors[analysis.status]}`}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, analysis.progressPct)}%` }}
            transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
          />
        </div>
        {kpis.desiredMonthlyIncome > 0 && analysis.gap > 0 && (
          <p className="text-[11px] text-muted-foreground mt-2">
            Shortfall of{" "}
            <span className="text-foreground font-semibold tabular-nums">
              {formatCurrencyValue(analysis.gap, currency)}
            </span>
            /mo at retirement based on current projection
          </p>
        )}
        {analysis.gap < 0 && (
          <p className="text-[11px] text-green-400/90 mt-2">
            Surplus of{" "}
            <span className="font-semibold tabular-nums">
              {formatCurrencyValue(Math.abs(analysis.gap), currency)}
            </span>
            /mo above your goal
          </p>
        )}
      </div>
    </motion.div>
  );
}