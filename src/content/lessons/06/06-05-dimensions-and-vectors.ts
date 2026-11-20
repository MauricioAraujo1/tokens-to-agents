import type { LessonContent } from "../../../types/content";

// Dimensões com contas reais: memória de 1 milhão de vetores por dimensão (float32 = 4 bytes), bytes por
// vetor em cada precisão, o contraste entre o vizinho mais perto e o mais longe em pontos aleatórios
// (gerador com semente fixa) conforme d cresce, e o corte de um vetor no estilo Matryoshka.
// As dimensões publicadas vêm dos cartões e anúncios dos modelos citados.

const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");

const dot = (a: number[], b: number[]) => a.reduce((sum, value, index) => sum + value * b[index], 0);
const norm = (a: number[]) => Math.hypot(...a);
const cosine = (a: number[], b: number[]) => dot(a, b) / (norm(a) * norm(b));

// Passo 1: um vetor de 8 dimensões.
const sample = [0.12, -0.48, 0.33, 0.05, -0.21, 0.67, -0.09, 0.3];
const sampleNorm = norm(sample);

// Passo 2: memória de 1 milhão de vetores em float32.
const GB = 1e9;
const FLOAT32 = 4;
const MILLION = 1_000_000;
const models = [
  { label: "384", name: "all-MiniLM-L6-v2", d: 384 },
  { label: "768", name: "modelos base (BERT)", d: 768 },
  { label: "1.024", name: "modelos large (BERT)", d: 1024 },
  { label: "1.536", name: "text-embedding-3-small", d: 1536 },
  { label: "3.072", name: "text-embedding-3-large", d: 3072 },
];
const gbFor = (count: number, d: number, bytes: number) => (count * d * bytes) / GB;
const memory = models.map((model) => ({ ...model, gb: gbFor(MILLION, model.d, FLOAT32) }));

// Passo 3: bytes por vetor de 1.536 dimensões em cada precisão, e o total para 10 milhões.
const D = 1536;
const TEN_MILLION = 10 * MILLION;
const precisions = [
  { id: "f32", label: "float32", bytes: D * 4 },
  { id: "f16", label: "float16", bytes: D * 2 },
  { id: "i8", label: "int8", bytes: D },
  { id: "bin", label: "binário (1 bit)", bytes: D / 8 },
];

// Passo 4: N pontos uniformes em [0, 1]^d e uma consulta. Razão = distância do mais perto ÷ distância do mais longe.
function mulberry32(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const POINTS = 200;
const dims = [2, 8, 32, 128, 512];
const contrastAt = (d: number) => {
  const random = mulberry32(42 + d);
  const point = () => Array.from({ length: d }, random);
  const query = point();
  const distances = Array.from({ length: POINTS }, () => {
    const other = point();
    return Math.hypot(...other.map((value, index) => value - query[index]));
  });
  return Math.min(...distances) / Math.max(...distances);
};
const contrast = dims.map((d) => ({ d, value: contrastAt(d) }));
const MIN_GAP = 0.3;

// Passo 5: corte no estilo Matryoshka. As primeiras dimensões carregam a maior parte do sentido.
const query = [0.62, 0.41, -0.3, 0.22, 0.12, -0.08, 0.05, 0.03];
const relevant = [0.5, 0.52, -0.12, 0.32, 0.12, -0.08, 0.05, 0.03];
const unrelated = [0.3, 0.55, 0.5, -0.35, 0.15, 0.1, -0.05, 0.04];
const unit = (a: number[]) => a.map((value) => value / norm(a));
const truncated = (a: number[], d: number) => unit(a).slice(0, d);
const cuts = [8, 4, 2].map((d) => ({
  d,
  relevant: cosine(truncated(query, d), truncated(relevant, d)),
  unrelated: cosine(truncated(query, d), truncated(unrelated, d)),
  normAfterCut: norm(truncated(query, d)),
}));

const lesson: LessonContent = {
  id: "06-05",
  subtitle:
    "O que é um vetor de d números, quanto custa guardar milhões deles, por que distâncias ficam estranhas em muitas dimensões e como cortar um vetor sem perder o sentido.",
  objectives: [
    "Ler um vetor como uma lista de d números e calcular o seu comprimento",
    "Estimar a memória de uma base de vetores pela dimensão e pela precisão",
    "Explicar a maldição da dimensionalidade com uma conta de distâncias",
    "Usar embeddings Matryoshka para encurtar vetores e saber quando renormalizar",
  ],
  steps: [
    {
      id: "list",
      shortTitle: "Lista",
      title: "Um vetor é uma lista de números com tamanho fixo",
      tag: "context",
      body: [
        `Uma ficha de receita lista as quantidades de cada ingrediente; mais linhas na ficha descrevem o prato com mais detalhe. Um [[vetor|vector]] é essa ficha para um texto: uma lista de números, sempre do mesmo tamanho para o mesmo modelo. Cada posição é uma [[dimensão|dimension]], e a cena mostra um vetor com d = ${sample.length}.`,
        `O comprimento do vetor, a sua [[norma|vector-norm]], é a raiz da soma dos quadrados: para esse vetor, ${fixed(sampleNorm)}. Modelos reais usam de centenas a alguns milhares de dimensões: 384 no all-MiniLM-L6-v2, 768 nos modelos do tamanho do BERT base, 1.536 no text-embedding-3-small e 3.072 no text-embedding-3-large.`,
      ],
      keyIdea: "d é o tamanho da ficha: cada vetor do modelo tem exatamente d números, e cada número custa memória.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "vector",
            piece: "matrix",
            rows: ["vetor"],
            cols: sample.map((_, index) => `d${index + 1}`),
            values: [sample],
            scale: { min: -1, max: 1 },
            highlight: { row: 0, col: 5 },
            showValues: true,
          },
        ],
      },
      alt: `Um vetor com ${sample.length} dimensões: ${sample.map((value) => fixed(value)).join(", ")}. A sua norma é ${fixed(sampleNorm)}.`,
    },
    {
      id: "memory",
      shortTitle: "Memória",
      title: "Cada dimensão custa 4 bytes por documento",
      tag: "mechanism",
      body: [
        `A conta é direta: memória = número de vetores × d × bytes por número. Em float32, cada número ocupa ${FLOAT32} bytes. Um milhão de documentos com d = 384 ocupa ${fixed(memory[0].gb)} GB; com d = 3.072, ${fixed(memory[memory.length - 1].gb)} GB. Dobrar a dimensão dobra a memória, o disco e o tempo de cada comparação.`,
        "Os índices rápidos de busca costumam querer os vetores na RAM, e RAM é o recurso caro de um banco vetorial. Por isso a dimensão é uma decisão de custo, não só de qualidade: um modelo de 3.072 dimensões precisa ser bem melhor que um de 768 para pagar 4 vezes mais memória.",
      ],
      keyIdea: "Memória = N × d × bytes. A dimensão escala o custo de tudo: RAM, disco e tempo de busca.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "memory",
            piece: "chart",
            kind: "bar",
            series: memory.map((model) => ({ label: model.label, value: Number(model.gb.toFixed(2)) })),
            highlight: memory.length - 1,
            color: "module-06",
          },
        ],
      },
      alt: `Memória de 1 milhão de vetores em float32 por dimensão: ${memory.map((model) => `${model.label} dimensões, ${fixed(model.gb)} GB`).join("; ")}.`,
    },
    {
      id: "precision",
      shortTitle: "Precisão",
      title: "Menos bits por número, mesma dimensão",
      tag: "mechanism",
      body: [
        `A outra alavanca é quantos bits cada número usa. Um vetor de ${integer(D)} dimensões ocupa ${integer(precisions[0].bytes)} bytes em float32, ${integer(precisions[1].bytes)} em float16, ${integer(precisions[2].bytes)} em int8 e só ${integer(precisions[3].bytes)} em binário, guardando apenas o sinal de cada número. Para 10 milhões de documentos, isso vai de ${fixed(gbFor(TEN_MILLION, D, 4), 1)} GB para ${fixed(gbFor(TEN_MILLION, D, 1 / 8), 1)} GB.`,
        "O custo é precisão nas distâncias. float16 quase não muda a ordem dos resultados; int8 e binário mudam mais, e o truque comum é buscar candidatos com os vetores compactos e reordenar os melhores com os vetores completos. O pgvector, por exemplo, tem os tipos halfvec (16 bits) e bit para isso.",
      ],
      keyIdea: "Precisão é a segunda alavanca de memória: float16, int8 ou binário, com reordenação dos melhores candidatos.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "precision",
            piece: "metrics-panel",
            metrics: precisions.map((precision) => ({
              id: precision.id,
              label: `${precision.label}, bytes por vetor`,
              value: integer(precision.bytes),
              color: precision.id === "bin" ? "success" : undefined,
            })),
            highlight: "f32",
          },
        ],
      },
      alt: `Bytes por vetor de ${integer(D)} dimensões: ${precisions.map((precision) => `${precision.label} ${integer(precision.bytes)}`).join(", ")}.`,
    },
    {
      id: "curse",
      shortTitle: "Maldição",
      title: "Em muitas dimensões, todo mundo fica longe",
      tag: "mechanism",
      body: [
        `Num quarto, o objeto mais perto de você está muito mais perto do que o mais longe. Em muitas dimensões, isso deixa de valer para pontos espalhados ao acaso. A cena sorteia ${POINTS} pontos e uma consulta e divide a distância do mais perto pela do mais longe: com d = 2, a razão é ${fixed(contrast[0].value)}, o vizinho está praticamente colado; com d = 512, sobe para ${fixed(contrast[contrast.length - 1].value)}, e o mais perto está quase tão longe quanto o mais longe.`,
        "É a [[maldição da dimensionalidade|curse-of-dimensionality]]: as distâncias se concentram e o “vizinho mais próximo” perde o contraste. Embeddings funcionam mesmo assim porque não são aleatórios: textos reais ocupam uma região de dimensão bem menor dentro do espaço, onde a vizinhança ainda separa assuntos. Mas o efeito explica por que índices exatos que funcionam bem em 2D ou 3D, como as árvores k-d, perdem a vantagem em centenas de dimensões.",
      ],
      keyIdea: "Em alta dimensão, distâncias entre pontos aleatórios ficam parecidas: a razão perto ÷ longe vai para 1. Embeddings escapam porque têm estrutura.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "curse",
            piece: "chart",
            kind: "line",
            series: contrast.map((point) => ({ label: `d = ${point.d}`, value: Number(point.value.toFixed(2)) })),
            max: 1,
            highlight: contrast.length - 1,
            color: "module-06",
          },
        ],
      },
      alt: `Linha da razão entre a distância do vizinho mais perto e a do mais longe, para d de 2 a 512: sobe de ${fixed(contrast[0].value)} para ${fixed(contrast[contrast.length - 1].value)}.`,
    },
    {
      id: "matryoshka",
      shortTitle: "Matryoshka",
      title: "Vetores que podem ser cortados",
      tag: "example",
      body: [
        `Bonecas russas guardam uma boneca menor dentro da maior. Um [[embedding Matryoshka|matryoshka-embedding]] é treinado para que os primeiros números do vetor já formem um bom vetor sozinhos. Na cena, um vetor de 8 dimensões cortado nas 4 primeiras mantém a separação: cosseno ${fixed(cuts[1].relevant)} com o trecho relevante contra ${fixed(cuts[1].unrelated)} com o sem relação. Cortado em 2, o sem relação sobe para ${fixed(cuts[2].unrelated)} e a separação quase some.`,
        `Os modelos text-embedding-3 da OpenAI aceitam o parâmetro dimensions para devolver o vetor já cortado, e a documentação deles diz que o large cortado em 256 dimensões ainda supera o ada-002 com 1.536. Se você cortar por conta própria, renormalize: depois do corte em 2 dimensões, a norma do vetor da cena cai de 1 para ${fixed(cuts[2].normAfterCut)}, e um banco que usa produto escalar passaria a comparar tamanhos, não só direções.`,
      ],
      keyIdea: "Embeddings Matryoshka trocam dimensões por memória com pouca perda. Cortou à mão, renormalize.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "model", kind: "llm", label: "modelo", col: 0, row: 0 },
              { id: "full", kind: "embedding", label: "3.072 dims", col: 1, row: 0 },
              { id: "cut", kind: "server", label: "cortar em 256", col: 2, row: 0 },
              { id: "db", kind: "vector-db", label: "256 dims", col: 3, row: 0 },
            ],
            edges: [
              { from: "model", to: "full" },
              { from: "full", to: "cut", label: "12× menor" },
              { from: "cut", to: "db", label: "normalizado" },
            ],
            active: "cut",
          },
          {
            id: "cuts",
            piece: "metrics-panel",
            metrics: cuts.map((cut) => ({
              id: `d${cut.d}`,
              label: `${cut.d} dims: relevante / sem relação`,
              value: `${fixed(cut.relevant)} / ${fixed(cut.unrelated)}`,
              color: cut.relevant - cut.unrelated > MIN_GAP ? ("success" as const) : ("danger" as const),
            })),
            highlight: "d4",
          },
        ],
      },
      alt: `Um vetor de 3.072 dimensões é cortado nas primeiras 256 e normalizado antes de ir ao banco. No exemplo de 8 dimensões, o cosseno com o trecho relevante e com o sem relação fica em ${cuts.map((cut) => `${cut.d} dims: ${fixed(cut.relevant)} e ${fixed(cut.unrelated)}`).join("; ")}.`,
    },
    {
      id: "choose-d",
      shortTitle: "Escolher d",
      title: "Escolher a dimensão é escolher o custo",
      tag: "summary",
      body: [
        "Juntando as alavancas: a dimensão vem do modelo (ou do corte Matryoshka), a precisão vem do armazenamento, e as duas multiplicam a memória. Meça a qualidade da busca nos seus dados com a dimensão menor antes de pagar pela maior: a diferença costuma ser pequena e o custo, linear.",
        "Há também limites práticos: no pgvector, o índice HNSW aceita até 2.000 dimensões no tipo vector e até 4.000 no halfvec. Com os vetores no tamanho certo, a próxima aula responde à pergunta central: como medir se dois deles são parecidos.",
      ],
      keyIdea: "Qualidade, dimensão e precisão se negociam juntas. Meça antes de escolher o vetor maior.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "docs", kind: "documents", label: "10 mi de docs", col: 0, row: 0 },
              { id: "model", kind: "embedding", label: "d dimensões", col: 1, row: 0 },
              { id: "ram", kind: "memory", label: "RAM = N·d·bytes", col: 2, row: 0 },
              { id: "db", kind: "vector-db", label: "banco vetorial", col: 3, row: 0 },
              { id: "eval", kind: "eval", label: "qualidade", col: 2, row: 1 },
            ],
            edges: [
              { from: "docs", to: "model" },
              { from: "model", to: "ram", label: "precisão" },
              { from: "ram", to: "db" },
              { from: "db", to: "eval", label: "medir" },
            ],
            active: "ram",
          },
        ],
      },
      alt: "Dez milhões de documentos viram vetores de d dimensões; a memória, em destaque, é N × d × bytes; o banco vetorial é avaliado para conferir a qualidade.",
    },
  ],
  realWorldExample:
    "Em janeiro de 2024, a OpenAI lançou os modelos text-embedding-3-small (1.536 dimensões) e text-embedding-3-large (3.072) com o parâmetro dimensions, que devolve vetores mais curtos. A documentação da OpenAI conta que o large cortado em 256 dimensões ainda supera, no benchmark MTEB, o modelo anterior, o ada-002, com 1.536: um vetor 6 vezes menor e melhor. A técnica por trás é a dos embeddings Matryoshka, de Kusupati e coautores (2022).",
  code: {
    language: "python",
    source: `import numpy as np

def shorten(vector: np.ndarray, d: int) -> np.ndarray:
    head = vector[:d]
    return head / np.linalg.norm(head)       # renormaliza depois do corte

def memory_gb(count: int, d: int, bytes_per_value: float) -> float:
    return count * d * bytes_per_value / 1e9

full = np.random.default_rng(0).normal(size=3072)
print(shorten(full, 256).shape)            # (256,)
print(memory_gb(10_000_000, 1536, 4))      # 61.44 GB em float32
print(memory_gb(10_000_000, 1536, 1 / 8))  # 1.92 GB em binário`,
    caption: "Cortar um vetor Matryoshka e renormalizar, e a conta de memória de uma base de vetores.",
  },
  tradeOffs: {
    pros: [
      "Mais dimensões guardam mais distinções entre textos",
      "Embeddings Matryoshka deixam escolher a dimensão depois do treino",
      "Precisões menores (float16, int8, binário) cortam a memória várias vezes",
    ],
    cons: [
      "Memória, disco e tempo de comparação crescem linearmente com d",
      "Em alta dimensão, as distâncias se concentram e índices exatos perdem eficiência",
      "Cortar ou quantizar demais muda a ordem dos resultados",
    ],
    alternatives: ["Reduzir a dimensão com PCA depois de gerar os vetores", "Busca em dois estágios: vetores compactos para candidatos e completos para reordenar"],
  },
  knowledgeCheck: [
    {
      id: "memory-estimate",
      prompt: "Uma base tem 5 milhões de trechos com vetores de 1.024 dimensões em float32. Quanto ocupam só os vetores?",
      options: ["Cerca de 5 GB", "Cerca de 20,5 GB", "Cerca de 1 GB", "Cerca de 205 GB"],
      correct: 1,
      explanation: "5.000.000 × 1.024 × 4 bytes = 20.480.000.000 bytes, cerca de 20,5 GB, antes de contar índices e metadados.",
      lesson: "06-05",
    },
    {
      id: "renormalize",
      prompt:
        "Você corta vetores normalizados de 1.536 para 512 dimensões e guarda num banco configurado com produto escalar. A busca piora. Qual a correção mais provável?",
      options: [
        "Voltar para 1.536 dimensões",
        "Renormalizar os vetores cortados para comprimento 1, já que o produto escalar passou a misturar tamanho e direção",
        "Trocar o produto escalar por soma",
        "Cortar para 256 dimensões",
      ],
      correct: 1,
      explanation:
        "O corte reduz a norma de cada vetor de um jeito diferente. Com produto escalar, vetores que sobraram mais longos ganham pontos sem ser mais parecidos. Renormalizar restaura a equivalência com o cosseno.",
      lesson: "06-05",
    },
  ],
  related: ["06-04", "06-06", "01-03"],
  references: [
    { title: "Kusupati et al. (2022), Matryoshka Representation Learning", url: "https://arxiv.org/abs/2205.13147", kind: "paper" },
    { title: "OpenAI: guia de embeddings (parâmetro dimensions)", url: "https://platform.openai.com/docs/guides/embeddings", kind: "docs" },
    { title: "pgvector: tipos vector, halfvec e bit", url: "https://github.com/pgvector/pgvector", kind: "repo" },
  ],
};

export default lesson;
