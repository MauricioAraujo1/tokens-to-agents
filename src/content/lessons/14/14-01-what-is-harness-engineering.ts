import type { LessonContent } from "../../../types/content";

// O mesmo modelo em dois harnesses, calculado aqui. Uma tarefa de 10 passos em que o modelo acerta cada passo
// com 90% de chance. No harness simples, o erro de um passo passa adiante. No harness com checagem, um teste
// pega 80% dos passos errados e o agente tenta o passo de novo uma vez. Nada muda no modelo: só o ambiente.

const STEPS = 10;
const STEP_ACCURACY = 0.9;
const CATCH_RATE = 0.8;

const stepWithCheck = STEP_ACCURACY + (1 - STEP_ACCURACY) * CATCH_RATE * STEP_ACCURACY;
const chain = (perStep: number, steps: number) => perStep ** steps;
const bare = chain(STEP_ACCURACY, STEPS);
const harnessed = chain(stepWithCheck, STEPS);
const gain = harnessed / bare;

const comparison = [
  { label: "1 passo, simples", value: chain(STEP_ACCURACY, 1) },
  { label: "1 passo, com teste", value: chain(stepWithCheck, 1) },
  { label: `${STEPS} passos, simples`, value: bare },
  { label: `${STEPS} passos, com teste`, value: harnessed },
];

const parts = [
  { id: "instructions", label: "instruções", lesson: "14-03" },
  { id: "rules", label: "regras", lesson: "14-04" },
  { id: "skills", label: "skills", lesson: "14-06" },
  { id: "hooks", label: "hooks", lesson: "14-07" },
  { id: "permissions", label: "permissões", lesson: "14-08" },
  { id: "context", label: "contexto", lesson: "14-10" },
  { id: "memory", label: "memória", lesson: "14-11" },
  { id: "sandbox", label: "sandbox", lesson: "14-12" },
  { id: "checks", label: "checagens", lesson: "14-13" },
];

const percent = (value: number) => `${Math.round(value * 100)}%`;
const fixed = (value: number, digits = 1) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });

const ring = parts.map((part, index) => {
  const angle = (2 * Math.PI * index) / parts.length - Math.PI / 2;
  return { id: part.id, label: part.label, x: 0.5 + 0.38 * Math.cos(angle), y: 0.5 + 0.4 * Math.sin(angle) };
});

const lesson: LessonContent = {
  id: "14-01",
  subtitle: "O modelo é o motor; o harness é o carro em volta dele. Por que o mesmo modelo acerta muito mais num ambiente bem montado.",
  objectives: [
    "Definir agent harness e harness engineering",
    "Listar as peças de um harness e o que cada uma controla",
    "Calcular como uma checagem no ambiente muda a taxa de acerto de uma tarefa longa",
    "Reconhecer quando o problema está no harness, não no modelo",
  ],
  steps: [
    {
      id: "engine",
      shortTitle: "Motor e carro",
      title: "Um motor não anda sozinho",
      tag: "context",
      body: [
        "Um motor de Fórmula 1 em cima de uma mesa só faz barulho. Para virar corrida, ele precisa de chassi, volante, freios, painel e uma equipe nos boxes. Dois times com o mesmo motor terminam a prova em posições bem diferentes por causa de todo o resto.",
        "Com [[agentes|agent]] é igual. O modelo gera texto; quem transforma isso em trabalho é o [[agent harness|agent-harness]]: o código que roda o [[loop|agent-loop]], monta o contexto, executa as ferramentas, aplica as permissões e confere o resultado. [[Harness engineering|harness-engineering]] é projetar esse ambiente para o agente acertar de forma repetível.",
      ],
      keyIdea: "Agente = modelo + harness. O modelo decide; o harness define o que ele vê, o que pode fazer e o que é conferido.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "car",
            piece: "block-diagram",
            blocks: [
              { id: "dev", kind: "laptop", label: "você", col: 0, row: 0.5 },
              { id: "harness", kind: "agent", label: "harness", col: 1, row: 0.5 },
              { id: "llm", kind: "llm", label: "modelo", col: 2, row: 0 },
              { id: "tools", kind: "tool", label: "ferramentas", col: 2, row: 1 },
              { id: "guard", kind: "guardrail", label: "permissões", col: 3, row: 1 },
              { id: "memory", kind: "memory", label: "memória", col: 3, row: 0 },
            ],
            edges: [
              { from: "dev", to: "harness", label: "tarefa" },
              { from: "harness", to: "llm", label: "contexto" },
              { from: "harness", to: "tools", label: "executa" },
              { from: "tools", to: "guard" },
              { from: "llm", to: "memory" },
            ],
            active: "harness",
          },
        ],
      },
      alt: "Você manda a tarefa ao harness, em destaque, que monta o contexto para o modelo, executa ferramentas sob permissões e guarda memória.",
    },
    {
      id: "parts",
      shortTitle: "As peças",
      title: "O que mora no harness",
      tag: "mechanism",
      body: [
        "Pense no primeiro dia de alguém numa empresa: recebe um manual, um crachá que abre só algumas portas, um checklist, um colega para revisar o trabalho e um caderno para anotar o que aprendeu. Nada disso muda a pessoa; tudo isso muda o resultado.",
        `O harness de um agente tem as mesmas peças, e cada uma vira uma aula deste módulo: ${parts.map((part) => part.label).join(", ")}. Algumas só orientam o modelo, como as instruções. Outras são garantias que o código aplica sempre, como permissões, hooks e sandbox. Saber em qual peça mexer é o ofício.`,
      ],
      keyIdea: "Cada peça do harness controla uma coisa: o que o agente sabe, o que pode tocar ou como descobre que errou.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "map",
            piece: "graph",
            nodes: [{ id: "core", label: "harness", x: 0.5, y: 0.5, color: "module-14" }, ...ring],
            edges: parts.map((part) => ({ from: "core", to: part.id })),
            highlight: ["core", "permissions", "checks"],
          },
        ],
      },
      alt: `Mapa com o harness no centro, ligado a ${parts.map((part) => part.label).join(", ")}; permissões e checagens estão em destaque.`,
    },
    {
      id: "turn",
      shortTitle: "Um turno",
      title: "Um turno visto por dentro",
      tag: "mechanism",
      body: [
        "Quando você pede “corrija o teste quebrado”, o modelo não toca no disco. Ele devolve um pedido: “quero rodar npm test”. Quem decide se aquilo roda, onde roda e o que volta para o modelo é o harness.",
        "A cada volta, o harness monta o contexto (instruções, histórico, resultados), chama o modelo, confere o pedido contra as regras de permissão, executa a ferramenta, corta a saída se for grande e devolve a [[observação|observation]]. No módulo 12 esse código foi chamado de [[agent runtime|agent-runtime]]; aqui o foco é configurá-lo bem.",
      ],
      keyIdea: "O modelo só pede; o harness decide, executa e devolve.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "car",
            piece: "block-diagram",
            blocks: [
              { id: "context", kind: "context", label: "contexto", col: 0, row: 0.5 },
              { id: "llm", kind: "llm", label: "modelo", col: 1, row: 0.5 },
              { id: "guard", kind: "guardrail", label: "permissões", col: 2, row: 0 },
              { id: "tools", kind: "tool", label: "npm test", col: 3, row: 0 },
              { id: "blocked", kind: "no-result", label: "negado", col: 2, row: 1 },
              { id: "obs", kind: "answer", label: "observação", col: 3, row: 1 },
            ],
            edges: [
              { from: "context", to: "llm" },
              { from: "llm", to: "guard", label: "pedido" },
              { from: "guard", to: "tools", label: "ok" },
              { from: "guard", to: "blocked", label: "regra", variant: "alternative" },
              { from: "tools", to: "obs", label: "saída" },
            ],
            active: "guard",
            done: ["context", "llm"],
          },
        ],
      },
      alt: "O contexto vai ao modelo, que faz um pedido; as permissões, em destaque, deixam npm test rodar e devolver a observação, ou negam o pedido por um caminho tracejado.",
    },
    {
      id: "same-model",
      shortTitle: "A conta",
      title: "Mesmo modelo, outro harness",
      tag: "example",
      body: [
        `Uma tarefa de ${STEPS} passos, e o modelo acerta cada passo com ${percent(STEP_ACCURACY)} de chance. Num harness simples, um erro passa adiante e estraga o resto: a chance de tudo dar certo é ${fixed(STEP_ACCURACY, 1)} elevado a ${STEPS}, ${percent(bare)}. É o [[erro composto|compounding-errors]] do módulo 12.`,
        `Agora o harness roda um teste depois de cada passo. O teste pega ${percent(CATCH_RATE)} dos passos errados, e o agente tenta de novo uma vez. Cada passo passa a acertar ${percent(stepWithCheck)}, e a tarefa inteira sobe para ${percent(harnessed)}: ${fixed(gain, 1)} vezes mais, com o mesmo modelo.`,
      ],
      keyIdea: "Pequenas melhorias por passo viram grandes diferenças em tarefas longas, e muitas delas vêm do ambiente.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "success",
            piece: "chart",
            kind: "bar",
            series: comparison.map((item) => ({ label: item.label, value: Number(item.value.toFixed(2)) })),
            max: 1,
            highlight: 3,
            color: "module-14",
          },
          {
            id: "numbers",
            piece: "metrics-panel",
            metrics: [
              { id: "bare", label: "harness simples", value: percent(bare), color: "danger" },
              { id: "harnessed", label: "com teste e retry", value: percent(harnessed), color: "success" },
              { id: "gain", label: "ganho", value: `${fixed(gain, 1)}×` },
            ],
            highlight: "harnessed",
          },
        ],
      },
      alt: `Barras de chance de sucesso: um passo sai de ${percent(STEP_ACCURACY)} para ${percent(stepWithCheck)} com teste; ${STEPS} passos saem de ${percent(bare)} para ${percent(harnessed)}, ${fixed(gain, 1)} vezes mais.`,
    },
    {
      id: "how-much",
      shortTitle: "Quanto harness",
      title: "Nem de menos, nem de mais",
      tag: "tradeoff",
      body: [
        "Harness de menos é dar a chave do carro sem cinto nem freio: o agente apaga o que não devia, declara pronto sem testar e esquece tudo na sessão seguinte. Harness de mais é um carro com tantas travas que não sai da garagem: pede aprovação para cada leitura de arquivo e enche o contexto de regras que não importam.",
        "Uma boa pergunta para cada peça: isso muda o resultado? Instruções custam tokens em toda chamada; checagens custam tempo; permissões custam interrupções. E modelos melhores pedem menos muleta: parte do harness de hoje pode sair amanhã, por isso vale medir com [[evals|eval]] antes e depois de mudar.",
      ],
      keyIdea: "Cada peça do harness tem custo. Mantenha as que mudam o resultado e meça antes de acrescentar.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "balance",
            piece: "block-diagram",
            blocks: [
              { id: "agent", kind: "agent", label: "agente", col: 0, row: 0.5 },
              { id: "few", kind: "no-result", label: "solto demais", col: 1, row: 0 },
              { id: "many", kind: "guardrail", label: "travado demais", col: 1, row: 1 },
              { id: "eval", kind: "eval", label: "medir", col: 2, row: 0.5 },
              { id: "good", kind: "answer", label: "harness enxuto", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "agent", to: "few", label: "sem limites", variant: "alternative" },
              { from: "agent", to: "many", label: "tudo pergunta", variant: "alternative" },
              { from: "few", to: "eval" },
              { from: "many", to: "eval" },
              { from: "eval", to: "good", label: "fica o que ajuda" },
            ],
            active: "eval",
          },
        ],
      },
      alt: "O agente pode ficar solto demais ou travado demais, dois caminhos tracejados; medir, em destaque, leva a um harness enxuto, que mantém só o que ajuda.",
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "O mapa do módulo",
      tag: "summary",
      body: [
        "Harness engineering é mexer no ambiente, não no modelo: o que entra no contexto, o que o agente pode tocar, como ele descobre que errou e o que lembra depois. As peças vão de pedidos ao modelo (instruções, regras) a garantias do código (permissões, hooks, sandbox).",
        "A próxima aula compara esse trabalho com o que você viu no módulo 05: onde termina a engenharia de prompt e onde começa a engenharia do harness.",
      ],
      keyIdea: "Quando o agente erra, pergunte primeiro: o que faltou no ambiente dele?",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "module",
            piece: "pipeline",
            display: "chips",
            stages: parts.map((part, index) => ({ id: part.id, label: part.label, color: index % 3 === 0 ? "module-14" : undefined })),
          },
        ],
      },
      alt: `Chips com as peças do harness, na ordem das aulas: ${parts.map((part) => part.label).join(", ")}.`,
    },
  ],
  realWorldExample:
    "No artigo “Effective harnesses for long-running agents”, a Anthropic conta como fez o mesmo modelo construir um app web ao longo de muitas sessões: um agente inicializador monta o ambiente (uma lista de features em JSON, um arquivo claude-progress.txt, um script init.sh e um repositório git) e um agente de código avança uma feature por sessão. Os dois usam o mesmo system prompt, as mesmas ferramentas e o mesmo harness; muda só o pedido inicial.",
  tradeOffs: {
    pros: [
      "Melhora o acerto sem trocar nem treinar o modelo",
      "Transforma regras críticas em garantias que o código aplica sempre",
      "Fica versionado junto com o projeto e vale para todo o time",
    ],
    cons: [
      "Cada peça custa tokens, tempo ou interrupções",
      "Um harness mal medido acumula regras que ninguém sabe se ajudam",
      "Parte do harness fica obsoleta quando o modelo melhora",
    ],
    alternatives: ["Trocar por um modelo maior, quando o erro é de raciocínio e não de ambiente", "Fine-tuning, quando o comportamento precisa estar nos pesos"],
  },
  knowledgeCheck: [
    {
      id: "where-to-fix",
      prompt: "Um agente de código declara “pronto” e o build quebra no CI em metade das tarefas. Qual mudança é de harness engineering?",
      options: [
        "Trocar a temperatura do modelo",
        "Dar ao agente o comando de build e fazê-lo rodar antes de terminar, com o resultado de volta no contexto",
        "Pedir para ele ter mais cuidado",
        "Treinar um modelo novo com exemplos de build",
      ],
      correct: 1,
      explanation: "O problema é de ambiente: o agente não tem como saber que quebrou. Uma checagem que roda e devolve o resultado fecha esse loop sem mexer no modelo.",
      lesson: "14-01",
    },
    {
      id: "compounding",
      prompt: "Cada passo de uma tarefa de 5 passos acerta 80%. Uma checagem pega metade dos erros e permite uma nova tentativa. Qual é a chance de acerto por passo com a checagem?",
      options: ["80%", "84%", "88%", "90%"],
      correct: 2,
      explanation: "0,8 + 0,2 × 0,5 × 0,8 = 0,88. Nos 5 passos, a tarefa sobe de 0,8⁵ ≈ 33% para 0,88⁵ ≈ 53%.",
      lesson: "14-01",
    },
  ],
  related: ["14-02", "12-03", "12-18"],
  references: [
    { title: "Anthropic: Effective harnesses for long-running agents", url: "https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents", kind: "article" },
    { title: "Anthropic: Building effective agents", url: "https://www.anthropic.com/engineering/building-effective-agents", kind: "article" },
    { title: "Yang et al. (2024), SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering", url: "https://arxiv.org/abs/2405.15793", kind: "paper" },
  ],
};

export default lesson;
