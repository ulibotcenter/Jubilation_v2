"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Landmark, Loader2, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { canCollect, ConsentRequiredError, isConnectorEnabled } from "@/lib/connectors";
import { B3_CONSENT_EVIDENCE_PT } from "@/lib/connectors/consent";
import type { PublicB3Status } from "@/lib/connectors/flags";
import { formatCurrencyValue } from "@/types";
import { useAppStore } from "@/store/useAppStore";

export function ConnectB3Button() {
  const { t, locale } = useTranslation();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [status, setStatus] = useState<PublicB3Status | null>(null);
  const consents = useAppStore((s) => s.consents);
  const grant = useAppStore((s) => s.grantB3Consent);
  const syncB3 = useAppStore((s) => s.syncB3);
  const isSyncing = useAppStore((s) => s.isSyncingB3);
  const sync = useAppStore((s) => s.connectorSync.b3);
  const currency = useAppStore((s) => s.currency);
  const portfolio = useAppStore((s) => s.portfolio);

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
  const authorised = canCollect(consent);
  const imported = portfolio.filter((a) => a.source === "B3_API");
  const importedValue = imported.reduce(
    (sum, a) => sum + a.quantity * a.currentPrice,
    0
  );

  const runSync = async () => {
    try {
      if (!authorised) grant();
      const result = await syncB3();
      toast.success(
        result.mode === "live"
          ? t("toast.b3.liveSynced")
          : result.mode === "fixture"
            ? t("toast.b3.fixtureSynced")
            : t("toast.b3.synced"),
        {
          description: result.asOf
            ? t("portfolio.b3.asOf", { date: result.asOf })
            : undefined,
        }
      );
    } catch (err) {
      if (err instanceof ConsentRequiredError) {
        toast.error(t("toast.b3.consentRequired"));
        return;
      }
      toast.error(t("toast.b3.error"));
    }
  };

  const handleClick = () => {
    if (authorised) {
      void runSync();
      return;
    }
    setConfirmOpen(true);
  };

  const freshnessLabel = sync?.asOf
    ? sync.staleness === "stale"
      ? t("portfolio.b3.stale", { date: sync.asOf })
      : t("portfolio.b3.asOf", { date: sync.asOf })
    : null;

  return (
    <>
      <div className="flex flex-col items-stretch sm:items-end gap-1">
        <button
          type="button"
          className="btn-secondary"
          onClick={handleClick}
          disabled={isSyncing}
        >
          {isSyncing ? (
            <Loader2 className="w-4 h-4 animate-spin" size={16} />
          ) : authorised ? (
            <RefreshCw className="w-4 h-4" size={16} />
          ) : (
            <Landmark className="w-4 h-4" size={16} />
          )}
          {isSyncing
            ? t("portfolio.b3.syncing")
            : authorised
              ? t("portfolio.syncB3")
              : t("portfolio.connectB3")}
        </button>
        {status && !status.live ? (
          <p className="text-[10px] text-muted-foreground max-w-[16rem] sm:text-right leading-snug">
            {status.reason === "sandbox_only"
              ? t("portfolio.b3.sandboxOnly")
              : t("portfolio.b3.notLive")}
          </p>
        ) : null}
        {freshnessLabel ? (
          <p className="text-[10px] text-muted-foreground tabular-nums">
            {freshnessLabel}
            {sync?.mode === "live"
              ? ` · ${t("portfolio.b3.live")}`
              : sync?.mode === "sandbox"
                ? ` · ${t("portfolio.b3.sandbox")}`
                : ` · ${t("portfolio.b3.fixture")}`}
            {sync?.partial ? ` · ${t("portfolio.b3.partial")}` : ""}
            {imported.length > 0
              ? ` · ${formatCurrencyValue(importedValue, currency, true, locale === "pt" ? "pt-BR" : undefined)}`
              : ""}
          </p>
        ) : null}
      </div>

      <AnimatePresence>
        {confirmOpen && (
          <div className="add-asset-modal-root">
            <motion.div
              className="add-asset-modal-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmOpen(false)}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="b3-consent-title"
              className="add-asset-modal max-w-md"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
            >
              <div className="add-asset-modal-header">
                <h2 id="b3-consent-title" className="text-base font-semibold">
                  {t("portfolio.b3.consentTitle")}
                </h2>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setConfirmOpen(false)}
                  aria-label={t("common.close")}
                >
                  <X className="w-4 h-4" size={16} />
                </button>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed px-5 pb-3">
                {B3_CONSENT_EVIDENCE_PT}
              </p>
              <p className="text-[11px] text-muted px-5 pb-4">
                {t("portfolio.b3.noAdvice")}
              </p>
              <div className="flex justify-end gap-2 px-5 pb-5">
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setConfirmOpen(false)}
                >
                  {t("common.close")}
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    setConfirmOpen(false);
                    void runSync();
                  }}
                >
                  {t("portfolio.b3.authorize")}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
