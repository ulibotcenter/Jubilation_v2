"use client";

import {
  cloneElement,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { canCollect, ConsentRequiredError } from "@/lib/connectors";
import {
  largestIrpfRowId,
  type IrpfBatchPreview,
  type IrpfBatchRow,
} from "@/lib/connectors/irpf/preview";
import { formatAsOfDayMonth } from "@/lib/connectors/b3/quota";
import { formatCurrencyValue } from "@/types";
import { useAppStore } from "@/store/useAppStore";

type Step = 1 | 2 | 3 | 4;

export function IrpfImportWizard({ trigger }: { trigger: ReactNode }) {
  const { t, locale } = useTranslation();
  const consents = useAppStore((s) => s.consents);
  const grantIrpf = useAppStore((s) => s.grantIrpfConsent);
  const previewIrpf = useAppStore((s) => s.previewIrpfFile);
  const confirmIrpf = useAppStore((s) => s.confirmIrpfImport);
  const isImporting = useAppStore((s) => s.isImportingFile);
  const currency = useAppStore((s) => s.currency);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>(1);
  const [mounted, setMounted] = useState(false);
  const [preview, setPreview] = useState<IrpfBatchPreview | null>(null);
  const [rows, setRows] = useState<IrpfBatchRow[]>([]);
  const [focusId, setFocusId] = useState<string | null>(null);
  const valueRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const irpfOk = canCollect(consents.find((c) => c.provider === "irpf"));
  const localeTag = locale === "pt" ? "pt-BR" : locale === "es" ? "es" : "en";

  const reset = () => {
    setOpen(false);
    setStep(1);
    setPreview(null);
    setRows([]);
    setFocusId(null);
  };

  const openWizard = () => {
    setStep(1);
    setPreview(null);
    setRows([]);
    setOpen(true);
  };

  const onFile = async (file: File) => {
    const name = file.name.toLowerCase();
    if (name.endsWith(".pdf")) {
      toast.error(t("wizard.irpf.noPdf"));
      return;
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    try {
      if (!irpfOk) grantIrpf();
      const next = previewIrpf(bytes, file.name);
      setPreview(next);
      setRows(next.rows);
      setStep(4);
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

  const apply = (nextRows: IrpfBatchRow[]) => {
    if (!preview) return;
    try {
      confirmIrpf(preview, nextRows);
      toast.success(t("toast.files.irpfOk"));
      reset();
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

  const useAll = () => {
    apply(rows.map((row) => ({ ...row, selected: true })));
  };

  const adjustLargest = () => {
    const id = largestIrpfRowId(rows);
    if (!id) return;
    setFocusId(id);
    requestAnimationFrame(() => {
      valueRefs.current[id]?.focus();
      valueRefs.current[id]?.select();
    });
  };

  const triggerEl =
    isValidElement(trigger) && trigger.type === "button"
      ? cloneElement(trigger as ReactElement<{ onClick?: () => void }>, {
          onClick: openWizard,
        })
      : (
          <span onClick={openWizard} onKeyDown={(e) => e.key === "Enter" && openWizard()}>
            {trigger}
          </span>
        );

  return (
    <>
      {triggerEl}
      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        accept=".dbk,.dec,.txt,text/plain"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void onFile(file);
        }}
      />
      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && (
              <div className="add-asset-modal-root" data-irpf-wizard="true">
                <motion.div
                  className="add-asset-modal-backdrop"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={reset}
                />
                <motion.div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="irpf-wizard-title"
                  className="add-asset-modal max-w-lg wizard-modal"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 16 }}
                >
                  <div className="add-asset-modal-header">
                    <div>
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
                        {t("wizard.step", { current: step, total: 4 })}
                      </p>
                      <h2 id="irpf-wizard-title" className="text-base font-semibold">
                        {step === 1
                          ? t("wizard.irpf.coversTitle")
                          : step === 2
                            ? t("wizard.irpf.exportTitle")
                            : step === 3
                              ? t("wizard.irpf.dropTitle")
                              : t("wizard.irpf.confirmTitle")}
                      </h2>
                    </div>
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={reset}
                      aria-label={t("common.close")}
                    >
                      <X className="w-4 h-4" size={16} />
                    </button>
                  </div>

                  {step === 1 && (
                    <div className="wizard-body">
                      <p>{t("wizard.irpf.coversBody")}</p>
                      <ul className="wizard-list">
                        <li>{t("wizard.irpf.coversImovel")}</li>
                        <li>{t("wizard.irpf.coversPrev")}</li>
                        <li>{t("wizard.irpf.coversFgts")}</li>
                        <li>{t("wizard.irpf.coversOther")}</li>
                      </ul>
                    </div>
                  )}
                  {step === 2 && (
                    <div className="wizard-body">
                      <p>{t("wizard.irpf.exportBody")}</p>
                      <ol className="wizard-list wizard-list--ol">
                        <li>{t("wizard.irpf.export1")}</li>
                        <li>{t("wizard.irpf.export2")}</li>
                        <li>{t("wizard.irpf.export3")}</li>
                      </ol>
                      <p className="text-[11px] text-muted-foreground">
                        {t("wizard.irpf.noGovbr")}
                      </p>
                    </div>
                  )}
                  {step === 3 && (
                    <div className="wizard-body">
                      <button
                        type="button"
                        className="wizard-drop"
                        data-irpf-drop="true"
                        onClick={() => inputRef.current?.click()}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          const file = e.dataTransfer.files?.[0];
                          if (file) void onFile(file);
                        }}
                      >
                        {t("wizard.irpf.dropHint")}
                      </button>
                      <p className="text-[11px] text-muted-foreground">
                        {t("wizard.irpf.notAdvice")}
                      </p>
                    </div>
                  )}
                  {step === 4 && preview && (
                    <div className="wizard-body" data-irpf-batch="true">
                      {preview.covered.length > 0 && (
                        <div className="wizard-notice" data-irpf-covered="true">
                          <p className="font-medium">{t("wizard.irpf.coveredTitle")}</p>
                          <ul>
                            {preview.covered.map((row) => (
                              <li key={row.ticker}>
                                {row.ticker} — {t("wizard.irpf.alreadyOnB3")}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {rows.length === 0 ? (
                        <p>{t("wizard.irpf.empty")}</p>
                      ) : (
                        <ul className="wizard-batch">
                          {rows.map((row) => (
                            <li
                              key={row.id}
                              className={
                                focusId === row.id ? "wizard-batch-row is-focus" : "wizard-batch-row"
                              }
                            >
                              <label className="wizard-check">
                                <input
                                  type="checkbox"
                                  checked={row.selected}
                                  onChange={(e) =>
                                    setRows((cur) =>
                                      cur.map((r) =>
                                        r.id === row.id
                                          ? { ...r, selected: e.target.checked }
                                          : r
                                      )
                                    )
                                  }
                                />
                                <span>{t("wizard.irpf.useThese")}</span>
                              </label>
                              <div className="min-w-0 flex-1">
                                <p className="font-medium truncate">{row.name}</p>
                                <span className="origin-badge origin-badge--irpf">
                                  {t("wizard.irpf.staleBadge", {
                                    date: formatAsOfDayMonth(row.costAsOf) || row.costAsOf,
                                    year: row.costYear,
                                  })}
                                </span>
                              </div>
                              <label className="wizard-value">
                                <span className="sr-only">{t("wizard.irpf.todayValue")}</span>
                                <input
                                  ref={(el) => {
                                    valueRefs.current[row.id] = el;
                                  }}
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  value={row.todayValue}
                                  onChange={(e) =>
                                    setRows((cur) =>
                                      cur.map((r) =>
                                        r.id === row.id
                                          ? {
                                              ...r,
                                              todayValue: Number(e.target.value) || 0,
                                            }
                                          : r
                                      )
                                    )
                                  }
                                />
                                <span className="text-[10px] text-muted-foreground tabular-nums">
                                  {formatCurrencyValue(
                                    row.todayValue,
                                    currency,
                                    true,
                                    localeTag
                                  )}
                                </span>
                              </label>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  <div className="flex flex-wrap justify-end gap-2 px-5 pb-5">
                    {step > 1 && step < 4 ? (
                      <button
                        type="button"
                        className="btn-ghost"
                        onClick={() => setStep((s) => (s - 1) as Step)}
                      >
                        {t("common.back")}
                      </button>
                    ) : (
                      <button type="button" className="btn-ghost" onClick={reset}>
                        {t("common.close")}
                      </button>
                    )}
                    {step < 3 ? (
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={() => setStep((s) => (s + 1) as Step)}
                      >
                        {t("common.continue")}
                      </button>
                    ) : step === 3 ? (
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={() => inputRef.current?.click()}
                      >
                        {t("wizard.irpf.chooseFile")}
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="btn-ghost"
                          onClick={adjustLargest}
                          disabled={rows.length === 0}
                        >
                          {t("wizard.irpf.adjustLargest")}
                        </button>
                        <button
                          type="button"
                          className="btn-primary"
                          disabled={isImporting || rows.length === 0}
                          onClick={useAll}
                          data-irpf-use-all="true"
                        >
                          {isImporting ? (
                            <Loader2 className="w-4 h-4 animate-spin" size={16} />
                          ) : null}
                          {t("wizard.irpf.useAll")}
                        </button>
                      </>
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
