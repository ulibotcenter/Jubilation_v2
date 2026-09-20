import type { BillingCurrency } from "@/lib/billing/catalog";

/** Plan prices keep cents (R$ 14,90 / € 3,90). KPIs elsewhere round to units. */
export function formatPlanAmount(
  unitAmount: number,
  currency: BillingCurrency,
  locale: string
): string {
  const value = unitAmount / 100;
  const fractionDigits = Number.isInteger(value) ? 0 : 2;
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: 2,
    })
      .format(value)
      .replace(/\u00a0|\u202f/g, " ");
  } catch {
    return `${value.toFixed(fractionDigits)} ${currency.toUpperCase()}`;
  }
}
