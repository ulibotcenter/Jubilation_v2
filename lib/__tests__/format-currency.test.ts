import { describe, expect, it } from "vitest";
import { t } from "@/lib/i18n/messages";
import { formatCurrencyValue } from "@/types";

describe("formatCurrencyValue", () => {
  it("prints BRL as integer reais with a regular space, pt-BR grouping", () => {
    expect(formatCurrencyValue(3401, "BRL", false, "pt-BR")).toBe("R$ 3.401");
    expect(formatCurrencyValue(12000, "BRL", false, "pt-BR")).toBe("R$ 12.000");
    expect(formatCurrencyValue(8599, "BRL", false, "pt-BR")).toBe("R$ 8.599");
  });

  it("does not keep currency cents on whole-real amounts", () => {
    const formatted = formatCurrencyValue(3401, "BRL", false, "pt-BR");
    expect(formatted).not.toMatch(/,\d/);
    expect(formatted).not.toMatch(/\u00a0|\u202f/);
  });

  it("rounds interpolated floats before formatting", () => {
    expect(formatCurrencyValue(3400.6, "BRL", false, "pt-BR")).toBe("R$ 3.401");
  });

  it("keeps a space between the amount and /mês in shortfall copy", () => {
    const amount = formatCurrencyValue(8599, "BRL", false, "pt-BR");
    expect(t("pt", "income.shortfall", { params: { amount } })).toBe(
      "Faltam R$ 8.599 / mês para a sua meta"
    );
  });
});
