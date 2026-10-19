import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function collectSourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      collectSourceFiles(path, acc);
      continue;
    }
    if (/\.(tsx|ts|css)$/.test(entry.name)) acc.push(path);
  }
  return acc;
}

describe("no orange chat widget", () => {
  it("does not keep the RetirementCoach file or a hidden toggle", () => {
    expect(existsSync("components/platform/RetirementCoach.tsx")).toBe(false);

    const shell = readFileSync("components/layout/AppShell.tsx", "utf8");
    expect(shell).not.toContain("RetirementCoach");
    expect(shell).not.toContain("coach-fab");

    const palette = readFileSync(
      "components/platform/CommandPalette.tsx",
      "utf8"
    );
    expect(palette).not.toContain("command.openCoach");
    expect(palette).not.toContain("setCoachOpen");
    expect(palette).not.toContain('action: "coach"');

    const landing = readFileSync("components/landing/LandingView.tsx", "utf8");
    const chrome = readFileSync(
      "components/calculators/PublicChrome.tsx",
      "utf8"
    );
    const layout = readFileSync("app/layout.tsx", "utf8");
    expect(landing).not.toContain("RetirementCoach");
    expect(chrome).not.toContain("RetirementCoach");
    expect(layout).not.toMatch(/next\/script|intercom|crisp|tawk/i);
  });

  it("does not render a coach-fab bubble in app UI", () => {
    const files = [
      ...collectSourceFiles("app"),
      ...collectSourceFiles("components"),
    ];
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      expect(source).not.toContain("coach-fab");
      expect(source).not.toContain("coach-panel");
    }
  });
});
