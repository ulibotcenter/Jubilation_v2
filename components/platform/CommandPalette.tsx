"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Command, Search } from "lucide-react";
import { useAppNavigation } from "@/hooks/useAppNavigation";
import type { MessageKey } from "@/lib/i18n/messages";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useAppStore } from "@/store/useAppStore";

const ACTIONS = [
  { id: "dashboard", labelKey: "command.goDashboard" as MessageKey, href: "/" },
  {
    id: "simulation",
    labelKey: "command.openSimulation" as MessageKey,
    href: "/simulation",
  },
  { id: "cashflow", labelKey: "nav.cashflow" as MessageKey, href: "/cash-flow" },
  { id: "settings", labelKey: "nav.settings" as MessageKey, href: "/settings" },
  {
    id: "upgrade",
    labelKey: "command.plansUpgrade" as MessageKey,
    href: "/upgrade",
  },
  {
    id: "privacy",
    labelKey: "command.openPrivacy" as MessageKey,
    href: "/privacy",
  },
  {
    id: "presentation",
    labelKey: "command.togglePresentation" as MessageKey,
    action: "presentation" as const,
  },
  {
    id: "coach",
    labelKey: "command.openCoach" as MessageKey,
    action: "coach" as const,
  },
] as const;

export function CommandPalette() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();
  const navigate = useAppNavigation();
  const togglePresentation = useAppStore((s) => s.togglePresentationMode);
  const setCoachOpen = useAppStore((s) => s.setCoachOpen);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const actionsWithLabels = useMemo(
    () =>
      ACTIONS.map((action) => ({
        ...action,
        label: t(action.labelKey),
      })),
    [t]
  );

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return actionsWithLabels;
    return actionsWithLabels.filter((a) => a.label.toLowerCase().includes(q));
  }, [query, actionsWithLabels]);

  if (!open) return null;

  return (
    <div className="command-palette-backdrop" role="dialog" aria-modal="true">
      <div className="command-palette">
        <div className="command-palette-input-wrap">
          <Search className="w-4 h-4 text-muted" size={16} />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("command.searchPlaceholder")}
            className="command-palette-input"
          />
          <span className="command-palette-kbd">
            <Command className="w-3 h-3" size={12} />K
          </span>
        </div>
        <ul className="command-palette-list">
          {filtered.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="command-palette-item"
                onClick={() => {
                  setOpen(false);
                  setQuery("");
                  if ("href" in item) {
                    if (item.href === "/") navigate("dashboard");
                    else router.push(item.href);
                  } else if (item.action === "presentation") togglePresentation();
                  else if (item.action === "coach") setCoachOpen(true);
                }}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}