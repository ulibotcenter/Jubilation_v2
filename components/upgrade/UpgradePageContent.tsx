"use client";

import { Crown } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { useTranslation } from "@/lib/i18n/useTranslation";

export function UpgradePageContent() {
  const { t } = useTranslation();

  return (
    <div className="secondary-page space-y-6">
      <PageHeader
        icon={Crown}
        title={t("nav.upgrade")}
        description={t("upgrade.description")}
        backHref="/settings"
        backLabel={t("common.backToSettings")}
      />
      <div className="card-surface p-6 space-y-3">
        <h3 className="font-bold">{t("upgrade.unavailableTitle")}</h3>
        <p className="text-sm text-muted-foreground">
          {t("upgrade.unavailableBody")}
        </p>
      </div>
    </div>
  );
}
