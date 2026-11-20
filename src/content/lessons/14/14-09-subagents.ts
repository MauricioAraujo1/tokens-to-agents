import type { LessonContent } from "../../../types/content";

// Contexto economizado por um subagente, calculado aqui. O agente principal (com 20 mil tokens de contexto)
// precisa investigar um bug: 12 leituras de arquivo de 3 mil tokens e 15 buscas de 400 tokens, cada passo com
// 150 tokens de pensamento e chamada. Inline, tudo isso fica no contexto do principal pelas 20 chamadas
// seguintes. Delegado, a investigação roda numa janela nova e só volta um resumo de 1.200 tokens.

const PARENT_CONTEXT = 20_000;
const SUB_BASE = 3_000;
const STEP = 150;
const READS = 12;
const READ_TOKENS = 3_000;
const GREPS = 15;
const GREP_TOKENS = 400;
const SUMMARY = 1_200;
const REMAINING_CALLS = 20;

const outputs = [...Array.from({ length: READS }, () => READ_TOKENS), ...Array.from({ length: GREPS }, () => GREP_TOKENS)];
const investigationSteps = outputs.length;
const rawOutput = outputs.reduce((sum, value) => sum + value, 0);
const investigationGrowth = rawOutput + investigationSteps * STEP;

/** Soma dos tokens de entrada de uma investigação que começa com `base` tokens de contexto. */
function investigationCost(base: number): number {
  let total = 0;
  let accumulated = 0;
  for (const output of outputs) {
    total += base + accumulated;
    accumulated += STEP + output;
  }
  return total;
}

const parentAddedInline = investigationGrowth;
const parentAddedDelegated = SUMMARY + STEP;
const contextSaved = 1 - parentAddedDelegated / parentAddedInline;

const inlineTotal = investigationCost(PARENT_CONTEXT) + REMAINING_CALLS * (PARENT_CONTEXT + parentAddedInline);
const summaryCall = SUB_BASE + investigationGrowth;
const delegatedTotal = investigationCost(SUB_BASE) + summaryCall + REMAINING_CALLS * (PARENT_CONTEXT + parentAddedDelegated);
const totalSaved = 1 - delegatedTotal / inlineTotal;

const builtIns = ["Explore", "Plan", "general-purpose", "fork"];
const builtInCols = ["lê arquivos", "edita", "janela própria", "vê o histórico do pai"];
const builtInValues = [
  [1, 0, 1, 0],
  [1, 0, 1, 0],
  [1, 1, 1, 0],
  [1, 1, 1, 1],
];

const thousands = (value: number) => `${(value / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`;
const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");
const percent = (value: number) => `${Math.round(value * 100)}%`;

const lesson: LessonContent = {
  id: "14-09",
  subtitle: "O batedor que explora e volta com um bilhete: como o harness define subagentes, o que eles enxergam e quanto contexto eles poupam.",
  objectives: [
    "Escrever a definição de um subagente: descrição, ferramentas, modelo e prompt",
    "Explicar o que um subagente vê ao começar e o que devolve ao terminar",
    "Calcular o contexto e os tokens poupados quando a investigação é delegada",
    "Decidir quando delegar e quando é mais barato fazer no contexto principal",
  ],
  steps: [
    {
      id: "scout",
      shortTitle: "O batedor",
      title: "Quem volta com um bilhete",
      tag: "context",
      body: [
        "Uma editora pede a um estagiário: “leia esses doze relatórios e me diga se algum fala do contrato X”. Ele passa a tarde lendo; ela recebe um parágrafo. A mesa dela continua limpa, e a decisão continua com ela.",
        "O [[subagente|subagent]] do módulo 12 é esse estagiário: um agente criado para uma subtarefa, com contexto próprio, que devolve só um resumo. Do ponto de vista do harness, a pergunta é de configuração: que subagentes existem, o que cada um pode tocar, que modelo usa e o que ele recebe ao começar.",
      ],
      keyIdea: "O subagente gasta o contexto dele para poupar o seu; você recebe o bilhete, não a tarde de leitura.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "delegate",
            piece: "block-diagram",
            blocks: [
              { id: "main", kind: "agent", label: "agente principal", col: 0, row: 0 },
              { id: "sub", kind: "agent", label: "subagente", col: 1, row: 0 },
              { id: "repo", kind: "documents", label: "repositório", col: 2, row: 0 },
              { id: "summary", kind: "answer", label: "resumo", col: 1, row: 1 },
            ],
            edges: [
              { from: "main", to: "sub", label: "investigue x" },
              { from: "sub", to: "repo", label: "muitas leituras" },
              { from: "sub", to: "summary" },
              { from: "summary", to: "main", label: "um bilhete" },
            ],
            active: "sub",
          },
        ],
      },
      alt: "O agente principal pede ao subagente, em destaque, que investigue; o subagente faz muitas leituras no repositório e devolve só um resumo.",
    },
    {
      id: "definition",
      shortTitle: "Definição",
      title: "O que define um subagente",
      tag: "mechanism",
      body: [
        "Uma [[definição de subagente|subagent-definition]] é um arquivo curto. No Claude Code, é um markdown em .claude/agents/ (ou ~/.claude/agents/) com frontmatter: name e description, obrigatórios, e opcionais como tools (a allowlist de ferramentas), disallowedTools, model, permissionMode e isolation. O corpo é o system prompt dele. A description diz ao agente principal quando delegar.",
        "O Claude Code já traz alguns prontos. O Explore e o Plan são só de leitura (Write e Edit negados); o general-purpose tem todas as ferramentas disponíveis para subagentes. Nenhum deles vê o histórico da conversa principal, com uma exceção: o fork, que herda a conversa do pai. Ao começar, um subagente recebe o próprio prompt, a mensagem de delegação e, por padrão, os arquivos CLAUDE.md.",
      ],
      keyIdea: "Nome, descrição de quando usar, ferramentas, modelo e prompt: o subagente é uma configuração, não um improviso.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "builtins",
            piece: "matrix",
            rows: builtIns,
            cols: builtInCols,
            values: builtInValues,
            scale: { min: 0, max: 1 },
            highlight: { row: 0, col: 1 },
            color: "module-14",
          },
        ],
      },
      alt: "Matriz dos subagentes do Claude Code: Explore e Plan leem mas não editam, com Explore em destaque; general-purpose lê e edita; todos têm janela própria; só o fork vê o histórico do pai.",
    },
    {
      id: "window",
      shortTitle: "Janela própria",
      title: "Janela própria, resumo de volta",
      tag: "mechanism",
      body: [
        "O subagente abre uma janela de contexto limpa. Lá dentro, cada leitura de arquivo e cada busca se acumulam como em qualquer agente, mas esse lixo de trilha morre quando ele termina. Para o pai, a tarefa inteira custa a mensagem de delegação e o resumo que volta.",
        "Isso é isolamento de contexto, e tem consequência para quem escreve a delegação: o subagente não sabe o que o pai sabe. A mensagem precisa dizer o objetivo, o que já foi descartado, onde procurar e o formato da resposta. Um resumo bom traz caminhos de arquivo e evidências, para o pai conferir sem refazer a busca.",
      ],
      keyIdea: "O subagente não herda o que o pai sabe: a mensagem de delegação é todo o contexto dele.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "delegate",
            piece: "block-diagram",
            blocks: [
              { id: "main", kind: "agent", label: "agente principal", col: 0, row: 0 },
              { id: "parent-ctx", kind: "context", label: `pai +${thousands(parentAddedDelegated)}`, col: 0, row: 1 },
              { id: "sub", kind: "agent", label: "subagente", col: 1, row: 0 },
              { id: "repo", kind: "documents", label: "repositório", col: 2, row: 0 },
              { id: "sub-ctx", kind: "context", label: `janela +${thousands(investigationGrowth)}`, col: 3, row: 0 },
              { id: "summary", kind: "answer", label: "resumo", col: 1, row: 1 },
            ],
            edges: [
              { from: "main", to: "sub", label: "delegação" },
              { from: "sub", to: "repo" },
              { from: "repo", to: "sub-ctx", label: `${investigationSteps} resultados` },
              { from: "sub", to: "summary" },
              { from: "summary", to: "parent-ctx", label: `${thousands(SUMMARY)}` },
            ],
            active: "summary",
            done: ["main", "sub", "repo", "sub-ctx"],
          },
        ],
      },
      alt: `O subagente acumula ${integer(investigationGrowth)} tokens de resultados na própria janela; o resumo, em destaque, leva só ${integer(SUMMARY)} tokens ao contexto do agente principal.`,
    },
    {
      id: "math",
      shortTitle: "A conta",
      title: "Quanto o pai deixa de carregar",
      tag: "example",
      body: [
        `A investigação tem ${READS} leituras de ${integer(READ_TOKENS)} tokens e ${GREPS} buscas de ${integer(GREP_TOKENS)}, com ${STEP} tokens de pensamento por passo: ${integer(investigationGrowth)} tokens. Feita no contexto principal, tudo isso fica lá. Delegada, entram no pai só a chamada e o resumo, ${integer(parentAddedDelegated)} tokens: ${percent(contextSaved)} a menos.`,
        `Como o contexto é reenviado a cada chamada, a diferença se multiplica. Somando a investigação e as ${REMAINING_CALLS} chamadas seguintes do pai, o caminho inline lê ${integer(inlineTotal)} tokens de entrada; o delegado, ${integer(delegatedTotal)}, já contando a janela do subagente e a chamada em que ele escreve o resumo. São ${percent(totalSaved)} a menos, porque a investigação também começa de uma janela pequena (${integer(SUB_BASE)} tokens, contra ${integer(PARENT_CONTEXT)} do pai).`,
      ],
      keyIdea: "O ganho do subagente vem de dois lados: a investigação roda numa janela pequena e o pai não carrega o resultado bruto depois.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "context-chart",
            piece: "chart",
            kind: "bar",
            series: [
              { label: "contexto do pai, inline", value: Number((parentAddedInline / 1000).toFixed(1)) },
              { label: "contexto do pai, delegado", value: Number((parentAddedDelegated / 1000).toFixed(1)) },
              { label: "janela do subagente", value: Number((summaryCall / 1000).toFixed(1)) },
            ],
            highlight: 1,
            color: "module-14",
          },
          {
            id: "context-numbers",
            piece: "metrics-panel",
            metrics: [
              { id: "parent", label: "contexto do pai", value: `−${percent(contextSaved)}`, color: "success" },
              { id: "inline", label: "tokens de entrada, inline", value: integer(inlineTotal), color: "danger" },
              { id: "delegated", label: "tokens de entrada, delegado", value: integer(delegatedTotal) },
            ],
            highlight: "parent",
          },
        ],
      },
      alt: `Barras em milhares de tokens: o pai ganha ${thousands(parentAddedInline)} de contexto inline e ${thousands(parentAddedDelegated)} delegando, enquanto a janela do subagente chega a ${thousands(summaryCall)}; no total, ${integer(inlineTotal)} tokens de entrada inline contra ${integer(delegatedTotal)} delegando, ${percent(totalSaved)} a menos.`,
    },
    {
      id: "when",
      shortTitle: "Quando delegar",
      title: "Quando vale e quando não vale",
      tag: "tradeoff",
      body: [
        "Delegar vale quando a saída é longa e só o resumo importa (uma busca larga, uma rodada inteira de testes), quando há trabalhos independentes para rodar em paralelo, quando você quer um revisor que não viu como o código foi escrito, ou quando a subtarefa pede menos ferramentas, como um revisor só de leitura.",
        "A documentação do Claude Code lista os custos: cada subagente faz as próprias requisições e consome tokens; um subagente novo precisa reunir contexto que a conversa já tinha, e pode sair mais lento; e, por padrão, é o mesmo modelo na mesma tarefa, então você ganha paralelismo e olhos frescos, não uma resposta mais inteligente. Para trabalho simples, um modelo menor na definição barateia a conta.",
      ],
      keyIdea: "Delegue saída longa, trabalho paralelo e revisão independente; faça no principal o que precisa do contexto que ele já tem.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "fan",
            piece: "graph",
            nodes: [
              { id: "main", label: "agente principal", x: 0.12, y: 0.5, color: "module-14" },
              { id: "search", label: "explorar: busca larga", x: 0.5, y: 0.15 },
              { id: "tests", label: "rodar a suíte", x: 0.5, y: 0.5 },
              { id: "review", label: "revisor só leitura", x: 0.5, y: 0.85 },
              { id: "merge", label: "três resumos", x: 0.88, y: 0.5, color: "success" },
            ],
            edges: [
              { from: "main", to: "search" },
              { from: "main", to: "tests" },
              { from: "main", to: "review" },
              { from: "search", to: "merge" },
              { from: "tests", to: "merge" },
              { from: "review", to: "merge" },
            ],
            highlight: ["review"],
          },
        ],
      },
      alt: "O agente principal abre três subagentes em paralelo, uma busca larga, uma rodada de testes e um revisor só de leitura, em destaque, e recebe três resumos.",
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Delegar é configurar",
      tag: "summary",
      body: [
        "Um subagente é uma configuração do harness: descrição de quando usar, ferramentas mínimas, modelo adequado e um prompt próprio. Ele trabalha numa janela isolada e devolve um resumo, o que protege o contexto do principal e permite paralelismo, ao custo de tokens extras e de uma delegação bem escrita.",
        "Subagentes são uma das ferramentas para decidir o que entra no contexto. A próxima aula olha esse problema inteiro: context engineering.",
      ],
      keyIdea: "Subagente bom: descrição clara, ferramentas mínimas, delegação completa, resumo com evidências.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "recap",
            piece: "pipeline",
            display: "chips",
            stages: [
              { id: "desc", label: "descrição de quando usar" },
              { id: "tools", label: "ferramentas mínimas", color: "module-14" },
              { id: "model", label: "modelo adequado" },
              { id: "brief", label: "delegação completa" },
              { id: "report", label: "resumo com evidências", color: "module-14" },
            ],
          },
        ],
      },
      alt: "Chips de resumo: descrição de quando usar, ferramentas mínimas, modelo adequado, delegação completa e resumo com evidências.",
    },
  ],
  realWorldExample:
    "A página de boas práticas do Claude Code mostra um revisor como subagente: o arquivo .claude/agents/reviewer.md tem name, uma description que diz para usá-lo depois de implementar uma feature e antes de abrir o PR, e tools: Read, Grep, Glob. Com essa lista, ele lê mas não edita, e o limite é aplicado pelo harness, não pedido no prompt.",
  code: {
    language: "bash",
    source: `mkdir -p .claude/agents
cat > .claude/agents/reviewer.md <<'EOF'
---
name: reviewer
description: Revisa os arquivos alterados contra a spec. Use depois de implementar uma feature, antes do PR.
tools: Read, Grep, Glob
model: haiku
---
Você revisa código que não escreveu. Compare as mudanças com a spec recebida,
confira se cada requisito foi implementado e relate só falhas de correção.
EOF`,
    caption: "Uma definição de subagente do Claude Code: a description diz quando delegar, e tools limita o revisor a ferramentas de leitura.",
  },
  tradeOffs: {
    pros: [
      "Protege o contexto principal de saídas longas",
      "Permite trabalho em paralelo e revisão por quem não viu o código",
      "Ferramentas e modelo por subagente aplicam menor privilégio e cortam custo",
    ],
    cons: [
      "Mais tokens no total e, às vezes, mais tempo para reunir contexto",
      "Uma delegação incompleta faz o subagente refazer ou errar o trabalho",
      "Um resumo ruim esconde do principal o detalhe que importava",
    ],
    alternatives: ["Limpar resultados antigos ou compactar o contexto principal", "Uma nova sessão para uma tarefa sem relação com a atual"],
  },
  knowledgeCheck: [
    {
      id: "delegate-or-not",
      prompt: "Qual destas tarefas faz mais sentido delegar a um subagente?",
      options: [
        "Renomear uma variável no arquivo que o agente acabou de editar",
        "Varrer 300 arquivos atrás de usos de uma API e devolver a lista de lugares",
        "Responder uma pergunta sobre a conversa de cinco minutos atrás",
        "Escolher entre duas opções que o usuário acabou de explicar",
      ],
      correct: 1,
      explanation: "A varredura gera muita saída e só o resultado importa. As outras dependem do contexto que o principal já tem; delegar obrigaria a reexplicar tudo.",
      lesson: "14-09",
    },
    {
      id: "context-math",
      prompt: "Uma investigação produz 30 mil tokens de resultados e o subagente devolve um resumo de mil. Nas 10 chamadas seguintes do pai, quantos tokens de entrada a delegação evita?",
      options: ["29 mil", "30 mil", "290 mil", "300 mil"],
      correct: 2,
      explanation: "O pai deixa de carregar 30.000 − 1.000 = 29.000 tokens, e o contexto é reenviado a cada chamada: 29 mil × 10 = 290 mil tokens.",
      lesson: "14-09",
    },
  ],
  related: ["14-08", "14-10", "12-13"],
  references: [
    { title: "Documentação do Claude Code: Subagents", url: "https://code.claude.com/docs/en/sub-agents", kind: "docs" },
    { title: "Anthropic: How we built our multi-agent research system", url: "https://www.anthropic.com/engineering/multi-agent-research-system", kind: "article" },
    { title: "Claude Code: Best practices", url: "https://code.claude.com/docs/en/best-practices", kind: "docs" },
  ],
};

export default lesson;
