"use client";

import Link from "next/link";
import { LandingHeroChart } from "@/components/landing/LandingHeroChart";
import { PublicNav } from "@/components/layout/PublicNav";
import { LocaleCurrencyControls } from "@/components/platform/LocaleCurrencyControls";
import { CALCULATOR_PATHS } from "@/lib/calculators/seo";
import { convertChartSeries } from "@/lib/calculators/chartSeries";
import { liveFxQuote } from "@/lib/fx/types";
import { useTranslation } from "@/lib/i18n/useTranslation";
import {
  LANDING_HORIZON_AGE,
  LANDING_SAMPLE_INPUT,
  LANDING_SAMPLE_SERIES,
  LANDING_WEALTH_AT_HORIZON,
  landingCalculatorHref,
} from "@/lib/landing/sampleProjection";
import { TERMS_PATH } from "@/lib/legal/terms";
import { PRIVACY_PATH } from "@/lib/privacy/local";
import { PLANS_PATH, SIGN_IN_PATH } from "@/lib/routes";
import { htmlLang } from "@/lib/i18n/htmlLang";
import { useAppStore } from "@/store/useAppStore";
import { convertAmount } from "@/lib/fx/convert";
import { formatCurrencyValue } from "@/types";

export function LandingView() {
  const { t, locale } = useTranslation();
  const currency = useAppStore((s) => s.currency);
  const fxSnapshot = useAppStore((s) => s.fxSnapshot);
  const quote = liveFxQuote(currency, fxSnapshot);
  const series = convertChartSeries(
    LANDING_SAMPLE_SERIES,
    "BRL",
    currency,
    quote.rates
  );
  const peakWealth = convertAmount(
    LANDING_WEALTH_AT_HORIZON,
    "BRL",
    currency,
    quote.rates
  );
  const unit = t(
    currency === "USD"
      ? "currency.unit.USD"
      : currency === "EUR"
        ? "currency.unit.EUR"
        : "currency.unit.BRL"
  );
  const ratePct = Math.round(LANDING_SAMPLE_INPUT.realReturn * 1000) / 10;
  const calculatorHref = landingCalculatorHref({
    ...LANDING_SAMPLE_INPUT,
    liquidWealth: convertAmount(
      LANDING_SAMPLE_INPUT.liquidWealth,
      "BRL",
      currency,
      quote.rates
    ),
    monthlyContribution: convertAmount(
      LANDING_SAMPLE_INPUT.monthlyContribution,
      "BRL",
      currency,
      quote.rates
    ),
    monthlySpending: convertAmount(
      LANDING_SAMPLE_INPUT.monthlySpending,
      "BRL",
      currency,
      quote.rates
    ),
  });

  return (
    <div className="landing-page">
      <header className="landing-header">
        <Link href="/" className="landing-brand">
          <span className="landing-brand-mark" aria-hidden="true">
            J
          </span>
          <span className="landing-brand-text">
            <strong>Jubilation</strong>
            <span>{t("landing.brand.tagline")}</span>
          </span>
        </Link>
        <PublicNav className="landing-nav" />
        <LocaleCurrencyControls className="landing-header-prefs" />
      </header>

      <main className="landing-hero">
        <div className="landing-copy">
          <p className="landing-kicker">{t("landing.kicker", { unit })}</p>
          <h1 className="landing-headline">{t("landing.headline")}</h1>
          <p className="landing-subhead">{t("landing.subhead")}</p>
          <div className="landing-cta-row">
            <div className="landing-cta-actions">
              <Link
                href={calculatorHref}
                className="btn-primary landing-cta-primary"
                data-landing-cta="personalizar"
              >
                {t("landing.cta.personalize")}
              </Link>
              <Link
                href={PLANS_PATH}
                className="btn-secondary landing-cta-plans"
                data-landing-cta="planos"
              >
                {t("landing.cta.plans")}
              </Link>
            </div>
            <Link
              href={SIGN_IN_PATH}
              className="landing-account-link"
              data-landing-cta="entrar"
            >
              <span>{t("landing.cta.haveAccount")}</span>
              <span aria-hidden="true">·</span>
              <span className="landing-account-link-action">
                {t("nav.signIn")}
              </span>
            </Link>
          </div>
        </div>

        <LandingHeroChart
          series={series}
          horizonAge={LANDING_HORIZON_AGE}
          peakWealth={peakWealth}
          currency={currency}
          locale={locale}
          kicker={t("landing.chart.kicker")}
          peakLabel={t("landing.chart.peak", {
            age: LANDING_HORIZON_AGE,
            amount: formatCurrencyValue(
              peakWealth,
              currency,
              true,
              htmlLang(locale)
            ),
          })}
          note={t("landing.chart.note", { unit, rate: ratePct })}
          ageLabel={(age) => t("landing.chart.tooltipAge", { age })}
        />
      </main>

      <footer className="landing-footer">
        <p>{t("landing.footer.tagline")}</p>
        <p className="landing-footer-links">
          <Link href={CALCULATOR_PATHS.index}>{t("landing.nav.calculators")}</Link>
          {" · "}
          <Link href={PLANS_PATH}>{t("nav.upgrade")}</Link>
          {" · "}
          <Link href={PRIVACY_PATH}>{t("footer.link.privacy")}</Link>
          {" · "}
          <Link href={TERMS_PATH}>{t("footer.link.terms")}</Link>
        </p>
      </footer>
    </div>
  );
}
