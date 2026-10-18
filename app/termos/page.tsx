import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { TermsPageContent } from "@/components/legal/TermsPageContent";
import { TERMS_PAGE_DESCRIPTION, TERMS_PAGE_TITLE } from "@/lib/legal/terms";

export const metadata: Metadata = {
  title: TERMS_PAGE_TITLE,
  description: TERMS_PAGE_DESCRIPTION,
};

export default function TermsPage() {
  return (
    <AppShell>
      <TermsPageContent />
    </AppShell>
  );
}
