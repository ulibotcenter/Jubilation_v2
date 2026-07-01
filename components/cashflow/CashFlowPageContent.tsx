"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader } from "@/components/layout/PageHeader";
import { Waves } from "lucide-react";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useAppStore } from "@/store/useAppStore";
import { CURRENCY_SYMBOLS } from "@/types";

export function CashFlowPageContent() {
  const { t } = useTranslation();
  const chartData = useAppStore((s) => s.chartData);
  const currency = useAppStore((s) => s.currency);
  const sym = CURRENCY_SYMBOLS[currency];

  const flow = chartData.filter((d) => (d.invested ?? 0) + (d.expenses ?? 0) > 0);

  return (
    <div className="secondary-page space-y-6">
      <PageHeader
        icon={Waves}
        title={t("cashflow.title")}
        description={t("cashflow.description")}
        backHref="/"
        backLabel={t("common.backToDashboard")}
      />
      <div className="card-surface p-4 sm:p-6">
        <h3 className="text-sm font-bold mb-4">{t("cashflow.chart.title")}</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={flow} barCategoryGap="12%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(30,41,59,0.6)" />
              <XAxis dataKey="age" tick={{ fontSize: 10, fill: "#94a3b8" }} />
              <YAxis tickFormatter={(v) => `${sym}${v >= 1000 ? `${Math.round(v / 1000)}k` : v}`} width={48} tick={{ fontSize: 10, fill: "#94a3b8" }} />
              <Tooltip />
              <Bar dataKey="expenses" stackId="a" fill="#f87171" name={t("cashflow.legend.living")} />
              <Bar dataKey="invested" stackId="a" fill="#22c55e" name={t("cashflow.legend.invested")} />
              <Bar dataKey="returns" fill="#60a5fa" name={t("cashflow.legend.returns")} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}