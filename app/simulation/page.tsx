import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { SimulationPlaygroundPage } from "@/components/simulation/SimulationPlaygroundPage";

export const metadata: Metadata = {
  title: "Simulation",
  description: "Sandbox playground to model retirement scenarios.",
};

export default function SimulationPage() {
  return (
    <AppShell>
      <SimulationPlaygroundPage />
    </AppShell>
  );
}