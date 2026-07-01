"use client";

import { PROJECTION_COLORS } from "@/lib/chartColors";
import { getChartScenarioLabel } from "@/lib/i18n/resolve";
import { useTranslation } from "@/lib/i18n/useTranslation";
import type { MonteCarloScenario } from "@/types";

export type ChartLineId = "base" | "pessimistic" | "optimistic";

export interface ChartLineVisibility {
  base: boolean;
  pessimistic: boolean;
  optimistic: boolean;
}

interface ChartScenarioTogglesProps {
  visibility: ChartLineVisibility;
  onToggle: (line: ChartLineId) => void;
  bandsAvailable?: boolean;
}

const LINES: {
  id: ChartLineId;
  scenario: MonteCarloScenario;
  color: string;
  dash?: boolean;
}[] = [
  { id: "base", scenario: "base", color: PROJECTION_COLORS.base },
  {
    id: "pessimistic",
    scenario: "pessimistic",
    color: PROJECTION_COLORS.pessimistic,
    dash: true,
  },
  {
    id: "optimistic",
    scenario: "optimistic",
    color: PROJECTION_COLORS.optimistic,
    dash: true,
  },
];

export function ChartScenarioToggles({
  visibility,
  onToggle,
  bandsAvailable = true,
}: ChartScenarioTogglesProps) {
  const { locale, t } = useTranslation();

  return (
    <div
      className="chart-scenario-toggles"
      role="group"
      aria-label={t("chart.aria.scenarioVisibility")}
    >
      {LINES.map((line) => {
        const locked = !bandsAvailable && line.id !== "base";
        const active = locked ? false : visibility[line.id];
        return (
          <button
            key={line.id}
            type="button"
            onClick={() => !locked && onToggle(line.id)}
            aria-pressed={active}
            aria-disabled={locked}
            disabled={locked}
            title={locked ? t("chart.bandsLocked") : undefined}
            className="chart-scenario-toggle"
            data-active={active ? "true" : "false"}
            data-locked={locked ? "true" : "false"}
          >
            <span
              className="chart-scenario-swatch"
              style={{
                backgroundColor: active ? line.color : "transparent",
                borderColor: line.color,
                opacity: active ? 1 : 0.35,
              }}
            >
              {line.dash && (
                <span
                  className="chart-scenario-dash"
                  style={{ backgroundColor: line.color }}
                />
              )}
            </span>
            {getChartScenarioLabel(locale, line.scenario)}
          </button>
        );
      })}
    </div>
  );
}