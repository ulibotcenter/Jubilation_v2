import type { Metadata } from "next";
import { LandingView } from "@/components/landing/LandingView";
import { SITE_URL } from "@/lib/calculators/seo";

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
  return <LandingView />;
}
