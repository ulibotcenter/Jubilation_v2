"use client";

import { useCallback, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  Shield,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { ASSUMPTIONS } from "@/lib/engine/assumptions";
import { PRIVACY_PATH } from "@/lib/privacy/local";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useAppStore } from "@/store/useAppStore";

const STEP_VARIANTS = {
  enter: (direction: number) => ({
    x: direction > 0 ? 40 : -40,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 0,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 40 : -40,
    opacity: 0,
  }),
};

const CENTER = { x: 0, opacity: 1 };

export function OnboardingModal() {
  const { t } = useTranslation();
  const onboarding = useAppStore((s) => s.onboarding);
  const setOnboardingStep = useAppStore((s) => s.setOnboardingStep);
  const setDisclaimerAccepted = useAppStore((s) => s.setDisclaimerAccepted);
  const finishOnboarding = useAppStore((s) => s.finishOnboarding);

  const { completed, currentStep, disclaimerAccepted } = onboarding;
  const direction = currentStep === 1 ? 1 : -1;
  const reduced = useReducedMotion();

  const [age, setAge] = useState("");
  const [income, setIncome] = useState("");
  const [contribution, setContribution] = useState("");
  const [lifeExpectancy, setLifeExpectancy] = useState(
    String(ASSUMPTIONS.lifeExpectancy.defaultValue)
  );

  const handleContinue = useCallback(() => {
    if (currentStep === 1) {
      const parsedAge = Number(age);
      const parsedIncome = Number(income);
      const parsedContribution = Number(contribution);
      const parsedLe = Number(lifeExpectancy);
      if (!Number.isFinite(parsedAge) || parsedAge < 18 || parsedAge > 80) {
        toast.error(t("onboarding.invalidAge"));
        return;
      }
      if (!Number.isFinite(parsedIncome) || parsedIncome < 0) {
        toast.error(t("onboarding.invalidIncome"));
        return;
      }
      if (!Number.isFinite(parsedContribution) || parsedContribution < 0) {
        toast.error(t("onboarding.invalidContribution"));
        return;
      }
      if (!Number.isFinite(parsedLe) || parsedLe < 55 || parsedLe > 120) {
        toast.error(t("onboarding.invalidHorizon"));
        return;
      }
      setOnboardingStep(2);
      return;
    }

    if (!disclaimerAccepted) {
      toast.error(t("toast.onboarding.acceptDisclaimer"), {
        description: t("toast.onboarding.acceptDisclaimerDesc"),
      });
      return;
    }

    finishOnboarding({
      age: Number(age),
      income: Number(income),
      contribution: Number(contribution),
      lifeExpectancy: Number(lifeExpectancy),
    });
    toast.success(t("toast.onboarding.complete"), {
      description: t("toast.onboarding.completeDescReal"),
    });
  }, [
    currentStep,
    disclaimerAccepted,
    age,
    income,
    contribution,
    lifeExpectancy,
    setOnboardingStep,
    finishOnboarding,
    t,
  ]);

  const handleBack = useCallback(() => {
    if (currentStep === 2) {
      setOnboardingStep(1);
    }
  }, [currentStep, setOnboardingStep]);

  if (completed) return null;

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <motion.div
        className="modal-content"
        initial={reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduced ? { duration: 0 } : { duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
      >
        <div className="px-5 pt-6 pb-4 sm:px-6 sm:pt-7">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-accent/15">
                <Sparkles className="w-[18px] h-[18px] text-accent" size={18} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted">
                  {t("onboarding.brand")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t("onboarding.step", { current: currentStep, total: 2 })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5" aria-hidden="true">
              {[1, 2].map((step) => (
                <div
                  key={step}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    step === currentStep
                      ? "w-6 bg-accent"
                      : step < currentStep
                        ? "w-3 bg-accent/50"
                        : "w-3 bg-border"
                  }`}
                />
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait" custom={direction}>
            {currentStep === 1 ? (
              <motion.div
                key="step-1"
                custom={direction}
                variants={{ ...STEP_VARIANTS, center: CENTER }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={
                  reduced
                    ? { duration: 0 }
                    : { duration: 0.28, ease: [0.4, 0, 0.2, 1] }
                }
              >
                <h2
                  id="onboarding-title"
                  className="text-xl font-bold text-foreground sm:text-2xl"
                >
                  {t("onboarding.step1.title")}
                </h2>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  {t("onboarding.step1.desc")}
                </p>
                <div className="household-form-grid mt-5">
                  <label className="household-field">
                    <span>{t("onboarding.field.age")}</span>
                    <input
                      type="number"
                      min={18}
                      max={80}
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      required
                      autoFocus
                    />
                    <span className="text-[11px] text-muted-foreground mt-1">
                      {t("onboarding.why.age")}
                    </span>
                  </label>
                  <label className="household-field">
                    <span>{t("onboarding.field.income")}</span>
                    <input
                      type="number"
                      min={0}
                      step={100}
                      value={income}
                      onChange={(e) => setIncome(e.target.value)}
                      required
                    />
                    <span className="text-[11px] text-muted-foreground mt-1">
                      {t("onboarding.why.income")}
                    </span>
                  </label>
                  <label className="household-field">
                    <span>{t("onboarding.field.contribution")}</span>
                    <input
                      type="number"
                      min={0}
                      step={50}
                      value={contribution}
                      onChange={(e) => setContribution(e.target.value)}
                      required
                    />
                    <span className="text-[11px] text-muted-foreground mt-1">
                      {t("onboarding.why.contribution")}
                    </span>
                  </label>
                  <label className="household-field">
                    <span>{t("onboarding.field.lifeExpectancy")}</span>
                    <input
                      type="number"
                      min={55}
                      max={120}
                      value={lifeExpectancy}
                      onChange={(e) => setLifeExpectancy(e.target.value)}
                    />
                    <span className="text-[11px] text-muted-foreground mt-1">
                      {t("onboarding.why.lifeExpectancy")}
                    </span>
                  </label>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="disclaimer-step"
                custom={direction}
                variants={{ ...STEP_VARIANTS, center: CENTER }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={
                  reduced
                    ? { duration: 0 }
                    : { duration: 0.28, ease: [0.4, 0, 0.2, 1] }
                }
              >
                <h2
                  id="onboarding-title"
                  className="text-xl font-bold text-foreground sm:text-2xl"
                >
                  {t("onboarding.step2.title")}
                </h2>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  {t("onboarding.step2.desc")}
                </p>
                <div className="onboarding-warning mt-4 rounded-xl border p-3 flex gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" size={16} />
                  <div>
                    <p className="text-xs font-semibold">
                      {t("onboarding.warning.title")}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {t("onboarding.warning.desc")}
                    </p>
                  </div>
                </div>
                <div className="relative mt-4">
                  <div className="max-h-48 overflow-y-auto rounded-xl border border-border bg-surface p-4 sm:max-h-52">
                    <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                      {t("onboarding.disclaimer")}
                    </p>
                  </div>
                </div>
                <label className="flex items-start gap-3 cursor-pointer group p-3 rounded-xl border border-border hover:border-accent/30 transition-colors duration-200 min-h-[var(--touch-target)] mt-3 focus-within:border-accent focus-within:shadow-[0_0_0_3px_var(--accent-muted)]">
                  <div className="relative shrink-0 mt-0.5">
                    <input
                      type="checkbox"
                      checked={disclaimerAccepted}
                      onChange={(e) =>
                        setDisclaimerAccepted(e.target.checked)
                      }
                      className="sr-only"
                      aria-describedby="disclaimer-checkbox-label"
                    />
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200 ${
                        disclaimerAccepted
                          ? "bg-accent border-accent"
                          : "border-border group-hover:border-accent/50"
                      }`}
                    >
                      {disclaimerAccepted && (
                        <Check className="w-3 h-3 text-white" size={12} />
                      )}
                    </div>
                  </div>
                  <span id="disclaimer-checkbox-label" className="text-xs leading-relaxed">
                    {t("onboarding.checkbox")}
                  </span>
                </label>
                <p className="text-[11px] text-muted-foreground mt-3 flex items-start gap-1.5">
                  <Shield className="w-3 h-3 mt-0.5 shrink-0" size={12} />
                  <span>
                    {t("onboarding.privacy")}{" "}
                    <Link href={PRIVACY_PATH} className="text-accent hover:underline">
                      {t("nav.privacy")}
                    </Link>
                  </span>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="px-5 pb-5 sm:px-6 sm:pb-6 flex items-center justify-between gap-3">
          {currentStep === 2 ? (
            <button
              type="button"
              onClick={handleBack}
              className="btn-ghost"
              aria-label={t("onboarding.backAria")}
            >
              <ArrowLeft className="w-4 h-4" size={16} />
              <span>{t("common.back")}</span>
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={handleContinue}
            disabled={currentStep === 2 && !disclaimerAccepted}
            className="btn-primary"
            aria-label={
              currentStep === 1
                ? t("onboarding.continueAria")
                : t("onboarding.getStartedAria")
            }
          >
            <span>
              {currentStep === 1
                ? t("onboarding.continue")
                : t("onboarding.getStarted")}
            </span>
            <ArrowRight className="w-4 h-4" size={16} />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
