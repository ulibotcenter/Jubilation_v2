"use client";

import { useMemo, useState } from "react";
import { HelpCircle, Search } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { HELP_GLOSSARY } from "@/lib/helpGlossary";

export function HelpPageContent() {
  const [query, setQuery] = useState("");
  const [activeGroup, setActiveGroup] = useState<string>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return HELP_GLOSSARY.map((group) => ({
      ...group,
      entries: group.entries.filter((e) => {
        const matchesGroup = activeGroup === "all" || group.id === activeGroup;
        if (!matchesGroup) return false;
        if (!q) return true;
        return (
          e.field.toLowerCase().includes(q) ||
          e.meaning.toLowerCase().includes(q) ||
          e.usedIn.toLowerCase().includes(q)
        );
      }),
    })).filter((g) => g.entries.length > 0);
  }, [query, activeGroup]);

  const totalEntries = filtered.reduce((n, g) => n + g.entries.length, 0);

  return (
    <div className="secondary-page">
      <PageHeader
        icon={HelpCircle}
        title="Help"
        description="Field glossary for dashboard assumptions, portfolio, and simulation."
      />

      <div className="help-toolbar">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted"
            size={16}
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search fields…"
            className="search-input"
          />
        </div>
        <div className="help-filter-chips">
          <button
            type="button"
            className="help-filter-chip"
            data-active={activeGroup === "all" ? "true" : "false"}
            onClick={() => setActiveGroup("all")}
          >
            All
          </button>
          {HELP_GLOSSARY.map((g) => (
            <button
              key={g.id}
              type="button"
              className="help-filter-chip"
              data-active={activeGroup === g.id ? "true" : "false"}
              onClick={() => setActiveGroup(g.id)}
            >
              {g.title}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground mb-4">
        {totalEntries} field{totalEntries === 1 ? "" : "s"} shown
      </p>

      {filtered.length === 0 ? (
        <div className="help-empty">
          <p className="text-sm text-muted-foreground">
            No fields match your search. Try &quot;CAGR&quot;, &quot;Monte
            Carlo&quot;, or &quot;P&amp;L&quot;.
          </p>
        </div>
      ) : (
        <div className="help-sections">
          {filtered.map((group) => (
            <section key={group.id} className="help-section-card">
              <div className="help-section-head">
                <h2>{group.title}</h2>
                <p>{group.description}</p>
              </div>
              <div className="data-table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Field</th>
                      <th>What it means</th>
                      <th className="hidden md:table-cell">Where</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.entries.map((entry) => (
                      <tr key={`${group.id}-${entry.field}`}>
                        <td className="font-semibold whitespace-nowrap">
                          {entry.field}
                        </td>
                        <td className="text-muted-foreground">{entry.meaning}</td>
                        <td className="hidden md:table-cell text-xs text-muted-foreground whitespace-nowrap">
                          {entry.usedIn}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}

      <div className="help-contact-note mt-8">
        <p className="text-xs text-muted-foreground leading-relaxed">
          In-app email support is planned for a future update. Export your plan
          from Settings to share with an advisor.
        </p>
      </div>
    </div>
  );
}