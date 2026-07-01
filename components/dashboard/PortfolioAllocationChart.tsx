"use client";

import { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { getAssetClassLabel } from "@/lib/i18n/resolve";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { CLASS_HEX } from "@/lib/portfolioColors";
import { formatCurrencyValue, type AssetClass, type Currency } from "@/types";

interface Segment {
  assetClass: AssetClass;
  label: string;
  value: number;
  pct: number;
}

interface PortfolioAllocationChartProps {
  segments: Segment[];
  currency: Currency;
  totalValue: number;
}

function AllocationTooltip({
  active,
  payload,
  currency,
}: {
  active?: boolean;
  payload?: { payload: Segment }[];
  currency: Currency;
}) {
  if (!active || !payload?.[0]) return null;
  const seg = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-surface-elevated px-3 py-2 shadow-md text-xs">
      <p className="font-semibold text-foreground">{seg.label}</p>
      <p className="text-muted-foreground mt-0.5 tabular-nums">
        {formatCurrencyValue(seg.value, currency)} · {seg.pct.toFixed(1)}%
      </p>
    </div>
  );
}

export function PortfolioAllocationChart({
  segments,
  currency,
  totalValue,
}: PortfolioAllocationChartProps) {
  const { t, locale } = useTranslation();

  const data = useMemo(
    () =>
      segments.map((s) => ({
        ...s,
        name: getAssetClassLabel(locale, s.assetClass),
        label: getAssetClassLabel(locale, s.assetClass),
      })),
    [segments, locale]
  );

  if (segments.length === 0 || totalValue <= 0) return null;

  return (
    <div className="portfolio-allocation-chart">
      <div className="portfolio-allocation-donut">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius="58%"
              outerRadius="88%"
              paddingAngle={2}
              stroke="rgba(2,6,23,0.6)"
              strokeWidth={2}
            >
              {data.map((entry) => (
                <Cell
                  key={entry.assetClass}
                  fill={CLASS_HEX[entry.assetClass]}
                />
              ))}
            </Pie>
            <Tooltip content={<AllocationTooltip currency={currency} />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="portfolio-allocation-center" aria-hidden="true">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {t("portfolio.allocation.total")}
          </p>
          <p className="text-sm font-bold text-foreground tabular-nums">
            {formatCurrencyValue(totalValue, currency, true)}
          </p>
        </div>
      </div>

      <ul className="portfolio-allocation-legend">
        {segments.map((seg) => (
          <li key={seg.assetClass} className="portfolio-allocation-legend-item">
            <span
              className="portfolio-allocation-swatch"
              style={{ backgroundColor: CLASS_HEX[seg.assetClass] }}
            />
            <span className="text-xs text-muted-foreground flex-1">
              {getAssetClassLabel(locale, seg.assetClass)}
            </span>
            <span className="text-xs font-semibold text-foreground tabular-nums">
              {seg.pct.toFixed(1)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}