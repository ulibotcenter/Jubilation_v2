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

// i18n-ready: labels → future next-intl keys (portfolio.add.*)

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
    toast.success(`${asset.ticker} added`, {
      description: `${asset.name} · ${asset.assetClass}`,
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
      toast.error("Enter a valid quantity");
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      toast.error("Enter a valid current price");
      return;
    }
    if (!Number.isFinite(cost) || cost < 0) {
      toast.error("Enter a valid average cost");
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
      toast.error("Check ticker, name, and quantity");
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      toast.error("Enter a valid current price");
      return;
    }
    if (!Number.isFinite(cost) || cost < 0) {
      toast.error("Enter a valid average cost");
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
    setPhysicalName(preset.defaultName);
    setPurchasePrice("");
    setCurrentValue("");
  };

  const handlePhysicalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!physicalPreset) return;

    const purchase = parseFloat(purchasePrice);
    const value = parseFloat(currentValue);

    if (!physicalName.trim()) {
      toast.error("Enter a name for this asset");
      return;
    }
    if (!Number.isFinite(purchase) || purchase < 0) {
      toast.error("Enter a valid purchase price");
      return;
    }
    if (!Number.isFinite(value) || value < 0) {
      toast.error("Enter a valid current value");
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

  const tabs: { id: TabId; label: string }[] = [
    { id: "search", label: "Search & add" },
    { id: "physical", label: "Physical & other" },
    { id: "manual", label: "Manual entry" },
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
                  Add holding
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Search markets, add real estate & personal assets, or enter manually
                </p>
              </div>
              <button
                type="button"
                className="btn-ghost p-2"
                onClick={onClose}
                aria-label="Close"
              >
                <X className="w-5 h-5" size={20} />
              </button>
            </div>

            <div className="add-asset-tabs" role="tablist">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.id}
                  data-active={tab === t.id ? "true" : "false"}
                  className="add-asset-tab"
                  onClick={() => {
                    setTab(t.id);
                    setSelectedSearch(null);
                  }}
                >
                  {t.label}
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
                    Back to results
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
                      <span>Quantity</span>
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
                      <span>Avg. cost / unit</span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={costBasis}
                        onChange={(e) => setCostBasis(e.target.value)}
                        placeholder="Your average buy price"
                        required
                      />
                    </label>
                    <label className="add-asset-field">
                      <span>Current price</span>
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
                    Market quote from {selectedSearch.exchange} · you can adjust
                    quantity and cost basis before adding.
                  </p>

                  <button type="submit" className="btn-primary w-full">
                    <Plus className="w-4 h-4" size={16} />
                    Add to portfolio
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
                      placeholder="NVDA, SPY, PETR4, VALE3, BTC, GLD…"
                      className="search-input"
                      autoFocus
                    />
                  </div>

                  <div className="add-asset-results">
                    {isSearching && (
                      <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" size={16} />
                        Searching markets…
                      </div>
                    )}

                    {!isSearching && query && results.length === 0 && (
                      <p className="text-center text-sm text-muted-foreground py-8">
                        No results. Try a ticker symbol, add a physical asset, or
                        use manual entry.
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
                    Choose another type
                  </button>

                  <div className="add-asset-physical-selected">
                    {(() => {
                      const Icon = PRESET_ICONS[physicalPreset.icon];
                      return <Icon className="w-5 h-5 text-accent" size={20} />;
                    })()}
                    <div>
                      <p className="font-semibold text-sm text-foreground">
                        {physicalPreset.label}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {physicalPreset.description}
                      </p>
                    </div>
                  </div>

                  <label className="add-asset-field">
                    <span>Asset name</span>
                    <input
                      value={physicalName}
                      onChange={(e) => setPhysicalName(e.target.value)}
                      placeholder="e.g. Beach house, 2021 Tesla Model 3"
                      required
                      autoFocus
                    />
                  </label>

                  <div className="add-asset-form-grid">
                    <label className="add-asset-field">
                      <span>Purchase price</span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={purchasePrice}
                        onChange={(e) => setPurchasePrice(e.target.value)}
                        placeholder="Original cost"
                        required
                      />
                    </label>
                    <label className="add-asset-field">
                      <span>Current value</span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={currentValue}
                        onChange={(e) => setCurrentValue(e.target.value)}
                        placeholder="Estimated value today"
                        required
                      />
                    </label>
                  </div>

                  <p className="text-[11px] text-muted-foreground">
                    Physical assets use manual valuation — refresh prices won&apos;t
                    update them. Included in net worth and allocation.
                  </p>

                  <button type="submit" className="btn-primary w-full mt-2">
                    <Plus className="w-4 h-4" size={16} />
                    Add to portfolio
                  </button>
                </form>
              ) : (
                <div className="add-asset-physical-panel">
                  <p className="text-xs text-muted-foreground mb-3">
                    Track homes, vehicles, and other assets not listed on public
                    markets — similar to ProjectionLab&apos;s real assets.
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
                            {preset.label}
                          </span>
                          <span className="text-[10px] text-muted-foreground leading-tight">
                            {preset.description}
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
                    <span>Ticker</span>
                    <input
                      value={ticker}
                      onChange={(e) => setTicker(e.target.value)}
                      placeholder="e.g. AAPL"
                      required
                    />
                  </label>
                  <label className="add-asset-field">
                    <span>Asset class</span>
                    <select
                      value={assetClass}
                      onChange={(e) =>
                        setAssetClass(e.target.value as AssetClass)
                      }
                    >
                      {ASSET_CLASS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label} — {opt.description}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="add-asset-field">
                  <span>Name</span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Company or fund name"
                    required
                  />
                </label>

                <div className="add-asset-form-grid">
                  <label className="add-asset-field">
                    <span>Quantity</span>
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
                    <span>Avg. cost / unit</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={costBasis}
                      onChange={(e) => setCostBasis(e.target.value)}
                      placeholder="Your average buy price"
                      required
                    />
                  </label>
                  <label className="add-asset-field">
                    <span>Current price</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={currentPrice}
                      onChange={(e) => setCurrentPrice(e.target.value)}
                      placeholder="Market price"
                      required
                    />
                  </label>
                </div>

                <button type="submit" className="btn-primary w-full mt-2">
                  <Plus className="w-4 h-4" size={16} />
                  Add to portfolio
                </button>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}