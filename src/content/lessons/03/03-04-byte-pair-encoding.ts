import { applyMerges, trainBpe, type Merge } from "../../../lab/bpe";
import type { MatrixSpec } from "../../../scene/types";
import type { LessonContent } from "../../../types/content";

// O exemplo clássico de Sennrich et al. (2016): quatro palavras com as suas frequências. Aqui sem o
// marcador de fim de palavra, para simplificar. Todos os merges, contagens e cortes da aula são
// calculados com o BPE do Laboratório (src/lab/bpe.ts), não escritos à mão.

const wordCounts: Record<string, number> = { low: 5, lower: 2, newest: 6, widest: 3 };
const words = Object.keys(wordCounts);
const corpus = words.flatMap((word) => Array<string>(wordCounts[word]).fill(word)).join(" ");
const merges = trainBpe(corpus, 20);
const mergeTokens = merges.map(([left, right]) => left + right);

/** Símbolos de cada palavra depois dos `count` primeiros merges. */
const symbolsAfter = (count: number) =>
  Object.fromEntries(words.map((word) => [word, applyMerges(word, merges, count).words[0] ?? []]));

/** Pares vizinhos contados com o peso da frequência de cada palavra, como no treino do BPE. */
function pairCounts(count: number) {
  const state = symbolsAfter(count);
  const symbols = [...new Set(words.flatMap((word) => state[word]))];
  const values = symbols.map(() => symbols.map(() => 0));
  for (const word of words) {
    const pieces = state[word];
    for (let index = 0; index < pieces.length - 1; index += 1) {
      values[symbols.indexOf(pieces[index])][symbols.indexOf(pieces[index + 1])] += wordCounts[word];
    }
  }
  return { symbols, values };
}

const pairCount = (count: number, [left, right]: Merge) => {
  const { symbols, values } = pairCounts(count);
  return values[symbols.indexOf(left)][symbols.indexOf(right)];
};

function pairMatrix(count: number): MatrixSpec {
  const { symbols, values } = pairCounts(count);
  const [left, right] = merges[count];
  return {
    id: "pairs",
    piece: "matrix",
    rows: symbols,
    cols: symbols,
    values,
    highlight: { row: symbols.indexOf(left), col: symbols.indexOf(right) },
    color: "module-03",
  };
}

const firstMerge = merges[0];
const secondMerge = merges[1];
const firstCount = pairCount(0, firstMerge);
const secondCount = pairCount(1, secondMerge);
const tieCount = pairCount(0, ["s", "t"]);
const afterFirst = symbolsAfter(1);

const unseen = ["lowest", "slower"].map((word) => ({ word, tokens: applyMerges(word, merges).words[0] ?? [] }));
const lowest = unseen[0];

// Byte-level BPE: os bytes UTF-8 de "ação". "ç" e "ã" ocupam 2 bytes cada.
const accented = "ação";
const accentedBytes = [...new TextEncoder().encode(accented)].map((byte) => byte.toString(16).toUpperCase().padStart(2, "0"));

const totalSymbols = (count: number) =>
  words.reduce((total, word) => total + symbolsAfter(count)[word].length * wordCounts[word], 0);

const lesson: LessonContent = {
  id: "03-04",
  subtitle:
    "O algoritmo que monta o vocabulário da família GPT: comece pelos caracteres e junte, uma vez por rodada, o par vizinho mais frequente.",
  objectives: [
    "Executar à mão o treino do BPE: contar pares, juntar o mais frequente e repetir",
    "Aplicar a lista de merges, na ordem aprendida, para tokenizar uma palavra nova",
    "Explicar por que o BPE por byte nunca encontra um caractere desconhecido",
    "Comparar o BPE com WordPiece e Unigram",
  ],
  steps: [
    {
      id: "idea",
      shortTitle: "Ideia",
      title: "Comece pelos caracteres e junte o par mais frequente",
      tag: "context",
      body: [
        "O [[Byte Pair Encoding (BPE)|bpe]] nasceu em 1994 como algoritmo de compressão e foi adaptado para tokenização por Sennrich, Haddow e Birch em 2016. A regra é curta: comece com cada caractere como um símbolo, conte todos os pares de símbolos vizinhos no corpus, junte o par mais frequente num símbolo novo e repita.",
        "Cada junção, chamada merge, acrescenta um token ao vocabulário. O treino para quando o vocabulário chega ao tamanho escolhido. O resultado é o vocabulário e a lista ordenada de merges, que é o próprio tokenizador.",
      ],
      keyIdea: "O BPE não sabe nada de linguística. Ele junta o que aparece junto com mais frequência.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [{ id: "word", piece: "token-stream", tokens: [..."newest"] }],
      },
      alt: "A palavra newest dividida em seis caracteres, o ponto de partida do BPE.",
    },
    {
      id: "corpus",
      shortTitle: "Corpus",
      title: "O treino olha para as palavras e as suas frequências",
      tag: "mechanism",
      body: [
        `O corpus do exemplo tem quatro palavras: ${words.map((word) => `“${word}” (${wordCounts[word]}×)`).join(", ")}. Antes de tudo, o texto é pré-tokenizado em palavras, e cada palavra vira uma lista de caracteres. Pares nunca atravessam a fronteira entre duas palavras.`,
        `Como a mesma palavra se repete, basta guardar cada palavra uma vez com a sua contagem. Ao contar um par, ele vale tantas vezes quanto a palavra aparece. No início, o corpus tem ${totalSymbols(0)} símbolos.`,
      ],
      keyIdea: "Trabalhar com palavras e contagens, em vez do texto corrido, deixa o treino rápido mesmo com corpora enormes.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "corpus",
            piece: "metrics-panel",
            metrics: words.map((word) => ({ id: word, label: [...word].join(" "), value: `${wordCounts[word]}×` })),
          },
        ],
      },
      alt: `Corpus de treino: ${words.map((word) => `${[...word].join(" ")} com ${wordCounts[word]} ocorrências`).join(", ")}.`,
    },
    {
      id: "count-pairs",
      shortTitle: "Contar pares",
      title: "Conte cada par de símbolos vizinhos",
      tag: "mechanism",
      body: [
        `A matriz mostra a contagem de cada par: a linha é o símbolo da esquerda e a coluna, o da direita. O par “${firstMerge[0]}” + “${firstMerge[1]}” aparece ${firstCount} vezes: ${wordCounts.newest} em “newest” e ${wordCounts.widest} em “widest”.`,
        `Há um empate: “s” + “t” também soma ${tieCount}. A regra de desempate precisa ser fixa, senão dois treinos no mesmo corpus dariam tokenizadores diferentes. Aqui, vence o par encontrado primeiro no corpus.`,
      ],
      keyIdea: "Uma rodada do BPE é uma contagem: a célula mais quente da matriz é o próximo merge.",
      scene: { kind: "pieces", layout: "single", pieces: [pairMatrix(0)] },
      alt: `Matriz de contagem de pares no início. O par ${firstMerge.join(" + ")} está em destaque, com ${firstCount} ocorrências.`,
    },
    {
      id: "first-merge",
      shortTitle: "Merge 1",
      title: `“${firstMerge[0]}” + “${firstMerge[1]}” vira “${mergeTokens[0]}”`,
      tag: "mechanism",
      body: [
        `O par vencedor vira um símbolo novo, “${mergeTokens[0]}”, e entra no vocabulário. Toda ocorrência do par no corpus é substituída: “newest” passa a ser ${afterFirst.newest.map((symbol) => `“${symbol}”`).join(" ")}.`,
        `O corpus agora tem ${totalSymbols(1)} símbolos, ${totalSymbols(0) - totalSymbols(1)} a menos. Cada merge reduz o comprimento do corpus exatamente pelo número de ocorrências do par juntado.`,
      ],
      keyIdea: "Cada merge acrescenta um token ao vocabulário e encurta o corpus. É uma troca direta.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "word",
            piece: "token-stream",
            tokens: afterFirst.newest,
            query: afterFirst.newest.indexOf(mergeTokens[0]),
          },
        ],
      },
      alt: `A palavra newest depois do primeiro merge: ${afterFirst.newest.join(" ")}, com ${mergeTokens[0]} em destaque.`,
    },
    {
      id: "repeat",
      shortTitle: "Repetir",
      title: "Conte de novo: os símbolos novos formam pares novos",
      tag: "mechanism",
      body: [
        `Na segunda rodada, “${mergeTokens[0]}” já é um símbolo e participa dos pares. “${secondMerge[0]}” + “${secondMerge[1]}” aparece ${secondCount} vezes e vira “${mergeTokens[1]}”. Tokens longos crescem assim, um pedaço por rodada.`,
        "O “s” sozinho sumiu da matriz: depois do primeiro merge, ele só aparecia grudado no “e”. A matriz é recalculada a cada rodada, porque cada merge muda os vizinhos.",
      ],
      keyIdea: "Merges se apoiam em merges anteriores. É assim que surgem tokens de palavras inteiras.",
      scene: { kind: "pieces", layout: "single", pieces: [pairMatrix(1)] },
      alt: `Matriz de pares na segunda rodada, com ${secondMerge.join(" + ")} em destaque e ${secondCount} ocorrências.`,
    },
    {
      id: "merge-list",
      shortTitle: "Lista",
      title: `${merges.length} merges depois, nenhum par se repete`,
      tag: "mechanism",
      body: [
        `O treino segue até não haver par com duas ou mais ocorrências. Neste corpus isso dá ${merges.length} merges, na ordem da cena: ${mergeTokens.map((token) => `“${token}”`).join(", ")}. O corpus caiu de ${totalSymbols(0)} para ${totalSymbols(merges.length)} símbolos.`,
        "Num tokenizador real, o critério de parada é o tamanho do vocabulário. O GPT-2 parou em 50 mil merges sobre os 256 bytes base. A ordem é parte do tokenizador: merges anteriores são aplicados antes.",
      ],
      keyIdea: "O tokenizador treinado é o vocabulário mais a lista ordenada de merges.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [{ id: "word", piece: "token-stream", tokens: mergeTokens, keys: [mergeTokens.indexOf("newest")] }],
      },
      alt: `Os ${merges.length} tokens aprendidos, em ordem: ${mergeTokens.join(", ")}.`,
    },
    {
      id: "encode-new-word",
      shortTitle: "Tokenizar",
      title: "Para tokenizar, aplique os merges na ordem aprendida",
      tag: "mechanism",
      body: [
        `Uma palavra nova começa como caracteres, e os merges são aplicados um a um, na ordem do treino. “lowest” nunca apareceu no corpus, mas vira ${lowest.tokens.map((token) => `“${token}”`).join(" + ")}: os merges de “${mergeTokens[1]}” e de “low” se aplicam. “slower” vira ${unseen[1].tokens.map((token) => `“${token}”`).join(" + ")}.`,
        "O BPE generaliza por pedaços: radicais e sufixos frequentes viram tokens, e uma palavra nova é montada com eles. Como os caracteres continuam no vocabulário, o pior caso é cair em caracteres soltos, nunca em [UNK].",
      ],
      keyIdea: "Tokenizar é repetir o treino sem contar nada: só aplicar a lista de merges na mesma ordem.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          { id: "word", piece: "token-stream", tokens: lowest.tokens, keys: [0, 1] },
          { id: "chars", piece: "token-stream", tokens: [...lowest.word], color: "muted" },
        ],
      },
      alt: `A palavra nova lowest vira os tokens ${lowest.tokens.join(" e ")}; abaixo, os caracteres de partida.`,
    },
    {
      id: "byte-level",
      shortTitle: "Bytes",
      title: "BPE por byte: 256 símbolos base cobrem qualquer texto",
      tag: "mechanism",
      body: [
        `Começar por caracteres deixa um problema: o Unicode tem mais de 150 mil caracteres, e um emoji ou ideograma raro ficaria sem símbolo base. O GPT-2 resolveu isso começando pelos 256 valores de byte. Em UTF-8, “${accented}” tem ${accented.length} caracteres e ${accentedBytes.length} bytes: ${accentedBytes.join(" ")}. “ç” e “ã” ocupam dois bytes cada.`,
        "Os merges juntam bytes frequentes até formar letras acentuadas, sílabas e palavras. Uma regex de pré-tokenização separa letras, números, pontuação e espaços antes do BPE, para não criar tokens que misturam palavra e pontuação.",
      ],
      keyIdea: "Com bytes como base, o vocabulário inicial tem 256 símbolos e nenhum texto fica de fora.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          { id: "word", piece: "token-stream", tokens: [...accented] },
          { id: "chars", piece: "token-stream", tokens: accentedBytes, keys: [1, 2, 3, 4], color: "info" },
        ],
      },
      alt: `“${accented}” em caracteres e em bytes UTF-8: ${accentedBytes.join(", ")}. Os bytes de ç e ã estão em destaque.`,
    },
    {
      id: "limits",
      shortTitle: "Limites",
      title: "Frequência não é significado",
      tag: "tradeoff",
      body: [
        "O BPE é guloso: cada rodada escolhe o melhor par naquele momento, sem rever escolhas anteriores. O corte segue a frequência do corpus do tokenizador, não a morfologia. Um sufixo comum pode virar token, mas uma palavra pode ser cortada num ponto que não faz sentido gramatical.",
        "Duas alternativas são comuns. O WordPiece (BERT) escolhe o par pela razão entre a frequência do par e a das partes, o que favorece juntar pedaços que quase só aparecem juntos. O Unigram (SentencePiece, T5) faz o caminho inverso: começa com um vocabulário grande e remove os tokens que menos pioram a probabilidade do corpus.",
      ],
      keyIdea: "BPE, WordPiece e Unigram resolvem o mesmo problema com critérios diferentes. Nenhum deles entende o texto.",
      scene: { kind: "pieces", layout: "single", pieces: [pairMatrix(merges.length - 1)] },
      alt: `Matriz de pares na última rodada, com o par ${merges[merges.length - 1].join(" + ")} em destaque.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Contar, juntar, repetir",
      tag: "summary",
      body: [
        "Treino: comece por caracteres ou bytes, conte os pares vizinhos ponderados pela frequência das palavras, junte o mais frequente e repita até o tamanho de vocabulário desejado. Tokenização: aplique os merges na mesma ordem.",
        "Palavras frequentes viram um token, palavras novas são montadas com pedaços conhecidos e, com bytes como base, nada fica sem representação. Teste o processo com o seu próprio texto no playground do tokenizador BPE no Laboratório.",
      ],
      keyIdea: "Todo o tokenizador BPE cabe em duas listas: os símbolos base e os merges, em ordem.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [{ id: "word", piece: "token-stream", tokens: mergeTokens }],
      },
      alt: `Resumo: os ${merges.length} merges aprendidos no exemplo, ${mergeTokens.join(", ")}.`,
    },
  ],
  realWorldExample:
    "O tokenizador do GPT-2 é um BPE por byte com 50 mil merges treinados sobre o WebText, texto de páginas linkadas no Reddit. O mesmo desenho, com corpora e tamanhos diferentes, aparece no cl100k_base e no o200k_base da OpenAI e no tokenizador do Llama 3. Uma equipe que treina um modelo para código-fonte costuma treinar o seu próprio BPE: com um corpus de código, sequências como quatro espaços de indentação, “self.” e “return” viram tokens únicos, e o mesmo arquivo cabe em bem menos tokens do que com um tokenizador treinado em prosa.",
  code: {
    language: "python",
    caption:
      "Treino e tokenização BPE em Python puro, com o corpus da aula. Os pares são contados com o peso da frequência de cada palavra.",
    source: `from collections import Counter

def train_bpe(word_counts: dict[str, int], num_merges: int) -> list[tuple[str, str]]:
    # Cada palavra começa como uma lista de caracteres.
    words = {word: list(word) for word in word_counts}
    merges = []
    for _ in range(num_merges):
        # 1. Conta os pares vizinhos, pesando pela frequência da palavra.
        pairs = Counter()
        for word, symbols in words.items():
            for left, right in zip(symbols, symbols[1:]):
                pairs[left, right] += word_counts[word]
        if not pairs:
            break
        # 2. O par mais frequente vira um token novo (empate: o primeiro encontrado).
        best = max(pairs, key=pairs.get)
        if pairs[best] < 2:
            break
        merges.append(best)
        # 3. Substitui o par em todas as palavras.
        for word, symbols in words.items():
            merged, i = [], 0
            while i < len(symbols):
                if symbols[i : i + 2] == list(best):
                    merged.append(symbols[i] + symbols[i + 1])
                    i += 2
                else:
                    merged.append(symbols[i])
                    i += 1
            words[word] = merged
    return merges

def tokenize(word: str, merges: list[tuple[str, str]]) -> list[str]:
    symbols = list(word)
    for left, right in merges:  # aplica os merges na ordem em que foram aprendidos
        merged, i = [], 0
        while i < len(symbols):
            if symbols[i : i + 2] == [left, right]:
                merged.append(left + right)
                i += 2
            else:
                merged.append(symbols[i])
                i += 1
        symbols = merged
    return symbols

merges = train_bpe({"low": 5, "lower": 2, "newest": 6, "widest": 3}, num_merges=10)
print(merges[:4])                 # [('e', 's'), ('es', 't'), ('l', 'o'), ('lo', 'w')]
print(tokenize("lowest", merges))  # ['low', 'est']
print(tokenize("slower", merges))  # ['s', 'low', 'e', 'r']`,
  },
  tradeOffs: {
    pros: [
      "Simples de implementar e de entender: contar, juntar e repetir",
      "Com bytes como base, representa qualquer texto sem [UNK]",
      "Tokenizar é determinístico e rápido: só aplicar a lista de merges",
    ],
    cons: [
      "Guloso e guiado só por frequência: os cortes nem sempre seguem a morfologia",
      "Reflete o corpus de treino do tokenizador; idiomas e domínios raros ficam picados",
      "A aplicação ingênua dos merges, um por um, é lenta; implementações reais usam estruturas por prioridade de merge",
    ],
    alternatives: [
      "WordPiece, que escolhe merges pela razão entre a frequência do par e a das partes",
      "Unigram (SentencePiece), que poda um vocabulário grande pela probabilidade do corpus",
    ],
  },
  knowledgeCheck: [
    {
      id: "bpe-next-merge",
      prompt: "Numa rodada do treino BPE, qual par vira o próximo token?",
      options: [
        "O par que forma a palavra mais longa",
        "O par vizinho mais frequente no corpus, contando a frequência de cada palavra",
        "Um par sorteado entre os que aparecem",
        "O par que aparece na primeira palavra do corpus",
      ],
      correct: 1,
      explanation:
        "O BPE conta todos os pares de símbolos vizinhos, ponderados pela frequência das palavras, e junta o mais frequente. Empates seguem uma regra fixa.",
      lesson: "03-04",
    },
    {
      id: "bpe-merge-order",
      prompt: "Por que a ordem da lista de merges importa na tokenização?",
      options: [
        "Porque o tokenizador aplica os merges na ordem em que foram aprendidos, e merges posteriores dependem dos anteriores",
        "Porque a ordem define o idioma do texto",
        "Porque merges posteriores têm ids menores",
        "Não importa: qualquer ordem dá o mesmo resultado",
      ],
      correct: 0,
      explanation:
        "“est” só existe depois de “es”. Aplicar os merges em outra ordem gera cortes diferentes dos vistos no treino.",
      lesson: "03-04",
    },
    {
      id: "byte-level-bpe",
      prompt: "Qual a vantagem de começar o BPE pelos 256 bytes em vez de caracteres Unicode?",
      options: [
        "Os tokens ficam sempre com um byte",
        "O vocabulário base fica pequeno e cobre qualquer texto, inclusive emojis e caracteres raros",
        "Elimina a necessidade de merges",
        "Deixa o texto mais curto antes do treino",
      ],
      correct: 1,
      explanation:
        "Todo texto em UTF-8 é uma sequência de bytes. Com os 256 bytes no vocabulário, nenhum caractere fica sem representação.",
      lesson: "03-04",
    },
  ],
  related: ["03-02", "03-03", "03-05"],
  references: [
    {
      title: "Sennrich, Haddow e Birch (2016), Neural Machine Translation of Rare Words with Subword Units",
      url: "https://arxiv.org/abs/1508.07909",
      kind: "paper",
    },
    {
      title: "Radford et al. (2019), Language Models are Unsupervised Multitask Learners (GPT-2, BPE por byte)",
      url: "https://cdn.openai.com/better-language-models/language_models_are_unsupervised_multitask_learners.pdf",
      kind: "paper",
    },
    {
      title: "Kudo (2018), Subword Regularization (modelo Unigram)",
      url: "https://arxiv.org/abs/1804.10959",
      kind: "paper",
    },
    {
      title: "karpathy/minbpe: implementação mínima do BPE por byte",
      url: "https://github.com/karpathy/minbpe",
      kind: "repo",
    },
    {
      title: "Hugging Face Transformers: Summary of the tokenizers",
      url: "https://huggingface.co/docs/transformers/tokenizer_summary",
      kind: "docs",
    },
  ],
};

export default lesson;
