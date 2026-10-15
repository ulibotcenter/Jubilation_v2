import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { PlannerGate } from "@/components/plans/PlannerGate";
import { SimulationPlaygroundPage } from "@/components/simulation/SimulationPlaygroundPage";

export const metadata: Metadata = {
  title: "Simulation",
  description: "Sandbox playground to model retirement scenarios.",
};

export default function SimulationPage() {
  return (
    <AppShell>
      <PlannerGate>
        <SimulationPlaygroundPage />
      </PlannerGate>
    </AppShell>
  );
}