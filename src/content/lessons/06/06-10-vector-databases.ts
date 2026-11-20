import type { LessonContent } from "../../../types/content";

// Banco vetorial com contas reais: o registro (id, vetor e payload), o tamanho de uma coleção de 50 milhões
// de vetores, quantos shards e nós ela pede sob uma suposição explícita de memória por nó, e a junção dos
// top-3 de cada shard no top-3 global. As suposições estão nomeadas nas constantes abaixo.

const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");

// Passo 2: um registro.
const D = 768;
const record = {
  id: "manual-rh#12",
  dims: D,
  payload: { tenant: "acme", idioma: "pt", atualizado: "2026-10-02" },
  model: "multilingual-e5-small",
};

// Passo 4: dimensionamento. Suposição: nós com 64 GB, dos quais no máximo 50 GB para vetores e grafo.
const VECTORS = 50_000_000;
const FLOAT32 = 4;
const HNSW_M = 16;
const LINK_BYTES = 4;
const GB = 1e9;
const NODE_BUDGET_GB = 50;
const REPLICAS = 2;
const vectorsGb = (VECTORS * D * FLOAT32) / GB;
const graphGb = (VECTORS * 2 * HNSW_M * LINK_BYTES) / GB;
const totalGb = vectorsGb + graphGb;
const shards = Math.ceil(totalGb / NODE_BUDGET_GB);
const nodes = shards * REPLICAS;

// Passo 5: cada shard devolve o seu top-3; o roteador junta e corta no top-3 global.
const K = 3;
const shardResults = [
  { shard: "s1", hits: [{ id: "doc 17", score: 0.91 }, { id: "doc 4", score: 0.87 }, { id: "doc 33", score: 0.8 }] },
  { shard: "s2", hits: [{ id: "doc 52", score: 0.88 }, { id: "doc 61", score: 0.79 }, { id: "doc 70", score: 0.77 }] },
  { shard: "s3", hits: [{ id: "doc 90", score: 0.86 }, { id: "doc 85", score: 0.83 }, { id: "doc 99", score: 0.75 }] },
];
const merged = shardResults
  .flatMap((result) => result.hits.map((hit) => ({ ...hit, shard: result.shard })))
  .sort((a, b) => b.score - a.score);
const globalTop = merged.slice(0, K);
const kthScore = globalTop[K - 1].score;
const shardsInTop = new Set(globalTop.map((hit) => hit.shard)).size;

const lesson: LessonContent = {
  id: "06-10",
  subtitle:
    "O que um banco vetorial acrescenta a um índice: registros com metadados, escrita durável, atualização, shards, réplicas e controle de acesso. E como escolher entre um banco dedicado, o pgvector e um serviço gerenciado.",
  objectives: [
    "Diferenciar uma biblioteca de índice (como o FAISS) de um banco vetorial",
    "Descrever um registro: id, vetor e payload, e a operação de upsert",
    "Dimensionar uma coleção grande em memória, shards e réplicas",
    "Explicar como um banco junta os resultados de vários shards num top-k global",
  ],
  steps: [
    {
      id: "beyond-index",
      shortTitle: "Além do índice",
      title: "Um índice é o motor; o banco é o carro inteiro",
      tag: "context",
      body: [
        "O FAISS é um motor excelente: guarda vetores na memória e busca rápido. Mas uma aplicação precisa do carro inteiro: salvar os dados sem perder nada se o servidor cair, atualizar um documento, apagar outro, filtrar por cliente, servir muitas consultas ao mesmo tempo e controlar quem lê o quê.",
        "Um [[banco vetorial|vector-database]] junta essas peças em volta do índice: uma API com autenticação, um log de escrita para durabilidade, o índice aproximado para a busca e o armazenamento dos metadados de cada vetor. Exemplos: Qdrant, Weaviate, Milvus, Pinecone (gerenciado) e o Postgres com a extensão pgvector.",
      ],
      keyIdea: "Banco vetorial = índice ANN + persistência + atualização + metadados + escala + segurança.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "app", kind: "app", label: "aplicação", col: 0, row: 0.5 },
              { id: "api", kind: "server", label: "API + auth", col: 1, row: 0.5 },
              { id: "wal", kind: "queue", label: "log de escrita", col: 2, row: 0 },
              { id: "index", kind: "retrieval", label: "índice ANN", col: 2, row: 1 },
              { id: "store", kind: "vector-db", label: "vetores + payload", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "app", to: "api", label: "upsert / busca" },
              { from: "api", to: "wal", label: "escrita" },
              { from: "wal", to: "store" },
              { from: "api", to: "index", label: "consulta" },
              { from: "index", to: "store", label: "ids" },
            ],
            active: "api",
          },
        ],
      },
      alt: "A aplicação fala com a API do banco, em destaque. Escritas passam pelo log e chegam ao armazenamento de vetores e payload; consultas vão ao índice ANN, que aponta para os registros.",
    },
    {
      id: "record",
      shortTitle: "Registro",
      title: "Cada registro: id, vetor e payload",
      tag: "mechanism",
      body: [
        `Os vetores moram numa [[coleção|vector-collection]], que fixa a dimensão (${D}, na cena) e a métrica. Cada registro tem um id estável, o vetor e um payload: os metadados que você quer filtrar ou devolver, como o cliente, o idioma e a data de atualização. Guarde também o nome do modelo que gerou o vetor; ele salva a migração da aula 06-03.`,
        `A escrita típica é o [[upsert|upsert]]: insere se o id não existe, substitui se existe. Com ids estáveis, como “${record.id}”, reprocessar um documento editado não cria duplicatas: o vetor novo toma o lugar do antigo. Ids aleatórios a cada carga são a origem clássica de resultados repetidos.`,
      ],
      keyIdea: "Registro = id estável + vetor + payload. Upsert por id mantém a coleção sem duplicatas.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "record",
            piece: "metrics-panel",
            metrics: [
              { id: "id", label: "id", value: record.id, color: "module-06" },
              { id: "vector", label: "vetor", value: `${record.dims} números` },
              { id: "tenant", label: "payload.tenant", value: record.payload.tenant },
              { id: "lang", label: "payload.idioma", value: record.payload.idioma },
              { id: "updated", label: "payload.atualizado", value: record.payload.atualizado },
              { id: "model", label: "payload.modelo", value: record.model },
            ],
            highlight: "id",
          },
        ],
      },
      alt: `Um registro com id ${record.id}, um vetor de ${record.dims} números e o payload: tenant ${record.payload.tenant}, idioma ${record.payload.idioma}, data de atualização e modelo ${record.model}.`,
    },
    {
      id: "write-path",
      shortTitle: "Escrita",
      title: "O caminho de uma escrita até a busca",
      tag: "mechanism",
      body: [
        "Uma escrita não vai direto para o grafo do índice. Primeiro entra num log de escrita (write-ahead log), que garante que nada se perde se o processo cair. Depois vai para um segmento novo, pequeno, e só mais tarde um processo em segundo plano constrói ou atualiza o índice aproximado daquele segmento. O Qdrant, por exemplo, documenta esse desenho com WAL e segmentos.",
        "Por isso vale ler a documentação sobre consistência: um vetor recém-escrito pode demorar um pouco para aparecer na busca, ou aparecer por uma busca exata no segmento ainda sem índice. Cargas grandes costumam ser mais rápidas em lote, com a indexação adiada até o fim.",
      ],
      keyIdea: "Escrita: log → segmento → índice em segundo plano. Durável na hora, indexada um pouco depois.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "write",
            piece: "pipeline",
            stages: [
              { id: "upsert", label: "upsert" },
              { id: "wal", label: "log de escrita" },
              { id: "segment", label: "segmento novo" },
              { id: "index", label: "índice em 2º plano", color: "module-06" },
              { id: "visible", label: "visível na busca ANN" },
            ],
            active: "index",
            done: ["upsert", "wal", "segment"],
          },
        ],
      },
      alt: "Pipeline de uma escrita: upsert, log de escrita, segmento novo, indexação em segundo plano em destaque e, por fim, visível na busca aproximada.",
    },
    {
      id: "shards",
      shortTitle: "Shards",
      title: "Quando não cabe numa máquina",
      tag: "mechanism",
      body: [
        `Faça a conta para ${integer(VECTORS / 1e6)} milhões de vetores de ${D} dimensões: ${fixed(vectorsGb, 1)} GB só de vetores em float32, mais ${fixed(graphGb, 1)} GB das ligações de um HNSW com M = ${HNSW_M}, total de ${fixed(totalGb, 1)} GB. Supondo nós de 64 GB com até ${NODE_BUDGET_GB} GB para isso, são ${shards} shards. Com ${REPLICAS} réplicas de cada, para aguentar a queda de um nó, ${nodes} nós.`,
        "Um shard é uma fatia da coleção; cada vetor mora em um shard, escolhido pelo id ou por uma chave como o cliente. Na consulta, o roteador manda a pergunta a todos os shards em paralelo, e a latência final é a do shard mais lento. Réplicas dividem as leituras e mantêm o serviço no ar quando um nó cai.",
      ],
      keyIdea: "Shards dividem os dados; réplicas copiam. A consulta vai a todos os shards e espera o mais lento.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "app", kind: "app", label: "aplicação", col: 0, row: 0.5 },
              { id: "router", kind: "server", label: "roteador", col: 1, row: 0.5 },
              { id: "s1", kind: "vector-db", label: "shard 1", col: 2, row: 0 },
              { id: "s2", kind: "vector-db", label: "shard 2", col: 2, row: 1 },
              { id: "merge", kind: "retrieval", label: "juntar top-k", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "app", to: "router", label: "consulta" },
              { from: "router", to: "s1" },
              { from: "router", to: "s2" },
              { from: "s1", to: "merge", label: "top-k" },
              { from: "s2", to: "merge", label: "top-k" },
            ],
            active: "router",
          },
          {
            id: "sizing",
            piece: "metrics-panel",
            metrics: [
              { id: "total", label: "vetores + grafo", value: `${fixed(totalGb, 1)} GB` },
              { id: "shards", label: `shards (até ${NODE_BUDGET_GB} GB cada)`, value: String(shards), color: "module-06" },
              { id: "nodes", label: `nós com ${REPLICAS} réplicas`, value: String(nodes) },
            ],
            highlight: "shards",
          },
        ],
      },
      alt: `O roteador, em destaque, manda a consulta aos shards e junta os top-k. Para ${integer(VECTORS / 1e6)} milhões de vetores: ${fixed(totalGb, 1)} GB, ${shards} shards e ${nodes} nós com ${REPLICAS} réplicas.`,
    },
    {
      id: "merge",
      shortTitle: "Juntar",
      title: "Juntar os top-k dos shards",
      tag: "example",
      body: [
        `Cada shard devolve o seu top-${K}, e o roteador junta as ${merged.length} respostas, ordena e corta. Na cena, o top-${K} global é ${globalTop.map((hit) => `${hit.id} (${hit.shard}, ${fixed(hit.score)})`).join(", ")}: vem de ${shardsInTop} shards diferentes. O shard 1 contribuiu com dois resultados, e até o melhor resultado do shard 3, ${fixed(shardResults[2].hits[0].score)}, ficou de fora.`,
        `Por que pedir só ${K} a cada shard funciona: se um documento está entre os ${K} melhores no total, ele também está entre os ${K} melhores do seu próprio shard. A junção é exata em relação ao que cada shard devolveu. Se cada shard usa um índice aproximado, a aproximação de cada um continua lá, e alguns bancos pedem um pouco mais que k a cada shard para compensar.`,
      ],
      keyIdea: "Top-k global = top-k da união dos top-k locais. Basta pedir k a cada shard.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "merged",
            piece: "chart",
            kind: "bar",
            series: merged.map((hit) => ({ label: `${hit.shard}: ${hit.id}`, value: hit.score })),
            max: 1,
            cutoff: { mode: "threshold", value: kthScore, label: `top-${K} global` },
            color: "module-06",
          },
        ],
      },
      alt: `Os ${merged.length} resultados dos 3 shards ordenados por score, com a linha do top-${K} global: ${globalTop.map((hit) => `${hit.id} do ${hit.shard}`).join(", ")}.`,
    },
    {
      id: "choose",
      shortTitle: "Escolher",
      title: "Banco dedicado, pgvector ou serviço gerenciado",
      tag: "tradeoff",
      body: [
        "Se os seus dados já moram no Postgres, o pgvector põe os vetores na mesma tabela: transações, JOINs, backup e permissões que você já conhece, com índices HNSW e IVFFlat. Bancos dedicados, como Qdrant, Weaviate e Milvus, focam em busca vetorial em escala, com filtros por payload integrados ao índice, shards e quantização. Serviços gerenciados, como o Pinecone, tiram a operação das suas mãos em troca de custo e de depender do fornecedor.",
        "Não existe resposta universal: decida pelo volume, pelos filtros que você precisa, pela equipe que vai operar e pelo custo, e meça a latência e o recall com os seus dados. A próxima aula aprofunda o recurso que mais diferencia esses bancos: filtrar por metadados sem estragar a busca.",
      ],
      keyIdea: "Escolha pelo que você já opera, pelo volume e pelos filtros. Meça com os seus dados antes de decidir.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "app", kind: "app", label: "aplicação", col: 0, row: 0.5 },
              { id: "pg", kind: "sql-db", label: "pgvector", col: 2, row: 0 },
              { id: "dedicated", kind: "vector-db", label: "banco dedicado", col: 2, row: 1 },
              { id: "managed", kind: "cloud", label: "gerenciado", col: 3, row: 0.5 },
              { id: "eval", kind: "eval", label: "medir recall", col: 1, row: 0.5 },
            ],
            edges: [
              { from: "app", to: "eval" },
              { from: "eval", to: "pg", label: "dados no postgres" },
              { from: "eval", to: "dedicated", label: "escala e filtros" },
              { from: "eval", to: "managed", label: "sem operar" },
            ],
            active: "eval",
          },
        ],
      },
      alt: "A aplicação mede recall e latência, em destaque, antes de escolher entre Postgres com pgvector, um banco vetorial dedicado ou um serviço gerenciado na nuvem.",
    },
  ],
  realWorldExample:
    "O README do pgvector resume a proposta de pôr vetores num banco relacional: guardar os vetores junto com o resto dos dados, com busca exata e aproximada (HNSW e IVFFlat), e manter as garantias do Postgres, como transações ACID, recuperação para um ponto no tempo e JOINs. Já o Qdrant documenta a arquitetura de um banco dedicado: coleções com métrica e dimensão fixas, payloads filtráveis, log de escrita e segmentos, shards e réplicas.",
  code: {
    language: "python",
    source: `from qdrant_client import QdrantClient, models

client = QdrantClient(url="http://localhost:6333")
client.create_collection(
    collection_name="manual",
    vectors_config=models.VectorParams(size=768, distance=models.Distance.COSINE),
)

vector = [0.0] * 768  # o vetor que o modelo de embedding gerou
client.upsert(
    collection_name="manual",
    points=[models.PointStruct(id=12, vector=vector, payload={"tenant": "acme", "idioma": "pt"})],
)

hits = client.query_points(collection_name="manual", query=vector, limit=3)`,
    caption: "Uma coleção no Qdrant com dimensão e métrica fixas, um upsert com id e payload, e uma busca pelos 3 mais próximos.",
  },
  tradeOffs: {
    pros: [
      "Durabilidade, atualização e apagamento por id, que um índice puro não oferece",
      "Metadados no mesmo registro, prontos para filtrar e devolver",
      "Shards e réplicas para crescer além de uma máquina e sobreviver a falhas",
    ],
    cons: [
      "Mais um sistema para operar, monitorar e pagar",
      "Escritas recentes podem demorar a aparecer na busca aproximada",
      "Cada consulta em shards espera o shard mais lento",
    ],
    alternatives: ["Uma biblioteca de índice (FAISS) embutida na aplicação, para dados estáticos", "Postgres com pgvector, quando os dados já estão lá"],
  },
  knowledgeCheck: [
    {
      id: "duplicates",
      prompt: "Toda noite um job reindexa o manual e gera ids aleatórios para cada trecho. Com o tempo, a busca devolve o mesmo trecho várias vezes. Qual é a correção?",
      options: [
        "Aumentar o k da busca",
        "Usar ids estáveis por trecho (por exemplo, documento + posição) e fazer upsert, que substitui o registro existente",
        "Trocar a métrica para produto escalar",
        "Apagar o banco toda semana",
      ],
      correct: 1,
      explanation: "Com ids aleatórios, cada carga cria registros novos ao lado dos antigos. Ids estáveis com upsert substituem o registro, e a coleção fica sem duplicatas.",
      lesson: "06-10",
    },
    {
      id: "shard-k",
      prompt: "Uma coleção tem 4 shards e a aplicação pede o top-5. Quantos resultados cada shard precisa devolver para a junção ser correta?",
      options: ["5 de cada shard", "2 de cada shard, porque 4 × 2 ≥ 5", "1 de cada shard", "Todos os vetores do shard"],
      correct: 0,
      explanation: "Os 5 melhores podem estar todos no mesmo shard. Pedindo o top-5 de cada um, o top-5 global está garantido dentro da união.",
      lesson: "06-10",
    },
  ],
  related: ["06-09", "06-11", "08-02"],
  references: [
    { title: "pgvector: busca vetorial no Postgres", url: "https://github.com/pgvector/pgvector", kind: "repo" },
    { title: "Qdrant: documentação", url: "https://qdrant.tech/documentation/", kind: "docs" },
    { title: "Pinecone Learn: What is a Vector Database?", url: "https://www.pinecone.io/learn/vector-database/", kind: "article" },
  ],
};

export default lesson;
