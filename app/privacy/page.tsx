import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { PrivacyPageContent } from "@/components/privacy/PrivacyPageContent";
import {
  PRIVACY_POLICY_DESCRIPTION,
  PRIVACY_POLICY_TITLE,
} from "@/lib/legal/policy";

export const metadata: Metadata = {
  title: PRIVACY_POLICY_TITLE,
  description: PRIVACY_POLICY_DESCRIPTION,
};

export default function PrivacyPage() {
  return (
    <AppShell>
      <PrivacyPageContent />
    </AppShell>
  );
}
