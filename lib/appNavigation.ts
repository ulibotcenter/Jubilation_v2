import { DASHBOARD_PATH } from "@/lib/routes";
import type { DashboardTab, NavItemId } from "@/types";

export interface NavigationActions {
  setActiveNav: (id: NavItemId) => void;
  setActiveTab: (tab: DashboardTab) => void;
  closeSidebar?: () => void;
}

function scrollToSection(id: string) {
  requestAnimationFrame(() => {
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  });
}

/** Hash-only sync for dashboard sections (portfolio / simulation) */
export function syncNavFromHash(
  hash: string,
  actions: NavigationActions
): boolean {
  const id = hash.replace(/^#/, "");
  if (id === "portfolio") {
    actions.setActiveNav("portfolio");
    actions.setActiveTab("real-portfolio");
    scrollToSection("portfolio");
    return true;
  }
  if (id === "simulation") {
    actions.setActiveNav("simulation");
    actions.setActiveTab("simulation");
    scrollToSection("portfolio");
    return true;
  }
  return false;
}

export function navIdFromPathname(pathname: string): NavItemId {
  if (pathname.startsWith("/simulation")) return "simulation";
  if (pathname.startsWith("/cash-flow")) return "cashflow";
  if (pathname.startsWith("/settings")) return "settings";
  if (pathname.startsWith("/help")) return "help";
  if (pathname.startsWith(DASHBOARD_PATH)) return "dashboard";
  return "dashboard";
}