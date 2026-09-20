"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Calendar, Target } from "lucide-react";
import { MilestoneTimeline } from "@/components/dashboard/MilestoneTimeline";
import { PersistentDisclaimer } from "@/components/legal/PersistentDisclaimer";
import { CinematicNumber } from "@/components/ui/CinematicNumber";
import { EditableNumber } from "@/components/ui/EditableNumber";
import { SpacedWords } from "@/components/ui/SpacedWords";
import { usePlanSolve } from "@/hooks/usePlanSolve";
import { analyzeIncomeGap } from "@/lib/incomeGoals";
import { htmlLang } from "@/lib/i18n/htmlLang";
import { heroRealTermsCopy } from "@/lib/i18n/heroRealTerms";
import type { MessageKey } from "@/lib/i18n/messages";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { fadeUp } from "@/lib/uiMotion";
import { useAppStore } from "@/store/useAppStore";
import {
  CURRENCY_SYMBOLS,
  formatCurrencyValue,
  type ProjectionYear,
} from "@/types";

const AGE_LEAD_THRESHOLD_YEARS = 20;

export function RetirementHero() {
  const { t, locale } = useTranslation();
  const reduced = useReducedMotion();
  const setKPI = useAppStore((s) => s.setKPI);
  const { kpis, currency, incomeSolve, dateSolve } = usePlanSolve("real");
  const currencySymbol = CURRENCY_SYMBOLS[currency];

  const yearsToRetirement = kpis.retirementAge - kpis.currentAge;
  const suggested = incomeSolve.feasible ? incomeSolve.value : 0;
  const suggestedLabel = incomeSolve.feasible
    ? formatCurrencyValue(suggested, currency, false, htmlLang(locale))
    : "";
  const suggestedParts = suggestedLabel.trim().split(/\s+/).filter(Boolean);
  const suggestedSymbol = suggestedParts[0] ?? "";
  const suggestedDigits = suggestedParts.slice(1).join(" ");
  const analysis = analyzeIncomeGap(suggested, kpis.desiredMonthlyIncome);
  const freedomAge = dateSolve.feasible ? Math.round(dateSolve.value) : null;
  const journeyProgress = Math.min(
    100,
    Math.max(
      0,
      ((kpis.currentAge - 18) / Math.max(1, kpis.retirementAge - 18)) * 100
    )
  );

  const leadWithAge =
    Boolean(freedomAge) && yearsToRetirement > AGE_LEAD_THRESHOLD_YEARS;

  const statusKey: MessageKey =
    kpis.desiredMonthlyIncome <= 0
      ? "income.status.setGoal"
      : analysis.gap < 0
        ? "income.status.ahead"
        : analysis.status === "on-track"
          ? "income.status.onTrack"
          : analysis.status === "behind"
            ? "income.status.behind"
            : "income.status.farBehind";

  const motionProps = fadeUp(reduced);

  return (
    <motion.section
      className="hero-card hero-card--cinematic mb-6 sm:mb-8"
      {...motionProps}
      aria-label={t("hero.aria")}
    >
      <div className="hero-cinematic">
        <SpacedWords
          as="h1"
          className="hero-kicker"
          text={leadWithAge ? t("income.solve.date") : t("income.solve.income")}
        />

        {leadWithAge && freedomAge != null ? (
          <p className="hero-number" aria-live="polite">
            <span className="hero-number-value tabular-nums">{freedomAge}</span>
            <span className="hero-number-unit">{t("hero.yearsUnit")}</span>
          </p>
        ) : incomeSolve.feasible ? (
          <p className="hero-number" aria-live="polite">
            <CinematicNumber
              value={suggested}
              currency={currency}
              locale={locale}
              className="hero-number-value"
            />
            <span className="hero-number-unit">{t("common.perMonth")}</span>
          </p>
        ) : (
          <p className="hero-number hero-number--empty" aria-live="polite">
            —
          </p>
        )}

        <SpacedWords
          as="p"
          id="hero-real-terms"
          className="hero-real-terms"
          text={
            incomeSolve.feasible
              ? heroRealTermsCopy(locale, currency)
              : t("income.solve.infeasible")
          }
        />

        <PersistentDisclaimer className="hero-disclaimer" />

        <div className="hero-support-row">
          {leadWithAge ? (
            <div className="hero-support-chip">
              <SpacedWords
                className="hero-support-label"
                text={t("income.solve.income")}
              />
              <span className="money-figure hero-support-value">
                {incomeSolve.feasible ? (
                  <>
                    <span className="money-figure-symbol">{suggestedSymbol}</span>
                    <span className="tabular-nums">{suggestedDigits}</span>
                  </>
                ) : (
                  "—"
                )}
                <span className="hero-support-unit">{t("common.perMonth")}</span>
              </span>
            </div>
          ) : (
            <div className="hero-support-chip">
              <Calendar className="w-3.5 h-3.5 text-accent" size={14} aria-hidden />
              <SpacedWords
                className="hero-support-label"
                text={t("income.solve.date")}
              />
              {freedomAge != null ? (
                <SpacedWords
                  className="hero-support-value"
                  text={t("income.solve.dateResult", { n: freedomAge })}
                />
              ) : (
                <span className="hero-support-value">
                  {t("income.solve.infeasible")}
                </span>
              )}
              {freedomAge != null && freedomAge !== kpis.retirementAge ? (
                <button
                  type="button"
                  className="hero-use-age"
                  onClick={() => setKPI("retirementAge", freedomAge)}
                  aria-label={t("hero.useAgeAria", { n: freedomAge })}
                >
                  <SpacedWords text={t("income.solve.useAge")} />
                </button>
              ) : null}
            </div>
          )}
        </div>

        <div className="hero-goal">
          <div className="hero-goal-edit">
            <Target className="w-3.5 h-3.5 text-muted-foreground" size={14} aria-hidden />
            <SpacedWords
              className="hero-support-label"
              text={t("income.yourGoal")}
            />
            <EditableNumber
              value={kpis.desiredMonthlyIncome}
              onChange={(v) => setKPI("desiredMonthlyIncome", v)}
              min={0}
              max={500_000}
              step={100}
              decimals={0}
              format="currency"
              currencySymbol={currencySymbol}
              compact={false}
              inputClassName="text-base sm:text-lg font-bold bg-transparent"
            />
            <span className="hero-support-unit">{t("common.perMonth")}</span>
          </div>
          {kpis.desiredMonthlyIncome > 0 && incomeSolve.feasible ? (
            <div className="hero-goal-meter">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <SpacedWords className="hero-goal-status" text={t(statusKey)} />
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  {t("income.progressOfGoal", { n: analysis.progressPct })}
                </span>
              </div>
              <div className="income-goal-bar-track">
                <motion.div
                  className="income-goal-bar-fill bg-accent"
                  initial={{ width: reduced ? `${Math.min(100, analysis.progressPct)}%` : 0 }}
                  animate={{ width: `${Math.min(100, analysis.progressPct)}%` }}
                  transition={reduced ? { duration: 0 } : { duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
                />
              </div>
              {analysis.gap > 0 ? (
                <p className="hero-goal-hint">
                  {t("income.shortfall", {
                    amount: formatCurrencyValue(analysis.gap, currency, false, htmlLang(locale)),
                  })}
                </p>
              ) : analysis.gap < 0 ? (
                <p className="hero-goal-hint hero-goal-hint--ok">
                  {t("income.surplus", {
                    amount: formatCurrencyValue(
                      Math.abs(analysis.gap),
                      currency,
                      false,
                      htmlLang(locale)
                    ),
                  })}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <MilestoneTimeline
        currentAge={kpis.currentAge}
        retirementAge={kpis.retirementAge}
        journeyProgress={journeyProgress}
      />
    </motion.section>
  );
}

export function useHeroProjectedValue() {
  const projections = useAppStore((s) => s.projections);
  const kpis = useAppStore((s) => s.kpis);
  return useMemo(
    () =>
      projections.find((p: ProjectionYear) => p.age === kpis.retirementAge)
        ?.portfolioValue ?? 0,
    [projections, kpis.retirementAge]
  );
}
