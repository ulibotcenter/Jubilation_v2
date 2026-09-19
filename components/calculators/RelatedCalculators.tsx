import Link from "next/link";
import { CALCULATOR_PATHS, CALCULATOR_SEO, type CalculatorPathId } from "@/lib/calculators/seo";

export function RelatedCalculators({ current }: { current: CalculatorPathId }) {
  const ids = (["freedomDate", "retirementIncome", "inss"] as const).filter(
    (id) => id !== current
  );
  return (
    <nav className="public-related" aria-label="Outras calculadoras">
      <h2>Outras perguntas</h2>
      <ul>
        {ids.map((id) => (
          <li key={id}>
            <Link href={CALCULATOR_PATHS[id]}>{CALCULATOR_SEO[id].title}</Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
