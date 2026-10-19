import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  FREEDOM_CHART_ID,
  stickyHeaderScrollMargin,
} from "@/lib/calculators/scrollToFreedomChart";

describe("freedom calculator scrolls to the chart after calculate", () => {
  const calculator = readFileSync(
    "components/calculators/FreedomCalculator.tsx",
    "utf8"
  );
  const helper = readFileSync(
    "lib/calculators/scrollToFreedomChart.ts",
    "utf8"
  );
  const chart = readFileSync("components/ProjectionChart.tsx", "utf8");

  it("targets the existing projection chart, not the footer or next-step CTA", () => {
    expect(calculator).toContain("scrollToFreedomChart");
    expect(calculator).toContain("id={FREEDOM_CHART_ID}");
    expect(calculator).not.toMatch(
      /getElementById\(["']freedom-next-cta["']\)/
    );
    const submitBlock = calculator.slice(
      calculator.indexOf("onSubmit="),
      calculator.indexOf("<NumberField")
    );
    expect(submitBlock).toContain("scrollToFreedomChart()");
    expect(submitBlock).not.toContain("freedom-next-cta");
    expect(submitBlock).not.toContain("public-prose");
    expect(submitBlock).not.toContain("public-footer");
    expect(submitBlock).not.toContain("AppCta");
    expect(helper).toContain(`"${FREEDOM_CHART_ID}"`);
    expect(helper).toContain('getElementById(FREEDOM_CHART_ID)');
    expect(helper).toContain('scrollIntoView({ behavior: "smooth", block: "start" })');
    expect(helper).toContain(".public-header");
    expect(helper).toContain("scrollMarginTop");
    expect(helper).toContain('focus({ preventScroll: true })');
    expect(helper).not.toContain("freedom-next-cta");
    expect(helper).not.toContain("public-prose");
    expect(helper).not.toContain("public-footer");
    expect(helper).not.toContain("public-cta");
    expect(helper).not.toContain("AppCta");
  });

  it("keeps the result card and E agora CTA below the chart on the same page", () => {
    const chartAt = calculator.indexOf("<ProjectionChart");
    const resultAt = calculator.indexOf('className="public-result');
    const nextAt = calculator.indexOf("<FreedomNextStepCta");
    const proseAt = calculator.indexOf('className="public-prose"');
    expect(chartAt).toBeGreaterThan(-1);
    expect(resultAt).toBeGreaterThan(chartAt);
    expect(nextAt).toBeGreaterThan(resultAt);
    expect(proseAt).toBeGreaterThan(nextAt);
    expect(calculator).toContain("FreedomNextStepCta");
  });

  it("does not restyle or swap the projection chart", () => {
    expect(calculator).toContain('from "@/components/ProjectionChart"');
    expect(calculator).not.toContain("FreedomProjectionChart");
    expect(chart).toContain("export function ProjectionChart");
    expect(chart).toContain("id={id}");
    expect(chart).toContain("tabIndex={id ? -1 : undefined}");
    expect(chart).toContain('className="projection-chart"');
    expect(chart).not.toContain("recharts");
  });

  it("places the chart flush under the sticky header", () => {
    expect(stickyHeaderScrollMargin(72.4)).toBe("73px");
    expect(stickyHeaderScrollMargin(0)).toBe("0px");
    expect(stickyHeaderScrollMargin(-8)).toBe("0px");
    expect(FREEDOM_CHART_ID).toBe("freedom-projection-chart");
  });
});
