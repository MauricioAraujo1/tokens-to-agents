import { cosineSimilarity } from "../../../lab/embeddings";
import { embed, tokenize } from "../../../lab/retrieval";
import type { LessonContent } from "../../../types/content";

// Geração de embeddings com contas no arquivo. Os "embeddings" são de brinquedo: cada palavra conhecida soma
// um vetor de conceito com 4 dimensões [home office, folga, reembolso, quantidade], como no playground de BM25
// vs. busca vetorial. Daí saem: o número de chamadas com e sem lote, a norma e o cosseno de vetores de tamanhos
// diferentes, o empate de dois chunks sem contexto e o desempate quando cada um ganha a frase do seu documento
// (contextual retrieval), e a memória de 100 mil vetores em float32 para cada dimensão.

const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");

// Passo 2: a base do assistente de RH em chunks, mandada em lotes para a API de embedding.
const CHUNKS = 12_000;
const BATCH_SIZE = 100;
const TOKENS_PER_CHUNK = 250;
const requestsOneByOne = CHUNKS;
const requestsBatched = Math.ceil(CHUNKS / BATCH_SIZE);
const totalTokens = CHUNKS * TOKENS_PER_CHUNK;

// Passo 3: dois chunks do mesmo assunto, um curto e um longo, e a pergunta.
const norm = (vector: readonly number[]) => Math.hypot(...vector);
const dotProduct = (a: readonly number[], b: readonly number[]) => a.reduce((sum, value, index) => sum + value * b[index], 0);
const shortChunk = [0.8, 0.4];
const longChunk = shortChunk.map((value) => value * 3);
const queryVector = [1.5, 1];
const normalize = (vector: readonly number[]) => vector.map((value) => value / norm(vector));
const shortUnit = normalize(shortChunk);
const shortDot = dotProduct(shortChunk, queryVector);
const longDot = dotProduct(longChunk, queryVector);
const shortCosine = cosineSimilarity(shortChunk, queryVector);
const longCosine = cosineSimilarity(longChunk, queryVector);

// Passo 4: contextual retrieval com embeddings de brinquedo.
const stopwords = new Set(["o", "a", "e", "de", "do", "da", "por", "para", "em", "no", "na", "um", "uma", "com"]);
const DIMS = 4;
const concepts: Record<string, number[]> = {
  home: [1, 0, 0, 0],
  office: [1, 0, 0, 0],
  folgas: [0, 0.8, 0, 0],
  reembolso: [0, 0, 1, 0],
  limite: [0, 0, 0, 1],
  quantos: [0, 0, 0, 0.5],
  dias: [0, 0.4, 0, 0.6],
  semana: [0, 0, 0, 0.5],
};
const vectorOf = (text: string) => embed(tokenize(text, stopwords), concepts, DIMS);
const QUESTION = "Quantos dias de home office por semana?";
const question = vectorOf(QUESTION);
const HOME_CHUNK = "O limite é de 3 dias por semana.";
const LEAVE_CHUNK = "O limite é de 2 dias por semana.";
const HOME_CONTEXT = "Política de home office:";
const LEAVE_CONTEXT = "Política de folgas:";
const scoreOf = (text: string) => cosineSimilarity(vectorOf(text), question);
const homeBefore = scoreOf(HOME_CHUNK);
const leaveBefore = scoreOf(LEAVE_CHUNK);
const homeAfter = scoreOf(`${HOME_CONTEXT} ${HOME_CHUNK}`);
const leaveAfter = scoreOf(`${LEAVE_CONTEXT} ${LEAVE_CHUNK}`);
const tiedBefore = Math.abs(homeBefore - leaveBefore) < 1e-9;
const contextualWords = tokenize(`${HOME_CONTEXT} ${HOME_CHUNK}`, stopwords);
/** Quanto cada palavra do chunk com contexto empurra na direção da pergunta: o produto escalar com a pergunta normalizada. */
const wordPush = contextualWords.map((word) => Math.max(0, dotProduct(concepts[word] ?? [0, 0, 0, 0], normalize(question))));
const largestPush = Math.max(...wordPush, 1e-9);

// Passo 5: memória de 100 mil vetores em float32, por número de dimensões.
const STORED_CHUNKS = 100_000;
const FLOAT32_BYTES = 4;
const MB = 1e6;
const dimensions = [384, 768, 1024, 1536, 3072];
const storageMB = (dims: number) => (STORED_CHUNKS * dims * FLOAT32_BYTES) / MB;
const MODEL_DIMS = 384;

const lesson: LessonContent = {
  id: "08-07",
  subtitle: "Como cada chunk vira um vetor: lotes, normalização, o mesmo modelo para perguntas e documentos e o contexto que desfaz empates.",
  objectives: [
    "Montar a geração de embeddings da base em lotes e estimar o número de chamadas",
    "Explicar por que normalizar os vetores faz o produto escalar virar cosseno",
    "Usar contextual retrieval para dar a um chunk o assunto do documento de onde ele veio",
    "Planejar a memória do índice e a reindexação quando o modelo muda",
  ],
  steps: [
    {
      id: "stamp",
      shortTitle: "Coordenadas",
      title: "Cada ficha ganha um endereço no mapa",
      tag: "context",
      body: [
        "Imagine carimbar em cada ficha da biblioteca a coordenada de um mapa de assuntos: fichas sobre home office ficam num bairro, fichas sobre reembolso em outro. Depois, para achar uma ficha, basta saber em que ponto do mapa a pergunta cai e olhar em volta. Gerar embeddings é carimbar essas coordenadas em cada [[chunk|chunk]] da base.",
        `O [[modelo de embedding|embedding-model]] lê o texto do chunk e devolve um vetor de tamanho fixo, o [[embedding|embedding]]. No assistente de RH, a base tem ${integer(CHUNKS)} chunks. Cada um passa uma vez pelo modelo na ingestão, e os vetores vão para o [[banco vetorial|vector-database]] junto com o texto e os metadados. A pergunta passa pelo mesmo modelo na hora da busca.`,
      ],
      keyIdea: "Embedding é a coordenada do chunk no mapa de significados; a busca compara coordenadas, não palavras.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "chunks", kind: "documents", label: `${integer(CHUNKS)} chunks`, col: 0, row: 0 },
              { id: "batches", kind: "queue", label: "lotes", col: 1, row: 0 },
              { id: "model", kind: "embedding", label: "modelo", col: 2, row: 0 },
              { id: "index", kind: "vector-db", label: "índice", col: 3, row: 0 },
            ],
            edges: [
              { from: "chunks", to: "batches", label: "texto" },
              { from: "batches", to: "model", label: `${BATCH_SIZE} por vez` },
              { from: "model", to: "index", label: "vetores" },
            ],
            active: "model",
            done: ["chunks", "batches"],
          },
        ],
      },
      alt: `Os ${integer(CHUNKS)} chunks entram numa fila de lotes, seguem ${BATCH_SIZE} por vez para o modelo de embedding, em destaque, e os vetores vão para o índice.`,
    },
    {
      id: "batching",
      shortTitle: "Lotes",
      title: "Mandar em lotes, não um por um",
      tag: "mechanism",
      body: [
        "Levar cartas ao correio uma de cada vez gasta mais viagem do que levar o malote inteiro. Com embeddings é igual: cada chamada à API tem um custo fixo de rede e de fila, e o modelo roda mais eficiente na GPU quando recebe vários textos juntos.",
        `Com ${integer(CHUNKS)} chunks e lotes de ${BATCH_SIZE}, a ingestão faz ${integer(requestsBatched)} chamadas em vez de ${integer(requestsOneByOne)}. O volume de texto não muda: a cerca de ${TOKENS_PER_CHUNK} tokens por chunk, são ${integer(totalTokens)} tokens de qualquer jeito, e é isso que a API cobra. As APIs limitam quantos textos e tokens cabem numa chamada, e uma carga grande precisa de nova tentativa com espera quando bate no limite de taxa.`,
      ],
      keyIdea: "O lote reduz chamadas, não tokens: o custo de embedding é o volume de texto da base.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "api",
            piece: "client-server",
            nodes: [
              { id: "ingest", label: "ingestão", role: "client" },
              { id: "queue", label: `${integer(requestsBatched)} lotes`, role: "queue", size: requestsBatched },
              { id: "model", label: "api de embedding", role: "model", utilization: 0.9 },
              { id: "db", label: "banco vetorial", role: "database" },
            ],
            messages: [
              { from: "ingest", to: "queue", label: `${integer(CHUNKS)} chunks` },
              { from: "queue", to: "model", label: `lote de ${BATCH_SIZE}` },
              { from: "model", to: "db", label: `${BATCH_SIZE} vetores` },
            ],
            active: 1,
          },
        ],
      },
      alt: `A ingestão divide ${integer(CHUNKS)} chunks em ${integer(requestsBatched)} lotes; cada lote de ${BATCH_SIZE} vai à API de embedding, muito ocupada, e volta como ${BATCH_SIZE} vetores para o banco vetorial.`,
    },
    {
      id: "normalize",
      shortTitle: "Normalizar",
      title: "Direção importa, comprimento não",
      tag: "mechanism",
      body: [
        "Duas setas que apontam para o mesmo lugar dizem a mesma coisa, mesmo que uma seja três vezes mais comprida. Na cena, o chunk curto e o chunk longo falam do mesmo assunto, e o vetor do longo é o do curto multiplicado por 3.",
        `O produto escalar com a pergunta muda com o comprimento: ${fixed(shortDot)} para o curto e ${fixed(longDot)} para o longo. A [[similaridade de cosseno|cosine-similarity]] divide pelas normas (${fixed(norm(shortChunk))} e ${fixed(norm(longChunk))}) e dá ${fixed(shortCosine, 3)} e ${fixed(longCosine, 3)}: o mesmo número. Por isso é comum normalizar cada vetor para norma 1 antes de gravar: o chunk curto vira (${shortUnit.map((value) => fixed(value)).join("; ")}), e a partir daí produto escalar e cosseno dão o mesmo número, que é a conta mais barata para o banco fazer.`,
      ],
      keyIdea: "Vetor normalizado: produto escalar = cosseno. Normalize na ingestão e na consulta, do mesmo jeito.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "space",
            piece: "vector-space",
            points: [
              { id: "short", label: "chunk curto", coords: [shortChunk[0], shortChunk[1]], color: "module-08" },
              { id: "long", label: "chunk longo", coords: [longChunk[0], longChunk[1]], color: "module-08" },
              { id: "unit", label: "curto normalizado", coords: [shortUnit[0], shortUnit[1]], color: "success" },
              { id: "query", label: "pergunta", coords: [queryVector[0], queryVector[1]], color: "brand" },
            ],
            vectors: [{ to: "short" }, { to: "long" }, { to: "unit" }, { to: "query" }],
          },
        ],
      },
      alt: `Quatro setas saindo da origem: o chunk curto, o chunk longo três vezes maior na mesma direção, o curto normalizado com norma 1 e a pergunta. Os dois chunks têm o mesmo cosseno com a pergunta, ${fixed(shortCosine, 3)}.`,
    },
    {
      id: "contextual",
      shortTitle: "Contexto",
      title: "Um chunk sem assunto não sabe de onde veio",
      tag: "example",
      body: [
        `Recorte de um manual a frase “${HOME_CHUNK}” e pergunte a alguém do que ela fala. Ninguém sabe: pode ser home office, folga ou vaga no estacionamento. O modelo de embedding passa pelo mesmo problema. Na base, o chunk da política de home office e o da política de folgas (“${LEAVE_CHUNK}”) dão ${fixed(homeBefore)} e ${fixed(leaveBefore)} para a pergunta “${QUESTION}”${tiedBefore ? ": empate exato" : ""}.`,
        `A técnica [[contextual retrieval|contextual-retrieval]], descrita pela Anthropic, acrescenta antes de cada chunk uma frase curta sobre o documento de onde ele veio, gerada por um LLM na ingestão, e só então calcula o embedding. Com “${HOME_CONTEXT}” na frente, o chunk certo sobe para ${fixed(homeAfter)}; o de folgas, com “${LEAVE_CONTEXT}”, fica em ${fixed(leaveAfter)}. As barras da cena mostram que o empurrão veio das palavras do contexto.`,
      ],
      keyIdea: "Dê ao chunk o assunto do documento antes de gerar o embedding: trechos parecidos deixam de empatar.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "scores",
            piece: "metrics-panel",
            metrics: [
              { id: "home-before", label: "home office, sem contexto", value: fixed(homeBefore) },
              { id: "leave-before", label: "folgas, sem contexto", value: fixed(leaveBefore) },
              { id: "home-after", label: "home office, com contexto", value: fixed(homeAfter), color: "success" },
              { id: "leave-after", label: "folgas, com contexto", value: fixed(leaveAfter) },
            ],
            highlight: "home-after",
          },
          {
            id: "words",
            piece: "token-stream",
            tokens: contextualWords,
            bars: wordPush.map((value) => value / largestPush),
            keys: contextualWords.flatMap((word, index) => (word === "home" || word === "office" ? [index] : [])),
            color: "module-08",
          },
        ],
      },
      alt: `Sem contexto, os chunks de home office e de folgas empatam em ${fixed(homeBefore)}. Com a frase do documento na frente, o de home office sobe para ${fixed(homeAfter)} e o de folgas fica em ${fixed(leaveAfter)}. As palavras home e office são as que mais puxam o chunk para a pergunta.`,
    },
    {
      id: "cost",
      shortTitle: "Memória",
      title: "Dimensões custam memória, e trocar de modelo custa tudo",
      tag: "tradeoff",
      body: [
        "Um mapa com mais eixos distingue mais nuances, mas cada ficha passa a carregar mais números. Modelos de embedding diferentes devolvem vetores de tamanhos diferentes, e esse tamanho multiplica a memória do índice inteiro.",
        `Em float32, cada número ocupa ${FLOAT32_BYTES} bytes. ${integer(STORED_CHUNKS)} chunks com ${dimensions[0]} dimensões ocupam ${integer(storageMB(dimensions[0]))} MB; com ${integer(dimensions[dimensions.length - 1])}, ${integer(storageMB(dimensions[dimensions.length - 1]))} MB, sem contar o índice ANN. E vetores de modelos diferentes não se comparam: trocar o modelo pede [[reindexação|reindexing]] da base inteira. Alguns modelos ainda esperam um prefixo diferente para cada lado, como “query:” e “passage:” na família E5, e esquecer o prefixo piora a busca sem dar erro nenhum.`,
      ],
      keyIdea: "Memória = chunks × dimensões × bytes. E o modelo da pergunta precisa ser o mesmo dos documentos.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "storage",
            piece: "chart",
            kind: "bar",
            series: dimensions.map((dims) => ({ label: `${dims} dim`, value: Math.round(storageMB(dims)) })),
            highlight: dimensions.indexOf(MODEL_DIMS),
            color: "module-08",
          },
        ],
      },
      alt: `Memória de ${integer(STORED_CHUNKS)} vetores em float32 por número de dimensões: ${dimensions.map((dims) => `${integer(dims)} dimensões, ${integer(storageMB(dims))} MB`).join("; ")}.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Um modelo, uma versão, os dois lados",
      tag: "summary",
      body: [
        "Juntando tudo: os chunks ganham o contexto do documento, vão em lotes para o modelo, saem normalizados e são gravados com o nome e a versão do modelo nos metadados. A pergunta passa pelo mesmo modelo, com o prefixo de consulta que ele espera e a mesma normalização.",
        "Gravar a versão é o que permite trocar de modelo sem misturar espaços: indexa-se tudo de novo ao lado e vira a chave quando terminar. A próxima aula usa esses vetores: como o índice encontra os vizinhos da pergunta e decide quais chunks voltam.",
      ],
      keyIdea: "Embeddings bons pedem consistência: mesmo modelo, mesma versão e mesma normalização na ingestão e na busca.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "chunks", kind: "documents", label: "chunks + contexto", col: 0, row: 0 },
              { id: "user", kind: "user", label: "pergunta", col: 0, row: 1 },
              { id: "model", kind: "embedding", label: "modelo v1", col: 1, row: 0.5 },
              { id: "index", kind: "vector-db", label: "vetores + versão", col: 2, row: 0.5 },
              { id: "search", kind: "retrieval", label: "busca", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "chunks", to: "model", label: "passage:" },
              { from: "user", to: "model", label: "query:" },
              { from: "model", to: "index", label: "normalizados" },
              { from: "index", to: "search" },
            ],
            active: "search",
            done: ["chunks", "user", "model", "index"],
          },
        ],
      },
      alt: "Os chunks com contexto e a pergunta passam pelo mesmo modelo de embedding, versão 1, com prefixos passage e query; os vetores normalizados vão para o índice com a versão e seguem para a busca, em destaque.",
    },
  ],
  realWorldExample:
    "A Anthropic publicou o Contextual Retrieval: um LLM escreve, para cada chunk, uma frase que o situa no documento, e essa frase é colocada antes do chunk no embedding e no índice BM25. No teste da empresa, os embeddings com contexto reduziram em 35% as falhas de recuperação no top-20, e somar o BM25 com contexto levou a redução a 49%. Para baratear a geração das frases, o documento inteiro fica em prompt caching e só o chunk muda a cada chamada.",
  code: {
    language: "python",
    source: `from sentence_transformers import SentenceTransformer

model = SentenceTransformer("intfloat/multilingual-e5-small")  # 384 dimensões

doc_context = "Política de home office"
chunks = ["O limite é de 3 dias por semana.", "O pedido é feito ao gestor."]

passages = [f"passage: {doc_context}: {text}" for text in chunks]
vectors = model.encode(passages, batch_size=100, normalize_embeddings=True)

query = model.encode(["query: quantos dias de home office por semana?"], normalize_embeddings=True)
print(vectors.shape)       # (2, 384)
print(vectors @ query[0])  # normalizados: produto escalar = cosseno`,
    caption: "Embeddings em lote, com o contexto do documento, os prefixos do E5 e normalização. A pergunta usa o mesmo modelo e o prefixo da consulta.",
  },
  tradeOffs: {
    pros: [
      "Gerar uma vez na ingestão deixa a busca barata: na consulta, só a pergunta vira vetor",
      "Lotes reduzem chamadas e aproveitam melhor a GPU",
      "Contexto do documento no chunk desfaz empates entre trechos parecidos",
    ],
    cons: [
      "Trocar o modelo de embedding obriga a reindexar a base inteira",
      "Mais dimensões multiplicam a memória e o custo de cada comparação",
      "Gerar o contexto de cada chunk com um LLM encarece a ingestão",
    ],
    alternatives: [
      "Modelos com menos dimensões ou vetores truncados, quando a memória pesa mais que a nuance",
      "Prefixar só o título e a seção do documento, sem LLM, quando a estrutura já diz o assunto",
      "Busca lexical ao lado da vetorial, quando termos exatos importam",
    ],
  },
  knowledgeCheck: [
    {
      id: "model-upgrade",
      prompt: "A equipe gerou os embeddings dos documentos com um modelo novo, mas a API de busca continua gerando o vetor da pergunta com o modelo antigo. O que acontece?",
      options: [
        "Nada: vetores de mesma dimensão são comparáveis",
        "A busca devolve resultados sem sentido, porque os dois modelos criam espaços diferentes; é preciso usar o mesmo modelo dos dois lados",
        "A busca fica mais lenta, mas os resultados são os mesmos",
        "O banco vetorial converte um espaço no outro sozinho",
      ],
      correct: 1,
      explanation: "Cada modelo aprende o seu próprio espaço. Mesmo com o mesmo número de dimensões, o cosseno entre vetores de modelos diferentes não mede sentido.",
      lesson: "08-07",
    },
    {
      id: "ambiguous-chunk",
      prompt: "Os chunks “O prazo é de 30 dias.” aparecem em três políticas diferentes e sempre empatam na busca. Qual mudança na geração de embeddings resolve melhor?",
      options: [
        "Aumentar o número de dimensões do modelo",
        "Gerar os embeddings um por um, sem lote",
        "Acrescentar antes de cada chunk o título ou uma frase sobre o documento de origem e gerar o embedding de novo",
        "Remover os números dos chunks",
      ],
      correct: 2,
      explanation: "O texto é idêntico, então qualquer modelo dá o mesmo vetor. O contexto do documento é o que diferencia os três trechos (contextual retrieval).",
      lesson: "08-07",
    },
  ],
  related: ["08-06", "08-08", "06-02"],
  references: [
    { title: "Anthropic (2024), Introducing Contextual Retrieval", url: "https://www.anthropic.com/news/contextual-retrieval", kind: "article" },
    { title: "Wang et al. (2022), Text Embeddings by Weakly-Supervised Contrastive Pre-training (E5)", url: "https://arxiv.org/abs/2212.03533", kind: "paper" },
    { title: "OpenAI: Vector embeddings", url: "https://platform.openai.com/docs/guides/embeddings", kind: "docs" },
  ],
};

export default lesson;
