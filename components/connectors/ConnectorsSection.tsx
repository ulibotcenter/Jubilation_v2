"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Link2 } from "lucide-react";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { canUseConnectors } from "@/lib/plans";
import { useAppStore } from "@/store/useAppStore";

/**
 * B3 and file import. Hidden as controls on free; the three origin totals
 * stay on the dashboard either way.
 */
export function ConnectorsSection({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const planTier = useAppStore((s) => s.planTier);
  const open = canUseConnectors(planTier);

  if (!open) {
    return (
      <section
        id="connectors"
        className="settings-page-card"
        data-connectors="locked"
      >
        <div className="settings-page-card-head">
          <Link2 className="w-4 h-4 text-accent" size={16} />
          <h2>{t("settings.connectors.title")}</h2>
        </div>
        <p className="settings-page-card-body">
          {t("settings.connectors.lockedBody")}
        </p>
        <Link href="/upgrade" className="btn-secondary mt-4 inline-flex">
          {t("nav.upgrade")}
        </Link>
      </section>
    );
  }

  return (
    <div id="connectors" data-connectors="open" className="contents">
      {children}
    </div>
  );
}
