<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Mobile UX (validadas — PR #51, testado e aprovado)

Ajustes apenas para viewports < 640px (~375px). Desktop não muda.

### Landing
- Seletor de idioma e moeda em linha própria (legível).
- Botões com área de toque mínima de 44px.
- Hero e controles devem permanecer fáceis de ler e tocar.

### Calculadora
- Gráfico continua legível.
- Sliders com polegar maior (fácil de arrastar).
- Rótulo “Aos 90” não sobrepõe as idades do eixo.
- Campos numéricos permanecem acessíveis.
- Nomes dos sliders não mudam.

Não regredir esses pontos em ajustes futuros de mobile.
