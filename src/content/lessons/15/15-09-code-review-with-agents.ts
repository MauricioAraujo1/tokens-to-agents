import type { LessonContent } from "../../../types/content";

// Revisão de código com contas no arquivo: os achados de brinquedo de um agente revisor num pull request,
// cada um com severidade, se é de estilo e se é válido depois da triagem humana. A precisão por severidade é
// válidos / achados; o tempo de triagem supõe minutos fixos por achado. Os limites de tamanho de mudança e o
// critério de aprovação são os do guia de revisão do Google.

const percent = (value: number) => `${(value * 100).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}%`;

type Severity = "bloqueante" | "importante" | "sugestão" | "nit";

interface Finding {
  text: string;
  severity: Severity;
  style: boolean;
  valid: boolean;
}

const findings: Finding[] = [
  { text: "SQL montado com texto do usuário", severity: "bloqueante", style: false, valid: true },
  { text: "reembolso sem checar o dono do pedido", severity: "bloqueante", style: false, valid: true },
  { text: "erro engolido no catch", severity: "importante", style: false, valid: true },
  { text: "possível null (o tipo já garante)", severity: "importante", style: false, valid: false },
  { text: "falta teste do limite de R$ 100", severity: "importante", style: false, valid: true },
  { text: "extrair a validação numa função", severity: "sugestão", style: false, valid: true },
  { text: "trocar por uma biblioteca nova", severity: "sugestão", style: false, valid: false },
  { text: "adicionar cache por precaução", severity: "sugestão", style: false, valid: false },
  { text: "renomear variável", severity: "nit", style: true, valid: true },
  { text: "ordem dos imports", severity: "nit", style: true, valid: true },
  { text: "vírgula no fim da lista", severity: "nit", style: true, valid: true },
  { text: "aspas simples em vez de duplas", severity: "nit", style: true, valid: false },
];

const severities: Severity[] = ["bloqueante", "importante", "sugestão", "nit"];
const ofSeverity = (severity: Severity, list = findings) => list.filter((finding) => finding.severity === severity);
const severitySeries = severities.map((severity) => ({ label: severity, value: ofSeverity(severity).length }));
const precision = (list: Finding[]) => (list.length === 0 ? 0 : list.filter((finding) => finding.valid).length / list.length);
const blocking = ofSeverity("bloqueante");
const invalidNonStyle = findings.filter((finding) => !finding.style && !finding.valid);

const MINUTES_PER_FINDING = 3;
const focused = findings.filter((finding) => !finding.style);
const triageAll = findings.length * MINUTES_PER_FINDING;
const triageFocused = focused.length * MINUTES_PER_FINDING;
const styleCount = findings.length - focused.length;

// Guia do Google: ~100 linhas costuma ser razoável; ~1.000 costuma ser grande demais.
const REASONABLE_LINES = 100;
const TOO_LARGE_LINES = 1000;

const diffLines = [
  "  async function buscarPedido(id) {",
  "-   const sql = `SELECT * FROM pedidos WHERE id = ${id}`;",
  "-   return db.query(sql);",
  "+   const sql = \"SELECT * FROM pedidos WHERE id = $1\";",
  "+   return db.query(sql, [id]);",
  "  }",
];
const removed = diffLines.flatMap((line, index) => (line.startsWith("-") ? [index] : []));
const added = diffLines.flatMap((line, index) => (line.startsWith("+") ? [index] : []));

const lesson: LessonContent = {
  id: "15-09",
  subtitle: "Um segundo par de olhos que não viu o código ser escrito: como usar agentes revisores, classificar os achados e não deixar a revisão virar ruído.",
  objectives: [
    "Ler um diff e um pull request como unidade de revisão",
    "Usar um agente revisor com contexto limpo e critérios explícitos",
    "Classificar achados por severidade e medir a precisão do revisor",
    "Aplicar o critério de aprovação do guia de revisão do Google",
  ],
  steps: [
    {
      id: "second-eyes",
      shortTitle: "Outro olhar",
      title: "Um revisor que não viu o código nascer",
      tag: "context",
      body: [
        "Quem escreve um texto não vê os próprios erros: o cérebro lê o que quis escrever. Um amigo que pega o texto pela primeira vez acha o erro em segundos. A [[revisão de código|code-review]] é esse amigo: outra pessoa lê a mudança antes de ela entrar no código principal.",
        "Um agente pode fazer esse papel, com uma condição: contexto limpo. A documentação do Claude Code recomenda revisar o diff num subagente novo, que nunca viu a conversa e por isso não é convencido pelo raciocínio que produziu o código. Dá para ir além e dar a ele só ferramentas de leitura: um revisor que não consegue editar nada.",
      ],
      keyIdea: "O valor do revisor vem de não ter visto o código ser escrito.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "author", kind: "agent", label: "agente autor", col: 0, row: 0.5 },
              { id: "pr", kind: "server", label: "pull request", col: 1, row: 0.5 },
              { id: "reviewer", kind: "agent", label: "revisor limpo", col: 2, row: 0 },
              { id: "human", kind: "user", label: "humano aprova", col: 2, row: 1 },
              { id: "main", kind: "server", label: "main", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "author", to: "pr", label: "diff" },
              { from: "pr", to: "reviewer", label: "só leitura" },
              { from: "reviewer", to: "human", label: "achados" },
              { from: "human", to: "main", label: "merge" },
            ],
            active: "reviewer",
          },
        ],
      },
      alt: "O agente autor abre um pull request com o diff; um revisor com contexto limpo e só leitura, em destaque, entrega os achados a um humano, que aprova o merge na main.",
    },
    {
      id: "diff",
      shortTitle: "O diff",
      title: "A unidade de revisão é o diff",
      tag: "mechanism",
      body: [
        "Ninguém revisa um livro inteiro a cada correção: você lê as frases marcadas em vermelho. O [[diff|diff]] é isso para o código: as linhas removidas (−) e adicionadas (+), com algumas linhas de contexto em volta. O [[pull request|pull-request]] embrulha o diff com título, descrição, ligação com a tarefa e o resultado do CI.",
        `O diff da cena tem ${removed.length} linhas removidas e ${added.length} adicionadas, e conserta uma injeção de SQL: o id deixa de ser colado no texto da consulta e vai como parâmetro. O guia do Google diz que cerca de ${REASONABLE_LINES} linhas costuma ser um tamanho razoável e ${TOO_LARGE_LINES.toLocaleString("pt-BR")} costuma ser grande demais. Diff pequeno é revisado de verdade; diff gigante é aprovado por cansaço.`,
      ],
      keyIdea: "Revise o diff, não o repositório; e mantenha o diff pequeno o bastante para ser lido.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "diff",
            piece: "token-stream",
            tokens: diffLines,
            query: added[0],
            keys: removed,
            bars: diffLines.map((line) => (line.startsWith("+") ? 1 : line.startsWith("-") ? 0.6 : 0.1)),
            color: "module-15",
          },
        ],
      },
      alt: `Um diff de ${diffLines.length} linhas: ${removed.length} removidas, que colavam o id no texto do SQL, e ${added.length} adicionadas, que passam o id como parâmetro.`,
    },
    {
      id: "severity",
      shortTitle: "Severidade",
      title: "Nem todo achado pesa igual",
      tag: "mechanism",
      body: [
        `O agente revisor devolveu ${findings.length} achados. Sem classificação, a injeção de SQL fica na mesma lista que a ordem dos imports. Com severidade, a leitura muda: ${blocking.length} bloqueantes (impedem o merge), ${ofSeverity("importante").length} importantes, ${ofSeverity("sugestão").length} sugestões e ${ofSeverity("nit").length} nits.`,
        "O guia do Google tem uma convenção para o nível mais baixo: prefixar com “Nit:” o comentário que é polimento, para o autor saber que pode ignorar. Pedir ao revisor que classifique cada achado, com uma [[saída estruturada|structured-output]] do tipo {severidade, arquivo, linha, motivo}, deixa a triagem ordenável e o bloqueante impossível de perder.",
      ],
      keyIdea: "Severidade separa o que impede o merge do que é gosto.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "severity",
            piece: "chart",
            kind: "bar",
            series: severitySeries,
            highlight: 0,
            color: "module-15",
          },
        ],
      },
      alt: `Achados do revisor por severidade: ${severitySeries.map((item) => `${item.label}, ${item.value}`).join("; ")}.`,
    },
    {
      id: "precision",
      shortTitle: "Precisão",
      title: "Quantos achados eram reais?",
      tag: "example",
      body: [
        `Depois da triagem, cada achado é válido ou não. A precisão geral do revisor é ${percent(precision(findings))}. Por severidade: bloqueantes ${percent(precision(blocking))}, importantes ${percent(precision(ofSeverity("importante")))}, sugestões ${percent(precision(ofSeverity("sugestão")))}. Entre os inválidos estão ${invalidNonStyle.map((finding) => `“${finding.text}”`).join(", ")}.`,
        `A triagem custa tempo humano: a ${MINUTES_PER_FINDING} minutos por achado, são ${triageAll} minutos. Tirando os ${styleCount} achados de estilo, que um lint resolve sem ninguém ler, caem para ${triageFocused}. Medir a precisão por severidade ao longo de vários PRs mostra onde o revisor é confiável e onde é ruído.`,
      ],
      keyIdea: "Meça o revisor como qualquer sistema: precisão por categoria e custo de triagem.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "precision",
            piece: "metrics-panel",
            metrics: [
              { id: "all", label: "precisão geral", value: percent(precision(findings)) },
              { id: "blocking", label: "bloqueantes", value: percent(precision(blocking)), color: "success" },
              { id: "suggestions", label: "sugestões", value: percent(precision(ofSeverity("sugestão"))), color: "danger" },
              { id: "triage", label: "triagem sem estilo", value: `${triageAll} → ${triageFocused} min` },
            ],
            highlight: "suggestions",
          },
        ],
      },
      alt: `Precisão do revisor: geral ${percent(precision(findings))}, bloqueantes ${percent(precision(blocking))}, sugestões ${percent(precision(ofSeverity("sugestão")))}. A triagem cai de ${triageAll} para ${triageFocused} minutos sem os achados de estilo.`,
    },
    {
      id: "always-finds",
      shortTitle: "Ruído",
      title: "Um revisor sempre acha alguma coisa",
      tag: "tradeoff",
      body: [
        "Peça a alguém para achar defeitos e ele vai achar, mesmo que tenha de inventar. A documentação do Claude Code avisa: um revisor que recebe a ordem de achar problemas sempre acha algo, e quem corrige todos os achados acaba com camadas de abstração a mais e testes para casos que não podem acontecer. “Adicionar cache por precaução” é exatamente esse tipo de achado.",
        "O remédio é dar critério: revise contra a spec, aponte só o que afeta a corretude, a segurança ou um critério de aceite, e pule estilo. O guia do Google dá o critério de aprovação: aprove quando a mudança melhora a saúde geral do código, mesmo que não seja perfeita. O revisor agente acelera a primeira leitura; a decisão de merge continua humana.",
      ],
      keyIdea: "Dê ao revisor um critério e uma lista do que ignorar, ou ele preenche a lista com ruído.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "reviewer", kind: "agent", label: "revisor", col: 0, row: 0.5 },
              { id: "criteria", kind: "guardrail", label: "spec e corretude", col: 1, row: 0.5 },
              { id: "lint", kind: "tool", label: "lint", col: 2, row: 1 },
              { id: "human", kind: "user", label: "humano decide", col: 2, row: 0 },
              { id: "main", kind: "server", label: "main", col: 3, row: 0 },
            ],
            edges: [
              { from: "reviewer", to: "criteria", label: `${findings.length} achados` },
              { from: "criteria", to: "human", label: `${focused.length} relevantes` },
              { from: "criteria", to: "lint", label: "estilo", variant: "alternative" },
              { from: "human", to: "main", label: "melhora o código" },
            ],
            active: "criteria",
          },
        ],
      },
      alt: `Os ${findings.length} achados do revisor passam por um filtro de critério, em destaque: spec e corretude. ${focused.length} relevantes seguem para o humano, que decide o merge; os de estilo desviam para o lint, num caminho tracejado.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Revisão em camadas",
      tag: "summary",
      body: [
        "Uma revisão boa com agentes tem camadas: diff pequeno, CI verde, um revisor com contexto limpo e critério explícito, achados classificados por severidade e uma pessoa que decide. Cada camada tira trabalho da seguinte.",
        "O CI, a camada automática que roda antes de qualquer revisor, é o tema da próxima aula.",
      ],
      keyIdea: "Revisão com agentes = diff pequeno + revisor limpo com critério + severidade + decisão humana.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "layers",
            piece: "pipeline",
            stages: [
              { id: "small", label: `diff ≤ ~${REASONABLE_LINES} linhas` },
              { id: "ci", label: "CI verde" },
              { id: "agent", label: "revisor agente", color: "module-15" },
              { id: "human", label: "decisão humana" },
              { id: "merge", label: "merge", color: "success" },
            ],
            active: "merge",
            done: ["small", "ci", "agent", "human"],
          },
        ],
      },
      alt: `As camadas da revisão: diff de até cerca de ${REASONABLE_LINES} linhas, CI verde, revisor agente, decisão humana e merge, em destaque.`,
    },
  ],
  realWorldExample:
    "O guia público de revisão de código do Google define o padrão que a empresa usa: aprovar a mudança quando ela melhora a saúde geral do código, mesmo sem ser perfeita, marcar polimento com “Nit:” e preferir mudanças pequenas. No Claude Code, o comando /code-review revisa o diff atual num subagente novo, e um revisor customizado em .claude/agents/ pode receber só as ferramentas Read, Grep e Glob, o que garante pela própria ferramenta que ele não edita nada.",
  code: {
    language: "json",
    source: `{
  "severity": "bloqueante",
  "file": "src/pedidos/buscar.ts",
  "line": 2,
  "criterion": "segurança",
  "finding": "O id do pedido é colado no texto do SQL: injeção de SQL.",
  "suggestion": "Passar o id como parâmetro: db.query(sql, [id])."
}`,
    caption: "Um achado do revisor como saída estruturada: severidade, local, critério e sugestão. Com esse formato, os achados viram uma lista ordenável e a precisão por severidade pode ser medida.",
  },
  tradeOffs: {
    pros: [
      "Primeira leitura rápida e sem cansaço, em toda mudança",
      "Contexto limpo pega o que o autor, humano ou agente, não vê",
      "Achados estruturados permitem medir a precisão do revisor",
    ],
    cons: [
      "Sem critério, o revisor gera ruído que custa tempo de triagem",
      "Corrigir todo achado leva a abstração e testes desnecessários",
      "O revisor não conhece o contexto que não está no repositório nem na spec",
    ],
    alternatives: [
      "Revisão em par, síncrona, para mudanças de alto risco",
      "Lint e análise estática para tudo o que é regra fixa, sem revisor nenhum",
    ],
  },
  knowledgeCheck: [
    {
      id: "fresh-context",
      prompt: "O mesmo agente que escreveu o código é convidado, na mesma conversa, a revisar o próprio diff. Qual o problema?",
      options: [
        "Nenhum, ele conhece bem o código",
        "Ele carrega o raciocínio que produziu o código e tende a concordar com ele; um subagente com contexto limpo não",
        "Agentes não sabem ler diffs",
        "O diff fica grande demais",
      ],
      correct: 1,
      explanation: "O valor do revisor está em não ter visto o código nascer. Na mesma conversa, as premissas erradas do autor estão no contexto e passam despercebidas.",
      lesson: "15-09",
    },
    {
      id: "approve",
      prompt: "Pelo guia do Google, quando aprovar um pull request?",
      options: [
        "Só quando o código está perfeito",
        "Quando a mudança melhora a saúde geral do código, mesmo sem ser perfeita",
        "Quando o revisor não achou nenhum nit",
        "Quando tem mais de 1.000 linhas de teste",
      ],
      correct: 1,
      explanation: "O guia diz que não existe código perfeito, só código melhor. Esperar perfeição trava o time; o que não é essencial vira “Nit:”.",
      lesson: "15-09",
    },
  ],
  related: ["15-08", "15-10", "12-13"],
  references: [
    { title: "Google Engineering Practices: The Standard of Code Review", url: "https://google.github.io/eng-practices/review/reviewer/standard.html", kind: "docs" },
    { title: "Google Engineering Practices: Small CLs", url: "https://google.github.io/eng-practices/review/developer/small-cls.html", kind: "docs" },
    { title: "Claude Code: Best practices", url: "https://code.claude.com/docs/en/best-practices", kind: "docs" },
  ],
};

export default lesson;
