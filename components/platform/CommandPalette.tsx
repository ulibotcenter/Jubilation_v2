"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Command, Search } from "lucide-react";
import { useAppNavigation } from "@/hooks/useAppNavigation";
import { useAppStore } from "@/store/useAppStore";

const ACTIONS = [
  { id: "dashboard", label: "Go to Dashboard", href: "/" },
  { id: "simulation", label: "Open Simulation", href: "/simulation" },
  { id: "cashflow", label: "Cash Flow", href: "/cash-flow" },
  { id: "settings", label: "Settings", href: "/settings" },
  { id: "upgrade", label: "Plans & Upgrade", href: "/upgrade" },
  { id: "presentation", label: "Toggle presentation mode", action: "presentation" },
  { id: "coach", label: "Open retirement coach", action: "coach" },
] as const;

export function CommandPalette() {
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

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return ACTIONS;
    return ACTIONS.filter((a) => a.label.toLowerCase().includes(q));
  }, [query]);

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
            placeholder="Search actions…"
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