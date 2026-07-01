"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTranslation } from "@/lib/i18n/useTranslation";

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
  const resolvedBackLabel = backLabel ?? t("common.backToDashboard");

  return (
    <header className="page-header">
      <Link href={backHref} className="page-header-back">
        <ArrowLeft className="w-3.5 h-3.5" size={14} />
        {resolvedBackLabel}
      </Link>
      <div className="page-header-main">
        <div className="page-header-icon">
          <Icon className="w-5 h-5 text-accent" size={20} />
        </div>
        <div>
          <h1 className="page-header-title">{title}</h1>
          <p className="page-header-desc">{description}</p>
        </div>
      </div>
    </header>
  );
}