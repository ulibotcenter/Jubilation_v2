"use client";

import { useMemo, useRef, useState } from "react";
import { AppCta, DisclaimerBlock } from "@/components/calculators/AppCta";
import { FreedomNextCta } from "@/components/calculators/FreedomNextCta";
import {
  CalculatorForm,
  NumberField,
} from "@/components/calculators/CalculatorForm";
import { RelatedCalculators } from "@/components/calculators/RelatedCalculators";
import { FreedomSliders } from "@/components/calculators/FreedomSliders";
import { ProjectionChart } from "@/components/ProjectionChart";
import {
  freedomChartSeries,
  toProjectionChartData,
} from "@/lib/calculators/chartSeries";
import { PUBLIC_ENGINE_NOTE } from "@/lib/calculators/copy";
import {
  shareRealReturn,
  type PublicIndependenceInput,
} from "@/lib/calculators/independence";
import { parseFreedomInput } from "@/lib/calculators/parse";
import { ASSUMPTIONS } from "@/lib/engine/assumptions";
import { htmlLang } from "@/lib/i18n/htmlLang";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useAppStore } from "@/store/useAppStore";
import {
  CURRENCY_SYMBOLS,
  formatCurrencyValue,
  type Currency,
} from "@/types";

type Draft = {
  idade: number;
  reserva: number;
  aporte: number;
  gasto: number;
  alvo: number;
  juro: number;
  inflacao: number;
};

function draftFromInput(
  input: PublicIndependenceInput,
  inflationPercent: number
): Draft {
  return {
    idade: input.currentAge,
    reserva: input.liquidWealth,
    aporte: input.monthlyContribution,
    gasto: input.monthlySpending,
    alvo: input.lifeExpectancy,
    juro: Math.round(input.realReturn * 1000) / 10,
    inflacao: inflationPercent,
  };
}

function inputFromDraft(draft: Omit<Draft, "inflacao">): PublicIndependenceInput {
  return shareRealReturn(
    parseFreedomInput({
      idade: String(draft.idade),
      reserva: String(draft.reserva),
      aporte: String(draft.aporte),
      gasto: String(draft.gasto),
      alvo: String(draft.alvo),
      juro: String(draft.juro),
    })
  );
}

function money(value: number, currency: Currency, locale: string) {
  return formatCurrencyValue(value, currency, false, locale);
}

export function FreedomCalculator({
  initial,
  inflationPercent = ASSUMPTIONS.inflation.defaultValue,
  asked = false,
}: {
  initial: PublicIndependenceInput;
  inflationPercent?: number;
  asked?: boolean;
}) {
  const { t, locale } = useTranslation();
  const currency = useAppStore((s) => s.currency);
  const resultRef = useRef<HTMLElement>(null);
  const [showNext, setShowNext] = useState(asked);
  const [draft, setDraft] = useState<Draft>(() =>
    draftFromInput(initial, inflationPercent)
  );
  const input = useMemo(
    () =>
      inputFromDraft({
        idade: draft.idade,
        reserva: draft.reserva,
        aporte: draft.aporte,
        gasto: draft.gasto,
        alvo: draft.alvo,
        juro: draft.juro,
      }),
    [draft.idade, draft.reserva, draft.aporte, draft.gasto, draft.alvo, draft.juro]
  );
  const { series, result, freedomAge } = useMemo(
    () => freedomChartSeries(input),
    [input]
  );
  const data = useMemo(() => toProjectionChartData(series), [series]);
  const intlLocale = htmlLang(locale);
  const symbol = CURRENCY_SYMBOLS[currency];
  const matchSuffixes = [symbol, "%"];
  const yearsOut = result.feasible
    ? Math.max(0, Math.round(result.value) - input.currentAge)
    : null;

  const patch = (field: keyof Draft, value: number) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  return (
    <article className="public-article">
      <p className="public-kicker">{t("calc.freedom.kicker")}</p>
      <h1>{t("calc.freedom.title")}</h1>
      <p className="public-lead">{t("calc.freedom.lead")}</p>

      <CalculatorForm
        className="public-form--freedom"
        submitLabel={t("calc.freedom.submit")}
        onSubmit={() => {
          setShowNext(true);
          resultRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }}
      >
        <NumberField
          name="idade"
          label={t("calc.freedom.age")}
          value={draft.idade}
          onValueChange={(value) => patch("idade", value)}
          min={18}
          max={80}
          matchSuffixes={matchSuffixes}
          hint={t("calc.freedom.ageHint")}
        />
        <NumberField
          name="reserva"
          label={t("calc.freedom.wealth")}
          value={draft.reserva}
          onValueChange={(value) => patch("reserva", value)}
          min={0}
          max={50_000_000}
          suffix={symbol}
          matchSuffixes={matchSuffixes}
          hint={t("calc.freedom.wealthHint")}
        />
        <NumberField
          name="aporte"
          label={t("calc.freedom.contribution")}
          value={draft.aporte}
          onValueChange={(value) => patch("aporte", value)}
          min={0}
          max={500_000}
          suffix={symbol}
          matchSuffixes={matchSuffixes}
          hint={t("calc.freedom.contributionHint")}
        />
        <NumberField
          name="alvo"
          label={t("calc.freedom.horizon")}
          value={draft.alvo}
          onValueChange={(value) => patch("alvo", value)}
          min={55}
          max={120}
          matchSuffixes={matchSuffixes}
          hint={t("calc.freedom.horizonHint")}
        />
        <NumberField
          name="juro"
          label={t("calc.freedom.rate")}
          value={draft.juro}
          onValueChange={(value) => patch("juro", value)}
          min={-5}
          max={12}
          suffix="%"
          matchSuffixes={matchSuffixes}
          hint={t("calc.freedom.rateHint")}
        />
        <NumberField
          name="inflacao"
          label={t("calc.freedom.inflation")}
          value={draft.inflacao}
          onValueChange={(value) => patch("inflacao", value)}
          min={ASSUMPTIONS.inflation.min}
          max={ASSUMPTIONS.inflation.max}
          suffix="%"
          matchSuffixes={matchSuffixes}
          hint={t("calc.freedom.inflationHint")}
        />
        <NumberField
          name="gasto"
          className="public-field--emphasis"
          label={t("calc.freedom.spend")}
          value={draft.gasto}
          onValueChange={(value) => patch("gasto", value)}
          min={100}
          max={500_000}
          suffix={symbol}
          hint={t("calc.freedom.spendHint")}
        />
      </CalculatorForm>

      <ProjectionChart
        data={data}
        currency={symbol}
        currencyCode={currency}
        freedomAge={freedomAge}
      >
        <FreedomSliders
          wealth={draft.reserva}
          contribution={draft.aporte}
          currentAge={draft.idade}
          horizon={draft.alvo}
          spend={draft.gasto}
          onWealth={(value) => patch("reserva", value)}
          onContribution={(value) => patch("aporte", value)}
          onHorizon={(value) => patch("alvo", value)}
          onSpend={(value) => patch("gasto", value)}
          currency={currency}
          locale={intlLocale}
        />
      </ProjectionChart>

      <section
        ref={resultRef}
        id="quando-fico-livre-resultado"
        className="public-result card-surface"
        aria-live="polite"
      >
        {result.feasible ? (
          <>
            <p className="public-result-label">{t("calc.freedom.resultLabel")}</p>
            <p className="public-result-hero">
              {t("calc.freedom.resultAge", {
                n: Math.round(result.value * 10) / 10,
              })}
            </p>
            <p>
              {yearsOut === 0
                ? t("calc.freedom.resultNow")
                : t("calc.freedom.resultYears", {
                    n: yearsOut ?? 0,
                    years:
                      yearsOut === 1
                        ? t("calc.freedom.yearOne")
                        : t("calc.freedom.yearMany"),
                    contribution: money(
                      input.monthlyContribution,
                      currency,
                      intlLocale
                    ),
                    wealth: money(input.liquidWealth, currency, intlLocale),
                    spend: money(input.monthlySpending, currency, intlLocale),
                  })}
            </p>
          </>
        ) : (
          <>
            <p className="public-result-label">
              {t("calc.freedom.resultFailLabel")}
            </p>
            <p className="public-result-hero public-result-hero--muted">—</p>
            <p>
              {t("calc.freedom.resultFailBody", {
                spend: money(input.monthlySpending, currency, intlLocale),
                age: input.lifeExpectancy,
              })}
            </p>
          </>
        )}
        <p className="public-result-meta">{PUBLIC_ENGINE_NOTE}</p>
      </section>

      {showNext ? (
        <FreedomNextCta
          input={input}
          inflationPercent={draft.inflacao}
          freedomAge={result.feasible ? freedomAge : null}
        />
      ) : null}

      <section className="public-prose">
        <h2>{t("calc.freedom.whatTitle")}</h2>
        <p>{t("calc.freedom.whatBody1")}</p>
        <p>{t("calc.freedom.whatBody2")}</p>
      </section>

      <DisclaimerBlock variant="short" />
      <AppCta
        extra={t("calc.freedom.appCta")}
        title={t("calc.freedom.appTitle")}
        primaryLabel={t("calc.freedom.appPrimary")}
        secondaryLabel={t("calc.freedom.appSecondary")}
        ariaLabel={t("calc.freedom.appAria")}
      />
      <RelatedCalculators current="freedomDate" />
    </article>
  );
}
