"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Briefcase, LineChart } from "lucide-react";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useAppStore } from "@/store/useAppStore";
import type { DashboardTab } from "@/types";
import { RealPortfolio } from "./RealPortfolio";
import { SimulationTab } from "./SimulationTab";

const TAB_IDS: DashboardTab[] = ["real-portfolio", "simulation"];

export function PortfolioTabs() {
  const { t } = useTranslation();
  const activeTab = useAppStore((s) => s.activeTab);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const setActiveNav = useAppStore((s) => s.setActiveNav);
  const portfolio = useAppStore((s) => s.portfolio);
  const projections = useAppStore((s) => s.projections);

  const handleTabChange = (id: DashboardTab) => {
    setActiveTab(id);
    setActiveNav(id === "real-portfolio" ? "portfolio" : "simulation");
  };

  const tabMeta = {
    "real-portfolio": {
      label: t("tabs.realPortfolio.label"),
      description: t("tabs.realPortfolio.description"),
      icon: Briefcase,
      badge: `${portfolio.length}`,
      order: "1",
    },
    simulation: {
      label: t("tabs.simulation.label"),
      description: t("tabs.simulation.description"),
      icon: LineChart,
      badge: `${projections.length}y`,
      order: "2",
    },
  } as const;

  return (
    <section
      aria-label={t("tabs.aria.section")}
      className="card-surface overflow-hidden"
    >
      <div
        className="tab-list px-2 sm:px-4"
        role="tablist"
        aria-label={t("tabs.aria.tablist")}
      >
        {TAB_IDS.map((id) => {
          const tab = tabMeta[id];
          const Icon = tab.icon;
          const isActive = activeTab === id;

          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${id}`}
              id={`tab-${id}`}
              onClick={() => handleTabChange(id)}
              data-active={isActive ? "true" : "false"}
              className="tab-trigger flex items-center gap-2"
            >
              <Icon className="w-4 h-4 shrink-0" size={16} aria-hidden="true" />
              <span className="flex flex-col items-start leading-tight">
                <span className="flex items-center gap-1.5">
                  {tab.label}
                  <span
                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                      isActive
                        ? "bg-accent/20 text-accent"
                        : "bg-surface-elevated text-muted-foreground"
                    }`}
                  >
                    {tab.badge}
                  </span>
                </span>
                <span className="text-[10px] text-muted-foreground font-normal hidden sm:block">
                  {tab.description}
                  <span className="ml-1 opacity-50">· {tab.order}</span>
                </span>
              </span>
              {isActive && (
                <motion.div
                  layoutId="tab-indicator"
                  className="tab-indicator"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="p-4 sm:p-6">
        <AnimatePresence mode="wait">
          {activeTab === "real-portfolio" ? (
            <motion.div
              key="real-portfolio"
              id="panel-real-portfolio"
              role="tabpanel"
              aria-labelledby="tab-real-portfolio"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            >
              <RealPortfolio />
            </motion.div>
          ) : (
            <motion.div
              key="simulation"
              id="panel-simulation"
              role="tabpanel"
              aria-labelledby="tab-simulation"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            >
              <SimulationTab />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}