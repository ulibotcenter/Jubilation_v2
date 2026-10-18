"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { fadeUp } from "@/lib/uiMotion";

interface EmptyStateLink {
  label: string;
  href: string;
  variant?: "primary" | "secondary";
  testId?: string;
}

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    testId?: string;
  };
  links?: EmptyStateLink[];
  /** Page-level empty copy needs a wider measure than a card hint. */
  wide?: boolean;
  heading?: "h1" | "h2" | "h3";
  titleId?: string;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  links,
  wide = false,
  heading = "h3",
  titleId,
  className = "",
}: EmptyStateProps) {
  const reduced = useReducedMotion();
  const TitleTag = heading;
  const hasActions = Boolean(action) || Boolean(links?.length);

  return (
    <motion.div
      className={`empty-state ${wide ? "empty-state--roomy" : ""} ${className}`}
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
      <TitleTag
        id={titleId}
        className={`text-foreground mt-4 ${wide ? "text-xl font-bold" : "text-base font-semibold"}`}
      >
        {title}
      </TitleTag>
      <p
        className={`text-sm text-muted-foreground mt-1.5 leading-relaxed ${
          wide ? "max-w-md" : "max-w-xs"
        }`}
      >
        {description}
      </p>
      {hasActions ? (
        <div className="empty-state-actions">
          {action ? (
            <button
              type="button"
              onClick={action.onClick}
              className="btn-primary text-sm"
              data-empty-cta={action.testId}
            >
              {action.label}
            </button>
          ) : null}
          {links?.map((link) => (
            <Link
              key={link.href + link.label}
              href={link.href}
              className={
                link.variant === "secondary"
                  ? "btn-secondary text-sm"
                  : "btn-primary text-sm"
              }
              data-empty-cta={link.testId}
            >
              {link.label}
            </Link>
          ))}
        </div>
      ) : null}
    </motion.div>
  );
}
