import {
  formatCurrencyValue,
  KPI_CONFIGS,
  type Currency,
  type KPIValues,
  type MonteCarloResult,
  type PortfolioAsset,
  type ProjectionYear,
  type StressTestResult,
  type UserProfile,
} from "@/types";

export interface ExportSnapshot {
  kpis: KPIValues;
  currency: Currency;
  projections: ProjectionYear[];
  portfolio: PortfolioAsset[];
  simulationIncludedAssetIds: string[];
  monteCarlo: {
    hasRun: boolean;
    lastRunAt: string | null;
    results: MonteCarloResult[];
  };
  stressTestResults: StressTestResult[];
  user: UserProfile;
}

function escapeCsv(value: string | number): string {
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildRetirementReportCsv(
  snapshot: ExportSnapshot,
  options?: { advanced?: boolean }
): string {
  const advanced = options?.advanced === true;
  const { kpis, currency, projections, portfolio, monteCarlo, user } =
    snapshot;
  const lines: string[] = [];

  lines.push("Jubilation V2 — Retirement Planning Report");
  lines.push(`Generated,${new Date().toISOString()}`);
  lines.push(`User,${escapeCsv(user.name)}`);
  lines.push(`Currency,${currency}`);
  lines.push("");

  lines.push("KEY ASSUMPTIONS");
  lines.push("Field,Value");
  for (const config of KPI_CONFIGS) {
    const val = kpis[config.field];
    const formatted =
      config.format === "currency"
        ? formatCurrencyValue(val, currency)
        : config.format === "percent"
          ? `${val}%`
          : String(val);
    lines.push(`${escapeCsv(config.label)},${escapeCsv(formatted)}`);
  }
  lines.push("");

  lines.push("YEAR-BY-YEAR PROJECTIONS");
  lines.push(
    "Year,Age,Portfolio Value,Contributions,Returns,Inflation Adjusted"
  );
  for (const row of projections) {
    lines.push(
      [
        row.year,
        row.age,
        row.portfolioValue,
        row.contributions,
        row.returns,
        row.inflationAdjusted,
      ]
        .map(escapeCsv)
        .join(",")
    );
  }
  lines.push("");

  if (advanced && snapshot.simulationIncludedAssetIds.length > 0) {
    const scoped = portfolio.filter((a) =>
      snapshot.simulationIncludedAssetIds.includes(a.id)
    );
    lines.push("SIMULATION SCOPE");
    lines.push(`Included Assets,${scoped.map((a) => a.ticker).join("; ")}`);
    lines.push("");
  }

  if (advanced && portfolio.length > 0) {
    lines.push("PORTFOLIO HOLDINGS");
    lines.push("Ticker,Name,Asset Class,Quantity,Price,Market Value");
    for (const asset of portfolio) {
      const mv = asset.quantity * asset.currentPrice;
      lines.push(
        [
          asset.ticker,
          asset.name,
          asset.assetClass,
          asset.quantity,
          asset.currentPrice,
          Math.round(mv),
        ]
          .map(escapeCsv)
          .join(",")
      );
    }
    lines.push("");
  }

  if (advanced && monteCarlo.hasRun && monteCarlo.results.length > 0) {
    lines.push("MONTE CARLO RESULTS");
    lines.push(
      "Scenario,Median Value,Success Rate,P10,P90,Last Run"
    );
    for (const r of monteCarlo.results) {
      lines.push(
        [
          r.label,
          r.medianValue,
          `${r.successRate}%`,
          r.percentile10,
          r.percentile90,
          monteCarlo.lastRunAt ?? "",
        ]
          .map(escapeCsv)
          .join(",")
      );
    }
    lines.push("");
  }

  lines.push("DISCLAIMER");
  lines.push(
    escapeCsv(
      "Educational simulation. Not consulting or an investment recommendation. Numbers depend on editable assumptions. No ticker or fund is named."
    )
  );

  return lines.join("\n");
}

export function buildRetirementReportJson(snapshot: ExportSnapshot): string {
  return JSON.stringify(
    {
      app: "Jubilation V2",
      version: "0.1.0-beta",
      generatedAt: new Date().toISOString(),
      currency: snapshot.currency,
      user: {
        name: snapshot.user.name,
        email: snapshot.user.email,
        plan: snapshot.user.plan,
      },
      assumptions: snapshot.kpis,
      simulationScope: snapshot.simulationIncludedAssetIds,
      projections: snapshot.projections,
      portfolio: snapshot.portfolio,
      monteCarlo: snapshot.monteCarlo.hasRun
        ? {
            lastRunAt: snapshot.monteCarlo.lastRunAt,
            results: snapshot.monteCarlo.results,
          }
        : null,
      stressTests: snapshot.stressTestResults,
      disclaimer:
        "Educational simulation. Not consulting or an investment recommendation. Numbers depend on editable assumptions. No ticker or fund is named.",
    },
    null,
    2
  );
}

export function downloadFile(
  content: string,
  filename: string,
  mimeType: string
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function exportRetirementReport(
  snapshot: ExportSnapshot,
  options?: { advanced?: boolean }
): {
  csvFilename: string;
  jsonFilename: string | null;
} {
  const advanced = options?.advanced === true;
  const stamp = new Date().toISOString().slice(0, 10);
  const csvFilename = advanced
    ? `jubilation-report-${stamp}.csv`
    : `jubilation-plan-${stamp}.csv`;
  const jsonFilename = advanced ? `jubilation-report-${stamp}.json` : null;

  downloadFile(
    buildRetirementReportCsv(snapshot, { advanced }),
    csvFilename,
    "text/csv;charset=utf-8"
  );

  if (advanced && jsonFilename) {
    const jsonName = jsonFilename;
    // Stagger JSON so browsers don't block dual downloads
    setTimeout(() => {
      downloadFile(
        buildRetirementReportJson(snapshot),
        jsonName,
        "application/json;charset=utf-8"
      );
    }, 400);
  }

  return { csvFilename, jsonFilename };
}