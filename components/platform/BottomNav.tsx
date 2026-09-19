"use client";

import { LayoutDashboard, Briefcase, FlaskConical, Waves, Settings } from "lucide-react";
import { useAppNavigation } from "@/hooks/useAppNavigation";
import type { MessageKey } from "@/lib/i18n/messages";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useAppStore } from "@/store/useAppStore";
import type { NavItemId } from "@/types";

const ITEMS: {
  id: NavItemId;
  icon: typeof LayoutDashboard;
  labelKey: MessageKey;
}[] = [
  { id: "dashboard", icon: LayoutDashboard, labelKey: "nav.mobile.home" },
  { id: "portfolio", icon: Briefcase, labelKey: "nav.portfolio" },
  { id: "simulation", icon: FlaskConical, labelKey: "nav.mobile.sim" },
  { id: "cashflow", icon: Waves, labelKey: "nav.mobile.flow" },
  { id: "settings", icon: Settings, labelKey: "nav.settings" },
];

export function BottomNav() {
  const { t } = useTranslation();
  const navigate = useAppNavigation();
  const activeNav = useAppStore((s) => s.activeNav);
  const presentationMode = useAppStore((s) => s.presentationMode);

  if (presentationMode) return null;

  return (
    <nav className="bottom-nav" aria-label={t("nav.aria.mobile")}>
      {ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            type="button"
            className="bottom-nav-item"
            data-active={activeNav === item.id ? "true" : "false"}
            aria-current={activeNav === item.id ? "page" : undefined}
            onClick={() => navigate(item.id)}
          >
            <Icon className="w-5 h-5" size={20} />
            <span>{t(item.labelKey)}</span>
          </button>
        );
      })}
    </nav>
  );
}