import type { Metadata } from "next";
import { FreedomCalculator } from "@/components/calculators/FreedomCalculator";
import {
  parseFreedomInflationPercent,
  parseFreedomInput,
  type SearchBag,
} from "@/lib/calculators/parse";
import { calculatorMetadata } from "@/lib/calculators/seo";

export const metadata: Metadata = calculatorMetadata("freedomDate");

function queryWasSubmitted(query: SearchBag): boolean {
  return Boolean(
    query.idade ||
      query.reserva ||
      query.aporte ||
      query.gasto ||
      query.alvo ||
      query.juro ||
      query.inflacao
  );
}

export default async function QuandoFicoLivrePage({
  searchParams,
}: {
  searchParams: Promise<SearchBag>;
}) {
  const query = await searchParams;
  return (
    <FreedomCalculator
      initial={parseFreedomInput(query)}
      inflationPercent={parseFreedomInflationPercent(query)}
      asked={queryWasSubmitted(query)}
    />
  );
}
