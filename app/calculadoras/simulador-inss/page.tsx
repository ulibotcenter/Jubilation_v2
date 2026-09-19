import type { Metadata } from "next";
import { AppCta, DisclaimerBlock } from "@/components/calculators/AppCta";
import {
  CalculatorForm,
  NumberField,
  SelectField,
} from "@/components/calculators/CalculatorForm";
import { RelatedCalculators } from "@/components/calculators/RelatedCalculators";
import { simulatePublicInss } from "@/lib/calculators/inssPublic";
import { parseInssInput, type SearchBag } from "@/lib/calculators/parse";
import {
  formatAgeYears,
  formatPtMonthYear,
  formatReais,
  formatYearsMonths,
} from "@/lib/calculators/format";
import {
  calculatorMetadata,
  PUBLIC_CALCULATOR_AS_OF,
} from "@/lib/calculators/seo";
import { INSS_NOT_OFFICIAL, PUBLIC_ENGINE_NOTE } from "@/lib/calculators/copy";
import { DEFAULT_PARAMETER_SET, paramsForYear } from "@/lib/engine/parameters";

export const metadata: Metadata = calculatorMetadata("inss");

function ageMonthsLabel(months: number): string {
  return formatYearsMonths(months);
}

export default async function SimuladorInssPage({
  searchParams,
}: {
  searchParams: Promise<SearchBag>;
}) {
  const query = await searchParams;
  const input = parseInssInput(query);
  const view = simulatePublicInss(input);
  const year = paramsForYear(
    DEFAULT_PARAMETER_SET,
    Number(PUBLIC_CALCULATOR_AS_OF.slice(0, 4))
  );
  const missingCarencia = Math.max(0, 180 - view.carenciaMonths);

  return (
    <article className="public-article">
      <p className="public-kicker">Simulação educativa · regras de 2026</p>
      <h1>Simulador INSS — idade, carência e transição</h1>
      <p className="public-lead">
        Uma leitura leiga do que o motor já calcula: se a carência fecha, quais
        regras de transição você alcança, e um valor inicial estimado.{" "}
        {INSS_NOT_OFFICIAL}
      </p>

      <CalculatorForm submitLabel="Simular regras">
        <SelectField
          name="sexo"
          label="Sexo no RGPS"
          defaultValue={input.sex}
          hint="As idades mínimas da reforma ainda são diferentes."
        >
          <option value="F">Mulher</option>
          <option value="M">Homem</option>
        </SelectField>
        <NumberField
          name="idade"
          label="Sua idade hoje"
          defaultValue={input.age}
          min={18}
          max={80}
        />
        <NumberField
          name="anos"
          label="Anos de contribuição (CLT ou 20%)"
          defaultValue={input.contributionYears}
          min={0}
          max={50}
          step={0.5}
          hint="Meses com carteira ou contribuição de 20%. MEI de 5% é outra conversa — o app trata isso."
        />
        <NumberField
          name="salario"
          label="Salário de contribuição típico"
          defaultValue={input.monthlyWage}
          min={0}
          max={50_000}
          step={50}
          suffix="R$"
          hint="Usamos esse valor em reais de hoje em todo o histórico sintético."
        />
        <SelectField
          name="antes2019"
          label="Começou a contribuir antes de 13/11/2019?"
          defaultValue={input.filiatedBeforeReform ? "sim" : "nao"}
          hint="Quem já era filiado entra nas regras de transição. Quem começou depois, na permanente."
        >
          <option value="sim">Sim — regras de transição</option>
          <option value="nao">Não — regra permanente</option>
        </SelectField>
        <SelectField
          name="professor"
          label="Magistério da educação básica?"
          defaultValue={input.teacher ? "sim" : "nao"}
        >
          <option value="nao">Não</option>
          <option value="sim">Sim</option>
        </SelectField>
      </CalculatorForm>

      <section className="public-result card-surface" aria-live="polite">
        <p className="public-result-label">O que o motor lê agora</p>
        <dl className="public-stats">
          <div>
            <dt>Carência</dt>
            <dd>{formatYearsMonths(view.carenciaMonths)}</dd>
          </div>
          <div>
            <dt>Tempo de contribuição</dt>
            <dd>{formatYearsMonths(view.tcMonths)}</dd>
          </div>
          <div>
            <dt>Histórico usado</dt>
            <dd>{view.historyMonths} competências</dd>
          </div>
        </dl>
        {missingCarencia > 0 ? (
          <p>
            Ainda faltam {formatYearsMonths(missingCarencia)} de carência para
            os 180 meses (quinze anos de contribuições reconhecidas). Sem isso,
            nenhuma aposentadoria programada sai.
          </p>
        ) : (
          <p>
            A carência de 180 meses já está coberta neste histórico sintético.
            Carência é a quantidade de meses pagos que o RGPS reconhece — não é
            o mesmo que tempo de contribuição em todas as regras.
          </p>
        )}

        {view.best ? (
          <>
            <p className="public-result-label" style={{ marginTop: "1.25rem" }}>
              Melhor regra neste recorte
            </p>
            <p className="public-result-hero">{view.best.title}</p>
            <p>
              Elegível a partir de {formatPtMonthYear(view.best.eligibilityDate)}{" "}
              ({formatAgeYears(view.best.eligibilityAgeYears)}). Valor inicial
              estimado: {formatReais(view.best.rmiReais)} por mês
              {view.best.usesFactor
                ? ", já passando pelo fator previdenciário"
                : ""}
              . Coeficiente {Math.round(view.best.coefficient * 100)}%.
            </p>
            <p>{view.best.explainer}</p>
          </>
        ) : (
          <>
            <p className="public-result-label" style={{ marginTop: "1.25rem" }}>
              Nenhuma regra fecha até a idade-alvo
            </p>
            <p>
              Com este tempo, esta idade e esta filiação, o motor não acha
              regra elegível antes dos 90 anos. Quase sempre falta tempo de
              contribuição ou a carência de 180 meses.
            </p>
          </>
        )}
        <p className="public-result-meta">{PUBLIC_ENGINE_NOTE}</p>
      </section>

      {view.rules.length > 1 ? (
        <section className="public-prose">
          <h2>Outras regras que também fecham</h2>
          <ul className="public-rule-list">
            {view.rules
              .filter((rule) => rule.ruleId !== view.best?.ruleId)
              .map((rule) => (
                <li key={rule.ruleId}>
                  <strong>{rule.title}</strong>
                  {" — "}
                  {formatPtMonthYear(rule.eligibilityDate)},{" "}
                  {formatReais(rule.rmiReais)} / mês. {rule.explainer}
                </li>
              ))}
          </ul>
        </section>
      ) : null}

      <section className="public-prose">
        <h2>O que mudou em 2026, em português</h2>
        <p>
          A reforma de 2019 deixou duas portas. Quem se filiou a partir de 13
          de novembro daquele ano cai na regra permanente. Quem já contribuía
          cai nas regras de transição — pontos, idade progressiva, pedágios e
          aposentadoria por idade.
        </p>
        <p>
          Em 2026, a tabela de pontos deste motor pede{" "}
          {year.inssPointsWoman} pontos para mulheres e {year.inssPointsMan}{" "}
          para homens. A idade mínima progressiva está em{" "}
          {ageMonthsLabel(year.inssProgressiveAgeWomanMonths)} (mulher) e{" "}
          {ageMonthsLabel(year.inssProgressiveAgeManMonths)} (homem). Os dois
          números sobem um pouco todo ano até o teto da reforma — por isso uma
          calculadora parada em 2024 mente.
        </p>
        <p>
          Carência continua 180 meses. Tempo de contribuição é outra conta: CLT
          e a alíquota de 20% entram; contribuição reduzida de MEI, em regra,
          não compra os 30 ou 35 anos das transições, a menos que você
          complemente. Esta página pública monta um histórico CLT sintético.
          Extrato real de CNIS entra no app, neste aparelho, sem senha do
          gov.br.
        </p>
      </section>

      <DisclaimerBlock variant="long" />
      <aside className="public-disclaimer" aria-label="Aviso sobre o Meu INSS">
        <p>{INSS_NOT_OFFICIAL}</p>
      </aside>
      <AppCta extra="No app você importa o CNIS que você mesmo exportou e o mesmo motor lê competências de verdade — ainda assim, simulação educativa." />
      <RelatedCalculators current="inss" />
    </article>
  );
}
