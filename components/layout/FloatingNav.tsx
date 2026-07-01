"use client";

import { motion } from "framer-motion";
import {
  Briefcase,
  HelpCircle,
  LayoutDashboard,
  LineChart,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Waves,
} from "lucide-react";
import { useAppNavigation } from "@/hooks/useAppNavigation";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useAppStore } from "@/store/useAppStore";
import { NAV_ITEMS, type NavItemId } from "@/types";

const ICON_MAP = {
  LayoutDashboard,
  Briefcase,
  LineChart,
  Waves,
  Settings,
  HelpCircle,
} as const;

const NAV_I18N: Record<NavItemId, "nav.dashboard" | "nav.portfolio" | "nav.simulation" | "nav.cashflow" | "nav.settings" | "nav.help"> = {
  dashboard: "nav.dashboard",
  portfolio: "nav.portfolio",
  simulation: "nav.simulation",
  cashflow: "nav.cashflow",
  settings: "nav.settings",
  help: "nav.help",
};

export function FloatingNav() {
  const activeNav = useAppStore((s) => s.activeNav);
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed);
  const toggleSidebarCollapsed = useAppStore((s) => s.toggleSidebarCollapsed);
  const navigate = useAppNavigation();
  const { t } = useTranslation();
  const presentationMode = useAppStore((s) => s.presentationMode);

  const items = NAV_ITEMS.filter((item) => item.showInSidebar);

  if (presentationMode) return null;

  return (
    <nav
      className="floating-nav"
      data-collapsed={sidebarCollapsed ? "true" : "false"}
      aria-label="Main navigation"
    >
      <div className="floating-nav-glow" aria-hidden="true" />

      <ul className="floating-nav-list">
        {items.map((item) => {
          const Icon =
            ICON_MAP[item.icon as keyof typeof ICON_MAP] ?? LayoutDashboard;
          const isActive = activeNav === item.id;

          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => navigate(item.id)}
                data-active={isActive ? "true" : "false"}
                className="floating-nav-link"
                title={sidebarCollapsed ? t(NAV_I18N[item.id]) : undefined}
              >
                {isActive && (
                  <motion.span
                    layoutId="floating-nav-active"
                    className="floating-nav-active-bg"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                <Icon className="w-4 h-4 shrink-0 relative z-1" size={16} />
                <span className="floating-nav-label">{t(NAV_I18N[item.id])}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={toggleSidebarCollapsed}
        className="floating-nav-collapse"
        aria-label={sidebarCollapsed ? "Expand navigation" : "Collapse navigation"}
      >
        {sidebarCollapsed ? (
          <PanelLeftOpen className="w-4 h-4" size={16} />
        ) : (
          <>
            <PanelLeftClose className="w-4 h-4" size={16} />
            <span className="floating-nav-label">Collapse</span>
          </>
        )}
      </button>
    </nav>
  );
}