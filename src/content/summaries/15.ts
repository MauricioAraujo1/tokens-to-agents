import { catalog } from "../catalog";
import type { LessonId, SummaryContent } from "../../types/content";

// Cheat sheet do módulo 15 (SUM-01.1). O diagrama é desenhado pelo <Scene> num passo único, e a folha
// tem estilo de impressão em A4 (SUM-01.2). As aulas linkadas saem do catálogo: as 12 do módulo, em ordem.

const lessons: LessonId[] = (catalog.find((module) => module.id === "15")?.lessons ?? []).map((lesson) => lesson.id);

const summary: SummaryContent = {
  module: "15",
  concepts: [
    "Desenvolvimento assistido por IA vai do autocompletar ao agente de código, que edita, roda os testes e corrige sozinho. O ganho depende de quanto do ciclo a IA cobre (Lei de Amdahl) e precisa ser medido: num estudo controlado, uma tarefa nova saiu 55,8% mais rápida; no METR, desenvolvedores experientes em código próprio ficaram 19% mais lentos.",
    "Spec-driven development: spec revisada antes do código, código gerado a partir dela e conferido contra ela. Cada decisão aberta é um chute do agente, e a chance de acertar todos cai exponencialmente.",
    "A spec técnica tem problema, objetivos, non-goals, premissas marcadas, histórias com critérios, casos de borda e critérios de sucesso. Nenhuma palavra vaga: só comportamento que um teste confere.",
    "Critérios de aceite em EARS (WHEN, WHILE, IF ... THEN, WHERE) ou Given-When-Then. Cada critério vira testes por classe de entrada e limite; a matriz de rastreio acha critério sem teste.",
    "Design doc e ADRs fecham a forma do sistema e o porquê de cada escolha; fronteiras com baixo acoplamento encolhem o raio de impacto. O plano é um grafo de tarefas pequenas com pronto quando executável, e o caminho crítico dá o prazo mínimo.",
    "TDD: lista de casos, teste vermelho, mínimo verde, refatorar; com agentes, os testes commitados antes são o contrato. Testes gerados valem pelo oráculo (esperado da spec, não do código); mutation score mede o que foi conferido, propriedades cobrem qualquer entrada.",
    "Revisão com agentes: diff pequeno, revisor com contexto limpo e critério explícito, achados por severidade, decisão humana. CI com jobs paralelos e quality gate obrigatório antes do merge.",
    "Fluxo agêntico: uma worktree por agente, testes como oráculo do loop, portões automáticos antes do humano. A qualidade dos testes define os PRs verdes e errados; a revisão humana define a vazão. Dívida técnica se paga pelos juros, e o agente copia a dívida que encontra.",
  ],
  formulas: [
    "Ganho total (Amdahl) = 1 / ((1 − p) + p / s)",
    "Chance de acertar n decisões abertas = q^n, com q a chance por decisão",
    "Mutation score = detectados / (detectados + sobreviventes), sem os equivalentes",
    "Build vermelho sem bug = 1 − (1 − f)^n, com n testes de instabilidade f",
    "Acerto com k tentativas e oráculo perfeito = 1 − (1 − p)^k",
    "Meses para a dívida se pagar = principal / (dias extras por mudança × mudanças por mês)",
  ],
  pitfalls: [
    "Confiar na sensação de produtividade: no METR, quem ficou 19% mais lento achava ter ficado 20% mais rápido.",
    "Usar adjetivos na spec (“rápido”, “intuitivo”): nenhum teste consegue dizer se a frase foi cumprida.",
    "Deixar o agente gerar o esperado dos testes rodando o próprio código: o teste fica circular e crava o bug.",
    "Pedir “faça os testes passarem” sem travar os testes: o atalho é mudar o teste.",
    "Dividir em shards o que está fora do caminho crítico: gasta máquina sem encurtar o pipeline.",
    "Mais agentes quando a fila de revisão já cresce: a vazão é a atenção humana, não a produção de código.",
  ],
  diagram: {
    kind: "pieces",
    layout: "single",
    pieces: [
      {
        id: "module-15",
        piece: "block-diagram",
        blocks: [
          { id: "spec", kind: "documents", label: "spec e tarefas", col: 0, row: 0.5 },
          { id: "agent", kind: "agent", label: "agente", col: 1, row: 0.5 },
          { id: "tests", kind: "eval", label: "testes", col: 2, row: 0 },
          { id: "ci", kind: "guardrail", label: "ci e revisão", col: 2, row: 1 },
          { id: "human", kind: "user", label: "humano", col: 3, row: 1 },
          { id: "main", kind: "server", label: "main", col: 3, row: 0 },
        ],
        edges: [
          { from: "spec", to: "agent", label: "critérios" },
          { from: "agent", to: "tests", label: "loop" },
          { from: "tests", to: "ci", label: "pr" },
          { from: "ci", to: "human", label: "achados" },
          { from: "human", to: "main", label: "merge" },
        ],
        active: "agent",
      },
    ],
  },
  lessons,
};

export default summary;
