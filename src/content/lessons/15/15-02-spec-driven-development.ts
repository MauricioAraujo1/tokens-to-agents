import type { LessonContent } from "../../../types/content";

// Spec-driven development com contas no arquivo. Modelo de brinquedo: cada decisão que o pedido deixa em
// aberto é um chute do agente, certo com 50% de chance, e chutes são independentes. A chance de acertar
// tudo cai como 0,5^n. O custo compara escrever a spec (um custo fixo mais minutos por decisão fechada)
// com o retrabalho esperado dos chutes errados. Os números do repositório saem de .specs/.

const percent = (value: number) => `${(value * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
const minutes = (value: number) => `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} min`;

const GUESS_RIGHT = 0.5;
const openDecisions = [0, 1, 2, 3, 4, 5, 6];
const allRight = (n: number) => GUESS_RIGHT ** n;
const allRightSeries = openDecisions.map((n) => ({ label: `${n} abertas`, value: Number(allRight(n).toFixed(3)) }));
const FEATURE_DECISIONS = 6;

const SPEC_OVERHEAD_MIN = 30;
const SETTLE_MIN = 10;
const REWORK_MIN = 45;
const specCost = (n: number) => SPEC_OVERHEAD_MIN + SETTLE_MIN * n;
const vibeCost = (n: number) => n * (1 - GUESS_RIGHT) * REWORK_MIN;
const breakEven = openDecisions.find((n) => specCost(n) < vibeCost(n)) ?? FEATURE_DECISIONS;
const SMALL = 1;

// Fatos do próprio repositório (.specs/features/learning-platform).
const SPEC_FILES = ["spec.md", "design.md", "tasks.md"];
const PLATFORM_TASKS = 115;
const LES01_CRITERIA = 12;

const lesson: LessonContent = {
  id: "15-02",
  subtitle: "Escrever o que o sistema deve fazer antes de pedir o código, e por que isso importa mais com agentes do que sem eles.",
  objectives: [
    "Explicar o que é spec-driven development e o que o diferencia de vibe coding",
    "Calcular por que decisões implícitas derrubam a chance de o agente acertar",
    "Reconhecer as fases spec, design, tarefas, implementação e verificação",
    "Decidir quando uma spec se paga e quando é burocracia",
  ],
  steps: [
    {
      id: "vibe",
      shortTitle: "Vibe coding",
      title: "Pedir e ver no que dá",
      tag: "context",
      body: [
        "Pedir a um pedreiro “faz um banheiro aí” funciona se você não se importa com onde fica a porta. Se você se importa, ou desenha a planta antes, ou derruba parede depois. Com agentes de código acontece o mesmo: um pedido curto gera um app inteiro em minutos, e cada detalhe que você não disse foi decidido por ele.",
        "Andrej Karpathy chamou de [[vibe coding|vibe-coding]] esse jeito de programar: descrever, aceitar o que vem e corrigir conversando, sem ler o código a fundo. Funciona para protótipo. Para um sistema que vai durar, o [[spec-driven development|spec-driven-development]] (SDD) inverte a ordem: primeiro a especificação escrita e revisada; depois o código, gerado a partir dela e conferido contra ela.",
      ],
      keyIdea: "Todo detalhe que o pedido não diz, o agente decide por você.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "dev", kind: "user", label: "você", col: 0, row: 0.5 },
              { id: "prompt", kind: "context", label: "pedido curto", col: 1, row: 0.5 },
              { id: "agent", kind: "agent", label: "agente", col: 2, row: 0.5 },
              { id: "app", kind: "app", label: "app gerado", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "dev", to: "prompt" },
              { from: "prompt", to: "agent" },
              { from: "agent", to: "app", label: "decide o resto" },
              { from: "app", to: "dev", label: "não era isso", variant: "alternative" },
            ],
            active: "agent",
          },
        ],
      },
      alt: "Você escreve um pedido curto, o agente, em destaque, decide o resto e gera o app; um caminho tracejado volta do app para você com “não era isso”.",
    },
    {
      id: "guesses",
      shortTitle: "Chutes",
      title: "Cada decisão aberta é um chute",
      tag: "mechanism",
      body: [
        "“Adicione login” esconde perguntas: e-mail ou usuário? Sessão expira? O que acontece depois de 5 senhas erradas? Cada uma tem mais de uma resposta razoável. O agente escolhe uma e segue, sem avisar que escolheu.",
        `No modelo de brinquedo da cena, cada decisão aberta é acertada com ${percent(GUESS_RIGHT)} de chance. Com n decisões, a chance de acertar todas é ${GUESS_RIGHT.toLocaleString("pt-BR")}^n: ${percent(allRight(FEATURE_DECISIONS))} para ${FEATURE_DECISIONS}. É o mesmo [[erro composto|compounding-errors]] do módulo 12, agora na interpretação do pedido. Fechar decisões na spec tira termos da multiplicação.`,
      ],
      keyIdea: "A chance de o agente entregar o que você queria cai exponencialmente com as decisões que você não tomou.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "guesses",
            piece: "chart",
            kind: "line",
            series: allRightSeries,
            max: 1,
            highlight: openDecisions.indexOf(FEATURE_DECISIONS),
            color: "module-15",
          },
        ],
      },
      alt: `Chance de o agente acertar todas as decisões abertas: ${allRightSeries.map((item) => `${item.label}, ${percent(item.value)}`).join("; ")}.`,
    },
    {
      id: "phases",
      shortTitle: "Fases",
      title: "Especificar, projetar, quebrar, implementar, verificar",
      tag: "mechanism",
      body: [
        "Uma obra bem feita passa por fases com papéis diferentes: o programa de necessidades diz o que a família quer, a planta diz como, o cronograma diz em que ordem, e a vistoria confere. Cada fase produz um documento que a seguinte lê.",
        "No SDD, a spec diz o quê e por quê, sem tecnologia. O design diz como: componentes, dados, erros. A lista de tarefas quebra o design em passos pequenos, cada um com critério de pronto. O agente implementa uma tarefa por vez, e a verificação compara o resultado com os critérios da spec. O Spec Kit, do GitHub, segue essa ordem com /speckit-specify, /speckit-plan, /speckit-tasks e /speckit-implement; o Kiro gera requirements.md, design.md e tasks.md.",
      ],
      keyIdea: "Cada fase produz um documento revisável; o código é a última fase, não a primeira.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "phases",
            piece: "pipeline",
            stages: [
              { id: "specify", label: "spec: o quê" },
              { id: "design", label: "design: como" },
              { id: "tasks", label: "tarefas" },
              { id: "implement", label: "implementar", color: "module-15" },
              { id: "verify", label: "verificar", color: "success" },
            ],
            active: "implement",
            done: ["specify", "design", "tasks"],
            repeat: { from: "implement", to: "verify", label: "× tarefa" },
          },
        ],
      },
      alt: "Pipeline do spec-driven development: spec (o quê), design (como), tarefas, implementar, em destaque, e verificar. Implementar e verificar se repetem uma vez por tarefa.",
    },
    {
      id: "this-site",
      shortTitle: "Este site",
      title: "Este site foi feito assim",
      tag: "example",
      body: [
        `O Tokens to Agents foi construído com SDD. A pasta .specs/features/learning-platform tem ${SPEC_FILES.join(", ")}. A spec descreve histórias como “aprender uma aula em passos”, com ${LES01_CRITERIA} critérios numerados de LES-01.1 a LES-01.12. O design escolhe React, Vite e conteúdo em TypeScript tipado. A lista de tarefas começou com ${PLATFORM_TASKS} tarefas.`,
        "Cada tarefa aponta para os critérios que cumpre. A T13, do roteador, cita LES-01.10 e LES-01.11 e diz quando está pronta: os testes cobrem passo ausente, zero, negativo, não numérico e maior que o total. O agente que implementa a T13 não precisa adivinhar nada: a regra e o teste já estão escritos.",
      ],
      keyIdea: "Um bom SDD liga cada linha de código a uma tarefa, cada tarefa a um critério, e cada critério a um teste.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "spec", kind: "documents", label: "spec.md", col: 0, row: 0 },
              { id: "design", kind: "documents", label: "design.md", col: 1, row: 0 },
              { id: "tasks", kind: "documents", label: "tasks.md", col: 2, row: 0 },
              { id: "agent", kind: "agent", label: "agente", col: 2, row: 1 },
              { id: "tests", kind: "eval", label: "vitest", col: 3, row: 1 },
            ],
            edges: [
              { from: "spec", to: "design", label: "LES-01" },
              { from: "design", to: "tasks", label: `${PLATFORM_TASKS} tarefas` },
              { from: "tasks", to: "agent", label: "T13" },
              { from: "agent", to: "tests", label: "LES-01.11" },
            ],
            active: "agent",
            done: ["spec", "design", "tasks"],
          },
        ],
      },
      alt: `Os arquivos do repositório em sequência: spec.md, com a história LES-01, alimenta design.md, que vira tasks.md com ${PLATFORM_TASKS} tarefas. O agente, em destaque, pega a tarefa T13 e entrega código conferido pelo vitest contra o critério LES-01.11.`,
    },
    {
      id: "cost",
      shortTitle: "Custo",
      title: "Quando a spec se paga",
      tag: "tradeoff",
      body: [
        `Spec custa tempo. No modelo de brinquedo, escrever uma spec custa ${minutes(SPEC_OVERHEAD_MIN)} fixos mais ${minutes(SETTLE_MIN)} por decisão fechada, e cada chute errado custa ${minutes(REWORK_MIN)} de retrabalho. Com ${SMALL} decisão aberta, a spec custa ${minutes(specCost(SMALL))} e o retrabalho esperado é ${minutes(vibeCost(SMALL))}: não vale.`,
        `A partir de ${breakEven} decisões abertas, a spec sai mais barata. Com ${FEATURE_DECISIONS}, são ${minutes(specCost(FEATURE_DECISIONS))} contra ${minutes(vibeCost(FEATURE_DECISIONS))} de retrabalho esperado, sem contar o que um erro custa depois de entrar em produção. Correção de uma linha e protótipo descartável dispensam spec; feature com regra de negócio, não.`,
      ],
      keyIdea: "A spec vale a pena quando as decisões abertas são muitas ou caras de desfazer.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "cost",
            piece: "metrics-panel",
            metrics: [
              { id: "small-spec", label: `${SMALL} decisão: spec`, value: minutes(specCost(SMALL)) },
              { id: "small-vibe", label: `${SMALL} decisão: retrabalho`, value: minutes(vibeCost(SMALL)), color: "success" },
              { id: "big-spec", label: `${FEATURE_DECISIONS} decisões: spec`, value: minutes(specCost(FEATURE_DECISIONS)), color: "success" },
              { id: "big-vibe", label: `${FEATURE_DECISIONS} decisões: retrabalho`, value: minutes(vibeCost(FEATURE_DECISIONS)), color: "danger" },
              { id: "break-even", label: "ponto de virada", value: `${breakEven} decisões` },
            ],
            highlight: "break-even",
          },
        ],
      },
      alt: `Custo da spec contra o retrabalho esperado: com ${SMALL} decisão, ${minutes(specCost(SMALL))} contra ${minutes(vibeCost(SMALL))}; com ${FEATURE_DECISIONS}, ${minutes(specCost(FEATURE_DECISIONS))} contra ${minutes(vibeCost(FEATURE_DECISIONS))}. A spec passa a valer a partir de ${breakEven} decisões abertas.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "A spec é a fonte da verdade",
      tag: "summary",
      body: [
        "No SDD, a spec é a [[fonte única da verdade|single-source-of-truth]]: quando o comportamento precisa mudar, muda a spec primeiro, e o código segue. Se o código e a spec divergem, um dos dois está errado, e a divergência aparece na verificação.",
        "A próxima aula mostra como escrever essa spec: as seções, o nível de detalhe e as palavras que não podem aparecer nela.",
      ],
      keyIdea: "SDD = decidir por escrito antes, gerar a partir do escrito, conferir contra o escrito.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "dev", kind: "user", label: "você", col: 0, row: 0.5 },
              { id: "spec", kind: "documents", label: "spec revisada", col: 1, row: 0.5 },
              { id: "agent", kind: "agent", label: "agente", col: 2, row: 0 },
              { id: "tests", kind: "eval", label: "critérios", col: 2, row: 1 },
              { id: "app", kind: "app", label: "código", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "dev", to: "spec", label: "decide" },
              { from: "spec", to: "agent", label: "gera" },
              { from: "spec", to: "tests", label: "confere" },
              { from: "agent", to: "app" },
              { from: "tests", to: "app", label: "verifica" },
            ],
            active: "spec",
          },
        ],
      },
      alt: "Você decide e registra na spec revisada, em destaque. A spec guia o agente que gera o código e também define os critérios que verificam esse código.",
    },
  ],
  realWorldExample:
    "O GitHub publicou o Spec Kit, um kit open source de spec-driven development para agentes de código: /speckit-constitution registra os princípios do projeto, /speckit-specify escreve o quê, /speckit-plan o como, /speckit-tasks quebra em tarefas e /speckit-implement executa. O Kiro, IDE de agentes da AWS, segue o mesmo desenho e gera três arquivos por feature: requirements.md, design.md e tasks.md.",
  code: {
    language: "bash",
    source: `# Spec Kit: as fases do SDD como comandos do agente
/speckit-constitution   # princípios do projeto, uma vez
/speckit-specify        # o quê e por quê: histórias e critérios
/speckit-plan           # como: arquitetura, dados, decisões
/speckit-tasks          # tarefas pequenas, com critério de pronto
/speckit-implement      # o agente implementa tarefa por tarefa`,
    caption: "A ordem dos comandos do Spec Kit é a ordem do SDD: o código só aparece no último passo.",
  },
  tradeOffs: {
    pros: [
      "Fecha as decisões antes de o agente chutar, e a chance de acertar sobe muito",
      "A spec é revisável por pessoas que não leem código",
      "Cada mudança de código fica rastreável até um critério e um teste",
    ],
    cons: [
      "Custo fixo de escrita que não se paga em tarefas pequenas",
      "Spec desatualizada engana mais do que spec nenhuma",
      "Detalhar demais cedo demais trava decisões que só ficam claras com o protótipo",
    ],
    alternatives: [
      "Vibe coding para protótipos descartáveis e exploração",
      "Prototipar primeiro e escrever a spec a partir do que funcionou",
    ],
  },
  knowledgeCheck: [
    {
      id: "open-decisions",
      prompt: "Um pedido deixa 4 decisões em aberto e o agente acerta cada uma com 50% de chance, de forma independente. Qual a chance de ele entregar exatamente o esperado?",
      options: ["50%", "25%", "12,5%", "6,25%"],
      correct: 3,
      explanation: "0,5⁴ = 0,0625. A chance cai pela metade a cada decisão aberta; fechar decisões na spec tira termos da multiplicação.",
      lesson: "15-02",
    },
    {
      id: "spec-drift",
      prompt: "No meio da implementação, a equipe decide que o login deve aceitar também o número do celular. O que o SDD pede?",
      options: [
        "Pedir direto ao agente e atualizar a spec quando der",
        "Atualizar a spec e os critérios primeiro, depois as tarefas e o código",
        "Criar uma spec nova só para essa mudança e manter a antiga",
        "Não mudar nada até a próxima versão",
      ],
      correct: 1,
      explanation: "A spec é a fonte da verdade. Mudar o código antes deixa os dois divergentes, e o próximo agente que ler a spec vai desfazer a mudança.",
      lesson: "15-02",
    },
  ],
  related: ["15-01", "15-03", "12-06"],
  references: [
    { title: "GitHub Spec Kit", url: "https://github.com/github/spec-kit", kind: "repo" },
    { title: "Kiro: Specs", url: "https://kiro.dev/docs/specs/", kind: "docs" },
    { title: "Claude Code: Best practices", url: "https://code.claude.com/docs/en/best-practices", kind: "docs" },
  ],
};

export default lesson;
