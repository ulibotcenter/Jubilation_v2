"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Landmark, Loader2, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n/useTranslation";
import {
  B3AlreadyUpdatedError,
  canCollect,
  ConsentRequiredError,
  formatAsOfDayMonth,
  isB3QuotaConsumed,
  isConnectorEnabled,
} from "@/lib/connectors";
import type { PublicB3Status } from "@/lib/connectors/flags";
import { formatCurrencyValue } from "@/types";
import { useAppStore } from "@/store/useAppStore";

const WIZARD_STEPS = 4;

interface ConnectB3ButtonProps {
  /** `toolbar` keeps the CTA on the same row as the other portfolio actions. */
  align?: "stack" | "toolbar";
}

export function ConnectB3Button({ align = "stack" }: ConnectB3ButtonProps) {
  const { t, locale } = useTranslation();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [mounted, setMounted] = useState(false);
  const [status, setStatus] = useState<PublicB3Status | null>(null);
  const consents = useAppStore((s) => s.consents);
  const grant = useAppStore((s) => s.grantB3Consent);
  const syncB3 = useAppStore((s) => s.syncB3);
  const isSyncing = useAppStore((s) => s.isSyncingB3);
  const sync = useAppStore((s) => s.connectorSync.b3);
  const currency = useAppStore((s) => s.currency);
  const portfolio = useAppStore((s) => s.portfolio);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

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
  if (locale !== "pt") return null;

  const consent = consents.find((c) => c.provider === "b3");
  const authorised = canCollect(consent);
  const imported = portfolio.filter(
    (a) => a.origin === "b3" || a.source === "B3_API"
  );
  const importedValue = imported.reduce(
    (sum, a) => sum + a.quantity * a.currentPrice,
    0
  );
  const quotaUsed = isB3QuotaConsumed(sync?.lastQueryAt);
  const asOfDay = formatAsOfDayMonth(sync?.asOf ?? imported[0]?.asOf ?? null);

  const runSync = async () => {
    try {
      if (!authorised) grant();
      const result = await syncB3();
      setStep(4);
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
      if (err instanceof B3AlreadyUpdatedError) {
        toast.info(t("portfolio.b3.alreadyToday"));
        setWizardOpen(false);
        return;
      }
      if (err instanceof ConsentRequiredError) {
        toast.error(t("toast.b3.consentRequired"));
        return;
      }
      toast.error(t("toast.b3.error"), {
        description: t("portfolio.b3.failKeepsPlan"),
      });
    }
  };

  const handleClick = () => {
    if (authorised) {
      if (quotaUsed) return;
      void runSync();
      return;
    }
    setStep(1);
    setWizardOpen(true);
  };

  const localeTag = locale === "pt" ? "pt-BR" : locale === "es" ? "es" : "en";
  const fixtureHint =
    status && !status.live
      ? status.reason === "sandbox_only"
        ? t("portfolio.b3.sandboxOnly")
        : status.reason === "disabled"
          ? t("portfolio.b3.disabled")
          : t("portfolio.b3.notLive")
      : null;
  const buttonHint = [
    t("portfolio.b3.buttonHint"),
    authorised
      ? t("portfolio.b3.connectedStatus", { date: asOfDay || "—" })
      : null,
    sync?.asOf ? `asOf ${sync.asOf}` : null,
    authorised && quotaUsed ? t("portfolio.b3.alreadyToday") : null,
    fixtureHint,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <div
        className={
          align === "toolbar"
            ? "portfolio-toolbar-b3"
            : "flex flex-col items-stretch sm:items-end gap-1"
        }
      >
        <button
          type="button"
          className="btn-secondary"
          onClick={handleClick}
          disabled={isSyncing || (authorised && quotaUsed)}
          data-b3-cta={authorised ? "update" : "connect"}
          title={buttonHint}
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
              ? t("portfolio.updateB3")
              : t("portfolio.connectB3")}
        </button>
      </div>

      {mounted &&
        createPortal(
          <AnimatePresence>
            {wizardOpen && (
              <div className="add-asset-modal-root" data-b3-wizard="true">
                <motion.div
                  className="add-asset-modal-backdrop"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setWizardOpen(false)}
                />
                <motion.div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="b3-wizard-title"
                  className="add-asset-modal max-w-md wizard-modal"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 16 }}
                >
                  <div className="add-asset-modal-header">
                    <div>
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
                        {t("wizard.step", { current: step, total: WIZARD_STEPS })}
                      </p>
                      <h2 id="b3-wizard-title" className="text-base font-semibold">
                        {step === 1
                          ? t("portfolio.b3.wizard.pullsTitle")
                          : step === 2
                            ? t("portfolio.b3.wizard.skipsTitle")
                            : step === 3
                              ? t("portfolio.b3.wizard.authTitle")
                              : t("portfolio.b3.wizard.successTitle")}
                      </h2>
                    </div>
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => setWizardOpen(false)}
                      aria-label={t("common.close")}
                    >
                      <X className="w-4 h-4" size={16} />
                    </button>
                  </div>

                  {step === 1 && (
                    <div className="wizard-body">
                      <p>{t("portfolio.b3.wizard.pullsBody")}</p>
                      <ul className="wizard-list">
                        <li>{t("portfolio.b3.wizard.pullsRv")}</li>
                        <li>{t("portfolio.b3.wizard.pullsTesouro")}</li>
                        <li>{t("portfolio.b3.wizard.pullsRf")}</li>
                        <li>{t("portfolio.b3.wizard.pullsDeriv")}</li>
                      </ul>
                    </div>
                  )}
                  {step === 2 && (
                    <div className="wizard-body">
                      <p>{t("portfolio.b3.wizard.skipsBody")}</p>
                      <ul className="wizard-list">
                        <li>{t("portfolio.b3.wizard.skipInss")}</li>
                        <li>{t("portfolio.b3.wizard.skipPrev")}</li>
                        <li>{t("portfolio.b3.wizard.skipImovel")}</li>
                        <li>{t("portfolio.b3.wizard.skipBanco")}</li>
                      </ul>
                    </div>
                  )}
                  {step === 3 && (
                    <div className="wizard-body">
                      <p className="font-medium">{t("portfolio.b3.wizard.noPassword")}</p>
                      <p>{t("portfolio.b3.wizard.authBody")}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {t("portfolio.b3.noAdvice")}
                      </p>
                    </div>
                  )}
                  {step === 4 && (
                    <div className="wizard-body" data-b3-wizard-success="true">
                      <p>{t("portfolio.b3.wizard.successBody", {
                        n: imported.length,
                        total: formatCurrencyValue(
                          importedValue,
                          currency,
                          true,
                          localeTag
                        ),
                        date: sync?.asOf ?? "—",
                      })}</p>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 px-5 pb-5">
                    {step > 1 && step < 4 ? (
                      <button
                        type="button"
                        className="btn-ghost"
                        onClick={() => setStep((s) => s - 1)}
                      >
                        {t("common.back")}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn-ghost"
                        onClick={() => setWizardOpen(false)}
                      >
                        {t("common.close")}
                      </button>
                    )}
                    {step < 3 ? (
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={() => setStep((s) => s + 1)}
                      >
                        {t("common.continue")}
                      </button>
                    ) : step === 3 ? (
                      <button
                        type="button"
                        className="btn-primary"
                        disabled={isSyncing}
                        onClick={() => void runSync()}
                        data-b3-authorize="true"
                      >
                        {isSyncing ? (
                          <Loader2 className="w-4 h-4 animate-spin" size={16} />
                        ) : null}
                        {t("portfolio.b3.wizard.authorizeOnB3")}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={() => setWizardOpen(false)}
                      >
                        {t("portfolio.updateB3")}
                      </button>
                    )}
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}
