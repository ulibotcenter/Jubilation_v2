import type { Metadata } from "next";
import { AppCta, DisclaimerBlock } from "@/components/calculators/AppCta";
import {
  CalculatorForm,
  NumberField,
} from "@/components/calculators/CalculatorForm";
import { RelatedCalculators } from "@/components/calculators/RelatedCalculators";
import { solveRetirementIncome } from "@/lib/calculators/independence";
import { parseIncomeInput, type SearchBag } from "@/lib/calculators/parse";
import { formatReais } from "@/lib/calculators/format";
import { calculatorMetadata } from "@/lib/calculators/seo";
import { PUBLIC_ENGINE_NOTE } from "@/lib/calculators/copy";
import { ASSUMPTIONS } from "@/lib/engine/assumptions";

export const metadata: Metadata = calculatorMetadata("retirementIncome");

export default async function QuantoVouReceberPage({
  searchParams,
}: {
  searchParams: Promise<SearchBag>;
}) {
  const query = await searchParams;
  const input = parseIncomeInput(query);
  const result = solveRetirementIncome(input);

  return (
    <article className="public-article">
      <p className="public-kicker">Renda sustentável</p>
      <h1>Quanto vou receber?</h1>
      <p className="public-lead">
        Você escolhe a idade de parar de trabalhar. O motor procura o maior
        gasto mensal que a reserva e os aportes ainda aguentam até a idade-alvo,
        em reais de hoje.
      </p>

      <CalculatorForm submitLabel="Calcular a renda">
        <NumberField
          name="idade"
          label="Sua idade"
          defaultValue={input.currentAge}
          min={18}
          max={80}
        />
        <NumberField
          name="aposentadoria"
          label="Idade em que você para de aportar"
          defaultValue={input.retirementAge}
          min={40}
          max={90}
          hint="Esta data fica fixa. É a pergunta desta página."
        />
        <NumberField
          name="reserva"
          label="Quanto você já tem"
          defaultValue={input.liquidWealth}
          min={0}
          max={50_000_000}
          step={1000}
          suffix="R$"
        />
        <NumberField
          name="aporte"
          label="Aporte mensal até lá"
          defaultValue={input.monthlyContribution}
          min={0}
          max={500_000}
          step={50}
          suffix="R$"
        />
        <NumberField
          name="alvo"
          label="Idade-alvo do plano"
          defaultValue={input.lifeExpectancy}
          min={55}
          max={120}
          hint="Padrão 90. Se o plano precisa durar mais, a renda cai."
        />
        <NumberField
          name="juro"
          label="Juro real ao ano"
          defaultValue={Math.round(input.realReturn * 1000) / 10}
          min={-5}
          max={ASSUMPTIONS.realReturn.max}
          step={0.1}
          suffix="%"
          hint="Padrão 4%. Premissa, não recomendação de ativo."
        />
      </CalculatorForm>

      <section className="public-result card-surface" aria-live="polite">
        {result.feasible && result.value > 0 ? (
          <>
            <p className="public-result-label">
              Renda mensal sustentável a partir dos {input.retirementAge}
            </p>
            <p className="public-result-hero">
              {formatReais(result.value)}
              <span> / mês</span>
            </p>
            <p>
              Com reserva de {formatReais(input.liquidWealth)} e aporte de{" "}
              {formatReais(input.monthlyContribution)} até os{" "}
              {input.retirementAge}, o motor acha este teto de gasto até os{" "}
              {input.lifeExpectancy} — em reais de hoje, sem zerar no caminho.
            </p>
          </>
        ) : (
          <>
            <p className="public-result-label">Não há renda sustentável</p>
            <p className="public-result-hero public-result-hero--muted">—</p>
            <p>
              Com esta data, esta reserva e este aporte, o plano não atravessa
              até os {input.lifeExpectancy} nem com gasto mínimo. Atrasar a
              data ou subir o aporte são as alavancas que o motor enxerga.
            </p>
          </>
        )}
        <p className="public-result-meta">{PUBLIC_ENGINE_NOTE}</p>
      </section>

      <section className="public-prose">
        <h2>Data fixa, renda variável</h2>
        <p>
          Esta é a outra face da mesma conta da independência financeira. Lá o
          aporte está pregado e a data se mexe; aqui a data está pregada e a
          renda se mexe. Quem está a quinze anos da aposentadoria costuma
          querer este número. Quem está a trinta, o outro.
        </p>
        <p>
          O valor já é líquido de ruína: é o maior saque mensal com o qual o
          caixa não acaba antes da idade-alvo, dadas as premissas. Não é
          garantia de mercado, não inclui o INSS nesta página, e não indica
          fundo nem título.
        </p>
      </section>

      <DisclaimerBlock variant="short" />
      <AppCta extra="No Básico o mesmo número entra no plano. O cônjuge é do Completo." />
      <RelatedCalculators current="retirementIncome" />
    </article>
  );
}
