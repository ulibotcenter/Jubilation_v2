"use client";

import { useMemo, useState } from "react";
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
  ReferenceArea,
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
import { HouseholdScopeToggle } from "@/components/ui/HouseholdScopeToggle";
import { PROJECTION_COLORS } from "@/lib/chartColors";
import { getChartScenarioLabel } from "@/lib/i18n/resolve";
import {
  getChartHorizonAge,
  getEndOfLifeProjectionRow,
  getRetirementProjectionRow,
} from "@/lib/projectionUtils";
import { buildDisplayChartData } from "@/lib/projectionChartData";
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
  const [lineOverrides, setLineOverrides] = useState<Partial<ChartLineVisibility>>(
    {}
  );
  const [showCashFlow, setShowCashFlow] = useState(!compact);

  const toggleLine = (line: ChartLineId) =>
    setLineOverrides((prev) => {
      const current =
        line === "base" ? (prev.base ?? true) : (prev[line] ?? true);
      return { ...prev, [line]: !current };
    });

  const sym = CURRENCY_SYMBOLS[currency];
  const pc = PROJECTION_COLORS;
  const chartHorizon = getChartHorizonAge(projections, kpis);
  const retirementRow = getRetirementProjectionRow(
    projections,
    kpis.retirementAge
  );
  const endOfLifeRow = getEndOfLifeProjectionRow(projections, chartHorizon);
  const mcReady =
    monteCarlo.hasRun && (monteCarlo.results?.length ?? 0) > 0;

  const displayChartData = useMemo(
    () =>
      buildDisplayChartData(chartData, projections, kpis, {
        hasRun: monteCarlo.hasRun,
        results: monteCarlo.results,
      }),
    [chartData, projections, kpis, monteCarlo.hasRun, monteCarlo.results]
  );

  const hasMcBands = useMemo(() => {
    const fromChart = displayChartData.some(
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
  }, [displayChartData, mcReady, monteCarlo.results]);

  const lineVisibility: ChartLineVisibility = {
    base: lineOverrides.base ?? true,
    pessimistic: hasMcBands ? (lineOverrides.pessimistic ?? true) : false,
    optimistic: hasMcBands ? (lineOverrides.optimistic ?? true) : false,
  };

  const effectiveVisibility = useMemo(
    (): ChartLineVisibility => ({
      base: lineVisibility.base,
      pessimistic: hasMcBands && lineVisibility.pessimistic,
      optimistic: hasMcBands && lineVisibility.optimistic,
    }),
    [hasMcBands, lineVisibility.base, lineVisibility.pessimistic, lineVisibility.optimistic]
  );

  const peakValue = useMemo(() => {
    const values = displayChartData.flatMap((d) => {
      const pts = [d.value];
      if (effectiveVisibility.pessimistic && d.pessimistic != null)
        pts.push(d.pessimistic);
      if (effectiveVisibility.optimistic && d.optimistic != null)
        pts.push(d.optimistic);
      return pts;
    });
    return Math.max(...values, 0);
  }, [displayChartData, effectiveVisibility]);

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
            {!compact && (retirementRow || endOfLifeRow) && (
              <div className="chart-headline-stats mt-1">
                {retirementRow && (
                  <p className="text-xs text-accent font-semibold tabular-nums">
                    {t("chart.atRetirement", {
                      amount: formatCurrencyValue(
                        retirementRow.portfolioValue,
                        currency,
                        true
                      ),
                    })}
                  </p>
                )}
                {endOfLifeRow && endOfLifeRow.age > kpis.retirementAge && (
                  <p className="text-xs text-muted-foreground font-medium tabular-nums">
                    {t("chart.atEndOfLife", {
                      age: endOfLifeRow.age,
                      amount: formatCurrencyValue(
                        endOfLifeRow.portfolioValue,
                        currency,
                        true
                      ),
                    })}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <HouseholdScopeToggle />
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
        <ChartSkeleton
          visible={projectionRevision > 0}
          revision={projectionRevision}
        />
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            key={`chart-${mode}-${projectionRevision}`}
            data={displayChartData}
            margin={{ top: 8, right: 12, left: 4, bottom: 4 }}
          >
            <defs>
              <linearGradient id={`baseGradient-${mode}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={pc.base} stopOpacity={0.28} />
                <stop offset="100%" stopColor={pc.base} stopOpacity={0} />
              </linearGradient>
              <linearGradient id={`confidenceBand-${mode}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={pc.optimistic} stopOpacity={0.18} />
                <stop offset="50%" stopColor={pc.base} stopOpacity={0.08} />
                <stop offset="100%" stopColor={pc.pessimistic} stopOpacity={0.18} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={pc.grid}
              vertical={false}
            />
            <XAxis
              dataKey="age"
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              axisLine={{ stroke: "#1e293b" }}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={32}
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
                stroke: pc.cursor,
                strokeWidth: 1,
                strokeDasharray: "4 4",
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }}
              iconType="line"
            />
            <ReferenceArea
              x1={kpis.retirementAge}
              x2={chartHorizon}
              fill="rgba(251,191,36,0.06)"
              strokeOpacity={0}
            />
            <ReferenceLine
              x={kpis.currentAge}
              stroke={pc.currentAgeMarker}
              strokeDasharray="4 4"
              strokeWidth={1}
            />
            <ReferenceLine
              x={kpis.retirementAge}
              stroke={pc.retirementMarker}
              strokeDasharray="6 4"
              strokeWidth={1.5}
              label={{
                value: t("chart.phase.retirement"),
                position: "insideTopRight",
                fill: pc.retirementMarker,
                fontSize: 10,
              }}
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
                stroke={pc.pessimistic}
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
                stroke={pc.base}
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
                stroke={pc.optimistic}
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
          chartData={displayChartData}
          projections={projections}
          kpis={kpis}
          currency={currency}
          projectionRevision={projectionRevision}
        />
      )}
    </motion.div>
  );
}