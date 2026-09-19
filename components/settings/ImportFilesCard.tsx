"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { FileUp, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n/useTranslation";
import {
  canCollect,
  ConsentRequiredError,
  CNIS_CONSENT_EVIDENCE_PT,
  IRPF_CONSENT_EVIDENCE_PT,
} from "@/lib/connectors";
import { useAppStore } from "@/store/useAppStore";

type FileKind = "cnis" | "irpf";

export function ImportFilesCard() {
  const { t } = useTranslation();
  const consents = useAppStore((s) => s.consents);
  const grantCnis = useAppStore((s) => s.grantCnisConsent);
  const grantIrpf = useAppStore((s) => s.grantIrpfConsent);
  const revoke = useAppStore((s) => s.revokeFileConsent);
  const importCnis = useAppStore((s) => s.importCnisFile);
  const importIrpf = useAppStore((s) => s.importIrpfFile);
  const isImporting = useAppStore((s) => s.isImportingFile);
  const cnisSync = useAppStore((s) => s.connectorSync.cnis);
  const irpfSync = useAppStore((s) => s.connectorSync.irpf);
  const holderInss = useAppStore((s) => s.household.holder.inss);

  const [pending, setPending] = useState<FileKind | null>(null);
  const [mounted, setMounted] = useState(false);
  const cnisInput = useRef<HTMLInputElement>(null);
  const irpfInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const cnisOk = canCollect(consents.find((c) => c.provider === "cnis"));
  const irpfOk = canCollect(consents.find((c) => c.provider === "irpf"));

  const runImport = async (kind: FileKind, file: File) => {
    const bytes = new Uint8Array(await file.arrayBuffer());
    try {
      if (kind === "cnis") {
        if (!cnisOk) grantCnis();
        importCnis(bytes, file.name);
        toast.success(t("toast.files.cnisOk"));
      } else {
        if (!irpfOk) grantIrpf();
        importIrpf(bytes, file.name);
        toast.success(t("toast.files.irpfOk"));
      }
    } catch (err) {
      if (err instanceof ConsentRequiredError) {
        toast.error(t("toast.files.consentRequired"));
        return;
      }
      toast.error(t("toast.files.error"), {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const onPick = (kind: FileKind) => {
    if (kind === "cnis" ? cnisOk : irpfOk) {
      (kind === "cnis" ? cnisInput : irpfInput).current?.click();
      return;
    }
    setPending(kind);
  };

  const evidence = pending === "cnis" ? CNIS_CONSENT_EVIDENCE_PT : IRPF_CONSENT_EVIDENCE_PT;

  return (
    <section className="settings-page-card">
      <div className="settings-page-card-head">
        <FileUp className="w-4 h-4 text-accent" size={16} />
        <h2>{t("settings.files.title")}</h2>
      </div>
      <p className="settings-page-card-body">{t("settings.files.body")}</p>
      <p className="text-[11px] text-muted-foreground mt-2">{t("settings.files.localOnly")}</p>

      <div className="flex flex-col gap-3 mt-4">
        <div className="flex flex-wrap items-center gap-2">
          <input
            id="cnis-file-input"
            ref={cnisInput}
            type="file"
            className="sr-only"
            accept=".pdf,.txt,.csv,text/plain,application/pdf"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void runImport("cnis", file);
            }}
          />
          <button
            type="button"
            className="btn-secondary text-xs"
            disabled={isImporting}
            onClick={() => onPick("cnis")}
          >
            {isImporting ? (
              <Loader2 className="w-4 h-4 animate-spin" size={16} />
            ) : (
              <FileUp className="w-4 h-4" size={16} />
            )}
            {t("settings.files.cnisButton")}
          </button>
          {cnisOk && (
            <button
              type="button"
              className="btn-ghost text-xs"
              onClick={() => {
                revoke("cnis");
                toast.success(t("toast.files.revoked"));
              }}
            >
              {t("settings.files.revokeCnis")}
            </button>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground tabular-nums">
          {cnisSync?.asOf
            ? t("settings.files.cnisAsOf", { date: cnisSync.asOf })
            : t("settings.files.cnisNone")}
          {holderInss?.source === "FILE_CNIS" && holderInss.history.length
            ? ` · ${t("settings.files.cnisMonths", { n: holderInss.history.length })}`
            : ""}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <input
            id="irpf-file-input"
            ref={irpfInput}
            type="file"
            className="sr-only"
            accept=".dbk,.dec,.txt,text/plain"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void runImport("irpf", file);
            }}
          />
          <button
            type="button"
            className="btn-secondary text-xs"
            disabled={isImporting}
            onClick={() => onPick("irpf")}
          >
            {t("settings.files.irpfButton")}
          </button>
          {irpfOk && (
            <button
              type="button"
              className="btn-ghost text-xs"
              onClick={() => {
                revoke("irpf");
                toast.success(t("toast.files.revoked"));
              }}
            >
              {t("settings.files.revokeIrpf")}
            </button>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground tabular-nums">
          {irpfSync?.asOf
            ? t("settings.files.irpfAsOf", { date: irpfSync.asOf })
            : t("settings.files.irpfNone")}
        </p>
      </div>

      {mounted &&
        createPortal(
          <AnimatePresence>
            {pending && (
              <div className="add-asset-modal-root" data-file-consent-root="true">
                <motion.div
                  className="add-asset-modal-backdrop"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setPending(null)}
                />
                <motion.div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="file-consent-title"
                  className="add-asset-modal max-w-md"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 16 }}
                >
                  <div className="add-asset-modal-header">
                    <h2 id="file-consent-title" className="text-base font-semibold">
                      {pending === "cnis"
                        ? t("settings.files.cnisConsentTitle")
                        : t("settings.files.irpfConsentTitle")}
                    </h2>
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => setPending(null)}
                      aria-label={t("common.close")}
                    >
                      <X className="w-4 h-4" size={16} />
                    </button>
                  </div>
                  <p className="text-sm text-foreground/80 leading-relaxed px-5 pb-4">
                    {evidence}
                  </p>
                  <div className="flex justify-end gap-2 px-5 pb-5">
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => setPending(null)}
                    >
                      {t("common.close")}
                    </button>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => {
                        const kind = pending;
                        setPending(null);
                        (kind === "cnis" ? cnisInput : irpfInput).current?.click();
                      }}
                    >
                      {t("settings.files.authorize")}
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </section>
  );
}
