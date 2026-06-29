import type { FxSnapshot } from "@/lib/fx/types";

export async function fetchFxRates(): Promise<FxSnapshot> {
  const res = await fetch("/api/fx/rates");
  if (!res.ok) throw new Error("Failed to fetch exchange rates");
  const data = (await res.json()) as { snapshot: FxSnapshot };
  return data.snapshot;
}