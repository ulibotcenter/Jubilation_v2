import type { Metadata } from "next";

export const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://jubilation-v2.vercel.app";

export const PUBLIC_CALCULATOR_AS_OF = "2026-01-01";

export const CALCULATOR_PATHS = {
  index: "/calculadoras",
  freedomDate: "/calculadoras/quando-fico-livre",
  retirementIncome: "/calculadoras/quanto-vou-receber",
  inss: "/calculadoras/simulador-inss",
} as const;

export type CalculatorPathId = keyof typeof CALCULATOR_PATHS;

export interface CalculatorPageSeo {
  path: string;
  title: string;
  description: string;
  /** Open Graph title; falls back to title when omitted. */
  ogTitle?: string;
}

export const CALCULATOR_SEO: Record<CalculatorPathId, CalculatorPageSeo> = {
  index: {
    path: CALCULATOR_PATHS.index,
    title: "Calculadoras de independência financeira e INSS",
    description:
      "Ferramentas grátis, sem cadastro: quando você fica livre, quanto consegue receber por mês, e uma simulação educativa das regras de transição do INSS em 2026.",
  },
  freedomDate: {
    path: CALCULATOR_PATHS.freedomDate,
    title: "Quando fico livre?",
    description:
      "Você informa o quanto já tem e o quanto consegue guardar por mês. O motor calcula a idade em que o dinheiro passa a cobrir o seu custo de vida — independência financeira, em reais de hoje.",
    ogTitle: "Quando fico livre? Calculadora de independência financeira",
  },
  retirementIncome: {
    path: CALCULATOR_PATHS.retirementIncome,
    title: "Quanto vou receber?",
    description:
      "Você escolhe a data de parar de trabalhar. O motor calcula a renda mensal sustentável até a idade-alvo, em reais de hoje, com as premissas à vista.",
    ogTitle: "Quanto vou receber? Renda mensal na aposentadoria",
  },
  inss: {
    path: CALCULATOR_PATHS.inss,
    title: "Simulador INSS 2026 (educativo)",
    description:
      "Idade, carência e regras de transição em linguagem leiga. Não é o Meu INSS, não consulta a base do governo e não pede senha do gov.br.",
    ogTitle: "Simulação educativa de INSS — regras de 2026",
  },
};

export function calculatorMetadata(id: CalculatorPathId): Metadata {
  const page = CALCULATOR_SEO[id];
  const url = new URL(page.path, SITE_URL).toString();
  const ogTitle = page.ogTitle ?? page.title;
  const ogImage = {
    url: "/calculadoras/opengraph-image",
    width: 1200,
    height: 630,
    alt: "Calculadoras públicas Jubilation — independência financeira e simulação educativa de INSS",
  };
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: page.path },
    keywords: [
      "independência financeira",
      "calculadora de aposentadoria",
      "simulador INSS",
      "regras de transição",
    ],
    robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
    openGraph: {
      type: "website",
      locale: "pt_BR",
      url,
      siteName: "Jubilation",
      title: ogTitle,
      description: page.description,
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: page.description,
      images: [ogImage.url],
    },
  };
}

export const PUBLIC_SITEMAP_PATHS: readonly string[] = [
  "/",
  "/privacy",
  CALCULATOR_PATHS.index,
  CALCULATOR_PATHS.freedomDate,
  CALCULATOR_PATHS.retirementIncome,
  CALCULATOR_PATHS.inss,
];
