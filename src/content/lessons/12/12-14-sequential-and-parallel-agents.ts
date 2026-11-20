import type { LessonContent } from "../../../types/content";

// Sequencial e paralelo com contas no arquivo: o planejamento de uma viagem dividido em quatro subtarefas de
// brinquedo, com durações em segundos, e um agregador no fim. A latência paralela sai de um escalonador
// guloso com C vagas (a próxima tarefa começa assim que uma vaga abre, como um semáforo), e o caminho
// crítico sai do caminho mais longo num grafo de dependências. A votação supõe votos independentes.

const seconds = (value: number) => `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} s`;
const percent = (value: number) => `${(value * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

interface Subtask {
  id: string;
  label: string;
  seconds: number;
}

const subtasks: Subtask[] = [
  { id: "flights", label: "voos", seconds: 6 },
  { id: "hotel", label: "hotel", seconds: 5 },
  { id: "events", label: "eventos", seconds: 4 },
  { id: "weather", label: "clima", seconds: 2 },
];
const AGGREGATOR = { id: "itinerary", label: "roteiro", seconds: 3 };

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
const sequential = sum(subtasks.map((task) => task.seconds)) + AGGREGATOR.seconds;

/** Escalonador guloso: cada tarefa vai para a vaga que fica livre primeiro; o agregador espera a última. */
const withConcurrency = (slots: number) => {
  const free = Array.from({ length: slots }, () => 0);
  for (const task of [...subtasks].sort((a, b) => b.seconds - a.seconds)) {
    const slot = free.indexOf(Math.min(...free));
    free[slot] += task.seconds;
  }
  return Math.max(...free) + AGGREGATOR.seconds;
};
const concurrencies = [1, 2, 3, 4, 8];
const latencySeries = concurrencies.map((slots) => ({ label: `${slots} por vez`, value: withConcurrency(slots) }));
const unbounded = Math.max(...subtasks.map((task) => task.seconds)) + AGGREGATOR.seconds;
const LIMIT = 2;
const limited = withConcurrency(LIMIT);
const plateau = concurrencies.find((slots) => withConcurrency(slots) === unbounded) ?? subtasks.length;

// Grafo de dependências: o orçamento precisa de voos e hotel; o roteiro precisa do orçamento e do clima.
interface DagNode {
  id: string;
  label: string;
  seconds: number;
  after: string[];
}
const dag: DagNode[] = [
  { id: "understand", label: "entender pedido", seconds: 2, after: [] },
  { id: "flights", label: "voos", seconds: 6, after: ["understand"] },
  { id: "hotel", label: "hotel", seconds: 5, after: ["understand"] },
  { id: "weather", label: "clima", seconds: 2, after: ["understand"] },
  { id: "budget", label: "orçamento", seconds: 3, after: ["flights", "hotel"] },
  { id: "itinerary", label: "roteiro", seconds: 4, after: ["budget", "weather"] },
];
const finish = new Map<string, { time: number; via: string | null }>();
for (const node of dag) {
  const previous = node.after
    .map((id) => ({ id, time: finish.get(id)?.time ?? 0 }))
    .sort((a, b) => b.time - a.time)[0];
  finish.set(node.id, { time: (previous?.time ?? 0) + node.seconds, via: previous?.id ?? null });
}
const last = dag[dag.length - 1];
const criticalPath: string[] = [];
for (let cursor: string | null = last.id; cursor; cursor = finish.get(cursor)?.via ?? null) criticalPath.unshift(cursor);
const criticalTime = finish.get(last.id)?.time ?? 0;
const dagSequential = sum(dag.map((node) => node.seconds));
const labelOf = (id: string) => dag.find((node) => node.id === id)?.label ?? id;
const dagPositions: Record<string, { x: number; y: number }> = {
  understand: { x: 0.08, y: 0.5 },
  flights: { x: 0.36, y: 0.15 },
  hotel: { x: 0.36, y: 0.5 },
  weather: { x: 0.36, y: 0.85 },
  budget: { x: 0.64, y: 0.32 },
  itinerary: { x: 0.92, y: 0.5 },
};

// Votação: N votos independentes, cada um certo com probabilidade P; vale a maioria.
const P = 0.7;
const binomial = (n: number, k: number): number => (k === 0 || k === n ? 1 : binomial(n - 1, k - 1) + binomial(n - 1, k));
const majority = (n: number) =>
  sum(Array.from({ length: n + 1 }, (_, k) => k).filter((k) => k > n / 2).map((k) => binomial(n, k) * P ** k * (1 - P) ** (n - k)));
const majority3 = majority(3);
const majority5 = majority(5);

const lesson: LessonContent = {
  id: "12-14",
  subtitle: "Quando os agentes trabalham um depois do outro, quando trabalham ao mesmo tempo, e o que limita o ganho de rodar em paralelo.",
  objectives: [
    "Calcular a latência de um fluxo sequencial e de um paralelo com agregador",
    "Explicar fan-out e fan-in e o efeito de um limite de concorrência",
    "Encontrar o caminho crítico num grafo de dependências",
    "Estimar o ganho da votação entre agentes independentes",
  ],
  steps: [
    {
      id: "chain",
      shortTitle: "Em fila",
      title: "Um cozinheiro, um prato de cada vez",
      tag: "context",
      body: [
        `Um cozinheiro sozinho faz o jantar em ordem: arroz, depois o feijão, depois a salada, e só então monta o prato. Planejar uma viagem com um agente que pesquisa ${subtasks.map((task) => task.label).join(", ")} um de cada vez e depois escreve o ${AGGREGATOR.label} é o mesmo: cada etapa espera a anterior.`,
        `Esse é o fluxo sequencial, a mesma ideia do [[prompt chaining|prompt-chaining]]: a saída de um passo é a entrada do próximo. A latência é a soma de tudo: ${subtasks.map((task) => task.seconds).join(" + ")} + ${AGGREGATOR.seconds} = ${seconds(sequential)}. É o certo quando o passo seguinte depende mesmo do anterior; quando não depende, o tempo de espera é desperdício.`,
      ],
      keyIdea: "Em sequência, a latência é a soma das etapas, dependam elas umas das outras ou não.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "chain",
            piece: "pipeline",
            stages: [
              ...subtasks.map((task) => ({ id: task.id, label: `${task.label} ${seconds(task.seconds)}` })),
              { id: AGGREGATOR.id, label: `${AGGREGATOR.label} ${seconds(AGGREGATOR.seconds)}`, color: "module-12" as const },
            ],
            active: "hotel",
            done: ["flights"],
          },
        ],
      },
      alt: `Pipeline sequencial: ${subtasks.map((task) => `${task.label}, ${seconds(task.seconds)}`).join("; ")}; e ${AGGREGATOR.label}, ${seconds(AGGREGATOR.seconds)}. Voos já terminou e hotel está em andamento. Total de ${seconds(sequential)}.`,
    },
    {
      id: "fan",
      shortTitle: "Abrir e juntar",
      title: "Vários cozinheiros, um prato no fim",
      tag: "mechanism",
      body: [
        "Numa cozinha de restaurante, o chefe distribui: um cozinheiro faz o arroz, outro o feijão, outro a salada, todos ao mesmo tempo. Quando tudo fica pronto, alguém monta o prato.",
        `Isso é [[fan-out/fan-in|fan-out-fan-in]]: o [[orquestrador|orchestrator]] abre as subtarefas independentes em paralelo e um agregador junta os resultados. Sem limite, a latência é a da tarefa mais lenta mais o agregador: ${seconds(unbounded)}. Na prática há um limite de concorrência, por causa do limite de requisições da API ou do custo. Com ${LIMIT} workers ao mesmo tempo, as ${subtasks.length} subtarefas esperam numa fila e o total vai a ${seconds(limited)}.`,
      ],
      keyIdea: "Em paralelo, a latência é a da subtarefa mais lenta mais a agregação, desde que haja vagas para todas.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "fan",
            piece: "block-diagram",
            blocks: [
              { id: "orchestrator", kind: "agent", label: "orquestrador", col: 0, row: 0.5 },
              { id: "queue", kind: "queue", label: `${subtasks.length} subtarefas`, col: 1, row: 0.5 },
              { id: "w1", kind: "agent", label: "worker 1", col: 2, row: 0 },
              { id: "w2", kind: "agent", label: "worker 2", col: 2, row: 1 },
              { id: "aggregator", kind: "llm", label: "agregador", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "orchestrator", to: "queue", label: "fan-out" },
              { from: "queue", to: "w1" },
              { from: "queue", to: "w2" },
              { from: "w1", to: "aggregator", label: "fan-in" },
              { from: "w2", to: "aggregator" },
            ],
            active: "queue",
          },
        ],
      },
      alt: `O orquestrador abre ${subtasks.length} subtarefas numa fila, em destaque; dois workers puxam tarefas dela ao mesmo tempo e entregam os resultados ao agregador.`,
    },
    {
      id: "latency",
      shortTitle: "Concorrência",
      title: "Mais vagas ajudam, até certo ponto",
      tag: "mechanism",
      body: [
        "Contratar o quinto cozinheiro não adianta se só existem quatro pratos para preparar, e o feijão demora o mesmo com ou sem ajuda. O ganho para quando cada tarefa já tem a sua vaga.",
        `Com 1 vaga, o fluxo vira sequencial: ${seconds(withConcurrency(1))}. Com ${LIMIT}, ${seconds(limited)}. A partir de ${plateau} vagas, o total para em ${seconds(unbounded)}: a tarefa mais lenta, ${subtasks[0].label} com ${seconds(subtasks[0].seconds)}, mais o agregador. O escalonamento da cena é guloso, como um semáforo: a próxima tarefa começa assim que uma vaga abre, e as mais longas saem primeiro.`,
      ],
      keyIdea: "Paralelizar corta a espera até o limite da tarefa mais lenta; depois disso, mais vagas só gastam mais.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "latency",
            piece: "chart",
            kind: "bar",
            series: latencySeries,
            highlight: concurrencies.indexOf(LIMIT),
            color: "module-12",
          },
        ],
      },
      alt: `Latência por número de vagas: ${latencySeries.map((item) => `${item.label}, ${seconds(item.value)}`).join("; ")}. A partir de ${plateau} vagas, o tempo não cai mais.`,
    },
    {
      id: "dag",
      shortTitle: "Dependências",
      title: "O caminho crítico manda no relógio",
      tag: "example",
      body: [
        "Nem tudo dá para fazer ao mesmo tempo: o orçamento da viagem precisa do preço do voo e do hotel, e o roteiro precisa do orçamento e do clima. É como montar o prato: não adianta ter a salada pronta se o arroz ainda está no fogo.",
        `No grafo da cena, a soma de todas as tarefas é ${seconds(dagSequential)}, mas o [[caminho crítico|critical-path]] é ${criticalPath.map(labelOf).join(" → ")}, com ${seconds(criticalTime)}. Esse é o mínimo, mesmo com vagas infinitas. Para acelerar, encurte uma tarefa do caminho crítico; acelerar o clima não muda nada. O LLMCompiler (Kim et al., 2023) aplica essa ideia a ferramentas: um planejador monta o grafo de chamadas e roda em paralelo as que não dependem umas das outras.`,
      ],
      keyIdea: "A latência mínima de um fluxo é a do caminho de dependências mais longo, não a soma das tarefas.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "dag",
            piece: "graph",
            nodes: dag.map((node) => ({
              id: node.id,
              label: `${node.id === "understand" ? "entender" : node.label} ${seconds(node.seconds)}`,
              ...(dagPositions[node.id] ?? { x: 0.5, y: 0.5 }),
              ...(node.id === last.id ? { color: "module-12" as const } : {}),
            })),
            edges: dag.flatMap((node) => node.after.map((from) => ({ from, to: node.id }))),
            path: criticalPath,
          },
        ],
      },
      alt: `Grafo de dependências da viagem. O caminho crítico em destaque é ${criticalPath.map(labelOf).join(", ")}, com ${seconds(criticalTime)}; a soma de todas as tarefas seria ${seconds(dagSequential)}.`,
    },
    {
      id: "vote",
      shortTitle: "Votação",
      title: "Paralelo também serve para votar",
      tag: "tradeoff",
      body: [
        "Outra forma de usar vários cozinheiros é pedir a três que provem o molho e seguir a maioria. Ninguém trabalha mais rápido, mas um paladar ruim sozinho não decide.",
        `Rodar a mesma tarefa várias vezes e ficar com a maioria é a votação, primo do [[self-consistency|self-consistency]]. Se cada voto acerta com ${percent(P)} e os votos fossem independentes, a maioria de 3 acerta com p³ + 3p²(1 − p) = ${percent(majority3)} e a de 5 com ${percent(majority5)}. Na prática, cópias do mesmo modelo erram de forma parecida, então o ganho real é menor; e o custo cresce na mesma proporção dos votos: 3 votos custam 3 vezes.`,
      ],
      keyIdea: "Votar troca custo por confiança, e só rende o que a independência entre os votos permite.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "vote",
            piece: "metrics-panel",
            metrics: [
              { id: "single", label: "1 voto", value: percent(P) },
              { id: "three", label: "maioria de 3", value: percent(majority3), color: "success" },
              { id: "five", label: "maioria de 5", value: percent(majority5), color: "success" },
              { id: "cost", label: "custo de 3 votos", value: "3×", color: "danger" },
            ],
            highlight: "three",
          },
        ],
      },
      alt: `Painel da votação com votos independentes: um voto acerta ${percent(P)}, a maioria de 3 acerta ${percent(majority3)}, a maioria de 5 acerta ${percent(majority5)}, e 3 votos custam 3 vezes mais.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Em fila quando depende, em paralelo quando não",
      tag: "summary",
      body: [
        "Use o fluxo sequencial quando cada passo precisa do anterior, e o paralelo quando as subtarefas são independentes, seja para ganhar tempo (dividir) ou confiança (votar). O caminho crítico diz quanto dá para ganhar, e o limite de concorrência diz quanto se consegue de verdade.",
        "Paralelizar também multiplica as ações que acontecem sem ninguém olhar. Algumas delas não deveriam acontecer sem uma pessoa aprovar: a próxima aula trata do human-in-the-loop.",
      ],
      keyIdea: "Sequencial soma, paralelo pega o máximo, e o caminho crítico é o piso de qualquer fluxo.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "fan",
            piece: "block-diagram",
            blocks: [
              { id: "orchestrator", kind: "agent", label: "orquestrador", col: 0, row: 0.5 },
              { id: "queue", kind: "queue", label: `${subtasks.length} subtarefas`, col: 1, row: 0.5 },
              { id: "w1", kind: "agent", label: "worker 1", col: 2, row: 0 },
              { id: "w2", kind: "agent", label: "worker 2", col: 2, row: 1 },
              { id: "aggregator", kind: "llm", label: "agregador", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "orchestrator", to: "queue", label: "fan-out" },
              { from: "queue", to: "w1" },
              { from: "queue", to: "w2" },
              { from: "w1", to: "aggregator", label: "fan-in" },
              { from: "w2", to: "aggregator" },
            ],
            active: "aggregator",
            done: ["orchestrator", "queue", "w1", "w2"],
          },
        ],
      },
      alt: "O fluxo completo: o orquestrador abre as subtarefas, os dois workers as executam em paralelo e o agregador, em destaque, junta os resultados.",
    },
  ],
  realWorldExample:
    "No sistema de pesquisa multiagente da Anthropic, o agente líder cria de 3 a 5 subagentes em paralelo, e cada subagente usa 3 ou mais ferramentas em paralelo. A Anthropic relata que essas duas mudanças cortaram o tempo de pesquisa em até 90% nas perguntas complexas.",
  code: {
    language: "python",
    source: `import asyncio

async def fan_out(subtasks, worker, aggregate, limit=2):
    semaphore = asyncio.Semaphore(limit)

    async def run(task):
        async with semaphore:          # no máximo \`limit\` ao mesmo tempo
            return await worker(task)

    results = await asyncio.gather(*(run(task) for task in subtasks))
    return await aggregate(results)    # fan-in`,
    caption: "Fan-out com limite de concorrência e fan-in num agregador, com asyncio: o semáforo abre a próxima tarefa quando uma vaga fica livre.",
  },
  tradeOffs: {
    pros: [
      "Corta a latência até o caminho crítico quando as subtarefas são independentes",
      "Cada worker paralelo trabalha com contexto próprio e menor",
      "A votação aumenta a confiança em tarefas com resposta verificável",
    ],
    cons: [
      "O custo em tokens é o mesmo ou maior: só o tempo de espera cai",
      "Limites de requisição e concorrência freiam o ganho",
      "Juntar resultados conflitantes no fan-in pede um agregador bem instruído",
    ],
    alternatives: [
      "Sequencial, quando cada passo depende do anterior",
      "Paralelismo de ferramentas dentro de um único agente, quando as subtarefas são só chamadas de API",
    ],
  },
  knowledgeCheck: [
    {
      id: "speed-up",
      prompt: "Um fluxo tem as etapas A (8 s) → C (2 s) e B (3 s) → C, com A e B independentes. Qual mudança reduz mais a latência?",
      options: [
        "Acelerar B de 3 s para 1 s",
        "Acelerar A, que está no caminho crítico",
        "Adicionar mais vagas de concorrência",
        "Rodar C duas vezes",
      ],
      correct: 1,
      explanation: "Com A e B em paralelo, o total é max(8, 3) + 2 = 10 s. Só encurtar A, que está no caminho crítico, reduz o total; acelerar B não muda nada.",
      lesson: "12-14",
    },
    {
      id: "more-slots",
      prompt: "Com 4 subtarefas e 4 vagas, um time quer subir para 16 vagas. O que esperar?",
      options: [
        "Latência 4 vezes menor",
        "Quase nada: com uma vaga por subtarefa, a latência já é a da mais lenta mais a agregação",
        "Respostas melhores",
        "Menos tokens gastos",
      ],
      correct: 1,
      explanation: "Depois que cada subtarefa tem a sua vaga, o piso é a tarefa mais lenta mais o agregador. Vagas extras ficam ociosas.",
      lesson: "12-14",
    },
  ],
  related: ["12-13", "12-15", "05-12"],
  references: [
    { title: "Anthropic: Building effective agents", url: "https://www.anthropic.com/engineering/building-effective-agents", kind: "article" },
    { title: "Kim et al. (2023), An LLM Compiler for Parallel Function Calling", url: "https://arxiv.org/abs/2312.04511", kind: "paper" },
    { title: "Anthropic: How we built our multi-agent research system", url: "https://www.anthropic.com/engineering/multi-agent-research-system", kind: "article" },
  ],
};

export default lesson;
