"use client";

import { BookmarkPlus, FolderOpen } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { canAccess } from "@/lib/plans";
import { useAppStore } from "@/store/useAppStore";

export function ScenarioManager() {
  const { t } = useTranslation();
  const plan = useAppStore((s) => s.planTier);
  const scenarios = useAppStore((s) => s.savedScenarios);
  const saveScenario = useAppStore((s) => s.saveNamedScenario);
  const loadScenario = useAppStore((s) => s.loadNamedScenario);
  const undoSim = useAppStore((s) => s.undoSimPlayground);

  if (!canAccess(plan, "named_scenarios")) {
    return (
      <p className="text-xs text-muted-foreground">
        {t("simulation.scenarios.locked")}
      </p>
    );
  }

  return (
    <div className="scenario-manager">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-secondary text-xs gap-1"
          onClick={() => {
            const name = `Scenario ${scenarios.length + 1}`;
            saveScenario(name);
            toast.success(t("toast.scenarios.saved", { name }));
          }}
        >
          <BookmarkPlus className="w-3.5 h-3.5" size={14} />{" "}
          {t("simulation.scenarios.save")}
        </button>
        <button type="button" className="btn-secondary text-xs" onClick={undoSim}>
          {t("simulation.scenarios.undo")}
        </button>
      </div>
      {scenarios.length > 0 && (
        <ul className="mt-2 space-y-1">
          {scenarios.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                className="scenario-load-btn"
                onClick={() => {
                  loadScenario(s.id);
                  toast.info(t("toast.scenarios.loaded", { name: s.name }));
                }}
              >
                <FolderOpen className="w-3.5 h-3.5" size={14} />
                {s.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}