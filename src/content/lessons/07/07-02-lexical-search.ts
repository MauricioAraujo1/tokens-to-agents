import { tokenize } from "../../../lab/retrieval";
import { normalizeText } from "../../../lib/utils";
import type { LessonContent } from "../../../types/content";
import { bm25VsVectorContent } from "../../playgrounds/bm25-vs-vector";

// Busca lexical na central de ajuda de uma loja de brinquedo, com as mesmas stopwords do playground do
// Laboratório. O radical é o corte mais simples que existe, ficar com as 5 primeiras letras, para que a
// conta caiba na cabeça. Toda contagem da cena sai das funções abaixo.

const stop = new Set(bm25VsVectorContent.stopwords);
const faq = [
  "Como trocar a senha da conta",
  "Trocas e devoluções em até 30 dias",
  "Prazo de entrega para todo o Brasil",
  "Como cancelar um pedido",
  "Devolução do valor no cartão de crédito",
  "Rastrear a entrega do pedido",
];
const labels = ["trocar senha", "trocas e devoluções", "prazo de entrega", "cancelar pedido", "devolução do valor", "rastrear entrega"];
const corpus = faq.map((question) => tokenize(question, stop));

const STEM_LENGTH = 5;
const stem = (word: string) => word.slice(0, STEM_LENGTH);
const stemmedCorpus = corpus.map((words) => words.map(stem));

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;
const matchPhrase = (count: number) => (count === 0 ? "nenhuma pergunta casa" : plural(count, "pergunta casa", "perguntas casam"));
/** Documentos que têm pelo menos um termo da consulta. */
const anyMatch = (documents: string[][], terms: string[]) =>
  documents.flatMap((words, index) => (terms.some((term) => words.includes(term)) ? [index] : []));
/** Documentos que têm todos os termos da consulta. */
const allMatch = (documents: string[][], terms: string[]) =>
  documents.flatMap((words, index) => (terms.every((term) => words.includes(term)) ? [index] : []));

const FIRST_QUERY = "trocar senha";
const firstHits = anyMatch(corpus, tokenize(FIRST_QUERY, stop));

const RAW_QUERY = "Quero DEVOLVER o produto!";
const lowered = RAW_QUERY.toLowerCase();
const allWords = tokenize(RAW_QUERY);
const queryTerms = tokenize(RAW_QUERY, stop);
const droppedWords = allWords.filter((word) => !queryTerms.includes(word));

const BOOLEAN_TERMS = ["cancelar", "pedido", "entrega"];
const booleanTable = corpus.map((words) => BOOLEAN_TERMS.map((term) => (words.includes(term) ? 1 : 0)));
const andHits = allMatch(corpus, BOOLEAN_TERMS);
const orHits = anyMatch(corpus, BOOLEAN_TERMS);

const exactHits = anyMatch(corpus, queryTerms);
const stemHits = anyMatch(stemmedCorpus, queryTerms.map(stem));
const family = ["devolver", "devoluções", "devolução", "entrega", "entrevista"];
const familyStems = family.map((word) => stem(normalizeText(word)));
const sameStemArcs = family.flatMap((_, from) =>
  family.flatMap((__, to) => (to > from && familyStems[to] === familyStems[from] ? [{ from, to, weight: 1, label: familyStems[from] }] : [])),
);

const SYNONYM_QUERY = "estorno da compra";
const synonymStems = tokenize(SYNONYM_QUERY, stop).map(stem);
const synonymHits = anyMatch(stemmedCorpus, synonymStems);
/** A pergunta que de fato responde “estorno”: “Devolução do valor no cartão de crédito”. */
const REFUND = 4;

const lesson: LessonContent = {
  id: "07-02",
  subtitle: "Buscar pelas palavras: normalizar o texto, casar termos, combinar com E e OU, e o que fazer quando a pessoa escreve diferente do documento.",
  objectives: [
    "Descrever a normalização que um analisador aplica ao texto antes de casar termos",
    "Comparar consultas com E e com OU e explicar por que nenhuma das duas ordena",
    "Mostrar o que o stemming resolve e o erro que ele cria",
    "Reconhecer o descasamento de vocabulário, o limite da busca lexical",
  ],
  steps: [
    {
      id: "ctrl-f",
      shortTitle: "Ctrl+F",
      title: "Um Ctrl+F em todos os documentos",
      tag: "context",
      body: [
        `Quando você aperta Ctrl+F e digita uma palavra, o editor marca os lugares onde ela aparece escrita igual. A [[busca lexical|lexical-search]] é essa ideia aplicada a uma coleção inteira: a central de ajuda da loja tem ${faq.length} perguntas, e a consulta “${FIRST_QUERY}” acha ${plural(firstHits.length, "pergunta", "perguntas")}: “${faq[firstHits[0]]}”.`,
        "A unidade de comparação é o termo: um pedaço de texto depois de limpo. Não há significado envolvido. Se o termo da consulta existe no documento, conta; se não existe, não conta, por mais parecido que seja. Isso torna a busca lexical rápida, previsível e fácil de explicar.",
      ],
      keyIdea: "Busca lexical compara termos escritos, não ideias. Quem casa, aparece.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "user", kind: "user", label: "cliente", col: 0, row: 0 },
              { id: "terms", kind: "tokens", label: "termos", col: 1, row: 0 },
              { id: "faq", kind: "documents", label: `faq (${faq.length})`, col: 2, row: 1 },
              { id: "match", kind: "retrieval", label: "casa termos", col: 2, row: 0 },
              { id: "answer", kind: "answer", label: plural(firstHits.length, "resultado", "resultados"), col: 3, row: 0 },
            ],
            edges: [
              { from: "user", to: "terms", label: FIRST_QUERY },
              { from: "terms", to: "match" },
              { from: "faq", to: "match" },
              { from: "match", to: "answer" },
            ],
            active: "match",
          },
        ],
      },
      alt: `A consulta ${FIRST_QUERY} vira termos, que a busca, em destaque, compara com as ${faq.length} perguntas da central de ajuda; ${plural(firstHits.length, "resultado sai", "resultados saem")}.`,
    },
    {
      id: "normalize",
      shortTitle: "Normalizar",
      title: "Antes de comparar, o texto é limpo",
      tag: "mechanism",
      body: [
        `“DEVOLVER” e “devolver” são a mesma palavra para você, mas são sequências diferentes de letras para o computador. Por isso o texto passa por um [[analisador|analyzer]]: minúsculas, sem acento, quebrado em palavras e sem [[stopwords|stopword]]. A consulta “${RAW_QUERY}” vira ${queryTerms.map((term) => `“${term}”`).join(", ")}; ${droppedWords.map((word) => `“${word}”`).join(" e ")} ${droppedWords.length === 1 ? "sai" : "saem"}.`,
        "O detalhe que mais derruba sistemas: o mesmo analisador precisa rodar na indexação e na consulta. Se os documentos foram indexados sem acento e a consulta chega com acento, “devolução” nunca casa com “devolucao”, e ninguém percebe até um cliente reclamar.",
      ],
      keyIdea: "Casar termos só funciona se documento e consulta passarem pela mesma limpeza.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "analyzer",
            piece: "pipeline",
            display: "chips",
            stages: [
              { id: "raw", label: RAW_QUERY },
              { id: "lower", label: lowered },
              { id: "split", label: allWords.join(" · ") },
              { id: "stop", label: queryTerms.join(" · "), color: "module-07" },
            ],
            active: "stop",
            done: ["raw", "lower", "split"],
          },
          {
            id: "terms",
            piece: "token-stream",
            tokens: allWords,
            bars: allWords.map((word) => (queryTerms.includes(word) ? 1 : 0)),
            color: "module-07",
          },
        ],
      },
      alt: `A consulta ${RAW_QUERY} passa por minúsculas, quebra em palavras e remoção de stopwords até virar ${queryTerms.join(", ")}.`,
    },
    {
      id: "boolean",
      shortTitle: "E / OU",
      title: "E é exigente demais, OU é generoso demais",
      tag: "mechanism",
      body: [
        `O jeito clássico de juntar termos é a [[busca booleana|boolean-retrieval]]. Com “${BOOLEAN_TERMS.join(" E ")}”, o documento precisa ter os três termos, e ${matchPhrase(andHits.length)}. Com “${BOOLEAN_TERMS.join(" OU ")}”, basta um, e ${matchPhrase(orHits.length)}.`,
        "Nenhuma das duas responde a pergunta que importa: qual resultado mostrar primeiro. Na busca booleana, um documento casa ou não casa, e todos os que casam valem o mesmo. Por isso os buscadores modernos usam OU para recuperar e uma pontuação, como TF-IDF ou BM25, para ordenar.",
      ],
      keyIdea: "Operadores booleanos decidem quem entra, não quem vem primeiro.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "counts",
            piece: "metrics-panel",
            metrics: [
              { id: "and", label: "com E", value: plural(andHits.length, "pergunta", "perguntas"), color: "danger" },
              { id: "or", label: "com OU", value: plural(orHits.length, "pergunta", "perguntas"), color: "success" },
              { id: "order", label: "ordem", value: "nenhuma" },
            ],
            highlight: "order",
          },
          {
            id: "table",
            piece: "matrix",
            rows: labels,
            cols: BOOLEAN_TERMS,
            values: booleanTable,
            scale: { min: 0, max: 1 },
            showValues: true,
            color: "module-07",
          },
        ],
      },
      alt: `Tabela de 0 e 1 com as ${faq.length} perguntas e os termos ${BOOLEAN_TERMS.join(", ")}. Com E, ${andHits.length} perguntas casam; com OU, ${orHits.length}.`,
    },
    {
      id: "stemming",
      shortTitle: "Radical",
      title: "Stemming: devolver e devolução viram um termo só",
      tag: "example",
      body: [
        `A cliente digita “${RAW_QUERY}”. Termo a termo, ${matchPhrase(exactHits.length)}: a central escreve “devoluções” e “devolução”, nunca “devolver”. O [[stemming|stemming]] corta as palavras até um radical comum. Com o corte mais simples, as ${STEM_LENGTH} primeiras letras, as três viram “${familyStems[0]}”, e ${plural(stemHits.length, "pergunta aparece", "perguntas aparecem")}.`,
        `O preço é juntar o que não devia: “entrega” e “entrevista” também viram “${familyStems[3]}”. Stemmers de verdade, como o Porter para o inglês e o RSLP para o português, usam regras de sufixo e erram menos, mas o dilema continua: cortar demais junta palavras diferentes; cortar de menos separa palavras da mesma família.`,
      ],
      keyIdea: "Stemming aumenta o que a busca acha, e também o que ela acha por engano.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "counts",
            piece: "metrics-panel",
            metrics: [
              { id: "exact", label: "termo exato", value: plural(exactHits.length, "pergunta", "perguntas"), color: "danger" },
              { id: "stem", label: `radical (${STEM_LENGTH} letras)`, value: plural(stemHits.length, "pergunta", "perguntas"), color: "success" },
            ],
            highlight: "stem",
          },
          {
            id: "family",
            piece: "token-stream",
            tokens: family,
            arcs: sameStemArcs,
            color: "module-07",
          },
        ],
      },
      alt: `As palavras ${family.join(", ")} ligadas por arcos quando têm o mesmo radical: as três primeiras viram ${familyStems[0]}, e entrega e entrevista viram ${familyStems[3]}. Termo exato acha ${exactHits.length} perguntas; com radical, ${stemHits.length}.`,
    },
    {
      id: "mismatch",
      shortTitle: "Sinônimos",
      title: "Quando a pessoa usa outra palavra",
      tag: "tradeoff",
      body: [
        `Outra cliente digita “${SYNONYM_QUERY}”. A resposta existe: “${faq[REFUND]}”. Mas nenhum termo é igual, nem cortado no radical, e ${synonymHits.length === 0 ? "a busca não devolve nada" : `a busca devolve ${plural(synonymHits.length, "pergunta", "perguntas")}`}. Esse é o [[descasamento de vocabulário|vocabulary-mismatch]]: mesma ideia, palavras diferentes.`,
        "A busca lexical tem remendos: listas de sinônimos mantidas à mão, expansão da consulta, correção ortográfica. Todos ajudam, e todos exigem alguém mantendo listas. A solução estrutural é comparar significados, com embeddings, que você vê na aula de busca semântica. Em compensação, para códigos, nomes próprios e números de pedido, nada bate o casamento exato.",
      ],
      keyIdea: "Busca lexical não sabe que “estorno” e “devolução do valor” são a mesma coisa.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "user", kind: "user", label: "cliente", col: 0, row: 0 },
              { id: "terms", kind: "tokens", label: synonymStems.join(" · "), col: 1, row: 0 },
              { id: "faq", kind: "documents", label: "devolução do valor", col: 2, row: 1 },
              { id: "match", kind: "retrieval", label: "casa termos", col: 2, row: 0 },
              { id: "empty", kind: "no-result", label: plural(synonymHits.length, "resultado", "resultados"), col: 3, row: 0 },
            ],
            edges: [
              { from: "user", to: "terms", label: "estorno" },
              { from: "terms", to: "match" },
              { from: "faq", to: "match", label: "outras palavras", variant: "alternative" },
              { from: "match", to: "empty" },
            ],
            active: "empty",
          },
        ],
      },
      alt: `A consulta ${SYNONYM_QUERY} vira os radicais ${synonymStems.join(" e ")}; a pergunta sobre devolução do valor usa outras palavras, e a busca termina sem resultado, em destaque.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "O mesmo analisador nos dois lados",
      tag: "summary",
      body: [
        "Na indexação, cada documento passa pelo analisador e vira uma lista de termos. Na consulta, o texto da pessoa passa pelo mesmo analisador. A busca é o encontro dos dois conjuntos de termos: E para exigir todos, OU para aceitar qualquer um, radical para juntar famílias de palavras.",
        "Comparar a consulta com cada documento, um por um, não escala para milhões de documentos. A próxima aula mostra a estrutura que torna isso instantâneo: o índice invertido.",
      ],
      keyIdea: "Busca lexical = analisador igual nos dois lados + casamento de termos.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "faq", kind: "documents", label: "documentos", col: 0, row: 0 },
              { id: "index-analyzer", kind: "queue", label: "analisador", col: 1, row: 0 },
              { id: "index", kind: "kv-cache", label: "termos", col: 2, row: 0 },
              { id: "user", kind: "laptop", label: "consulta", col: 0, row: 1 },
              { id: "query-analyzer", kind: "tokens", label: "mesmo analisador", col: 1, row: 1 },
              { id: "match", kind: "retrieval", label: "casamento", col: 2, row: 1 },
            ],
            edges: [
              { from: "faq", to: "index-analyzer" },
              { from: "index-analyzer", to: "index" },
              { from: "user", to: "query-analyzer" },
              { from: "query-analyzer", to: "match" },
              { from: "index", to: "match" },
            ],
            active: "match",
            done: ["faq", "index-analyzer", "index", "user", "query-analyzer"],
          },
        ],
      },
      alt: "Documentos passam pelo analisador e viram termos no índice; a consulta passa pelo mesmo analisador; o casamento, em destaque, compara os dois lados.",
    },
  ],
  realWorldExample:
    "O Elasticsearch traz analisadores prontos por idioma, entre eles o portuguese, que já aplica minúsculas, stopwords e um stemmer do português. A API _analyze mostra os termos exatos que um texto vira, e é o primeiro lugar para olhar quando uma busca não acha o que devia.",
  code: {
    language: "json",
    source: `POST _analyze
{
  "analyzer": "portuguese",
  "text": "Quero devolver o produto"
}`,
    caption: "Pergunte ao Elasticsearch quais termos o analisador do português gera para a consulta, e compare com os termos dos documentos.",
  },
  tradeOffs: {
    pros: [
      "Casamento exato: perfeito para códigos, nomes próprios e números de pedido",
      "Explicável: dá para mostrar por que um documento apareceu",
      "Barata e madura, sem modelo nem GPU",
    ],
    cons: [
      "Não entende sinônimos nem paráfrases",
      "Depende de uma normalização bem feita e igual nos dois lados",
      "Stemming ajuda e atrapalha: junta palavras diferentes e separa famílias",
    ],
    alternatives: ["Listas de sinônimos e expansão de consulta", "Busca semântica com embeddings, ou as duas juntas na busca híbrida"],
  },
  knowledgeCheck: [
    {
      id: "same-analyzer",
      prompt: "Os documentos foram indexados sem acento. Depois de um deploy, as consultas passam a chegar com acento. O que acontece?",
      options: [
        "Nada: a busca lexical ignora acentos sozinha",
        "Termos como “devolução” deixam de casar com “devolucao”, e resultados somem sem erro nenhum",
        "O índice é reconstruído automaticamente",
        "A busca fica mais precisa",
      ],
      correct: 1,
      explanation: "Casamento de termos é exato. Se indexação e consulta não usam o mesmo analisador, os termos param de bater em silêncio.",
      lesson: "07-02",
    },
    {
      id: "and-or",
      prompt: "Uma consulta de 5 palavras com E entre elas devolve zero resultados. Qual é a mudança mais comum num buscador moderno?",
      options: [
        "Trocar por OU e ordenar os resultados por uma pontuação como BM25",
        "Remover a busca e mostrar todos os documentos",
        "Exigir que o usuário digite menos palavras",
        "Trocar por NÃO",
      ],
      correct: 0,
      explanation: "OU recupera todo documento com algum termo, e a pontuação põe primeiro os que casam mais e melhor. E puro é exigente demais com consultas longas.",
      lesson: "07-02",
    },
  ],
  related: ["07-01", "07-03", "03-02"],
  references: [
    { title: "Introduction to Information Retrieval, cap. 2: The term vocabulary and postings lists", url: "https://nlp.stanford.edu/IR-book/html/htmledition/the-term-vocabulary-and-postings-lists-1.html", kind: "article" },
    { title: "Elasticsearch: Text analysis", url: "https://www.elastic.co/docs/manage-data/data-store/text-analysis", kind: "docs" },
    { title: "Manning, Raghavan & Schütze: Introduction to Information Retrieval", url: "https://nlp.stanford.edu/IR-book/", kind: "article" },
  ],
};

export default lesson;
