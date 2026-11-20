import type { LessonContent } from "../../../types/content";

// Requisitos e critérios de aceite com contas no arquivo. O critério LES-01.11 da spec deste site ("IF a URL
// pede um passo fora de 1..N THEN abrir o passo 1") é implementado aqui como resolveStep e executado contra
// as classes de entrada que a tarefa T13 lista. A distribuição das palavras-chave EARS saiu da contagem
// dos 79 critérios em .specs/features/learning-platform/spec.md. A matriz de rastreio é um recorte de
// brinquedo com 6 critérios da LES-01 e 5 testes, para mostrar como uma lacuna aparece.

const percent = (value: number) => `${(value * 100).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}%`;

const TOTAL_STEPS = 10;

/** LES-01.11: passo fora de 1..N, ausente ou não numérico abre o passo 1. */
const resolveStep = (raw: string | null, total: number) => {
  if (raw === null || !/^-?\d+$/.test(raw)) return 1;
  const step = Number(raw);
  return step >= 1 && step <= total ? step : 1;
};

interface StepCase {
  label: string;
  raw: string | null;
  expected: number;
  invalid: boolean;
}

const stepCases: StepCase[] = [
  { label: "ausente", raw: null, expected: 1, invalid: true },
  { label: "0", raw: "0", expected: 1, invalid: true },
  { label: "-2", raw: "-2", expected: 1, invalid: true },
  { label: "abc", raw: "abc", expected: 1, invalid: true },
  { label: "99", raw: "99", expected: 1, invalid: true },
  { label: "4", raw: "4", expected: 4, invalid: false },
  { label: String(TOTAL_STEPS), raw: String(TOTAL_STEPS), expected: TOTAL_STEPS, invalid: false },
];
const results = stepCases.map((item) => ({ ...item, got: resolveStep(item.raw, TOTAL_STEPS) }));
const passing = results.filter((item) => item.got === item.expected).length;
const invalidClasses = stepCases.filter((item) => item.invalid).length;
const validClasses = stepCases.length - invalidClasses;

// Contagem por palavra-chave EARS nos 79 critérios da spec (a primeira que aparece em cada critério).
const ears = [
  { label: "WHEN", value: 31 },
  { label: "sem palavra-chave", value: 29 },
  { label: "WHILE", value: 9 },
  { label: "IF", value: 9 },
  { label: "WHERE", value: 1 },
];
const CRITERIA = ears.reduce((sum, item) => sum + item.value, 0);
const STORIES = 13;
const when = ears[0];

// Recorte de brinquedo: critérios da LES-01 × testes que os cobrem.
const criteria = ["LES-01.2", "LES-01.3", "LES-01.4", "LES-01.5", "LES-01.7", "LES-01.11"];
const tests: Array<{ label: string; covers: string[] }> = [
  { label: "→ avança", covers: ["LES-01.2"] },
  { label: "← volta", covers: ["LES-01.3"] },
  { label: "voltar no 1º", covers: ["LES-01.4", "LES-01.3"] },
  { label: "próxima aula", covers: ["LES-01.5"] },
  { label: "step inválido", covers: ["LES-01.11"] },
];
const traceability = criteria.map((criterion) => tests.map((test) => (test.covers.includes(criterion) ? 1 : 0)));
const uncovered = criteria.filter((_, row) => traceability[row].every((value) => value === 0));
const covered = criteria.length - uncovered.length;
const gapRow = criteria.indexOf(uncovered[0] ?? criteria[0]);

const STORY = ["Como", "aluno,", "quero", "avançar", "passo", "a", "passo,", "para", "entender", "o mecanismo"];
const STORY_KEYS = [1, 3, 8];
const storyWord = (index: number) => STORY[index].replace(",", "");

const lesson: LessonContent = {
  id: "15-04",
  subtitle: "Como transformar uma necessidade em critérios que dizem sem discussão se a feature está pronta, e cada critério em testes.",
  objectives: [
    "Escrever uma história de usuário com papel, ação e motivo",
    "Escrever critérios de aceite nos formatos EARS e Given-When-Then",
    "Derivar os casos de teste de um critério por classes de entrada",
    "Montar uma matriz de rastreio e achar critérios sem teste",
  ],
  steps: [
    {
      id: "done-for-whom",
      shortTitle: "Pronto?",
      title: "Pronto para quem?",
      tag: "context",
      body: [
        "Você pede a um marceneiro “uma estante para livros”. Ele entrega uma estante linda, com prateleiras de 20 cm. Seus livros de arte têm 32 cm. Para ele, está pronto; para você, não. Faltou dizer o critério: “cabe um livro de 32 cm em pé”.",
        "Um [[requisito|requirement]] diz o que o sistema precisa fazer. Os [[critérios de aceite|acceptance-criteria]] dizem como saber, sem discussão, que o requisito foi cumprido. Com um agente, eles são a diferença entre “o agente disse que terminou” e “os testes que conferem os critérios passaram”.",
      ],
      keyIdea: "Critério de aceite é o acordo sobre o que é “pronto”, escrito antes de alguém dizer que terminou.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "user", kind: "user", label: "aluno", col: 0, row: 0.5 },
              { id: "story", kind: "documents", label: "história", col: 1, row: 0.5 },
              { id: "criteria", kind: "eval", label: "critérios", col: 2, row: 0.5 },
              { id: "agent", kind: "agent", label: "agente", col: 3, row: 0 },
              { id: "tests", kind: "guardrail", label: "testes", col: 3, row: 1 },
            ],
            edges: [
              { from: "user", to: "story", label: "necessidade" },
              { from: "story", to: "criteria", label: "pronto se" },
              { from: "criteria", to: "agent", label: "implementa" },
              { from: "criteria", to: "tests", label: "confere" },
            ],
            active: "criteria",
          },
        ],
      },
      alt: "A necessidade do aluno vira uma história, que vira critérios de aceite, em destaque. Os critérios guiam o agente que implementa e os testes que conferem.",
    },
    {
      id: "story",
      shortTitle: "História",
      title: "Quem, o quê e por quê",
      tag: "mechanism",
      body: [
        "Uma [[história de usuário|user-story]] cabe numa frase: “Como [papel], quero [ação], para [motivo]”. A da spec deste site é “Como aluno, quero avançar passo a passo numa cena animada com narração, para entender o mecanismo, não só a definição”.",
        "Cada parte tem função. O papel diz de quem é a necessidade. A ação diz o que muda. O motivo é o que mais ajuda um agente: quando dois caminhos parecem certos, o “para entender o mecanismo” decide. A história sozinha não é testável; ela é a âncora dos critérios que vêm embaixo dela.",
      ],
      keyIdea: "A história explica a intenção; os critérios abaixo dela tornam a intenção conferível.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "story",
            piece: "token-stream",
            tokens: STORY,
            keys: STORY_KEYS,
            color: "module-15",
          },
        ],
      },
      alt: `A história “${STORY.join(" ")}”, com o papel (${storyWord(STORY_KEYS[0])}), a ação (${storyWord(STORY_KEYS[1])}) e o motivo (${storyWord(STORY_KEYS[2])}) em destaque.`,
    },
    {
      id: "formats",
      shortTitle: "Formatos",
      title: "EARS e Given-When-Then",
      tag: "mechanism",
      body: [
        "Dois formatos ajudam a escrever critérios sem ambiguidade. O [[Given-When-Then|given-when-then]], do BDD, conta um cenário: dado um contexto, quando algo acontece, então o resultado é este. A notação [[EARS|ears-notation]], criada na Rolls-Royce e publicada em 2009, usa palavras-chave fixas: WHEN para evento, WHILE para estado, IF ... THEN para comportamento indesejado, WHERE para recurso opcional, e nenhuma para o que vale sempre.",
        `A spec deste site usa EARS. Dos ${CRITERIA} critérios das ${STORIES} histórias, ${when.value} começam com WHEN, ${ears[2].value} com WHILE, ${ears[3].value} com IF e ${ears[4].value} com WHERE; ${ears[1].value} valem sempre. Cada palavra-chave é uma pista para o teste: WHEN vira “dispare o evento e confira”; IF vira o caso de erro.`,
      ],
      keyIdea: "Gatilho + resultado observável: esse é o formato que vira teste.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "gwt",
            piece: "pipeline",
            stages: [
              { id: "given", label: "Given: na aula, passo 3" },
              { id: "when", label: "When: aperta →", color: "module-15" },
              { id: "then", label: "Then: passo 4", color: "success" },
            ],
            active: "when",
            done: ["given"],
            branch: { id: "if", label: "IF ?step=99 THEN passo 1", color: "danger", from: "when", edgeLabel: "indesejado" },
          },
          {
            id: "ears",
            piece: "chart",
            kind: "bar",
            series: ears,
            highlight: 0,
            color: "module-15",
          },
        ],
      },
      alt: `Um cenário Given-When-Then: dado o passo 3, quando o aluno aperta seta para a direita, então vai ao passo 4; um ramo tracejado mostra o caso indesejado, passo 99 abre o passo 1. Abaixo, os ${CRITERIA} critérios da spec por palavra-chave EARS: ${ears.map((item) => `${item.label} ${item.value}`).join(", ")}.`,
    },
    {
      id: "partitions",
      shortTitle: "Casos",
      title: `Um critério, ${stepCases.length} testes`,
      tag: "example",
      body: [
        "“IF a URL pede um passo fora do intervalo 1..N THEN o sistema SHALL abrir o passo 1.” Quantos testes isso pede? Não um por número possível: um por classe de entrada que o código trata de jeito diferente. É a [[partição de equivalência|equivalence-partitioning]].",
        `A tarefa T13 deste site lista as classes: passo ausente, zero, negativo, não numérico e maior que N. São ${invalidClasses} classes inválidas, mais ${validClasses} válidas (um passo no meio e o limite N = ${TOTAL_STEPS}), num total de ${stepCases.length} casos. A função resolveStep deste arquivo passa em ${passing} de ${stepCases.length}. O critério cabe numa linha; os testes saem quase mecânicos, e um agente os escreve bem a partir dele.`,
      ],
      keyIdea: "Teste cada classe de entrada e cada limite, não cada valor.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "cases",
            piece: "metrics-panel",
            metrics: [
              { id: "invalid", label: "classes inválidas", value: String(invalidClasses) },
              { id: "valid", label: "classes válidas", value: String(validClasses) },
              { id: "passing", label: "passam", value: `${passing} de ${stepCases.length}`, color: "success" },
            ],
            highlight: "passing",
          },
          {
            id: "resolved",
            piece: "chart",
            kind: "bar",
            series: results.map((item) => ({ label: `?step=${item.label}`, value: item.got })),
            max: TOTAL_STEPS,
            highlight: results.findIndex((item) => !item.invalid),
            color: "module-15",
          },
        ],
      },
      alt: `Passo aberto por resolveStep para cada entrada, com N = ${TOTAL_STEPS}: ${results.map((item) => `${item.label} abre ${item.got}`).join(", ")}. ${passing} de ${stepCases.length} casos passam.`,
    },
    {
      id: "traceability",
      shortTitle: "Rastreio",
      title: "Qual critério ficou sem teste?",
      tag: "tradeoff",
      body: [
        "Com dezenas de critérios, é fácil um ficar para trás. A [[matriz de rastreio|traceability-matrix]] cruza critérios com testes: cada linha é um critério, cada coluna um teste, e uma linha vazia é um critério que ninguém confere.",
        `No recorte da cena, ${covered} dos ${criteria.length} critérios têm teste (${percent(covered / criteria.length)}). ${uncovered.join(", ")}, “R reinicia a animação do passo”, ficou de fora. Pedir ao agente “para cada critério, aponte o teste que o confere” acha essa lacuna em segundos. O custo é manter os ids dos critérios nos nomes dos testes ou nas tarefas, como o tasks.md deste site faz.`,
      ],
      keyIdea: "Critério sem teste é critério que pode quebrar sem ninguém ver.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "matrix",
            piece: "matrix",
            rows: criteria,
            cols: tests.map((test) => test.label),
            values: traceability,
            scale: { min: 0, max: 1 },
            highlight: { row: gapRow, col: 0 },
            color: "module-15",
          },
        ],
      },
      alt: `Matriz de rastreio com ${criteria.length} critérios e ${tests.length} testes. ${covered} critérios têm pelo menos um teste; a linha de ${uncovered.join(", ")} está vazia e em destaque.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Da necessidade ao teste",
      tag: "summary",
      body: [
        "A história diz quem precisa do quê e por quê. Os critérios, em EARS ou Given-When-Then, dizem como conferir. As classes de entrada transformam cada critério em poucos testes, e a matriz de rastreio garante que nenhum critério ficou sem teste.",
        "Com os critérios escritos, falta decidir a ordem do trabalho. A próxima aula mostra como um agente quebra a spec em tarefas pequenas.",
      ],
      keyIdea: "História → critérios → classes de entrada → testes, cada elo rastreável pelo id.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "user", kind: "user", label: "aluno", col: 0, row: 0.5 },
              { id: "story", kind: "documents", label: "história", col: 1, row: 0.5 },
              { id: "criteria", kind: "eval", label: "LES-01.11", col: 2, row: 0.5 },
              { id: "agent", kind: "agent", label: "agente", col: 3, row: 0 },
              { id: "tests", kind: "guardrail", label: `${stepCases.length} testes`, col: 3, row: 1 },
            ],
            edges: [
              { from: "user", to: "story", label: "necessidade" },
              { from: "story", to: "criteria", label: "pronto se" },
              { from: "criteria", to: "agent", label: "implementa" },
              { from: "criteria", to: "tests", label: "classes" },
            ],
            active: "tests",
            done: ["user", "story", "criteria", "agent"],
          },
        ],
      },
      alt: `O fluxo completo: a necessidade do aluno vira uma história, a história vira o critério LES-01.11, e o critério vira ${stepCases.length} testes, em destaque, que conferem o que o agente implementou.`,
    },
  ],
  realWorldExample:
    "Ferramentas de BDD como o Cucumber executam critérios em Gherkin: cada linha Given, When ou Then de um arquivo .feature é ligada a uma função de teste, e o critério escrito em linguagem natural vira um teste que roda no CI. O Kiro, da AWS, gera o requirements.md de cada feature com histórias de usuário e critérios de aceite antes de qualquer código.",
  code: {
    language: "typescript",
    source: `import { describe, expect, it } from "vitest";
import { resolveStep } from "./router";

// LES-01.11: IF a URL pede um passo fora de 1..N THEN abre o passo 1.
describe("resolveStep (LES-01.11)", () => {
  it.each([
    ["ausente", null, 1],
    ["zero", "0", 1],
    ["negativo", "-2", 1],
    ["não numérico", "abc", 1],
    ["maior que N", "99", 1],
    ["no meio", "4", 4],
    ["limite N", "10", 10],
  ])("%s → passo %s", (_, raw, expected) => {
    expect(resolveStep(raw, 10)).toBe(expected);
  });
});`,
    caption: "Um critério EARS virando uma tabela de casos: uma linha por classe de entrada e por limite, com o id do critério no nome do teste.",
  },
  tradeOffs: {
    pros: [
      "Acaba com a discussão sobre o que é “pronto”",
      "Critérios com gatilho e resultado viram testes quase mecanicamente",
      "Ids nos critérios permitem rastrear código, tarefa e teste",
    ],
    cons: [
      "Escrever bons critérios exige pensar nos erros e nos limites antes do código",
      "Critérios demais para uma feature pequena viram burocracia",
      "Critério que passa no teste pode ainda não resolver a necessidade da história",
    ],
    alternatives: [
      "Exemplos concretos (specification by example) no lugar de regras gerais",
      "Testes de aceite automatizados como a própria especificação",
    ],
  },
  knowledgeCheck: [
    {
      id: "partitions",
      prompt: "Critério: “IF a quantidade no carrinho for menor que 1 ou maior que 99 THEN SHALL recusar”. Quais casos testar?",
      options: [
        "Só 50",
        "Todos os números de 1 a 99",
        "0, 1, 99, 100 e um valor não numérico",
        "Só 0 e 100",
      ],
      correct: 2,
      explanation: "Uma partição por classe e os limites dos dois lados: 0 e 100 recusam, 1 e 99 aceitam, e a entrada não numérica é outra classe.",
      lesson: "15-04",
    },
    {
      id: "ears-keyword",
      prompt: "“Enquanto o upload está em andamento, o botão Enviar fica desabilitado.” Qual palavra-chave EARS descreve esse critério?",
      options: ["WHEN", "WHILE", "IF ... THEN", "WHERE"],
      correct: 1,
      explanation: "WHILE descreve um estado que dura. WHEN é para um evento pontual, IF para um comportamento indesejado e WHERE para um recurso opcional.",
      lesson: "15-04",
    },
  ],
  related: ["15-03", "15-05", "15-07"],
  references: [
    { title: "Alistair Mavin, EARS: Easy Approach to Requirements Syntax", url: "https://alistairmavin.com/ears/", kind: "article" },
    { title: "Martin Fowler, GivenWhenThen", url: "https://martinfowler.com/bliki/GivenWhenThen.html", kind: "article" },
    { title: "Cucumber: Gherkin reference", url: "https://cucumber.io/docs/gherkin/reference/", kind: "docs" },
  ],
};

export default lesson;
