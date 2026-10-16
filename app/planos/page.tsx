import { headers } from "next/headers";
import { AppShell } from "@/components/layout/AppShell";
import { UpgradePageContent } from "@/components/upgrade/UpgradePageContent";
import { currencyFromRequestHeaders } from "@/lib/billing/geo";

export const dynamic = "force-dynamic";
export const preferredRegion = "fra1";

export default async function PlanosPage() {
  const geoCurrency = currencyFromRequestHeaders(await headers());
  return (
    <AppShell>
      <UpgradePageContent geoCurrency={geoCurrency} />
    </AppShell>
  );
}
