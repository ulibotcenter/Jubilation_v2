"use client";

import { useState } from "react";
import {
  ChevronDown,
  Download,
  Globe,
  Loader2,
  PanelLeft,
  Settings,
  Sparkles,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { exportRetirementReport } from "@/lib/exportReport";
import { getCrossRate } from "@/lib/fx/convert";
import { useAppStore } from "@/store/useAppStore";
import { CURRENCIES, type Currency } from "@/types";

export function SettingsPageContent() {
  const currency = useAppStore((s) => s.currency);
  const changeCurrency = useAppStore((s) => s.changeCurrency);
  const isChangingCurrency = useAppStore((s) => s.isChangingCurrency);
  const fxSnapshot = useAppStore((s) => s.fxSnapshot);
  const user = useAppStore((s) => s.user);
  const isExporting = useAppStore((s) => s.isExporting);
  const setExporting = useAppStore((s) => s.setExporting);
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed);
  const [pendingCurrency, setPendingCurrency] = useState<Currency | null>(null);

  const handleCurrencyChange = async (code: Currency) => {
    if (code === currency || isChangingCurrency) return;
    setPendingCurrency(code);
    const previous = currency;
    try {
      const snapshot = await changeCurrency(code);
      const rate = getCrossRate(previous, code, snapshot.rates);
      toast.success(`Currency switched to ${code}`, {
        description: `Live rate · 1 ${previous} = ${rate.toFixed(4)} ${code}`,
      });
    } catch {
      toast.error("Currency conversion failed", {
        description: "Could not fetch live rates. Try again shortly.",
      });
    } finally {
      setPendingCurrency(null);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await new Promise((r) => setTimeout(r, 350));
      const state = useAppStore.getState();
      const { csvFilename, jsonFilename } = exportRetirementReport({
        kpis: state.kpis,
        currency: state.currency,
        projections: state.projections,
        portfolio: state.portfolio,
        simulationIncludedAssetIds: state.simulationIncludedAssetIds,
        monteCarlo: state.monteCarlo,
        stressTestResults: state.stressTestResults,
        user: state.user,
      });
      toast.success("Report exported", {
        description: `Downloaded ${csvFilename} and ${jsonFilename}.`,
      });
    } catch {
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  };

  const handleUpgrade = () => {
    toast.info("Pro plans coming soon!", {
      description: "Monthly and yearly plans will be available at launch.",
    });
  };

  const fxDate = fxSnapshot?.date;
  const usdToDisplay = fxSnapshot
    ? getCrossRate("USD", currency, fxSnapshot.rates)
    : null;

  return (
    <div className="secondary-page">
      <PageHeader
        icon={Settings}
        title="Settings"
        description="Currency, account, and data preferences for your retirement plan."
      />

      <div className="settings-page-grid">
        <section className="settings-page-card settings-page-card--featured">
          <div className="settings-page-card-head">
            <Globe className="w-4 h-4 text-accent" size={16} />
            <h2>Display currency</h2>
          </div>
          <p className="settings-page-card-body">
            Switching currency fetches live exchange rates and converts your
            KPIs, portfolio values, and income goals automatically.
          </p>

          <div className="settings-currency-options">
            {CURRENCIES.map((c) => {
              const active = currency === c.code;
              const loading = pendingCurrency === c.code && isChangingCurrency;
              return (
                <button
                  key={c.code}
                  type="button"
                  className="settings-currency-option"
                  data-active={active ? "true" : "false"}
                  disabled={isChangingCurrency}
                  onClick={() => void handleCurrencyChange(c.code)}
                >
                  <span className="settings-currency-symbol">{c.symbol}</span>
                  <span className="settings-currency-name">{c.name}</span>
                  <span className="settings-currency-code">{c.code}</span>
                  {loading && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin ml-auto" size={14} />
                  )}
                </button>
              );
            })}
          </div>

          {fxSnapshot && (
            <div className="settings-fx-meta">
              <p>
                Rates as of{" "}
                <span className="text-foreground font-medium">{fxDate}</span>
                {usdToDisplay && currency !== "USD" && (
                  <>
                    {" · "}
                    <span className="tabular-nums">
                      1 USD = {usdToDisplay.toFixed(4)} {currency}
                    </span>
                  </>
                )}
              </p>
              <p className="text-[10px] mt-1 opacity-80">
                Source: Frankfurter (ECB reference) · refreshed on each switch
              </p>
            </div>
          )}
        </section>

        <section className="settings-page-card">
          <div className="settings-page-card-head">
            <User className="w-4 h-4 text-accent" size={16} />
            <h2>Account</h2>
          </div>
          <p className="settings-page-card-body font-medium text-foreground">
            {user.name}
          </p>
          <p className="text-sm text-muted-foreground">{user.email}</p>
          <span className="settings-plan-badge">{user.plan} plan</span>
          <button
            type="button"
            className="btn-upgrade mt-4"
            onClick={handleUpgrade}
          >
            <Sparkles className="w-3.5 h-3.5" size={14} />
            Upgrade to Pro
          </button>
        </section>

        <section className="settings-page-card">
          <div className="settings-page-card-head">
            <Download className="w-4 h-4 text-accent" size={16} />
            <h2>Export data</h2>
          </div>
          <p className="settings-page-card-body">
            Download CSV projections and a JSON snapshot of your full plan.
          </p>
          <button
            type="button"
            className="btn-secondary gap-1.5"
            onClick={handleExport}
            disabled={isExporting}
          >
            <Download className="w-4 h-4" size={16} />
            {isExporting ? "Exporting…" : "Export report"}
          </button>
        </section>

        <section className="settings-page-card">
          <div className="settings-page-card-head">
            <PanelLeft className="w-4 h-4 text-accent" size={16} />
            <h2>Navigation</h2>
          </div>
          <p className="settings-page-card-body">
            Desktop floating nav is{" "}
            <span className="text-foreground font-medium">
              {sidebarCollapsed ? "collapsed" : "expanded"}
            </span>
            . Use the control at the bottom of the left menu to toggle.
          </p>
          <p className="text-[11px] text-muted-foreground mt-3">
            Jubilation V2 Beta · v0.1.0
          </p>
        </section>
      </div>
    </div>
  );
}