import type { Metadata } from "next";
import { AppCta, DisclaimerBlock } from "@/components/calculators/AppCta";
import {
  CalculatorForm,
  NumberField,
} from "@/components/calculators/CalculatorForm";
import { RelatedCalculators } from "@/components/calculators/RelatedCalculators";
import { solveFreedomDate } from "@/lib/calculators/independence";
import { parseFreedomInput, type SearchBag } from "@/lib/calculators/parse";
import { formatAgeYears, formatReais } from "@/lib/calculators/format";
import { calculatorMetadata } from "@/lib/calculators/seo";
import { PUBLIC_ENGINE_NOTE } from "@/lib/calculators/copy";

export const metadata: Metadata = calculatorMetadata("freedomDate");

export default async function QuandoFicoLivrePage({
  searchParams,
}: {
  searchParams: Promise<SearchBag>;
}) {
  const query = await searchParams;
  const input = parseFreedomInput(query);
  const result = solveFreedomDate(input);
  const yearsOut = result.feasible
    ? Math.max(0, Math.round(result.value) - input.currentAge)
    : null;

  return (
    <article className="public-article">
      <p className="public-kicker">Independência financeira</p>
      <h1>Quando fico livre?</h1>
      <p className="public-lead">
        Você segura o aporte mensal. O motor procura a primeira idade em que
        essa poupança, mais o que já existe, banca o custo de vida até a
        idade-alvo — em reais de hoje, com juro real à vista.
      </p>

      <CalculatorForm submitLabel="Calcular a idade">
        <NumberField
          name="idade"
          label="Sua idade"
          defaultValue={input.currentAge}
          min={18}
          max={80}
          hint="O motor começa o mês a mês daqui."
        />
        <NumberField
          name="reserva"
          label="Quanto você já tem"
          defaultValue={input.liquidWealth}
          min={0}
          max={50_000_000}
          step={1000}
          suffix="R$"
          hint="Poupança e investimentos líquidos, em reais de hoje."
        />
        <NumberField
          name="aporte"
          label="Quanto consegue guardar por mês"
          defaultValue={input.monthlyContribution}
          min={0}
          max={500_000}
          step={50}
          suffix="R$"
          hint="Este número fica fixo. É a pergunta desta página."
        />
        <NumberField
          name="gasto"
          label="Custo de vida que você quer cobrir"
          defaultValue={input.monthlySpending}
          min={100}
          max={500_000}
          step={100}
          suffix="R$"
          hint="Gasto mensal na independência, também em reais de hoje."
        />
        <NumberField
          name="alvo"
          label="Idade-alvo do plano"
          defaultValue={input.lifeExpectancy}
          min={55}
          max={120}
          hint="Padrão 90. Premissa de alto impacto — empurra o horizonte."
        />
        <NumberField
          name="juro"
          label="Juro real ao ano"
          defaultValue={Math.round(input.realReturn * 1000) / 10}
          min={-5}
          max={12}
          step={0.1}
          suffix="%"
          hint="Padrão 4%. Não é uma recomendação de investimento."
        />
      </CalculatorForm>

      <section className="public-result card-surface" aria-live="polite">
        {result.feasible ? (
          <>
            <p className="public-result-label">Com esses números, você fica livre</p>
            <p className="public-result-hero">
              aos {formatAgeYears(result.value)}
            </p>
            <p>
              {yearsOut === 0
                ? "Pelo motor, o patamar já se sustenta a partir de agora."
                : `Faltam cerca de ${yearsOut} ${yearsOut === 1 ? "ano" : "anos"} guardando ${formatReais(input.monthlyContribution)} por mês, com reserva de ${formatReais(input.liquidWealth)} e um custo de ${formatReais(input.monthlySpending)}.`}
            </p>
          </>
        ) : (
          <>
            <p className="public-result-label">Não fecha até a idade-alvo</p>
            <p className="public-result-hero public-result-hero--muted">—</p>
            <p>
              Com este aporte e esta reserva, o motor não acha uma idade em que
              o dinheiro cubra {formatReais(input.monthlySpending)} por mês até
              os {input.lifeExpectancy}. Subir o aporte, baixar o custo ou
              alongar o horizonte muda a conta — e isso é premissa, não mágica.
            </p>
          </>
        )}
        <p className="public-result-meta">{PUBLIC_ENGINE_NOTE}</p>
      </section>

      <section className="public-prose">
        <h2>O que esta conta faz — e o que ela não faz</h2>
        <p>
          Independência financeira, aqui, é uma data: o mês em que você poderia
          parar de aportar e mesmo assim pagar o custo de vida até a idade-alvo,
          sem zerar o caixa no caminho. Não é um produto para comprar, nem um
          ticker para escolher.
        </p>
        <p>
          O juro real padrão é o do motor (4% ao ano). Inflação entra na
          equação de Fisher, não é somada duas vezes. Imposto desta página está
          desligado de propósito — o app liga quando você pede o plano
          completo.
        </p>
      </section>

      <DisclaimerBlock variant="short" />
      <AppCta extra="No Básico você troca o aporte, inclui a carteira e vê o mesmo número no gráfico." />
      <RelatedCalculators current="freedomDate" />
    </article>
  );
}
