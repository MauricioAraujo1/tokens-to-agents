import type { BlockDiagramSpec } from "../../../scene/types";
import type { LessonContent } from "../../../types/content";

// Dados sintéticos com as contas no arquivo. O filtro do Self-Instruct (Wang et al., 2022) só aceita uma instrução
// nova se o ROUGE-L dela com todas as do pool for menor que 0,7; aqui o ROUGE-L é calculado pela maior subsequência
// comum de palavras. As respostas do professor para 5 contas são de brinquedo, e o verificador refaz cada conta.
// O colapso usa um fato exato: a variância estimada por máxima verossimilhança com n amostras tem valor esperado
// (n − 1) / n · σ², então, treinando cada geração só com amostras da anterior, a variância esperada cai como ((n − 1) / n)^g.

const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const percent = (value: number) => `${Math.round(value * 100)}%`;

const words = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .split(/\s+/)
    .filter((word) => word !== "");

const lcs = (a: string[], b: string[]) => {
  const table = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      table[i][j] = a[i - 1] === b[j - 1] ? table[i - 1][j - 1] + 1 : Math.max(table[i - 1][j], table[i][j - 1]);
    }
  }
  return table[a.length][b.length];
};
const rougeL = (candidate: string, reference: string) => {
  const a = words(candidate);
  const b = words(reference);
  const common = lcs(a, b);
  if (common === 0) return 0;
  const precision = common / a.length;
  const recall = common / b.length;
  return (2 * precision * recall) / (precision + recall);
};

const SEED_TASKS_PAPER = 175;
const ROUGE_LIMIT = 0.7;
const pool = [
  "Escreva um e-mail pedindo desculpas pelo atraso na entrega.",
  "Resuma o texto a seguir em três frases.",
  "Classifique o sentimento da avaliação como positivo ou negativo.",
];
const candidates = [
  { label: "e-mail atraso", text: "Escreva um e-mail pedindo desculpas pelo atraso no pedido." },
  { label: "perguntas frete", text: "Liste três perguntas que um cliente faria sobre o frete." },
  { label: "resumo 2 frases", text: "Resuma o texto a seguir em duas frases." },
  { label: "traduzir formal", text: "Traduza a frase para o inglês mantendo o tom formal." },
  { label: "sentimento msg", text: "Classifique o sentimento da mensagem como positivo ou negativo." },
  { label: "tabela planos", text: "Crie uma tabela comparando dois planos de assinatura." },
];
const scored = candidates.map((candidate) => {
  const rouge = Math.max(...pool.map((reference) => rougeL(candidate.text, reference)));
  return { ...candidate, rouge, novelty: 1 - rouge, accepted: rouge < ROUGE_LIMIT };
});
const accepted = scored.filter((candidate) => candidate.accepted);
const rejected = scored.filter((candidate) => !candidate.accepted);
const closest = [...scored].sort((a, b) => b.rouge - a.rouge)[0];

// Rejection sampling: 4 respostas do professor por conta; o verificador refaz a conta.
const problems = [
  { prompt: "17 × 23", truth: 17 * 23, answers: [391, 391, 381, 391] },
  { prompt: "48 + 76", truth: 48 + 76, answers: [124, 124, 124, 114] },
  { prompt: "144 ÷ 12", truth: 144 / 12, answers: [12, 14, 12, 12] },
  { prompt: "15% de 80", truth: 0.15 * 80, answers: [12, 1.2, 12, 10] },
  { prompt: "2¹⁰", truth: 2 ** 10, answers: [1024, 1000, 1024, 1024] },
];
const SAMPLES = problems[0].answers.length;
const generated = problems.length * SAMPLES;
const correct = problems.reduce((sum, problem) => sum + problem.answers.filter((answer) => Math.abs(answer - problem.truth) < 1e-9).length, 0);
const acceptance = correct / generated;
const coveredProblems = problems.filter((problem) => problem.answers.some((answer) => Math.abs(answer - problem.truth) < 1e-9)).length;

// Colapso: variância esperada geração a geração.
const SAMPLES_PER_GENERATION = 10;
const GENERATIONS = 10;
const variances = Array.from({ length: GENERATIONS + 1 }, (_, generation) => ((SAMPLES_PER_GENERATION - 1) / SAMPLES_PER_GENERATION) ** generation);
const finalVariance = variances[GENERATIONS];

const flow = (active: string, done?: string[]): BlockDiagramSpec => ({
  id: "flow",
  piece: "block-diagram",
  blocks: [
    { id: "seeds", kind: "documents", label: "sementes humanas", col: 0, row: 0 },
    { id: "teacher", kind: "llm", label: "modelo professor", col: 1, row: 0 },
    { id: "filter", kind: "eval", label: "filtros", col: 2, row: 0 },
    { id: "student", kind: "llm", label: "modelo aluno", col: 3, row: 0 },
    { id: "dropped", kind: "no-result", label: "repetidas, erradas", col: 2, row: 1 },
  ],
  edges: [
    { from: "seeds", to: "teacher", label: "exemplos" },
    { from: "teacher", to: "filter", label: "candidatos" },
    { from: "filter", to: "student", label: "aprovados" },
    { from: "filter", to: "dropped", variant: "alternative" },
  ],
  active,
  ...(done ? { done } : {}),
});

const lesson: LessonContent = {
  id: "11-06",
  subtitle: "Usar um modelo para escrever exemplos de treino: o laço do Self-Instruct, o filtro de novidade, a verificação das respostas e o risco de colapso.",
  objectives: [
    "Descrever o laço do Self-Instruct, das sementes ao pool de instruções",
    "Calcular o ROUGE-L que filtra instruções repetidas",
    "Usar rejection sampling com um verificador para manter só respostas corretas",
    "Explicar por que treinar só com dados gerados reduz a diversidade",
  ],
  steps: [
    {
      id: "teacher",
      shortTitle: "Professor",
      title: "Um professor escrevendo exercícios",
      tag: "context",
      body: [
        "Um professor experiente escreve uma lista de exercícios para a turma: parte de alguns exemplos clássicos, inventa variações, joga fora as repetidas e confere o gabarito antes de entregar. A turma aprende com exercícios que ninguém tinha escrito antes.",
        "[[Dados sintéticos|synthetic-data]] seguem a mesma ideia. Um modelo grande, o professor, gera exemplos a partir de poucas sementes escritas por pessoas; filtros tiram os repetidos e os errados; um modelo menor, o aluno, é ajustado com o resultado. É um parente da [[destilação|knowledge-distillation]]: o aluno imita as respostas do professor.",
      ],
      keyIdea: "Dados sintéticos multiplicam poucas sementes humanas em muitos exemplos, desde que passem por filtros.",
      scene: { kind: "pieces", layout: "single", pieces: [flow("teacher")] },
      alt: "Sementes humanas vão para o modelo professor, em destaque, que gera candidatos; os filtros aprovam alguns para o modelo aluno e descartam, tracejado, os repetidos e errados.",
    },
    {
      id: "loop",
      shortTitle: "Self-Instruct",
      title: "O laço do Self-Instruct",
      tag: "mechanism",
      body: [
        `O [[Self-Instruct|self-instruct]] começou com ${SEED_TASKS_PAPER} tarefas escritas por pessoas. A cada volta, sorteia algumas do pool, pede ao modelo uma instrução nova no mesmo estilo, filtra, pede a resposta e devolve a tarefa aprovada ao pool. Com o tempo, o pool cresce e as instruções novas se inspiram nas geradas antes.`,
        "O paper gerou cerca de 52 mil instruções assim, e o Stanford Alpaca usou um laço parecido para criar 52 mil exemplos e ajustar o LLaMA 7B. O ponto fraco está no próprio laço: sem filtro, o modelo repete as mesmas tarefas com palavras trocadas.",
      ],
      keyIdea: "Sorteia sementes, gera, filtra, responde e devolve ao pool: o dataset cresce a cada volta.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "loop",
            piece: "agent-loop",
            phases: [
              { id: "sample", label: "sortear sementes" },
              { id: "generate", label: "gerar instrução" },
              { id: "filter", label: "filtrar (ROUGE-L)" },
              { id: "answer", label: "gerar resposta" },
              { id: "add", label: "voltar ao pool" },
            ],
            active: "filter",
            iteration: 1,
          },
        ],
      },
      alt: "Laço do Self-Instruct: sortear sementes, gerar instrução, filtrar por ROUGE-L, em destaque, gerar resposta e voltar ao pool. Primeira iteração.",
    },
    {
      id: "novelty",
      shortTitle: "Novidade",
      title: "Filtro de novidade com ROUGE-L",
      tag: "mechanism",
      body: [
        `O [[ROUGE-L|rouge-l]] mede a sobreposição pela maior subsequência de palavras em comum, de 0 a 1. O Self-Instruct só aceita uma instrução se o ROUGE-L dela com todas do pool ficar abaixo de ${fixed(ROUGE_LIMIT, 1)}. Na cena, a barra é a novidade, 1 − ROUGE-L: passar de ${fixed(1 - ROUGE_LIMIT, 1)} é o mesmo que ficar abaixo do limite.`,
        `Dos ${candidates.length} candidatos, ${accepted.length} passam e ${rejected.length} caem. O mais parecido é “${closest.text}”, com ROUGE-L ${fixed(closest.rouge)}: trocar uma palavra de uma semente não ensina nada novo. O filtro é barato e não entende significado: duas instruções com palavras diferentes e a mesma tarefa passam. Um filtro por embeddings pega parte desses casos.`,
      ],
      keyIdea: "Sem filtro de novidade, o gerador repete as sementes com outras palavras.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "novelty",
            piece: "chart",
            kind: "bar",
            series: scored.map((candidate) => ({ label: candidate.label, value: Number(candidate.novelty.toFixed(2)) })),
            max: 1,
            cutoff: { mode: "threshold", value: Number((1 - ROUGE_LIMIT).toFixed(2)), label: "novidade mínima" },
            color: "module-11",
          },
        ],
      },
      alt: `Novidade de cada instrução candidata, 1 − ROUGE-L: ${scored.map((candidate) => `${candidate.label} ${fixed(candidate.novelty)}`).join(", ")}. As que passam de ${fixed(1 - ROUGE_LIMIT, 1)} ficam no pool.`,
    },
    {
      id: "verify",
      shortTitle: "Verificar",
      title: "Gerar várias, guardar as certas",
      tag: "example",
      body: [
        `O professor também erra a resposta. Quando existe um jeito automático de conferir, como refazer a conta, rodar testes de código ou validar um JSON, dá para gerar várias respostas e guardar só as aprovadas: [[rejection sampling|rejection-sampling]]. Nas ${problems.length} contas do exemplo, com ${SAMPLES} respostas cada, ${correct} das ${generated} batem com o verificador, ${percent(acceptance)}.`,
        `Todas as ${coveredProblems} contas ficam com pelo menos uma resposta certa, e as erradas nunca chegam ao aluno. Sem verificador automático, a alternativa é um modelo juiz dando nota, que também erra, ou uma revisão humana por amostragem. O Llama 2 usou rejection sampling no ajuste: várias respostas por prompt, e a melhor segundo o modelo de recompensa entrava no treino.`,
      ],
      keyIdea: "Onde dá para verificar, gere várias respostas e guarde só as que passam.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "acceptance",
            piece: "metrics-panel",
            metrics: [
              { id: "generated", label: "respostas geradas", value: `${generated}` },
              { id: "correct", label: "aprovadas pelo verificador", value: `${correct}`, color: "success" },
              { id: "rate", label: "taxa de aceite", value: percent(acceptance), color: "module-11" },
            ],
            highlight: "rate",
          },
          {
            id: "verify",
            piece: "block-diagram",
            blocks: [
              { id: "teacher", kind: "llm", label: "professor", col: 0, row: 0.5 },
              { id: "samples", kind: "answer", label: `${SAMPLES} respostas`, col: 1, row: 0.5 },
              { id: "checker", kind: "tool", label: "refaz a conta", col: 2, row: 0.5 },
              { id: "keep", kind: "documents", label: "dataset", col: 3, row: 0 },
              { id: "drop", kind: "no-result", label: "erradas", col: 3, row: 1 },
            ],
            edges: [
              { from: "teacher", to: "samples" },
              { from: "samples", to: "checker" },
              { from: "checker", to: "keep", label: "certa" },
              { from: "checker", to: "drop", label: "errada", variant: "alternative" },
            ],
            active: "checker",
          },
        ],
      },
      alt: `O professor gera ${SAMPLES} respostas por conta; um verificador, em destaque, refaz a conta, manda as certas para o dataset e descarta as erradas. ${correct} de ${generated} passam, ${percent(acceptance)}.`,
    },
    {
      id: "collapse",
      shortTitle: "Colapso",
      title: "Cópia da cópia perde as bordas",
      tag: "tradeoff",
      body: [
        `Uma conta exata mostra o risco. Se cada geração estima a variância dos dados com ${SAMPLES_PER_GENERATION} amostras da geração anterior, o valor esperado encolhe pelo fator (n − 1) / n a cada volta. Depois de ${GENERATIONS} gerações, sobra ${percent(finalVariance)} da variância original: os casos raros, nas bordas da distribuição, são os primeiros a sumir.`,
        "Esse é o [[colapso de modelo|model-collapse]]: treinar só com saídas de modelos, geração após geração, estreita o que o modelo sabe dizer. A defesa é manter dados humanos na mistura, filtrar por diversidade e não só por qualidade, e registrar de onde veio cada exemplo. Confira também os termos de uso do modelo professor: alguns provedores proíbem usar as saídas para treinar modelos concorrentes.",
      ],
      keyIdea: "Dados sintéticos complementam dados reais; trocá-los por completo estreita a distribuição.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "variance",
            piece: "chart",
            kind: "line",
            series: variances.map((value, generation) => ({ label: `g${generation}`, value: Number(value.toFixed(3)) })),
            max: 1,
            highlight: GENERATIONS,
            color: "danger",
          },
        ],
      },
      alt: `Variância esperada a cada geração treinada com dados da anterior, com ${SAMPLES_PER_GENERATION} amostras: começa em 1 e cai até ${fixed(finalVariance, 3)} na geração ${GENERATIONS}.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Gerar, filtrar, verificar, misturar",
      tag: "summary",
      body: [
        "Parta de sementes humanas, gere com um modelo professor, filtre repetidos por ROUGE-L ou embeddings, verifique as respostas sempre que houver como, e misture o resultado com dados reais. Guarde a origem de cada exemplo para medir o efeito de cada fonte.",
        "Com o dataset pronto, a próxima aula entra no treino em si: o fine-tuning supervisionado, token a token.",
      ],
      keyIdea: "Sementes humanas + gerador + filtros + verificador + dados reais na mistura.",
      scene: { kind: "pieces", layout: "single", pieces: [flow("student", ["seeds", "teacher", "filter"])] },
      alt: "O mesmo fluxo com sementes, professor e filtros concluídos e o modelo aluno em destaque.",
    },
  ],
  realWorldExample:
    "O Stanford Alpaca gerou 52 mil exemplos de instrução com o text-davinci-003, a partir das 175 sementes do Self-Instruct, e ajustou o LLaMA 7B com eles. O repositório publica o código de geração, os dados e os avisos de licença: os dados vieram de um modelo cujos termos restringem o uso comercial.",
  tradeOffs: {
    pros: [
      "Multiplica poucas sementes em milhares de exemplos rapidamente",
      "Cobre intenções raras que os dados reais quase não têm",
      "Com verificador automático, as respostas erradas não entram",
    ],
    cons: [
      "Herda os erros e vieses do modelo professor",
      "Tende a repetir padrões e perder diversidade",
      "Pode violar os termos de uso do modelo que gerou os dados",
    ],
    alternatives: ["Escrever exemplos com especialistas", "Usar logs reais com revisão humana"],
  },
  knowledgeCheck: [
    {
      id: "low-diversity",
      prompt: "Você gerou 10 mil instruções sintéticas e percebe que metade são variações de “resuma o texto”. Qual etapa faltou ou falhou?",
      options: [
        "O verificador de respostas",
        "O filtro de novidade, que descarta instruções muito parecidas com as que já estão no pool",
        "A temperatura do aluno",
        "A divisão entre treino e teste",
      ],
      correct: 1,
      explanation: "Sem o filtro de novidade (ROUGE-L, embeddings), o gerador repete as tarefas que vê nas sementes. O verificador confere respostas, não diversidade.",
      lesson: "11-06",
    },
    {
      id: "sql-verifier",
      prompt: "Você quer gerar pares de pergunta e consulta SQL para ajustar um modelo. Como garantir que as consultas geradas estão certas?",
      options: [
        "Confiar no modelo professor, porque ele é maior",
        "Gerar várias consultas por pergunta, executá-las num banco de teste e guardar só as que devolvem o resultado esperado",
        "Usar só as consultas mais curtas",
        "Pedir ao professor que diga se acertou",
      ],
      correct: 1,
      explanation: "SQL dá para executar: é um verificador automático. Rejection sampling com execução mantém só as consultas que funcionam.",
      lesson: "11-06",
    },
  ],
  related: ["04-07", "11-05", "11-07"],
  references: [
    { title: "Wang et al. (2022), Self-Instruct: Aligning Language Models with Self-Generated Instructions", url: "https://arxiv.org/abs/2212.10560", kind: "paper" },
    { title: "Stanford Alpaca (repositório)", url: "https://github.com/tatsu-lab/stanford_alpaca", kind: "repo" },
    { title: "Shumailov et al. (2023), The Curse of Recursion: Training on Generated Data Makes Models Forget", url: "https://arxiv.org/abs/2305.17493", kind: "paper" },
  ],
};

export default lesson;
