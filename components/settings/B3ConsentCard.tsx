"use client";

import { useEffect, useState } from "react";
import { Landmark, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { canCollect, isConnectorEnabled } from "@/lib/connectors";
import type { PublicB3Status } from "@/lib/connectors/flags";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useAppStore } from "@/store/useAppStore";

export function B3ConsentCard() {
  const { t } = useTranslation();
  const consents = useAppStore((s) => s.consents);
  const revoke = useAppStore((s) => s.revokeB3Consent);
  const exportLog = useAppStore((s) => s.exportConsentLog);
  const sync = useAppStore((s) => s.connectorSync.b3);
  const [status, setStatus] = useState<PublicB3Status | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/connectors/b3/status");
        const json = (await res.json()) as PublicB3Status;
        if (!cancelled) setStatus(json);
      } catch {
        if (!cancelled) {
          setStatus({
            enabled: true,
            live: false,
            mode: "fixture",
            reason: "missing_env",
            openFinance: false,
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!isConnectorEnabled("b3")) return null;

  const consent = consents.find((c) => c.provider === "b3");
  const active = canCollect(consent);
  const reason = status?.reason;
  const live = Boolean(status?.live);

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

  const modeLabel =
    sync?.mode === "live"
      ? t("portfolio.b3.live")
      : sync?.mode === "sandbox"
        ? t("portfolio.b3.sandbox")
        : t("portfolio.b3.fixture");

  return (
    <section className="settings-page-card">
      <div className="settings-page-card-head">
        <Landmark className="w-4 h-4 text-accent" size={16} />
        <h2>{t("settings.b3.title")}</h2>
      </div>
      <p className="settings-page-card-body">{t("settings.b3.body")}</p>

      {status === null && (
        <p className="text-sm text-muted-foreground mt-3 flex items-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" size={14} />
          {t("settings.b3.checking")}
        </p>
      )}

      {status && !live && reason === "disabled" && (
        <div className="mt-3 space-y-2">
          <p className="settings-soon-badge">{t("settings.b3.disabledBadge")}</p>
          <h3 className="font-bold text-sm">{t("settings.b3.disabledTitle")}</h3>
          <p className="text-sm text-muted-foreground">
            {t("settings.b3.disabledBody")}
          </p>
        </div>
      )}

      {status && !live && reason === "missing_env" && (
        <div className="mt-3 space-y-2">
          <p className="settings-soon-badge">{t("settings.b3.unavailableBadge")}</p>
          <h3 className="font-bold text-sm">{t("settings.b3.unavailableTitle")}</h3>
          <p className="text-sm text-muted-foreground">
            {t("settings.b3.unavailableBody")}
          </p>
        </div>
      )}

      {status && !live && reason === "sandbox_only" && (
        <div className="mt-3 space-y-2">
          <p className="settings-soon-badge">{t("settings.b3.sandboxBadge")}</p>
          <h3 className="font-bold text-sm">{t("settings.b3.sandboxTitle")}</h3>
          <p className="text-sm text-muted-foreground">
            {t("settings.b3.sandboxBody")}
          </p>
        </div>
      )}

      {status && live && (
        <div className="mt-3 space-y-2">
          <p className="settings-soon-badge">{t("settings.b3.liveBadge")}</p>
          <h3 className="font-bold text-sm">{t("settings.b3.liveTitle")}</h3>
          <p className="text-sm text-muted-foreground">{t("settings.b3.liveBody")}</p>
        </div>
      )}

      <p className="text-sm mt-3">
        {active
          ? t("settings.b3.active")
          : consent?.revokedAt
            ? t("settings.b3.revoked")
            : t("settings.b3.none")}
      </p>
      <p className="text-[11px] text-muted-foreground mt-1">
        {t("settings.b3.officialRevoke")}{" "}
        <a
          href="https://www.investidor.b3.com.br/"
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          investidor.b3.com.br
        </a>
      </p>
      {sync?.asOf && (
        <p className="text-[11px] text-muted-foreground mt-1 tabular-nums">
          {t("portfolio.b3.asOf", { date: sync.asOf })}
          {` · ${modeLabel}`}
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
