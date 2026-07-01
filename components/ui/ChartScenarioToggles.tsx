"use client";

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
}

const LINES: {
  id: ChartLineId;
  scenario: MonteCarloScenario;
  color: string;
  dash?: boolean;
}[] = [
  { id: "base", scenario: "base", color: "#ff7040" },
  { id: "pessimistic", scenario: "pessimistic", color: "#f87171", dash: true },
  { id: "optimistic", scenario: "optimistic", color: "#4ade80", dash: true },
];

export function ChartScenarioToggles({
  visibility,
  onToggle,
}: ChartScenarioTogglesProps) {
  const { locale, t } = useTranslation();

  return (
    <div
      className="chart-scenario-toggles"
      role="group"
      aria-label={t("chart.aria.scenarioVisibility")}
    >
      {LINES.map((line) => {
        const active = visibility[line.id];
        return (
          <button
            key={line.id}
            type="button"
            onClick={() => onToggle(line.id)}
            aria-pressed={active}
            className="chart-scenario-toggle"
            data-active={active ? "true" : "false"}
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