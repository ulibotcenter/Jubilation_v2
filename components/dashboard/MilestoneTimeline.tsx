"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Flag, MapPin, Target } from "lucide-react";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { fadeUp } from "@/lib/uiMotion";
import { SpacedWords } from "@/components/ui/SpacedWords";

interface MilestoneTimelineProps {
  currentAge: number;
  retirementAge: number;
  journeyProgress: number;
}

export function MilestoneTimeline({
  currentAge,
  retirementAge,
  journeyProgress,
}: MilestoneTimelineProps) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const midpoint = Math.round((currentAge + retirementAge) / 2);
  const atMidpoint = journeyProgress >= 50;

  const milestones = [
    {
      id: "today",
      label: t("hero.milestones.today"),
      sub: t("hero.milestones.age", { n: currentAge }),
      icon: MapPin,
      position: 0,
      done: true,
      active: journeyProgress < 50,
    },
    {
      id: "mid",
      label: t("hero.milestones.midpoint"),
      sub: t("hero.milestones.age", { n: midpoint }),
      icon: Target,
      position: 50,
      done: atMidpoint,
      active: journeyProgress >= 50 && journeyProgress < 100,
    },
    {
      id: "retire",
      label: t("hero.milestones.retirement"),
      sub: t("hero.milestones.age", { n: retirementAge }),
      icon: Flag,
      position: 100,
      done: journeyProgress >= 100,
      active: false,
    },
  ];

  return (
    <div className="px-5 sm:px-6 pb-5 sm:pb-6 pt-0 border-t border-border/60">
      <SpacedWords
        as="p"
        className="hero-milestones-title"
        text={t("hero.milestones.title")}
      />

      <div className="relative">
        <div className="absolute top-[1.125rem] left-4 right-4 h-1 rounded-full bg-surface-elevated overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: "var(--accent-gradient)" }}
            initial={{ width: reduced ? `${journeyProgress}%` : 0 }}
            animate={{ width: `${journeyProgress}%` }}
            transition={
              reduced ? { duration: 0 } : { duration: 0.9, ease: [0.4, 0, 0.2, 1] }
            }
          />
        </div>

        <div className="relative flex justify-between">
          {milestones.map((m, i) => {
            const Icon = m.icon;
            const isLit = m.done || m.active;

            return (
              <motion.div
                key={m.id}
                className="flex flex-col items-center gap-1.5 min-w-0"
                {...fadeUp(reduced, i * 0.06)}
              >
                <div
                  className={`relative z-10 flex items-center justify-center w-9 h-9 rounded-full border-2 transition-colors duration-300 ${
                    isLit
                      ? "border-accent bg-accent/15 text-accent"
                      : "border-border bg-surface text-muted-foreground"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" size={14} aria-hidden />
                </div>
                <div className="text-center">
                  <p
                    className={`text-[11px] font-semibold ${
                      isLit ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {m.label}
                  </p>
                  <p className="milestone-age text-[10px] text-muted">
                    <SpacedWords text={m.sub} />
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
