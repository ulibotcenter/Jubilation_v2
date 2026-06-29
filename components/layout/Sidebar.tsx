"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Briefcase,
  HelpCircle,
  LayoutDashboard,
  LineChart,
  Settings,
  X,
} from "lucide-react";
import { Logo } from "@/components/common/Logo";
import { useAppNavigation } from "@/hooks/useAppNavigation";
import { useAppStore } from "@/store/useAppStore";
import { NAV_ITEMS } from "@/types";

const ICON_MAP = {
  LayoutDashboard,
  Briefcase,
  LineChart,
  Settings,
  HelpCircle,
} as const;

export function Sidebar() {
  const activeNav = useAppStore((s) => s.activeNav);
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen);
  const navigate = useAppNavigation();
  const sidebarItems = NAV_ITEMS.filter((item) => item.showInSidebar);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [setSidebarOpen]);

  return (
    <>
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            className="sidebar-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      <aside
        className="sidebar"
        data-open={sidebarOpen ? "true" : "false"}
        aria-hidden={!sidebarOpen}

      >
        <div className="sidebar-header">
          <Logo size="sm" showTagline />
          <button
            type="button"
            className="btn-ghost p-2"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation menu"
          >
            <X className="w-5 h-5" size={20} />
          </button>
        </div>

        <nav className="flex-1 px-2 sm:px-3 py-4 space-y-1 overflow-y-auto scrollbar-hide">
          {sidebarItems.map((item, index) => {
            const Icon =
              ICON_MAP[item.icon as keyof typeof ICON_MAP] ??
              LayoutDashboard;
            const isActive = activeNav === item.id;

            return (
              <motion.button
                key={item.id}
                type="button"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05, duration: 0.2 }}
                onClick={() => navigate(item.id)}
                data-active={isActive ? "true" : "false"}
                className="sidebar-link w-full border-none cursor-pointer"

              >
                <Icon className="w-4 h-4 shrink-0" size={16} />
                <span className="sidebar-link-label">{item.label}</span>
              </motion.button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <p className="text-[10px] text-muted-foreground leading-relaxed px-1">
            Jubilation V2 Beta · v0.1.0
          </p>

        </div>
      </aside>
    </>
  );
}