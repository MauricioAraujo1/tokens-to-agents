import type { LessonContent } from "../../../types/content";

// "Quase sempre" contra "sempre", calculado aqui. Uma regra escrita no arquivo de instruções ("nunca edite
// src/gen/") é seguida em 98% das situações em que importa. Num mês de trabalho, o agente passa por essa
// situação N vezes; a chance de pelo menos uma violação é 1 − 0,98^N. Com um hook que bloqueia a edição, a
// regra vale em 100% das vezes, por construção.

const COMPLIANCE = 0.98;
const MONTHLY_EVENTS = 200;
const horizons = [10, 25, 50, 100, 200, 400];

const atLeastOne = (events: number) => 1 - COMPLIANCE ** events;
const expectedViolations = MONTHLY_EVENTS * (1 - COMPLIANCE);
const monthRisk = atLeastOne(MONTHLY_EVENTS);
const halfway = Math.ceil(Math.log(0.5) / Math.log(COMPLIANCE));

const concerns = ["texto da instrução", "exemplos e formato", "o que é carregado", "ferramentas", "permissões", "checagens", "memória entre sessões"];
const scope: Array<[number, number]> = [
  [1, 0.5],
  [1, 0.5],
  [0, 1],
  [0.5, 1],
  [0, 1],
  [0, 1],
  [0, 1],
];
const harnessOnly = concerns.filter((_, index) => scope[index][0] === 0).length;

const spectrum = [
  { id: "prompt", label: "pedido no chat" },
  { id: "file", label: "arquivo de instruções" },
  { id: "skill", label: "skill" },
  { id: "hook", label: "hook" },
  { id: "deny", label: "regra de negação" },
  { id: "sandbox", label: "sandbox" },
];

const percent = (value: number) => `${Math.round(value * 100)}%`;
const decimal = (value: number) => value.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

const lesson: LessonContent = {
  id: "14-02",
  subtitle: "O prompt é o bilhete que você entrega ao agente; o harness é o escritório inteiro. Quando pedir e quando garantir.",
  objectives: [
    "Separar o que a engenharia de prompt otimiza do que a engenharia do harness otimiza",
    "Distinguir instruções que o modelo interpreta de regras que o harness aplica sempre",
    "Calcular o risco acumulado de uma regra seguida “quase sempre”",
    "Escolher onde colocar uma regra no espectro entre pedir e impor",
  ],
  steps: [
    {
      id: "note",
      shortTitle: "Bilhete",
      title: "O bilhete e o escritório",
      tag: "context",
      body: [
        "Você contrata um freelancer e manda um bilhete caprichado: contexto, exemplos, formato da entrega. Isso é [[engenharia de prompt|prompt-engineering]], e funciona bem para um pedido. Agora imagine que ele vai trabalhar meses no seu escritório: o bilhete não diz quais portas ele abre, onde fica o manual nem quem revisa o trabalho.",
        "Com um modelo numa chamada só, o texto é quase tudo. Com um [[agente|agent]] que faz dezenas de chamadas, mexe em arquivos e volta amanhã, o resultado passa a depender do escritório: o que é carregado em cada chamada, que ferramentas existem, o que é bloqueado e o que é conferido.",
      ],
      keyIdea: "Prompt engineering melhora uma chamada; harness engineering melhora o ambiente de todas as chamadas.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "office",
            piece: "block-diagram",
            blocks: [
              { id: "user", kind: "user", label: "você", col: 0, row: 0 },
              { id: "prompt", kind: "context", label: "prompt", col: 1, row: 0 },
              { id: "llm", kind: "llm", label: "modelo", col: 2, row: 0 },
              { id: "answer", kind: "answer", label: "resposta", col: 3, row: 0 },
            ],
            edges: [
              { from: "user", to: "prompt", label: "escreve" },
              { from: "prompt", to: "llm" },
              { from: "llm", to: "answer" },
            ],
            active: "prompt",
          },
        ],
      },
      alt: "Fluxo de uma chamada: você escreve o prompt, em destaque, que vai ao modelo e volta como resposta.",
    },
    {
      id: "scope",
      shortTitle: "Escopo",
      title: "O que cada um otimiza",
      tag: "mechanism",
      body: [
        "Os dois trabalhos se sobrepõem no texto, e só nele. Escrever bem uma instrução continua valendo: as técnicas do módulo 05, como papéis, delimitadores e exemplos, entram nos arquivos de instrução do agente.",
        `Mas, das ${concerns.length} preocupações da matriz, ${harnessOnly} não existem numa chamada isolada: decidir o que entra no contexto a cada volta, que ferramentas e permissões o agente tem, como ele confere o trabalho e o que lembra entre sessões. O [[system prompt|system-prompt]] vira uma peça entre várias.`,
      ],
      keyIdea: "O texto continua importando, mas vira uma peça entre várias.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "scope-matrix",
            piece: "matrix",
            rows: concerns,
            cols: ["prompt eng.", "harness eng."],
            values: scope.map(([prompt, harness]) => [prompt, harness]),
            scale: { min: 0, max: 1 },
            highlight: { row: 4, col: 1 },
            color: "module-14",
          },
        ],
      },
      alt: `Matriz de escopo: texto da instrução e exemplos são o centro da engenharia de prompt; o que é carregado, ferramentas, permissões, checagens e memória são do harness, com permissões em destaque.`,
    },
    {
      id: "ask-vs-enforce",
      shortTitle: "Pedir ou impor",
      title: "Pedir ao modelo ou mandar o harness",
      tag: "mechanism",
      body: [
        "Uma placa de “não pise na grama” funciona com quase todo mundo. Uma cerca funciona com todo mundo. A documentação do Claude Code faz a mesma divisão: instruções que o modelo lê e decide seguir (o prompt, o CLAUDE.md, uma skill) e instruções que o harness executa toda vez (um hook, uma regra de negação, uma configuração gerenciada).",
        "A segunda forma é a [[imposição determinística|deterministic-enforcement]]: não importa o que o modelo decidiu, o harness intercepta o pedido antes de a ferramenta rodar. A recomendação da própria documentação é deixar o modelo decidir quase tudo, porque quase toda diretriz tem exceção, e usar a forma determinística só para o que não pode ter exceção.",
      ],
      keyIdea: "Diretriz com exceções fica no texto; regra sem exceção vira configuração que o harness aplica.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "office",
            piece: "block-diagram",
            blocks: [
              { id: "rules", kind: "documents", label: "claude.md", col: 0, row: 0.5 },
              { id: "llm", kind: "llm", label: "modelo", col: 1, row: 0.5 },
              { id: "hook", kind: "guardrail", label: "hook", col: 2, row: 0.5 },
              { id: "tool", kind: "tool", label: "editar", col: 3, row: 0 },
              { id: "blocked", kind: "no-result", label: "src/gen/", col: 3, row: 1 },
            ],
            edges: [
              { from: "rules", to: "llm", label: "orienta" },
              { from: "llm", to: "hook", label: "pedido" },
              { from: "hook", to: "tool", label: "permitido" },
              { from: "hook", to: "blocked", label: "bloqueado", variant: "alternative" },
            ],
            active: "hook",
            done: ["rules", "llm"],
          },
        ],
      },
      alt: "O CLAUDE.md orienta o modelo; o pedido de edição passa por um hook, em destaque, que deixa editar arquivos comuns e bloqueia, por um caminho tracejado, edições em src/gen/.",
    },
    {
      id: "almost-always",
      shortTitle: "A conta",
      title: "Quase sempre não é sempre",
      tag: "example",
      body: [
        `Digamos que o agente respeita “nunca edite src/gen/” em ${percent(COMPLIANCE)} das vezes em que a situação aparece. Parece ótimo. Mas num mês ela aparece ${MONTHLY_EVENTS} vezes: são ${decimal(expectedViolations)} violações esperadas, e a chance de pelo menos uma é 1 − ${COMPLIANCE.toLocaleString("pt-BR")}^${MONTHLY_EVENTS} = ${percent(monthRisk)}.`,
        `Bastam ${halfway} ocorrências para a chance de violação passar de 50%. Com um hook que bloqueia a escrita naquela pasta, a conta muda de natureza: a probabilidade de violar é zero, porque a edição nem chega a acontecer. É por isso que regra crítica não mora só no texto.`,
      ],
      keyIdea: "Uma regra seguida 98% das vezes falha com certeza quase total quando a situação se repete centenas de vezes.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "risk",
            piece: "chart",
            kind: "line",
            series: horizons.map((events) => ({ label: `${events}×`, value: Number(atLeastOne(events).toFixed(3)) })),
            max: 1,
            cutoff: { mode: "threshold", value: 0.5, label: "50%" },
            color: "module-14",
          },
          {
            id: "risk-numbers",
            piece: "metrics-panel",
            metrics: [
              { id: "month", label: `${MONTHLY_EVENTS} ocorrências, só texto`, value: percent(monthRisk), color: "danger" },
              { id: "expected", label: "violações esperadas", value: decimal(expectedViolations) },
              { id: "hook", label: "com hook", value: "0%", color: "success" },
            ],
            highlight: "month",
          },
        ],
      },
      alt: `Curva da chance de pelo menos uma violação, subindo com o número de ocorrências e passando de 50% em ${halfway}; com ${MONTHLY_EVENTS} ocorrências chega a ${percent(monthRisk)}, contra 0% com um hook.`,
    },
    {
      id: "spectrum",
      shortTitle: "Espectro",
      title: "Do pedido à cerca",
      tag: "tradeoff",
      body: [
        "Entre o pedido no chat e o sandbox há um espectro. À esquerda, flexibilidade: o modelo lê o caso, entende a exceção e decide bem. À direita, garantia: a regra vale sempre, inclusive quando estaria errada, e cada exceção vira trabalho de configuração.",
        "O erro comum dos dois lados: gritar IMPORTANTE num arquivo de instruções para uma regra que não pode falhar, e criar hooks para preferências de estilo que têm mil exceções. A documentação do Claude Code dá o teste: se você vive reforçando uma linha e o agente ainda erra, ela pertence a um hook; se um hook cobre só uma preferência, apague-o.",
      ],
      keyIdea: "Mova uma regra para a direita do espectro só quando o custo de uma única falha justificar a rigidez.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "range",
            piece: "pipeline",
            stages: spectrum.map((item, index) => ({ id: item.id, label: item.label, color: index >= 3 ? "module-14" : undefined })),
            active: "hook",
            done: ["prompt", "file", "skill"],
          },
        ],
      },
      alt: `Espectro em etapas, do mais flexível ao mais rígido: ${spectrum.map((item) => item.label).join(", ")}; o hook está em destaque.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Duas engenharias, um agente",
      tag: "summary",
      body: [
        "A engenharia de prompt escreve bem cada instrução. A engenharia do harness decide onde essa instrução mora, quando entra no contexto, e o que o código garante independentemente dela. Um bom agente precisa das duas.",
        "A próxima aula começa pela parte de texto do harness: as instruções do agente, o que escrever nelas e quanto do contexto elas podem ocupar.",
      ],
      keyIdea: "Escreva bem o que o modelo deve decidir; configure o que o harness deve garantir.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "office",
            piece: "block-diagram",
            blocks: [
              { id: "user", kind: "user", label: "você", col: 0, row: 0.5 },
              { id: "rules", kind: "documents", label: "instruções", col: 1, row: 0 },
              { id: "llm", kind: "llm", label: "modelo", col: 2, row: 0 },
              { id: "hook", kind: "guardrail", label: "hooks e regras", col: 1, row: 1 },
              { id: "tool", kind: "tool", label: "ferramentas", col: 2, row: 1 },
              { id: "eval", kind: "eval", label: "checagem", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "user", to: "rules", label: "escreve" },
              { from: "user", to: "hook", label: "configura" },
              { from: "rules", to: "llm" },
              { from: "hook", to: "tool" },
              { from: "llm", to: "eval" },
              { from: "tool", to: "eval" },
            ],
            active: "eval",
          },
        ],
      },
      alt: "Você escreve instruções para o modelo e configura hooks e regras em volta das ferramentas; os dois caminhos terminam numa checagem, em destaque.",
    },
  ],
  realWorldExample:
    "A página de boas práticas do Claude Code separa as instruções em dois tipos: as não determinísticas, que o modelo lê e decide seguir (o prompt, o CLAUDE.md, as skills), e as determinísticas, que o Claude Code, o harness, executa sempre (hooks, regras de negação, configurações gerenciadas). O exemplo dado é “nunca edite o cliente gerado em src/gen/”: como linha no CLAUDE.md, é seguida quase sempre; como hook, sempre.",
  tradeOffs: {
    pros: [
      "Regras críticas passam a valer sempre, sem depender do que o modelo lembra",
      "O texto das instruções fica menor e mais focado no que exige julgamento",
      "Cada camada pode ser testada separadamente",
    ],
    cons: [
      "Regras rígidas não enxergam exceções legítimas",
      "Hooks e permissões são código: precisam de manutenção e testes",
      "Excesso de garantias deixa o agente lento e cheio de interrupções",
    ],
    alternatives: ["Só prompt, para tarefas de uma chamada sem efeitos colaterais", "Revisão humana no fim, quando o volume é baixo"],
  },
  knowledgeCheck: [
    {
      id: "where-rule",
      prompt: "“Prefira exports nomeados” e “nunca leia o arquivo .env”: onde cada regra deve morar?",
      options: [
        "As duas no CLAUDE.md, com IMPORTANTE em maiúsculas",
        "Exports nomeados no arquivo de instruções; o .env numa regra de negação do harness",
        "As duas em hooks",
        "Exports nomeados num hook; o .env no prompt",
      ],
      correct: 1,
      explanation: "Exports nomeados é uma diretriz com exceções, boa para o modelo decidir. Ler o .env não pode acontecer nenhuma vez, então vira uma regra que o harness aplica antes da ferramenta rodar.",
      lesson: "14-02",
    },
    {
      id: "risk-math",
      prompt: "Uma regra é seguida em 99% das ocorrências. Em 100 ocorrências independentes, qual é a chance aproximada de pelo menos uma violação?",
      options: ["1%", "10%", "37%", "63%"],
      correct: 3,
      explanation: "1 − 0,99¹⁰⁰ ≈ 1 − 0,366 = 63%. “Quase sempre” acumulado vira “quase certo que falha uma vez”.",
      lesson: "14-02",
    },
  ],
  related: ["14-01", "14-03", "05-01"],
  references: [
    { title: "Claude Code: Best practices", url: "https://code.claude.com/docs/en/best-practices", kind: "docs" },
    { title: "Anthropic: Effective context engineering for AI agents", url: "https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents", kind: "article" },
    { title: "Claude: Prompt engineering overview", url: "https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/overview", kind: "docs" },
  ],
};

export default lesson;
