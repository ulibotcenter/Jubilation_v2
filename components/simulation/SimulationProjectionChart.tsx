"use client";

import { useMemo } from "react";
import { ProjectionChart } from "@/components/ProjectionChart";
import { HouseholdScopeToggle } from "@/components/ui/HouseholdScopeToggle";
import { SimulationAssetFilter } from "@/components/ui/SimulationAssetFilter";
import { simulationProjectionChartInput } from "@/lib/calculators/simulationChartAdapter";
import { CURRENCY_SYMBOLS } from "@/types";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useAppStore } from "@/store/useAppStore";

export function SimulationProjectionChart() {
  const { t } = useTranslation();
  const sim = useAppStore((s) => s.simPlayground);
  const currency = useAppStore((s) => s.currency);
  const input = useMemo(
    () =>
      simulationProjectionChartInput(
        sim.projections,
        sim.chartData,
        sim.kpis,
        sim.monteCarlo
      ),
    [sim.projections, sim.chartData, sim.kpis, sim.monteCarlo]
  );
  const to =
    sim.projections[sim.projections.length - 1]?.age ?? sim.kpis.retirementAge;

  return (
    <div className="simulation-projection-chart">
      <div className="simulation-projection-toolbar">
        <HouseholdScopeToggle />
        <SimulationAssetFilter mode="playground" />
      </div>
      <ProjectionChart
        data={input.data}
        currency={CURRENCY_SYMBOLS[currency]}
        currencyCode={currency}
        freedomAge={input.freedomAge}
        scenarios={input.scenarios}
        title={t("simulation.playground.projectionTitle")}
        subtitle={t("simulation.projection.subtitle", {
          from: sim.kpis.currentAge,
          to,
        })}
      />
    </div>
  );
}
