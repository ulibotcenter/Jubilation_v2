"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { BottomNav } from "@/components/platform/BottomNav";
import { CoachMarks } from "@/components/platform/CoachMarks";
import { CommandPalette } from "@/components/platform/CommandPalette";
import { RetirementCoach } from "@/components/platform/RetirementCoach";
import { FloatingNav } from "@/components/layout/FloatingNav";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { OnboardingModal } from "@/components/ui/OnboardingModal";
import { navIdFromPathname } from "@/hooks/useAppNavigation";
import { useAppStore } from "@/store/useAppStore";

interface AppShellProps {
  children: ReactNode;
  /** Sync hash sections when on dashboard route */
  enableHashSync?: boolean;
}

function ShellSkeleton() {
  return (
    <div className="app-shell">
      <div className="app-main">
        <div className="topbar">
          <div className="h-6 w-32 bg-surface-elevated/60 rounded-lg skeleton" />
          <div className="h-9 w-52 bg-surface-elevated/60 rounded-lg skeleton" />
        </div>
        <div className="app-content space-y-6">
          <div className="hero-card h-40 skeleton" />
          <div className="card-surface h-64 skeleton" />
        </div>
      </div>
    </div>
  );
}

export function AppShell({ children, enableHashSync = false }: AppShellProps) {
  const [hydrated, setHydrated] = useState(false);
  const pathname = usePathname();
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);
  const presentationMode = useAppStore((s) => s.presentationMode);
  const theme = useAppStore((s) => s.theme);
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen);
  const setActiveNav = useAppStore((s) => s.setActiveNav);
  const setTheme = useAppStore((s) => s.setTheme);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    setTheme(theme);
  }, [hydrated, theme, setTheme]);

  useEffect(() => {
    if (!hydrated) return;
    setActiveNav(navIdFromPathname(pathname));
  }, [hydrated, pathname, setActiveNav]);

  useEffect(() => {
    if (!hydrated || !enableHashSync || pathname !== "/") return;

    const applyHash = () => {
      const hash = window.location.hash;
      if (hash === "#portfolio") {
        setActiveNav("portfolio");
        requestAnimationFrame(() => {
          document.getElementById("portfolio")?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        });
      }
    };

    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, [hydrated, enableHashSync, pathname, setActiveNav]);

  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  if (!hydrated) return <ShellSkeleton />;

  const showChrome = !presentationMode;

  return (
    <div
      className="app-shell"
      data-presentation={presentationMode ? "true" : "false"}
    >
      {showChrome && <Sidebar />}
      {showChrome && <FloatingNav />}
      <BottomNav />

      <div className="app-main">
        <Topbar />
        <main className="app-content max-w-[var(--content-max-width)] mx-auto w-full safe-area-bottom">
          {children}
        </main>
      </div>

      {pathname === "/" && <CoachMarks />}
      <CommandPalette />
      <RetirementCoach />
      <OnboardingModal />
    </div>
  );
}