"use client";

import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n/useTranslation";
import type { MessageKey } from "@/lib/i18n/messages";
import type { HouseholdScope } from "@/lib/engine/household";
import { useAppStore } from "@/store/useAppStore";

const SCOPES: HouseholdScope[] = ["holder", "spouse", "both"];

export function HouseholdScopeToggle() {
  const { t } = useTranslation();
  const household = useAppStore((s) => s.household);
  const setHouseholdScope = useAppStore((s) => s.setHouseholdScope);
  const hasSpouse = Boolean(household.spouse);

  const onSelect = (scope: HouseholdScope) => {
    if (!hasSpouse && scope !== "holder") {
      toast.message(t("household.scope.disabled"));
      return;
    }
    setHouseholdScope(scope);
    toast.success(
      t("household.scope.toast", {
        label: t(`household.scope.${scope}` as MessageKey),
      })
    );
  };

  return (
    <div
      className="household-scope-toggle"
      role="group"
      aria-label={t("household.scope.ariaLabel")}
    >
      <span className="household-scope-label">{t("household.scope.trigger")}</span>
      {SCOPES.map((scope) => {
        const disabled = !hasSpouse && scope !== "holder";
        return (
          <button
            key={scope}
            type="button"
            data-active={household.scope === scope ? "true" : "false"}
            disabled={disabled}
            onClick={() => onSelect(scope)}
          >
            {t(`household.scope.${scope}` as MessageKey)}
          </button>
        );
      })}
    </div>
  );
}
