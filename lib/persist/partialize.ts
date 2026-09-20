/**
 * Slice written to localStorage.
 * `user` and `household` must stay here: omitting them drops the Settings
 * profile and the spouse card on reload (merge used to see `undefined` and
 * fall back to the demo user / KPI-only household).
 */
export function partializePersistedState<
  T extends {
    locale: unknown;
    currency: unknown;
    country: unknown;
    manualEffectiveTaxRatePct: unknown;
    modelSeedActive: unknown;
    fxSnapshot: unknown;
    onboarding: unknown;
    sidebarCollapsed: unknown;
    persistVersion: unknown;
    tenant: unknown;
    institutions: unknown;
    accounts: unknown;
    entitlements: unknown;
    consents: unknown;
    consentAuditLog: unknown;
    connectorSync: unknown;
    household: unknown;
    user: unknown;
    explainSimple: unknown;
    theme: unknown;
    coachMarksDismissed: unknown;
    sensitivity: unknown;
    netWorthSnapshots: unknown;
    aiChatHistory: unknown;
    savedScenarios: unknown;
    kpis: unknown;
    kpiOutsidePortfolio: unknown;
    portfolio: unknown;
    portfolioLastRefreshedAt: unknown;
    simulationIncludedAssetIds: unknown;
    monteCarlo: unknown;
    simPlayground: unknown;
  },
>(state: T) {
  return {
    locale: state.locale,
    currency: state.currency,
    country: state.country,
    manualEffectiveTaxRatePct: state.manualEffectiveTaxRatePct,
    modelSeedActive: state.modelSeedActive,
    fxSnapshot: state.fxSnapshot,
    onboarding: state.onboarding,
    sidebarCollapsed: state.sidebarCollapsed,
    persistVersion: state.persistVersion,
    tenant: state.tenant,
    institutions: state.institutions,
    accounts: state.accounts,
    entitlements: state.entitlements,
    consents: state.consents,
    consentAuditLog: state.consentAuditLog,
    connectorSync: state.connectorSync,
    household: state.household,
    user: state.user,
    planTier: "free" as const,
    explainSimple: state.explainSimple,
    theme: state.theme,
    coachMarksDismissed: state.coachMarksDismissed,
    sensitivity: state.sensitivity,
    netWorthSnapshots: state.netWorthSnapshots,
    aiChatHistory: state.aiChatHistory,
    savedScenarios: state.savedScenarios,
    kpis: state.kpis,
    kpiOutsidePortfolio: state.kpiOutsidePortfolio,
    portfolio: state.portfolio,
    portfolioLastRefreshedAt: state.portfolioLastRefreshedAt,
    simulationIncludedAssetIds: state.simulationIncludedAssetIds,
    monteCarlo: state.monteCarlo,
    simPlayground: state.simPlayground,
  };
}
