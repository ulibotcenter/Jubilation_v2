"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Building2,
  Car,
  Gem,
  Home,
  Landmark,
  Loader2,
  Map,
  Package,
  PiggyBank,
  Plus,
  Search,
  Wallet,
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
  buildAssetFromPreset,
  PHYSICAL_ASSET_PRESETS,
  type PhysicalAssetPreset,
} from "@/lib/physicalAssetPresets";
import { createId } from "@/lib/engine/ids";
import { todayIsoDate } from "@/lib/engine/provenance";
import { defaultCagrForAssetClass } from "@/lib/portfolioCagr";
import { useAppStore } from "@/store/useAppStore";
import {
  type AssetClass,
  type Liquidity,
  type PortfolioAsset,
  type PriceSource,
} from "@/types";
import type { Ownership } from "@/lib/engine/canonical";

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
  cash: Wallet,
  pension: Landmark,
  fgts: PiggyBank,
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

  const [tab, setTab] = useState<TabId>("physical");
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
  const [asOf, setAsOf] = useState(todayIsoDate);
  const [realReturn, setRealReturn] = useState("0");
  const [liquidity, setLiquidity] = useState<Liquidity>("illiquid");
  const [allowSale, setAllowSale] = useState(false);
  const [ownership, setOwnership] = useState<Ownership>("holder");

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
    setAsOf(todayIsoDate());
    setRealReturn("0");
    setLiquidity("illiquid");
    setAllowSale(false);
  };

  const resetAll = useCallback(() => {
    setQuery("");
    setResults([]);
    setSelectedSearch(null);
    setTab("physical");
    resetManual();
    resetPhysical();
    setOwnership("holder");
  }, []);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 1) return;

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
      id: createId(mode === "playground" ? "sim" : "asset"),
      ticker: payload.ticker.toUpperCase(),
      name: payload.name,
      assetClass: payload.assetClass,
      quantity: payload.quantity,
      currentPrice: payload.currentPrice,
      costBasis: payload.costBasis,
      currency,
      nativeCurrency: currency,
      source: "MANUAL",
      origin: "manual",
      valueType: "user_estimate",
      asOf: new Date().toISOString().slice(0, 10),
      confidence: "high",
      allocation: 0,
      expectedCAGR: defaultCagrForAssetClass(payload.assetClass),
      priceSource: payload.priceSource,
      lastPriceAt: new Date().toISOString(),
      previousPrice: null,
      ownership,
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
    setAsOf(todayIsoDate());
    setRealReturn(String(preset.defaultRealReturn));
    setLiquidity(preset.liquidity);
    setAllowSale(preset.allowSale);
  };

  const handlePhysicalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!physicalPreset) return;

    const purchase = parseFloat(purchasePrice);
    const value = parseFloat(currentValue);
    const real = parseFloat(realReturn);

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
    if (!asOf || Number.isNaN(Date.parse(asOf))) {
      toast.error(t("toast.portfolio.invalidAsOf"));
      return;
    }
    if (!Number.isFinite(real) || real < -50 || real > 30) {
      toast.error(t("toast.portfolio.invalidRealReturn"));
      return;
    }

    const asset = buildAssetFromPreset({
      preset: physicalPreset,
      name: physicalName.trim(),
      purchase,
      value,
      asOf,
      ownership,
      currency,
      realReturn: real,
      liquidity,
      allowSale,
      portfolio,
      idPrefix: mode === "playground" ? "sim" : "asset",
    });

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

  const tabs: { id: TabId; labelKey: "portfolio.add.tab.search" | "portfolio.add.tab.physical" | "portfolio.add.tab.manual" }[] = [
    { id: "physical", labelKey: "portfolio.add.tab.physical" },
    { id: "search", labelKey: "portfolio.add.tab.search" },
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

            <label className="add-asset-field px-5 mt-3">
              <span>{t("portfolio.ownership")}</span>
              <select
                value={ownership}
                onChange={(e) => setOwnership(e.target.value as Ownership)}
              >
                <option value="holder">{t("portfolio.ownership.holder")}</option>
                <option value="spouse">{t("portfolio.ownership.spouse")}</option>
                <option value="joint">{t("portfolio.ownership.joint")}</option>
              </select>
            </label>

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
                    <label className="add-asset-field">
                      <span>{t("portfolio.add.asOf")}</span>
                      <input
                        type="date"
                        value={asOf}
                        onChange={(e) => setAsOf(e.target.value)}
                        required
                      />
                    </label>
                    <label className="add-asset-field">
                      <span>{t("portfolio.add.realReturn")}</span>
                      <input
                        type="number"
                        step="0.1"
                        value={realReturn}
                        onChange={(e) => setRealReturn(e.target.value)}
                        required
                      />
                    </label>
                    <label className="add-asset-field">
                      <span>{t("portfolio.add.liquidity")}</span>
                      <select
                        value={liquidity}
                        onChange={(e) =>
                          setLiquidity(e.target.value as Liquidity)
                        }
                      >
                        <option value="liquid">
                          {t("portfolio.add.liquidity.liquid")}
                        </option>
                        <option value="illiquid">
                          {t("portfolio.add.liquidity.illiquid")}
                        </option>
                      </select>
                    </label>
                    <label className="add-asset-field flex-row items-center gap-2 mt-6">
                      <input
                        type="checkbox"
                        checked={allowSale}
                        onChange={(e) => setAllowSale(e.target.checked)}
                      />
                      <span>{t("portfolio.add.allowSale")}</span>
                    </label>
                  </div>

                  <p className="text-[11px] text-muted-foreground">
                    {t("portfolio.add.realReturnHint")}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {t("portfolio.add.freshness", { date: asOf })}
                  </p>
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