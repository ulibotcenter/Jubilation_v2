import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { HelpPageContent } from "@/components/help/HelpPageContent";

export const metadata: Metadata = {
  title: "Help",
  description: "Field glossary and guidance for Jubilation retirement planning.",
};

export default function HelpPage() {
  return (
    <AppShell>
      <HelpPageContent />
    </AppShell>
  );
}