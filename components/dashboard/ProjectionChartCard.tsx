"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { BarChart3, LineChart as LineChartIcon, Loader2, Play } from "lucide-react";
import { toast } from "sonner";
import { ProjectionCashFlowChart } from "@/components/dashboard/ProjectionCashFlowChart";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartScenarioToggles,
  type ChartLineId,
  type ChartLineVisibility,
} from "@/components/ui/ChartScenarioToggles";
import { ChartSkeleton } from "@/components/ui/ChartSkeleton";
import { ChartTooltip } from "@/components/ui/ChartTooltip";
import { SimulationAssetFilter } from "@/components/ui/SimulationAssetFilter";
import { getChartScenarioLabel } from "@/lib/i18n/resolve";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useAppStore } from "@/store/useAppStore";
import {
  CURRENCY_SYMBOLS,
  formatCurrencyValue,
  type ChartDataPoint,
  type Currency,
  type KPIValues,
  type ProjectionYear,
} from "@/types";

const CHART_ANIMATION = {
  isAnimationActive: true,
  animationDuration: 900,
  animationEasing: "ease-out" as const,
};

interface ProjectionChartCardProps {
  title: string;
  subtitle: string;
  chartData: ChartDataPoint[];
  projections: ProjectionYear[];
  kpis: KPIValues;
  currency: Currency;
  projectionRevision: number;
  mode?: "real" | "playground";
  showAssetFilter?: boolean;
  compact?: boolean;
}

export function ProjectionChartCard({
  title,
  subtitle,
  chartData,
  projections,
  kpis,
  currency,
  projectionRevision,
  mode = "real",
  showAssetFilter = true,
  compact = false,
}: ProjectionChartCardProps) {
  const { t, locale } = useTranslation();
  const monteCarlo = useAppStore((s) =>
    mode === "playground" ? s.simPlayground.monteCarlo : s.monteCarlo
  );
  const runRealMc = useAppStore((s) => s.runMonteCarlo);
  const runSimMc = useAppStore((s) => s.runSimMonteCarlo);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [lineVisibility, setLineVisibility] = useState<ChartLineVisibility>({
    base: true,
    pessimistic: false,
    optimistic: false,
  });
  const [showCashFlow, setShowCashFlow] = useState(!compact);

  const toggleLine = (line: ChartLineId) =>
    setLineVisibility((prev) => ({ ...prev, [line]: !prev[line] }));

  useEffect(() => {
    if (projectionRevision === 0) return;
    setIsRecalculating(true);
    const t = setTimeout(() => setIsRecalculating(false), 650);
    return () => clearTimeout(t);
  }, [projectionRevision]);

  const sym = CURRENCY_SYMBOLS[currency];
  const finalRow = projections[projections.length - 1];
  const mcReady =
    monteCarlo.hasRun && (monteCarlo.results?.length ?? 0) > 0;

  const hasMcBands = useMemo(() => {
    const fromChart = chartData.some(
      (d) =>
        d.pessimistic != null &&
        d.optimistic != null &&
        (d.band ?? 0) > 0 &&
        (d.pessimistic !== d.value || d.optimistic !== d.value)
    );
    if (fromChart) return true;
    if (!mcReady) return false;
    const base = monteCarlo.results.find((r) => r.scenario === "base");
    return (
      base != null &&
      base.percentile10 !== base.percentile90 &&
      base.percentile10 > 0
    );
  }, [chartData, mcReady, monteCarlo.results]);

  useEffect(() => {
    if (hasMcBands) {
      setLineVisibility({ base: true, pessimistic: true, optimistic: true });
      return;
    }
    setLineVisibility({ base: true, pessimistic: false, optimistic: false });
  }, [hasMcBands]);

  const effectiveVisibility = useMemo(
    (): ChartLineVisibility => ({
      base: lineVisibility.base,
      pessimistic: hasMcBands && lineVisibility.pessimistic,
      optimistic: hasMcBands && lineVisibility.optimistic,
    }),
    [hasMcBands, lineVisibility]
  );

  const peakValue = useMemo(() => {
    const values = chartData.flatMap((d) => {
      const pts = [d.value];
      if (effectiveVisibility.pessimistic && d.pessimistic != null)
        pts.push(d.pessimistic);
      if (effectiveVisibility.optimistic && d.optimistic != null)
        pts.push(d.optimistic);
      return pts;
    });
    return Math.max(...values, 0);
  }, [chartData, effectiveVisibility]);

  const handleRunMonteCarlo = async () => {
    const runMc = mode === "playground" ? runSimMc : runRealMc;
    await runMc();
    toast.success(t("toast.monteCarlo.complete"), {
      description: t("toast.monteCarlo.completeDesc"),
    });
  };

  const formatYAxis = (value: number) => {
    if (value >= 1_000_000) return `${sym}${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1000) return `${sym}${(value / 1000).toFixed(0)}K`;
    return `${sym}${value}`;
  };

  return (
    <motion.div
      className="card-surface p-4 sm:p-6"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-accent/10 shrink-0">
            <LineChartIcon className="w-4 h-4 text-accent" size={16} />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-foreground">
              {title}
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              {subtitle}
            </p>
            {!compact && finalRow && (
              <p className="text-xs text-accent font-semibold tabular-nums mt-1">
                {t("chart.atRetirement", {
                  amount: formatCurrencyValue(
                    finalRow.portfolioValue,
                    currency,
                    true
                  ),
                })}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {showAssetFilter && <SimulationAssetFilter mode={mode} />}
          <ChartScenarioToggles
            visibility={lineVisibility}
            onToggle={toggleLine}
            bandsAvailable={hasMcBands}
          />
          {hasMcBands ? (
            monteCarlo.stale ? (
              <p className="chart-bands-stale w-full sm:w-auto text-left">
                {t("chart.bandsStale")}
              </p>
            ) : (
              <p className="chart-bands-active w-full sm:w-auto text-left">
                {t("chart.bandsActive")}
              </p>
            )
          ) : (
            <div className="chart-bands-cta w-full sm:w-auto">
              <p className="chart-bands-hint text-left">
                {mode === "playground"
                  ? t("chart.bandsHintPlayground")
                  : t("chart.bandsHint")}
              </p>
              {mode === "real" ? (
                <button
                  type="button"
                  className="chart-mc-run-btn"
                  onClick={handleRunMonteCarlo}
                  disabled={monteCarlo.isRunning}
                >
                  {monteCarlo.isRunning ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" size={14} />
                      {t("chart.runningMc")}
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" size={14} />
                      {t("chart.runMonteCarlo")}
                    </>
                  )}
                </button>
              ) : (
                <a href="#monte-carlo" className="chart-mc-run-btn">
                  <Play className="w-3.5 h-3.5" size={14} />
                  {t("chart.goToMonteCarlo")}
                </a>
              )}
            </div>
          )}
          <button
            type="button"
            className="chart-toggle-btn"
            data-active={showCashFlow ? "true" : "false"}
            onClick={() => setShowCashFlow((v) => !v)}
            aria-pressed={showCashFlow}
          >
            <BarChart3 className="w-3.5 h-3.5" size={14} />
            {t("chart.cashFlowToggle")}
          </button>
        </div>
      </div>

      <div
        className={`chart-container relative ${compact ? "chart-container--compact" : ""}`}
      >
        <ChartSkeleton visible={isRecalculating} />
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            key={`chart-${mode}-${projectionRevision}`}
            data={chartData}
            margin={{ top: 8, right: 12, left: 4, bottom: 4 }}
          >
            <defs>
              <linearGradient id={`baseGradient-${mode}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ff7040" stopOpacity={0.28} />
                <stop offset="100%" stopColor="#ff7040" stopOpacity={0} />
              </linearGradient>
              <linearGradient id={`confidenceBand-${mode}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4ade80" stopOpacity={0.18} />
                <stop offset="50%" stopColor="#ff7040" stopOpacity={0.08} />
                <stop offset="100%" stopColor="#f87171" stopOpacity={0.18} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(30,41,59,0.8)"
              vertical={false}
            />
            <XAxis
              dataKey="age"
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              axisLine={{ stroke: "#1e293b" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={formatYAxis}
              width={56}
              domain={[0, Math.ceil(peakValue * 1.1)]}
            />
            <Tooltip
              content={<ChartTooltip currency={currency} />}
              cursor={{
                stroke: "rgba(255,112,64,0.35)",
                strokeWidth: 1,
                strokeDasharray: "4 4",
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }}
              iconType="line"
            />
            <ReferenceLine
              x={kpis.currentAge}
              stroke="#64748b"
              strokeDasharray="4 4"
              strokeWidth={1}
            />
            <ReferenceLine
              x={kpis.retirementAge}
              stroke="#ff7040"
              strokeDasharray="6 4"
            />
            {hasMcBands &&
              effectiveVisibility.pessimistic &&
              effectiveVisibility.optimistic && (
              <>
                <Area
                  type="monotone"
                  dataKey="pessimistic"
                  stackId="confidence"
                  stroke="none"
                  fill="transparent"
                  legendType="none"
                  tooltipType="none"
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="band"
                  stackId="confidence"
                  stroke="none"
                  fill={`url(#confidenceBand-${mode})`}
                  legendType="none"
                  tooltipType="none"
                  isAnimationActive={false}
                />
              </>
            )}
            {effectiveVisibility.base && (
              <Area
                type="monotone"
                dataKey="value"
                stroke="none"
                fill={`url(#baseGradient-${mode})`}
                legendType="none"
                tooltipType="none"
                isAnimationActive={false}
              />
            )}
            {hasMcBands && effectiveVisibility.pessimistic && (
              <Line
                type="monotone"
                dataKey="pessimistic"
                stroke="#f87171"
                strokeWidth={1.5}
                strokeDasharray="5 5"
                dot={false}
                name={getChartScenarioLabel(locale, "pessimistic")}
                {...CHART_ANIMATION}
              />
            )}
            {effectiveVisibility.base && (
              <Line
                type="monotone"
                dataKey="value"
                stroke="#ff7040"
                strokeWidth={2.5}
                dot={false}
                name={getChartScenarioLabel(locale, "base")}
                {...CHART_ANIMATION}
              />
            )}
            {hasMcBands && effectiveVisibility.optimistic && (
              <Line
                type="monotone"
                dataKey="optimistic"
                stroke="#4ade80"
                strokeWidth={1.5}
                strokeDasharray="5 5"
                dot={false}
                name={getChartScenarioLabel(locale, "optimistic")}
                {...CHART_ANIMATION}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {showCashFlow && (
        <ProjectionCashFlowChart
          chartData={chartData}
          currency={currency}
          projectionRevision={projectionRevision}
        />
      )}
    </motion.div>
  );
}