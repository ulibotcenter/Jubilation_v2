"use client";

import { useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";
import type { NavItemId } from "@/types";

const ROUTES: Record<NavItemId, string> = {
  dashboard: "/",
  portfolio: "/",
  simulation: "/simulation",
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
        if (pathname !== "/") {
          router.push("/#portfolio");
        } else {
          scrollToPortfolio();
        }
        return;
      }

      if (id === "dashboard") {
        if (pathname !== "/") {
          router.push("/");
        } else {
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

export function navIdFromPathname(pathname: string): NavItemId {
  if (pathname.startsWith("/simulation")) return "simulation";
  if (pathname.startsWith("/settings")) return "settings";
  if (pathname.startsWith("/help")) return "help";
  return "dashboard";
}