"use client";

import { useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { DASHBOARD_PATH, DASHBOARD_PORTFOLIO_PATH } from "@/lib/routes";
import { useAppStore } from "@/store/useAppStore";
import type { NavItemId } from "@/types";

const ROUTES: Record<NavItemId, string> = {
  dashboard: DASHBOARD_PATH,
  portfolio: DASHBOARD_PORTFOLIO_PATH,
  simulation: "/simulation",
  cashflow: "/cash-flow",
  settings: "/settings",
  help: "/help",
};

function scrollToPortfolio() {
  requestAnimationFrame(() => {
    document.getElementById("portfolio")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  });
}

export function useAppNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const setActiveNav = useAppStore((s) => s.setActiveNav);
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen);

  const navigate = useCallback(
    (id: NavItemId) => {
      setActiveNav(id);
      setSidebarOpen(false);

      if (id === "portfolio") {
        if (pathname !== DASHBOARD_PATH) {
          router.push(DASHBOARD_PORTFOLIO_PATH);
        } else if (window.location.hash !== "#portfolio") {
          window.location.hash = "portfolio";
        } else {
          scrollToPortfolio();
        }
        return;
      }

      if (id === "dashboard") {
        if (pathname !== DASHBOARD_PATH) {
          router.push(DASHBOARD_PATH);
        } else {
          if (window.location.hash) {
            window.history.pushState(null, "", DASHBOARD_PATH);
            window.dispatchEvent(new HashChangeEvent("hashchange"));
          }
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
        return;
      }

      const target = ROUTES[id];
      if (pathname !== target) {
        router.push(target);
      }
    },
    [pathname, router, setActiveNav, setSidebarOpen]
  );

  return navigate;
}