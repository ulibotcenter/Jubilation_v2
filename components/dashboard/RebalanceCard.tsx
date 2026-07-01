"use client";

import { useMemo } from "react";
import { PieChart } from "lucide-react";
import { suggestRebalance } from "@/lib/rebalance";
import { useAppStore } from "@/store/useAppStore";

export function RebalanceCard() {
  const portfolio = useAppStore((s) => s.portfolio);
  const suggestions = useMemo(() => suggestRebalance(portfolio), [portfolio]);

  if (suggestions.length === 0) return null;

  return (
    <div className="card-surface p-4">
      <div className="flex items-center gap-2 mb-2">
        <PieChart className="w-4 h-4 text-accent" size={16} />
        <h3 className="text-sm font-bold">Allocation nudges</h3>
      </div>
      <ul className="space-y-1.5 mt-2">
        {suggestions.slice(0, 4).map((s) => (
          <li key={s.assetClass} className="text-xs flex justify-between gap-2">
            <span className="text-muted-foreground">{s.label}</span>
            <span
              className={
                s.deltaPct > 0 ? "text-green-400" : "text-amber-400"
              }
            >
              {s.currentPct}% → {s.targetPct}% ({s.deltaPct > 0 ? "+" : ""}
              {s.deltaPct}%)
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}