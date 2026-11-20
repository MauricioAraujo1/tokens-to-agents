import type { LessonContent } from "../../../types/content";

// Similaridade de cosseno com vetores pequenos, calculada aqui: a conta passo a passo, a invariância ao
// tamanho, a normalização que transforma o cosseno em produto escalar, um ranking de perguntas frequentes
// e a desigualdade triangular que a distância de cosseno quebra.

const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });

type Coords2 = [number, number];
const dot = (a: number[], b: number[]) => a.reduce((sum, value, index) => sum + value * b[index], 0);
const norm = (a: number[]) => Math.hypot(...a);
const cosine = (a: number[], b: number[]) => dot(a, b) / (norm(a) * norm(b));
const distance = (a: number[], b: number[]) => Math.hypot(...a.map((value, index) => value - b[index]));
const degrees = (cos: number) => (Math.acos(Math.min(1, Math.max(-1, cos))) * 180) / Math.PI;
const scale = (a: Coords2, factor: number): Coords2 => [a[0] * factor, a[1] * factor];
const unit = (a: number[]) => a.map((value) => value / norm(a));

// Passos 1 a 3: a pergunta, um documento longo na mesma direção e um curto, perto mas torto.
const q: Coords2 = [2, 1];
const longDoc: Coords2 = [4.2, 2];
const shortDoc: Coords2 = [1.6, 1.9];
const cosLong = cosine(q, longDoc);
const cosShort = cosine(q, shortDoc);
const distLong = distance(q, longDoc);
const distShort = distance(q, shortDoc);
const tripled = scale(shortDoc, 3);
const cosTripled = cosine(q, tripled);
const distTripled = distance(q, tripled);

// Passo 4: depois de normalizar, o produto escalar é o cosseno.
const qUnit = unit(q);
const shortUnit = unit(shortDoc);
const dotOfUnits = dot(qUnit, shortUnit);

// Passo 5: ranking de perguntas frequentes para "esqueci minha senha", com vetores de 4 dimensões.
const faqQuery = [0.9, 0.2, 0.1, 0.3];
const faq = [
  { label: "redefinir senha", vector: [0.85, 0.25, 0.05, 0.35] },
  { label: "bloqueio da conta", vector: [0.7, 0.5, 0.1, 0.2] },
  { label: "trocar e-mail", vector: [0.5, 0.2, 0.6, 0.3] },
  { label: "2ª via de boleto", vector: [0.1, 0.9, 0.3, 0.1] },
  { label: "prazo de entrega", vector: [0.05, 0.2, 0.95, 0.1] },
  { label: "cancelar pedido", vector: [0.1, 0.4, 0.8, 0.4] },
];
const faqScores = faq.map((item) => ({ ...item, score: cosine(faqQuery, item.vector) }));
const faqTop = [...faqScores].sort((a, b) => b.score - a.score);

// Passo 6: a distância de cosseno (1 − cos) quebra a desigualdade triangular.
const angle = (deg: number): Coords2 => [Math.cos((deg * Math.PI) / 180), Math.sin((deg * Math.PI) / 180)];
const a0 = angle(0);
const b45 = angle(45);
const c90 = angle(90);
const cosDistance = (a: number[], b: number[]) => 1 - cosine(a, b);
const direct = cosDistance(a0, c90);
const detour = cosDistance(a0, b45) + cosDistance(b45, c90);

const lesson: LessonContent = {
  id: "06-06",
  subtitle:
    "A medida de semelhança mais usada em embeddings: o que o ângulo entre dois vetores diz, por que o tamanho não importa e como a normalização transforma tudo em um produto escalar.",
  objectives: [
    "Calcular a similaridade de cosseno passo a passo: produto escalar e normas",
    "Explicar por que o cosseno ignora o comprimento dos vetores",
    "Normalizar vetores e usar o produto escalar como cosseno",
    "Saber onde a distância de cosseno não se comporta como uma distância de verdade",
  ],
  steps: [
    {
      id: "direction",
      shortTitle: "Direção",
      title: "Duas lanternas apontando para o mesmo lado",
      tag: "context",
      body: [
        `Duas lanternas podem estar em lugares diferentes e iluminar o mesmo ponto; o que importa é para onde apontam. A [[similaridade de cosseno|cosine-similarity]] mede isso: o ângulo entre dois vetores saindo da origem. Na cena, o documento longo está longe da pergunta (${fixed(distLong)}), mas aponta quase para o mesmo lado: cosseno ${fixed(cosLong, 3)}.`,
        `O documento curto está mais perto (${fixed(distShort)}) e aponta um pouco para outro lado: cosseno ${fixed(cosShort)}, um ângulo de ${fixed(degrees(cosShort), 0)}°. Pelo cosseno, o longo é o mais parecido; por distância, o curto. Escolher a medida é escolher o que “parecido” quer dizer.`,
      ],
      keyIdea: "Cosseno mede direção, não posição: dois vetores com o mesmo ângulo são parecidos, qualquer que seja o tamanho.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "space",
            piece: "vector-space",
            points: [
              { id: "q", label: "pergunta", coords: q, color: "brand" },
              { id: "long", label: "doc longo", coords: longDoc, color: "success" },
              { id: "short", label: "doc curto", coords: shortDoc },
            ],
            vectors: [{ to: "q" }, { to: "long" }, { to: "short" }],
          },
        ],
      },
      alt: `A pergunta e dois documentos como setas da origem. O documento longo aponta quase na mesma direção da pergunta, cosseno ${fixed(cosLong, 3)}; o curto está mais perto, mas mais torto, cosseno ${fixed(cosShort)}.`,
    },
    {
      id: "formula",
      shortTitle: "A conta",
      title: "Produto escalar dividido pelos comprimentos",
      tag: "mechanism",
      body: [
        `A fórmula é cos(q, d) = (q · d) ÷ (|q| × |d|). O produto escalar multiplica posição por posição e soma: q · d = ${q[0]} × ${fixed(shortDoc[0], 1)} + ${q[1]} × ${fixed(shortDoc[1], 1)} = ${fixed(dot(q, shortDoc))}. As [[normas|vector-norm]] são os comprimentos: |q| = ${fixed(norm(q))} e |d| = ${fixed(norm(shortDoc))}. Dividindo, cos = ${fixed(cosShort)}.`,
        "O resultado vai de −1 a 1: 1 é a mesma direção, 0 é perpendicular (nada em comum) e −1 é a direção oposta. Em embeddings de texto, valores negativos são raros e os scores costumam se concentrar numa faixa estreita, pela anisotropia da aula 06-04. Muitas bibliotecas usam a [[distância de cosseno|cosine-distance]], 1 − cos, para que menor signifique mais parecido.",
      ],
      keyIdea: "cos = q · d ÷ (|q| |d|). Vai de −1 a 1, e a distância de cosseno é 1 − cos.",
      scene: {
        kind: "pieces",
        layout: "overlay",
        pieces: [
          {
            id: "space",
            piece: "vector-space",
            points: [
              { id: "q", label: "pergunta", coords: q, color: "brand" },
              { id: "short", label: "doc curto", coords: shortDoc, color: "success" },
            ],
            vectors: [{ to: "q" }, { to: "short" }],
          },
          {
            id: "steps",
            piece: "metrics-panel",
            metrics: [
              { id: "dot", label: "q · d", value: fixed(dot(q, shortDoc)) },
              { id: "nq", label: "|q|", value: fixed(norm(q)) },
              { id: "nd", label: "|d|", value: fixed(norm(shortDoc)) },
              { id: "cos", label: "cos(q, d)", value: fixed(cosShort), color: "success" },
              { id: "angle", label: "ângulo", value: `${fixed(degrees(cosShort), 0)}°` },
            ],
            highlight: "cos",
          },
        ],
      },
      alt: `A conta do cosseno entre a pergunta e o documento curto: produto escalar ${fixed(dot(q, shortDoc))}, normas ${fixed(norm(q))} e ${fixed(norm(shortDoc))}, cosseno ${fixed(cosShort)}, ângulo de ${fixed(degrees(cosShort), 0)}°.`,
    },
    {
      id: "length",
      shortTitle: "Tamanho",
      title: "Esticar o vetor não muda o cosseno",
      tag: "mechanism",
      body: [
        `Multiplique o documento curto por 3: a seta fica três vezes maior e aponta para o mesmo lado. O cosseno continua ${fixed(cosTripled)}, igual ao de antes, mas a distância até a pergunta salta de ${fixed(distShort)} para ${fixed(distTripled)}.`,
        "Essa é a razão de o cosseno ser o padrão para texto. O comprimento de um vetor de embedding costuma refletir coisas como a frequência das palavras ou o tamanho do texto, e não o assunto. Comparar só a direção evita que um documento “ganhe” só por ter um vetor mais comprido.",
      ],
      keyIdea: "cos(q, k·d) = cos(q, d) para qualquer k positivo. O cosseno é imune ao comprimento.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "space",
            piece: "vector-space",
            points: [
              { id: "q", label: "pergunta", coords: q, color: "brand" },
              { id: "short", label: "doc curto", coords: shortDoc },
              { id: "tripled", label: "3 × doc curto", coords: tripled, color: "info" },
            ],
            vectors: [{ to: "q" }, { to: "short" }, { to: "tripled" }],
            distance: { from: "q", to: "tripled", label: fixed(distTripled) },
          },
        ],
      },
      alt: `O documento curto e a sua versão 3 vezes maior apontam na mesma direção: o cosseno com a pergunta é ${fixed(cosTripled)} nos dois, mas a distância vai de ${fixed(distShort)} para ${fixed(distTripled)}.`,
    },
    {
      id: "normalize",
      shortTitle: "Normalizar",
      title: "Normalize uma vez, compare com produto escalar",
      tag: "mechanism",
      body: [
        `A [[normalização L2|l2-normalization]] divide cada vetor pela sua norma, e todos passam a ter comprimento 1. Aí o denominador da fórmula vira 1 × 1 e o cosseno é só o produto escalar: para a pergunta e o documento curto normalizados, q · d = ${fixed(dotOfUnits)}, o mesmo ${fixed(cosShort)} de antes.`,
        "Na prática, isso economiza trabalho: os documentos são normalizados uma vez, na indexação, e cada consulta faz só multiplicações e somas. Por isso muitos modelos já devolvem vetores normalizados, e muitos bancos implementam o cosseno assim. Se o modelo não normaliza, normalize você, nos documentos e na pergunta.",
      ],
      keyIdea: "Com vetores de comprimento 1, cosseno = produto escalar. Normalize na indexação e na consulta.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "docs", kind: "documents", label: "documentos", col: 0, row: 0 },
              { id: "model", kind: "embedding", label: "vetores", col: 1, row: 0 },
              { id: "normalize", kind: "server", label: "÷ norma", col: 2, row: 0 },
              { id: "db", kind: "vector-db", label: "|v| = 1", col: 3, row: 0 },
              { id: "query", kind: "user", label: "pergunta", col: 2, row: 1 },
              { id: "score", kind: "retrieval", label: "q · d = cos", col: 3, row: 1 },
            ],
            edges: [
              { from: "docs", to: "model" },
              { from: "model", to: "normalize" },
              { from: "normalize", to: "db", label: "uma vez" },
              { from: "query", to: "score", label: "normalizada" },
              { from: "db", to: "score" },
            ],
            active: "normalize",
          },
        ],
      },
      alt: "Os vetores dos documentos são divididos pela norma uma vez, em destaque, e guardados com comprimento 1. A pergunta normalizada é comparada por produto escalar, que já é o cosseno.",
    },
    {
      id: "ranking",
      shortTitle: "Ranking",
      title: "Ordenar as perguntas frequentes pelo cosseno",
      tag: "example",
      body: [
        `Um usuário escreve “esqueci minha senha”. O sistema calcula o cosseno entre a pergunta e cada uma das ${faq.length} perguntas frequentes e ordena. Na cena, as barras são os cossenos: “${faqTop[0].label}” lidera com ${fixed(faqTop[0].score)}, seguida de “${faqTop[1].label}” com ${fixed(faqTop[1].score)}.`,
        `Repare na faixa: o último colocado, “${faqTop[faqTop.length - 1].label}”, ainda tem ${fixed(faqTop[faqTop.length - 1].score)}. Vetores com números todos positivos nunca passam de 90° entre si, então o cosseno não fica negativo. O que separa os resultados é a ordem e a distância entre os scores, não um número mágico.`,
      ],
      keyIdea: "A busca por cosseno é calcular um score por candidato e ordenar. A ordem vale mais que o valor.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "faq",
            piece: "token-stream",
            tokens: faqScores.map((item) => item.label),
            bars: faqScores.map((item) => Number(item.score.toFixed(2))),
            query: faqScores.findIndex((item) => item.label === faqTop[0].label),
            color: "module-06",
          },
        ],
      },
      alt: `Perguntas frequentes com barras do cosseno com “esqueci minha senha”: ${faqScores.map((item) => `${item.label} ${fixed(item.score)}`).join(", ")}.`,
    },
    {
      id: "not-a-metric",
      shortTitle: "Cuidados",
      title: "1 − cos não é uma distância de verdade",
      tag: "tradeoff",
      body: [
        `Numa distância de verdade, ir direto nunca é mais longe do que fazer um desvio: é a desigualdade triangular. A distância de cosseno quebra essa regra. Com vetores a 0°, 45° e 90°, ir direto de 0° a 90° custa ${fixed(direct)}; passando por 45°, custa ${fixed(detour)}. Índices que dependem dessa regra precisam usar o ângulo, arccos(cos), ou vetores normalizados com a distância euclidiana.`,
        "Há outro cuidado: o cosseno descarta o comprimento, e às vezes o comprimento tem informação. Em recomendação, um vetor longo pode significar um item popular; Steck e coautores (2024) mostram que, em modelos lineares de recomendação, dependendo da regularização do treino, o cosseno entre os vetores aprendidos pode dar resultados arbitrários. Use a medida com que o modelo foi treinado, o assunto da próxima aula.",
      ],
      keyIdea: "Distância de cosseno quebra a desigualdade triangular e descarta o comprimento. Use a medida do treino do modelo.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "triangle",
            piece: "vector-space",
            points: [
              { id: "a", label: "0°", coords: a0 },
              { id: "b", label: "45°", coords: b45, color: "info" },
              { id: "c", label: "90°", coords: c90 },
            ],
            vectors: [{ to: "a" }, { to: "b" }, { to: "c" }],
          },
          {
            id: "triangle-metrics",
            piece: "metrics-panel",
            metrics: [
              { id: "direct", label: "direto: 0° → 90°", value: fixed(direct), color: "danger" },
              { id: "detour", label: "desvio: 0° → 45° → 90°", value: fixed(detour) },
            ],
            highlight: "direct",
          },
        ],
      },
      alt: `Três vetores unitários a 0°, 45° e 90°. Pela distância de cosseno, ir direto custa ${fixed(direct)} e o desvio por 45° custa ${fixed(detour)}, menos que o caminho direto.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Ângulo, normalização e ordem",
      tag: "summary",
      body: [
        "O cosseno compara direções e ignora comprimentos, o que combina com a maioria dos modelos de embedding de texto. Com vetores normalizados, ele é um produto escalar barato. Os valores dependem do modelo; a ordem dos resultados é o que se usa.",
        "Na próxima aula, a régua muda: distância euclidiana e produto escalar sem normalização, quando cada uma faz sentido e quando as três dão o mesmo ranking.",
      ],
      keyIdea: "Similaridade de cosseno: direção pura. Normalizou, virou produto escalar.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "query", kind: "user", label: "pergunta", col: 0, row: 0 },
              { id: "vector", kind: "embedding", label: "vetor unitário", col: 1, row: 0 },
              { id: "db", kind: "vector-db", label: "|v| = 1", col: 2, row: 0 },
              { id: "score", kind: "retrieval", label: "cosseno + ordem", col: 3, row: 0 },
              { id: "answer", kind: "answer", label: faqTop[0].label, col: 3, row: 1 },
            ],
            edges: [
              { from: "query", to: "vector" },
              { from: "vector", to: "db", label: "q · d" },
              { from: "db", to: "score" },
              { from: "score", to: "answer", label: "top-1" },
            ],
            active: "answer",
            done: ["query", "vector", "db", "score"],
          },
        ],
      },
      alt: `A pergunta vira um vetor unitário, comparado por produto escalar com os documentos normalizados; a ordem pelo cosseno devolve ${faqTop[0].label}.`,
    },
  ],
  realWorldExample:
    "O guia de embeddings da OpenAI recomenda a similaridade de cosseno e avisa que os vetores dos seus modelos já vêm normalizados para comprimento 1. Daí duas consequências que o próprio guia lista: o cosseno pode ser calculado como um produto escalar, um pouco mais rápido, e cosseno e distância euclidiana produzem exatamente o mesmo ranking.",
  code: {
    language: "python",
    source: `import numpy as np

def cosine(a: np.ndarray, b: np.ndarray) -> float:
    return float(a @ b / (np.linalg.norm(a) * np.linalg.norm(b)))

q = np.array([2.0, 1.0])
d = np.array([1.6, 1.9])

print(round(cosine(q, d), 2))        # 0.92
print(round(cosine(q, 3 * d), 2))    # 0.92: o tamanho não muda o ângulo

unit = lambda v: v / np.linalg.norm(v)
print(round(float(unit(q) @ unit(d)), 2))  # 0.92: normalizado, cosseno = produto escalar`,
    caption: "O cosseno da aula em NumPy, a invariância ao tamanho e a equivalência com o produto escalar de vetores normalizados.",
  },
  tradeOffs: {
    pros: [
      "Ignora o comprimento dos vetores, que em texto costuma não ter relação com o assunto",
      "Com vetores normalizados, vira um produto escalar barato",
      "Escala fixa, de −1 a 1, fácil de comparar dentro do mesmo modelo",
    ],
    cons: [
      "Descarta o comprimento mesmo quando ele carrega informação, como popularidade",
      "1 − cos não respeita a desigualdade triangular",
      "Os valores se concentram numa faixa estreita em modelos anisotrópicos",
    ],
    alternatives: ["Produto escalar sem normalização, quando o modelo foi treinado com ele", "Distância euclidiana em vetores normalizados, que dá o mesmo ranking"],
  },
  knowledgeCheck: [
    {
      id: "duplicate-text",
      prompt: "Um documento é indexado duas vezes: uma com o texto normal e outra com o vetor multiplicado por 2. Pelo cosseno, qual delas fica mais perto de uma pergunta?",
      options: [
        "A versão multiplicada por 2, porque o vetor é maior",
        "As duas empatam, porque o cosseno só olha a direção",
        "A versão normal, porque vetores menores são mais precisos",
        "Depende da dimensão do vetor",
      ],
      correct: 1,
      explanation: "Multiplicar por um número positivo não muda o ângulo. O cosseno das duas versões com a pergunta é idêntico.",
      lesson: "06-06",
    },
    {
      id: "dot-as-cosine",
      prompt: "Quando é seguro trocar a similaridade de cosseno pelo produto escalar, que é mais barato?",
      options: [
        "Sempre, as duas medidas são iguais",
        "Quando todos os vetores, dos documentos e da pergunta, foram normalizados para comprimento 1",
        "Só quando os vetores têm menos de 100 dimensões",
        "Nunca",
      ],
      correct: 1,
      explanation: "Com normas iguais a 1, o denominador do cosseno vale 1 e sobra só o produto escalar. Sem normalizar, o produto escalar mistura direção e comprimento.",
      lesson: "06-06",
    },
  ],
  related: ["06-05", "06-07", "03-05"],
  references: [
    { title: "OpenAI: Vector embeddings (guia)", url: "https://platform.openai.com/docs/guides/embeddings", kind: "docs" },
    {
      title: "scikit-learn: cosine_similarity",
      url: "https://scikit-learn.org/stable/modules/generated/sklearn.metrics.pairwise.cosine_similarity.html",
      kind: "docs",
    },
    {
      title: "Steck, Ekanadham e Kallus (2024), Is Cosine-Similarity of Embeddings Really About Similarity?",
      url: "https://arxiv.org/abs/2403.05440",
      kind: "paper",
    },
  ],
};

export default lesson;
