import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  commitNumericInput,
  numericTextForExternalValue,
} from "@/lib/calculators/numericInput";

describe("freedom calculator numeric fields", () => {
  it("leaves a cleared field uncommitted so a phantom 0 is not stored", () => {
    expect(commitNumericInput("")).toBeNull();
    expect(commitNumericInput("   ")).toBeNull();
    expect(numericTextForExternalValue(42, 42)).toBeNull();
    expect(numericTextForExternalValue(0, 0)).toBeNull();
  });

  it("commits the digits typed into an empty field, including an explicit 0", () => {
    expect(commitNumericInput("35")).toBe(35);
    expect(commitNumericInput("0")).toBe(0);
    expect(commitNumericInput("0.0")).toBe(0);
    expect(commitNumericInput("0,0")).toBe(0);
    expect(commitNumericInput("-0")).toBe(0);
  });

  it("accepts a pt-BR comma and an unfinished decimal without forcing 0", () => {
    expect(commitNumericInput("4,5")).toBe(4.5);
    expect(commitNumericInput("4.5")).toBe(4.5);
    expect(commitNumericInput("-2,5")).toBe(-2.5);
    expect(commitNumericInput("4.")).toBeNull();
    expect(commitNumericInput("4,")).toBeNull();
    expect(commitNumericInput("-")).toBeNull();
    expect(commitNumericInput(".")).toBeNull();
    expect(commitNumericInput(",")).toBeNull();
  });

  it("fills the field only when a slider or other parent value changes", () => {
    expect(numericTextForExternalValue(50_000, 80_000)).toBe("80000");
    expect(numericTextForExternalValue(12_000_000, 10_000_000)).toBe("10000000");
    expect(numericTextForExternalValue(90, 120)).toBe("120");
    expect(numericTextForExternalValue(4, 4)).toBeNull();
    expect(numericTextForExternalValue(4.5, 4.5)).toBeNull();
  });

  it("does not coerce an empty controlled field to 0", () => {
    const form = readFileSync("components/calculators/CalculatorForm.tsx", "utf8");
    const live = readFileSync(
      "components/calculators/LiveNumberInput.tsx",
      "utf8"
    );
    expect(form).not.toContain("onValueChange(0)");
    expect(live).not.toContain("onValueChange(0)");
    expect(form).toContain("LiveNumberInput");
    expect(live).toContain('type="number"');
    expect(live).toContain("defaultValue");
    expect(live).not.toContain("value={value}");
    expect(live).not.toContain("value={text}");
  });
});
