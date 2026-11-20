import type { BlockDiagramSpec } from "../../../scene/types";
import type { LessonContent } from "../../../types/content";

// Avaliação de agente com as contas no arquivo e dados de brinquedo declarados no texto: o estado final do banco
// comparado com o esperado; precision e recall das chamadas de ferramenta contra a trajetória de referência
// (casamento de multiconjunto) e se a referência aparece em ordem; uma matriz de 5 tarefas × 4 tentativas com
// pass@1, pass^4 e pass@4 contados nela; e passos extras e custo por tarefa resolvida.

const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const percent = (value: number) => `${Math.round(value * 100)}%`;
const listing = (items: string[]) => (items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} e ${items[items.length - 1]}`);
const money = (value: number) => `US$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}`;

// Passo 2: estado final.
const expectedState = { reembolso: "sim", valor: 150, status: "reembolsado" };
const finalState = { reembolso: "sim", valor: 150, status: "reembolsado" };
const stateMatches = (Object.keys(expectedState) as Array<keyof typeof expectedState>).every((key) => expectedState[key] === finalState[key]);

// Passo 3: trajetória esperada contra a executada.
const expected = ["buscar_pedido", "verificar_politica", "reembolsar"];
const actual = ["buscar_cliente", "buscar_pedido", "buscar_pedido", "reembolsar"];
const matchedIndexes = (() => {
  const remaining = [...expected];
  return actual
    .map((call, index) => {
      const at = remaining.indexOf(call);
      if (at < 0) return -1;
      remaining.splice(at, 1);
      return index;
    })
    .filter((index) => index >= 0);
})();
const matched = matchedIndexes.length;
const toolPrecision = matched / actual.length;
const toolRecall = matched / expected.length;
const missing = expected.filter((call) => !actual.includes(call));
const isSubsequence = (needle: string[], haystack: string[]) => {
  let position = 0;
  for (const call of haystack) if (call === needle[position]) position += 1;
  return position === needle.length;
};
const inOrder = isSubsequence(expected, actual);

// Passo 4: 5 tarefas × 4 tentativas (1 = estado final correto e nenhuma regra violada).
const tasks = ["reembolso", "troca", "cancelar", "endereço", "cupom"];
const TRIALS = 4;
const runs = [
  [1, 1, 0, 1],
  [1, 1, 1, 1],
  [1, 0, 1, 0],
  [1, 1, 1, 1],
  [0, 1, 1, 1],
];
const passAt1 = runs.flat().reduce((total, value) => total + value, 0) / runs.flat().length;
const passHatK = runs.filter((row) => row.every((value) => value === 1)).length / runs.length;
const passAtK = runs.filter((row) => row.some((value) => value === 1)).length / runs.length;
const flaky = tasks.filter((_, index) => runs[index].some((value) => value === 0));

// Passo 5: passos por execução, ótimo de cada tarefa e custo.
const stepsUsed = [4, 3, 7, 3, 5];
const optimalSteps = [3, 3, 4, 3, 3];
const extraSteps = stepsUsed.map((steps, index) => steps - optimalSteps[index]);
const COST_PER_STEP = 0.01;
const totalCost = stepsUsed.reduce((total, steps) => total + steps * TRIALS * COST_PER_STEP, 0);
const successes = runs.flat().filter((value) => value === 1).length;
const costPerSuccess = totalCost / successes;
const overhead = stepsUsed.reduce((a, b) => a + b, 0) / optimalSteps.reduce((a, b) => a + b, 0) - 1;
const WORST = extraSteps.indexOf(Math.max(...extraSteps));

const harness = (active: string, done?: string[]): BlockDiagramSpec => ({
  id: "harness",
  piece: "block-diagram",
  blocks: [
    { id: "user", kind: "user", label: "usuário simulado", col: 0, row: 0.5 },
    { id: "agent", kind: "agent", label: "agente", col: 1, row: 0.5 },
    { id: "tools", kind: "tool", label: "ferramentas", col: 2, row: 0 },
    { id: "db", kind: "sql-db", label: "estado final", col: 2, row: 1 },
    { id: "eval", kind: "eval", label: "confere", col: 3, row: 0.5 },
  ],
  edges: [
    { from: "user", to: "agent", label: "pedido" },
    { from: "agent", to: "tools", label: "chamadas" },
    { from: "tools", to: "db", label: "escreve" },
    { from: "tools", to: "eval", label: "trajetória" },
    { from: "db", to: "eval", label: "resultado" },
  ],
  active,
  done,
});

const lesson: LessonContent = {
  id: "16-05",
  subtitle: "Como avaliar um agente pelo resultado e pelo caminho: estado final, trajetória de ferramentas, consistência entre tentativas e custo por tarefa resolvida.",
  objectives: [
    "Montar um ambiente de avaliação com usuário simulado e estado final verificável",
    "Calcular precision e recall das chamadas de ferramenta contra uma trajetória de referência",
    "Medir consistência com pass@1, pass^k e pass@k numa matriz de tentativas",
    "Incluir eficiência e custo por tarefa resolvida na nota do agente",
  ],
  steps: [
    {
      id: "driving-test",
      shortTitle: "O exame",
      title: "O exame de direção olha o destino e o caminho",
      tag: "context",
      body: [
        "No exame de direção, chegar ao ponto final não basta: o examinador também anota se você furou um sinal ou subiu na calçada. Um agente é parecido. Ele recebe um pedido, decide sozinho as chamadas de ferramenta e muda o mundo: grava num banco, manda um e-mail, faz um reembolso. Avaliar só o texto final deixa de fora quase tudo que importa.",
        "Um ambiente de avaliação de agente tem três peças. Um [[usuário simulado|user-simulator]], em geral outro LLM com um roteiro, conversa com o agente como um cliente faria. As ferramentas são de verdade ou réplicas fiéis, num banco isolado. E o avaliador confere duas coisas: o estado final do banco e a trajetória de chamadas. O τ-bench (Yao et al., 2024) é montado exatamente assim.",
      ],
      keyIdea: "Agente se avalia num ambiente: usuário simulado, ferramentas com estado e um avaliador do resultado e do caminho.",
      scene: { kind: "pieces", layout: "single", pieces: [harness("agent")] },
      alt: "Um usuário simulado faz o pedido ao agente, em destaque, que chama ferramentas; as ferramentas escrevem no estado final, e o avaliador confere a trajetória e o resultado.",
    },
    {
      id: "outcome",
      shortTitle: "Resultado",
      title: "O banco ficou como deveria?",
      tag: "mechanism",
      body: [
        "O pedido do exemplo é “quero o reembolso do pedido 123”, e a política diz que pedidos de até 30 dias têm reembolso integral. A [[avaliação do estado final|final-state-evaluation]] não lê a conversa: compara o banco depois da execução com o estado esperado, escrito por quem montou a tarefa. Reembolso, valor e status batem, então a tarefa passa.",
        `É o critério mais objetivo para agentes, porque muitas conversas diferentes levam ao mesmo estado correto. No SWE-bench, o estado final é o repositório, e o critério são os testes que a correção precisa fazer passar. O limite: o estado ${stateMatches ? "correto" : "errado"} não diz se o agente chegou lá seguindo as regras. Essa pergunta é do próximo passo.`,
      ],
      keyIdea: "Compare o estado do mundo, não as palavras: muitas conversas certas levam ao mesmo estado.",
      scene: { kind: "pieces", layout: "single", pieces: [harness("db", ["user", "agent", "tools"])] },
      alt: `O estado final do banco, em destaque, é comparado com o esperado: reembolso ${finalState.reembolso}, valor ${finalState.valor}, status ${finalState.status}. A tarefa passa.`,
    },
    {
      id: "trajectory",
      shortTitle: "Trajetória",
      title: "O caminho pulou uma regra",
      tag: "mechanism",
      body: [
        `A trajetória de referência é ${expected.join(" → ")}. O agente fez ${actual.join(" → ")}. A [[avaliação da trajetória|trajectory-evaluation]] compara as duas listas como num exercício de busca: [[precision|precision]] das chamadas = ${matched}/${actual.length} = ${fixed(toolPrecision)} (metade das chamadas era desnecessária) e [[recall|recall]] = ${matched}/${expected.length} = ${fixed(toolRecall)}.`,
        `A chamada que falta é ${missing.join(", ")}. O reembolso saiu certo porque o pedido estava dentro do prazo, mas o agente não conferiu: no próximo pedido fora do prazo, ele reembolsaria do mesmo jeito. A referência ${inOrder ? "aparece" : "não aparece"} em ordem dentro da execução. Comparar trajetórias exige cuidado: há caminhos válidos diferentes, então as regras duras (verificar antes de reembolsar) valem mais que a ordem exata.`,
      ],
      keyIdea: "Estado certo com trajetória errada é sorte: confira as chamadas obrigatórias e as proibidas.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "tools",
            piece: "metrics-panel",
            metrics: [
              { id: "precision", label: "precision das chamadas", value: fixed(toolPrecision) },
              { id: "recall", label: "recall das chamadas", value: fixed(toolRecall), color: "danger" },
              { id: "missing", label: "faltou", value: missing.join(", "), color: "danger" },
            ],
            highlight: "missing",
          },
          { id: "calls", piece: "token-stream", tokens: actual, keys: matchedIndexes, color: "module-16" },
        ],
      },
      alt: `As chamadas executadas, ${actual.join(", ")}, com as que casam com a referência em destaque. Precision ${fixed(toolPrecision)}, recall ${fixed(toolRecall)}; faltou ${missing.join(", ")}.`,
    },
    {
      id: "trials",
      shortTitle: "Tentativas",
      title: "Quatro tentativas por tarefa",
      tag: "example",
      body: [
        `Agentes não são determinísticos, então cada tarefa roda várias vezes. A matriz mostra ${tasks.length} tarefas × ${TRIALS} tentativas (dados de brinquedo). O pass@1, a média de todas as células, é ${percent(passAt1)}: parece um agente bom.`,
        `O [[pass^k|pass-hat-k]] conta só as tarefas que passaram nas ${TRIALS} tentativas: ${percent(passHatK)}. O pass@${TRIALS}, pelo menos uma vez, é ${percent(passAtK)}. A distância entre os três é o tamanho da inconsistência: ${listing(flaky)} oscilam. A aula 12.18 calculou o pass^k pela fórmula pᵏ; aqui ele sai contado da matriz, e é assim que os benchmarks de agente o reportam.`,
      ],
      keyIdea: "pass@1 mede o acerto médio; pass^k mede se o usuário pode confiar todas as vezes.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "pass",
            piece: "metrics-panel",
            metrics: [
              { id: "at1", label: "pass@1", value: percent(passAt1) },
              { id: "hat", label: `pass^${TRIALS}`, value: percent(passHatK), color: "danger" },
              { id: "atk", label: `pass@${TRIALS}`, value: percent(passAtK), color: "success" },
            ],
            highlight: "hat",
          },
          {
            id: "runs",
            piece: "matrix",
            rows: tasks,
            cols: Array.from({ length: TRIALS }, (_, index) => `tentativa ${index + 1}`),
            values: runs,
            scale: { min: 0, max: 1 },
            highlight: { row: 2, col: 1 },
            showValues: true,
            color: "module-16",
          },
        ],
      },
      alt: `Matriz de ${tasks.length} tarefas por ${TRIALS} tentativas: ${tasks.map((task, index) => `${task} ${runs[index].join(", ")}`).join("; ")}. pass@1 ${percent(passAt1)}, pass^${TRIALS} ${percent(passHatK)}, pass@${TRIALS} ${percent(passAtK)}.`,
    },
    {
      id: "efficiency",
      shortTitle: "Eficiência",
      title: "Acertar gastando o triplo também é falha",
      tag: "tradeoff",
      body: [
        `Dois agentes com o mesmo pass@1 podem custar muito diferente. As barras mostram os passos a mais que o caminho ótimo em cada tarefa: “${tasks[WORST]}” gasta ${extraSteps[WORST]} passos além do necessário. No total, o agente usa ${percent(overhead)} mais passos que o ótimo.`,
        `Com ${money(COST_PER_STEP)} por passo (valor de brinquedo), as ${tasks.length * TRIALS} execuções custam ${money(totalCost)}, e cada tarefa resolvida sai por ${money(costPerSuccess)}. Custo por tarefa resolvida e latência por tarefa entram no relatório junto com a taxa de acerto. Para avaliar a qualidade do raciocínio na trajetória, que nenhuma contagem pega, entra um juiz LLM com uma rubrica, tema da próxima aula.`,
      ],
      keyIdea: "Relate acerto, consistência e custo por tarefa resolvida: os três juntos descrevem o agente.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "cost",
            piece: "metrics-panel",
            metrics: [
              { id: "overhead", label: "passos além do ótimo", value: percent(overhead), color: "danger" },
              { id: "per-success", label: "custo por tarefa resolvida", value: money(costPerSuccess) },
            ],
            highlight: "overhead",
          },
          {
            id: "extra",
            piece: "chart",
            kind: "bar",
            series: tasks.map((task, index) => ({ label: task, value: extraSteps[index] })),
            highlight: WORST,
            color: "module-16",
          },
        ],
      },
      alt: `Passos além do ótimo por tarefa: ${tasks.map((task, index) => `${task} ${extraSteps[index]}`).join(", ")}. O agente usa ${percent(overhead)} mais passos que o ótimo, e cada tarefa resolvida custa ${money(costPerSuccess)}.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Resultado, caminho, consistência e custo",
      tag: "summary",
      body: [
        "Um agente se avalia em quatro eixos: o estado final está certo? a trajetória respeitou as regras? o acerto se repete entre tentativas? quanto custou cada tarefa resolvida? O ambiente com usuário simulado e banco isolado torna os quatro mensuráveis, e cada falha vira uma tarefa nova no conjunto.",
        "Para julgar o que não dá para contar, como a qualidade de uma explicação ou de um plano, entra um LLM com uma rubrica. A próxima aula mostra como montar esse juiz e como saber se ele concorda com as pessoas.",
      ],
      keyIdea: "Avalie o agente em cada volta do loop, não só na última mensagem.",
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
            active: "act",
            iteration: stepsUsed[0],
            maxIterations: 8,
            tool: "reembolsar(123)",
          },
        ],
      },
      alt: `O loop do agente em pensar, agir e observar, na iteração ${stepsUsed[0]} de 8, chamando reembolsar(123): cada volta é um ponto de avaliação.`,
    },
  ],
  realWorldExample:
    "O τ-bench (Yao et al., 2024) avalia agentes de atendimento de varejo e de companhia aérea: um LLM faz o papel do cliente, o agente usa ferramentas sobre um banco de dados e segue uma política escrita, e a tarefa só passa se o banco no fim for igual ao estado esperado. O benchmark reporta pass^k e mostrou que agentes com pass@1 razoável caem bastante quando se exige acerto em todas as k tentativas.",
  code: {
    language: "python",
    source: `from collections import Counter

def tool_scores(expected: list[str], actual: list[str]) -> dict:
    matched = sum((Counter(expected) & Counter(actual)).values())
    return {"precision": matched / len(actual), "recall": matched / len(expected),
            "missing": list((Counter(expected) - Counter(actual)).elements())}

def pass_hat_k(runs: list[list[bool]]) -> float:
    return sum(all(trials) for trials in runs) / len(runs)

print(tool_scores(["buscar_pedido", "verificar_politica", "reembolsar"],
                  ["buscar_cliente", "buscar_pedido", "buscar_pedido", "reembolsar"]))`,
    caption: "Precision e recall das chamadas por casamento de multiconjunto, e o pass^k contado numa matriz de tentativas.",
  },
  tradeOffs: {
    pros: [
      "O estado final é um critério objetivo que aceita conversas diferentes",
      "A trajetória pega violações de regra que o resultado esconde",
      "Várias tentativas por tarefa medem a consistência que o usuário sente",
    ],
    cons: [
      "Montar um ambiente com ferramentas, banco isolado e usuário simulado dá trabalho",
      "O usuário simulado também erra e pode tornar a tarefa mais fácil ou mais difícil que a real",
      "Rodar k tentativas por tarefa multiplica o custo da avaliação",
    ],
    alternatives: [
      "Juiz LLM com rubrica sobre a trajetória, para critérios que não dá para contar",
      "Revisão humana de rastros amostrados, para achar falhas que nenhum teste previu",
    ],
  },
  knowledgeCheck: [
    {
      id: "state-vs-path",
      prompt: "Um agente de RH aprovou corretamente as férias de um funcionário, mas não chamou a ferramenta que confere o saldo de dias. Como classificar essa execução?",
      options: [
        "Sucesso completo, porque o estado final está certo",
        "Estado final certo e trajetória violando uma regra: deve contar como falha, porque o acerto foi sorte",
        "Falha só de formatação",
        "Impossível avaliar sem um juiz humano",
      ],
      correct: 1,
      explanation: "O resultado bateu, mas o caminho pulou uma verificação obrigatória. Num caso sem saldo, o agente aprovaria do mesmo jeito.",
      lesson: "16-05",
    },
    {
      id: "pass-hat",
      prompt: "Em 10 tarefas com 3 tentativas cada, 24 das 30 execuções passam, e 6 tarefas passam nas 3 tentativas. Quanto valem pass@1 e pass^3?",
      options: ["pass@1 80% e pass^3 60%", "pass@1 60% e pass^3 80%", "pass@1 80% e pass^3 80%", "pass@1 24% e pass^3 6%"],
      correct: 0,
      explanation: "pass@1 é a média das execuções, 24/30 = 80%. pass^3 conta as tarefas que passaram em todas as tentativas, 6/10 = 60%.",
      lesson: "16-05",
    },
  ],
  related: ["12-18", "16-04", "16-06"],
  references: [
    { title: "Yao et al. (2024), τ-bench: A Benchmark for Tool-Agent-User Interaction in Real-World Domains", url: "https://arxiv.org/abs/2406.12045", kind: "paper" },
    { title: "Jimenez et al. (2023), SWE-bench: Can Language Models Resolve Real-World GitHub Issues?", url: "https://arxiv.org/abs/2310.06770", kind: "paper" },
    { title: "Liu et al. (2023), AgentBench: Evaluating LLMs as Agents", url: "https://arxiv.org/abs/2308.03688", kind: "paper" },
  ],
};

export default lesson;
