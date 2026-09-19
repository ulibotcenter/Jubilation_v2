"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { fadeUp } from "@/lib/uiMotion";

interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  description: string;
  backHref?: string;
  backLabel?: string;
}

export function PageHeader({
  icon: Icon,
  title,
  description,
  backHref = "/",
  backLabel,
}: PageHeaderProps) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const resolvedBackLabel = backLabel ?? t("common.backToDashboard");

  return (
    <motion.header className="page-header" {...fadeUp(reduced)}>
      <Link href={backHref} className="page-header-back">
        <ArrowLeft className="w-3.5 h-3.5" size={14} />
        {resolvedBackLabel}
      </Link>
      <div className="page-header-main">
        <div className="page-header-icon">
          <Icon className="w-5 h-5 text-accent" size={20} aria-hidden />
        </div>
        <div>
          <h1 className="page-header-title">{title}</h1>
          <p className="page-header-desc">{description}</p>
        </div>
      </div>
    </motion.header>
  );
}
