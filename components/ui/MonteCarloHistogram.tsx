"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ChartColumn } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getChartScenarioLabel } from "@/lib/i18n/resolve";
import { useTranslation } from "@/lib/i18n/useTranslation";
import {
  CURRENCY_SYMBOLS,
  formatCurrencyValue,
  type Currency,
  type DistributionBin,
  type MonteCarloScenario,
} from "@/types";

const SCENARIO_COLORS: Record<MonteCarloScenario, { above: string; below: string }> = {
  pessimistic: { above: "#4ade80", below: "#f87171" },
  base: { above: "#4ade80", below: "#f87171" },
  optimistic: { above: "#4ade80", below: "#f87171" },
};

interface MonteCarloHistogramProps {
  distributions: Record<MonteCarloScenario, DistributionBin[]>;
  target: number;
  currency: Currency;
  retirementAge: number;
  isRunning?: boolean;
}

function HistogramTooltip({
  active,
  payload,
  currency,
}: {
  active?: boolean;
  payload?: { payload: DistributionBin }[];
  currency: Currency;
}) {
  const { t } = useTranslation();

  if (!active || !payload?.[0]) return null;
  const bin = payload[0].payload;

  return (
    <div className="rounded-lg border border-border bg-surface-elevated px-3 py-2 shadow-md text-xs">
      <p className="font-semibold text-foreground">
        {formatCurrencyValue(bin.midpoint, currency, true)}
      </p>
      <p className="text-muted-foreground mt-0.5">
        {t("monteCarlo.histogram.outcomes", { n: bin.count.toLocaleString("en-US") })}
      </p>
      <p
        className={`text-[10px] mt-1 font-medium ${
          bin.meetsTarget ? "text-green-400" : "text-red-400"
        }`}
      >
        {bin.meetsTarget
          ? t("monteCarlo.histogram.aboveTarget")
          : t("monteCarlo.histogram.belowTarget")}
      </p>
    </div>
  );
}

export function MonteCarloHistogram({
  distributions,
  target,
  currency,
  retirementAge,
  isRunning = false,
}: MonteCarloHistogramProps) {
  const { t, locale } = useTranslation();
  const [scenario, setScenario] = useState<MonteCarloScenario>("base");
  const sym = CURRENCY_SYMBOLS[currency];
  const bins = distributions[scenario];

  const targetBinLabel = useMemo(() => {
    if (bins.length === 0) return undefined;
    const closest = bins.reduce((best, bin) =>
      Math.abs(bin.midpoint - target) < Math.abs(best.midpoint - target)
        ? bin
        : best
    );
    return closest.label;
  }, [bins, target]);

  const aboveTarget = useMemo(
    () => bins.reduce((sum, b) => sum + (b.meetsTarget ? b.count : 0), 0),
    [bins]
  );
  const total = useMemo(
    () => bins.reduce((sum, b) => sum + b.count, 0),
    [bins]
  );

  const targetDisplay =
    target >= 1_000_000
      ? `${sym}${(target / 1_000_000).toFixed(1)}M`
      : `${sym}${Math.round(target / 1000)}K`;

  return (
    <motion.div
      className="monte-histogram"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.15 }}
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-accent/10 shrink-0">
            <ChartColumn className="w-4 h-4 text-accent" size={16} />
          </div>
          <div>
            <h4 className="text-base font-bold text-foreground">
              {t("monteCarlo.histogram.title")}
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("monteCarlo.histogram.subtitle", {
                age: retirementAge,
                paths: total.toLocaleString("en-US"),
              })}
            </p>
          </div>
        </div>

        <div
          className="monte-histogram-scenarios"
          role="tablist"
          aria-label={t("monteCarlo.histogram.scenarioAria")}
        >
          {(["pessimistic", "base", "optimistic"] as MonteCarloScenario[]).map(
            (s) => (
              <button
                key={s}
                type="button"
                role="tab"
                aria-selected={scenario === s}
                onClick={() => setScenario(s)}
                className="monte-histogram-scenario"
                data-active={scenario === s ? "true" : "false"}
              >
                {getChartScenarioLabel(locale, s)}
              </button>
            )
          )}
        </div>
      </div>

      {isRunning ? (
        <div className="monte-histogram-skeleton">
          {Array.from({ length: 14 }).map((_, i) => (
            <div
              key={i}
              className="skeleton rounded-t-md"
              style={{ height: `${30 + ((i * 17) % 55)}%` }}
            />
          ))}
        </div>
      ) : (
        <div className="monte-histogram-chart">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={bins}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(30,41,59,0.8)"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 9, fill: "#94a3b8" }}
                axisLine={{ stroke: "#1e293b" }}
                tickLine={false}
                interval={0}
                angle={-35}
                textAnchor="end"
                height={48}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
                width={32}
                allowDecimals={false}
              />
              <Tooltip
                content={<HistogramTooltip currency={currency} />}
                cursor={{ fill: "rgba(255,112,64,0.06)" }}
              />
              {targetBinLabel && (
                <ReferenceLine
                  x={targetBinLabel}
                  stroke="#ff7040"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  label={{
                    value: t("monteCarlo.histogram.target"),
                    position: "insideTopRight",
                    fontSize: 9,
                    fill: "#ff7040",
                  }}
                />
              )}
              <Bar
                dataKey="count"
                radius={[4, 4, 0, 0]}
                maxBarSize={36}
                isAnimationActive
                animationDuration={700}
              >
                {bins.map((bin) => (
                  <Cell
                    key={bin.label}
                    fill={
                      bin.meetsTarget
                        ? SCENARIO_COLORS[scenario].above
                        : SCENARIO_COLORS[scenario].below
                    }
                    fillOpacity={0.82}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="monte-histogram-legend">
        <span className="monte-histogram-legend-item">
          <span className="monte-histogram-swatch bg-green-400/80" />
          {t("monteCarlo.histogram.aboveTargetPct", {
            n: total > 0 ? Math.round((aboveTarget / total) * 100) : 0,
          })}
        </span>
        <span className="monte-histogram-legend-item">
          <span className="monte-histogram-swatch bg-red-400/80" />
          {t("monteCarlo.histogram.belowTarget")}
        </span>
        <span className="monte-histogram-legend-item text-muted-foreground">
          {t("monteCarlo.histogram.targetLabel", { amount: targetDisplay })}
        </span>
      </div>
    </motion.div>
  );
}