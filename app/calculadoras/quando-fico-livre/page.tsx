import type { Metadata } from "next";
import { FreedomCalculator } from "@/components/calculators/FreedomCalculator";
import { parseFreedomInput, type SearchBag } from "@/lib/calculators/parse";
import { calculatorMetadata } from "@/lib/calculators/seo";

export const metadata: Metadata = calculatorMetadata("freedomDate");

export default async function QuandoFicoLivrePage({
  searchParams,
}: {
  searchParams: Promise<SearchBag>;
}) {
  const query = await searchParams;
  const input = parseFreedomInput(query);
  return <FreedomCalculator initial={input} />;
}
