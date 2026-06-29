import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { SettingsPageContent } from "@/components/settings/SettingsPageContent";

export const metadata: Metadata = {
  title: "Settings",
  description: "Currency, account, and export preferences for your Jubilation plan.",
};

export default function SettingsPage() {
  return (
    <AppShell>
      <SettingsPageContent />
    </AppShell>
  );
}