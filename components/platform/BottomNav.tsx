"use client";

import { LayoutDashboard, Briefcase, FlaskConical, Waves, Settings } from "lucide-react";
import { useAppNavigation } from "@/hooks/useAppNavigation";
import { useAppStore } from "@/store/useAppStore";
import type { NavItemId } from "@/types";

const ITEMS: { id: NavItemId; icon: typeof LayoutDashboard; label: string }[] = [
  { id: "dashboard", icon: LayoutDashboard, label: "Home" },
  { id: "portfolio", icon: Briefcase, label: "Portfolio" },
  { id: "simulation", icon: FlaskConical, label: "Sim" },
  { id: "cashflow", icon: Waves, label: "Flow" },
  { id: "settings", icon: Settings, label: "Settings" },
];

export function BottomNav() {
  const navigate = useAppNavigation();
  const activeNav = useAppStore((s) => s.activeNav);
  const presentationMode = useAppStore((s) => s.presentationMode);

  if (presentationMode) return null;

  return (
    <nav className="bottom-nav" aria-label="Mobile navigation">
      {ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            type="button"
            className="bottom-nav-item"
            data-active={activeNav === item.id ? "true" : "false"}
            onClick={() => navigate(item.id)}
          >
            <Icon className="w-5 h-5" size={20} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}