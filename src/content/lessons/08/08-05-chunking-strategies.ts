import { cosineSimilarity } from "../../../lab/embeddings";
import { chunkWords, splitIntoWords } from "../../../lab/chunking";
import type { LessonContent } from "../../../types/content";

// Estratégias de chunking aplicadas ao mesmo trecho da política de RH, com contas no arquivo. O tamanho
// fixo usa o mesmo chunkWords do laboratório de chunking; o recursivo é implementado aqui, com a ordem de
// separadores parágrafo, linha, espaço e caractere; o semântico compara frases vizinhas pelo cosseno entre
// vetores de assunto escritos à mão, [trabalho remoto, equipamento, despesa, viagem]. Tudo é contado em
// palavras, e uma frase conta como cortada quando nenhum chunk a contém inteira.

const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });

interface Sentence {
  text: string;
  label: string;
  /** [trabalho remoto, equipamento, despesa, viagem] */
  topic: number[];
}
interface Section {
  title: string;
  paragraphs: Sentence[][];
}

const sections: Section[] = [
  {
    title: "Home office",
    paragraphs: [
      [
        { text: "O home office é permitido até três dias por semana.", label: "3 dias remotos", topic: [1, 0, 0, 0] },
        { text: "O gestor aprova a escala de cada equipe.", label: "gestor aprova", topic: [0.9, 0.1, 0, 0] },
      ],
      [
        { text: "Equipamentos são emprestados pela empresa.", label: "equipamentos", topic: [0.3, 1, 0, 0] },
        { text: "O notebook deve voltar no desligamento.", label: "notebook volta", topic: [0.1, 1, 0, 0] },
      ],
    ],
  },
  {
    title: "Reembolso",
    paragraphs: [
      [
        { text: "O reembolso de despesas exige nota fiscal.", label: "nota fiscal", topic: [0, 0, 1, 0.2] },
        { text: "O prazo de envio é de 30 dias.", label: "prazo 30 dias", topic: [0, 0, 1, 0] },
      ],
      [
        { text: "Táxi tem limite diário de 100 reais.", label: "táxi 100 reais", topic: [0, 0, 0.8, 0.7] },
        { text: "Hotel precisa de aprovação prévia.", label: "hotel aprovado", topic: [0, 0, 0.5, 1] },
      ],
    ],
  },
];

const PARAGRAPH = "\n\n";
const paragraphText = (paragraph: Sentence[]) => paragraph.map((sentence) => sentence.text).join(" ");
const document = sections
  .map((section) => [section.title, ...section.paragraphs.map(paragraphText)].join(PARAGRAPH))
  .join(PARAGRAPH);
const sentences = sections.flatMap((section) => section.paragraphs.flat());
const countWords = (text: string) => splitIntoWords(text).length;
const totalWords = countWords(document);
const collapse = (text: string) => text.replace(/\s+/g, " ").trim();
const cutSentences = (chunks: string[]) =>
  sentences.map((sentence, index) => (chunks.some((chunk) => collapse(chunk).includes(sentence.text)) ? -1 : index)).filter((index) => index >= 0);

// Passo 2: tamanho fixo, com o chunker do laboratório.
const FIXED_SIZE = 15;
const fixedResult = chunkWords(splitIntoWords(document), FIXED_SIZE, 0);
const fixedChunks = fixedResult.ok ? fixedResult.chunks.map((chunk) => chunk.words.join(" ")) : [];
const fixedCut = cutSentences(fixedChunks);

// Passo 3: recursivo, como o RecursiveCharacterTextSplitter, mas medindo em palavras.
const SEPARATORS = [PARAGRAPH, "\n", " ", ""];
const MAX_WORDS = 25;
function recursiveSplit(text: string, separators: string[], max: number): string[] {
  if (countWords(text) <= max) return [text];
  const [separator, ...rest] = separators;
  const pieces = separator === "" ? [...text] : text.split(separator);
  const chunks: string[] = [];
  let current = "";
  for (const piece of pieces) {
    const candidate = current === "" ? piece : current + separator + piece;
    if (countWords(candidate) <= max) {
      current = candidate;
      continue;
    }
    if (current !== "") chunks.push(current);
    current = piece;
  }
  if (current !== "") chunks.push(current);
  return chunks.flatMap((chunk) => (countWords(chunk) > max && rest.length > 0 ? recursiveSplit(chunk, rest, max) : [chunk]));
}
const recursiveChunks = recursiveSplit(document, SEPARATORS, MAX_WORDS);
const recursiveCut = cutSentences(recursiveChunks);
const secondTitle = sections[1].title;
const gluedChunk = recursiveChunks.find((chunk) => chunk.endsWith(secondTitle) && chunk !== secondTitle);

// Por parágrafo: cada bloco entre linhas em branco vira um chunk, inclusive os títulos sozinhos.
const paragraphChunks = document.split(PARAGRAPH);
const titleOnlyChunks = paragraphChunks.filter((chunk) => sections.some((section) => section.title === chunk)).length;

// Por títulos + recursivo: corta em cada seção e repete o título no começo de cada chunk dela.
const titledChunks = sections.flatMap((section) =>
  recursiveSplit(section.paragraphs.map(paragraphText).join(PARAGRAPH), SEPARATORS, MAX_WORDS).map(
    (chunk) => `${section.title}: ${chunk}`,
  ),
);

// Passo 4: semântico, cortando onde o cosseno entre frases vizinhas cai abaixo do limiar.
const THRESHOLD = 0.5;
const adjacent = sentences.slice(0, -1).map((sentence, index) => cosineSimilarity(sentence.topic, sentences[index + 1].topic));
const breakpoints = adjacent.map((similarity, index) => (similarity < THRESHOLD ? index : -1)).filter((index) => index >= 0);
const semanticChunks = adjacent
  .reduce<Sentence[][]>(
    (groups, similarity, index) => (similarity < THRESHOLD ? [...groups, [sentences[index + 1]]] : [...groups.slice(0, -1), [...groups[groups.length - 1], sentences[index + 1]]]),
    [[sentences[0]]],
  )
  .map((group) => group.map((sentence) => sentence.text).join(" "));
const lowest = Math.min(...adjacent);

// Passo 5: as estratégias lado a lado.
const strategies = [
  { label: `fixo ${FIXED_SIZE}`, chunks: fixedChunks },
  { label: "parágrafo", chunks: paragraphChunks },
  { label: `recursivo ${MAX_WORDS}`, chunks: recursiveChunks },
  { label: "títulos + recursivo", chunks: titledChunks },
  { label: "semântico", chunks: semanticChunks },
];
const comparisonColumns = ["chunks", "frases cortadas", "menor chunk", "maior chunk"];
const comparison = strategies.map(({ chunks }) => {
  const sizes = chunks.map(countWords);
  return [chunks.length, cutSentences(chunks).length, Math.min(...sizes), Math.max(...sizes)];
});
const TITLED = 3;

const lesson: LessonContent = {
  id: "08-05",
  subtitle: "Onde cortar um documento: tamanho fixo, por parágrafo, recursivo, por títulos ou por mudança de assunto.",
  objectives: [
    "Explicar por que o RAG busca chunks e não documentos inteiros",
    "Comparar chunking de tamanho fixo, por estrutura, recursivo e semântico",
    "Contar quantas frases cada estratégia corta no meio",
    "Escolher a estratégia pelo formato do documento",
  ],
  steps: [
    {
      id: "why",
      shortTitle: "Por que cortar",
      title: "Recortar o jornal em matérias",
      tag: "context",
      body: [
        "Para guardar uma notícia, você recorta a matéria, não o jornal inteiro nem uma linha solta. O recorte certo fala de um assunto só e faz sentido sozinho. No RAG, o recorte é o [[chunk|chunk]]: a unidade que vira embedding, é recuperada e vai para o prompt.",
        `Um embedding do documento inteiro mistura home office, notebook, nota fiscal e hotel num vetor só, que não fica perto de nenhuma pergunta específica. O [[chunking|chunking]] decide as fronteiras. O trecho da cena tem ${totalWords} palavras em ${sections.length} seções e ${sentences.length} frases, e cada estratégia a seguir corta esse mesmo texto de um jeito.`,
      ],
      keyIdea: "Um bom chunk fala de um assunto e se entende sozinho.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "doc", kind: "documents", label: "política de rh", col: 0, row: 0 },
              { id: "chunker", kind: "tool", label: "chunker", col: 1, row: 0 },
              { id: "embed", kind: "embedding", label: "embeddings", col: 2, row: 0 },
              { id: "index", kind: "vector-db", label: "índice", col: 3, row: 0 },
            ],
            edges: [
              { from: "doc", to: "chunker", label: `${totalWords} palavras` },
              { from: "chunker", to: "embed", label: "chunks" },
              { from: "embed", to: "index" },
            ],
            active: "chunker",
          },
        ],
      },
      alt: `A política de RH, com ${totalWords} palavras, passa pelo chunker, em destaque, e os chunks seguem para os embeddings e o índice.`,
    },
    {
      id: "fixed",
      shortTitle: "Tamanho fixo",
      title: "Tamanho fixo: cortar a cada N palavras",
      tag: "mechanism",
      body: [
        `O jeito mais simples é uma régua: a cada ${FIXED_SIZE} palavras, um corte, caia onde cair. É previsível e rápido, e todo chunk tem o mesmo tamanho. Mas a régua não lê: corta frases no meio.`,
        `No trecho da cena, ${fixedChunks.length} chunks de até ${FIXED_SIZE} palavras cortam ${fixedCut.length} das ${sentences.length} frases (as destacadas): ${fixedCut.map((index) => `“${sentences[index].label}”`).join(", ")}. Metade de uma regra num chunk e a outra metade no seguinte é o pior caso para a busca: nenhum dos dois responde a pergunta inteiro. É a função chunkWords do laboratório, com overlap zero; a próxima aula mostra como o overlap ameniza o problema.`,
      ],
      keyIdea: "Tamanho fixo é barato e previsível, mas ignora frases e parágrafos.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "strategy",
            piece: "metrics-panel",
            metrics: [
              { id: "name", label: "estratégia", value: `fixo ${FIXED_SIZE}` },
              { id: "chunks", label: "chunks", value: String(fixedChunks.length) },
              { id: "cut", label: "frases cortadas", value: `${fixedCut.length} de ${sentences.length}`, color: "danger" },
            ],
            highlight: "cut",
          },
          { id: "sentences", piece: "token-stream", tokens: sentences.map((sentence) => sentence.label), keys: fixedCut, color: "module-08" },
        ],
      },
      alt: `As ${sentences.length} frases do trecho, com as ${fixedCut.length} cortadas pelo tamanho fixo de ${FIXED_SIZE} palavras em destaque: ${fixedCut.map((index) => sentences[index].label).join(", ")}.`,
    },
    {
      id: "recursive",
      shortTitle: "Recursivo",
      title: "Recursivo: tentar o corte maior primeiro",
      tag: "mechanism",
      body: [
        "Para dividir um livro em partes, você corta primeiro por capítulo; só se um capítulo for grande demais desce para as seções, e depois para os parágrafos. O [[chunking recursivo|recursive-chunking]] faz isso com uma lista de separadores: parágrafo (linha em branco), quebra de linha, espaço e, por último, caractere.",
        `Ele junta parágrafos inteiros enquanto cabem em ${MAX_WORDS} palavras e só desce de nível quando um pedaço passa do limite. Resultado: ${recursiveChunks.length} chunks e ${recursiveCut.length} frases cortadas. Um efeito colateral aparece na conta: ${gluedChunk ? `o título “${secondTitle}” terminou grudado no fim do chunk anterior, separado do texto que ele nomeia` : `o título “${secondTitle}” ficou no começo do seu chunk`}. É o comportamento do RecursiveCharacterTextSplitter do LangChain, que mede em caracteres por padrão.`,
      ],
      keyIdea: "Recursivo respeita a estrutura quando pode e só corta mais fino quando precisa.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "strategy",
            piece: "metrics-panel",
            metrics: [
              { id: "name", label: "estratégia", value: `recursivo ${MAX_WORDS}` },
              { id: "chunks", label: "chunks", value: String(recursiveChunks.length) },
              { id: "cut", label: "frases cortadas", value: `${recursiveCut.length} de ${sentences.length}`, color: "success" },
            ],
            highlight: "cut",
          },
          {
            id: "separators",
            piece: "pipeline",
            display: "chips",
            stages: [
              { id: "paragraph", label: "parágrafo", color: "module-08" },
              { id: "line", label: "quebra de linha" },
              { id: "space", label: "espaço" },
              { id: "char", label: "caractere" },
            ],
            active: "paragraph",
          },
        ],
      },
      alt: `Separadores em ordem: parágrafo, em destaque, quebra de linha, espaço e caractere. Com limite de ${MAX_WORDS} palavras, o recursivo gera ${recursiveChunks.length} chunks e corta ${recursiveCut.length} frases.`,
    },
    {
      id: "semantic",
      shortTitle: "Semântico",
      title: "Semântico: cortar onde o assunto muda",
      tag: "mechanism",
      body: [
        "Lendo em voz alta, você percebe quando o texto muda de assunto, mesmo sem título nenhum. O [[chunking semântico|semantic-chunking]] faz isso com números: gera um embedding por frase e compara cada frase com a seguinte. Similaridade alta, mesmo assunto; queda forte, corte.",
        `A cena mostra o cosseno entre frases vizinhas, com limiar ${fixed(THRESHOLD)}. Caem abaixo dele ${breakpoints.length} pares (os esmaecidos), o menor com ${fixed(lowest)}, e saem ${semanticChunks.length} chunks. Repare que um dos cortes separa equipamentos de home office dentro da mesma seção: a estrutura do documento não mostrava essa mudança. O preço é gerar ${sentences.length} embeddings só para decidir onde cortar.`,
      ],
      keyIdea: "Semântico corta por significado, ao custo de um embedding por frase antes do chunking.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "similarity",
            piece: "chart",
            kind: "bar",
            series: adjacent.map((similarity, index) => ({ label: `${index + 1}→${index + 2}`, value: Number(similarity.toFixed(2)) })),
            max: 1,
            cutoff: { mode: "threshold", value: THRESHOLD, label: `limiar ${fixed(THRESHOLD)}` },
            highlight: adjacent.indexOf(lowest),
            color: "module-08",
          },
        ],
      },
      alt: `Cosseno entre frases vizinhas: ${adjacent.map((similarity, index) => `${index + 1} e ${index + 2}: ${fixed(similarity)}`).join(", ")}. ${breakpoints.length} pares ficam abaixo do limiar de ${fixed(THRESHOLD)} e viram cortes.`,
    },
    {
      id: "compare",
      shortTitle: "Lado a lado",
      title: "Cinco estratégias no mesmo texto",
      tag: "example",
      body: [
        `Juntando tudo numa tabela: cada linha é uma estratégia aplicada às mesmas ${totalWords} palavras. O corte por parágrafo não parte frase nenhuma, mas gera ${titleOnlyChunks} chunks que são só um título, inúteis para a busca. O fixo é o único que corta frases.`,
        `A linha “títulos + recursivo” corta primeiro nas seções e repete o título no começo de cada chunk, como em “${titledChunks[titledChunks.length - 1].split(" ").slice(0, 4).join(" ")}…”. Cada chunk carrega o nome do assunto, o que ajuda o embedding e a citação. É o padrão quando o documento tem estrutura confiável, como Markdown ou HTML com cabeçalhos.`,
      ],
      keyIdea: "Use a estrutura que o documento já tem; recorra ao tamanho fixo só quando não houver estrutura.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "comparison",
            piece: "matrix",
            rows: strategies.map((strategy) => strategy.label),
            cols: comparisonColumns,
            values: comparison,
            highlight: { row: TITLED, col: 1 },
            showValues: true,
            color: "module-08",
          },
        ],
      },
      alt: `Tabela com as estratégias ${strategies.map((strategy, index) => `${strategy.label}: ${comparison[index][0]} chunks e ${comparison[index][1]} frases cortadas`).join("; ")}.`,
    },
    {
      id: "choose",
      shortTitle: "Qual usar",
      title: "A estratégia depende do documento",
      tag: "tradeoff",
      body: [
        "Não existe faca única para tudo: pão, queijo e peixe pedem cortes diferentes. Manual em Markdown com títulos pede corte por títulos. Texto corrido exportado de PDF pede o recursivo. Transcrição de reunião, sem título nem parágrafo, é onde o semântico vale o custo: primeiro separa as frases, depois agrupa as vizinhas parecidas.",
        "Também vale olhar o que o chunk carrega além do texto: título da seção, página e fonte. E nenhuma estratégia é melhor no abstrato: compare duas ou três com perguntas reais da sua base, medindo se o chunk certo aparece no top-k, como mostram as aulas de avaliação do módulo.",
      ],
      keyIdea: "Roteie por formato: títulos quando há estrutura, recursivo para texto corrido, semântico quando nada marca o assunto.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "routes",
            piece: "block-diagram",
            blocks: [
              { id: "docs", kind: "documents", label: "seus documentos", col: 0, row: 0.5 },
              { id: "titles", kind: "tool", label: "por títulos", col: 1, row: 0 },
              { id: "recursive", kind: "tool", label: "recursivo", col: 1, row: 1 },
              { id: "semantic", kind: "embedding", label: "semântico", col: 2, row: 1 },
              { id: "index", kind: "vector-db", label: "índice", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "docs", to: "titles", label: "markdown, html" },
              { from: "docs", to: "recursive", label: "texto corrido" },
              { from: "recursive", to: "semantic", label: "transcrições" },
              { from: "titles", to: "index" },
              { from: "recursive", to: "index" },
              { from: "semantic", to: "index" },
            ],
            active: "titles",
          },
        ],
      },
      alt: "Os documentos seguem por rotas: Markdown e HTML vão para o corte por títulos, em destaque; texto corrido vai para o recursivo; transcrições saem do recursivo, já em frases, para o agrupamento semântico. Todos chegam ao índice.",
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Fronteiras boas, chunks que se explicam",
      tag: "summary",
      body: [
        `O chunking escolhe as fronteiras dos trechos que a busca vai devolver. No trecho da aula, o fixo cortou ${fixedCut.length} frases, o recursivo ${recursiveCut.length === 0 ? "nenhuma" : recursiveCut.length}, e o corte por títulos deu ${titledChunks.length} chunks que levam o nome da seção junto.`,
        "Falta decidir quanto cabe em cada chunk e quanto repetir entre vizinhos. A próxima aula faz as contas de tamanho e overlap.",
      ],
      keyIdea: "Corte onde o documento já se divide, e deixe cada chunk dizer de onde veio.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "doc", kind: "documents", label: "política de rh", col: 0, row: 0 },
              { id: "chunker", kind: "tool", label: "títulos + recursivo", col: 1, row: 0 },
              { id: "embed", kind: "embedding", label: "embeddings", col: 2, row: 0 },
              { id: "index", kind: "vector-db", label: "índice", col: 3, row: 0 },
            ],
            edges: [
              { from: "doc", to: "chunker", label: `${totalWords} palavras` },
              { from: "chunker", to: "embed", label: `${titledChunks.length} chunks` },
              { from: "embed", to: "index" },
            ],
            active: "index",
            done: ["doc", "chunker", "embed"],
          },
        ],
      },
      alt: `A política de RH passa pelo corte por títulos mais recursivo, gera ${titledChunks.length} chunks, que viram embeddings e chegam ao índice, em destaque.`,
    },
  ],
  realWorldExample:
    "O LangChain oferece o RecursiveCharacterTextSplitter, com os separadores parágrafo, quebra de linha, espaço e caractere, e o MarkdownHeaderTextSplitter, que corta pelos cabeçalhos e guarda o título de cada trecho nos metadados. O LlamaIndex tem o SentenceSplitter, que evita cortar frases, e o SemanticSplitterNodeParser, que corta pela queda de similaridade entre frases.",
  code: {
    language: "python",
    source: `from langchain_text_splitters import RecursiveCharacterTextSplitter

splitter = RecursiveCharacterTextSplitter(
    chunk_size=200,          # em caracteres, pelo len() padrão
    chunk_overlap=0,
    separators=["\\n\\n", "\\n", " ", ""],
)
chunks = splitter.split_text(open("politica.md", encoding="utf-8").read())
print(len(chunks), chunks[0])`,
    caption: "O chunking recursivo da aula com LangChain. A aula mede em palavras; aqui o tamanho é em caracteres, e pode ser trocado por tokens com outra length_function.",
  },
  tradeOffs: {
    pros: [
      "Cortes por estrutura mantêm frases e parágrafos inteiros",
      "Repetir o título da seção em cada chunk melhora a busca e a citação",
      "Chunking semântico acha mudanças de assunto que a estrutura não marca",
    ],
    cons: [
      "Tamanho fixo corta frases e regras no meio",
      "Corte por parágrafo gera chunks minúsculos, como títulos sozinhos",
      "Semântico custa um embedding por frase e depende de um limiar a ajustar",
    ],
    alternatives: [
      "Indexar frases e devolver a janela de frases vizinhas (aula 08.13)",
      "Chunks pequenos para buscar e o trecho pai maior para o prompt (aula 08.13)",
      "Documentos curtos inteiros como um chunk só",
    ],
  },
  knowledgeCheck: [
    {
      id: "transcript",
      prompt: "Você vai indexar transcrições de reuniões, sem títulos nem parágrafos. Qual estratégia tende a dar chunks de um assunto só?",
      options: [
        "Corte por títulos",
        "Corte por parágrafo",
        "Chunking semântico, cortando onde a similaridade entre frases vizinhas cai",
        "Um chunk por documento",
      ],
      correct: 2,
      explanation: "Sem estrutura, os cortes por título e por parágrafo não têm onde se apoiar. O semântico detecta a mudança de assunto pelo significado.",
      lesson: "08-05",
    },
    {
      id: "orphan-title",
      prompt: "No chunking por parágrafo, metade dos chunks de um manual são só títulos como “Reembolso”. O que fazer?",
      options: [
        "Apagar os títulos do documento",
        "Juntar o título ao conteúdo da seção, repetindo-o no começo de cada chunk dela",
        "Aumentar o top-k para compensar",
        "Trocar para tamanho fixo de 5 palavras",
      ],
      correct: 1,
      explanation: "O título sozinho não responde nada, mas dá contexto ao texto da seção. Repetido em cada chunk, ele ajuda o embedding e a citação.",
      lesson: "08-05",
    },
  ],
  related: ["08-04", "08-06", "06-03"],
  references: [
    { title: "Pinecone: Chunking Strategies for LLM Applications", url: "https://www.pinecone.io/learn/chunking-strategies/", kind: "article" },
    { title: "LangChain: documentação", url: "https://python.langchain.com/", kind: "docs" },
    { title: "LlamaIndex: documentação", url: "https://docs.llamaindex.ai/", kind: "docs" },
  ],
};

export default lesson;
