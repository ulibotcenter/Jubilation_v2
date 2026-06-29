"use client";

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
  label: string;
  color: string;
  dash?: boolean;
}[] = [
  { id: "base", label: "Base", color: "#ff7040" },
  { id: "pessimistic", label: "Pessimistic", color: "#f87171", dash: true },
  { id: "optimistic", label: "Optimistic", color: "#4ade80", dash: true },
];

export function ChartScenarioToggles({
  visibility,
  onToggle,
}: ChartScenarioTogglesProps) {
  return (
    <div
      className="chart-scenario-toggles"
      role="group"
      aria-label="Chart scenario visibility"
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
            {line.label}
          </button>
        );
      })}
    </div>
  );
}