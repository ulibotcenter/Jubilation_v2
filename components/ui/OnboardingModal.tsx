"use client";

import { useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  Globe,
  Shield,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useAppStore } from "@/store/useAppStore";
import { CURRENCIES, type Currency } from "@/types";

// i18n-ready: all strings below → future next-intl keys (onboarding.*)

const STEP_VARIANTS = {
  enter: (direction: number) => ({
    x: direction > 0 ? 40 : -40,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 40 : -40,
    opacity: 0,
  }),
};

const DISCLAIMER_TEXT = `Jubilation is an educational retirement planning tool. It does not provide financial, investment, tax, or legal advice. All projections, simulations, and Monte Carlo results are hypothetical estimates based on assumptions you provide — they are not guarantees of future performance.

Past performance does not predict future results. Markets are volatile. Inflation, taxes, fees, and personal circumstances can materially change outcomes. You should consult a qualified financial advisor before making investment or retirement decisions.

By continuing, you acknowledge that you understand these limitations and agree to use Jubilation for informational purposes only.`;

export function OnboardingModal() {
  const onboarding = useAppStore((s) => s.onboarding);
  const currency = useAppStore((s) => s.currency);
  const setCurrency = useAppStore((s) => s.setCurrency);
  const setOnboardingStep = useAppStore((s) => s.setOnboardingStep);
  const setDisclaimerAccepted = useAppStore((s) => s.setDisclaimerAccepted);
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);

  const { completed, currentStep, disclaimerAccepted } = onboarding;
  const direction = currentStep === 1 ? 1 : -1;

  const handleCurrencySelect = useCallback(
    (code: Currency) => {
      setCurrency(code);
    },
    [setCurrency]
  );

  const handleContinue = useCallback(() => {
    if (currentStep === 1) {
      setOnboardingStep(2);
      return;
    }

    if (!disclaimerAccepted) {
      toast.error("Please accept the disclaimer to continue", {
        description: "You must acknowledge the terms before using Jubilation.",
      });
      return;
    }

    completeOnboarding();
    toast.success("You're all set!", {
      description: `Dashboard ready in ${currency}. Edit assumptions anytime — we'll recalculate instantly.`,
    });
  }, [
    currentStep,
    disclaimerAccepted,
    currency,
    setOnboardingStep,
    completeOnboarding,
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
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* Header */}
        <div className="px-5 pt-6 pb-4 sm:px-6 sm:pt-7">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-accent/15">
                <Sparkles className="w-[18px] h-[18px] text-accent" size={18} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted">
                  Jubilation V2
                </p>
                <p className="text-sm text-muted-foreground">
                  Step {currentStep} of 2 · ~30 seconds
                </p>
              </div>
            </div>

            {/* Step dots */}
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
                variants={STEP_VARIANTS}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
              >
                <h2
                  id="onboarding-title"
                  className="text-xl font-bold text-foreground sm:text-2xl"
                >
                  Welcome — pick your currency
                </h2>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  We&apos;ll format all portfolio values and projections in this
                  currency. You can switch anytime from the header.
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="step-2"
                custom={direction}
                variants={STEP_VARIANTS}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
              >
                <h2
                  id="onboarding-title"
                  className="text-xl font-bold text-foreground sm:text-2xl"
                >
                  One last step — please read carefully
                </h2>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  Jubilation is a planning tool, not a financial advisor. Your
                  agreement below is required to continue.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <hr className="divider" />

        {/* Body */}
        <div className="px-5 py-5 sm:px-6 sm:py-6">
          <AnimatePresence mode="wait" custom={direction}>
            {currentStep === 1 ? (
              <motion.div
                key="currency-step"
                custom={direction}
                variants={STEP_VARIANTS}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
                className="grid grid-cols-1 gap-3 sm:grid-cols-3"
              >
                {CURRENCIES.map((option, index) => {
                  const isSelected = currency === option.code;
                  return (
                    <motion.button
                      key={option.code}
                      type="button"
                      onClick={() => handleCurrencySelect(option.code)}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.07, duration: 0.25 }}
                      className={`relative flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all duration-200 cursor-pointer min-h-[var(--touch-target)] ${
                        isSelected
                          ? "border-accent bg-accent/10 shadow-[var(--shadow-accent)]"
                          : "border-border bg-surface hover:border-accent/30 hover:bg-surface-elevated"
                      }`}
                      aria-pressed={isSelected}
                    >
                      {isSelected && (
                        <motion.div
                          layoutId="currency-check"
                          className="absolute top-3 right-3 flex items-center justify-center w-5 h-5 rounded-full bg-accent"
                          transition={{
                            type: "spring",
                            stiffness: 400,
                            damping: 30,
                          }}
                        >
                          <Check className="w-3 h-3 text-white" size={12} />
                        </motion.div>
                      )}

                      <span className="text-2xl font-bold text-foreground">
                        {option.symbol}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {option.label}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {option.name}
                        </p>
                      </div>
                    </motion.button>
                  );
                })}

                <div className="col-span-full flex items-start gap-2.5 mt-1 p-3 rounded-lg bg-surface border border-border">
                  <Globe
                    className="w-4 h-4 text-accent shrink-0 mt-0.5"
                    size={16}
                  />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Currency affects display formatting only. Exchange rate
                    conversion is not applied in this beta — all mock data uses
                    the selected symbol.
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="disclaimer-step"
                custom={direction}
                variants={STEP_VARIANTS}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
                className="space-y-4"
              >
                {/* Warning banner */}
                <div className="flex items-start gap-3 p-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10">
                  <AlertTriangle
                    className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5"
                    size={20}
                  />
                  <div>
                    <p className="text-sm font-semibold text-yellow-500">
                      Not financial advice
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Jubilation is for educational and planning purposes only.
                    </p>
                  </div>
                </div>

                {/* Disclaimer text */}
                <div className="relative">
                  <div className="max-h-48 overflow-y-auto rounded-xl border border-border bg-surface p-4 sm:max-h-52">
                    <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                      {DISCLAIMER_TEXT}
                    </p>
                  </div>
                  <div
                    className="pointer-events-none absolute bottom-0 left-0 right-0 h-8 rounded-b-xl bg-gradient-to-t from-surface to-transparent"
                    aria-hidden="true"
                  />
                </div>

                {/* Checkbox */}
                <label className="flex items-start gap-3 cursor-pointer group p-3 rounded-xl border border-border hover:border-accent/30 transition-colors duration-200 min-h-[var(--touch-target)]">
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
                      <AnimatePresence>
                        {disclaimerAccepted && (
                          <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{ duration: 0.15 }}
                          >
                            <Check className="w-3 h-3 text-white" size={12} />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                  <span
                    id="disclaimer-checkbox-label"
                    className="text-sm text-foreground leading-relaxed select-none"
                  >
                    I have read and understand the disclaimer. I acknowledge that
                    Jubilation does not provide financial advice and that all
                    projections are estimates only.
                  </span>
                </label>

                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-surface border border-border">
                  <Shield
                    className="w-4 h-4 text-accent shrink-0 mt-0.5"
                    size={16}
                  />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Your preferences are saved locally in your browser. No account
                    required for this beta.
                    {/* TODO: Supabase Auth — sync onboarding state post-login */}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <hr className="divider" />

        {/* Footer actions */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 sm:px-6 sm:py-5 safe-area-bottom">
          {currentStep === 2 ? (
            <button
              type="button"
              onClick={handleBack}
              className="btn-ghost"
              aria-label="Go back to currency selection"
            >
              <ArrowLeft className="w-4 h-4" size={16} />
              <span>Back</span>
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
                ? "Continue to disclaimer"
                : "Accept and start using Jubilation"
            }
          >
            <span>{currentStep === 1 ? "Continue" : "Get Started"}</span>
            <ArrowRight className="w-4 h-4" size={16} />
          </button>
        </div>
      </motion.div>
    </div>
  );
}