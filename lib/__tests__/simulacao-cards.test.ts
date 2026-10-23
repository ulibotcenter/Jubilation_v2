import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("simulation card stack and order", () => {
  const page = readFileSync(
    "components/simulation/SimulationPlaygroundPage.tsx",
    "utf8"
  );
  const cards = readFileSync("components/dashboard/KPICards.tsx", "utf8");
  const css = readFileSync("app/globals.css", "utf8");

  it("keeps compact cards in a label / value / subtitle stack", () => {
    const stack = cards.slice(cards.indexOf("kpi-card-compact-main"));
    expect(stack.indexOf('className="kpi-label"')).toBeLessThan(
      stack.indexOf('className="kpi-value"')
    );
    expect(stack.indexOf('className="kpi-value"')).toBeLessThan(
      stack.indexOf('className="kpi-subtitle"')
    );
    expect(css).toMatch(
      /\.kpi-card-compact-main\s*\{[^}]*flex-direction:\s*column/
    );
    expect(css).toMatch(/\.kpi-card-compact-main\s*\{[^}]*flex-wrap:\s*nowrap/);
  });

  it("marks playground cards with a field hook for edit-mode proof", () => {
    expect(cards).toContain("data-kpi-field={config.field}");
  });

  it("puts the projection chart before renda na aposentadoria", () => {
    const chartAt = page.indexOf('data-sim-block="chart"');
    const incomeAt = page.indexOf('data-sim-block="income"');
    const diffAt = page.indexOf("<PlaygroundDiffPanel");
    expect(chartAt).toBeGreaterThan(-1);
    expect(incomeAt).toBeGreaterThan(chartAt);
    expect(diffAt).toBeGreaterThan(incomeAt);
  });
});
