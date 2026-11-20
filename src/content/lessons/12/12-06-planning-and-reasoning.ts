import type { LessonContent } from "../../../types/content";

// Duas estratégias para a mesma tarefa de brinquedo (organizar o offsite da equipe em 4 subtarefas), com as
// contas no arquivo. ReAct: o modelo grande decide cada passo relendo o histórico inteiro. Plan-and-execute:
// o modelo grande planeja uma vez, um modelo pequeno executa cada passo só com o que precisa, e o grande junta
// os resultados. O custo é em unidades de brinquedo: 1 por token no modelo grande e SMALL_PRICE no pequeno.
// A conta de tentativas supõe tentativas independentes, só para mostrar a forma da curva.

const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");
const percent = (value: number) => `${Math.round(value * 100)}%`;

const GOAL = "Organizar o offsite da equipe na próxima sexta";
const plan = ["escolher data", "reservar sala", "pedir almoço", "enviar convite"];
const FAILING = plan.indexOf("reservar sala");
const newDate = "mover para segunda";

// ReAct: a chamada i lê BASE + (i − 1) × PER_ITERATION tokens, sempre no modelo grande.
const BASE = 1_400;
const PER_ITERATION = 450;
const reactTokens = (iterations: number) =>
  Array.from({ length: iterations }, (_, index) => BASE + index * PER_ITERATION).reduce((sum, value) => sum + value, 0);
const reactIterations = plan.length + 1;
const reactFailIterations = reactIterations + 2;

// Plan-and-execute: 1 chamada de planejamento, 1 por passo no executor pequeno e 1 de síntese. Com
// replanejamento, o executor para no passo que falha, o planejador relê o plano com os resultados até ali e a
// falha, e o executor refaz só do passo que falhou em diante.
const SMALL_PRICE = 0.2;
const EXECUTOR_INPUT = 600;
const RESULT = 300;
const SYNTHESIS_BASE = 800;
const planAndExecute = (replanned: boolean) => {
  const planner = BASE + (replanned ? BASE + (FAILING + 1) * RESULT : 0);
  const executorRuns = replanned ? FAILING + 1 + (plan.length - FAILING) : plan.length;
  const executor = executorRuns * EXECUTOR_INPUT;
  const synthesis = SYNTHESIS_BASE + plan.length * RESULT;
  return { bigTokens: planner + synthesis, smallTokens: executor, cost: planner + synthesis + executor * SMALL_PRICE };
};
const pae = planAndExecute(false);
const paeReplan = planAndExecute(true);
const reactCost = reactTokens(reactIterations);
const reactFailCost = reactTokens(reactFailIterations);

// Reflexão: uma tentativa ReAct que falha, uma chamada para escrever a reflexão e uma nova tentativa.
const REFLECTION_CALL = 1_500;
const reflectionCost = 2 * reactCost + REFLECTION_CALL;

const costSeries = [
  { label: "react", value: Math.round(reactCost) },
  { label: "react com falha", value: Math.round(reactFailCost) },
  { label: "plan-and-execute", value: Math.round(pae.cost) },
  { label: "p&e + replanejar", value: Math.round(paeReplan.cost) },
  { label: "react + reflexão", value: Math.round(reflectionCost) },
];
const paeSaving = 1 - pae.cost / reactCost;

// Tentativas com um verificador que detecta a falha: P(acertar em até k) = 1 − (1 − p)^k.
const P_ATTEMPT = 0.6;
const atLeastOnce = (attempts: number) => 1 - (1 - P_ATTEMPT) ** attempts;

const lesson: LessonContent = {
  id: "12-06",
  subtitle: "Decidir passo a passo (ReAct), planejar antes e executar depois, replanejar quando algo falha e aprender com a própria crítica.",
  objectives: [
    "Decompor um objetivo em subtarefas verificáveis",
    "Comparar ReAct e plan-and-execute em número de chamadas e custo",
    "Explicar quando e como o agente deve replanejar",
    "Descrever a reflexão: criticar a tentativa e usar a crítica na próxima",
  ],
  steps: [
    {
      id: "decompose",
      shortTitle: "Decompor",
      title: "Um objetivo vira uma lista de passos",
      tag: "context",
      body: [
        `Ninguém organiza uma festa fazendo tudo de uma vez. Você lista: data, lugar, comida, convite. Cada item é pequeno o bastante para ser feito e conferido. “${GOAL}” é grande demais para uma ação; quatro passos dão conta.`,
        `Isso é [[decomposição de tarefas|task-decomposition]], o primeiro movimento do [[planejamento|planning]]: transformar o objetivo em subtarefas que uma ferramenta consegue cumprir e que dão para verificar. O raciocínio passo a passo do [[chain-of-thought|chain-of-thought]] é a versão em texto disso; num agente, cada passo do plano vira uma ou mais ações.`,
      ],
      keyIdea: "Planejar começa por quebrar o objetivo em passos pequenos, executáveis e verificáveis.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "tree",
            piece: "graph",
            nodes: [
              { id: "goal", label: "offsite na sexta", x: 0.5, y: 0.12, color: "module-12" },
              ...plan.map((step, index) => ({ id: `s${index}`, label: step, x: 0.14 + index * 0.24, y: 0.75 })),
            ],
            edges: plan.map((_, index) => ({ from: "goal", to: `s${index}` })),
            highlight: ["goal"],
          },
        ],
      },
      alt: `Árvore com o objetivo, offsite na sexta, no topo, dividido em quatro subtarefas: ${plan.join(", ")}.`,
    },
    {
      id: "react",
      shortTitle: "ReAct",
      title: "ReAct: decidir um passo de cada vez",
      tag: "mechanism",
      body: [
        "Um jeito de seguir a lista é como um motorista sem mapa que pergunta o caminho a cada esquina: olha onde está, decide a próxima rua, anda, olha de novo. Ele se adapta bem a ruas fechadas, mas para em todas as esquinas.",
        `No [[ReAct|react-prompting]], o modelo pensa, age e observa a cada volta, sem um plano escrito. A tarefa leva ${reactIterations} voltas (${plan.length} ações e a resposta), todas no modelo grande, cada uma relendo o histórico: ${integer(reactCost)} tokens de entrada. A força do ReAct é reagir a cada observação; o custo é que o raciocínio de planejamento se repete em toda volta.`,
      ],
      keyIdea: "ReAct replaneja implicitamente a cada volta: flexível, mas paga o modelo grande em todos os passos.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "loop",
            piece: "agent-loop",
            phases: [
              { id: "think", label: "pensar" },
              { id: "act", label: "agir" },
              { id: "observe", label: "observar" },
            ],
            active: "think",
            iteration: 2,
            maxIterations: 8,
            tool: `reservar_sala("sexta")`,
          },
        ],
      },
      alt: `Loop ReAct na iteração 2 de 8, na fase pensar, antes de chamar reservar_sala para sexta.`,
    },
    {
      id: "plan-execute",
      shortTitle: "Planejar",
      title: "Plan-and-execute: o mapa antes da viagem",
      tag: "mechanism",
      body: [
        "O outro motorista abre o mapa antes de sair, traça a rota inteira e depois só dirige, conferindo as placas. Ele pensa uma vez com calma e executa sem parar em cada esquina.",
        `No [[plan-and-execute|plan-and-execute]], um planejador (o modelo grande) escreve a lista de passos numa chamada. Um executor (que pode ser um modelo menor) cumpre cada passo só com o que aquele passo precisa, e o modelo grande junta os resultados no fim. A ideia vem de trabalhos como o Plan-and-Solve (Wang et al., 2023), que pede ao modelo um plano antes de resolver. Na tarefa, são ${integer(pae.bigTokens)} tokens no modelo grande e ${integer(pae.smallTokens)} no pequeno.`,
      ],
      keyIdea: "Planejar uma vez e executar com contexto enxuto troca flexibilidade por custo menor e previsível.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "pae",
            piece: "block-diagram",
            blocks: [
              { id: "goal", kind: "user", label: "objetivo", col: 0, row: 0 },
              { id: "planner", kind: "llm", label: "planejador", col: 1, row: 0 },
              { id: "plan", kind: "documents", label: `plano: ${plan.length} passos`, col: 2, row: 0 },
              { id: "executor", kind: "agent", label: "executor", col: 2, row: 1 },
              { id: "tools", kind: "tool", label: "ferramentas", col: 3, row: 1 },
              { id: "answer", kind: "answer", label: "síntese", col: 3, row: 0 },
            ],
            edges: [
              { from: "goal", to: "planner" },
              { from: "planner", to: "plan", label: "1 chamada" },
              { from: "plan", to: "executor", label: "passo a passo" },
              { from: "executor", to: "tools" },
              { from: "executor", to: "answer", label: "resultados" },
            ],
            active: "plan",
            done: ["goal", "planner"],
          },
        ],
      },
      alt: `O objetivo vai ao planejador, que escreve o plano de ${plan.length} passos, em destaque; o executor cumpre cada passo com as ferramentas e entrega os resultados para a síntese.`,
    },
    {
      id: "replan",
      shortTitle: "Replanejar",
      title: "Quando o plano encontra a realidade",
      tag: "example",
      body: [
        `No passo “${plan[FAILING]}”, a ferramenta responde: nenhuma sala livre na sexta. Seguir o plano às cegas seria pedir almoço para um evento sem lugar. O executor para e devolve o problema ao planejador.`,
        `Isso é [[replanejamento|replanning]]: o planejador recebe o plano, os resultados até ali e a falha, e escreve um plano novo (aqui, ${newDate}). Custa mais uma chamada grande e refaz os passos seguintes, mas não o que já estava pronto: ${integer(paeReplan.cost)} unidades de custo contra ${integer(reactFailCost)} do ReAct com a mesma falha. A regra é verificar o resultado de cada passo antes de seguir.`,
      ],
      keyIdea: "Verifique cada passo; quando um falha, replaneje a partir do que já se sabe em vez de seguir o plano velho.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "plan-steps",
            piece: "pipeline",
            stages: plan.map((step, index) => ({ id: `s${index}`, label: step })),
            active: "replan",
            done: ["s0"],
            branch: { id: "replan", label: `replanejar: ${newDate}`, from: `s${FAILING}`, edgeLabel: "sem sala", color: "danger" },
          },
        ],
      },
      alt: `Pipeline do plano: ${plan.join(", ")}. O primeiro passo está feito; em ${plan[FAILING]}, um ramo tracejado sem sala leva ao replanejamento, em destaque: ${newDate}.`,
    },
    {
      id: "cost",
      shortTitle: "Custo",
      title: "Pensar uma vez ou pensar sempre",
      tag: "tradeoff",
      body: [
        "O motorista do mapa gasta menos quando a rota é conhecida; o que pergunta em cada esquina se sai melhor quando tudo muda o tempo todo. Não há vencedor geral: depende de quanto o caminho é previsível.",
        `Em unidades de brinquedo, com o modelo pequeno a ${SMALL_PRICE.toLocaleString("pt-BR")} por token: ${costSeries.map((item) => `${item.label}, ${integer(item.value)}`).join("; ")}. O plan-and-execute sai ${percent(paeSaving)} mais barato que o ReAct no caso normal, e o replanejamento ainda fica abaixo do ReAct com falha. O preço é rigidez: um plano ruim leva o executor a cumprir passos inúteis até alguém verificar.`,
      ],
      keyIdea: "Plan-and-execute é mais barato quando o caminho é previsível; ReAct, mais flexível quando não é.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "cost",
            piece: "chart",
            kind: "bar",
            series: costSeries,
            highlight: 2,
            color: "module-12",
          },
        ],
      },
      alt: `Custo em unidades de brinquedo: ${costSeries.map((item) => `${item.label}, ${integer(item.value)}`).join("; ")}. Plan-and-execute é a barra destacada.`,
    },
    {
      id: "reflect",
      shortTitle: "Reflexão",
      title: "Aprender com a tentativa que falhou",
      tag: "mechanism",
      body: [
        "Depois de uma prova ruim, um bom aluno escreve no caderno: “errei porque não li o enunciado até o fim”. Na próxima prova, ele relê a nota antes de começar. Ninguém mudou o cérebro dele; mudou o que ele lembra ao começar.",
        `A [[reflexão|reflection]] faz isso com agentes. No Reflexion (Shinn et al., 2023), depois de uma tentativa que falha num teste, o agente escreve em texto o que deu errado e guarda essa nota numa [[memória episódica|episodic-memory]] que entra no contexto da próxima tentativa, sem mudar os pesos. Só funciona com um sinal de falha confiável, como um teste. Supondo tentativas independentes com ${percent(P_ATTEMPT)} de acerto, um verificador eleva o acerto para ${percent(atLeastOnce(2))} em até 2 tentativas e ${percent(atLeastOnce(3))} em até 3; a reflexão tenta fazer cada tentativa nova melhor que a anterior.`,
      ],
      keyIdea: "Reflexão = verificar, escrever a crítica e reler a crítica na próxima tentativa, sem treinar o modelo.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "attempts",
            piece: "metrics-panel",
            metrics: [
              { id: "k1", label: "1 tentativa", value: percent(atLeastOnce(1)) },
              { id: "k2", label: "até 2", value: percent(atLeastOnce(2)) },
              { id: "k3", label: "até 3", value: percent(atLeastOnce(3)), color: "success" },
            ],
            highlight: "k2",
          },
          {
            id: "reflexion",
            piece: "block-diagram",
            blocks: [
              { id: "agent", kind: "agent", label: "tentativa", col: 0, row: 0 },
              { id: "test", kind: "eval", label: "teste falha", col: 1, row: 0 },
              { id: "critic", kind: "llm", label: "escreve crítica", col: 2, row: 0 },
              { id: "memory", kind: "memory", label: "notas", col: 3, row: 0 },
            ],
            edges: [
              { from: "agent", to: "test" },
              { from: "test", to: "critic", label: "o que deu errado" },
              { from: "critic", to: "memory", label: "guarda" },
              { from: "memory", to: "agent", label: "próxima tentativa" },
            ],
            active: "memory",
            done: ["agent", "test", "critic"],
          },
        ],
      },
      alt: `A tentativa do agente falha no teste, um modelo escreve a crítica e a guarda nas notas, em destaque, que voltam para a próxima tentativa. Painel com tentativas independentes de ${percent(P_ATTEMPT)}: ${percent(atLeastOnce(1))} em 1, ${percent(atLeastOnce(2))} em até 2 e ${percent(atLeastOnce(3))} em até 3.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Planejar, executar, verificar, ajustar",
      tag: "summary",
      body: [
        "Planejar é decompor o objetivo; executar pode ser passo a passo (ReAct) ou seguindo um plano (plan-and-execute); verificar cada resultado diz quando replanejar; e a reflexão transforma falhas em notas para a próxima tentativa.",
        "Repare que a reflexão depende de lembrar. Reflexões, preferências do usuário e fatos aprendidos precisam ficar guardados em algum lugar entre uma tarefa e outra. A próxima aula é sobre a memória do agente.",
      ],
      keyIdea: "Planejamento bom é o que se verifica e se corrige; a memória é o que leva a lição para a próxima vez.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "cycle",
            piece: "pipeline",
            display: "chips",
            stages: [
              { id: "decompose", label: "decompor" },
              { id: "plan", label: "planejar", color: "module-12" },
              { id: "execute", label: "executar" },
              { id: "verify", label: "verificar" },
              { id: "replan", label: "replanejar se falhar" },
              { id: "reflect", label: "refletir e guardar", color: "brand" },
            ],
          },
        ],
      },
      alt: "Fluxo em chips: decompor, planejar, executar, verificar, replanejar se falhar, refletir e guardar.",
    },
  ],
  realWorldExample:
    "No sistema de pesquisa multiagente da Anthropic, o agente líder analisa a pergunta, desenvolve uma estratégia e salva o plano na memória, para que ele sobreviva se o contexto for truncado; depois cria subagentes para cada frente e decide, com os resultados, se precisa de mais pesquisa.",
  code: {
    language: "python",
    source: `def plan_and_execute(goal, planner, executor, max_replans=2):
    plan = planner.make_plan(goal)                 # 1 chamada ao modelo grande
    results = []
    for _ in range(max_replans + 1):
        for step in plan[len(results):]:
            outcome = executor.run(step)           # contexto só do passo
            if not outcome.ok:
                plan = planner.replan(goal, plan, results, outcome)
                break
            results.append(outcome)
        else:
            return planner.synthesize(goal, results)
    raise RuntimeError("plano não convergiu")`,
    caption: "Plan-and-execute com replanejamento limitado: o executor para no primeiro passo que falha e o planejador refaz o resto do plano.",
  },
  tradeOffs: {
    pros: [
      "Plan-and-execute pensa uma vez e executa com contexto enxuto e modelos menores",
      "ReAct se adapta a cada observação, sem depender de um plano bom",
      "Reflexão melhora tentativas seguintes sem treinar o modelo",
    ],
    cons: [
      "Um plano ruim faz o executor cumprir passos inúteis até alguém verificar",
      "ReAct paga o modelo grande e o histórico inteiro em toda volta",
      "Reflexão só funciona com um sinal de falha confiável, como um teste",
    ],
    alternatives: [
      "Tree of Thoughts, quando vale explorar vários caminhos de raciocínio antes de escolher",
      "Um workflow fixo, quando o plano é sempre o mesmo",
    ],
  },
  knowledgeCheck: [
    {
      id: "pick-strategy",
      prompt: "Um agente gera relatórios mensais sempre com as mesmas 6 etapas: buscar vendas, buscar metas, calcular desvios, gerar gráficos, escrever o texto, enviar. Qual estratégia tende a custar menos?",
      options: [
        "ReAct com o modelo grande decidindo cada etapa",
        "Plan-and-execute: as etapas são previsíveis, então o plano sai uma vez e um executor menor cumpre cada uma",
        "Reflexão a cada etapa, mesmo sem falha",
        "Vários agentes debatendo o plano todo mês",
      ],
      correct: 1,
      explanation: "Quando o caminho é previsível, planejar uma vez e executar com contexto enxuto evita repetir o raciocínio em toda volta. Se o plano for sempre idêntico, um workflow fixo é ainda mais simples.",
      lesson: "12-06",
    },
    {
      id: "when-replan",
      prompt: "No passo 2 de 5, a ferramenta informa que o produto escolhido no passo 1 está esgotado. O que o agente deve fazer?",
      options: [
        "Seguir o plano e comprar mesmo assim nos passos 3 a 5",
        "Replanejar a partir do que já sabe: o resultado do passo 1, a falha do passo 2 e o objetivo",
        "Recomeçar do zero, ignorando o que já foi feito",
        "Parar sem avisar ninguém",
      ],
      correct: 1,
      explanation: "A observação mostrou que o plano não serve mais. Replanejar com os resultados acumulados corrige o rumo sem refazer o que já está certo.",
      lesson: "12-06",
    },
  ],
  related: ["05-12", "12-05", "12-07"],
  references: [
    { title: "Yao et al. (2022), ReAct: Synergizing Reasoning and Acting in Language Models", url: "https://arxiv.org/abs/2210.03629", kind: "paper" },
    { title: "Wang et al. (2023), Plan-and-Solve Prompting", url: "https://arxiv.org/abs/2305.04091", kind: "paper" },
    { title: "Shinn et al. (2023), Reflexion: Language Agents with Verbal Reinforcement Learning", url: "https://arxiv.org/abs/2303.11366", kind: "paper" },
  ],
};

export default lesson;
