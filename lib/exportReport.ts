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

function pdfEscape(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

/** One-page formatted PDF for Completo. Not a second planning engine. */
export function buildFormattedPlanPdf(snapshot: ExportSnapshot): Uint8Array {
  const lines = [
    "Jubilation — planejamento, nao consultoria",
    `Moeda: ${snapshot.currency}`,
    `Idade: ${snapshot.kpis.currentAge}`,
    `Aporte mensal: ${snapshot.kpis.monthlyContribution}`,
    `Idade-alvo: ${snapshot.kpis.retirementAge}`,
    `Posicoes: ${snapshot.portfolio.length}`,
    ...snapshot.portfolio.slice(0, 12).map((asset) => {
      const value = Math.round(asset.quantity * asset.currentPrice);
      return `${asset.ticker}  ${asset.assetClass}  ${value}`;
    }),
    "Simulacao educativa. Nao e consultoria nem recomendacao.",
    "Os numeros dependem das premissas que voce edita.",
  ];
  const commands = ["BT", "/F1 11 Tf", "48 780 Td", "14 TL"];
  lines.forEach((line, index) => {
    const text = pdfEscape(line).slice(0, 96);
    commands.push(index === 0 ? `(${text}) Tj` : `T* (${text}) Tj`);
  });
  commands.push("ET");
  const stream = commands.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Count 1 /Kids [3 0 R] >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let body = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(body.length);
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = body.length;
  body += `xref\n0 ${objects.length + 1}\n`;
  body += "0000000000 65535 f \n";
  for (let index = 1; index < offsets.length; index += 1) {
    body += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(body);
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
    // Stagger so browsers don't drop the extra downloads
    setTimeout(() => {
      downloadFile(
        buildRetirementReportJson(snapshot),
        jsonName,
        "application/json;charset=utf-8"
      );
    }, 400);
    setTimeout(() => {
      downloadFile(
        new TextDecoder().decode(buildFormattedPlanPdf(snapshot)),
        `jubilation-plano-${stamp}.pdf`,
        "application/pdf"
      );
    }, 800);
  }

  return { csvFilename, jsonFilename };
}