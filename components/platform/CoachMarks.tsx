"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  FlaskConical,
  LayoutGrid,
  Sparkles,
  Wallet,
  X,
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { useTranslation } from "@/lib/i18n/useTranslation";

const STEPS = [
  {
    id: "assumptions",
    href: "#dashboard",
    icon: LayoutGrid,
    labelKey: "coach.link.assumptions" as const,
  },
  {
    id: "portfolio",
    href: "#portfolio",
    icon: Wallet,
    labelKey: "coach.link.portfolio" as const,
  },
  {
    id: "simulation",
    href: "/simulation",
    icon: FlaskConical,
    labelKey: "coach.link.simulation" as const,
  },
] as const;

export function CoachMarks() {
  const dismissed = useAppStore((s) => s.coachMarksDismissed);
  const dismiss = useAppStore((s) => s.dismissCoachMarks);
  const { t } = useTranslation();

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.aside
          className="welcome-float"
          role="note"
          initial={{ opacity: 0, y: 16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.96 }}
          transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
        >
          <button
            type="button"
            className="welcome-float-close"
            onClick={dismiss}
            aria-label={t("coach.dismiss")}
          >
            <X className="w-4 h-4" size={16} />
          </button>

          <div className="welcome-float-header">
            <span className="welcome-float-icon">
              <Sparkles className="w-4 h-4 text-accent" size={16} />
            </span>
            <p className="welcome-float-title">{t("coach.title")}</p>
          </div>

          <p className="welcome-float-body">{t("coach.welcome")}</p>

          <nav className="welcome-float-actions" aria-label={t("coach.navAria")}>
            {STEPS.map((step) => {
              const Icon = step.icon;
              const isExternal = step.href.startsWith("/");
              const className = "welcome-float-action";

              if (isExternal) {
                return (
                  <Link
                    key={step.id}
                    href={step.href}
                    className={className}
                    onClick={dismiss}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" size={14} />
                    {t(step.labelKey)}
                  </Link>
                );
              }

              return (
                <a
                  key={step.id}
                  href={step.href}
                  className={className}
                  onClick={dismiss}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" size={14} />
                  {t(step.labelKey)}
                </a>
              );
            })}
          </nav>

          <button
            type="button"
            className="welcome-float-dismiss btn-secondary text-xs w-full"
            onClick={dismiss}
          >
            {t("coach.dismiss")}
          </button>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}