"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { BottomNav } from "@/components/platform/BottomNav";
import { CoachMarks } from "@/components/platform/CoachMarks";
import { CommandPalette } from "@/components/platform/CommandPalette";
import { RetirementCoach } from "@/components/platform/RetirementCoach";
import { FloatingNav } from "@/components/layout/FloatingNav";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { LegalFooter } from "@/components/legal/LegalFooter";
import { AccountSync } from "@/components/account/AccountSync";
import { BillingSync } from "@/components/billing/BillingSync";
import { OnboardingModal } from "@/components/ui/OnboardingModal";
import { navIdFromPathname } from "@/hooks/useAppNavigation";
import { isPrivacyPath } from "@/lib/privacy/local";
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

function subscribeNoop() {
  return () => {};
}

function subscribePersistHydration(onChange: () => void) {
  const persistApi = useAppStore.persist;
  if (!persistApi?.onFinishHydration) return () => {};
  return persistApi.onFinishHydration(onChange);
}

export function AppShell({ children, enableHashSync = false }: AppShellProps) {
  const client = useSyncExternalStore(subscribeNoop, () => true, () => false);
  const persistReady = useSyncExternalStore(
    subscribePersistHydration,
    () => useAppStore.persist?.hasHydrated() ?? true,
    () => false
  );
  const hydrated = client && persistReady;
  const pathname = usePathname();
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);
  const onboardingCompleted = useAppStore((s) => s.onboarding.completed);
  const presentationMode = useAppStore((s) => s.presentationMode);
  const theme = useAppStore((s) => s.theme);
  const setActiveNav = useAppStore((s) => s.setActiveNav);
  const setTheme = useAppStore((s) => s.setTheme);

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
  const privacyRoute = isPrivacyPath(pathname);
  const showPage = onboardingCompleted || privacyRoute;

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
          {showPage ? (
            <>
              {children}
              {onboardingCompleted ? <LegalFooter /> : null}
            </>
          ) : null}
        </main>
      </div>

      {pathname === "/" && onboardingCompleted && <CoachMarks />}
      <CommandPalette />
      <RetirementCoach />
      <BillingSync />
      <AccountSync />
      {!privacyRoute && <OnboardingModal />}
    </div>
  );
}