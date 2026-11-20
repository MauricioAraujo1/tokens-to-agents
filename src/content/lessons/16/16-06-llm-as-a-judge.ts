import type { LessonContent } from "../../../types/content";

// LLM-as-a-judge com as contas no arquivo. Vinte respostas com veredito humano (aprova ou reprova) e os
// vereditos de dois juízes, com a rubrica vaga e com a rubrica detalhada, mais um segundo anotador humano
// (todos de brinquedo, declarados no texto). Para cada par: a matriz de concordância 2 × 2, a concordância
// observada p_o, a esperada ao acaso p_e e o kappa de Cohen, κ = (p_o − p_e) / (1 − p_e).

const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const percent = (value: number) => `${Math.round(value * 100)}%`;

/** [[ambos aprovam, só a referência aprova], [só o outro aprova, ambos reprovam]]. */
type Agreement = [[number, number], [number, number]];

const kappa = (table: Agreement) => {
  const [[both, onlyReference], [onlyOther, neither]] = table;
  const n = both + onlyReference + onlyOther + neither;
  const observed = (both + neither) / n;
  const referencePass = (both + onlyReference) / n;
  const otherPass = (both + onlyOther) / n;
  const expected = referencePass * otherPass + (1 - referencePass) * (1 - otherPass);
  return { n, observed, expected, kappa: (observed - expected) / (1 - expected), referencePass, otherPass };
};

const vagueJudge: Agreement = [
  [11, 1],
  [5, 3],
];
const rubricJudge: Agreement = [
  [11, 1],
  [1, 7],
];
const secondHuman: Agreement = [
  [11, 1],
  [0, 8],
];
const vague = kappa(vagueJudge);
const rubric = kappa(rubricJudge);
const humans = kappa(secondHuman);
const ANSWERS = vague.n;
const alwaysPass = kappa([
  [vague.referencePass * ANSWERS, 0],
  [(1 - vague.referencePass) * ANSWERS, 0],
]);

const lesson: LessonContent = {
  id: "16-06",
  subtitle: "Como usar um LLM para corrigir respostas abertas: rubricas, comparação aos pares, os vieses conhecidos e o kappa de Cohen para saber se o juiz concorda com as pessoas.",
  objectives: [
    "Montar um juiz LLM com uma rubrica explícita, por nota ou por comparação aos pares",
    "Medir a concordância entre juiz e pessoas com o kappa de Cohen",
    "Explicar por que concordância bruta engana quando um veredito domina",
    "Reconhecer os vieses do juiz e as mitigações de cada um",
  ],
  steps: [
    {
      id: "proofreader",
      shortTitle: "O revisor",
      title: "Contratar um revisor e conferir o revisor",
      tag: "context",
      body: [
        "Uma editora com mil textos por semana contrata revisores, mas antes dá a cada candidato textos já corrigidos pela editora-chefe e compara as correções. Só quem concorda com ela o bastante entra. E todo revisor recebe o mesmo manual de estilo, para que “bom” signifique a mesma coisa para todos.",
        "[[LLM-as-a-judge|llm-as-a-judge]] é usar um LLM como esse revisor: ele recebe a pergunta, a resposta e uma [[rubrica|rubric]], o manual com os critérios de acerto, e devolve um veredito. É o que torna possível avaliar texto livre em escala, onde as métricas da aula 16.02 falham. E, como o revisor, o juiz só vale depois de conferido contra pessoas.",
      ],
      keyIdea: "Um juiz LLM é um instrumento de medida: precisa de manual (rubrica) e de calibração (pessoas).",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "judge",
            piece: "block-diagram",
            blocks: [
              { id: "answer", kind: "answer", label: "pergunta + resposta", col: 0, row: 0 },
              { id: "rubric", kind: "documents", label: "rubrica", col: 0, row: 1 },
              { id: "llm", kind: "llm", label: "juiz", col: 1, row: 0.5 },
              { id: "verdict", kind: "eval", label: "veredito", col: 2, row: 0.5 },
              { id: "human", kind: "user", label: "amostra humana", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "answer", to: "llm" },
              { from: "rubric", to: "llm", label: "critérios" },
              { from: "llm", to: "verdict" },
              { from: "human", to: "verdict", label: "concorda?", variant: "alternative" },
            ],
            active: "llm",
          },
        ],
      },
      alt: "A pergunta com a resposta e a rubrica entram no juiz, em destaque, que dá um veredito; uma amostra corrigida por pessoas confere se o veredito concorda com elas.",
    },
    {
      id: "modes",
      shortTitle: "Dois modos",
      title: "Dar nota ou escolher a melhor",
      tag: "mechanism",
      body: [
        "O juiz trabalha de dois jeitos. Por nota, ele lê uma resposta e dá um veredito absoluto: aprova ou reprova, ou uma nota de 1 a 5. Serve para monitorar a qualidade ao longo do tempo. Na [[comparação aos pares|pairwise-comparison]], ele lê duas respostas para a mesma pergunta e escolhe a melhor ou empate, e a contagem vira um [[win rate|win-rate]], como na aula 11.13.",
        "Comparar é mais fácil que dar nota absoluta, para pessoas e para modelos: o juiz não precisa saber o que é um “4”, só qual das duas é melhor. No MT-Bench, Zheng et al. (2023) mediram que um juiz GPT-4 concordou com especialistas humanos em mais de 80% dos casos, o mesmo nível de concordância entre dois humanos. Mas 80% de concordância bruta pode esconder um juiz ruim, como mostra o próximo passo.",
      ],
      keyIdea: "Nota absoluta monitora uma versão; comparação aos pares decide entre duas.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "modes",
            piece: "block-diagram",
            blocks: [
              { id: "one", kind: "answer", label: "uma resposta", col: 0, row: 0 },
              { id: "pair", kind: "context", label: "respostas a e b", col: 0, row: 1 },
              { id: "point", kind: "llm", label: "juiz por nota", col: 1, row: 0 },
              { id: "versus", kind: "llm", label: "juiz aos pares", col: 1, row: 1 },
              { id: "score", kind: "eval", label: "aprova / 1 a 5", col: 2, row: 0 },
              { id: "win", kind: "eval", label: "a, b ou empate", col: 2, row: 1 },
            ],
            edges: [
              { from: "one", to: "point" },
              { from: "pair", to: "versus" },
              { from: "point", to: "score" },
              { from: "versus", to: "win", label: "win rate" },
            ],
            active: "versus",
          },
        ],
      },
      alt: "Dois modos de juiz: uma resposta vai para o juiz por nota, que aprova ou dá de 1 a 5; as respostas a e b vão para o juiz aos pares, em destaque, que escolhe a, b ou empate e alimenta o win rate.",
    },
    {
      id: "kappa",
      shortTitle: "Kappa",
      title: "Concordar por acaso não conta",
      tag: "mechanism",
      body: [
        `Uma pessoa e o juiz com uma rubrica vaga (“a resposta é boa?”) julgaram as mesmas ${ANSWERS} respostas (dados de brinquedo). Eles concordam em ${percent(vague.observed)} dos casos. Parece bom, até notar que o juiz aprova ${percent(vague.otherPass)} de tudo. Um juiz que aprovasse todas as respostas teria ${percent(alwaysPass.observed)} de concordância sem ler nada.`,
        `O [[kappa de Cohen|cohens-kappa]] desconta a concordância esperada ao acaso: p_e = ${fixed(vague.referencePass)} × ${fixed(vague.otherPass)} + ${fixed(1 - vague.referencePass)} × ${fixed(1 - vague.otherPass)} = ${fixed(vague.expected)}, e κ = (${fixed(vague.observed)} − ${fixed(vague.expected)}) / (1 − ${fixed(vague.expected)}) = ${fixed(vague.kappa)}. Zero é acaso puro, 1 é concordância perfeita. A mesma conta entre duas pessoas mede a [[concordância entre anotadores|inter-annotator-agreement]], o teto realista para qualquer juiz.`,
      ],
      keyIdea: "κ = (p_o − p_e) / (1 − p_e): concordância acima do que o acaso daria.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "kappa",
            piece: "metrics-panel",
            metrics: [
              { id: "po", label: "concordância p_o", value: percent(vague.observed) },
              { id: "pe", label: "por acaso p_e", value: percent(vague.expected) },
              { id: "k", label: "kappa", value: fixed(vague.kappa), color: "danger" },
            ],
            highlight: "k",
          },
          {
            id: "table",
            piece: "matrix",
            rows: ["pessoa aprova", "pessoa reprova"],
            cols: ["juiz aprova", "juiz reprova"],
            values: [
              [vagueJudge[0][0], vagueJudge[0][1]],
              [vagueJudge[1][0], vagueJudge[1][1]],
            ],
            highlight: { row: 1, col: 0 },
            showValues: true,
            color: "module-16",
          },
        ],
      },
      alt: `Matriz pessoa × juiz com rubrica vaga: ambos aprovam ${vagueJudge[0][0]}, só a pessoa aprova ${vagueJudge[0][1]}, só o juiz aprova ${vagueJudge[1][0]}, ambos reprovam ${vagueJudge[1][1]}. Concordância ${percent(vague.observed)}, por acaso ${percent(vague.expected)}, kappa ${fixed(vague.kappa)}.`,
    },
    {
      id: "rubric",
      shortTitle: "Rubrica",
      title: "Uma rubrica melhor muda o juiz",
      tag: "example",
      body: [
        "A rubrica nova troca “a resposta é boa?” por checagens binárias: cita o prazo da política? recusa o que está fora do escopo? não inventa valores? Pede ao juiz que escreva o raciocínio antes do veredito, como no G-Eval (Liu et al., 2023), e traz dois exemplos já julgados de cada lado. Critério vago vira critério verificável.",
        `Com as mesmas ${ANSWERS} respostas, o kappa sobe de ${fixed(vague.kappa)} para ${fixed(rubric.kappa)}. Entre duas pessoas com a mesma rubrica, ele fica em ${fixed(humans.kappa)}: esse é o teto. O processo é iterativo, como mostraram Shankar et al. (2024): ler as discordâncias, ajustar a rubrica, medir de novo. Muitas vezes são as próprias discordâncias que revelam que o critério não estava claro nem para as pessoas.`,
      ],
      keyIdea: "Rubrica com checagens binárias, raciocínio antes do veredito e exemplos: meça o kappa a cada versão.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "kappas",
            piece: "chart",
            kind: "bar",
            series: [
              { label: "juiz, rubrica vaga", value: Number(vague.kappa.toFixed(2)) },
              { label: "juiz, rubrica nova", value: Number(rubric.kappa.toFixed(2)) },
              { label: "pessoa × pessoa", value: Number(humans.kappa.toFixed(2)) },
            ],
            max: 1,
            highlight: 1,
            color: "module-16",
          },
        ],
      },
      alt: `Kappa de Cohen contra a pessoa de referência: juiz com rubrica vaga ${fixed(vague.kappa)}, juiz com rubrica nova ${fixed(rubric.kappa)}, segunda pessoa ${fixed(humans.kappa)}.`,
    },
    {
      id: "biases",
      shortTitle: "Vieses",
      title: "Os vieses conhecidos do juiz",
      tag: "tradeoff",
      body: [
        "Além de errar, o juiz erra de jeitos previsíveis, os [[vieses do juiz|judge-bias]]. Zheng et al. (2023) descreveram três. O [[viés de posição|position-bias]]: preferir a resposta que aparece primeiro (ou segunda), mesmo trocando o conteúdo. O viés de verbosidade: preferir a resposta mais longa. O viés de autopromoção: preferir respostas do próprio modelo ou da mesma família.",
        "Cada um tem uma mitigação barata: julgar nas duas ordens e contar como empate o que muda; pedir na rubrica que o tamanho não conte, ou comparar respostas de tamanho parecido; esconder o nome dos modelos e usar um juiz de outra família. Nenhuma zera o viés, e todas custam chamadas a mais. Por isso o kappa contra pessoas é medido de novo sempre que a rubrica, o modelo juiz ou o tipo de resposta mudam.",
      ],
      keyIdea: "Posição, tamanho e autopromoção: troque a ordem, controle o tamanho e use um juiz de outra família.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "biases",
            piece: "metrics-panel",
            metrics: [
              { id: "position", label: "viés de posição", value: "julgar nas duas ordens", color: "danger" },
              { id: "verbosity", label: "viés de verbosidade", value: "controlar o tamanho" },
              { id: "self", label: "viés de autopromoção", value: "juiz de outra família" },
              { id: "drift", label: "troca de juiz", value: "medir o kappa de novo", color: "module-16" },
            ],
            highlight: "position",
          },
        ],
      },
      alt: "Os vieses do juiz e as mitigações: viés de posição, julgar nas duas ordens; viés de verbosidade, controlar o tamanho; viés de autopromoção, juiz de outra família; ao trocar o juiz, medir o kappa de novo.",
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Um juiz que merece confiança",
      tag: "summary",
      body: [
        "Um juiz LLM útil tem rubrica com critérios verificáveis, escreve o raciocínio antes do veredito, julga aos pares quando a decisão é entre duas versões, troca a ordem das respostas e foi conferido contra uma amostra humana com o kappa, não com a concordância bruta.",
        "Juízes e métricas formam a régua de uma equipe. A próxima aula olha as réguas públicas, os benchmarks e leaderboards, e o que elas dizem ou não dizem sobre um modelo.",
      ],
      keyIdea: "Sem kappa contra pessoas, a nota do juiz é só uma opinião automatizada.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "chips",
            piece: "pipeline",
            display: "chips",
            stages: [
              { id: "rubric", label: "rubrica verificável" },
              { id: "reasoning", label: "raciocínio antes do veredito" },
              { id: "pairs", label: "aos pares, duas ordens" },
              { id: "human", label: "amostra humana" },
              { id: "kappa", label: "kappa de Cohen", color: "module-16" },
              { id: "iterate", label: "ajustar e medir de novo", color: "brand" },
            ],
          },
        ],
      },
      alt: "Fluxo em chips: rubrica verificável, raciocínio antes do veredito, comparação aos pares nas duas ordens, amostra humana, kappa de Cohen e ajustar e medir de novo.",
    },
  ],
  realWorldExample:
    "O MT-Bench (Zheng et al., 2023) tem 80 perguntas abertas de dois turnos, corrigidas por um juiz GPT-4, e foi validado contra milhares de votos de especialistas e de usuários do Chatbot Arena. O mesmo artigo documentou os vieses de posição, verbosidade e autopromoção e propôs as mitigações usadas até hoje, como julgar nas duas ordens. Bibliotecas de avaliação, como o OpenAI Evals e o Ragas, trazem juízes prontos com esse desenho.",
  code: {
    language: "python",
    source: `def cohens_kappa(a: list[bool], b: list[bool]) -> float:
    n = len(a)
    observed = sum(x == y for x, y in zip(a, b)) / n
    pa, pb = sum(a) / n, sum(b) / n
    expected = pa * pb + (1 - pa) * (1 - pb)
    return (observed - expected) / (1 - expected)

human = [True] * 12 + [False] * 8
judge = [True] * 11 + [False] + [True] * 5 + [False] * 3
print(round(cohens_kappa(human, judge), 2))  # 0.32`,
    caption: "O kappa de Cohen do juiz com rubrica vaga: 70% de concordância bruta, mas só 0,32 depois de descontar o acaso.",
  },
  tradeOffs: {
    pros: [
      "Avalia texto livre em escala, onde métricas de palavras falham",
      "A rubrica deixa o critério escrito, revisável e versionado",
      "Comparação aos pares é robusta para decidir entre duas versões",
    ],
    cons: [
      "Vieses de posição, verbosidade e autopromoção entram direto na nota",
      "Cada veredito é uma chamada de LLM, com custo e latência",
      "Precisa de uma amostra humana para calibrar, e de nova calibração a cada troca de juiz",
    ],
    alternatives: [
      "Revisão humana, quando o volume é pequeno ou o risco é alto",
      "Juízes menores treinados para a tarefa, como no ARES, quando há dados rotulados",
    ],
  },
  knowledgeCheck: [
    {
      id: "raw-agreement",
      prompt: "Num conjunto em que 90% das respostas são boas, um juiz concorda com as pessoas em 90% dos casos. O que é preciso verificar antes de confiar nele?",
      options: [
        "Nada: 90% é excelente",
        "O kappa: um juiz que aprova tudo também teria 90% de concordância, com kappa zero",
        "Se o juiz é o maior modelo disponível",
        "Se a temperatura do juiz é zero",
      ],
      correct: 1,
      explanation: "Com 90% de respostas boas, aprovar tudo já concorda 90% das vezes. O kappa desconta essa concordância por acaso e mostra se o juiz distingue as respostas ruins.",
      lesson: "16-06",
    },
    {
      id: "position",
      prompt: "Ao comparar o modelo A com o B, o juiz prefere a resposta que aparece primeiro em 70% dos pares, seja qual for o modelo. Qual mitigação aplicar?",
      options: [
        "Pôr sempre o modelo novo em primeiro",
        "Julgar cada par nas duas ordens e contar como empate quando o veredito muda",
        "Pedir respostas mais curtas",
        "Trocar a rubrica por uma nota de 1 a 10",
      ],
      correct: 1,
      explanation: "É viés de posição. Julgar nas duas ordens anula a vantagem da posição: só conta como vitória o veredito que se mantém com a ordem trocada.",
      lesson: "16-06",
    },
  ],
  related: ["11-13", "16-05", "16-07"],
  references: [
    { title: "Zheng et al. (2023), Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena", url: "https://arxiv.org/abs/2306.05685", kind: "paper" },
    { title: "Liu et al. (2023), G-Eval: NLG Evaluation using GPT-4 with Better Human Alignment", url: "https://arxiv.org/abs/2303.16634", kind: "paper" },
    { title: "Shankar et al. (2024), Who Validates the Validators? Aligning LLM-Assisted Evaluation of LLM Outputs with Human Preferences", url: "https://arxiv.org/abs/2404.12272", kind: "paper" },
  ],
};

export default lesson;
