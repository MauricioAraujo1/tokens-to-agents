import type { VectorPoint } from "../../../scene/types";
import type { LessonContent } from "../../../types/content";

// Embeddings de brinquedo com 4 dimensões que têm nome (culinária, esporte, tecnologia, viagem), escolhidas
// à mão para dar intuição. Modelos reais aprendem centenas de dimensões sem nome. Os cossenos, as palavras
// em comum e a projeção 2D são calculados aqui.

const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });

type Vector4 = [number, number, number, number];

const dot = (a: number[], b: number[]) => a.reduce((sum, value, index) => sum + value * b[index], 0);
const cosine = (a: number[], b: number[]) => dot(a, b) / (Math.hypot(...a) * Math.hypot(...b));

const FEATURES = ["culinária", "esporte", "tecnologia", "viagem"];

interface Doc {
  id: string;
  short: string;
  text: string;
  vector: Vector4;
}

const docs: Doc[] = [
  { id: "baguete", short: "baguete", text: "receita de baguete caseira", vector: [0.85, 0.05, 0.15, 0.2] },
  { id: "bolo", short: "bolo", text: "bolo de chocolate fácil", vector: [0.9, 0.15, 0, 0] },
  { id: "corrida", short: "corrida", text: "treino de corrida para iniciantes", vector: [0.1, 0.9, 0.15, 0.1] },
  { id: "trilha", short: "trilha", text: "trilha na serra no fim de semana", vector: [0.05, 0.5, 0, 0.7] },
  { id: "notebook", short: "notebook", text: "como escolher um notebook", vector: [0.05, 0.05, 0.95, 0.1] },
  { id: "fones", short: "fones", text: "melhores fones sem fio", vector: [0, 0.1, 0.9, 0.05] },
  { id: "lisboa", short: "Lisboa", text: "roteiro de 3 dias em Lisboa", vector: [0.2, 0.1, 0.05, 0.9] },
];

const QUERY_TEXT = "como fazer pão em casa";
const queryVector: Vector4 = [0.85, 0.05, 0.1, 0.1];

const words = (text: string) => text.toLowerCase().split(" ");
const sharedWords = (a: string, b: string) => words(a).filter((word) => words(b).includes(word));

const scored = docs.map((doc) => ({ ...doc, score: cosine(queryVector, doc.vector), shared: sharedWords(QUERY_TEXT, doc.text) }));
const ranked = [...scored].sort((a, b) => b.score - a.score);
const best = ranked[0];
const notebook = scored.find((doc) => doc.id === "notebook") ?? ranked[ranked.length - 1];

// Projeção 2D fixa e ilustrativa: x = culinária − tecnologia, y = viagem − esporte.
const project = (vector: Vector4): [number, number] => [vector[0] - vector[2], vector[3] - vector[1]];
const points: VectorPoint[] = [
  ...docs.map((doc) => ({ id: doc.id, label: doc.short, coords: project(doc.vector) })),
  { id: "query", label: "pergunta", coords: project(queryVector), color: "brand" as const },
];

const lesson: LessonContent = {
  id: "06-01",
  subtitle:
    "Como um texto vira uma lista de números que guarda o sentido, e por que isso deixa o computador achar coisas parecidas sem depender das mesmas palavras.",
  objectives: [
    "Explicar o que é um embedding com uma analogia e com a definição técnica",
    "Ler um vetor como uma posição num espaço em que perto quer dizer parecido",
    "Comparar a busca por palavras iguais com a busca por proximidade de vetores",
    "Reconhecer os usos comuns de embeddings: busca, agrupamento, classificação e recomendação",
  ],
  steps: [
    {
      id: "address",
      shortTitle: "Endereço",
      title: "Um endereço para cada texto",
      tag: "context",
      body: [
        "Numa biblioteca, livros de culinária ficam perto uns dos outros, e os de viagem ficam em outro corredor. Se você acha um livro bom de receitas, os vizinhos de estante provavelmente também servem. Um [[embedding|embedding]] faz isso com qualquer texto: dá a ele um endereço num mapa em que assuntos parecidos moram perto.",
        "Tecnicamente, o endereço é um [[vetor denso|dense-vector]]: uma lista de números reais, todos preenchidos, produzida por um [[modelo de embedding|embedding-model]]. Os documentos passam pelo modelo uma vez, e os vetores ficam guardados num [[banco vetorial|vector-database]] para consultas futuras.",
      ],
      keyIdea: "Embedding é o endereço de um texto num mapa de significados: perto no mapa quer dizer parecido no sentido.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "docs", kind: "documents", label: "textos", col: 0, row: 0 },
              { id: "model", kind: "llm", label: "modelo", col: 1, row: 0 },
              { id: "vectors", kind: "embedding", label: "vetores", col: 2, row: 0 },
              { id: "db", kind: "vector-db", label: "banco vetorial", col: 3, row: 0 },
            ],
            edges: [
              { from: "docs", to: "model", label: "texto" },
              { from: "model", to: "vectors", label: "números" },
              { from: "vectors", to: "db", label: "guardar" },
            ],
            active: "vectors",
          },
        ],
      },
      alt: "Textos passam por um modelo, que devolve vetores de números, em destaque, guardados num banco vetorial.",
    },
    {
      id: "numbers",
      shortTitle: "Números",
      title: "Cada número mede um pedaço do sentido",
      tag: "mechanism",
      body: [
        `Imagine um embedding de brinquedo com ${FEATURES.length} números: quanto o texto fala de ${FEATURES.join(", ")}. “${docs[0].text}” vira [${docs[0].vector.map((value) => fixed(value)).join("; ")}]: muita culinária, quase nada do resto. Na cena, cada linha é um texto e cada coluna, uma dessas notas.`,
        "Num modelo real as colunas não têm nome. Ninguém decide que a dimensão 17 é “culinária”: o treino espalha os assuntos por combinações de centenas de números (384, 768, 1.536, conforme o modelo). O que se mantém é a ideia: textos com notas parecidas em todas as colunas têm sentido parecido.",
      ],
      keyIdea: "Um embedding é um perfil numérico do texto. As dimensões reais não têm nome, mas o perfil completo guarda o sentido.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "table",
            piece: "matrix",
            rows: docs.map((doc) => doc.short),
            cols: FEATURES,
            values: docs.map((doc) => doc.vector),
            scale: { min: 0, max: 1 },
            highlight: { row: 0, col: 0 },
            showValues: true,
          },
        ],
      },
      alt: `Tabela com ${docs.length} textos nas linhas e as notas de ${FEATURES.join(", ")} nas colunas. A baguete tem nota ${fixed(docs[0].vector[0])} em culinária.`,
    },
    {
      id: "map",
      shortTitle: "Mapa",
      title: "Perto no mapa, parecido no sentido",
      tag: "mechanism",
      body: [
        `Quatro números não cabem num desenho, então a cena projeta cada vetor em 2D: culinária menos tecnologia no eixo horizontal, viagem menos esporte no vertical. A pergunta “${QUERY_TEXT}” cai no canto das receitas, e os seus dois vizinhos mais próximos são a baguete e o bolo.`,
        "Projeções assim servem só para intuição: elas jogam fora parte da informação. A busca de verdade compara os vetores completos, com todas as dimensões, usando uma medida como a [[similaridade de cosseno|cosine-similarity]], que olha o ângulo entre eles.",
      ],
      keyIdea: "Buscar por sentido vira um problema de geometria: achar os pontos mais próximos da pergunta.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [{ id: "space", piece: "vector-space", points, query: "query", neighbors: 2 }],
      },
      alt: "Mapa 2D com os textos agrupados por assunto: receitas, esporte e trilha, tecnologia, viagem. A pergunta fica entre as receitas, com a baguete e o bolo como vizinhos.",
    },
    {
      id: "no-shared-words",
      shortTitle: "Sem palavras",
      title: "Achar o texto certo sem nenhuma palavra em comum",
      tag: "example",
      body: [
        `A pergunta “${QUERY_TEXT}” e “${best.text}” não têm nenhuma palavra em comum, e mesmo assim a baguete é o resultado com maior similaridade: ${fixed(best.score)}. Já “${notebook.text}” divide a palavra “${notebook.shared.join(", ")}” com a pergunta e fica com ${fixed(notebook.score)}.`,
        "Uma busca que só conta palavras iguais erraria os dois casos: perderia a receita e traria o notebook. Isso é a diferença entre comparar a forma do texto e comparar o seu sentido. Na prática, as duas buscas se complementam, e o módulo 07 mostra como juntá-las.",
      ],
      keyIdea: "Embeddings acham textos parecidos mesmo com palavras diferentes, e ignoram palavras iguais que não mudam o assunto.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "scores",
            piece: "chart",
            kind: "bar",
            series: scored.map((doc) => ({ label: doc.short, value: Number(doc.score.toFixed(2)) })),
            max: 1,
            highlight: scored.findIndex((doc) => doc.id === best.id),
            color: "module-06",
          },
        ],
      },
      alt: `Barras com a similaridade de cosseno entre a pergunta e cada texto. A baguete lidera com ${fixed(best.score)}; o notebook, que divide uma palavra com a pergunta, fica com ${fixed(notebook.score)}.`,
    },
    {
      id: "uses",
      shortTitle: "Usos",
      title: "Um vetor, muitos usos, alguns limites",
      tag: "tradeoff",
      body: [
        "Com os textos virando pontos, várias tarefas ficam parecidas: buscar é achar os vizinhos da pergunta; agrupar é achar regiões densas; classificar é ver de que lado o ponto caiu; recomendar é sugerir o que está perto do que a pessoa já gostou. O mesmo modelo serve a todas.",
        "Os limites vêm do treino. Um vetor resume o texto inteiro e pode apagar detalhes que importam: “gosto de café” e “não gosto de café” falam do mesmo assunto e costumam ficar próximos. Nomes próprios, números e jargão de um domínio que o modelo pouco viu também saem mal representados.",
      ],
      keyIdea: "Embeddings capturam o assunto muito bem e os detalhes exatos (negação, números, códigos) nem sempre.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "docs", kind: "documents", label: "textos", col: 0, row: 0.5 },
              { id: "vectors", kind: "embedding", label: "vetores", col: 1, row: 0.5 },
              { id: "search", kind: "retrieval", label: "busca", col: 2, row: 0 },
              { id: "classify", kind: "eval", label: "classificação", col: 2, row: 1 },
              { id: "recommend", kind: "user", label: "recomendação", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "docs", to: "vectors" },
              { from: "vectors", to: "search", label: "vizinhos" },
              { from: "vectors", to: "classify", label: "região" },
              { from: "search", to: "recommend", label: "parecidos" },
            ],
            active: "vectors",
          },
        ],
      },
      alt: "Os mesmos vetores alimentam a busca por vizinhos, a classificação por região e a recomendação de itens parecidos.",
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Da pergunta aos textos parecidos",
      tag: "summary",
      body: [
        "Juntando tudo: os documentos viram vetores uma vez e ficam guardados. Quando chega uma pergunta, ela passa pelo mesmo modelo, vira um ponto no mesmo espaço, e a busca devolve os vizinhos mais próximos.",
        "Nas próximas aulas você vai abrir cada peça: como o modelo aprende esses vetores, o que muda com textos longos, como medir distância e como buscar entre milhões de vetores sem comparar um por um.",
      ],
      keyIdea: "Embedding = sentido em forma de números. Busca semântica = achar os números mais próximos.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "user", kind: "user", label: "pergunta", col: 0, row: 0 },
              { id: "vectors", kind: "embedding", label: "vetor", col: 1, row: 0 },
              { id: "db", kind: "vector-db", label: "banco vetorial", col: 2, row: 0 },
              { id: "search", kind: "retrieval", label: "vizinhos", col: 3, row: 0 },
              { id: "answer", kind: "answer", label: "baguete, bolo", col: 3, row: 1 },
            ],
            edges: [
              { from: "user", to: "vectors", label: "texto" },
              { from: "vectors", to: "db", label: "consulta" },
              { from: "db", to: "search", label: "mais perto" },
              { from: "search", to: "answer" },
            ],
            active: "answer",
            done: ["user", "vectors", "db", "search"],
          },
        ],
      },
      alt: "A pergunta vira um vetor, o banco vetorial procura os mais próximos e a resposta traz a baguete e o bolo.",
    },
  ],
  realWorldExample:
    "O guia de embeddings da OpenAI lista os usos mais comuns de um mesmo vetor de texto: busca (resultados ordenados por relevância), agrupamento, recomendação, detecção de anomalias e classificação. Em todos, o texto passa pelo modelo uma vez e o resto do trabalho é comparar vetores.",
  code: {
    language: "python",
    source: `from sentence_transformers import SentenceTransformer

model = SentenceTransformer("sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2")

docs = ["receita de baguete caseira", "como escolher um notebook"]
query = "como fazer pão em casa"

doc_vectors = model.encode(docs)
query_vector = model.encode(query)

print(doc_vectors.shape)                          # (2, 384): 2 textos, 384 números cada
print(model.similarity(query_vector, doc_vectors))  # a baguete deve ganhar do notebook`,
    caption: "Um modelo multilíngue pequeno transforma cada texto em 384 números e compara a pergunta com os documentos pela similaridade de cosseno.",
  },
  tradeOffs: {
    pros: [
      "Acha textos parecidos mesmo quando as palavras são diferentes",
      "Um único vetor por texto serve para busca, agrupamento, classificação e recomendação",
      "Os documentos são processados uma vez; a consulta custa só um vetor novo e comparações",
    ],
    cons: [
      "Detalhes exatos, como negação, números e códigos, podem se perder no resumo",
      "A qualidade depende do domínio e do idioma em que o modelo foi treinado",
      "Os números não têm nome: é difícil explicar por que dois textos ficaram próximos",
    ],
    alternatives: ["Busca por palavras-chave, que acerta termos exatos (módulo 07)", "Classificadores treinados para uma tarefa específica"],
  },
  knowledgeCheck: [
    {
      id: "shared-words",
      prompt:
        "Uma busca por palavras iguais devolve “como escolher um notebook” para a pergunta “como fazer pão em casa”. Por que a busca por embeddings não cai nesse erro?",
      options: [
        "Porque ela ignora palavras curtas como “como”",
        "Porque compara o sentido do texto inteiro, e o vetor do notebook aponta para tecnologia, não para culinária",
        "Porque embeddings só funcionam com perguntas longas",
        "Porque o banco vetorial corrige a ortografia",
      ],
      correct: 1,
      explanation:
        "O vetor resume o assunto do texto. Dividir uma palavra comum não aproxima dois textos de assuntos diferentes, e textos do mesmo assunto ficam próximos mesmo sem palavras em comum.",
      lesson: "06-01",
    },
    {
      id: "negation",
      prompt: "Um sistema de avaliações usa embeddings para separar elogios de reclamações e confunde “gostei” com “não gostei”. O que explica isso?",
      options: [
        "O banco vetorial está cheio",
        "O vetor resume o assunto, e a negação muda pouco o assunto; a distinção pede um classificador treinado para sentimento ou um modelo que capte isso",
        "A frase é curta demais para virar vetor",
        "Faltou normalizar o texto em minúsculas",
      ],
      correct: 1,
      explanation:
        "As duas frases falam do mesmo produto e do mesmo tema, então tendem a ficar próximas. Embeddings são fortes em assunto e nem sempre em detalhes como negação.",
      lesson: "06-01",
    },
  ],
  related: ["03-05", "00-05", "06-02"],
  references: [
    { title: "OpenAI: Vector embeddings (guia)", url: "https://platform.openai.com/docs/guides/embeddings", kind: "docs" },
    { title: "Sentence Transformers: documentação", url: "https://www.sbert.net/", kind: "docs" },
    {
      title: "Google Machine Learning Crash Course: Embeddings",
      url: "https://developers.google.com/machine-learning/crash-course/embeddings",
      kind: "article",
    },
  ],
};

export default lesson;
