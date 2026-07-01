"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Table2 } from "lucide-react";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useAppStore } from "@/store/useAppStore";
import { formatCurrencyValue, type ProjectionYear } from "@/types";

type TableRow =
  | { kind: "data"; row: ProjectionYear }
  | { kind: "gap"; hiddenCount: number };

function buildCollapsedRows(projections: ProjectionYear[]): TableRow[] {
  if (projections.length <= 3) {
    return projections.map((row) => ({ kind: "data", row }));
  }

  const midpointIdx = Math.floor(projections.length / 2);
  const keyIndices = [
    0,
    midpointIdx,
    projections.length - 1,
  ].filter((v, i, arr) => arr.indexOf(v) === i);

  const rows: TableRow[] = [];
  for (let i = 0; i < keyIndices.length; i++) {
    const idx = keyIndices[i];
    const prevIdx = i > 0 ? keyIndices[i - 1] : -1;
    const hidden = idx - prevIdx - 1;
    if (hidden > 0) {
      rows.push({ kind: "gap", hiddenCount: hidden });
    }
    rows.push({ kind: "data", row: projections[idx] });
  }

  return rows;
}

function ProjectionRow({
  row,
  retirementAge,
  currency,
}: {
  row: ProjectionYear;
  retirementAge: number;
  currency: ReturnType<typeof useAppStore.getState>["currency"];
}) {
  const isRetirement = row.age === retirementAge;

  return (
    <tr className={isRetirement ? "bg-accent/5 !border-accent/20" : ""}>
      <td className={isRetirement ? "text-accent font-semibold" : ""}>
        {row.year}
        {isRetirement && (
          <span className="ml-1.5 text-[9px] uppercase tracking-wide text-accent">
            ★
          </span>
        )}
      </td>
      <td>{row.age}</td>
      <td className="font-semibold">
        {formatCurrencyValue(row.portfolioValue, currency)}
      </td>
      <td className="hidden sm:table-cell">
        {row.contributions > 0
          ? formatCurrencyValue(row.contributions, currency)
          : "—"}
      </td>
      <td
        className={`hidden sm:table-cell ${
          row.returns >= 0 ? "text-green-400" : "text-red-400"
        }`}
      >
        {row.returns !== 0
          ? formatCurrencyValue(row.returns, currency)
          : "—"}
      </td>
      <td className="text-muted-foreground">
        {formatCurrencyValue(row.inflationAdjusted, currency)}
      </td>
    </tr>
  );
}

interface ProjectionTableProps {
  mode?: "real" | "playground";
}

export function ProjectionTable({ mode = "real" }: ProjectionTableProps) {
  const { t } = useTranslation();
  const realProjections = useAppStore((s) => s.projections);
  const simProjections = useAppStore((s) => s.simPlayground.projections);
  const projections = mode === "playground" ? simProjections : realProjections;
  const currency = useAppStore((s) => s.currency);
  const realKpis = useAppStore((s) => s.kpis);
  const simKpis = useAppStore((s) => s.simPlayground.kpis);
  const kpis = mode === "playground" ? simKpis : realKpis;
  const [expanded, setExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const showCollapsed = isMobile && !expanded;
  const tableRows: TableRow[] = useMemo(
    () =>
      showCollapsed
        ? buildCollapsedRows(projections)
        : projections.map((row: ProjectionYear) => ({
            kind: "data" as const,
            row,
          })),
    [showCollapsed, projections, kpis.retirementAge]
  );

  return (
    <motion.div
      className="card-surface p-4 sm:p-6"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 }}
    >
      <div className="flex items-start gap-3 mb-4">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-accent/10 shrink-0">
          <Table2 className="w-4 h-4 text-accent" size={16} />
        </div>
        <div>
          <h3 className="text-base sm:text-lg font-bold text-foreground">
            {t("simulation.table.title")}
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            {t("simulation.table.subtitle")}
          </p>
        </div>
      </div>

      <div
        className={`data-table-wrapper ${showCollapsed ? "data-table-wrapper--compact" : ""}`}
      >
        <table className="data-table">
          <thead>
            <tr>
              <th>{t("simulation.table.column.year")}</th>
              <th>{t("simulation.table.column.age")}</th>
              <th>{t("simulation.table.column.portfolio")}</th>
              <th className="hidden sm:table-cell">
                {t("simulation.table.column.contributions")}
              </th>
              <th className="hidden sm:table-cell">
                {t("simulation.table.column.returns")}
              </th>
              <th>{t("simulation.table.column.realValue")}</th>
            </tr>
          </thead>
          <tbody>
            {tableRows.map((entry: TableRow, i: number) =>
              entry.kind === "gap" ? (
                <tr key={`gap-${i}`} className="projection-table-gap">
                  <td colSpan={6}>
                    <span className="projection-table-gap-label">
                      {entry.hiddenCount === 1
                        ? t("simulation.table.moreYearsOne")
                        : t("simulation.table.moreYears", {
                            n: entry.hiddenCount,
                          })}
                    </span>
                  </td>
                </tr>
              ) : (
                <ProjectionRow
                  key={entry.row.year}
                  row={entry.row}
                  retirementAge={kpis.retirementAge}
                  currency={currency}
                />
              )
            )}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {isMobile && projections.length > 3 && (
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setExpanded((v) => !v)}
            className="projection-table-toggle"
            aria-expanded={expanded}
          >
            {expanded
              ? t("simulation.table.showKeyYears")
              : t("simulation.table.showAllYears", {
                  n: projections.length,
                })}
            <ChevronDown
              className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`}
              size={16}
            />
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
}