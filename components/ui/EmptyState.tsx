"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { fadeUp } from "@/lib/uiMotion";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = "",
}: EmptyStateProps) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      className={`empty-state ${className}`}
      {...fadeUp(reduced)}
    >
      <div className="empty-state-icon-wrap">
        <motion.div
          className="empty-state-glow"
          animate={
            reduced
              ? { scale: 1, opacity: 0.45 }
              : { scale: [1, 1.08, 1], opacity: [0.4, 0.6, 0.4] }
          }
          transition={
            reduced
              ? { duration: 0 }
              : { duration: 3, repeat: Infinity, ease: "easeInOut" }
          }
        />
        <Icon className="w-8 h-8 text-accent relative z-10" size={32} aria-hidden />
      </div>
      <h3 className="text-base font-semibold text-foreground mt-4">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1.5 max-w-xs leading-relaxed">
        {description}
      </p>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="btn-primary mt-5 text-sm"
        >
          {action.label}
        </button>
      )}
    </motion.div>
  );
}
