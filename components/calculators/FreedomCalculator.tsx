"use client";

import { useMemo, useState } from "react";
import { AppCta, DisclaimerBlock } from "@/components/calculators/AppCta";
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
import { parseFreedomInput } from "@/lib/calculators/parse";
import { htmlLang } from "@/lib/i18n/htmlLang";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useAppStore } from "@/store/useAppStore";
import {
  CURRENCY_SYMBOLS,
  formatCurrencyValue,
  type Currency,
} from "@/types";
import type { PublicIndependenceInput } from "@/lib/calculators/independence";

type Draft = {
  idade: number;
  reserva: number;
  aporte: number;
  gasto: number;
  alvo: number;
  juro: number;
  saque: number;
};

function draftFromInput(input: PublicIndependenceInput): Draft {
  return {
    idade: input.currentAge,
    reserva: input.liquidWealth,
    aporte: input.monthlyContribution,
    gasto: input.monthlySpending,
    alvo: input.lifeExpectancy,
    juro: Math.round(input.realReturn * 1000) / 10,
    saque: Math.round(input.withdrawalRealReturn * 1000) / 10,
  };
}

function inputFromDraft(draft: Draft): PublicIndependenceInput {
  return parseFreedomInput({
    idade: String(draft.idade),
    reserva: String(draft.reserva),
    aporte: String(draft.aporte),
    gasto: String(draft.gasto),
    alvo: String(draft.alvo),
    juro: String(draft.juro),
    saque: String(draft.saque),
  });
}

function money(value: number, currency: Currency, locale: string) {
  return formatCurrencyValue(value, currency, false, locale);
}

export function FreedomCalculator({
  initial,
}: {
  initial: PublicIndependenceInput;
}) {
  const { t, locale } = useTranslation();
  const currency = useAppStore((s) => s.currency);
  const [draft, setDraft] = useState<Draft>(() => draftFromInput(initial));
  const input = useMemo(() => inputFromDraft(draft), [draft]);
  const { series, result, freedomAge } = useMemo(
    () => freedomChartSeries(input),
    [input]
  );
  const data = useMemo(() => toProjectionChartData(series), [series]);
  const intlLocale = htmlLang(locale);
  const symbol = CURRENCY_SYMBOLS[currency];
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

      <CalculatorForm submitLabel={t("calc.freedom.submit")}>
        <NumberField
          name="idade"
          label={t("calc.freedom.age")}
          value={draft.idade}
          onValueChange={(value) => patch("idade", value)}
          min={18}
          max={80}
          hint={t("calc.freedom.ageHint")}
        />
        <NumberField
          name="reserva"
          label={t("calc.freedom.wealth")}
          value={draft.reserva}
          onValueChange={(value) => patch("reserva", value)}
          min={0}
          max={50_000_000}
          step={1000}
          suffix={symbol}
          hint={t("calc.freedom.wealthHint")}
        />
        <NumberField
          name="aporte"
          label={t("calc.freedom.contribution")}
          value={draft.aporte}
          onValueChange={(value) => patch("aporte", value)}
          min={0}
          max={500_000}
          step={50}
          suffix={symbol}
          hint={t("calc.freedom.contributionHint")}
        />
        <NumberField
          name="gasto"
          label={t("calc.freedom.spend")}
          value={draft.gasto}
          onValueChange={(value) => patch("gasto", value)}
          min={100}
          max={500_000}
          step={100}
          suffix={symbol}
          hint={t("calc.freedom.spendHint")}
        />
        <NumberField
          name="alvo"
          label={t("calc.freedom.horizon")}
          value={draft.alvo}
          onValueChange={(value) => patch("alvo", value)}
          min={55}
          max={120}
          hint={t("calc.freedom.horizonHint")}
        />
        <NumberField
          name="juro"
          label={t("calc.freedom.rate")}
          value={draft.juro}
          onValueChange={(value) => patch("juro", value)}
          min={-5}
          max={12}
          step={0.1}
          suffix="%"
          hint={t("calc.freedom.rateHint")}
        />
        <NumberField
          name="saque"
          label={t("calc.freedom.withdrawRate")}
          value={draft.saque}
          onValueChange={(value) => patch("saque", value)}
          min={-5}
          max={12}
          step={0.1}
          suffix="%"
          hint={t("calc.freedom.withdrawRateHint")}
          className="public-field--emphasis"
        />
      </CalculatorForm>

      <ProjectionChart
        data={data}
        currency={symbol}
        currencyCode={currency}
        freedomAge={freedomAge}
      />

      <FreedomSliders
        wealth={draft.reserva}
        contribution={draft.aporte}
        currentAge={draft.idade}
        horizon={draft.alvo}
        withdrawRate={draft.saque}
        onWealth={(value) => patch("reserva", value)}
        onContribution={(value) => patch("aporte", value)}
        onHorizon={(value) => patch("alvo", value)}
        onWithdrawRate={(value) => patch("saque", value)}
        currency={currency}
        locale={intlLocale}
      />

      <section className="public-result card-surface" aria-live="polite">
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
