import type { LessonContent } from "../../../types/content";

// TDD de verdade, em escala de brinquedo: a função parcelas(totalEmCentavos, n) divide um valor em n parcelas
// que somam exatamente o total. A lista de testes e as quatro versões da implementação estão aqui, e cada
// barra da cena sai de rodar a versão da etapa contra os testes escritos até aquela etapa.

type Split = (total: number, n: number) => number[];

interface TestCase {
  id: string;
  label: string;
  total: number;
  n: number;
  /** `null` quando o caso espera um erro. */
  expected: number[] | null;
}

const testList: TestCase[] = [
  { id: "even", label: "300 em 3", total: 300, n: 3, expected: [100, 100, 100] },
  { id: "remainder", label: "100 em 3", total: 100, n: 3, expected: [34, 33, 33] },
  { id: "single", label: "500 em 1", total: 500, n: 1, expected: [500] },
  { id: "zero", label: "100 em 0", total: 100, n: 0, expected: null },
];

const stub: Split = () => [];
const naive: Split = (total, n) => Array.from({ length: n }, () => Math.floor(total / n));
const withRemainder: Split = (total, n) => {
  const base = Math.floor(total / n);
  const rest = total - base * n;
  return Array.from({ length: n }, (_, index) => (index < rest ? base + 1 : base));
};
const guarded: Split = (total, n) => {
  if (!Number.isInteger(n) || n < 1) throw new RangeError("n precisa ser um inteiro maior que zero");
  return withRemainder(total, n);
};

const passes = (split: Split, test: TestCase) => {
  try {
    const got = split(test.total, test.n);
    return test.expected !== null && got.length === test.expected.length && got.every((value, index) => value === test.expected?.[index]);
  } catch {
    return test.expected === null;
  }
};

interface Stage {
  label: string;
  phase: "red" | "green" | "refactor";
  tests: number;
  split: Split;
}

const stages: Stage[] = [
  { label: "1 vermelho", phase: "red", tests: 1, split: stub },
  { label: "1 verde", phase: "green", tests: 1, split: naive },
  { label: "2 vermelho", phase: "red", tests: 2, split: naive },
  { label: "2 verde", phase: "green", tests: 2, split: withRemainder },
  { label: "2 refatorar", phase: "refactor", tests: 2, split: withRemainder },
  { label: "4 vermelho", phase: "red", tests: 4, split: withRemainder },
  { label: "4 verde", phase: "green", tests: 4, split: guarded },
];
const stageResults = stages.map((stage) => ({
  ...stage,
  passing: testList.slice(0, stage.tests).filter((test) => passes(stage.split, test)).length,
}));
const passingSeries = stageResults.map((stage) => ({ label: stage.label, value: stage.passing }));
const lastStage = stageResults[stageResults.length - 1];
const singlePassesEarly = passes(withRemainder, testList[2]);

const remainderCase = testList[1];
const naiveOut = naive(remainderCase.total, remainderCase.n);
const fixedOut = withRemainder(remainderCase.total, remainderCase.n);
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
const lost = remainderCase.total - sum(naiveOut);
const money = (cents: number) => `R$ ${(cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

const lesson: LessonContent = {
  id: "15-07",
  subtitle: "Escrever o teste que falha antes do código que passa, num ciclo curto de vermelho, verde e refatorar, e por que isso segura um agente no trilho.",
  objectives: [
    "Executar o ciclo vermelho, verde e refatorar numa função pequena",
    "Começar por uma lista de testes e escolher a ordem dos casos",
    "Explicar por que o teste precisa falhar antes de passar",
    "Usar testes escritos antes como trava para o código de um agente",
  ],
  steps: [
    {
      id: "test-first",
      shortTitle: "Antes",
      title: "O teste vem antes do código",
      tag: "context",
      body: [
        "Antes de montar um móvel, você confere a lista de peças da caixa. Se faltar um parafuso, você descobre na hora, não com o armário pela metade. No [[test-driven development|test-driven-development]] (TDD), a lista vem antes também: você escreve o teste de um comportamento, vê ele falhar, e só então escreve o código que o faz passar.",
        "Kent Beck popularizou o método no livro “Test-Driven Development: By Example”. Martin Fowler resume: comece com uma lista de casos de teste, pegue um, escreva o teste, faça passar, refatore, e repita. Cada [[teste unitário|unit-test]] confere uma unidade pequena (uma função, uma classe) isolada do resto, e roda em milissegundos.",
      ],
      keyIdea: "TDD inverte a ordem: o teste define o comportamento, e o código existe para fazê-lo passar.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "list", kind: "documents", label: "lista de testes", col: 0, row: 0.5 },
              { id: "test", kind: "eval", label: "teste falha", col: 1, row: 0.5 },
              { id: "agent", kind: "agent", label: "agente", col: 2, row: 0.5 },
              { id: "code", kind: "app", label: "código", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "list", to: "test", label: "um caso" },
              { from: "test", to: "agent", label: "vermelho" },
              { from: "agent", to: "code", label: "mínimo" },
            ],
            active: "test",
          },
        ],
      },
      alt: "Da lista de testes sai um caso; o teste, em destaque, falha primeiro; o agente recebe o vermelho e escreve o código mínimo para passar.",
    },
    {
      id: "cycle",
      shortTitle: "O ciclo",
      title: "Vermelho, verde, refatorar",
      tag: "mechanism",
      body: [
        "O ciclo [[red-green-refactor|red-green-refactor]] tem três passos curtos. Vermelho: escreva um teste para o próximo pedaço de comportamento e veja falhar. Verde: escreva o mínimo de código para passar, mesmo feio. Refatorar: limpe o código novo e o antigo com todos os testes verdes, sem mudar comportamento.",
        "Ver o teste falhar não é ritual. Um teste que já nasce verde pode estar testando nada, por exemplo com o assert errado. E Fowler avisa que o jeito mais comum de estragar o TDD é pular o terceiro passo: sem a [[refatoração|refactoring]], o código vira uma pilha de “mínimos” que ninguém limpou.",
      ],
      keyIdea: "Vermelho prova que o teste testa; verde prova que o código cumpre; refatorar mantém o código limpo com a rede dos testes.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "cycle",
            piece: "pipeline",
            stages: [
              { id: "red", label: "vermelho: teste falha", color: "danger" },
              { id: "green", label: "verde: mínimo passa", color: "success" },
              { id: "refactor", label: "refatorar", color: "module-15" },
            ],
            active: "red",
            repeat: { from: "red", to: "refactor", label: "× caso da lista" },
          },
        ],
      },
      alt: "O ciclo do TDD: vermelho, o teste falha, em destaque; verde, o mínimo passa; refatorar. Os três passos se repetem para cada caso da lista.",
    },
    {
      id: "run",
      shortTitle: "Rodando",
      title: "Uma função, quatro casos, sete etapas",
      tag: "mechanism",
      body: [
        `A função parcelas(total, n) divide um valor em centavos em n parcelas. A lista de testes tem ${testList.length} casos: ${testList.map((test) => test.label).join(", ")}. O primeiro teste falha porque a função não existe. A versão ingênua, que repete total / n arredondado para baixo, passa no primeiro e falha no segundo.`,
        `A cena mostra quantos testes passam em cada etapa. Repare na etapa “2 refatorar”: o número não muda, porque refatorar não muda comportamento. O caso “${testList[2].label}” ${singlePassesEarly ? "já passa quando é escrito" : "falha quando é escrito"}: ele documenta um limite e não ganha etapa vermelha, por isso a cena pula do 2 para o 4. No fim, ${lastStage.passing} de ${testList.length} passam.`,
      ],
      keyIdea: "Cada teste novo começa vermelho; cada etapa verde fecha um comportamento a mais.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "passing",
            piece: "chart",
            kind: "bar",
            series: passingSeries,
            max: testList.length,
            highlight: stageResults.findIndex((stage) => stage.phase === "refactor"),
            color: "module-15",
          },
        ],
      },
      alt: `Testes passando em cada etapa do ciclo: ${passingSeries.map((item) => `${item.label}, ${item.value}`).join("; ")}.`,
    },
    {
      id: "cent",
      shortTitle: "O centavo",
      title: "O centavo que sumiu",
      tag: "example",
      body: [
        `Com ${money(remainderCase.total)} em ${remainderCase.n} parcelas, a versão ingênua devolve [${naiveOut.join(", ")}]: soma ${sum(naiveOut)} centavos. Sumiu ${lost} centavo. Ninguém percebe olhando o código; o teste percebe na primeira execução.`,
        `A correção calcula o resto, ${remainderCase.total} − ${Math.floor(remainderCase.total / remainderCase.n)} × ${remainderCase.n} = ${remainderCase.total - Math.floor(remainderCase.total / remainderCase.n) * remainderCase.n}, e dá um centavo a mais para as primeiras parcelas: [${fixedOut.join(", ")}], soma ${sum(fixedOut)}. O último caso, n = 0, pede um erro explícito em vez de devolver uma lista vazia. É o tipo de borda que só aparece quando alguém escreve a lista antes.`,
      ],
      keyIdea: "Os testes escritos antes pegam o erro de borda que o código “quase certo” esconde.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "cent",
            piece: "metrics-panel",
            metrics: [
              { id: "naive", label: "ingênua", value: `[${naiveOut.join(", ")}] = ${sum(naiveOut)}`, color: "danger" },
              { id: "fixed", label: "com o resto", value: `[${fixedOut.join(", ")}] = ${sum(fixedOut)}`, color: "success" },
              { id: "lost", label: "perdido", value: `${lost} centavo` },
            ],
            highlight: "fixed",
          },
          {
            id: "parcels",
            piece: "token-stream",
            tokens: fixedOut.map((value, index) => `parcela ${index + 1}: ${value}`),
            bars: fixedOut.map((value) => value / Math.max(...fixedOut)),
            keys: [0],
            color: "module-15",
          },
        ],
      },
      alt: `Para ${remainderCase.total} centavos em ${remainderCase.n} parcelas: a versão ingênua devolve ${naiveOut.join(", ")}, soma ${sum(naiveOut)}; a versão com o resto devolve ${fixedOut.join(", ")}, soma ${sum(fixedOut)}. A primeira parcela recebe o centavo extra.`,
    },
    {
      id: "agent-tdd",
      shortTitle: "Com agente",
      title: "O agente não pode mexer no teste",
      tag: "tradeoff",
      body: [
        "TDD combina muito bem com agentes: o teste vermelho é um alvo claro, e o agente itera até o verde sozinho. A documentação do Claude Code dá o exemplo: em vez de “corrija o bug do login”, peça para escrever um teste que reproduz a falha e só então corrigir.",
        "O risco é o agente “passar” mudando o teste, não o código: afrouxar um assert, apagar um caso, marcar como skip. Kent Beck, no texto “Canon TDD”, lista apagar asserts para o teste passar entre os erros clássicos do método. Por isso, revise e commite os testes antes de pedir a implementação, e diga explicitamente que os testes não podem mudar. Um [[guardrail|guardrail]] no fluxo, como recusar diffs que mexem nos arquivos de teste nessa etapa, transforma o pedido em regra. O custo do TDD é o tempo de escrever os testes antes, que não compensa em protótipo descartável.",
      ],
      keyIdea: "Com agentes, o teste escrito antes é o contrato; trave o contrato antes de pedir o código.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "list", kind: "documents", label: "testes commitados", col: 0, row: 0.5 },
              { id: "agent", kind: "agent", label: "agente", col: 1, row: 0.5 },
              { id: "test", kind: "eval", label: "npm test", col: 2, row: 0 },
              { id: "guard", kind: "guardrail", label: "testes travados", col: 2, row: 1 },
              { id: "code", kind: "app", label: "código", col: 3, row: 0 },
            ],
            edges: [
              { from: "list", to: "agent", label: "contrato" },
              { from: "agent", to: "test", label: "roda" },
              { from: "test", to: "code", label: "verde" },
              { from: "agent", to: "guard", label: "editar o teste", variant: "alternative" },
            ],
            active: "guard",
            done: ["list", "agent", "test"],
          },
        ],
      },
      alt: "Os testes commitados são o contrato do agente, que roda npm test até o verde e entrega o código. Um caminho tracejado mostra a tentativa de editar o teste, barrada pelo guardrail de testes travados, em destaque.",
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Ciclos curtos com rede de segurança",
      tag: "summary",
      body: [
        "TDD é uma lista de casos percorrida em ciclos curtos: um teste vermelho, o mínimo para o verde, uma refatoração com tudo verde. O resultado é código coberto por testes que nasceram falhando, e por isso testam algo de verdade.",
        "Escrever testes é exatamente o tipo de trabalho que um agente acelera. A próxima aula mostra como usar IA para gerar testes, e como saber se os testes gerados prestam.",
      ],
      keyIdea: "TDD = lista de casos + vermelho + verde + refatorar, repetido até a lista acabar.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "cycle",
            piece: "pipeline",
            stages: [
              { id: "red", label: "vermelho: teste falha", color: "danger" },
              { id: "green", label: "verde: mínimo passa", color: "success" },
              { id: "refactor", label: "refatorar", color: "module-15" },
            ],
            active: "refactor",
            done: ["red", "green"],
            repeat: { from: "red", to: "refactor", label: `× ${testList.length} casos` },
          },
        ],
      },
      alt: `O ciclo completo do TDD, vermelho, verde e refatorar, repetido para os ${testList.length} casos da lista, com refatorar em destaque.`,
    },
  ],
  realWorldExample:
    "O validador de conteúdo deste site é testado assim: o content.test.ts tem um caso que monta uma aula inválida de propósito (uma fixture que aponta para a aula inexistente 99-99) e confere que a mensagem de erro traz o arquivo, o campo e o motivo. O teste garante que o validador falha quando deve, e não só que ele passa no conteúdo bom.",
  code: {
    language: "typescript",
    source: `import { describe, expect, it } from "vitest";

export function parcelas(total: number, n: number): number[] {
  if (!Number.isInteger(n) || n < 1) throw new RangeError("n precisa ser um inteiro maior que zero");
  const base = Math.floor(total / n);
  const resto = total - base * n;
  return Array.from({ length: n }, (_, i) => (i < resto ? base + 1 : base));
}

describe("parcelas", () => {
  it("divide sem resto", () => expect(parcelas(300, 3)).toEqual([100, 100, 100]));
  it("distribui o resto sem perder centavo", () => expect(parcelas(100, 3)).toEqual([34, 33, 33]));
  it("uma parcela é o total", () => expect(parcelas(500, 1)).toEqual([500]));
  it("recusa zero parcelas", () => expect(() => parcelas(100, 0)).toThrow(RangeError));
});`,
    caption: "A função e a lista de testes da aula no fim do ciclo, em Vitest. Os testes foram escritos um por vez, cada um visto falhando antes do código.",
  },
  tradeOffs: {
    pros: [
      "Cada comportamento nasce com um teste que já provou que falha",
      "O teste vermelho é um alvo claro para o agente iterar sozinho",
      "Refatorar fica seguro, porque a rede de testes pega regressões na hora",
    ],
    cons: [
      "Escrever testes antes custa tempo que não compensa em protótipo descartável",
      "Testes acoplados à implementação quebram em toda refatoração",
      "Um agente pode “passar” editando o teste se ninguém travar o contrato",
    ],
    alternatives: [
      "Testes escritos logo depois do código, para exploração em que o comportamento ainda não está claro",
      "Testes de aceite primeiro (ATDD), partindo dos critérios da spec",
    ],
  },
  knowledgeCheck: [
    {
      id: "why-red",
      prompt: "Você escreve um teste novo e ele passa de primeira, sem nenhum código novo. O que fazer?",
      options: [
        "Comemorar e seguir para o próximo",
        "Desconfiar: confirmar que o teste falha se o comportamento estiver errado, por exemplo quebrando o código de propósito",
        "Apagar o teste",
        "Marcar como skip",
      ],
      correct: 1,
      explanation: "Um teste que nunca falhou pode não testar nada. Ou o comportamento já existia (e o teste documenta um limite), ou o assert está errado. Quebrar o código de propósito tira a dúvida.",
      lesson: "15-07",
    },
    {
      id: "agent-edits-test",
      prompt: "Você pede ao agente para fazer os testes passarem, e o diff afrouxa um assert de toEqual para toBeDefined. O que isso mostra?",
      options: [
        "Que o teste estava errado",
        "Que o agente cumpriu o pedido literal, e o contrato precisava estar travado: testes commitados e proibidos de mudar nessa etapa",
        "Que o modelo é fraco",
        "Que TDD não funciona com agentes",
      ],
      correct: 1,
      explanation: "“Faça os testes passarem” tem um atalho: mudar os testes. Commitar os testes antes e proibir a edição deles fecha o atalho.",
      lesson: "15-07",
    },
  ],
  related: ["15-06", "15-08", "15-04"],
  references: [
    { title: "Martin Fowler, Test Driven Development", url: "https://martinfowler.com/bliki/TestDrivenDevelopment.html", kind: "article" },
    { title: "Kent Beck (2023), Canon TDD", url: "https://newsletter.kentbeck.com/p/canon-tdd", kind: "article" },
    { title: "Claude Code: Best practices", url: "https://code.claude.com/docs/en/best-practices", kind: "docs" },
  ],
};

export default lesson;
