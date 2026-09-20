"use client";

import { useMemo } from "react";
import { liveSolve } from "@/lib/solveLive";
import { useAppStore } from "@/store/useAppStore";

export function usePlanSolve(mode: "real" | "playground" = "real") {
  const realKpis = useAppStore((s) => s.kpis);
  const simKpis = useAppStore((s) => s.simPlayground.kpis);
  const kpis = mode === "playground" ? simKpis : realKpis;
  const realPortfolio = useAppStore((s) => s.portfolio);
  const simPortfolio = useAppStore((s) => s.simPlayground.portfolio);
  const portfolio = mode === "playground" ? simPortfolio : realPortfolio;
  const realIncluded = useAppStore((s) => s.simulationIncludedAssetIds);
  const simIncluded = useAppStore((s) => s.simPlayground.simulationIncludedAssetIds);
  const includedAssetIds = mode === "playground" ? simIncluded : realIncluded;
  const realOutside = useAppStore((s) => s.kpiOutsidePortfolio);
  const simOutside = useAppStore((s) => s.simPlayground.kpiOutsidePortfolio);
  const outsidePortfolio = mode === "playground" ? simOutside : realOutside;
  const household = useAppStore((s) => s.household);
  const currency = useAppStore((s) => s.currency);
  const country = useAppStore((s) => s.country);
  const manualEffectiveTaxRatePct = useAppStore(
    (s) => s.manualEffectiveTaxRatePct
  );
  const fxSnapshot = useAppStore((s) => s.fxSnapshot);

  const solveInput = useMemo(
    () => ({
      kpis,
      portfolio,
      includedAssetIds,
      outsidePortfolio,
      currency,
      fxSnapshot,
      household,
      country,
      manualEffectiveTaxRatePct,
    }),
    [
      kpis,
      portfolio,
      includedAssetIds,
      outsidePortfolio,
      currency,
      fxSnapshot,
      household,
      country,
      manualEffectiveTaxRatePct,
    ]
  );

  const incomeSolve = useMemo(
    () => liveSolve(solveInput, "income"),
    [solveInput]
  );
  const dateSolve = useMemo(
    () => liveSolve(solveInput, "date"),
    [solveInput]
  );

  return { kpis, currency, incomeSolve, dateSolve };
}
