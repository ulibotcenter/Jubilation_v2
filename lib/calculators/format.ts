import { formatCurrencyValue } from "@/types";

const MONTHS_PT = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
] as const;

export function formatReais(value: number): string {
  return formatCurrencyValue(value, "BRL", false, "pt-BR");
}

export function formatPtMonthYear(iso: string): string {
  const month = Number(iso.slice(5, 7));
  const year = iso.slice(0, 4);
  const label = MONTHS_PT[month - 1] ?? iso.slice(5, 7);
  return `${label} de ${year}`;
}

export function formatYearsMonths(totalMonths: number): string {
  const years = Math.floor(Math.max(0, totalMonths) / 12);
  const months = Math.round(Math.max(0, totalMonths) % 12);
  if (years === 0) {
    return months === 1 ? "1 mês" : `${months} meses`;
  }
  const yearLabel = years === 1 ? "1 ano" : `${years} anos`;
  if (months === 0) return yearLabel;
  const monthLabel = months === 1 ? "1 mês" : `${months} meses`;
  return `${yearLabel} e ${monthLabel}`;
}

export function formatAgeYears(ageYears: number): string {
  const rounded = Math.round(ageYears * 10) / 10;
  if (Number.isInteger(rounded)) return `${rounded} anos`;
  return `${rounded.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} anos`;
}
