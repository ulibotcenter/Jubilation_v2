"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Wallet,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { ConfettiBurst } from "@/components/ui/ConfettiBurst";
import { MilestoneTimeline } from "@/components/dashboard/MilestoneTimeline";
import { computeFITargetFromDesired } from "@/lib/incomeGoals";
import { useAppStore } from "@/store/useAppStore";
import { formatCurrencyValue } from "@/types";

function ProgressRing({
  progress,
  score,
  pulseKey,
}: {
  progress: number;
  score: number;
  pulseKey: number;
}) {
  const size = 100;
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const journeyOffset = circumference - (progress / 100) * circumference;
  const scoreArc = circumference - (score / 100) * circumference;

  const scoreColor =
    score >= 80 ? "#22c55e" : score >= 50 ? "#ff7040" : "#f87171";

  return (
    <motion.div
      className="hero-ring"
      style={{ width: size, height: size }}
      key={pulseKey}
      animate={{ scale: [1, 1.04, 1] }}
      transition={{ duration: 0.45 }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(30,41,59,0.8)"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,112,64,0.2)"
          strokeWidth={stroke - 2}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: journeyOffset }}
          transition={{ duration: 0.85, ease: [0.4, 0, 0.2, 1] }}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={scoreColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: scoreArc, stroke: scoreColor }}
          transition={{ duration: 0.85, ease: [0.4, 0, 0.2, 1] }}
          style={{ filter: `drop-shadow(0 0 6px ${scoreColor}50)` }}
        />
      </svg>
      <div className="hero-ring-label">
        <motion.span
          key={score}
          className="hero-ring-score"
          initial={{ scale: 1.1, opacity: 0.6 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          {score}
        </motion.span>
        <span className="hero-ring-caption">Score</span>
      </div>
    </motion.div>
  );
}

export function RetirementHero() {
  const kpis = useAppStore((s) => s.kpis);
  const currency = useAppStore((s) => s.currency);
  const projections = useAppStore((s) => s.projections);
  const monteCarlo = useAppStore((s) => s.monteCarlo);

  const prevScoreRef = useRef<number | null>(null);
  const prevOnTrackRef = useRef<boolean | null>(null);
  const [confettiTrigger, setConfettiTrigger] = useState(0);
  const [pulseKey, setPulseKey] = useState(0);
  const [heroFlash, setHeroFlash] = useState(false);

  const finalProjection = projections[projections.length - 1];
  const yearsToRetirement = kpis.retirementAge - kpis.currentAge;

  const { score, onTrack, target, journeyProgress, projectedValue } =
    useMemo(() => {
      const targetValue =
        kpis.desiredMonthlyIncome > 0
          ? computeFITargetFromDesired(kpis.desiredMonthlyIncome)
          : kpis.currentNetWorth * 25;
      const projected = finalProjection?.portfolioValue ?? 0;
      const rawScore =
        targetValue > 0 ? Math.min(100, (projected / targetValue) * 100) : 0;

      const mcBase = monteCarlo.results.find((r) => r.scenario === "base");
      const blendedScore = mcBase
        ? Math.round(rawScore * 0.6 + mcBase.successRate * 0.4)
        : Math.round(rawScore);

      const startAge = 18;
      const journey =
        ((kpis.currentAge - startAge) / (kpis.retirementAge - startAge)) * 100;

      return {
        score: blendedScore,
        onTrack: blendedScore >= 75,
        target: targetValue,
        journeyProgress: Math.min(100, Math.max(0, journey)),
        projectedValue: projected,
      };
    }, [kpis, finalProjection, monteCarlo.results]);

  useEffect(() => {
    const prev = prevScoreRef.current;
    const prevOnTrack = prevOnTrackRef.current;

    if (prev === null) {
      prevScoreRef.current = score;
      prevOnTrackRef.current = onTrack;
      return;
    }

    if (prev === score && prevOnTrack === onTrack) return;

    setPulseKey((k) => k + 1);
    setHeroFlash(true);
    const t = setTimeout(() => setHeroFlash(false), 600);

    if (!prevOnTrack && onTrack) {
      setConfettiTrigger((c) => c + 1);
      toast.success("You're on track!", {
        description: `Readiness score reached ${score}.`,
      });
    }

    prevScoreRef.current = score;
    prevOnTrackRef.current = onTrack;
    return () => clearTimeout(t);
  }, [score, onTrack, kpis]);

  const metrics = [
    {
      icon: TrendingUp,
      label: "FI Target",
      value: formatCurrencyValue(target, currency, true),
      hint: "25× income goal",
    },
    {
      icon: Wallet,
      label: "Projected",
      value: formatCurrencyValue(projectedValue, currency, true),
      hint: "at retirement",
    },
    {
      icon: Calendar,
      label: "Timeline",
      value: `${yearsToRetirement}y`,
      hint: `to age ${kpis.retirementAge}`,
    },
  ];

  return (
    <>
      <ConfettiBurst trigger={confettiTrigger} origin="left" />

      <motion.section
        className={`hero-card mb-4 sm:mb-5 ${heroFlash ? "hero-card-flash" : ""}`}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
        aria-label="Retirement readiness overview"
      >
        <div className="hero-layout">
          <div className="hero-main">
            <ProgressRing
              progress={journeyProgress}
              score={score}
              pulseKey={pulseKey}
            />

            <div className="hero-copy min-w-0">
              <div className="hero-title-row">
                <h1 className="hero-title">Retirement Dashboard</h1>
                <span className="hero-beta-badge">Beta</span>
              </div>

              <motion.div
                key={onTrack ? "on" : "off"}
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`hero-status ${onTrack ? "hero-status--ok" : "hero-status--warn"}`}
              >
                {onTrack ? (
                  <CheckCircle2 className="w-3.5 h-3.5" size={14} />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5" size={14} />
                )}
                {onTrack ? "On track" : "Needs attention"}
              </motion.div>

              <p className="hero-subline">
                <span className="text-foreground font-semibold tabular-nums">
                  {Math.round(journeyProgress)}%
                </span>{" "}
                through your journey ·{" "}
                <span className="text-accent font-semibold tabular-nums">
                  {formatCurrencyValue(projectedValue, currency, true)}
                </span>{" "}
                projected at retirement
              </p>
            </div>
          </div>

          <div className="hero-metrics">
            {metrics.map((m, i) => (
              <motion.div
                key={m.label}
                className="hero-metric-tile"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
              >
                <m.icon className="w-3.5 h-3.5 text-accent opacity-80" size={14} />
                <p className="hero-metric-label">{m.label}</p>
                <p className="hero-metric-value tabular-nums">{m.value}</p>
                <p className="hero-metric-hint">{m.hint}</p>
              </motion.div>
            ))}
          </div>
        </div>

        <MilestoneTimeline
          currentAge={kpis.currentAge}
          retirementAge={kpis.retirementAge}
          journeyProgress={journeyProgress}
        />
      </motion.section>
    </>
  );
}

export function useHeroProjectedValue() {
  const projections = useAppStore((s) => s.projections);
  const finalProjection = projections[projections.length - 1];
  return finalProjection?.portfolioValue ?? 0;
}