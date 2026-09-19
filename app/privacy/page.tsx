import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { PrivacyPageContent } from "@/components/privacy/PrivacyPageContent";

export const metadata: Metadata = {
  title: "Privacidade",
  description:
    "O que o Jubilation guarda neste aparelho, o que não entra, e como apagar.",
};

export default function PrivacyPage() {
  return (
    <AppShell>
      <PrivacyPageContent />
    </AppShell>
  );
}
