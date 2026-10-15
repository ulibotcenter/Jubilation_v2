import { AppShell } from "@/components/layout/AppShell";
import { PlannerGate } from "@/components/plans/PlannerGate";
import { CashFlowPageContent } from "@/components/cashflow/CashFlowPageContent";

export default function CashFlowPage() {
  return (
    <AppShell>
      <PlannerGate>
        <CashFlowPageContent />
      </PlannerGate>
    </AppShell>
  );
}