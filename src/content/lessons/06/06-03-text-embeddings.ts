import type { VectorPoint } from "../../../scene/types";
import type { LessonContent } from "../../../types/content";

// Três contas de embeddings de texto: a diluição de um vetor que mistura vários assuntos (média de vetores
// de assunto ortogonais), a fração de um documento que cabe no limite de tokens de um modelo, e o que
// acontece ao comparar vetores de dois modelos diferentes (o modelo B é o modelo A girado 90°).

const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");
const percent = (value: number) => `${Math.round(value * 100)}%`;

const dot = (a: number[], b: number[]) => a.reduce((sum, value, index) => sum + value * b[index], 0);
const cosine = (a: number[], b: number[]) => dot(a, b) / (Math.hypot(...a) * Math.hypot(...b));

// Passo 2: a pergunta com o prefixo que modelos como o E5 pedem.
const queryTokens = ["query:", "quantos", "dias", "de", "férias", "?"];

// Passo 3: um documento que fala de n assuntos é a média de n vetores de assunto ortogonais.
const TOPICS = ["férias", "salário", "ponto", "benefícios", "home office"];
const unit = (index: number) => TOPICS.map((_, col) => (col === index ? 1 : 0));
const mixOf = (count: number) => TOPICS.map((_, col) => (col < count ? 1 / count : 0));
const queryFerias = unit(0);
const dilution = TOPICS.map((_, index) => ({ topics: index + 1, score: cosine(queryFerias, mixOf(index + 1)) }));

// Passo 4: um documento de 1.200 tokens diante do limite de dois modelos.
const DOC_TOKENS = 1200;
const MINILM_LIMIT = 256;
const BERT_LIMIT = 512;
const seen = (limit: number) => Math.min(1, limit / DOC_TOKENS);

// Passo 5: o modelo B dá a cada texto o vetor do modelo A girado 90°. Dentro de cada modelo as
// distâncias são as mesmas; entre modelos, não fazem sentido.
type Coords2 = [number, number];
const rotate90 = ([x, y]: Coords2): Coords2 => [-y, x];
const indexedWithA: Record<string, Coords2> = {
  férias: [2, 0.4],
  "13º": [1.6, 1.2],
  senha: [-0.4, 2],
  vpn: [-1.1, 1.7],
  reembolso: [-1.8, -0.6],
  "plano de saúde": [0.4, -1.9],
};
const queryInA: Coords2 = [1.9, 0.6];
const queryInB = rotate90(queryInA);
const nearestTo = (query: Coords2) =>
  Object.entries(indexedWithA)
    .map(([label, coords]) => ({ label, distance: Math.hypot(coords[0] - query[0], coords[1] - query[1]) }))
    .sort((a, b) => a.distance - b.distance);
const nearestA = nearestTo(queryInA)[0];
const nearestB = nearestTo(queryInB)[0];
const spacePoints: VectorPoint[] = [
  ...Object.entries(indexedWithA).map(([label, coords]) => ({ id: label, label, coords })),
  { id: "q-a", label: "pergunta (A)", coords: queryInA, color: "success" as const },
  { id: "q-b", label: "pergunta (B)", coords: queryInB, color: "danger" as const },
];

const lesson: LessonContent = {
  id: "06-03",
  subtitle:
    "Como usar embeddings com textos de verdade: perguntas curtas contra documentos longos, o limite de tokens do modelo, o vetor que se dilui quando o texto fala de tudo e a regra de nunca misturar modelos.",
  objectives: [
    "Explicar por que pergunta e documento são textos de tipos diferentes e como os prefixos ajudam",
    "Calcular a diluição do vetor de um texto que mistura vários assuntos",
    "Prever o que o modelo ignora quando o texto passa do limite de tokens",
    "Justificar por que trocar de modelo de embedding exige reindexar tudo",
  ],
  steps: [
    {
      id: "help-center",
      shortTitle: "Manual",
      title: "Um manual de RH que responde perguntas",
      tag: "context",
      body: [
        "Uma empresa quer que os funcionários perguntem “quantos dias de férias eu tenho?” e recebam o parágrafo certo do manual de RH. O manual inteiro passa por um modelo de embedding de texto, e cada parágrafo vira um vetor guardado no banco. A pergunta passa pelo mesmo modelo na hora da consulta.",
        "O vetor de um trecho inteiro tem nome: [[sentence embedding|sentence-embedding]], um vetor por frase ou parágrafo, e não um por token como na aula 03-05. Ele já leu o texto todo com attention, então “banco” num parágrafo sobre agências e “banco” num parágrafo sobre praças dão vetores diferentes.",
      ],
      keyIdea: "Embedding de texto: um vetor por trecho, contextual, produzido pelo mesmo modelo para documentos e perguntas.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "docs", kind: "documents", label: "manual de RH", col: 0, row: 0 },
              { id: "user", kind: "user", label: "funcionário", col: 0, row: 1 },
              { id: "model", kind: "llm", label: "modelo de texto", col: 1, row: 0.5 },
              { id: "vectors", kind: "embedding", label: "vetores", col: 2, row: 0.5 },
              { id: "db", kind: "vector-db", label: "banco vetorial", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "docs", to: "model", label: "parágrafos" },
              { from: "user", to: "model", label: "pergunta" },
              { from: "model", to: "vectors" },
              { from: "vectors", to: "db" },
            ],
            active: "model",
          },
        ],
      },
      alt: "Os parágrafos do manual de RH e a pergunta do funcionário passam pelo mesmo modelo de texto, em destaque; os vetores vão para o banco vetorial.",
    },
    {
      id: "asymmetric",
      shortTitle: "Prefixos",
      title: "A pergunta não se parece com a resposta",
      tag: "mechanism",
      body: [
        "“Quantos dias de férias eu tenho?” e “Cada colaborador tem direito a 30 dias de férias por ano, que podem ser divididos em até três períodos” falam do mesmo assunto, mas têm forma diferente: uma é curta e pergunta, o outro é longo e afirma. Uma busca boa precisa aproximar as duas, e não só achar outras perguntas parecidas.",
        "Por isso modelos treinados com pares de pergunta e trecho tratam os dois lados de forma explícita. A família E5 pede os prefixos “query: ” na pergunta e “passage: ” no documento, como na cena. Esquecer o prefixo não dá erro nenhum: só piora a busca, em silêncio. Leia sempre o cartão do modelo.",
      ],
      keyIdea: "Busca é assimétrica: pergunta curta contra trecho longo. Siga o formato de entrada que o modelo foi treinado para ver.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "query",
            piece: "token-stream",
            tokens: queryTokens,
            query: 0,
            keys: [1, 2, 3, 4, 5],
            color: "module-06",
          },
        ],
      },
      alt: "A pergunta “quantos dias de férias?” com o prefixo query: em destaque, como o modelo E5 espera.",
    },
    {
      id: "dilution",
      shortTitle: "Diluição",
      title: "Um vetor para tudo é um vetor para nada",
      tag: "mechanism",
      body: [
        `Pense numa vitamina de frutas: com só morango, o gosto é forte; com cinco frutas, cada uma some um pouco. O vetor de um texto é parecido: com mean pooling, um trecho que fala de ${TOPICS.length} assuntos vira uma média de ${TOPICS.length} direções, e nenhuma delas fica forte.`,
        `Na conta da cena, cada assunto é uma direção ortogonal e a pergunta aponta só para “férias”. O cosseno com um trecho só de férias é ${fixed(dilution[0].score)}; com 2 assuntos cai para ${fixed(dilution[1].score)}; com ${TOPICS.length}, para ${fixed(dilution[TOPICS.length - 1].score)}, ou seja, 1/√n. Por isso documentos longos são divididos em trechos menores antes de virar vetor, um assunto do módulo 08.`,
      ],
      keyIdea: "Quanto mais assuntos num texto, mais o vetor dele se afasta de cada assunto: o cosseno cai como 1/√n.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "dilution",
            piece: "chart",
            kind: "line",
            series: dilution.map((point) => ({ label: `${point.topics} assunto${point.topics > 1 ? "s" : ""}`, value: Number(point.score.toFixed(2)) })),
            max: 1,
            highlight: 0,
            color: "module-06",
          },
        ],
      },
      alt: `Linha do cosseno entre a pergunta sobre férias e um trecho que mistura de 1 a ${TOPICS.length} assuntos: cai de ${fixed(dilution[0].score)} para ${fixed(dilution[TOPICS.length - 1].score)}.`,
    },
    {
      id: "token-limit",
      shortTitle: "Limite",
      title: "O que passa do limite de tokens é cortado",
      tag: "mechanism",
      body: [
        `Todo modelo de embedding tem um tamanho máximo de entrada, herdado das posições do Transformer. O BERT tem ${integer(BERT_LIMIT)} posições; o all-MiniLM-L6-v2 corta a entrada em ${integer(MINILM_LIMIT)} tokens, como diz o cartão dele. O resto do texto é descartado, sem erro e sem aviso.`,
        `Um capítulo de ${integer(DOC_TOKENS)} tokens enviado inteiro ao MiniLM vira um vetor de só ${percent(seen(MINILM_LIMIT))} do texto: o começo. Se a resposta estava no fim, ela nunca entrou no vetor. Com ${integer(BERT_LIMIT)} tokens, o modelo leria ${percent(seen(BERT_LIMIT))}. Conte os tokens com o tokenizador do próprio modelo antes de indexar.`,
      ],
      keyIdea: "Texto além do limite do modelo não entra no vetor. Conte tokens antes de indexar.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "limit",
            piece: "metrics-panel",
            metrics: [
              { id: "doc", label: "tamanho do capítulo", value: `${integer(DOC_TOKENS)} tokens` },
              { id: "minilm", label: `lido com limite ${MINILM_LIMIT}`, value: percent(seen(MINILM_LIMIT)), color: "danger" },
              { id: "bert", label: `lido com limite ${BERT_LIMIT}`, value: percent(seen(BERT_LIMIT)) },
              { id: "lost", label: "tokens ignorados (MiniLM)", value: integer(DOC_TOKENS - MINILM_LIMIT), color: "danger" },
            ],
            highlight: "minilm",
          },
        ],
      },
      alt: `Um capítulo de ${integer(DOC_TOKENS)} tokens: com limite de ${MINILM_LIMIT} tokens o modelo lê ${percent(seen(MINILM_LIMIT))} dele; com ${BERT_LIMIT}, ${percent(seen(BERT_LIMIT))}.`,
    },
    {
      id: "two-models",
      shortTitle: "Dois modelos",
      title: "Vetores de modelos diferentes não se comparam",
      tag: "example",
      body: [
        `O manual foi indexado com o modelo A. Um dia alguém troca o modelo da consulta pelo B, mais novo, e não reindexa nada. Na cena, o modelo B é o A girado 90°: tão bom quanto ele, com as mesmas distâncias entre os seus próprios vetores. Mesmo assim, a pergunta sobre férias feita com B cai perto de “${nearestB.label}”.`,
        `Com o modelo A, o vizinho mais próximo é “${nearestA.label}”, a ${fixed(nearestA.distance)} de distância. Cada modelo tem os seus próprios eixos, e as coordenadas de um não valem no outro. Comparar uma pergunta do B com documentos do A é como comparar coordenadas de dois mapas com nortes diferentes.`,
      ],
      keyIdea: "Documentos e perguntas precisam vir do mesmo modelo, na mesma versão. Trocou o modelo, reindexe tudo.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [{ id: "space", piece: "vector-space", points: spacePoints, query: "q-b", neighbors: 1 }],
      },
      alt: `Mapa com os trechos indexados pelo modelo A. A pergunta feita com o modelo A fica ao lado de ${nearestA.label}; a mesma pergunta feita com o modelo B cai perto de ${nearestB.label}.`,
    },
    {
      id: "choose",
      shortTitle: "Escolher",
      title: "Escolher o modelo e conviver com a troca",
      tag: "tradeoff",
      body: [
        "Para escolher o modelo, o ponto de partida público é o [[MTEB|mteb]], um benchmark com dezenas de conjuntos de dados de busca, agrupamento e classificação em muitos idiomas. Ele mostra que nenhum modelo vence em todas as tarefas: olhe as tarefas parecidas com a sua, confira o idioma, o limite de tokens e o tamanho do vetor, e teste com perguntas reais do seu sistema.",
        "A troca de modelo custa caro porque obriga a recalcular os vetores de todos os documentos. Guarde junto de cada vetor o nome e a versão do modelo que o gerou, e planeje a troca como uma migração: indexar de novo numa coleção nova e só então virar a consulta. A próxima aula olha para o espaço onde esses vetores moram.",
      ],
      keyIdea: "Modelo de embedding é uma decisão de dados, não só de código: trocar significa reindexar.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "docs", kind: "documents", label: "manual de RH", col: 0, row: 0.5 },
              { id: "v1", kind: "llm", label: "modelo A", col: 1, row: 0 },
              { id: "v2", kind: "llm", label: "modelo B", col: 1, row: 1 },
              { id: "db", kind: "vector-db", label: "coleção A", col: 3, row: 0 },
              { id: "reindex", kind: "queue", label: "reindexar", col: 2, row: 1 },
              { id: "db2", kind: "vector-db", label: "coleção B", col: 3, row: 1 },
            ],
            edges: [
              { from: "docs", to: "v1" },
              { from: "docs", to: "v2" },
              { from: "v1", to: "db", label: "hoje" },
              { from: "v2", to: "db", label: "misturar", variant: "alternative" },
              { from: "v2", to: "reindex", label: "todos os docs" },
              { from: "reindex", to: "db2" },
            ],
            active: "reindex",
          },
        ],
      },
      alt: "O manual indexado com o modelo A na coleção A. O modelo B não pode escrever na coleção A, caminho tracejado em vermelho; o certo é reindexar todos os documentos numa coleção B.",
    },
  ],
  realWorldExample:
    "O MTEB (Massive Text Embedding Benchmark), publicado em 2022, reúne 8 tipos de tarefa e 58 conjuntos de dados em 112 idiomas, e mantém um ranking público de modelos no Hugging Face. A conclusão do artigo é a que guia a escolha na prática: nenhum método de embedding de texto domina todas as tarefas. Um time que monta busca em português usa o ranking para fazer a lista curta e decide com um conjunto de perguntas reais dos seus usuários.",
  code: {
    language: "python",
    source: `from sentence_transformers import SentenceTransformer

model = SentenceTransformer("intfloat/multilingual-e5-small")
print(model.max_seq_length)  # limite de tokens: o que passar disso é cortado

passages = [
    "passage: Cada colaborador tem direito a 30 dias de férias por ano.",
    "passage: Para redefinir a senha da VPN, abra um chamado na TI.",
]
query = "query: quantos dias de férias eu tenho?"

doc_vectors = model.encode(passages, normalize_embeddings=True)
query_vector = model.encode(query, normalize_embeddings=True)
print(model.similarity(query_vector, doc_vectors))`,
    caption: "Um modelo da família E5 com os prefixos que ele espera: query: na pergunta e passage: nos documentos.",
  },
  tradeOffs: {
    pros: [
      "Um vetor por trecho captura o sentido em contexto, não só as palavras",
      "Modelos multilíngues aproximam a pergunta em português de um trecho em inglês",
      "Benchmarks públicos como o MTEB encurtam a escolha do modelo",
    ],
    cons: [
      "Textos longos ou com muitos assuntos viram vetores diluídos",
      "O que passa do limite de tokens é cortado em silêncio",
      "Trocar de modelo obriga a reindexar todos os documentos",
    ],
    alternatives: ["Busca por palavras-chave para nomes, códigos e termos exatos (módulo 07)", "Dividir documentos em trechos menores antes de gerar os vetores (módulo 08)"],
  },
  knowledgeCheck: [
    {
      id: "long-policy",
      prompt:
        "Uma política de 3.000 tokens que trata de férias, salário e viagens vira um único vetor com um modelo de limite 512. A pergunta é sobre reembolso de viagem, descrito no fim do texto. O que esperar?",
      options: [
        "Um resultado ótimo, porque o documento fala de viagens",
        "Um resultado fraco: o fim foi cortado pelo limite e o vetor que sobrou mistura assuntos",
        "Um erro de execução, porque o texto é longo demais",
        "O mesmo resultado de qualquer outro modelo",
      ],
      correct: 1,
      explanation:
        "O modelo só leu os primeiros 512 tokens, e o vetor resultante é uma média de vários assuntos. Os dois efeitos afastam o vetor da pergunta.",
      lesson: "06-03",
    },
    {
      id: "model-upgrade",
      prompt: "O time trocou o modelo de embedding da consulta por um melhor, sem mexer nos documentos já indexados. A busca piorou muito. Por quê?",
      options: [
        "O modelo novo é pior do que o anunciado",
        "Os vetores da pergunta e dos documentos agora vêm de espaços diferentes, e as distâncias entre eles não significam nada",
        "O banco vetorial precisa ser reiniciado",
        "A pergunta ficou longa demais",
      ],
      correct: 1,
      explanation: "Cada modelo aprende os seus próprios eixos. Os documentos precisam ser reindexados com o modelo novo antes de a consulta usá-lo.",
      lesson: "06-03",
    },
  ],
  related: ["06-02", "06-04", "03-05"],
  references: [
    { title: "Muennighoff et al. (2022), MTEB: Massive Text Embedding Benchmark", url: "https://arxiv.org/abs/2210.07316", kind: "paper" },
    { title: "Hugging Face: ranking do MTEB", url: "https://huggingface.co/spaces/mteb/leaderboard", kind: "docs" },
    {
      title: "Hugging Face: cartão do modelo all-MiniLM-L6-v2",
      url: "https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2",
      kind: "docs",
    },
  ],
};

export default lesson;
