import type { LessonContent } from "../../../types/content";

// Testes gerados com IA, com contas no arquivo. A função desconto(total) dá 10% a partir de R$ 100, com teto
// de R$ 50. Os mutantes são versões da função com um erro pequeno, escritos à mão como os operadores de
// mutação de ferramentas como Stryker e PIT. Cada suíte roda contra cada mutante; o mutation score é
// detectados / válidos, sem os mutantes equivalentes. A cobertura de ramos sai de instrumentar a função.
// O teste de propriedade usa entradas de um gerador pseudoaleatório com semente fixa, para ser reproduzível.

const percent = (value: number) => `${(value * 100).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}%`;
const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");

const THRESHOLD = 100;
const RATE = 0.1;
const CAP = 50;
const EPSILON = 1e-9;

type Branch = "above" | "below" | "capped" | "uncapped";
type Discount = (total: number, hit?: (branch: Branch) => void) => number;

const original: Discount = (total, hit) => {
  if (total >= THRESHOLD) {
    hit?.("above");
    const value = total * RATE;
    if (value > CAP) {
      hit?.("capped");
      return CAP;
    }
    hit?.("uncapped");
    return value;
  }
  hit?.("below");
  return 0;
};

interface Mutant {
  id: string;
  label: string;
  equivalent: boolean;
  run: (total: number) => number;
}

const mutants: Mutant[] = [
  { id: "gt", label: ">= vira >", equivalent: false, run: (t) => (t > THRESHOLD ? Math.min(t * RATE, CAP) : 0) },
  { id: "threshold", label: "100 vira 50", equivalent: false, run: (t) => (t >= 50 ? Math.min(t * RATE, CAP) : 0) },
  { id: "rate", label: "10% vira 20%", equivalent: false, run: (t) => (t >= THRESHOLD ? Math.min(t * 0.2, CAP) : 0) },
  { id: "no-cap", label: "sem teto", equivalent: false, run: (t) => (t >= THRESHOLD ? t * RATE : 0) },
  { id: "cap-ge", label: "> 50 vira >= 50", equivalent: true, run: (t) => (t >= THRESHOLD ? (t * RATE >= CAP ? CAP : t * RATE) : 0) },
  { id: "else", label: "abaixo também ganha", equivalent: false, run: (t) => Math.min(t * RATE, CAP) },
  { id: "negate", label: "condição invertida", equivalent: false, run: (t) => (t < THRESHOLD ? Math.min(t * RATE, CAP) : 0) },
];
const validMutants = mutants.filter((mutant) => !mutant.equivalent);
const equivalentMutant = mutants.find((mutant) => mutant.equivalent);

interface Suite {
  id: string;
  label: string;
  /** Casos (entrada, esperado). O esperado vem da spec, exceto na suíte copiada da saída do código. */
  cases: Array<[number, number]>;
}

const fromCode: Suite = { id: "code", label: "gerada do código", cases: [[50, original(50)], [200, original(200)]] };
const fromSpec: Suite = {
  id: "spec",
  label: "gerada da spec",
  cases: [[99.99, 0], [100, 10], [250, 25], [500, 50], [600, 50]],
};
const exampleSuites = [fromCode, fromSpec];

const killsBySuite = (suite: Suite, mutant: Mutant) =>
  suite.cases.some(([input, expected]) => Math.abs(mutant.run(input) - expected) > EPSILON);

/** Gerador de Park e Miller com semente fixa: entradas inteiras de 0 a 1.000. */
const seededInputs = (count: number, seed: number) => {
  const values: number[] = [];
  let state = seed;
  for (let index = 0; index < count; index += 1) {
    state = (state * 16_807) % 2_147_483_647;
    values.push(state % 1001);
  }
  return values;
};
const SAMPLES = 200;
const inputs = seededInputs(SAMPLES, 42);
/** A propriedade da spec: 0 ≤ desconto ≤ 50, desconto ≤ 10% do total, e zero abaixo de R$ 100. */
const holds = (total: number, discount: number) =>
  discount >= -EPSILON && discount <= CAP + EPSILON && discount <= total * RATE + EPSILON && (total >= THRESHOLD || discount === 0);
const violations = (mutant: Mutant) => inputs.filter((total) => !holds(total, mutant.run(total))).length;
const killsByProperty = (mutant: Mutant) => violations(mutant) > 0;

const columns = [
  ...exampleSuites.map((suite) => ({ label: suite.label, kills: (mutant: Mutant) => killsBySuite(suite, mutant) })),
  { label: "propriedade", kills: killsByProperty },
];
const killMatrix = mutants.map((mutant) => columns.map((column) => (column.kills(mutant) ? 1 : 0)));
const score = (kills: (mutant: Mutant) => boolean) => validMutants.filter(kills).length / validMutants.length;
const scoreCode = score(columns[0].kills);
const scoreSpec = score(columns[1].kills);
const scoreProperty = score(columns[2].kills);
const survivorsCode = validMutants.filter((mutant) => !columns[0].kills(mutant)).map((mutant) => mutant.label);
const propertyMisses = validMutants.filter((mutant) => !killsByProperty(mutant)).map((mutant) => mutant.label);

const branches: Branch[] = ["above", "below", "capped", "uncapped"];
const branchCoverage = (suite: Suite) => {
  const seen = new Set<Branch>();
  for (const [input] of suite.cases) original(input, (branch) => seen.add(branch));
  return seen.size / branches.length;
};
const coverageCode = branchCoverage(fromCode);
const coverageSpec = branchCoverage(fromSpec);

const violationSeries = validMutants.map((mutant) => ({ label: mutant.label, value: violations(mutant) }));

// Custo de brinquedo de rodar mutação num projeto maior: cada mutante roda a suíte, ou só os testes que o cobrem.
const PROJECT_MUTANTS = 2000;
const SUITE_SECONDS = 90;
const COVERING_SHARE = 0.05;
const naiveHours = (PROJECT_MUTANTS * SUITE_SECONDS) / 3600;
const coveringHours = naiveHours * COVERING_SHARE;

const lesson: LessonContent = {
  id: "15-08",
  subtitle: "Gerar testes com IA é fácil; saber se eles pegam bugs é outra história. Oráculo, mutation testing e testes de propriedade.",
  objectives: [
    "Explicar o problema do oráculo quando o agente escreve testes a partir do código",
    "Calcular cobertura e mutation score de duas suítes e comparar",
    "Escrever uma propriedade que vale para qualquer entrada",
    "Saber onde testes de integração entram e o que custam",
  ],
  steps: [
    {
      id: "circular",
      shortTitle: "Círculo",
      title: "Quem testa o teste?",
      tag: "context",
      body: [
        "Imagine um aluno que corrige a própria prova olhando as próprias respostas. Ele sempre tira 10, e isso não diz nada. Um agente que lê o código, roda a função e copia a saída para o “esperado” do teste faz o mesmo: o teste passa, e passaria também se a função estivesse errada.",
        "Kent Beck aponta esse erro no texto “Canon TDD”: copiar valores calculados para o esperado do teste destrói a conferência dupla que dá valor ao teste. O nome técnico é o problema do [[oráculo de teste|test-oracle]]: o teste precisa de uma fonte independente do código para saber qual é a resposta certa.",
      ],
      keyIdea: "Um teste cujo esperado veio do próprio código só prova que o código faz o que faz.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "code", kind: "app", label: "código", col: 0, row: 0.5 },
              { id: "agent", kind: "agent", label: "agente", col: 1, row: 0.5 },
              { id: "tests", kind: "eval", label: "testes gerados", col: 2, row: 0.5 },
              { id: "green", kind: "answer", label: "sempre verde", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "code", to: "agent", label: "lê a saída" },
              { from: "agent", to: "tests", label: "copia no esperado" },
              { from: "tests", to: "green", label: "passa" },
              { from: "tests", to: "code", label: "confere contra si", variant: "alternative" },
            ],
            active: "tests",
          },
        ],
      },
      alt: "Um círculo: o agente lê a saída do código e copia no esperado dos testes gerados, em destaque, que conferem o código contra ele mesmo e ficam sempre verdes.",
    },
    {
      id: "oracle",
      shortTitle: "Oráculo",
      title: "O esperado vem da spec",
      tag: "mechanism",
      body: [
        "A prova precisa de um gabarito escrito por outra pessoa. No software, o gabarito são os critérios de aceite: “10% a partir de R$ 100, com teto de R$ 50”. Peça ao agente para gerar os casos a partir da spec, não do código, e cada esperado passa a ser uma afirmação independente.",
        `A suíte gerada do código tem ${fromCode.cases.length} casos com o esperado copiado da saída. A gerada da spec tem ${fromSpec.cases.length}, escolhidos pelos limites: ${fromSpec.cases.map(([input]) => `R$ ${input.toLocaleString("pt-BR")}`).join(", ")}. Mesma função, mesmo agente; o que muda é de onde vem o esperado.`,
      ],
      keyIdea: "Gere os casos a partir da spec; use o código só para rodá-los.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "spec", kind: "documents", label: "spec", col: 0, row: 0 },
              { id: "agent", kind: "agent", label: "agente", col: 1, row: 0 },
              { id: "code", kind: "app", label: "código", col: 1, row: 1 },
              { id: "tests", kind: "eval", label: "oráculo", col: 2, row: 0.5 },
              { id: "green", kind: "answer", label: "veredito", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "spec", to: "agent", label: "critérios" },
              { from: "agent", to: "tests", label: "esperado" },
              { from: "code", to: "tests", label: "obtido" },
              { from: "tests", to: "green", label: "compara" },
            ],
            active: "tests",
          },
        ],
      },
      alt: "O agente gera os esperados a partir dos critérios da spec; o código entrega o obtido; o oráculo, em destaque, compara os dois e dá o veredito.",
    },
    {
      id: "mutants",
      shortTitle: "Mutantes",
      title: "Plante bugs e veja quem acha",
      tag: "mechanism",
      body: [
        "Para saber se um detector de fumaça funciona, você acende um fósforo perto dele. [[Mutation testing|mutation-testing]] faz isso com testes: a ferramenta cria mutantes, cópias do código com um erro pequeno (>= vira >, 10% vira 20%), e roda a suíte contra cada um. Se algum teste falha, o mutante foi morto; se tudo passa, sobreviveu, e falta um teste.",
        `A matriz mostra ${mutants.length} mutantes contra as suítes. Um deles, “${equivalentMutant?.label ?? ""}”, é equivalente: muda o código, mas não o comportamento (com desconto exatamente 50, devolver o teto ou o valor dá no mesmo). Nenhum teste consegue matá-lo, e ele sai da conta. Na suíte gerada do código sobrevivem ${survivorsCode.map((label) => `“${label}”`).join(" e ")}.`,
      ],
      keyIdea: "Um teste bom falha quando o código está errado. Mutantes medem exatamente isso.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "kills",
            piece: "matrix",
            rows: mutants.map((mutant) => mutant.label),
            cols: columns.map((column) => column.label),
            values: killMatrix,
            scale: { min: 0, max: 1 },
            highlight: { row: mutants.findIndex((mutant) => mutant.id === "gt"), col: 0 },
            color: "module-15",
          },
        ],
      },
      alt: `Matriz de mutantes mortos, ${mutants.length} mutantes por três suítes. ${mutants.map((mutant, row) => `${mutant.label}: ${columns.map((column, col) => `${column.label} ${killMatrix[row][col] ? "mata" : "não mata"}`).join(", ")}`).join(". ")}.`,
    },
    {
      id: "score",
      shortTitle: "Score",
      title: "Cobertura alta, score baixo",
      tag: "example",
      body: [
        `O [[mutation score|mutation-score]] é detectados / válidos, como no Stryker. A suíte gerada do código tem ${percent(coverageCode)} de [[cobertura de ramos|code-coverage]] e score de ${percent(scoreCode)}. A gerada da spec tem ${percent(coverageSpec)} de cobertura e score de ${percent(scoreSpec)}.`,
        "A cobertura diz que linhas rodaram; não diz se algum assert olhou o resultado. Um teste sem assert nenhum tem a mesma cobertura que um teste bom. Por isso, quando um agente diz “aumentei a cobertura para 90%”, a pergunta seguinte é “e quantos mutantes os testes novos matam?”.",
      ],
      keyIdea: "Cobertura mede o que rodou; mutation score mede o que foi conferido.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "score",
            piece: "metrics-panel",
            metrics: [
              { id: "cov-code", label: "cobertura, do código", value: percent(coverageCode) },
              { id: "score-code", label: "score, do código", value: percent(scoreCode), color: "danger" },
              { id: "cov-spec", label: "cobertura, da spec", value: percent(coverageSpec) },
              { id: "score-spec", label: "score, da spec", value: percent(scoreSpec), color: "success" },
              { id: "valid", label: "mutantes válidos", value: `${validMutants.length} de ${mutants.length}` },
            ],
            highlight: "score-code",
          },
        ],
      },
      alt: `Suíte gerada do código: ${percent(coverageCode)} de cobertura de ramos e ${percent(scoreCode)} de mutation score. Suíte gerada da spec: ${percent(coverageSpec)} de cobertura e ${percent(scoreSpec)} de score. ${validMutants.length} dos ${mutants.length} mutantes são válidos.`,
    },
    {
      id: "property",
      shortTitle: "Propriedade",
      title: "Uma regra que vale para qualquer entrada",
      tag: "mechanism",
      body: [
        "Em vez de escolher exemplos, você escreve uma regra que vale sempre: “o desconto fica entre 0 e 50, nunca passa de 10% do total, e é zero abaixo de R$ 100”. O [[teste baseado em propriedades|property-based-testing]] gera centenas de entradas e procura uma que quebre a regra. Bibliotecas como Hypothesis, em Python, e fast-check, em TypeScript, fazem isso e encolhem o contraexemplo até o menor caso que falha.",
        `A cena conta quantas das ${SAMPLES} entradas geradas violam a propriedade em cada mutante. A propriedade mata ${percent(scoreProperty)} dos mutantes válidos${propertyMisses.length > 0 ? `; escapa ${propertyMisses.map((label) => `“${label}”`).join(" e ")}, que só erra num ponto exato e precisa de um exemplo no limite` : ""}. Propriedades e exemplos se completam: a propriedade cobre o espaço, o exemplo crava o limite.`,
      ],
      keyIdea: "Exemplos conferem pontos; propriedades conferem regras sobre todas as entradas.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "violations",
            piece: "chart",
            kind: "bar",
            series: violationSeries,
            highlight: violationSeries.findIndex((item) => item.value === Math.min(...violationSeries.map((entry) => entry.value))),
            color: "module-15",
          },
        ],
      },
      alt: `Entradas, de ${SAMPLES}, que violam a propriedade em cada mutante: ${violationSeries.map((item) => `${item.label}, ${item.value}`).join("; ")}.`,
    },
    {
      id: "cost",
      shortTitle: "Custo",
      title: "Quanto custa conferir os testes",
      tag: "tradeoff",
      body: [
        `Mutation testing é caro: cada mutante roda a suíte. Num projeto de brinquedo com ${integer(PROJECT_MUTANTS)} mutantes e uma suíte de ${SUITE_SECONDS} s, são ${integer(naiveHours)} horas de máquina. Ferramentas como Stryker rodam só os testes que cobrem cada mutante; se forem ${percent(COVERING_SHARE)} da suíte, cai para ${integer(coveringHours)} horas. Na prática, roda-se a mutação só nos arquivos alterados do pull request.`,
        "Testes unitários com mutantes não pegam tudo. Um [[teste de integração|integration-test]] junta módulos de verdade (o desconto com o carrinho e o banco) e pega erros de encaixe que nenhum teste isolado vê, ao custo de ser mais lento e mais frágil. A divisão usual é muitos unitários, menos de integração e poucos de ponta a ponta.",
      ],
      keyIdea: "Mutação nos arquivos alterados, propriedades nas regras e integração nos encaixes.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "cost",
            piece: "metrics-panel",
            metrics: [
              { id: "mutants", label: "mutantes", value: integer(PROJECT_MUTANTS) },
              { id: "naive", label: "suíte inteira por mutante", value: `${integer(naiveHours)} h`, color: "danger" },
              { id: "covering", label: "só testes que cobrem", value: `${integer(coveringHours)} h`, color: "success" },
            ],
            highlight: "covering",
          },
        ],
      },
      alt: `Custo de mutação num projeto de brinquedo com ${integer(PROJECT_MUTANTS)} mutantes: ${integer(naiveHours)} horas rodando a suíte inteira por mutante, ${integer(coveringHours)} horas rodando só os testes que cobrem cada um.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Gerar, rodar, conferir os testes",
      tag: "summary",
      body: [
        "Use o agente para gerar muitos testes, mas a partir da spec, com limites e uma propriedade para cada regra. Depois confira os testes com mutantes: o que sobrevive vira o próximo caso que o agente escreve.",
        "Testes conferem o código; quem confere a mudança inteira, com o contexto do projeto, é a revisão. É o tema da próxima aula.",
      ],
      keyIdea: "Testes gerados valem pelo oráculo que usam e pelos mutantes que matam.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "loop",
            piece: "pipeline",
            stages: [
              { id: "spec", label: "casos da spec" },
              { id: "property", label: "propriedades" },
              { id: "run", label: "rodar" },
              { id: "mutate", label: "mutantes", color: "module-15" },
              { id: "survivors", label: "novos casos", color: "success" },
            ],
            active: "survivors",
            done: ["spec", "property", "run", "mutate"],
            repeat: { from: "run", to: "survivors", label: "até o score estabilizar" },
          },
        ],
      },
      alt: "Pipeline de testes com IA: casos da spec, propriedades, rodar, mutantes e novos casos para os sobreviventes, em destaque. Rodar, mutar e escrever novos casos se repete até o score estabilizar.",
    },
  ],
  realWorldExample:
    "O Stryker (JavaScript, C# e Scala) e o PIT (Java) são as ferramentas de mutation testing mais usadas. O Stryker classifica cada mutante como morto, sobrevivente, sem cobertura ou timeout e calcula o score como detectados / válidos. Muitas equipes rodam a mutação no CI só sobre os arquivos do pull request, e usam os sobreviventes como lista de testes que o agente deve escrever a seguir.",
  code: {
    language: "python",
    source: `from hypothesis import given, strategies as st

def desconto(total: float) -> float:
    if total >= 100:
        return min(total * 0.1, 50)
    return 0.0

@given(st.floats(min_value=0, max_value=10_000, allow_nan=False))
def test_regras_do_desconto(total: float) -> None:
    d = desconto(total)
    assert 0 <= d <= 50
    assert d <= total * 0.1 + 1e-9
    if total < 100:
        assert d == 0`,
    caption: "A propriedade da aula em Hypothesis: a biblioteca gera as entradas, procura uma que quebre alguma regra e, se achar, encolhe até o menor contraexemplo.",
  },
  tradeOffs: {
    pros: [
      "O agente gera dezenas de casos de limite em segundos a partir da spec",
      "Mutation score mostra se os testes conferem algo, não só se rodam",
      "Propriedades cobrem entradas que ninguém pensaria em escrever",
    ],
    cons: [
      "Testes gerados a partir do código herdam os bugs do código",
      "Mutação é cara e produz mutantes equivalentes que precisam de triagem",
      "Testes de integração e ponta a ponta são mais lentos e mais frágeis",
    ],
    alternatives: [
      "Testes de snapshot para saídas grandes e estáveis, com revisão humana do snapshot",
      "Revisão humana dos esperados antes de aceitar a suíte gerada",
    ],
  },
  knowledgeCheck: [
    {
      id: "oracle",
      prompt: "O agente gerou 40 testes para uma função de frete, todos verdes, com os esperados tirados da saída atual da função. O que você sabe sobre a função?",
      options: [
        "Que ela está correta",
        "Quase nada: os testes só conferem que a função faz o que já fazia",
        "Que a cobertura é baixa",
        "Que os testes são lentos",
      ],
      correct: 1,
      explanation: "Sem oráculo independente, o teste é circular. Se a função estava errada, os 40 testes cravaram o erro como esperado.",
      lesson: "15-08",
    },
    {
      id: "mutation-score",
      prompt: "Uma suíte mata 18 mutantes, 2 dão timeout, 5 sobrevivem e 3 são equivalentes. Qual o mutation score no cálculo do Stryker, sem os equivalentes?",
      options: ["72%", "80%", "64%", "90%"],
      correct: 1,
      explanation: "Detectados = mortos + timeout = 20. Válidos = detectados + sobreviventes = 25. Score = 20 / 25 = 80%.",
      lesson: "15-08",
    },
  ],
  related: ["15-07", "15-09", "16-02"],
  references: [
    { title: "Stryker: mutant states and metrics", url: "https://stryker-mutator.io/docs/mutation-testing-elements/mutant-states-and-metrics/", kind: "docs" },
    { title: "Hypothesis: property-based testing for Python", url: "https://hypothesis.readthedocs.io/en/latest/", kind: "docs" },
    { title: "Kent Beck (2023), Canon TDD", url: "https://newsletter.kentbeck.com/p/canon-tdd", kind: "article" },
  ],
};

export default lesson;
