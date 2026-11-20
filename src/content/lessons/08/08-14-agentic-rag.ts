import { runAgent, type AgentIteration } from "../../../lab/agentLoop";
import type { LessonContent } from "../../../types/content";

// Agentic RAG com um roteiro fixo, rodado pelo mesmo loop do laboratório (runAgent). A pergunta precisa
// de dois saltos: a tabela de despesas de brinquedo diz qual equipe mais gastou com viagens em 2025, e o
// manual de RH diz quem aprova home office extra. Os scores do avaliador de chunks são de brinquedo, e o
// custo em tokens sai de um prompt base mais uma observação por iteração, reenviados a cada chamada.

const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");
const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });

const QUESTION = "Quem aprova home office extra para a equipe que mais gastou com viagens em 2025?";

// Salto 1: dados tabulares, que não estão no manual.
const travelExpenses = [
  { team: "Vendas Sul", total: 48_200 },
  { team: "Marketing", total: 31_900 },
  { team: "Engenharia", total: 22_400 },
  { team: "Financeiro", total: 9_800 },
];
const topTeam = [...travelExpenses].sort((a, b) => b.total - a.total)[0];

// Salto 2: o avaliador de chunks (o grader do Corrective RAG) julga a primeira busca e a reescrita.
const GRADE_THRESHOLD = 0.6;
const firstQuery = `home office ${topTeam.team}`;
const firstScores = [0.41, 0.37, 0.22];
const rewrittenQuery = "aprovação de dias extras de home office";
const rewrittenScores = [0.83, 0.64, 0.3];
const bestOf = (scores: number[]) => Math.max(...scores);
const firstPasses = bestOf(firstScores) >= GRADE_THRESHOLD;
const rewrittenPasses = bestOf(rewrittenScores) >= GRADE_THRESHOLD;
const APPROVER = "o diretor da área";

const MAX_ITERATIONS = 5;
const script: AgentIteration[] = [
  {
    thought: "Gasto com viagens é dado de despesas, não do manual: uso o SQL.",
    action: { tool: "sql", input: "equipe com maior gasto em viagens, 2025" },
    observation: `${topTeam.team}`,
  },
  {
    thought: `Agora a política de home office extra para ${topTeam.team}.`,
    action: { tool: "buscar_manual", input: firstQuery },
    observation: `melhor score ${fixed(bestOf(firstScores))}: abaixo de ${fixed(GRADE_THRESHOLD, 1)}`,
  },
  {
    thought: "Os trechos não falam de dias extras: reescrevo a busca sem o nome da equipe.",
    action: { tool: "buscar_manual", input: rewrittenQuery },
    observation: `melhor score ${fixed(bestOf(rewrittenScores))}: dias extras são aprovados pelo diretor da área`,
  },
  {
    thought: "Tenho os dois saltos e uma fonte que sustenta a resposta.",
    answer: `Para ${topTeam.team}, quem aprova é ${APPROVER}.`,
  },
];
const events = runAgent(script, MAX_ITERATIONS);
const textOf = (kind: "act" | "answer", iteration?: number) => {
  const event = events.find((item) => item.kind === kind && (iteration === undefined || item.iteration === iteration));
  return event && event.kind !== "limit" ? event.text : "";
};
const actOf = (iteration: number) => textOf("act", iteration);
const answerEvent = events.find((event) => event.kind === "answer");
const answerText = textOf("answer");
const iterationsUsed = answerEvent?.iteration ?? MAX_ITERATIONS;
const toolCalls = events.filter((event) => event.kind === "act").length;

// Custo: cada iteração é uma chamada ao LLM que reenvia o prompt base e todas as observações anteriores.
const BASE_PROMPT = 900;
const OBSERVATION = 350;
const iterationCounts = [1, 2, 3, 4, 5, 6];
const callTokens = (iteration: number) => BASE_PROMPT + (iteration - 1) * OBSERVATION;
const cumulativeTokens = (iterations: number) =>
  iterationCounts.filter((count) => count <= iterations).reduce((total, count) => total + callTokens(count), 0);
const tokenSeries = iterationCounts.map((count) => ({ label: `${count} iter.`, value: cumulativeTokens(count) }));
const capTokens = cumulativeTokens(MAX_ITERATIONS);
const usedTokens = cumulativeTokens(iterationsUsed);

const phases = [
  { id: "think", label: "pensar" },
  { id: "act", label: "buscar" },
  { id: "observe", label: "avaliar" },
];

const lesson: LessonContent = {
  id: "08-14",
  subtitle: "Quando o pipeline fixo vira um agente que decide se busca, em qual fonte, e se o que encontrou basta para responder.",
  objectives: [
    "Diferenciar um pipeline RAG fixo de um agente que escolhe as buscas",
    "Resolver uma pergunta de vários saltos com ferramentas diferentes",
    "Explicar o avaliador de chunks do Corrective RAG e a reescrita da busca",
    "Estimar o custo em tokens de cada iteração e justificar um limite",
  ],
  steps: [
    {
      id: "agent",
      shortTitle: "O agente",
      title: "Um bibliotecário que decide onde procurar",
      tag: "context",
      body: [
        `O pipeline fixo é um balcão que sempre faz a mesma coisa: recebe a pergunta, busca no manual, responde. Agora pense num bibliotecário que ouve “${QUESTION}” e pensa: “primeiro preciso da planilha de despesas, depois do manual”. Ele escolhe a fonte, confere o que achou e volta a procurar se não bastar.`,
        "Isso é [[agentic RAG|agentic-rag]]: a busca vira uma ferramenta que um [[agente|agent]] chama por [[tool calling|tool-calling]], tantas vezes quanto precisar. Cada fonte é uma ferramenta com descrição própria: o manual no banco vetorial, as despesas num banco SQL, a web para o que é público. O modelo decide, a cada passo, se busca, onde busca e se já pode responder.",
      ],
      keyIdea: "No agentic RAG, a recuperação deixa de ser uma etapa fixa e vira uma decisão do modelo.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "user", kind: "user", label: "pergunta", col: 0, row: 0.5 },
              { id: "agent", kind: "agent", label: "agente", col: 1, row: 0.5 },
              { id: "docs", kind: "vector-db", label: "manual rh", col: 2, row: 0 },
              { id: "sql", kind: "sql-db", label: "despesas", col: 2, row: 1 },
              { id: "web", kind: "cloud", label: "web", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "user", to: "agent" },
              { from: "agent", to: "docs", label: "buscar_manual" },
              { from: "agent", to: "sql", label: "sql" },
              { from: "agent", to: "web", label: "buscar_web" },
            ],
            active: "agent",
          },
        ],
      },
      alt: "A pergunta chega ao agente, em destaque, que pode chamar três ferramentas: a busca no manual de RH, o banco SQL de despesas e a busca na web.",
    },
    {
      id: "hop-1",
      shortTitle: "1º salto",
      title: "A primeira busca não é no manual",
      tag: "mechanism",
      body: [
        `A pergunta tem duas perguntas dentro. Nenhum chunk do manual diz qual equipe gastou mais: isso está numa tabela. Na iteração 1, o agente pensa, escolhe a ferramenta SQL e recebe a resposta: ${topTeam.team}, com R$ ${integer(topTeam.total)} em viagens.`,
        `Isso é [[recuperação em vários saltos|multi-hop-retrieval]]: o resultado do primeiro salto vira parte da pergunta do segundo. O padrão do loop é o do [[ReAct|react-prompting]]: pensar, agir, observar. A chamada da iteração 1 foi ${actOf(1)}. Um pipeline fixo buscaria a frase inteira no manual e voltaria com trechos sobre viagens, sem a equipe.`,
      ],
      keyIdea: "Perguntas de vários saltos pedem buscas em sequência, e cada salto pode usar uma fonte diferente.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "loop",
            piece: "agent-loop",
            phases,
            active: "act",
            iteration: 1,
            maxIterations: MAX_ITERATIONS,
            tool: actOf(1),
          },
        ],
      },
      alt: `Loop do agente na iteração 1 de ${MAX_ITERATIONS}, na fase de busca, chamando ${actOf(1)}. A resposta é ${topTeam.team}.`,
    },
    {
      id: "grade",
      shortTitle: "Avaliar",
      title: "O agente confere o que encontrou",
      tag: "mechanism",
      body: [
        `Na iteração 2, o agente busca “${firstQuery}” no manual. Um bom pesquisador não aceita o primeiro resultado sem ler: o avaliador dá nota aos chunks, e o melhor fica em ${fixed(bestOf(firstScores))}, abaixo do mínimo de ${fixed(GRADE_THRESHOLD, 1)}. Os trechos falam de vendas e de home office, mas não de dias extras.`,
        `Esse avaliador é a ideia do [[Corrective RAG|corrective-rag]] (Yan et al., 2024): um modelo leve classifica a recuperação como correta, ambígua ou incorreta, e só a correta segue direto para a geração. O [[Self-RAG|self-rag]] (Asai et al., 2023) leva a crítica para dentro do LLM, treinado para emitir tokens de reflexão que dizem se deve buscar, se o trecho é relevante e se a resposta é sustentada por ele.`,
      ],
      keyIdea: "Antes de gerar, julgue a recuperação: trecho fraco é sinal para buscar de novo, não para responder.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "grader",
            piece: "metrics-panel",
            metrics: [
              { id: "best", label: "melhor score", value: fixed(bestOf(firstScores)), color: "danger" },
              { id: "threshold", label: "mínimo do avaliador", value: fixed(GRADE_THRESHOLD, 1) },
              { id: "verdict", label: "veredito", value: firstPasses ? "correta" : "buscar de novo", color: "danger" },
            ],
            highlight: "verdict",
          },
          {
            id: "loop",
            piece: "agent-loop",
            phases,
            active: "observe",
            iteration: 2,
            maxIterations: MAX_ITERATIONS,
            tool: actOf(2),
          },
        ],
      },
      alt: `Iteração 2 de ${MAX_ITERATIONS}, na fase de avaliação, depois de ${actOf(2)}. O melhor score, ${fixed(bestOf(firstScores))}, fica abaixo do mínimo de ${fixed(GRADE_THRESHOLD, 1)}, e o veredito é buscar de novo.`,
    },
    {
      id: "correct",
      shortTitle: "Corrigir",
      title: "Reescrever a busca e tentar de novo",
      tag: "example",
      body: [
        `Na iteração 3, o agente tira o nome da equipe, que não aparece no manual, e busca “${rewrittenQuery}”. Agora o melhor chunk tem ${fixed(bestOf(rewrittenScores))} e diz que dias extras são aprovados pelo diretor da área: o avaliador aceita.`,
        `Na iteração ${iterationsUsed}, o agente responde: “${answerText}” Foram ${toolCalls} chamadas de ferramenta e ${iterationsUsed} de ${MAX_ITERATIONS} iterações. No CRAG, quando a recuperação é julgada incorreta, a saída também pode ser trocar de fonte, como uma busca na web: é o caminho tracejado da cena.`,
      ],
      keyIdea: "Corrigir é reescrever a busca ou trocar de fonte, guiado pelo veredito do avaliador.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "agent", kind: "agent", label: "agente", col: 0, row: 0.5 },
              { id: "docs", kind: "retrieval", label: "busca reescrita", col: 1, row: 0 },
              { id: "grader", kind: "eval", label: "avaliador", col: 2, row: 0 },
              { id: "web", kind: "cloud", label: "web", col: 2, row: 1 },
              { id: "llm", kind: "llm", label: "geração", col: 3, row: 0 },
              { id: "answer", kind: "answer", label: "resposta", col: 3, row: 1 },
            ],
            edges: [
              { from: "agent", to: "docs", label: "nova busca" },
              { from: "docs", to: "grader", label: `${fixed(bestOf(rewrittenScores))}` },
              { from: "grader", to: "llm", label: rewrittenPasses ? "correta" : "fraca" },
              { from: "grader", to: "web", label: "incorreta", variant: "alternative" },
              { from: "llm", to: "answer" },
            ],
            active: "grader",
            done: ["agent", "docs"],
          },
        ],
      },
      alt: `O agente faz a busca reescrita, o avaliador, em destaque, dá ${fixed(bestOf(rewrittenScores))} ao melhor chunk e libera a geração da resposta. Um caminho tracejado leva à busca na web quando a recuperação é incorreta.`,
    },
    {
      id: "cost",
      shortTitle: "Custo",
      title: "Cada volta do loop reenvia tudo",
      tag: "tradeoff",
      body: [
        "Um agente que pesquisa sem parar é como um estagiário que nunca entrega o relatório: cada ida à biblioteca custa tempo. E cada iteração é uma chamada ao LLM que reenvia o prompt inteiro, agora maior por causa da observação anterior.",
        `Com um prompt base de ${integer(BASE_PROMPT)} tokens e ${integer(OBSERVATION)} por observação, a chamada n lê ${integer(BASE_PROMPT)} + (n − 1) × ${integer(OBSERVATION)} tokens, e o total cresce mais rápido que o número de iterações: ${integer(usedTokens)} tokens de entrada nas ${iterationsUsed} iterações desta pergunta e ${integer(capTokens)} se o agente bater no limite de ${MAX_ITERATIONS}. Por isso o limite de iterações é obrigatório, e perguntas simples devem ir pelo pipeline fixo, com um roteador decidindo o caminho.`,
      ],
      keyIdea: "Iterações custam tokens que crescem com o histórico: limite o loop e mande o simples pelo caminho curto.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "tokens",
            piece: "chart",
            kind: "bar",
            series: tokenSeries,
            highlight: iterationCounts.indexOf(iterationsUsed),
            color: "module-08",
          },
        ],
      },
      alt: `Tokens de entrada acumulados por número de iterações: ${tokenSeries.map((item) => `${item.label} ${integer(item.value)}`).join(", ")}. A pergunta da aula usou ${iterationsUsed} iterações e ${integer(usedTokens)} tokens; acima de ${MAX_ITERATIONS} iterações, o limite corta.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Decidir, buscar, avaliar, repetir",
      tag: "summary",
      body: [
        "No agentic RAG, o modelo escolhe as buscas: qual fonte, com que texto e quantas vezes. Isso resolve perguntas de vários saltos e recuperações fracas, que um pipeline fixo não consegue corrigir sozinho.",
        "O preço é custo e imprevisibilidade, então o loop precisa de limite e de avaliação. A próxima aula mostra como medir se tudo isso funciona: as métricas de avaliação de RAG.",
      ],
      keyIdea: "Agente para o que é composto ou incerto; pipeline fixo para o resto; limite e avaliação sempre.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "steps",
            piece: "pipeline",
            display: "chips",
            stages: [
              { id: "route", label: "rotear a pergunta" },
              { id: "choose", label: "escolher a fonte" },
              { id: "search", label: "buscar", color: "module-08" },
              { id: "grade", label: "avaliar os chunks" },
              { id: "retry", label: "reescrever ou trocar" },
              { id: "answer", label: "responder com fonte", color: "brand" },
            ],
          },
        ],
      },
      alt: "Fluxo em chips: rotear a pergunta, escolher a fonte, buscar, avaliar os chunks, reescrever ou trocar de fonte e responder com fonte.",
    },
  ],
  realWorldExample:
    "A documentação do LangGraph traz tutoriais de Agentic RAG, Corrective RAG e Self-RAG em que um grafo de estados decide entre buscar, avaliar os documentos, reescrever a pergunta ou responder. O mesmo desenho aparece em assistentes de pesquisa que decidem sozinhos quando procurar na web antes de responder.",
  code: {
    language: "python",
    source: `MAX_ITERATIONS = 5

def agentic_rag(question, llm, tools):
    history = [question]
    for _ in range(MAX_ITERATIONS):
        step = llm.decide(history, tools)      # escolhe ferramenta e entrada, ou responde
        if step.answer:
            return step.answer
        result = tools[step.tool](step.input)  # manual, SQL ou web
        history.append(result)
    return "Não encontrei base suficiente para responder."`,
    caption: "O esqueleto do loop: o LLM decide a ferramenta a cada volta, e o limite de iterações garante uma saída honesta.",
  },
  tradeOffs: {
    pros: [
      "Resolve perguntas de vários saltos e que pedem fontes diferentes",
      "Corrige recuperações fracas reescrevendo a busca ou trocando de fonte",
      "Pula a busca quando a pergunta não precisa dela",
    ],
    cons: [
      "Mais chamadas de LLM, com tokens que crescem a cada iteração",
      "O caminho muda de uma execução para outra, o que dificulta testar",
      "Uma ferramenta mal descrita leva o agente a buscar no lugar errado",
    ],
    alternatives: [
      "Pipeline fixo com decomposição da pergunta, quando os saltos são previsíveis",
      "Um roteador que manda só as perguntas compostas para o agente",
    ],
  },
  knowledgeCheck: [
    {
      id: "multi-hop",
      prompt: "“Qual é o limite de reembolso do cargo da pessoa que mais viajou em 2025?” Por que um pipeline fixo tende a falhar?",
      options: [
        "Porque o banco vetorial não guarda números",
        "Porque a resposta depende de um primeiro salto (quem viajou mais) cuja resposta não está na pergunta",
        "Porque o LLM não sabe calcular",
        "Porque a pergunta é longa demais para o embedding",
      ],
      correct: 1,
      explanation: "A busca do pipeline fixo usa a pergunta como veio. Sem descobrir antes quem viajou mais e qual é o cargo, ela não sabe que trecho da política procurar.",
      lesson: "08-14",
    },
    {
      id: "grader-verdict",
      prompt: "O avaliador julgou os chunks recuperados como incorretos. O que o agente deve fazer antes de gerar?",
      options: [
        "Gerar a resposta mesmo assim, com mais temperatura",
        "Reescrever a busca ou consultar outra fonte, dentro do limite de iterações",
        "Aumentar o k até 100",
        "Encerrar o agente sem responder nada",
      ],
      correct: 1,
      explanation: "É o desenho do Corrective RAG: recuperação incorreta dispara uma nova busca ou outra fonte. Se o limite chegar, a saída é dizer que não há base, não inventar.",
      lesson: "08-14",
    },
  ],
  related: ["08-13", "08-15", "12-04"],
  references: [
    { title: "Yan et al. (2024), Corrective Retrieval Augmented Generation", url: "https://arxiv.org/abs/2401.15884", kind: "paper" },
    { title: "Asai et al. (2023), Self-RAG: Learning to Retrieve, Generate, and Critique through Self-Reflection", url: "https://arxiv.org/abs/2310.11511", kind: "paper" },
    { title: "Yao et al. (2022), ReAct: Synergizing Reasoning and Acting in Language Models", url: "https://arxiv.org/abs/2210.03629", kind: "paper" },
  ],
};

export default lesson;
