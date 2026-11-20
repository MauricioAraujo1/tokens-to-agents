import { tokenize } from "../../../lab/retrieval";
import type { LessonContent } from "../../../types/content";
import { bm25VsVectorContent } from "../../playgrounds/bm25-vs-vector";

// Um índice invertido de verdade, construído aqui sobre o catálogo de uma loja de brinquedo, com as
// stopwords do playground do Laboratório. A interseção das posting lists é o merge clássico de duas
// listas ordenadas, e cada comparação que a cena mostra sai da função abaixo.

const stop = new Set(bm25VsVectorContent.stopwords);
const catalog = [
  "Tênis de corrida azul",
  "Camiseta de corrida",
  "Tênis casual branco",
  "Meia de corrida",
  "Camiseta azul básica",
  "Boné azul",
  "Tênis azul infantil",
  "Shorts de corrida azul",
];
const corpus = catalog.map((product) => tokenize(product, stop));
const docId = (index: number) => `p${index}`;

const index = new Map<string, number[]>();
corpus.forEach((words, document) => {
  for (const term of new Set(words)) index.set(term, [...(index.get(term) ?? []), document]);
});
const vocabulary = [...index.keys()];
const postings = (term: string) => index.get(term) ?? [];
const totalTokens = corpus.reduce((sum, words) => sum + words.length, 0);
const totalPostings = [...index.values()].reduce((sum, list) => sum + list.length, 0);
const cells = vocabulary.length * catalog.length;
const percent = (value: number) => `${Math.round(value * 100)}%`;

const incidence = vocabulary.map((term) => catalog.map((_, document) => (postings(term).includes(document) ? 1 : 0)));
const shared = vocabulary.filter((term) => postings(term).length > 1);

interface MergeStep {
  label: string;
  match: boolean;
}

/** Interseção de duas posting lists ordenadas, guardando cada comparação. */
function intersect(a: number[], b: number[]): { result: number[]; steps: MergeStep[] } {
  const result: number[] = [];
  const steps: MergeStep[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      steps.push({ label: `${docId(a[i])} = ${docId(b[j])}`, match: true });
      result.push(a[i]);
      i += 1;
      j += 1;
    } else if (a[i] < b[j]) {
      steps.push({ label: `${docId(a[i])} < ${docId(b[j])}`, match: false });
      i += 1;
    } else {
      steps.push({ label: `${docId(a[i])} > ${docId(b[j])}`, match: false });
      j += 1;
    }
  }
  return { result, steps };
}

const QUERY = "tênis azul";
const [first, second] = tokenize(QUERY, stop);
const merged = intersect(postings(first), postings(second));
const postingsRead = postings(first).length + postings(second).length;
const listOf = (term: string) => postings(term).map(docId).join(", ");

const lesson: LessonContent = {
  id: "07-03",
  subtitle: "A estrutura que deixa a busca lexical instantânea: para cada termo, a lista dos documentos onde ele aparece.",
  objectives: [
    "Construir um índice invertido a partir de uma coleção pequena",
    "Ler uma posting list e relacionar o tamanho dela à frequência do termo",
    "Intersectar duas posting lists ordenadas para responder uma consulta com E",
    "Explicar como o Lucene atualiza o índice com segmentos imutáveis",
  ],
  steps: [
    {
      id: "book-index",
      shortTitle: "Livro",
      title: "O índice remissivo do fim do livro",
      tag: "context",
      body: [
        "No fim de um livro técnico há um índice remissivo: “fotossíntese, páginas 12, 40, 87”. Para achar um assunto, você não folheia as 300 páginas; vai direto à palavra e lê os números. O índice foi montado uma vez, quando o livro ficou pronto, e serve a todas as leituras.",
        `O [[índice invertido|inverted-index]] é esse índice, feito para um buscador. Ele é “invertido” porque troca a direção: em vez de documento → palavras, guarda palavra → documentos. O catálogo da cena tem ${catalog.length} produtos; depois da indexação, cada um dos ${vocabulary.length} termos sabe em quais produtos aparece.`,
      ],
      keyIdea: "Índice invertido: o trabalho de ler tudo é feito uma vez, na indexação, e não a cada consulta.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "docs", kind: "documents", label: `catálogo (${catalog.length})`, col: 0, row: 0 },
              { id: "queue", kind: "queue", label: "indexação", col: 1, row: 0 },
              { id: "terms", kind: "tokens", label: `${vocabulary.length} termos`, col: 2, row: 0 },
              { id: "index", kind: "kv-cache", label: "índice invertido", col: 3, row: 0 },
            ],
            edges: [
              { from: "docs", to: "queue", label: "produtos" },
              { from: "queue", to: "terms", label: "analisador" },
              { from: "terms", to: "index", label: "termo → docs" },
            ],
            active: "index",
          },
        ],
      },
      alt: `Os ${catalog.length} produtos do catálogo entram na fila de indexação, passam pelo analisador, viram ${vocabulary.length} termos e chegam ao índice invertido, em destaque.`,
    },
    {
      id: "postings",
      shortTitle: "Postings",
      title: "Cada termo aponta para os seus documentos",
      tag: "mechanism",
      body: [
        `A lista de documentos de um termo é a [[posting list|posting-list]]. No catálogo, “azul” aponta para ${listOf("azul")}; “corrida”, para ${listOf("corrida")}; “tênis”, para ${listOf("tenis")}. A cena mostra os termos que aparecem em mais de um produto, ligados aos produtos onde estão.`,
        "As listas ficam ordenadas pelo id do documento, e isso não é detalhe: é o que permite juntar duas listas numa passada só. O tamanho da lista é a [[frequência de documento|document-frequency]] do termo, o número que o TF-IDF e o BM25 usam para saber se um termo é raro. Índices reais guardam também quantas vezes o termo aparece e em que posições, para busca por frase.",
      ],
      keyIdea: "Posting list = os ids dos documentos de um termo, em ordem. O tamanho dela diz o quão comum o termo é.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "postings",
            piece: "graph",
            nodes: [
              ...shared.map((term, row) => ({ id: term, label: term, x: 0.15, y: (row + 0.5) / shared.length, color: "module-07" as const })),
              ...catalog.map((_, document) => ({ id: docId(document), label: docId(document), x: 0.85, y: (document + 0.5) / catalog.length })),
            ],
            edges: shared.flatMap((term) => postings(term).map((document) => ({ from: term, to: docId(document) }))),
            highlight: ["azul", ...postings("azul").map(docId)],
          },
        ],
      },
      alt: `Grafo com os termos ${shared.join(", ")} à esquerda e os produtos p0 a p${catalog.length - 1} à direita; o termo azul, em destaque, liga-se a ${listOf("azul")}.`,
    },
    {
      id: "sparse",
      shortTitle: "Esparsa",
      title: "A tabela termo por documento é quase toda zero",
      tag: "mechanism",
      body: [
        `Escreva tudo numa tabela: uma linha por termo, uma coluna por produto, 1 onde o termo aparece. São ${cells} células, e só ${totalPostings} têm 1 (${percent(totalPostings / cells)}). Numa coleção real, com centenas de milhares de termos e milhões de documentos, cada documento usa uma fração mínima do vocabulário, e quase toda a tabela é zero.`,
        "Guardar a tabela inteira seria desperdício. O índice invertido guarda só os 1, linha por linha: cada linha da tabela, sem os zeros, é uma posting list. É por isso que a busca lexical também é chamada de esparsa, e é por isso que ela cabe em disco e em memória mesmo para coleções enormes.",
      ],
      keyIdea: "O índice invertido é a matriz termo-documento guardada sem os zeros.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "incidence",
            piece: "matrix",
            rows: vocabulary,
            cols: catalog.map((_, document) => docId(document)),
            values: incidence,
            scale: { min: 0, max: 1 },
            showValues: true,
            highlight: { row: vocabulary.indexOf("azul"), col: postings("azul")[0] },
            color: "module-07",
          },
        ],
      },
      alt: `Matriz de ${vocabulary.length} termos por ${catalog.length} produtos com 1 onde o termo aparece: ${totalPostings} das ${cells} células têm 1, o resto é zero.`,
    },
    {
      id: "intersect",
      shortTitle: "Interseção",
      title: "Consulta com E: andar nas duas listas ao mesmo tempo",
      tag: "example",
      body: [
        `A consulta “${QUERY}” com E precisa dos produtos que estão nas duas listas: ${first} → ${listOf(first)} e ${second} → ${listOf(second)}. Um ponteiro em cada lista: se os ids são iguais, é resultado e os dois avançam; se não, avança o menor. Aqui bastam ${merged.steps.length} comparações, e o resultado é ${merged.result.map((document) => `${docId(document)}, “${catalog[document]}”`).join(", e ")}.`,
        `Sem índice, a busca leria os ${totalTokens} termos do catálogo inteiro; com ele, lê ${postingsRead} postings. A conta do merge cresce com o tamanho das listas, não com o tamanho da coleção. Com vários termos, começar pela lista mais curta é a otimização clássica: o resultado nunca é maior do que ela.`,
      ],
      keyIdea: "Intersectar posting lists ordenadas custa a soma dos tamanhos das listas, não o tamanho da coleção.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "cost",
            piece: "metrics-panel",
            metrics: [
              { id: "scan", label: "termos lidos sem índice", value: String(totalTokens), color: "danger" },
              { id: "index", label: "postings lidos", value: String(postingsRead), color: "success" },
              { id: "result", label: "resultado", value: merged.result.map(docId).join(", ") },
            ],
            highlight: "index",
          },
          {
            id: "merge",
            piece: "token-stream",
            tokens: merged.steps.map((step) => step.label),
            bars: merged.steps.map((step) => (step.match ? 1 : 0.3)),
            color: "module-07",
          },
        ],
      },
      alt: `As comparações do merge entre ${first} (${listOf(first)}) e ${second} (${listOf(second)}): ${merged.steps.map((step) => step.label).join("; ")}. Resultado ${merged.result.map(docId).join(", ")}, lendo ${postingsRead} postings em vez de ${totalTokens} termos.`,
    },
    {
      id: "segments",
      shortTitle: "Atualizar",
      title: "Documento novo vira segmento novo",
      tag: "tradeoff",
      body: [
        "Posting lists ordenadas e compactadas são ótimas para ler e péssimas para editar: inserir um id no meio obrigaria a reescrever a lista. O Lucene, base do Elasticsearch e do OpenSearch, resolve com [[segmentos|index-segment]] imutáveis. Documentos novos são juntados na memória e gravados como um segmento novo; a busca consulta todos os segmentos e junta os resultados.",
        "Apagar só marca o documento como removido, e segmentos pequenos são fundidos em maiores em segundo plano, quando os removidos somem de verdade. O preço é que o índice não é instantâneo: no Elasticsearch, um documento novo só aparece na busca depois do próximo refresh, que por padrão acontece a cada 1 segundo.",
      ],
      keyIdea: "O índice troca atualização instantânea por leitura rápida: escreve segmentos novos e funde depois.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "segments",
            piece: "block-diagram",
            blocks: [
              { id: "docs", kind: "documents", label: "produtos novos", col: 0, row: 0.5 },
              { id: "queue", kind: "queue", label: "buffer", col: 1, row: 0.5 },
              { id: "old", kind: "server", label: "segmento 1", col: 2, row: 0 },
              { id: "new", kind: "server", label: "segmento 2", col: 2, row: 1 },
              { id: "search", kind: "retrieval", label: "busca", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "docs", to: "queue" },
              { from: "queue", to: "new", label: "refresh" },
              { from: "old", to: "search" },
              { from: "new", to: "search" },
            ],
            active: "new",
          },
        ],
      },
      alt: "Produtos novos passam por um buffer e são gravados como um segmento novo, em destaque, ao lado do segmento antigo; a busca lê os dois segmentos.",
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Da consulta à lista de produtos",
      tag: "summary",
      body: [
        "Uma consulta passa pelo analisador e vira termos. Cada termo é uma chave no índice, que devolve a sua posting list. As listas são intersectadas para E ou unidas para OU, e o que sobra são os candidatos. Tudo isso sem ler um único documento inteiro.",
        "O índice responde quem tem os termos, mas ainda não diz quem vem primeiro. A próxima aula usa o que o índice já guarda, a frequência de cada termo e o tamanho das posting lists, para pontuar: o TF-IDF.",
      ],
      keyIdea: "Consulta → termos → posting lists → interseção ou união → candidatos.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "query", kind: "laptop", label: QUERY, col: 0, row: 0 },
              { id: "terms", kind: "tokens", label: `${first} · ${second}`, col: 1, row: 0 },
              { id: "index", kind: "kv-cache", label: "índice invertido", col: 2, row: 0 },
              { id: "merge", kind: "retrieval", label: "interseção", col: 2, row: 1 },
              { id: "answer", kind: "answer", label: merged.result.map(docId).join(", "), col: 3, row: 1 },
            ],
            edges: [
              { from: "query", to: "terms" },
              { from: "terms", to: "index", label: "chaves" },
              { from: "index", to: "merge", label: "postings" },
              { from: "merge", to: "answer" },
            ],
            active: "answer",
            done: ["query", "terms", "index", "merge"],
          },
        ],
      },
      alt: `A consulta ${QUERY} vira os termos ${first} e ${second}, que buscam as posting lists no índice; a interseção entrega ${merged.result.map(docId).join(", ")}, em destaque.`,
    },
  ],
  realWorldExample:
    "O Apache Lucene, a biblioteca por trás do Elasticsearch, do OpenSearch e do Solr, guarda o índice em segmentos imutáveis com posting lists compactadas, e funde segmentos em segundo plano conforme a coleção cresce.",
  code: {
    language: "python",
    source: `from collections import defaultdict

docs = ["tenis de corrida azul", "camiseta de corrida", "tenis casual branco"]
index = defaultdict(list)
for doc_id, text in enumerate(docs):
    for term in sorted(set(text.split()) - {"de"}):
        index[term].append(doc_id)

def intersect(a, b):
    i = j = 0
    result = []
    while i < len(a) and j < len(b):
        if a[i] == b[j]:
            result.append(a[i])
            i, j = i + 1, j + 1
        elif a[i] < b[j]:
            i += 1
        else:
            j += 1
    return result

print(intersect(index["tenis"], index["azul"]))`,
    caption: "Um índice invertido em poucas linhas: cada termo guarda a lista ordenada dos documentos, e a consulta com E é o merge de duas listas, que imprime [0].",
  },
  tradeOffs: {
    pros: [
      "Consulta custa o tamanho das posting lists, não o tamanho da coleção",
      "Estrutura esparsa: cabe em disco e memória mesmo com milhões de documentos",
      "Guarda de graça a frequência de documento que o ranking precisa",
    ],
    cons: [
      "Atualizar é caro: documentos novos viram segmentos e precisam de fusão",
      "Documento novo não aparece na hora, só depois do refresh",
      "Termos muito comuns têm listas enormes, que pesam em consultas com OU",
    ],
    alternatives: ["Varredura completa (grep), aceitável para coleções pequenas", "Índices vetoriais, para busca por significado em vez de termos"],
  },
  knowledgeCheck: [
    {
      id: "shortest-first",
      prompt: "Uma consulta com E tem três termos, com posting lists de 2, 50.000 e 900.000 documentos. Por onde começar a interseção?",
      options: [
        "Pela lista de 900.000, que tem mais chance de conter o resultado",
        "Pela lista de 2: o resultado nunca é maior do que ela, e as comparações seguintes ficam pequenas",
        "Tanto faz: o custo é sempre o tamanho da coleção",
        "Pela lista do meio",
      ],
      correct: 1,
      explanation: "O resultado de um E cabe na menor lista. Começar por ela mantém pequeno o resultado intermediário que entra em cada merge seguinte.",
      lesson: "07-03",
    },
    {
      id: "refresh",
      prompt: "Um produto foi indexado e, meio segundo depois, a busca ainda não o encontra. Qual é a explicação mais provável num Elasticsearch com configuração padrão?",
      options: [
        "O índice invertido não guarda produtos novos",
        "O documento ainda está no buffer e só fica visível no próximo refresh, que roda a cada 1 segundo por padrão",
        "A posting list do termo está cheia",
        "É preciso reconstruir o índice inteiro",
      ],
      correct: 1,
      explanation: "Documentos novos são gravados em segmentos novos no refresh. Até lá, a busca não os enxerga, mesmo que a escrita já tenha sido confirmada.",
      lesson: "07-03",
    },
  ],
  related: ["07-02", "07-04", "06-09"],
  references: [
    { title: "Introduction to Information Retrieval, cap. 1: Boolean retrieval", url: "https://nlp.stanford.edu/IR-book/html/htmledition/boolean-retrieval-1.html", kind: "article" },
    { title: "Elasticsearch: Near real-time search", url: "https://www.elastic.co/guide/en/elasticsearch/reference/current/near-real-time.html", kind: "docs" },
    { title: "Apache Lucene", url: "https://lucene.apache.org/", kind: "docs" },
  ],
};

export default lesson;
