import type { LessonContent } from "../../../types/content";

// Limpeza de um dataset de brinquedo com 10 respostas de suporte, calculada aqui: normalização (minúsculas, sem
// pontuação, espaços únicos), duplicatas exatas pelo texto normalizado, quase duplicatas pela similaridade de
// Jaccard entre conjuntos de bigramas de palavras (limiar 0,6), filtro de respostas curtas (menos de 3 palavras)
// e contaminação por 5-gramas em comum com o conjunto de teste. O GPT-3 usou 13-gramas na análise de
// contaminação (Brown et al., 2020); aqui o n é menor porque as frases são curtas.

const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });

const raw = [
  "Para trocar a senha, acesse Configurações e clique em Segurança.",
  "para trocar a senha, acesse configurações e clique em segurança",
  "Para trocar a senha, abra Configurações e clique em Segurança.",
  "O prazo de entrega é de 5 dias úteis para todo o Brasil.",
  "O prazo de entrega é de 5 dias úteis para todo o país.",
  "Você pode cancelar o pedido em até 7 dias após a compra.",
  "ok",
  "O reembolso cai em até 10 dias no cartão de crédito.",
  "Para trocar a senha, acesse Configurações e clique em Segurança!!",
  "Obrigado!",
];
const testSet = [
  "Você pode cancelar o pedido em até 7 dias após a compra?",
  "Qual é o prazo para trocar um produto com defeito?",
];

const words = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .split(/\s+/)
    .filter((word) => word !== "");
const normalize = (text: string) => words(text).join(" ");

const ngrams = (text: string, n: number) => {
  const tokens = words(text);
  const grams = new Set<string>();
  for (let index = 0; index + n <= tokens.length; index += 1) grams.add(tokens.slice(index, index + n).join(" "));
  return grams;
};
const jaccard = (a: string, b: string) => {
  const left = ngrams(a, 2);
  const right = ngrams(b, 2);
  const shared = [...left].filter((gram) => right.has(gram)).length;
  const union = new Set([...left, ...right]).size;
  return union === 0 ? 0 : shared / union;
};

// 1. Duplicatas exatas.
const seen = new Set<string>();
const unique = raw.filter((text) => {
  const key = normalize(text);
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});
const exactRemoved = raw.length - unique.length;

// 2. Quase duplicatas: mantém o primeiro de cada grupo.
const NEAR_THRESHOLD = 0.6;
const kept: string[] = [];
const nearPairs: Array<{ dropped: string; similarity: number }> = [];
for (const text of unique) {
  const match = kept.map((other) => jaccard(text, other)).find((similarity) => similarity >= NEAR_THRESHOLD);
  if (match === undefined) kept.push(text);
  else nearPairs.push({ dropped: text, similarity: match });
}

// 3. Filtro de qualidade simples.
const MIN_WORDS = 3;
const filtered = kept.filter((text) => words(text).length >= MIN_WORDS);
const shortRemoved = kept.length - filtered.length;

// 4. Contaminação com o teste.
const CONTAMINATION_N = 5;
const testGrams = new Set(testSet.flatMap((text) => [...ngrams(text, CONTAMINATION_N)]));
const contaminated = filtered.filter((text) => [...ngrams(text, CONTAMINATION_N)].some((gram) => testGrams.has(gram)));
const clean = filtered.filter((text) => !contaminated.includes(text));

const funnel = [
  { label: "bruto", value: raw.length },
  { label: "sem exatas", value: unique.length },
  { label: "sem quase", value: kept.length },
  { label: "filtrado", value: filtered.length },
  { label: "sem teste", value: clean.length },
];

// Matriz de Jaccard entre 5 respostas (as duas da senha, as duas do prazo e a do cancelamento).
const matrixItems = [
  { label: "senha (acesse)", text: raw[0] },
  { label: "senha (abra)", text: raw[2] },
  { label: "prazo (Brasil)", text: raw[3] },
  { label: "prazo (país)", text: raw[4] },
  { label: "cancelar", text: raw[5] },
];
const similarity = matrixItems.map((row) => matrixItems.map((col) => Number(jaccard(row.text, col.text).toFixed(2))));
const passwordSimilarity = jaccard(raw[0], raw[2]);
const deadlineSimilarity = jaccard(raw[3], raw[4]);
const normalizedFirst = words(raw[0]);

const lesson: LessonContent = {
  id: "11-05",
  subtitle: "Duplicatas exatas, quase duplicatas, exemplos ruins e contaminação com o teste: como peneirar o dataset antes do treino, com as contas.",
  objectives: [
    "Remover duplicatas exatas com normalização e hash",
    "Calcular a similaridade de Jaccard para achar quase duplicatas",
    "Detectar contaminação entre treino e teste por n-gramas",
    "Explicar por que menos exemplos melhores costumam vencer mais exemplos ruins",
  ],
  steps: [
    {
      id: "sieve",
      shortTitle: "Peneira",
      title: "Garimpo: muita areia, pouco ouro",
      tag: "context",
      body: [
        "O garimpeiro não leva a areia toda para casa: passa pela peneira, descarta pedra e lama e fica com o que brilha. Um dataset bruto de suporte é parecido: respostas copiadas cem vezes, “ok” e “obrigado” soltos, respostas erradas e, às vezes, perguntas que também estão na prova.",
        "Cada sujeira tem um efeito. Repetição faz o modelo decorar e dá peso demais a um caso. Lixo ensina respostas vazias. Exemplos do teste no treino inflam a nota. A limpeza é uma sequência de filtros, cada um com uma conta simples, aplicados antes de gastar GPU.",
      ],
      keyIdea: "Limpar é retirar o que ensina errado antes que o modelo aprenda.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "raw", kind: "documents", label: `bruto: ${raw.length}`, col: 0, row: 0 },
              { id: "filters", kind: "guardrail", label: "filtros", col: 1, row: 0 },
              { id: "clean", kind: "documents", label: `limpo: ${clean.length}`, col: 2, row: 0 },
              { id: "train", kind: "llm", label: "ajuste", col: 3, row: 0 },
              { id: "dropped", kind: "no-result", label: "descartados", col: 1, row: 1 },
            ],
            edges: [
              { from: "raw", to: "filters" },
              { from: "filters", to: "clean" },
              { from: "filters", to: "dropped", label: `${raw.length - clean.length} fora`, variant: "alternative" },
              { from: "clean", to: "train" },
            ],
            active: "filters",
          },
        ],
      },
      alt: `${raw.length} respostas brutas passam pelos filtros, em destaque: ${clean.length} seguem limpas para o ajuste e ${raw.length - clean.length} vão, pelo caminho tracejado, para os descartados.`,
    },
    {
      id: "exact",
      shortTitle: "Exatas",
      title: "Duplicatas exatas: normalize e compare",
      tag: "mechanism",
      body: [
        "“Para trocar a senha, acesse Configurações…” aparece três vezes: uma com ponto, uma em minúsculas sem ponto e uma com dois pontos de exclamação. Para o computador, são três textos diferentes. Normalizar (minúsculas, sem pontuação, espaços únicos) deixa os três iguais, como a sequência de palavras da cena.",
        `Depois, a [[deduplicação|deduplication]] exata é guardar um [[hash do conteúdo|content-hash]] de cada texto normalizado e descartar os repetidos, em tempo linear. No exemplo, ${raw.length} viram ${unique.length}: ${exactRemoved} cópias saem. Em datasets reais, um mesmo modelo de resposta colado milhares de vezes é a duplicata mais comum.`,
      ],
      keyIdea: "Normalizar antes do hash faz variações de caixa e pontuação virarem a mesma chave.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "counts",
            piece: "metrics-panel",
            metrics: [
              { id: "raw", label: "respostas brutas", value: `${raw.length}` },
              { id: "unique", label: "depois do hash normalizado", value: `${unique.length}`, color: "module-11" },
              { id: "removed", label: "cópias exatas", value: `${exactRemoved}`, color: "danger" },
            ],
            highlight: "unique",
          },
          { id: "normalized", piece: "token-stream", tokens: normalizedFirst, color: "module-11" },
        ],
      },
      alt: `A frase da senha normalizada, palavra por palavra. Com o hash do texto normalizado, ${raw.length} respostas viram ${unique.length}: ${exactRemoved} cópias exatas saem.`,
    },
    {
      id: "near",
      shortTitle: "Quase iguais",
      title: "Quase duplicatas: Jaccard de n-gramas",
      tag: "mechanism",
      body: [
        `“Acesse Configurações” e “abra Configurações” têm hashes diferentes, mas ensinam a mesma coisa. Para achar [[quase duplicatas|near-duplicate]], quebre cada texto em pares de palavras seguidas (bigramas) e calcule a [[similaridade de Jaccard|jaccard-similarity]]: interseção dividida pela união. As duas da senha dão ${fixed(passwordSimilarity)}; as do prazo, ${fixed(deadlineSimilarity)}.`,
        `Com limiar ${fixed(NEAR_THRESHOLD, 1)}, saem ${nearPairs.length} quase duplicatas e ficam ${kept.length}. Comparar todos os pares é O(n²), inviável com milhões de exemplos. O [[MinHash|minhash]] resume cada texto em poucas assinaturas cuja chance de coincidir é o próprio Jaccard, e só os candidatos com assinaturas iguais são comparados.`,
      ],
      keyIdea: "Jaccard de n-gramas mede quase igualdade; MinHash faz essa busca escalar.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "jaccard",
            piece: "matrix",
            rows: matrixItems.map((item) => item.label),
            cols: matrixItems.map((item) => item.label),
            values: similarity,
            scale: { min: 0, max: 1 },
            highlight: { row: 3, col: 2 },
            showValues: true,
            color: "module-11",
          },
        ],
      },
      alt: `Matriz de similaridade de Jaccard entre 5 respostas. As duas da senha têm ${fixed(passwordSimilarity)}, as duas do prazo têm ${fixed(deadlineSimilarity)}, em destaque, e os outros pares ficam perto de 0.`,
    },
    {
      id: "contamination",
      shortTitle: "Contaminação",
      title: "A prova não pode estar no caderno",
      tag: "example",
      body: [
        `Depois de tirar ${shortRemoved} respostas curtas demais (menos de ${MIN_WORDS} palavras), confira o teste. A pergunta de teste sobre cancelamento divide 5-gramas com uma resposta de treino. Isso é [[contaminação de dados|data-contamination]]: o modelo vai “acertar” no teste porque viu a resposta, e a nota não mede generalização.`,
        `Aqui, ${contaminated.length} exemplo de treino é contaminado e sai. O mesmo vale para [[benchmarks|benchmark]] públicos, que circulam pela web e podem ter entrado no pré-treino: a análise do GPT-3 procurou 13-gramas em comum entre os testes e os dados de treino. Faça a checagem contra o seu teste e contra os benchmarks que você vai reportar.`,
      ],
      keyIdea: "Procure n-gramas do teste no treino e retire os exemplos que batem.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "leak",
            piece: "block-diagram",
            blocks: [
              { id: "train", kind: "documents", label: "treino", col: 0, row: 0 },
              { id: "test", kind: "eval", label: "teste", col: 0, row: 1 },
              { id: "grams", kind: "retrieval", label: "5-gramas em comum", col: 1, row: 0.5 },
              { id: "drop", kind: "no-result", label: `${contaminated.length} removido`, col: 2, row: 0 },
              { id: "clean", kind: "documents", label: `treino limpo: ${clean.length}`, col: 2, row: 1 },
            ],
            edges: [
              { from: "train", to: "grams" },
              { from: "test", to: "grams" },
              { from: "grams", to: "drop", label: "bateu", variant: "alternative" },
              { from: "grams", to: "clean", label: "não bateu" },
            ],
            active: "grams",
          },
        ],
      },
      alt: `Treino e teste entram na busca de 5-gramas em comum, em destaque: ${contaminated.length} exemplo que bate é removido, pelo caminho tracejado, e ${clean.length} seguem no treino limpo.`,
    },
    {
      id: "less-is-more",
      shortTitle: "Menos e melhor",
      title: "Menos exemplos, melhores",
      tag: "tradeoff",
      body: [
        `No brinquedo, de ${raw.length} respostas sobraram ${clean.length}. Parece desperdício, mas a sobra ensina mais. No LIMA, os autores ajustaram o LLaMA de 65B com só 1.000 exemplos escolhidos com cuidado, e as respostas competiram, na avaliação humana do paper, com as de modelos ajustados com muito mais dados.`,
        "O outro lado é que filtros erram. Um limiar de Jaccard baixo demais junta respostas que eram de fato diferentes, e um filtro de comprimento pode apagar respostas curtas e certas. Guarde o que cada filtro tirou, olhe uma amostra à mão e ajuste os limiares antes de rodar no dataset todo.",
      ],
      keyIdea: "Qualidade e diversidade pesam mais que volume, mas cada filtro precisa ser conferido.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [{ id: "funnel", piece: "chart", kind: "bar", series: funnel, highlight: funnel.length - 1, color: "module-11" }],
      },
      alt: `Funil da limpeza: ${funnel.map((stage) => `${stage.label} ${stage.value}`).join(", ")}.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "A peneira inteira",
      tag: "summary",
      body: [
        "Normalize e tire duplicatas exatas por hash. Tire quase duplicatas por Jaccard de n-gramas, com MinHash na escala real. Filtre lixo e respostas erradas, retire dados pessoais e procure contaminação com o teste e com os benchmarks. Registre o que cada etapa removeu.",
        "Quando faltam exemplos bons depois da limpeza, uma saída é gerar mais com um modelo. A próxima aula trata de dados sintéticos.",
      ],
      keyIdea: "Exatas → quase iguais → qualidade → dados pessoais → contaminação.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "steps",
            piece: "pipeline",
            display: "chips",
            stages: [
              { id: "normalize", label: "normalizar" },
              { id: "exact", label: "hash: exatas" },
              { id: "near", label: "Jaccard / MinHash: quase" },
              { id: "quality", label: "filtros de qualidade" },
              { id: "pii", label: "dados pessoais" },
              { id: "contamination", label: "n-gramas do teste", color: "module-11" },
            ],
          },
        ],
      },
      alt: "Etapas em chips: normalizar, hash para exatas, Jaccard ou MinHash para quase duplicatas, filtros de qualidade, dados pessoais e n-gramas do teste, em destaque.",
    },
  ],
  realWorldExample:
    "Lee et al. (2021) acharam duplicatas exatas e quase duplicatas em datasets populares de pré-treino, como o C4, e mostraram que, depois de deduplicar, os modelos repetem texto decorado com frequência dez vezes menor e chegam à mesma qualidade, ou melhor, em menos passos de treino.",
  code: {
    language: "python",
    source: `import hashlib, re

def words(text):
    return re.sub(r"[^\\w\\s]", "", text.lower()).split()

def bigrams(text):
    w = words(text)
    return {" ".join(w[i:i + 2]) for i in range(len(w) - 1)}

def jaccard(a, b):
    x, y = bigrams(a), bigrams(b)
    return len(x & y) / len(x | y) if x | y else 0.0

seen, kept = set(), []
for text in dataset:
    key = hashlib.sha256(" ".join(words(text)).encode()).hexdigest()
    if key in seen or any(jaccard(text, k) >= 0.6 for k in kept):
        continue
    seen.add(key)
    kept.append(text)`,
    caption: "Deduplicação exata por hash do texto normalizado e quase duplicatas por Jaccard de bigramas. A comparação com todos os mantidos é O(n²): em escala, troque por MinHash com LSH, como na biblioteca datasketch.",
  },
  tradeOffs: {
    pros: [
      "Menos repetição: o modelo decora menos e generaliza mais",
      "Treino mais barato, com menos exemplos",
      "Avaliação honesta, sem o teste dentro do treino",
    ],
    cons: [
      "Limiares mal escolhidos apagam exemplos bons",
      "Comparar todos os pares não escala sem MinHash ou técnicas parecidas",
      "Filtros automáticos não acham respostas erradas que parecem certas",
    ],
    alternatives: ["Revisão humana de uma amostra", "Um modelo classificador de qualidade treinado com exemplos bons e ruins"],
  },
  knowledgeCheck: [
    {
      id: "hash-misses",
      prompt: "Depois da deduplicação por hash, o dataset ainda tem 400 versões de “seu pedido chegará em X dias” com números diferentes. Por que o hash não pegou?",
      options: [
        "O hash está com defeito",
        "Os textos não são idênticos: são quase duplicatas, que pedem uma medida de sobreposição como Jaccard ou MinHash",
        "O hash só funciona em inglês",
        "Porque o dataset é pequeno",
      ],
      correct: 1,
      explanation: "Hash só junta textos idênticos depois da normalização. Textos com uma palavra ou um número trocado têm hashes diferentes; Jaccard de n-gramas mede a sobreposição.",
      lesson: "11-05",
    },
    {
      id: "benchmark-jump",
      prompt: "O modelo ajustado sobe 20 pontos num benchmark público, mas não melhora nos casos reais. O que conferir primeiro?",
      options: [
        "Se a temperatura estava em zero",
        "Se perguntas do benchmark entraram nos dados de treino (contaminação)",
        "Se o modelo é grande o bastante",
        "Se o benchmark tem perguntas demais",
      ],
      correct: 1,
      explanation: "Um salto no benchmark sem ganho real é o sintoma típico de contaminação. A checagem de n-gramas em comum entre treino e benchmark mostra se o modelo viu as respostas.",
      lesson: "11-05",
    },
  ],
  related: ["08-03", "11-04", "11-06"],
  references: [
    { title: "Lee et al. (2021), Deduplicating Training Data Makes Language Models Better", url: "https://arxiv.org/abs/2107.06499", kind: "paper" },
    { title: "Zhou et al. (2023), LIMA: Less Is More for Alignment", url: "https://arxiv.org/abs/2305.11206", kind: "paper" },
    { title: "Brown et al. (2020), Language Models are Few-Shot Learners", url: "https://arxiv.org/abs/2005.14165", kind: "paper" },
  ],
};

export default lesson;
