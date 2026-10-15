import type { Metadata } from "next";
import Link from "next/link";
import { AppCta, DisclaimerBlock } from "@/components/calculators/AppCta";
import { calculatorMetadata, CALCULATOR_PATHS } from "@/lib/calculators/seo";

export const metadata: Metadata = calculatorMetadata("index");

export default function CalculadorasIndexPage() {
  return (
    <article className="public-article">
      <p className="public-kicker">Grátis · sem cadastro · pt-BR</p>
      <h1>Duas perguntas, um motor</h1>
      <p className="public-lead">
        Quem tem trinta anos busca independência financeira. Quem tem cinquenta
        busca as regras de transição do INSS. São vocabulários diferentes — e
        as duas calculadoras abaixo usam o mesmo motor do app, sem login.
      </p>

      <div className="public-tree-grid">
        <section className="card-surface public-tree">
          <p className="public-kicker">25–40 anos</p>
          <h2>Independência financeira</h2>
          <p>
            Você informa o quanto já tem e o quanto consegue guardar. O motor
            responde quando o dinheiro passa a pagar o seu custo de vida — ou
            quanto esse custo pode ser, se a data já está escolhida.
          </p>
          <ul className="public-tree-links">
            <li>
              <Link href={CALCULATOR_PATHS.freedomDate}>Quando fico livre?</Link>
              <span>Aporte fixo; o motor resolve a data.</span>
            </li>
            <li>
              <Link href={CALCULATOR_PATHS.retirementIncome}>
                Quanto vou receber?
              </Link>
              <span>Data fixa; o motor resolve a renda mensal.</span>
            </li>
          </ul>
        </section>

        <section className="card-surface public-tree">
          <p className="public-kicker">45–60 anos</p>
          <h2>Aposentadoria e INSS</h2>
          <p>
            Idade, carência e as regras de 2026 em linguagem leiga. Não é o Meu
            INSS: ninguém consulta a base do governo daqui, e a senha do gov.br
            não entra.
          </p>
          <ul className="public-tree-links">
            <li>
              <Link href={CALCULATOR_PATHS.inss}>
                Simulador INSS 2026
              </Link>
              <span>Transição, pontos e carência — simulação educativa.</span>
            </li>
            <li>
              <Link href={CALCULATOR_PATHS.retirementIncome}>
                Quanto vou receber?
              </Link>
              <span>A mesma pergunta, agora com a data de parar de trabalhar.</span>
            </li>
          </ul>
        </section>
      </div>

      <section className="public-prose">
        <h2>Por que isso é público</h2>
        <p>
          O número que muda a conversa — quando o dinheiro chega, quanto ele
          paga, se a carência fecha — fica aqui, sem cadastro. Guardar o plano,
          o gráfico e os três blocos é o Básico. O casal entra no Completo.
        </p>
        <p>
          As regras brasileiras mudam. Estas páginas usam o pacote legal de
          2026 do motor. Se uma premissa mudar, o resultado muda — e isso está
          no aviso, não escondido no rodapé.
        </p>
      </section>

      <DisclaimerBlock variant="short" />
      <AppCta extra="Este número é grátis. Salvar o plano e ver o gráfico é o Básico." />
    </article>
  );
}
