"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Loader2,
  Play,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/ui/EmptyState";
import { MonteCarloHistogram } from "@/components/ui/MonteCarloHistogram";
import { useAppStore } from "@/store/useAppStore";
import {
  CURRENCY_SYMBOLS,
  MONTE_CARLO_SCENARIO_LABELS,
  STRESS_TESTS,
  formatCurrencyValue,
  type MonteCarloScenario,
  type StressTestId,
} from "@/types";

// i18n-ready: strings → future next-intl keys (monteCarlo.*)

const SCENARIO_CLASS: Record<MonteCarloScenario, string> = {
  pessimistic: "scenario-pessimistic",
  base: "scenario-base",
  optimistic: "scenario-optimistic",
};

const SCENARIO_BORDER: Record<MonteCarloScenario, string> = {
  pessimistic: "border-red-500/25",
  base: "border-accent/30",
  optimistic: "border-green-500/25",
};

function SuccessBar({ rate }: { rate: number }) {
  return (
    <div className="mt-2">
      <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
        <span>Success rate</span>
        <span className="font-semibold text-foreground tabular-nums">
          {rate}%
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-surface-elevated overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-accent"
          initial={{ width: 0 }}
          animate={{ width: `${rate}%` }}
          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
        />
      </div>
    </div>
  );
}

interface MonteCarloCardProps {
  mode?: "real" | "playground";
}

export function MonteCarloCard({ mode = "real" }: MonteCarloCardProps) {
  const currency = useAppStore((s) => s.currency);
  const realKpis = useAppStore((s) => s.kpis);
  const simKpis = useAppStore((s) => s.simPlayground.kpis);
  const kpis = mode === "playground" ? simKpis : realKpis;
  const realMc = useAppStore((s) => s.monteCarlo);
  const simMc = useAppStore((s) => s.simPlayground.monteCarlo);
  const monteCarlo = mode === "playground" ? simMc : realMc;
  const runRealMc = useAppStore((s) => s.runMonteCarlo);
  const runSimMc = useAppStore((s) => s.runSimMonteCarlo);
  const runMonteCarlo = mode === "playground" ? runSimMc : runRealMc;
  const runRealStress = useAppStore((s) => s.runStressTestById);
  const runSimStress = useAppStore((s) => s.runSimStressTestById);
  const runStressTestById = mode === "playground" ? runSimStress : runRealStress;
  const realStress = useAppStore((s) => s.activeStressTest);
  const simStress = useAppStore((s) => s.simPlayground.activeStressTest);
  const activeStressTest = mode === "playground" ? simStress : realStress;
  const realResults = useAppStore((s) => s.stressTestResults);
  const simResults = useAppStore((s) => s.simPlayground.stressTestResults);
  const stressTestResults = mode === "playground" ? simResults : realResults;

  const handleRun = async () => {
    await runMonteCarlo();
    toast.success("Monte Carlo simulation complete", {
      description: "1,000 iterations across 3 scenarios.",
    });
  };

  const handleStressTest = (id: StressTestId) => {
    runStressTestById(id);
    const test = STRESS_TESTS.find((t) => t.id === id)!;
    const latest = useAppStore
      .getState()
      .stressTestResults.find((r) => r.testId === id);
    if (latest) {
      toast.info(`${test.label} stress test`, {
        description: latest.stillOnTrack
          ? "Your plan still holds under this scenario."
          : `Projected shortfall: ${formatCurrencyValue(latest.shortfall, currency)}`,
      });
    }
  };

  const activeResult = activeStressTest
    ? stressTestResults.find((r) => r.testId === activeStressTest)
    : null;

  const retirementTarget = kpis.currentNetWorth * 25;
  const assumptionsStale =
    !monteCarlo.hasRun && monteCarlo.lastRunAt !== null;

  return (
    <motion.section
      className="card-surface-accent p-5 sm:p-8"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      aria-label="Monte Carlo simulation and stress tests"
    >
      {/* ── Header ── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 mb-6">
        <div className="flex items-start gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-accent/15 border border-accent/25 shrink-0">
            <BarChart3 className="w-6 h-6 text-accent" size={24} />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-foreground">
              Monte Carlo Simulation
            </h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-lg">
              Probabilistic retirement outcomes across pessimistic, base, and
              optimistic scenarios — {monteCarlo.iterations.toLocaleString("en-US")}{" "}
              iterations each.
            </p>
            <p className="text-xs text-muted mt-1.5">
              Target: {formatCurrencyValue(retirementTarget, currency)} (25× annual
              income goal)
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRun}
          disabled={monteCarlo.isRunning}
          className="btn-primary text-base px-6 py-3 w-full lg:w-auto shrink-0"
        >
          {monteCarlo.isRunning ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" size={20} />
              Running simulation…
            </>
          ) : (
            <>
              <Play className="w-5 h-5" size={20} />
              Run Monte Carlo
              <kbd className="monte-kbd hidden sm:inline">M</kbd>
            </>
          )}
        </button>
      </div>

      {assumptionsStale && (
        <div className="stale-simulation-banner mb-5" role="status">
          <AlertTriangle className="w-4 h-4 text-warning shrink-0" size={16} />
          <p className="text-sm text-foreground">
            <span className="font-semibold">Assumptions changed</span>
            <span className="text-muted-foreground">
              {" "}
              — your KPIs were updated since the last run (
              {new Date(monteCarlo.lastRunAt!).toLocaleString("en-US", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
              ). Re-run to refresh probabilistic outcomes.
            </span>
          </p>
          <button
            type="button"
            onClick={handleRun}
            disabled={monteCarlo.isRunning}
            className="btn-primary !px-4 !py-2 text-sm shrink-0"
          >
            Re-run
          </button>
        </div>
      )}

      {/* ── 3 Scenario cards ── */}
      {!monteCarlo.hasRun && !monteCarlo.isRunning ? (
        <EmptyState
          icon={BarChart3}
          title="Ready to simulate your retirement"
          description="Model 1,000 probabilistic outcomes across pessimistic, base, and optimistic scenarios — based on your current assumptions."
          action={{
            label: "Run Monte Carlo",
            onClick: handleRun,
          }}
        />
      ) : monteCarlo.isRunning ? (
        <div className="scenario-grid">
          {(["pessimistic", "base", "optimistic"] as MonteCarloScenario[]).map(
            (s) => (
              <div
                key={s}
                className={`rounded-2xl border ${SCENARIO_BORDER[s]} p-5`}
              >
                <div className="skeleton h-5 w-24 rounded-full mb-4" />
                <div className="skeleton h-9 w-32 rounded mb-2" />
                <div className="skeleton h-3 w-20 rounded mb-4" />
                <div className="skeleton h-1.5 w-full rounded-full" />
              </div>
            )
          )}
        </div>
      ) : (
        <div className="scenario-grid">
          {monteCarlo.results.map((result, index) => (
            <motion.div
              key={result.scenario}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.12, duration: 0.35 }}
              className={`rounded-2xl border-2 ${SCENARIO_BORDER[result.scenario]} bg-surface p-5 sm:p-6`}
            >
              <span
                className={`scenario-badge ${SCENARIO_CLASS[result.scenario]}`}
              >
                {MONTE_CARLO_SCENARIO_LABELS[result.scenario]}
              </span>

              <p className="text-2xl sm:text-3xl font-bold text-foreground mt-4 tabular-nums">
                {formatCurrencyValue(result.medianValue, currency, true)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Median portfolio at age {kpis.retirementAge}
              </p>

              <SuccessBar rate={result.successRate} />

              <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    10th %ile
                  </p>
                  <p className="text-sm font-semibold text-foreground tabular-nums mt-0.5">
                    {formatCurrencyValue(result.percentile10, currency, true)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    90th %ile
                  </p>
                  <p className="text-sm font-semibold text-foreground tabular-nums mt-0.5">
                    {formatCurrencyValue(result.percentile90, currency, true)}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {(monteCarlo.distributions && monteCarlo.target != null) ||
      monteCarlo.isRunning ? (
        <div className="mt-6">
          <MonteCarloHistogram
            distributions={
              monteCarlo.distributions ?? {
                pessimistic: [],
                base: [],
                optimistic: [],
              }
            }
            target={monteCarlo.target ?? retirementTarget}
            currency={currency}
            retirementAge={kpis.retirementAge}
            isRunning={monteCarlo.isRunning}
          />
        </div>
      ) : null}

      {monteCarlo.lastRunAt && (
        <p className="text-[10px] text-muted text-right mt-3">
          Last run:{" "}
          {new Date(monteCarlo.lastRunAt).toLocaleString("en-US", {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </p>
      )}

      <hr className="divider my-6 sm:my-8" />

      {/* ── Stress Tests ── */}
      <div>
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle
            className="w-5 h-5 text-red-400 shrink-0 mt-0.5"
            size={20}
          />
          <div>
            <h4 className="text-base sm:text-lg font-bold text-foreground">
              Stress Tests
            </h4>
            <p className="text-sm text-muted-foreground mt-0.5">
              How does your plan hold up under adverse conditions?
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          {STRESS_TESTS.map((test, index) => {
            const isActive = activeStressTest === test.id;
            const result = stressTestResults.find((r) => r.testId === test.id);

            return (
              <motion.button
                key={test.id}
                type="button"
                onClick={() => handleStressTest(test.id)}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.06 }}
                className={`btn-stress !flex-col !items-start !h-auto !min-h-0 p-4 rounded-xl text-left w-full ${
                  isActive
                    ? "ring-2 ring-red-400/50 bg-red-500/15"
                    : "bg-red-500/5"
                }`}
              >
                <span className="font-semibold text-sm">{test.label}</span>
                <span className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed font-normal">
                  {test.description}
                </span>
                {result && (
                  <span
                    className={`text-[10px] font-semibold mt-2 flex items-center gap-1 ${
                      result.stillOnTrack ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {result.stillOnTrack ? (
                      <CheckCircle2 className="w-3 h-3" size={12} />
                    ) : (
                      <XCircle className="w-3 h-3" size={12} />
                    )}
                    {result.stillOnTrack ? "On track" : "At risk"}
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>

        <AnimatePresence>
          {activeResult && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className={`overflow-hidden rounded-xl border p-4 sm:p-5 ${
                activeResult.stillOnTrack
                  ? "border-green-500/30 bg-green-500/8"
                  : "border-red-500/30 bg-red-500/8"
              }`}
            >
              <div className="flex items-start gap-3">
                {activeResult.stillOnTrack ? (
                  <CheckCircle2
                    className="w-5 h-5 text-green-400 shrink-0"
                    size={20}
                  />
                ) : (
                  <XCircle
                    className="w-5 h-5 text-red-400 shrink-0"
                    size={20}
                  />
                )}
                <div className="text-sm">
                  {activeResult.stillOnTrack ? (
                    <>
                      <p className="font-semibold text-green-400">
                        Plan resilient under stress
                      </p>
                      <p className="text-muted-foreground mt-1">
                        Stressed projection:{" "}
                        <span className="text-foreground font-medium">
                          {formatCurrencyValue(
                            activeResult.stressedValue,
                            currency
                          )}
                        </span>{" "}
                        at retirement (original:{" "}
                        {formatCurrencyValue(
                          activeResult.originalValue,
                          currency
                        )}
                        ).
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-semibold text-red-400">
                        Plan at risk under this scenario
                      </p>
                      <p className="text-muted-foreground mt-1">
                        Projected shortfall of{" "}
                        <span className="text-foreground font-medium">
                          {formatCurrencyValue(
                            activeResult.shortfall,
                            currency
                          )}
                        </span>{" "}
                        vs. retirement target.
                      </p>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.section>
  );
}