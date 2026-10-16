import type { Metadata } from "next";
import Link from "next/link";
import { LandingHeroChart } from "@/components/landing/LandingHeroChart";
import { CALCULATOR_PATHS, SITE_URL } from "@/lib/calculators/seo";
import {
  LANDING_HORIZON_AGE,
  LANDING_SAMPLE_SERIES,
  LANDING_WEALTH_AT_HORIZON,
  landingCalculatorHref,
} from "@/lib/landing/sampleProjection";
import { PRIVACY_PATH } from "@/lib/privacy/local";
import { DASHBOARD_PATH, PLANS_PATH } from "@/lib/routes";

const TITLE = "Simule sua liberdade";
const DESCRIPTION =
  "Clareza e escolha sobre o futuro: veja o patrimônio crescer e personalize o plano com o motor do Jubilation.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: SITE_URL,
    siteName: "Jubilation",
    title: `${TITLE} — Jubilation`,
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: `${TITLE} — Jubilation`,
    description: DESCRIPTION,
  },
};

export default function LandingPage() {
  const calculatorHref = landingCalculatorHref();

  return (
    <div className="landing-page">
      <header className="landing-header">
        <Link href="/" className="landing-brand">
          <span className="landing-brand-mark" aria-hidden="true">
            J
          </span>
          <span className="landing-brand-text">
            <strong>Jubilation</strong>
            <span>Simule sua liberdade</span>
          </span>
        </Link>
        <nav className="landing-nav" aria-label="Principal">
          <Link href={DASHBOARD_PATH} data-landing-nav="painel">
            Painel
          </Link>
          <Link href={CALCULATOR_PATHS.index} data-landing-nav="calculadoras">
            Calculadoras
          </Link>
          <Link href={PLANS_PATH} data-landing-nav="planos">
            Planos
          </Link>
        </nav>
      </header>

      <main className="landing-hero">
        <div className="landing-copy">
          <p className="landing-kicker">Planejamento em reais de hoje</p>
          <h1 className="landing-headline">{TITLE}</h1>
          <p className="landing-subhead">
            Clareza sobre o que você constrói, e a escolha de como chegar lá.
            Veja o patrimônio crescer — e personalize até o plano ser seu.
          </p>
          <div className="landing-cta-row">
            <Link
              href={calculatorHref}
              className="btn-primary"
              data-landing-cta="personalizar"
            >
              Personalizar o meu
            </Link>
            <Link
              href={PLANS_PATH}
              className="btn-secondary"
              data-landing-cta="planos"
            >
              Ver os planos
            </Link>
          </div>
        </div>

        <LandingHeroChart
          series={LANDING_SAMPLE_SERIES}
          horizonAge={LANDING_HORIZON_AGE}
          peakWealth={LANDING_WEALTH_AT_HORIZON}
        />
      </main>

      <footer className="landing-footer">
        <p>Jubilation · planejamento, não consultoria</p>
        <p className="landing-footer-links">
          <Link href={CALCULATOR_PATHS.index}>Calculadoras</Link>
          {" · "}
          <Link href={PLANS_PATH}>Planos</Link>
          {" · "}
          <Link href={PRIVACY_PATH}>O que é guardado</Link>
        </p>
      </footer>
    </div>
  );
}
