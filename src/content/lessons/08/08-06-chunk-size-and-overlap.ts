import { chunkWords, splitIntoWords, type Chunk } from "../../../lab/chunking";
import type { LessonContent } from "../../../types/content";
import { chunkingContent } from "../../playgrounds/chunking";

// Tamanho de chunk e overlap com as mesmas contas do laboratório: o texto de 60 palavras do playground,
// a função chunkWords (janela deslizante contada em palavras) e a configuração inicial de lá. Daqui saem a
// tabela de quantidade de chunks por tamanho e overlap, as palavras armazenadas em cada configuração,
// se uma frase que cruza a fronteira entre chunks fica inteira em algum deles e quanto de contexto cada
// pergunta leva com top-k.

const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const percent = (value: number) => `${Math.round(value * 100)}%`;
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

const words = splitIntoWords(chunkingContent.text);
const TOTAL = words.length;
const { size: SIZE, overlap: OVERLAP } = chunkingContent.initial;

const chunksFor = (size: number, overlap: number): Chunk[] => {
  const result = chunkWords(words, size, overlap);
  return result.ok ? result.chunks : [];
};
const storedWords = (size: number, overlap: number) => sum(chunksFor(size, overlap).map((chunk) => chunk.words.length));

// Passo 2: a configuração do laboratório.
const labChunks = chunksFor(SIZE, OVERLAP);
const STRIDE = SIZE - OVERLAP;
const labStored = storedWords(SIZE, OVERLAP);
const chunkLabel = (chunk: Chunk, index: number) => `c${index + 1} · ${chunk.start + 1}–${chunk.start + chunk.words.length}`;

// Passo 3: quantidade de chunks por tamanho e overlap.
const sizes = [10, 20, 30, 40];
const overlaps = [0, 5, 8];
const counts = sizes.map((size) => overlaps.map((overlap) => chunksFor(size, overlap).length));
const maxCount = Math.max(...counts.flat());
const LAB_ROW = sizes.indexOf(SIZE);
const LAB_COL = overlaps.indexOf(OVERLAP);
const SMALL = sizes[0];
const DENSE = overlaps[overlaps.length - 1];

// Passo 4: uma frase que cruza a fronteira dos chunks de 20 palavras sem overlap.
const PHRASE = "embedding e vai para o banco vetorial.";
const phraseWords = splitIntoWords(PHRASE);
const phraseStart = words.findIndex((_, index) => phraseWords.every((word, offset) => words[index + offset] === word));
const phraseEnd = phraseStart + phraseWords.length - 1;
const containing = (chunks: Chunk[]) =>
  chunks.findIndex((chunk) => chunk.start <= phraseStart && chunk.start + chunk.words.length - 1 >= phraseEnd);
const noOverlapChunks = chunksFor(SIZE, 0);
const splitAt = noOverlapChunks.find((chunk) => chunk.start > phraseStart && chunk.start <= phraseEnd)?.start ?? phraseEnd + 1;
const wholeWithout = containing(noOverlapChunks);
const wholeWith = containing(labChunks);
const WINDOW_START = phraseStart - 1;
const windowWords = words.slice(WINDOW_START, phraseEnd + 1);
const afterSplit = windowWords.map((_, index) => (WINDOW_START + index >= splitAt ? index : -1)).filter((index) => index >= 0);
const wordsBefore = splitAt - phraseStart;

// Passo 5: palavras guardadas no índice por configuração.
const storageConfigs: Array<[number, number]> = [
  [10, 0],
  [10, 5],
  [10, 8],
  [20, 0],
  [20, 5],
  [20, 8],
  [40, 0],
];
const storage = storageConfigs.map(([size, overlap]) => ({ label: `${size}/${overlap}`, value: storedWords(size, overlap) }));
const worst = storage.reduce((best, item) => (item.value > best.value ? item : best));
const LAB_STORAGE = storageConfigs.findIndex(([size, overlap]) => size === SIZE && overlap === OVERLAP);

// Passo 6: contexto por pergunta e a fração útil de um chunk que contém a frase-resposta.
const K = 3;
const ANSWER = "Cada chunk vira um embedding e vai para o banco vetorial.";
const answerLength = splitIntoWords(ANSWER).length;
const contextSizes = [10, 20, 40];
const usefulShare = (size: number) => (answerLength > size ? 0 : answerLength / size);

const lesson: LessonContent = {
  id: "08-06",
  subtitle: "Quantas palavras cabem em cada chunk e quanto repetir entre vizinhos, com as mesmas contas do laboratório de chunking.",
  objectives: [
    "Calcular o número de chunks a partir do tamanho, do overlap e do passo",
    "Explicar como o overlap salva frases que cruzam a fronteira",
    "Estimar o custo do overlap em palavras guardadas e embeddings",
    "Relacionar o tamanho do chunk com o contexto de cada pergunta",
  ],
  steps: [
    {
      id: "cards",
      shortTitle: "Fichas",
      title: "Fichas pequenas ou fichas grandes",
      tag: "context",
      body: [
        "Estudando para uma prova, você pode fazer fichas pequenas, com um fato cada, ou fichas grandes, com um capítulo resumido. As pequenas são fáceis de achar, mas um fato pode depender do anterior. As grandes têm o contexto todo, mas você precisa ler a ficha inteira para achar uma linha.",
        `O [[chunk size|chunk-size]] é o tamanho da ficha. O [[chunk overlap|chunk-overlap]] é quanto do fim de uma ficha você copia no começo da seguinte. Esta aula usa o texto do laboratório, com ${TOTAL} palavras, e conta tudo em palavras como ele. Em produção, conte em tokens, com o tokenizador do modelo de embedding.`,
      ],
      keyIdea: "Tamanho decide quanto cada chunk carrega; overlap decide quanto se repete entre vizinhos.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "text", kind: "documents", label: `${TOTAL} palavras`, col: 0, row: 0 },
              { id: "chunker", kind: "tool", label: `chunker ${SIZE}/${OVERLAP}`, col: 1, row: 0 },
              { id: "chunks", kind: "queue", label: `${labChunks.length} chunks`, col: 2, row: 0 },
              { id: "embed", kind: "embedding", label: "embeddings", col: 3, row: 0 },
            ],
            edges: [
              { from: "text", to: "chunker" },
              { from: "chunker", to: "chunks", label: `passo ${STRIDE}` },
              { from: "chunks", to: "embed" },
            ],
            active: "chunker",
          },
        ],
      },
      alt: `O texto de ${TOTAL} palavras passa pelo chunker com tamanho ${SIZE} e overlap ${OVERLAP}, em destaque, que gera ${labChunks.length} chunks para os embeddings.`,
    },
    {
      id: "stride",
      shortTitle: "O passo",
      title: "Janela deslizante: tamanho menos overlap",
      tag: "mechanism",
      body: [
        `Pense numa régua de ${SIZE} palavras que você arrasta pelo texto. A cada posição, o que está embaixo dela vira um chunk. Se você arrasta ${SIZE} palavras, os chunks não se tocam; se arrasta menos, eles se sobrepõem.`,
        `O quanto a régua anda é o passo: tamanho − overlap = ${SIZE} − ${OVERLAP} = ${STRIDE}. Os chunks começam nas palavras ${labChunks.map((chunk) => chunk.start + 1).join(", ")}, e o número deles é ⌈(${TOTAL} − ${SIZE}) / ${STRIDE}⌉ + 1 = ${labChunks.length}. O último é mais curto, com ${labChunks[labChunks.length - 1].words.length} palavras. Somando, o índice guarda ${labStored} palavras para um texto de ${TOTAL}: ${fixed(labStored / TOTAL)} vez o original. Overlap igual ou maior que o tamanho daria passo zero ou negativo, e o laboratório recusa.`,
      ],
      keyIdea: "Passo = tamanho − overlap; chunks ≈ ⌈(N − tamanho) / passo⌉ + 1.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "stride-metrics",
            piece: "metrics-panel",
            metrics: [
              { id: "stride", label: "passo", value: `${SIZE} − ${OVERLAP} = ${STRIDE}` },
              { id: "chunks", label: "chunks", value: String(labChunks.length) },
              { id: "stored", label: "palavras guardadas", value: `${labStored} de ${TOTAL}` },
            ],
            highlight: "stride",
          },
          {
            id: "chunks",
            piece: "token-stream",
            tokens: labChunks.map(chunkLabel),
            bars: labChunks.map((chunk) => chunk.words.length / SIZE),
            color: "module-08",
          },
        ],
      },
      alt: `Os ${labChunks.length} chunks da configuração ${SIZE}/${OVERLAP}: ${labChunks.map(chunkLabel).join(", ")}. O passo é ${STRIDE} e o índice guarda ${labStored} palavras.`,
    },
    {
      id: "table",
      shortTitle: "A tabela",
      title: "Quantos chunks cada configuração gera",
      tag: "mechanism",
      body: [
        `Mesmo texto, réguas diferentes. A tabela mostra quantos chunks saem de cada tamanho com cada overlap. Chunks maiores dão menos chunks; overlap maior dá mais, porque a régua anda menos a cada passo.`,
        `O extremo é ${SMALL} palavras com overlap ${DENSE}: passo ${SMALL - DENSE} e ${counts[0][overlaps.length - 1]} chunks para ${TOTAL} palavras, o maior número da tabela (${maxCount}). Com ${sizes[sizes.length - 1]} palavras, o overlap quase não muda nada: ${counts[sizes.length - 1].join(", ")}. Cada chunk a mais é um embedding a gerar, um vetor a guardar e um candidato a mais na busca.`,
      ],
      keyIdea: "Overlap perto do tamanho multiplica os chunks; o custo cresce com 1 / passo.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "counts",
            piece: "matrix",
            rows: sizes.map((size) => `${size} palavras`),
            cols: overlaps.map((overlap) => `overlap ${overlap}`),
            values: counts,
            highlight: { row: LAB_ROW, col: LAB_COL },
            showValues: true,
            color: "module-08",
          },
        ],
      },
      alt: `Tabela de chunks por tamanho e overlap: ${sizes.map((size, row) => `${size} palavras: ${counts[row].join(", ")}`).join("; ")}. Em destaque, a configuração do laboratório, ${SIZE}/${OVERLAP}, com ${counts[LAB_ROW][LAB_COL]} chunks.`,
    },
    {
      id: "boundary",
      shortTitle: "Fronteira",
      title: "A frase que cai na fronteira",
      tag: "example",
      body: [
        `Sem overlap, uma régua de ${SIZE} palavras corta o texto na palavra ${splitAt + 1}, bem no meio de “${PHRASE}”. As primeiras ${wordsBefore} palavras ficam num chunk, “${windowWords.slice(afterSplit[0]).join(" ")}” fica no seguinte, e nenhum dos dois contém a ideia inteira.`,
        `Com overlap ${OVERLAP}, o chunk ${wholeWith + 1} começa na palavra ${labChunks[wholeWith].start + 1} e contém a frase inteira. É para isso que o overlap existe: o que cai perto da fronteira aparece completo em pelo menos um chunk. A regra prática é ter overlap do tamanho de uma frase curta: menos que isso não salva a frase; muito mais que isso só repete texto.`,
      ],
      keyIdea: "Overlap garante que uma ideia de até “overlap” palavras perto da fronteira apareça inteira em algum chunk.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "boundary-metrics",
            piece: "metrics-panel",
            metrics: [
              { id: "without", label: `${SIZE}/0`, value: wholeWithout < 0 ? "partida em 2 chunks" : `inteira no chunk ${wholeWithout + 1}`, color: "danger" },
              { id: "with", label: `${SIZE}/${OVERLAP}`, value: wholeWith < 0 ? "partida" : `inteira no chunk ${wholeWith + 1}`, color: "success" },
            ],
            highlight: "with",
          },
          { id: "phrase", piece: "token-stream", tokens: windowWords, keys: afterSplit, color: "module-08" },
        ],
      },
      alt: `As palavras “${windowWords.join(" ")}”, com as que caem no chunk seguinte sem overlap em destaque. Com tamanho ${SIZE} e overlap 0 a frase fica partida; com overlap ${OVERLAP}, ela aparece inteira no chunk ${wholeWith + 1}.`,
    },
    {
      id: "storage",
      shortTitle: "Custo",
      title: "O overlap se paga em palavras repetidas",
      tag: "tradeoff",
      body: [
        "Cópia tem custo: cada palavra repetida entre fichas é uma palavra a mais para escrever e guardar. No índice, isso vira mais tokens enviados ao modelo de embedding, mais vetores e chunks quase iguais disputando as vagas do top-k.",
        `O gráfico soma as palavras guardadas para o mesmo texto de ${TOTAL}. Sem overlap, guarda-se o texto uma vez. A configuração ${worst.label} guarda ${worst.value}, ${fixed(worst.value / TOTAL, 1)} vezes o original. A do laboratório, ${SIZE}/${OVERLAP}, fica em ${storage[LAB_STORAGE].value}: ${percent(storage[LAB_STORAGE].value / TOTAL - 1)} a mais pelo seguro na fronteira.`,
      ],
      keyIdea: `O índice cresce até tamanho / passo vezes o texto: ${SIZE} / ${STRIDE} ≈ ${fixed(SIZE / STRIDE)} na configuração do laboratório.`,
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "storage",
            piece: "chart",
            kind: "bar",
            series: storage,
            highlight: LAB_STORAGE,
            color: "module-08",
          },
        ],
      },
      alt: `Palavras guardadas por configuração tamanho/overlap: ${storage.map((item) => `${item.label} ${item.value}`).join(", ")}. A do laboratório, ${SIZE}/${OVERLAP}, está em destaque.`,
    },
    {
      id: "context",
      shortTitle: "Contexto",
      title: "O tamanho do chunk vira tamanho do prompt",
      tag: "tradeoff",
      body: [
        `Na hora da pergunta, a busca devolve o [[top-k|top-k]], e cada chunk entra inteiro no prompt. Com k = ${K}, o contexto é de até ${K} × tamanho palavras: ${contextSizes.map((size) => `${K * size} com chunks de ${size}`).join(", ")}. Dobrar o chunk dobra o que ocupa a [[janela de contexto|context-window]].`,
        `E nem tudo o que entra ajuda. A resposta “${ANSWER}” tem ${answerLength} palavras. Num chunk de ${contextSizes[0]}, ela nunca cabe inteira. Num de ${contextSizes[1]}, ocupa ${percent(usefulShare(contextSizes[1]))} do chunk; num de ${contextSizes[2]}, ${percent(usefulShare(contextSizes[2]))}, e o resto é texto que o modelo lê sem precisar. O tamanho certo é o da unidade de resposta da sua base: uma regra, um parágrafo, uma seção.`,
      ],
      keyIdea: "Chunk menor que a resposta parte a resposta; chunk muito maior dilui a resposta no prompt.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "useful",
            piece: "metrics-panel",
            metrics: contextSizes.map((size) => ({
              id: `size-${size}`,
              label: `chunk de ${size}`,
              value: usefulShare(size) === 0 ? "resposta não cabe" : `${percent(usefulShare(size))} útil`,
              color: usefulShare(size) === 0 ? ("danger" as const) : undefined,
            })),
            highlight: `size-${SIZE}`,
          },
          {
            id: "query",
            piece: "block-diagram",
            blocks: [
              { id: "user", kind: "user", label: "pergunta", col: 0, row: 0 },
              { id: "retrieval", kind: "retrieval", label: `top-${K}`, col: 1, row: 0 },
              { id: "context", kind: "context", label: `até ${K * SIZE} palavras`, col: 2, row: 0 },
              { id: "llm", kind: "llm", label: "llm", col: 3, row: 0 },
            ],
            edges: [
              { from: "user", to: "retrieval" },
              { from: "retrieval", to: "context", label: `${K} × ${SIZE}` },
              { from: "context", to: "llm" },
            ],
            active: "context",
          },
        ],
      },
      alt: `Fração útil de um chunk com a resposta de ${answerLength} palavras: ${contextSizes.map((size) => `chunk de ${size}, ${usefulShare(size) === 0 ? "não cabe" : percent(usefulShare(size))}`).join("; ")}. Abaixo, a pergunta passa pelo top-${K} e monta um contexto de até ${K * SIZE} palavras, em destaque, para o LLM.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Escolher tamanho e overlap com contas",
      tag: "summary",
      body: [
        `Tamanho e overlap definem o passo, e o passo define quantos chunks, quantos embeddings e quantas palavras repetidas o índice carrega. O overlap protege as ideias na fronteira; o tamanho define quanto contexto cada acerto da busca traz. No laboratório, mexa nos dois e confira estas contas: ${SIZE}/${OVERLAP} dá ${labChunks.length} chunks.`,
        "Com os chunks definidos, cada um precisa virar um vetor. A próxima aula trata da geração de embeddings em escala: lotes, normalização e o que acontece quando o modelo muda.",
      ],
      keyIdea: "Escolha o tamanho pela unidade de resposta, o overlap por uma frase curta, e meça antes de fixar.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "rules",
            piece: "pipeline",
            display: "chips",
            stages: [
              { id: "unit", label: "tamanho = unidade de resposta" },
              { id: "overlap", label: "overlap ≈ uma frase" },
              { id: "count", label: "contar chunks e custo", color: "module-08" },
              { id: "context", label: "k × tamanho cabe no prompt" },
              { id: "measure", label: "medir com perguntas reais", color: "brand" },
            ],
          },
        ],
      },
      alt: "Fluxo em chips: tamanho igual à unidade de resposta, overlap de cerca de uma frase, contar chunks e custo, conferir se k vezes o tamanho cabe no prompt e medir com perguntas reais.",
    },
  ],
  realWorldExample:
    "Os splitters do LangChain e do LlamaIndex expõem os dois parâmetros desta aula, chunk_size e chunk_overlap. A unidade muda: o RecursiveCharacterTextSplitter do LangChain mede em caracteres por padrão, e o SentenceSplitter do LlamaIndex mede em tokens. Trocar de biblioteca sem converter a unidade muda o tamanho real dos chunks.",
  code: {
    language: "python",
    source: `def chunk_words(words: list[str], size: int, overlap: int) -> list[list[str]]:
    if overlap >= size:
        raise ValueError("o overlap precisa ser menor que o tamanho")
    stride = size - overlap
    chunks = []
    for start in range(0, len(words), stride):
        chunks.append(words[start:start + size])
        if start + size >= len(words):
            break
    return chunks

words = open("texto.txt", encoding="utf-8").read().split()
print(len(chunk_words(words, 20, 5)))  # 4 para as 60 palavras do laboratório`,
    caption: "A mesma janela deslizante do laboratório em Python: passo = tamanho − overlap, e para no chunk que chega ao fim do texto.",
  },
  tradeOffs: {
    pros: [
      "Overlap mantém inteiras as ideias que caem na fronteira",
      "Chunks pequenos dão acertos precisos na busca",
      "Chunks grandes levam mais contexto em volta de cada acerto",
    ],
    cons: [
      "Overlap multiplica chunks, embeddings e vetores guardados",
      "Chunks vizinhos quase iguais podem ocupar várias vagas do top-k",
      "Chunks grandes enchem o prompt com texto que não responde a pergunta",
    ],
    alternatives: [
      "Chunks por frase ou parágrafo, sem tamanho fixo (aula 08.05)",
      "Buscar com chunks pequenos e enviar o trecho pai maior (aula 08.13)",
      "Deduplicar chunks sobrepostos na montagem do contexto (aula 08.09)",
    ],
  },
  knowledgeCheck: [
    {
      id: "overlap-equal",
      prompt: "Alguém configura chunk_size = 200 e chunk_overlap = 200. O que acontece?",
      options: [
        "Os chunks ficam com 400 tokens",
        "O passo é zero: a janela não anda, e o splitter precisa recusar a configuração",
        "O overlap é ignorado e tudo funciona",
        "Sai um chunk só com o documento inteiro",
      ],
      correct: 1,
      explanation: "Passo = tamanho − overlap = 0. A janela ficaria parada no mesmo lugar para sempre; por isso o laboratório exige overlap menor que o tamanho.",
      lesson: "08-06",
    },
    {
      id: "rules-split",
      prompt: "As regras do seu manual têm de 30 a 40 palavras, e as respostas saem pela metade. Os chunks têm 20 palavras e overlap 0. Qual mudança ataca a causa?",
      options: [
        "Aumentar o top-k para 10",
        "Usar chunks maiores que uma regra, de umas 50 palavras, com overlap de uma frase curta",
        "Reduzir os chunks para 10 palavras",
        "Trocar o LLM por um maior",
      ],
      correct: 1,
      explanation: "Um chunk menor que a unidade de resposta nunca contém a regra inteira. Chunks do tamanho da regra, com um pouco de overlap, deixam cada regra completa em algum chunk.",
      lesson: "08-06",
    },
  ],
  related: ["08-05", "08-07", "04-05"],
  references: [
    { title: "Pinecone: Chunking Strategies for LLM Applications", url: "https://www.pinecone.io/learn/chunking-strategies/", kind: "article" },
    { title: "LlamaIndex: documentação", url: "https://docs.llamaindex.ai/", kind: "docs" },
    { title: "LangChain: documentação", url: "https://python.langchain.com/", kind: "docs" },
  ],
};

export default lesson;
