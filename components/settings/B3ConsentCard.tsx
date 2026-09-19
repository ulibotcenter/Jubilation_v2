"use client";

import { Landmark } from "lucide-react";
import { toast } from "sonner";
import { canCollect, isConnectorEnabled } from "@/lib/connectors";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useAppStore } from "@/store/useAppStore";

export function B3ConsentCard() {
  const { t } = useTranslation();
  const consents = useAppStore((s) => s.consents);
  const revoke = useAppStore((s) => s.revokeB3Consent);
  const exportLog = useAppStore((s) => s.exportConsentLog);
  const sync = useAppStore((s) => s.connectorSync.b3);

  if (!isConnectorEnabled("b3")) return null;

  const consent = consents.find((c) => c.provider === "b3");
  const active = canCollect(consent);

  const handleExport = () => {
    const json = exportLog();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "jubilation-consents.json";
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t("toast.b3.exported"));
  };

  return (
    <section className="settings-page-card">
      <div className="settings-page-card-head">
        <Landmark className="w-4 h-4 text-accent" size={16} />
        <h2>{t("settings.b3.title")}</h2>
      </div>
      <p className="settings-page-card-body">{t("settings.b3.body")}</p>
      <p className="text-sm mt-3">
        {active
          ? t("settings.b3.active")
          : consent?.revokedAt
            ? t("settings.b3.revoked")
            : t("settings.b3.none")}
      </p>
      {sync?.asOf && (
        <p className="text-[11px] text-muted-foreground mt-1 tabular-nums">
          {t("portfolio.b3.asOf", { date: sync.asOf })}
          {sync.mode === "fixture" ? ` · ${t("portfolio.b3.fixture")}` : ""}
        </p>
      )}
      <div className="flex flex-wrap gap-2 mt-4">
        {active && (
          <button
            type="button"
            className="btn-secondary text-xs"
            onClick={() => {
              revoke();
              toast.success(t("toast.b3.revoked"));
            }}
          >
            {t("portfolio.b3.revoke")}
          </button>
        )}
        <button
          type="button"
          className="btn-ghost text-xs"
          onClick={handleExport}
        >
          {t("settings.b3.export")}
        </button>
      </div>
    </section>
  );
}
