"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Building2,
  Car,
  Gem,
  Home,
  Loader2,
  Map,
  Package,
  Plus,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  ASSET_CLASS_OPTIONS,
  searchMarketTickers,
} from "@/lib/marketClient";
import type { MarketSearchResult } from "@/lib/market/types";
import {
  getAssetClassLabel,
  getPhysicalPresetDefaultName,
  getPhysicalPresetDescription,
  getPhysicalPresetLabel,
} from "@/lib/i18n/resolve";
import { useTranslation } from "@/lib/i18n/useTranslation";
import {
  generatePhysicalTicker,
  PHYSICAL_ASSET_PRESETS,
  type PhysicalAssetPreset,
} from "@/lib/physicalAssetPresets";
import { useAppStore } from "@/store/useAppStore";
import {
  type AssetClass,
  type PortfolioAsset,
  type PriceSource,
} from "@/types";

interface AddAssetModalProps {
  open: boolean;
  onClose: () => void;
  mode?: "real" | "playground";
}

type TabId = "search" | "manual" | "physical";

const PRESET_ICONS = {
  home: Home,
  building: Building2,
  car: Car,
  land: Map,
  gem: Gem,
  custom: Package,
} as const;

export function AddAssetModal({
  open,
  onClose,
  mode = "real",
}: AddAssetModalProps) {
  const { t, locale } = useTranslation();
  const currency = useAppStore((s) => s.currency);
  const realPortfolio = useAppStore((s) => s.portfolio);
  const simPortfolio = useAppStore((s) => s.simPlayground.portfolio);
  const portfolio = mode === "playground" ? simPortfolio : realPortfolio;
  const addPortfolioAsset = useAppStore((s) => s.addPortfolioAsset);
  const addSimPortfolioAsset = useAppStore((s) => s.addSimPortfolioAsset);
  const addAsset = mode === "playground" ? addSimPortfolioAsset : addPortfolioAsset;

  const [tab, setTab] = useState<TabId>("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MarketSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedSearch, setSelectedSearch] = useState<MarketSearchResult | null>(
    null
  );

  const [ticker, setTicker] = useState("");
  const [name, setName] = useState("");
  const [assetClass, setAssetClass] = useState<AssetClass>("stocks");
  const [quantity, setQuantity] = useState("10");
  const [costBasis, setCostBasis] = useState("");
  const [currentPrice, setCurrentPrice] = useState("");

  const [physicalPreset, setPhysicalPreset] = useState<PhysicalAssetPreset | null>(
    null
  );
  const [physicalName, setPhysicalName] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [currentValue, setCurrentValue] = useState("");

  const resetManual = () => {
    setTicker("");
    setName("");
    setAssetClass("stocks");
    setQuantity("10");
    setCostBasis("");
    setCurrentPrice("");
  };

  const resetPhysical = () => {
    setPhysicalPreset(null);
    setPhysicalName("");
    setPurchasePrice("");
    setCurrentValue("");
  };

  const resetAll = useCallback(() => {
    setQuery("");
    setResults([]);
    setSelectedSearch(null);
    setTab("search");
    resetManual();
    resetPhysical();
  }, []);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 1) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const found = await searchMarketTickers(q);
        setResults(found);
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query, open]);

  const commitAsset = (payload: {
    ticker: string;
    name: string;
    assetClass: AssetClass;
    quantity: number;
    currentPrice: number;
    costBasis: number;
    priceSource: PriceSource;
  }) => {
    const asset: PortfolioAsset = {
      id: mode === "playground" ? `sim-asset-${Date.now()}` : `asset-${Date.now()}`,
      ticker: payload.ticker.toUpperCase(),
      name: payload.name,
      assetClass: payload.assetClass,
      quantity: payload.quantity,
      currentPrice: payload.currentPrice,
      costBasis: payload.costBasis,
      currency,
      allocation: 0,
      priceSource: payload.priceSource,
      lastPriceAt: new Date().toISOString(),
      previousPrice: null,
    };

    addAsset(asset);
    toast.success(t("toast.portfolio.added", { ticker: asset.ticker }), {
      description: t("toast.portfolio.addedDesc", {
        name: asset.name,
        assetClass: getAssetClassLabel(locale, asset.assetClass),
      }),
    });
    resetAll();
    onClose();
  };

  const handleSelectSearch = (item: MarketSearchResult) => {
    setSelectedSearch(item);
    setQuantity("10");
    setCostBasis(
      item.currentPrice > 0
        ? String(Math.round(item.currentPrice * 0.92 * 100) / 100)
        : ""
    );
    setCurrentPrice(String(item.currentPrice));
  };

  const handleSearchConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSearch) return;

    const qty = parseFloat(quantity);
    const price = parseFloat(currentPrice);
    const cost = parseFloat(costBasis);

    if (!Number.isFinite(qty) || qty <= 0) {
      toast.error(t("toast.portfolio.invalidQuantity"));
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      toast.error(t("toast.portfolio.invalidPrice"));
      return;
    }
    if (!Number.isFinite(cost) || cost < 0) {
      toast.error(t("toast.portfolio.invalidCost"));
      return;
    }

    commitAsset({
      ticker: selectedSearch.ticker,
      name: selectedSearch.name,
      assetClass: selectedSearch.assetClass,
      quantity: qty,
      currentPrice: price,
      costBasis: cost,
      priceSource: selectedSearch.priceSource,
    });
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(quantity);
    const price = parseFloat(currentPrice);
    const cost = parseFloat(costBasis);

    if (!ticker.trim() || !name.trim() || !Number.isFinite(qty) || qty <= 0) {
      toast.error(t("toast.portfolio.checkFields"));
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      toast.error(t("toast.portfolio.invalidPrice"));
      return;
    }
    if (!Number.isFinite(cost) || cost < 0) {
      toast.error(t("toast.portfolio.invalidCost"));
      return;
    }

    commitAsset({
      ticker: ticker.trim(),
      name: name.trim(),
      assetClass,
      quantity: qty,
      currentPrice: price,
      costBasis: cost,
      priceSource: "manual",
    });
  };

  const handlePhysicalPreset = (preset: PhysicalAssetPreset) => {
    setPhysicalPreset(preset);
    setPhysicalName(getPhysicalPresetDefaultName(locale, preset.id));
    setPurchasePrice("");
    setCurrentValue("");
  };

  const handlePhysicalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!physicalPreset) return;

    const purchase = parseFloat(purchasePrice);
    const value = parseFloat(currentValue);

    if (!physicalName.trim()) {
      toast.error(t("toast.portfolio.invalidName"));
      return;
    }
    if (!Number.isFinite(purchase) || purchase < 0) {
      toast.error(t("toast.portfolio.invalidPurchase"));
      return;
    }
    if (!Number.isFinite(value) || value < 0) {
      toast.error(t("toast.portfolio.invalidValue"));
      return;
    }

    const generatedTicker = generatePhysicalTicker(
      physicalPreset.tickerPrefix,
      portfolio
    );

    commitAsset({
      ticker: generatedTicker,
      name: physicalName.trim(),
      assetClass: physicalPreset.assetClass,
      quantity: 1,
      currentPrice: value,
      costBasis: purchase,
      priceSource: "manual",
    });
  };

  const tabs: { id: TabId; labelKey: "portfolio.add.tab.search" | "portfolio.add.tab.physical" | "portfolio.add.tab.manual" }[] = [
    { id: "search", labelKey: "portfolio.add.tab.search" },
    { id: "physical", labelKey: "portfolio.add.tab.physical" },
    { id: "manual", labelKey: "portfolio.add.tab.manual" },
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="add-asset-modal-root"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div
            className="add-asset-modal-backdrop"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            className="add-asset-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-asset-title"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.22 }}
          >
            <div className="add-asset-modal-header">
              <div>
                <h2 id="add-asset-title" className="text-lg font-bold text-foreground">
                  {t("portfolio.add.title")}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("portfolio.add.subtitle")}
                </p>
              </div>
              <button
                type="button"
                className="btn-ghost p-2"
                onClick={onClose}
                aria-label={t("common.close")}
              >
                <X className="w-5 h-5" size={20} />
              </button>
            </div>

            <div className="add-asset-tabs" role="tablist">
              {tabs.map((tabItem) => (
                <button
                  key={tabItem.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === tabItem.id}
                  data-active={tab === tabItem.id ? "true" : "false"}
                  className="add-asset-tab"
                  onClick={() => {
                    setTab(tabItem.id);
                    setSelectedSearch(null);
                  }}
                >
                  {t(tabItem.labelKey)}
                </button>
              ))}
            </div>

            {tab === "search" ? (
              selectedSearch ? (
                <form
                  className="add-asset-confirm-panel"
                  onSubmit={handleSearchConfirm}
                >
                  <button
                    type="button"
                    className="add-asset-back-btn"
                    onClick={() => setSelectedSearch(null)}
                  >
                    <ArrowLeft className="w-3.5 h-3.5" size={14} />
                    {t("portfolio.add.backResults")}
                  </button>

                  <div className="add-asset-confirm-header">
                    <div className="min-w-0">
                      <p className="font-bold text-foreground">
                        {selectedSearch.ticker}
                        <span className="ml-2 text-[10px] font-medium text-accent uppercase">
                          {selectedSearch.assetClass}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {selectedSearch.name}
                      </p>
                    </div>
                    <p className="text-sm font-semibold tabular-nums shrink-0">
                      {selectedSearch.currentPrice.toLocaleString("en-US", {
                        style: "currency",
                        currency: selectedSearch.currency,
                      })}
                    </p>
                  </div>

                  <div className="add-asset-form-grid">
                    <label className="add-asset-field">
                      <span>{t("portfolio.add.quantity")}</span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        autoFocus
                        required
                      />
                    </label>
                    <label className="add-asset-field">
                      <span>{t("portfolio.add.avgCost")}</span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={costBasis}
                        onChange={(e) => setCostBasis(e.target.value)}
                        placeholder={t("portfolio.add.avgCostPlaceholder")}
                        required
                      />
                    </label>
                    <label className="add-asset-field">
                      <span>{t("portfolio.add.currentPrice")}</span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={currentPrice}
                        onChange={(e) => setCurrentPrice(e.target.value)}
                        required
                      />
                    </label>
                  </div>

                  <p className="text-[11px] text-muted-foreground">
                    {t("portfolio.add.marketQuote", {
                      exchange: selectedSearch.exchange,
                    })}
                  </p>

                  <button type="submit" className="btn-primary w-full">
                    <Plus className="w-4 h-4" size={16} />
                    {t("portfolio.add.submit")}
                  </button>
                </form>
              ) : (
                <div className="add-asset-search-panel">
                  <div className="relative">
                    <Search
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted"
                      size={16}
                    />
                    <input
                      type="search"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder={t("portfolio.add.searchPlaceholder")}
                      className="search-input"
                      autoFocus
                    />
                  </div>

                  <div className="add-asset-results">
                    {isSearching && (
                      <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" size={16} />
                        {t("portfolio.add.searching")}
                      </div>
                    )}

                    {!isSearching && query && results.length === 0 && (
                      <p className="text-center text-sm text-muted-foreground py-8">
                        {t("portfolio.add.noResults")}
                      </p>
                    )}

                    {!isSearching &&
                      results.map((item) => (
                        <button
                          key={`${item.ticker}-${item.exchange}`}
                          type="button"
                          className="add-asset-result-row"
                          onClick={() => handleSelectSearch(item)}
                        >
                          <div className="min-w-0 text-left">
                            <p className="font-semibold text-sm text-foreground">
                              {item.ticker}
                              <span className="ml-2 text-[10px] font-medium text-accent uppercase">
                                {item.assetClass}
                              </span>
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {item.name}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-semibold tabular-nums">
                              {item.currentPrice.toLocaleString("en-US", {
                                style: "currency",
                                currency: item.currency,
                              })}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {item.exchange} · {item.priceSource}
                            </p>
                          </div>
                          <Plus className="w-4 h-4 text-accent shrink-0" size={16} />
                        </button>
                      ))}
                  </div>
                </div>
              )
            ) : tab === "physical" ? (
              physicalPreset ? (
                <form className="add-asset-form" onSubmit={handlePhysicalSubmit}>
                  <button
                    type="button"
                    className="add-asset-back-btn"
                    onClick={() => setPhysicalPreset(null)}
                  >
                    <ArrowLeft className="w-3.5 h-3.5" size={14} />
                    {t("portfolio.add.chooseType")}
                  </button>

                  <div className="add-asset-physical-selected">
                    {(() => {
                      const Icon = PRESET_ICONS[physicalPreset.icon];
                      return <Icon className="w-5 h-5 text-accent" size={20} />;
                    })()}
                    <div>
                      <p className="font-semibold text-sm text-foreground">
                        {getPhysicalPresetLabel(locale, physicalPreset.id)}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {getPhysicalPresetDescription(locale, physicalPreset.id)}
                      </p>
                    </div>
                  </div>

                  <label className="add-asset-field">
                    <span>{t("portfolio.add.assetName")}</span>
                    <input
                      value={physicalName}
                      onChange={(e) => setPhysicalName(e.target.value)}
                      placeholder={t("portfolio.add.assetNamePlaceholder")}
                      required
                      autoFocus
                    />
                  </label>

                  <div className="add-asset-form-grid">
                    <label className="add-asset-field">
                      <span>{t("portfolio.add.purchasePrice")}</span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={purchasePrice}
                        onChange={(e) => setPurchasePrice(e.target.value)}
                        placeholder={t("portfolio.add.purchasePricePlaceholder")}
                        required
                      />
                    </label>
                    <label className="add-asset-field">
                      <span>{t("portfolio.add.currentValue")}</span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={currentValue}
                        onChange={(e) => setCurrentValue(e.target.value)}
                        placeholder={t("portfolio.add.currentValuePlaceholder")}
                        required
                      />
                    </label>
                  </div>

                  <p className="text-[11px] text-muted-foreground">
                    {t("portfolio.add.physicalNote")}
                  </p>

                  <button type="submit" className="btn-primary w-full mt-2">
                    <Plus className="w-4 h-4" size={16} />
                    {t("portfolio.add.submit")}
                  </button>
                </form>
              ) : (
                <div className="add-asset-physical-panel">
                  <p className="text-xs text-muted-foreground mb-3">
                    {t("portfolio.add.physicalIntro")}
                  </p>
                  <div className="add-asset-preset-grid">
                    {PHYSICAL_ASSET_PRESETS.map((preset) => {
                      const Icon = PRESET_ICONS[preset.icon];
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          className="add-asset-preset-card"
                          onClick={() => handlePhysicalPreset(preset)}
                        >
                          <Icon className="w-5 h-5 text-accent" size={20} />
                          <span className="font-semibold text-sm text-foreground">
                            {getPhysicalPresetLabel(locale, preset.id)}
                          </span>
                          <span className="text-[10px] text-muted-foreground leading-tight">
                            {getPhysicalPresetDescription(locale, preset.id)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )
            ) : (
              <form className="add-asset-form" onSubmit={handleManualSubmit}>
                <div className="add-asset-form-grid">
                  <label className="add-asset-field">
                    <span>{t("portfolio.add.ticker")}</span>
                    <input
                      value={ticker}
                      onChange={(e) => setTicker(e.target.value)}
                      placeholder={t("portfolio.add.tickerPlaceholder")}
                      required
                    />
                  </label>
                  <label className="add-asset-field">
                    <span>{t("portfolio.add.assetClass")}</span>
                    <select
                      value={assetClass}
                      onChange={(e) =>
                        setAssetClass(e.target.value as AssetClass)
                      }
                    >
                      {ASSET_CLASS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {getAssetClassLabel(locale, opt.value)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="add-asset-field">
                  <span>{t("portfolio.add.name")}</span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t("portfolio.add.namePlaceholder")}
                    required
                  />
                </label>

                <div className="add-asset-form-grid">
                  <label className="add-asset-field">
                    <span>{t("portfolio.add.quantity")}</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      required
                    />
                  </label>
                  <label className="add-asset-field">
                    <span>{t("portfolio.add.avgCost")}</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={costBasis}
                      onChange={(e) => setCostBasis(e.target.value)}
                      placeholder={t("portfolio.add.avgCostPlaceholder")}
                      required
                    />
                  </label>
                  <label className="add-asset-field">
                    <span>{t("portfolio.add.currentPrice")}</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={currentPrice}
                      onChange={(e) => setCurrentPrice(e.target.value)}
                      placeholder={t("portfolio.add.marketPricePlaceholder")}
                      required
                    />
                  </label>
                </div>

                <button type="submit" className="btn-primary w-full mt-2">
                  <Plus className="w-4 h-4" size={16} />
                  {t("portfolio.add.submit")}
                </button>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}