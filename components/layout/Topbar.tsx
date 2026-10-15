"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  Download,
  Menu,
  Monitor,
  Sparkles,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/common/Logo";
import { LocaleThemeControls } from "@/components/platform/LocaleThemeControls";
import { exportRetirementReport } from "@/lib/exportReport";
import { canUseAdvancedExport } from "@/lib/plans";
import { getCrossRate } from "@/lib/fx/convert";
import type { MessageKey } from "@/lib/i18n/messages";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useAppStore } from "@/store/useAppStore";
import { CURRENCIES, type Currency } from "@/types";

export function Topbar() {
  const router = useRouter();
  const { t } = useTranslation();
  const currency = useAppStore((s) => s.currency);
  const changeCurrency = useAppStore((s) => s.changeCurrency);
  const isChangingCurrency = useAppStore((s) => s.isChangingCurrency);
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen);
  const user = useAppStore((s) => s.user);
  const planTier = useAppStore((s) => s.planTier);
  const presentationMode = useAppStore((s) => s.presentationMode);
  const togglePresentationMode = useAppStore((s) => s.togglePresentationMode);
  const isExporting = useAppStore((s) => s.isExporting);
  const setExporting = useAppStore((s) => s.setExporting);

  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const currencyRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);

  const selectedCurrency = CURRENCIES.find((c) => c.code === currency)!;

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        currencyRef.current &&
        !currencyRef.current.contains(e.target as Node)
      ) {
        setCurrencyOpen(false);
      }
      if (
        avatarRef.current &&
        !avatarRef.current.contains(e.target as Node)
      ) {
        setAvatarOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleCurrencyChange = async (code: Currency) => {
    if (code === currency || isChangingCurrency) return;
    const previous = currency;
    setCurrencyOpen(false);
    try {
      const snapshot = await changeCurrency(code);
      const rate = getCrossRate(previous, code, snapshot.rates);
      toast.success(t("toast.currency.success", { code }), {
        description: t("toast.currency.rate", {
          from: previous,
          rate: rate.toFixed(4),
          to: code,
        }),
      });
    } catch {
      toast.error(t("toast.currency.error"), {
        description: t("toast.currency.errorDesc"),
      });
    }
  };

  const handleUpgrade = () => {
    router.push("/upgrade");
  };

  const handleSignIn = () => {
    router.push("/settings#cloud-account");
  };

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      await new Promise((r) => setTimeout(r, 350));
      const state = useAppStore.getState();
      const advanced = canUseAdvancedExport(state.planTier);
      const { csvFilename, jsonFilename } = exportRetirementReport(
        {
          kpis: state.kpis,
          currency: state.currency,
          projections: state.projections,
          portfolio: state.portfolio,
          simulationIncludedAssetIds: state.simulationIncludedAssetIds,
          monteCarlo: state.monteCarlo,
          stressTestResults: state.stressTestResults,
          user: state.user,
        },
        { advanced }
      );
      toast.success(t("toast.export.success"), {
        description: jsonFilename
          ? t("toast.export.successDesc", {
              csv: csvFilename,
              json: jsonFilename,
            })
          : t("toast.export.successBasic", { csv: csvFilename }),
      });
    } catch {
      toast.error(t("toast.export.error"), {
        description: t("toast.export.errorDesc"),
      });
    } finally {
      setExporting(false);
    }
  }, [setExporting, t]);

  return (
    <header className="topbar">
      {/* Left: mobile menu + logo */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          className="btn-ghost p-2 topbar-menu-btn"
          onClick={() => setSidebarOpen(true)}
          aria-label={t("nav.aria.openMenu")}
        >
          <Menu className="w-5 h-5" size={20} />
        </button>
        <Logo size="sm" />
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <LocaleThemeControls />

        {/* Currency dropdown */}
        <div ref={currencyRef} className="relative">
          <button
            type="button"
            onClick={() => setCurrencyOpen((o) => !o)}
            className="btn-secondary text-sm py-1.5 px-2.5 sm:px-3 gap-1.5"
            aria-expanded={currencyOpen}
            aria-haspopup="listbox"
            disabled={isChangingCurrency}
          >
            <span className="font-semibold">{selectedCurrency.symbol}</span>
            <span className="hidden sm:inline text-muted-foreground">
              {selectedCurrency.label}
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${currencyOpen ? "rotate-180" : ""}`}
              size={14}
            />
          </button>

          <AnimatePresence>
            {currencyOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.97 }}
                transition={{ duration: 0.15 }}
                className="dropdown-menu absolute right-0 top-full mt-1.5 z-50"
                role="listbox"
              >
                {CURRENCIES.map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    role="option"
                    aria-selected={currency === c.code}
                    data-active={currency === c.code ? "true" : "false"}
                    className="dropdown-item"
                    onClick={() => handleCurrencyChange(c.code)}
                  >
                    <span className="font-semibold w-6">{c.symbol}</span>
                    <span>{c.name}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Presentation mode */}
        <button
          type="button"
          onClick={togglePresentationMode}
          className="btn-ghost hidden md:inline-flex gap-1.5"
          aria-label={
            presentationMode ? t("presentation.off") : t("presentation.on")
          }
        >
          <Monitor className="w-4 h-4" size={16} />
          <span className="hidden lg:inline">
            {presentationMode ? t("presentation.off") : t("presentation.on")}
          </span>
        </button>

        {/* Export — desktop */}
        <button
          type="button"
          onClick={handleExport}
          disabled={isExporting}
          className="btn-ghost hidden sm:inline-flex gap-1.5"
          aria-label={t("export.report")}
        >
          <Download className="w-4 h-4" size={16} />
          <span>
            {isExporting ? t("settings.export.exporting") : t("export.label")}
          </span>
        </button>

        {/* Upgrade — TODO: Stripe + Supabase */}
        <button
          type="button"
          onClick={handleUpgrade}
          className="btn-upgrade"
          aria-label={t("nav.upgrade")}
        >
          <Sparkles className="w-3.5 h-3.5" size={14} />
          <span>{t("nav.upgrade")}</span>
        </button>

        {/* Avatar dropdown */}
        <div ref={avatarRef} className="relative">
          <button
            type="button"
            onClick={() => setAvatarOpen((o) => !o)}
            className="flex items-center justify-center w-9 h-9 rounded-full bg-surface-elevated border border-border hover:border-accent/40 transition-colors duration-200"
            aria-label="User menu"
            aria-expanded={avatarOpen}
          >
            <User className="w-4 h-4 text-muted-foreground" size={16} />
          </button>

          <AnimatePresence>
            {avatarOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.97 }}
                transition={{ duration: 0.15 }}
                className="dropdown-menu absolute right-0 top-full mt-1.5 z-50 w-52"
              >
                <div className="px-3 py-2.5 border-b border-border">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {user.name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user.email}
                  </p>
                  <span className="inline-flex mt-1.5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide rounded-full bg-accent/15 text-accent">
                    {t("plan.currentBadge", {
                      plan: t(`plan.${planTier}` as MessageKey),
                    })}
                  </span>
                </div>
                <button
                  type="button"
                  className="dropdown-item sm:hidden"
                  onClick={() => {
                    setAvatarOpen(false);
                    handleExport();
                  }}
                >
                  <Download className="w-4 h-4" size={16} />
                  {t("export.report")}
                </button>
                <button
                  type="button"
                  className="dropdown-item"
                  data-login-entry="menu"
                  onClick={() => {
                    setAvatarOpen(false);
                    handleSignIn();
                  }}
                >
                  <User className="w-4 h-4" size={16} />
                  {t("nav.signIn")}
                </button>
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    setAvatarOpen(false);
                    handleUpgrade();
                  }}
                >
                  <Sparkles className="w-4 h-4" size={16} />
                  {t("nav.upgrade")}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}