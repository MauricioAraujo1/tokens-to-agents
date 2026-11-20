import type { LessonContent } from "../../../types/content";

// Sistema multiagente com contas de brinquedo: uma pesquisa sobre 3 subtemas, cada um pedindo 4 buscas com
// resultados de 3 mil tokens. O agente único faz as 12 buscas na mesma janela e relê tudo a cada chamada; no
// time, cada subagente faz as 4 buscas do seu subtema numa janela própria e devolve um resumo ao líder.
// Os números de custo e de desempenho do sistema de pesquisa da Anthropic vêm do artigo citado nas referências.

const SUBTOPICS = 3;
const SEARCHES = 4;
const RESULT = 3_000;
const BASE = 1_500;
const SUMMARY = 800;

/** Tokens de entrada de um agente que faz `searches` buscas e depois responde, relendo tudo a cada chamada. */
const runTokens = (searches: number) =>
  Array.from({ length: searches + 1 }, (_, call) => BASE + call * RESULT).reduce((sum, value) => sum + value, 0);
const peakOf = (searches: number) => BASE + searches * RESULT;

const singleSearches = SUBTOPICS * SEARCHES;
const singleTotal = runTokens(singleSearches);
const singlePeak = peakOf(singleSearches);
const subTotal = runTokens(SEARCHES);
const subPeak = peakOf(SEARCHES);
const leadPlan = BASE;
const leadSynthesis = BASE + SUBTOPICS * SUMMARY;
const leadTotal = leadPlan + leadSynthesis;
const multiTotal = SUBTOPICS * subTotal + leadTotal;
const singleCalls = singleSearches + 1;
const multiCalls = SUBTOPICS * (SEARCHES + 1) + 2;

// Debate: N agentes respondem e revisam por R rodadas.
const DEBATERS = 3;
const ROUNDS = 3;
const debateCalls = DEBATERS * ROUNDS;

// Fatos do artigo “How we built our multi-agent research system” (Anthropic).
const AGENT_VS_CHAT = 4;
const MULTI_VS_CHAT = 15;
const MULTI_GAIN = 90.2;

const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");
const thousands = (value: number) => Number((value / 1000).toFixed(1));

const roles = ["editor", "repórter web", "repórter dados", "checador"];
const roleTools = ["busca_web", "sql", "ler_pdf", "publicar"];
const access = [
  [0, 0, 0, 1],
  [1, 0, 1, 0],
  [0, 1, 0, 0],
  [1, 0, 1, 0],
];
const toolsOf = (row: number) => roleTools.filter((_, col) => access[row][col] === 1);

const tokenSeries = [
  { label: "agente único", value: thousands(singleTotal) },
  ...Array.from({ length: SUBTOPICS }, (_, index) => ({ label: `subagente ${index + 1}`, value: thousands(subTotal) })),
  { label: "líder", value: thousands(leadTotal) },
];

const lesson: LessonContent = {
  id: "12-10",
  subtitle: "Quando dividir o trabalho entre vários agentes especializados ajuda, como eles se organizam e quanto isso custa.",
  objectives: [
    "Definir um sistema multiagente e o que muda em relação a um agente único",
    "Usar especialização para dar a cada agente só as instruções e ferramentas do seu papel",
    "Comparar o contexto e os tokens de um agente único com os de um time",
    "Avaliar quando o ganho de qualidade paga o custo extra",
  ],
  steps: [
    {
      id: "newsroom",
      shortTitle: "A redação",
      title: "Uma redação, não um repórter",
      tag: "context",
      body: [
        "Uma matéria grande não sai de uma pessoa só. O editor recebe a pauta e divide: um repórter apura na rua, outro levanta os números, e um checador confere tudo antes de publicar. Cada um sabe fazer bem uma parte e não precisa carregar as anotações dos outros.",
        "Um [[sistema multiagente|multi-agent-system]] faz o mesmo com LLMs: vários [[agentes|agent]], cada um com o seu prompt, as suas ferramentas e o seu contexto, que dividem a tarefa e trocam resultados. O desenho mais comum tem um agente líder que planeja e distribui o trabalho, workers que executam em paralelo e um passo final que junta e confere.",
      ],
      keyIdea: "Multiagente é dividir uma tarefa entre agentes com papéis, ferramentas e contextos separados.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "team",
            piece: "block-diagram",
            blocks: [
              { id: "user", kind: "user", label: "pauta", col: 0, row: 0.5 },
              { id: "editor", kind: "agent", label: "editor", col: 1, row: 0.5 },
              { id: "web", kind: "agent", label: "repórter web", col: 2, row: 0 },
              { id: "data", kind: "agent", label: "repórter dados", col: 2, row: 1 },
              { id: "checker", kind: "eval", label: "checador", col: 3, row: 0 },
              { id: "answer", kind: "answer", label: "matéria", col: 3, row: 1 },
            ],
            edges: [
              { from: "user", to: "editor" },
              { from: "editor", to: "web", label: "subtema a" },
              { from: "editor", to: "data", label: "subtema b" },
              { from: "web", to: "checker" },
              { from: "data", to: "checker" },
              { from: "checker", to: "answer", label: "confere" },
            ],
            active: "editor",
          },
        ],
      },
      alt: "A pauta chega ao agente editor, em destaque, que divide o trabalho entre um repórter web e um repórter de dados; os dois entregam ao checador, que confere antes de sair a matéria.",
    },
    {
      id: "roles",
      shortTitle: "Papéis",
      title: "Cada agente com as suas ferramentas",
      tag: "mechanism",
      body: [
        "O repórter de dados não precisa da senha do sistema de publicação, e o editor não precisa saber rodar SQL. Dar a cada um só o que o papel exige evita confusão e acidentes.",
        `Isso é [[especialização|agent-specialization]]: instruções curtas e focadas e um conjunto pequeno de ferramentas por agente. Na matriz, o repórter de dados só tem ${toolsOf(2).join(", ")}, e só o editor pode ${toolsOf(0).join(", ")}. Menos ferramentas por agente significa escolhas mais fáceis, menos tokens de definição e permissões mínimas: um agente comprometido por uma prompt injection só alcança o que o seu papel alcança.`,
      ],
      keyIdea: "Especializar é restringir: prompt focado, poucas ferramentas e permissões só do papel.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "access",
            piece: "matrix",
            rows: roles,
            cols: roleTools,
            values: access,
            scale: { min: 0, max: 1 },
            highlight: { row: 2, col: 1 },
            color: "module-12",
          },
        ],
      },
      alt: `Matriz de acesso dos agentes às ferramentas: ${roles.map((role, row) => `${role} usa ${toolsOf(row).join(" e ")}`).join("; ")}. Em destaque, o repórter de dados com o SQL.`,
    },
    {
      id: "windows",
      shortTitle: "Janelas",
      title: "Cada um com a sua janela",
      tag: "mechanism",
      body: [
        `Um repórter sozinho cobrindo os ${SUBTOPICS} subtemas acumula as anotações de todos na mesma prancheta e relê tudo antes de cada decisão. No time, cada repórter só relê as anotações do seu subtema e entrega ao editor uma página de resumo.`,
        `Na conta da aula, o agente único faz ${singleSearches} buscas e chega a ${integer(singlePeak)} tokens de contexto na última chamada, somando ${integer(singleTotal)} tokens de entrada. Cada subagente faz ${SEARCHES} buscas, chega a ${integer(subPeak)} tokens e soma ${integer(subTotal)}; o líder lê ${SUBTOPICS} resumos de ${integer(SUMMARY)} tokens. O time inteiro soma ${integer(multiTotal)} tokens em ${multiCalls} chamadas, contra ${singleCalls} do agente único, e os subagentes podem rodar em paralelo.`,
      ],
      keyIdea: "Contextos separados evitam que cada decisão releia o trabalho de todos.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "tokens",
            piece: "chart",
            kind: "bar",
            series: tokenSeries,
            highlight: 0,
            color: "module-12",
          },
        ],
      },
      alt: `Tokens de entrada, em milhares: ${tokenSeries.map((item) => `${item.label} ${item.value}`).join(", ")}. O agente único, em destaque, relê os resultados de todos os subtemas.`,
    },
    {
      id: "debate",
      shortTitle: "Debate",
      title: "Três agentes discutindo a mesma pergunta",
      tag: "example",
      body: [
        "Nem todo time divide tarefas. Às vezes três especialistas respondem à mesma pergunta, leem as respostas uns dos outros e revisam a própria, como numa reunião de pauta em que a versão final é melhor que a de qualquer um sozinho.",
        `Esse é o [[debate multiagente|multi-agent-debate]] de Du et al. (2023): instâncias do modelo respondem, recebem as respostas das outras e revisam por algumas rodadas. Com ${DEBATERS} agentes e ${ROUNDS} rodadas, são ${debateCalls} chamadas para uma resposta, contra 1. É a topologia em rede, sem chefe; o editor com repórteres é a centralizada, e a de vários níveis, com editores de editoria, é a hierárquica.`,
      ],
      keyIdea: "Debate troca chamadas por qualidade: N agentes × R rodadas para uma resposta revisada.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "topology",
            piece: "graph",
            nodes: [
              { id: "question", label: "pergunta", x: 0.1, y: 0.5 },
              { id: "a", label: "agente a", x: 0.45, y: 0.15, color: "module-12" },
              { id: "b", label: "agente b", x: 0.45, y: 0.85 },
              { id: "c", label: "agente c", x: 0.7, y: 0.5 },
              { id: "final", label: `resposta após ${ROUNDS} rodadas`, x: 0.92, y: 0.5, color: "success" },
            ],
            edges: [
              { from: "question", to: "a" },
              { from: "question", to: "b" },
              { from: "a", to: "b", label: "lê e revisa" },
              { from: "b", to: "c", label: "lê e revisa" },
              { from: "c", to: "a", label: "lê e revisa" },
              { from: "c", to: "final" },
            ],
            path: ["question", "a", "b", "c", "final"],
          },
        ],
      },
      alt: `Grafo do debate: a pergunta vai para três agentes que leem e revisam as respostas uns dos outros em círculo; depois de ${ROUNDS} rodadas, sai a resposta final. São ${debateCalls} chamadas ao modelo.`,
    },
    {
      id: "price",
      shortTitle: "O preço",
      title: "Mais qualidade, muito mais tokens",
      tag: "tradeoff",
      body: [
        "Na conta de brinquedo, o time gastou menos tokens porque cada subagente fez as mesmas buscas sem reler as dos outros. Na prática, subagentes exploram mais livremente, e o total costuma subir bastante: a redação inteira custa mais que um repórter.",
        `A Anthropic relata, no seu sistema de pesquisa, que um agente usa cerca de ${AGENT_VS_CHAT} vezes os tokens de um chat, e o sistema multiagente cerca de ${MULTI_VS_CHAT} vezes. Em troca, o time (Claude Opus 4 como líder e Claude Sonnet 4 nos subagentes) superou o Claude Opus 4 sozinho em ${MULTI_GAIN.toLocaleString("pt-BR")}% na avaliação interna de pesquisa. O artigo conclui que vale para tarefas valiosas, muito paralelizáveis e com informação demais para uma janela, e não para tarefas em que todos precisam do mesmo contexto, como a maior parte das tarefas de código.`,
      ],
      keyIdea: "Multiagente compensa em tarefas amplas, paralelas e valiosas; no resto, é custo sem retorno.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "cost",
            piece: "metrics-panel",
            metrics: [
              { id: "agent", label: "agente vs. chat", value: `≈${AGENT_VS_CHAT}× tokens` },
              { id: "multi", label: "multiagente vs. chat", value: `≈${MULTI_VS_CHAT}× tokens`, color: "danger" },
              { id: "gain", label: "ganho na avaliação interna", value: `+${MULTI_GAIN.toLocaleString("pt-BR")}%`, color: "success" },
            ],
            highlight: "multi",
          },
        ],
      },
      alt: `Painel com os números do sistema de pesquisa da Anthropic: um agente usa cerca de ${AGENT_VS_CHAT} vezes os tokens de um chat, o multiagente cerca de ${MULTI_VS_CHAT} vezes, e o time superou o agente único em ${MULTI_GAIN.toLocaleString("pt-BR")}% na avaliação interna.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "O desenho do sistema de pesquisa",
      tag: "summary",
      body: [
        "O sistema de pesquisa da Anthropic resume o padrão: um líder analisa a pergunta, grava o plano numa memória para não perdê-lo se o contexto for truncado, cria subagentes que pesquisam em paralelo e, no fim, um agente de citações liga cada afirmação à sua fonte.",
        "Para isso funcionar, os agentes precisam trocar tarefas e resultados de um jeito claro. A próxima aula trata da comunicação entre agentes: mensagens, estado compartilhado e handoffs.",
      ],
      keyIdea: "Líder com plano em memória, subagentes em paralelo e uma etapa de conferência no fim.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "team",
            piece: "block-diagram",
            blocks: [
              { id: "user", kind: "user", label: "pergunta", col: 0, row: 0 },
              { id: "lead", kind: "agent", label: "líder", col: 1, row: 0.5 },
              { id: "plan", kind: "memory", label: "plano", col: 0, row: 1 },
              { id: "sub1", kind: "agent", label: "subagente 1", col: 2, row: 0 },
              { id: "sub2", kind: "agent", label: "subagente 2", col: 2, row: 1 },
              { id: "cite", kind: "eval", label: "citações", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "user", to: "lead" },
              { from: "lead", to: "plan", label: "grava" },
              { from: "lead", to: "sub1", label: "em paralelo" },
              { from: "lead", to: "sub2" },
              { from: "sub1", to: "cite", label: "achados" },
              { from: "sub2", to: "cite" },
            ],
            active: "cite",
            done: ["user", "lead", "plan", "sub1", "sub2"],
          },
        ],
      },
      alt: "A pergunta chega ao agente líder, que grava o plano numa memória e cria dois subagentes em paralelo; os achados vão para o agente de citações, em destaque, que liga cada afirmação à fonte.",
    },
  ],
  realWorldExample:
    "O recurso de pesquisa do Claude usa um agente líder que planeja, grava o plano em memória e cria de 3 a 5 subagentes em paralelo, cada um usando várias ferramentas ao mesmo tempo; a Anthropic relata que essa paralelização reduziu o tempo de pesquisa em até 90% nas perguntas complexas.",
  tradeOffs: {
    pros: [
      "Cada agente tem contexto, prompt e ferramentas só do seu papel",
      "Partes independentes rodam em paralelo",
      "Tarefas amplas cabem mesmo quando não caberiam numa janela só",
    ],
    cons: [
      "O total de tokens costuma ser muito maior que o de um agente único",
      "Mais pontos de falha: um resumo ruim de um subagente contamina o resultado",
      "Depurar e avaliar um time é bem mais difícil que um agente",
    ],
    alternatives: [
      "Agente único com boas ferramentas, quando a tarefa compartilha o mesmo contexto",
      "Workflow fixo de paralelização, quando as partes são conhecidas de antemão",
    ],
  },
  knowledgeCheck: [
    {
      id: "when-multi",
      prompt: "Qual destas tarefas mais se beneficia de um sistema multiagente?",
      options: [
        "Corrigir um bug numa função de 20 linhas",
        "Pesquisar 10 concorrentes em fontes diferentes e comparar preços, recursos e avaliações",
        "Responder uma pergunta frequente com um texto pronto",
        "Traduzir uma frase curta",
      ],
      correct: 1,
      explanation: "A pesquisa tem partes independentes (um concorrente por subagente), informação demais para uma janela e valor que paga o custo extra. As outras cabem num agente ou num prompt.",
      lesson: "12-10",
    },
    {
      id: "least-privilege",
      prompt: "Num time de agentes, o agente que lê e-mails de clientes também tem a ferramenta de emitir reembolsos. Qual é o risco?",
      options: [
        "Nenhum: mais ferramentas sempre ajudam",
        "Um e-mail com prompt injection pode levá-lo a emitir reembolsos; o papel de leitura não deveria ter essa ferramenta",
        "O agente fica mais lento",
        "Os tokens de saída aumentam",
      ],
      correct: 1,
      explanation: "Especialização também é segurança: o agente exposto a texto não confiável deve ter só as ferramentas do seu papel, e ações com dinheiro ficam com outro agente e com guardrails.",
      lesson: "12-10",
    },
  ],
  related: ["12-09", "12-11", "12-13"],
  references: [
    { title: "Anthropic: How we built our multi-agent research system", url: "https://www.anthropic.com/engineering/multi-agent-research-system", kind: "article" },
    { title: "Du et al. (2023), Improving Factuality and Reasoning in Language Models through Multiagent Debate", url: "https://arxiv.org/abs/2305.14325", kind: "paper" },
    { title: "Wu et al. (2023), AutoGen: Enabling Next-Gen LLM Applications via Multi-Agent Conversation", url: "https://arxiv.org/abs/2308.08155", kind: "paper" },
  ],
};

export default lesson;
