import type { Metadata } from "next";
import { LandingView } from "@/components/landing/LandingView";
import { SITE_URL } from "@/lib/calculators/seo";

const TITLE = "Simule sua liberdade";
const DESCRIPTION =
  "Clareza para ver o futuro, e a escolha de como chegar lá. O patrimônio cresce na sua frente — ajuste até o plano ser seu.";

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
  return <LandingView />;
}
