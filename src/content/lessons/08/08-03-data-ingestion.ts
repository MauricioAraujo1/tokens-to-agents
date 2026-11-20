import type { LessonContent } from "../../../types/content";

// Ingestão de dados com contas no arquivo. Passo 3: um hash FNV-1a de 32 bits, calculado aqui, sobre o
// texto bruto e sobre o texto normalizado de cinco documentos de RH, para achar duplicatas. Passo 4: a
// comparação de hashes entre a carga de ontem e a de hoje (novos, alterados, apagados) e um log de
// mudanças de brinquedo numa base de 1.000 documentos, para comparar reindexar tudo com indexar só o que mudou.

const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

/** FNV-1a de 32 bits: para cada byte, XOR e multiplicação pelo primo 16777619. */
function fnv1a(text: string): string {
  let hash = 0x811c9dc5;
  for (const byte of new TextEncoder().encode(text)) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
const normalize = (text: string) => text.normalize("NFC").toLowerCase().replace(/\s+/g, " ").trim();

interface SourceDocument {
  id: string;
  text: string;
}

// Passo 3: a carga de ontem. A cópia das férias tem espaços sobrando: mesmo conteúdo, bytes diferentes.
const yesterday: SourceDocument[] = [
  { id: "ferias.pdf", text: "Férias podem ser divididas em até três períodos." },
  { id: "ferias-copia.pdf", text: "Férias  podem ser divididas em até três períodos. " },
  { id: "home-office", text: "O home office é permitido até três dias por semana." },
  { id: "reembolso", text: "O reembolso de despesas exige nota fiscal." },
  { id: "ticket-4812", text: "Como peço reembolso de táxi?" },
];
const ORIGINAL = 0;
const COPY = 1;
const rawHashes = yesterday.map((document) => fnv1a(document.text));
const normalizedHashes = yesterday.map((document) => fnv1a(normalize(document.text)));
const uniqueContents = new Set(normalizedHashes).size;
const duplicateIndexes = normalizedHashes
  .map((hash, index) => (normalizedHashes.indexOf(hash) !== index || normalizedHashes.lastIndexOf(hash) !== index ? index : -1))
  .filter((index) => index >= 0);

// Passo 4: a carga de hoje. O reembolso mudou, o ticket foi apagado e entrou um documento novo.
const today: SourceDocument[] = [
  yesterday[0],
  yesterday[1],
  yesterday[2],
  { id: "reembolso", text: "O reembolso de despesas exige nota fiscal em até 30 dias." },
  { id: "vale-refeicao", text: "O vale-refeição é creditado no primeiro dia útil." },
];
const indexed = new Map(yesterday.map((document) => [document.id, fnv1a(normalize(document.text))]));
const current = new Map(today.map((document) => [document.id, fnv1a(normalize(document.text))]));
const added = [...current.keys()].filter((id) => !indexed.has(id));
const changed = [...current.keys()].filter((id) => indexed.has(id) && indexed.get(id) !== current.get(id));
const deleted = [...indexed.keys()].filter((id) => !current.has(id));
const unchanged = [...current.keys()].filter((id) => indexed.get(id) === current.get(id));

// Passo 4: base de 1.000 documentos com um log de mudanças por dia (números de brinquedo).
const INITIAL_CORPUS = 1000;
const changeLog = [
  { day: "dia 2", added: 12, changed: 30, deleted: 5 },
  { day: "dia 3", added: 8, changed: 22, deleted: 3 },
  { day: "dia 4", added: 15, changed: 41, deleted: 6 },
  { day: "dia 5", added: 5, changed: 18, deleted: 2 },
  { day: "dia 6", added: 10, changed: 25, deleted: 4 },
];
const incremental = changeLog.map((entry) => entry.added + entry.changed);
const corpusSizes = changeLog.reduce<number[]>(
  (sizes, entry) => [...sizes, (sizes[sizes.length - 1] ?? INITIAL_CORPUS) + entry.added - entry.deleted],
  [],
);
const fullTotal = sum(corpusSizes);
const incrementalTotal = sum(incremental);
const savedShare = 1 - incrementalTotal / fullTotal;
const deletedTotal = sum(changeLog.map((entry) => entry.deleted));
const percent = (value: number) => `${Math.round(value * 100)}%`;

const stages = [
  { id: "connect", label: "conectar" },
  { id: "extract", label: "extrair" },
  { id: "clean", label: "limpar" },
  { id: "dedupe", label: "deduplicar" },
  { id: "chunk", label: "chunking" },
  { id: "embed", label: "embedding" },
  { id: "index", label: "indexar" },
];

const lesson: LessonContent = {
  id: "08-03",
  subtitle: "Como os documentos saem das fontes e chegam ao índice: limpar, achar duplicatas e atualizar só o que mudou.",
  objectives: [
    "Listar as etapas de um pipeline de ingestão, da fonte ao índice",
    "Usar um hash de conteúdo para achar duplicatas e mudanças",
    "Comparar reindexar tudo com indexação incremental",
    "Propagar exclusões para o índice não citar documentos que já não existem",
  ],
  steps: [
    {
      id: "receiving",
      shortTitle: "Recebimento",
      title: "O balcão de recebimento da biblioteca",
      tag: "context",
      body: [
        "Uma biblioteca não coloca na estante o que chega pelo correio. Primeiro tudo passa pelo balcão de recebimento: abrir a caixa, ver se o livro já existe no acervo, catalogar e só então guardar. Num RAG, esse balcão é a [[ingestão de dados|data-ingestion]].",
        "As fontes são variadas: arquivos num drive, páginas de uma wiki, tickets num banco SQL. Cada uma tem um conector que lê o conteúdo e entrega numa fila de ingestão, que roda fora do caminho da pergunta, em lote ou a cada mudança. A pergunta do usuário só toca o índice pronto.",
      ],
      keyIdea: "A ingestão roda antes e longe da pergunta: ela decide o que existe para a busca encontrar.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "drive", kind: "cloud", label: "drive", col: 0, row: 0 },
              { id: "tickets", kind: "sql-db", label: "tickets", col: 0, row: 1 },
              { id: "queue", kind: "queue", label: "fila de ingestão", col: 1, row: 0.5 },
              { id: "index", kind: "vector-db", label: "índice", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "drive", to: "queue", label: "arquivos" },
              { from: "tickets", to: "queue", label: "linhas" },
              { from: "queue", to: "index", label: "chunks" },
            ],
            active: "queue",
          },
        ],
      },
      alt: "Arquivos de um drive e linhas de um banco de tickets entram numa fila de ingestão, em destaque, que entrega chunks ao índice.",
    },
    {
      id: "stages",
      shortTitle: "Etapas",
      title: "Sete etapas entre a fonte e o índice",
      tag: "mechanism",
      body: [
        "Do balcão até a estante, cada livro passa pelas mesmas mesas, sempre na mesma ordem. Na ingestão: conectar na fonte, extrair o texto, limpar, deduplicar, dividir em chunks, gerar embeddings e indexar. Pular uma mesa aparece depois, como uma resposta ruim.",
        "Limpar é normalizar: Unicode na forma NFC (o “é” composto e o “e” + acento viram o mesmo caractere), espaços repetidos, cabeçalhos e rodapés repetidos em toda página, menus de HTML. Junto com o texto, cada documento leva um id estável e os seus metadados (fonte, data, autor, permissões), que acompanham os chunks até a resposta.",
      ],
      keyIdea: "Ingestão é um pipeline de etapas fixas; o id estável e os metadados viajam junto do texto o caminho todo.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [{ id: "stages", piece: "pipeline", stages, active: "clean", done: ["connect", "extract"] }],
      },
      alt: "Pipeline com sete etapas: conectar, extrair, limpar, deduplicar, chunking, embedding e indexar. Conectar e extrair estão concluídas e limpar está ativa.",
    },
    {
      id: "hash",
      shortTitle: "Duplicatas",
      title: "Uma impressão digital para cada documento",
      tag: "mechanism",
      body: [
        `Alguém salvou “${yesterday[COPY].id}” no drive, uma cópia de “${yesterday[ORIGINAL].id}” com uns espaços a mais. Indexar as duas faz a busca devolver o mesmo trecho duas vezes e gastar duas vagas do top-k. Para achar duplicatas sem comparar textos inteiros, cada documento ganha um [[hash de conteúdo|content-hash]]: uma impressão digital curta.`,
        `A cena usa FNV-1a de 32 bits. No texto bruto, os hashes são ${rawHashes[ORIGINAL]} e ${rawHashes[COPY]}: diferentes, por causa dos espaços. Depois de normalizar (minúsculas, NFC, espaços colapsados), os dois dão ${normalizedHashes[ORIGINAL]}, e os ${yesterday.length} documentos viram ${uniqueContents} conteúdos únicos. Em produção, use um hash com 256 bits, como SHA-256: com 32 bits, colisões aparecem em bases grandes. Hash só acha cópias exatas; quase duplicatas pedem técnicas como MinHash.`,
      ],
      keyIdea: "Normalize antes de calcular o hash: senão um espaço a mais esconde uma duplicata.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "hashes",
            piece: "metrics-panel",
            metrics: [
              { id: "raw", label: "brutos", value: `${rawHashes[ORIGINAL]} ≠ ${rawHashes[COPY]}`, color: "danger" },
              { id: "normalized", label: "normalizados", value: `${normalizedHashes[ORIGINAL]} = ${normalizedHashes[COPY]}`, color: "success" },
              { id: "unique", label: "conteúdos únicos", value: `${uniqueContents} de ${yesterday.length}` },
            ],
            highlight: "normalized",
          },
          {
            id: "documents",
            piece: "token-stream",
            tokens: yesterday.map((document) => document.id),
            keys: duplicateIndexes,
            color: "module-08",
          },
        ],
      },
      alt: `Os ${yesterday.length} documentos de ontem, com ${yesterday[ORIGINAL].id} e ${yesterday[COPY].id} em destaque. Os hashes brutos diferem, ${rawHashes[ORIGINAL]} e ${rawHashes[COPY]}, mas os normalizados são iguais, ${normalizedHashes[ORIGINAL]}.`,
    },
    {
      id: "incremental",
      shortTitle: "Incremental",
      title: "Hoje só entra o que mudou",
      tag: "example",
      body: [
        `Comparando o hash de ontem com o de hoje, documento a documento: ${unchanged.length} continuam iguais, “${changed.join(", ")}” mudou, “${added.join(", ")}” é novo e “${deleted.join(", ")}” sumiu. Só ${added.length + changed.length} documentos precisam de chunking e embedding, e ${deleted.length} precisa sair do índice. Isso é [[indexação incremental|incremental-indexing]].`,
        `Numa base de ${integer(INITIAL_CORPUS)} documentos, com o log de mudanças da cena, reindexar tudo nos dias 2 a 6 processaria ${integer(fullTotal)} documentos; o incremental processa ${integer(incrementalTotal)}, ${percent(savedShare)} a menos de embeddings pagos. A conta só fecha se o id for estável: se o conector gera um id novo a cada leitura, todo documento parece novo.`,
      ],
      keyIdea: "Guarde id → hash do que já está no índice; a cada carga, processe só os ids novos ou com hash diferente.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "totals",
            piece: "metrics-panel",
            metrics: [
              { id: "full", label: "reindexar tudo", value: `${integer(fullTotal)} docs`, color: "danger" },
              { id: "incremental", label: "incremental", value: `${integer(incrementalTotal)} docs`, color: "success" },
              { id: "saved", label: "economia", value: percent(savedShare) },
            ],
            highlight: "saved",
          },
          {
            id: "per-day",
            piece: "chart",
            kind: "bar",
            series: changeLog.map((entry, index) => ({ label: entry.day, value: incremental[index] })),
            highlight: incremental.indexOf(Math.max(...incremental)),
            color: "module-08",
          },
        ],
      },
      alt: `Documentos processados por dia na indexação incremental: ${changeLog.map((entry, index) => `${entry.day} ${incremental[index]}`).join(", ")}. No total, ${integer(incrementalTotal)} contra ${integer(fullTotal)} reindexando tudo.`,
    },
    {
      id: "deletes",
      shortTitle: "Exclusões",
      title: "O documento apagado que continua respondendo",
      tag: "tradeoff",
      body: [
        "Tirar um livro do catálogo e esquecer de tirá-lo da estante: alguém ainda vai achá-lo. Se a ingestão só faz upsert (inserir ou atualizar), um documento apagado na fonte deixa chunks órfãos no índice, e o assistente continua citando uma política revogada.",
        `Por isso o sync compara os ids do índice com os da fonte e apaga os que sumiram: no log da cena, ${integer(deletedTotal)} exclusões em cinco dias. O mesmo vale para permissões: se um documento ficou restrito, os seus chunks precisam mudar de permissão no índice também. O preço de tudo isso é manter um registro de id, hash e data de cada documento.`,
      ],
      keyIdea: "Ingestão incremental tem três operações, não duas: inserir, atualizar e apagar.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "sync",
            piece: "block-diagram",
            blocks: [
              { id: "wiki", kind: "documents", label: "wiki", col: 0, row: 0 },
              { id: "log", kind: "queue", label: "log de mudanças", col: 1, row: 0 },
              { id: "index", kind: "vector-db", label: "índice", col: 2, row: 0 },
              { id: "orphan", kind: "no-result", label: "chunk órfão", col: 2, row: 1 },
            ],
            edges: [
              { from: "wiki", to: "log", label: "mudanças" },
              { from: "log", to: "index", label: "upsert" },
              { from: "log", to: "orphan", label: "delete esquecido", variant: "alternative" },
            ],
            active: "orphan",
          },
        ],
      },
      alt: "A wiki manda mudanças para um log, que faz upsert no índice; pelo caminho tracejado, um delete esquecido deixa um chunk órfão, em destaque.",
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Da fonte ao índice, só uma vez por mudança",
      tag: "summary",
      body: [
        "A ingestão lê as fontes, limpa, deduplica pelo hash do conteúdo normalizado, divide em chunks, gera embeddings e grava no índice. Depois da primeira carga, ela trabalha pelas diferenças: novos, alterados e apagados.",
        "Uma etapa ficou para a próxima aula: extrair texto de verdade de um PDF, com colunas, tabelas e páginas escaneadas. É o parsing de documentos.",
      ],
      keyIdea: "Ingestão boa é repetível: rodar duas vezes com as mesmas fontes não muda nada no índice.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "drive", kind: "cloud", label: "drive", col: 0, row: 0 },
              { id: "tickets", kind: "sql-db", label: "tickets", col: 0, row: 1 },
              { id: "queue", kind: "queue", label: "fila de ingestão", col: 1, row: 0.5 },
              { id: "embed", kind: "embedding", label: "embeddings", col: 2, row: 0.5 },
              { id: "index", kind: "vector-db", label: "índice", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "drive", to: "queue", label: "arquivos" },
              { from: "tickets", to: "queue", label: "linhas" },
              { from: "queue", to: "embed", label: "só o que mudou" },
              { from: "embed", to: "index", label: "upsert e delete" },
            ],
            active: "index",
            done: ["drive", "tickets", "queue", "embed"],
          },
        ],
      },
      alt: "Fluxo completo: drive e tickets entram na fila de ingestão, só o que mudou vai para os embeddings, e o índice, em destaque, recebe upserts e deletes.",
    },
  ],
  realWorldExample:
    "O IngestionPipeline do LlamaIndex, quando recebe um docstore, guarda o hash de cada documento pelo id: na carga seguinte, pula os que não mudaram e reprocessa os alterados. A Indexing API do LangChain faz o mesmo com um record manager, que também apaga do vector store os documentos que sumiram da fonte.",
  code: {
    language: "python",
    source: `import hashlib

def fingerprint(text: str) -> str:
    normalized = " ".join(text.lower().split())
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()

def plan_sync(indexed: dict[str, str], current: dict[str, str]):
    """indexed: id -> hash já no índice; current: id -> texto lido agora da fonte."""
    hashes = {doc_id: fingerprint(text) for doc_id, text in current.items()}
    upsert = [doc_id for doc_id, h in hashes.items() if indexed.get(doc_id) != h]
    delete = [doc_id for doc_id in indexed if doc_id not in current]
    return upsert, delete`,
    caption: "O plano de sincronização da aula: hash do texto normalizado por id, upsert do que é novo ou mudou e delete do que sumiu.",
  },
  tradeOffs: {
    pros: [
      "Indexação incremental paga embeddings só do que mudou",
      "Deduplicar evita trechos repetidos ocupando o top-k",
      "Um registro de id e hash deixa a carga repetível e auditável",
    ],
    cons: [
      "Exige ids estáveis em todas as fontes, o que nem todo conector oferece",
      "Hash acha só cópias exatas; quase duplicatas passam",
      "Exclusões e mudanças de permissão precisam de um caminho próprio até o índice",
    ],
    alternatives: [
      "Reindexar tudo todo dia, quando a base é pequena e o custo é baixo",
      "Ingestão por eventos (webhooks da fonte), para atualizar em minutos em vez de por lote",
      "MinHash ou similaridade de embeddings para achar quase duplicatas",
    ],
  },
  knowledgeCheck: [
    {
      id: "unstable-id",
      prompt: "Depois de ativar a indexação incremental, toda carga diária ainda reprocessa todos os documentos. Qual é a causa mais provável?",
      options: [
        "O modelo de embedding é lento",
        "O conector gera um id diferente para o mesmo documento a cada leitura",
        "O índice vetorial está cheio",
        "O hash é calculado depois do chunking",
      ],
      correct: 1,
      explanation: "A comparação é id → hash. Com id novo a cada leitura, nenhum documento é reconhecido, e todos parecem novos.",
      lesson: "08-03",
    },
    {
      id: "revoked-policy",
      prompt: "Uma política foi apagada da wiki há uma semana, mas o assistente ainda a cita. O que faltou na ingestão?",
      options: [
        "Normalizar o texto antes do hash",
        "Aumentar o top-k",
        "Propagar a exclusão: apagar do índice os chunks dos ids que sumiram da fonte",
        "Trocar o modelo de embedding",
      ],
      correct: 2,
      explanation: "Um pipeline que só faz upsert nunca remove nada. Os chunks órfãos continuam no índice e continuam sendo recuperados.",
      lesson: "08-03",
    },
  ],
  related: ["08-02", "08-04", "06-10"],
  references: [
    { title: "LlamaIndex: documentação", url: "https://docs.llamaindex.ai/", kind: "docs" },
    { title: "LangChain: documentação", url: "https://python.langchain.com/", kind: "docs" },
    {
      title: "Gao et al. (2023), Retrieval-Augmented Generation for Large Language Models: A Survey",
      url: "https://arxiv.org/abs/2312.10997",
      kind: "paper",
    },
  ],
};

export default lesson;
