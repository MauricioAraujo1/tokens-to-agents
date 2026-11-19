import { applyMerges, trainBpe } from "../../../lab/bpe";
import { bpeTokenizerContent } from "../../playgrounds/bpe-tokenizer";
import type { LessonContent } from "../../../types/content";

// As segmentações em subpalavras desta aula são calculadas com o mesmo tokenizador BPE de
// brinquedo do Laboratório: 30 merges aprendidos no corpus do playground. Nada é escrito à mão.

const merges = trainBpe(bpeTokenizerContent.corpus, bpeTokenizerContent.mergeCount);
const tokenize = (text: string) => applyMerges(text, merges).words.flat();

// Vocabulário do tokenizador de brinquedo: os caracteres do corpus, em ordem, e depois um token por merge.
const baseSymbols = [...new Set([...bpeTokenizerContent.corpus.replace(/\s+/g, "")])].sort();
const vocabulary = [...baseSymbols, ...merges.map(([left, right]) => left + right)];
const idOf = (token: string) => vocabulary.indexOf(token);

const sentence = "os modelos tokenizam textos";
const sentenceTokens = tokenize(sentence);
const sentenceIds = sentenceTokens.map(idOf);

const characters = [..."tokenização"];
const rareWords = ["modelos", "tokenização", "girafas", "eletrodomésticos"].map((word) => ({
  word,
  tokens: tokenize(word),
}));
const girafas = rareWords[2];

const lesson: LessonContent = {
  id: "03-02",
  subtitle:
    "Antes de qualquer cálculo, o texto é cortado em tokens e cada token vira um número. A forma do corte define custo, alcance e até os erros do modelo.",
  objectives: [
    "Explicar por que um modelo de linguagem precisa de tokens e ids em vez de texto",
    "Comparar tokenização por caractere, por palavra e por subpalavra",
    "Descrever as etapas de um tokenizador: normalização, pré-tokenização, modelo e pós-processamento",
    "Prever o efeito da tokenização no custo e no tamanho do contexto",
  ],
  steps: [
    {
      id: "text-to-numbers",
      shortTitle: "Por quê",
      title: "Uma rede neural só opera sobre números",
      tag: "context",
      body: [
        "Um modelo de linguagem é uma pilha de multiplicações de matrizes. Ele não recebe letras: recebe uma lista de números inteiros. [[Tokenization|tokenization]] (tokenização) é o passo que corta o texto em pedaços, os tokens, e troca cada pedaço pelo seu número no vocabulário.",
        "O tokenizador é treinado antes do modelo e fica congelado. Tudo o que o modelo lê e escreve passa por ele: o prompt é tokenizado na entrada, e a resposta sai como ids que o tokenizador converte de volta em texto.",
      ],
      keyIdea: "O modelo nunca vê o seu texto. Ele vê a sequência de ids que o tokenizador produziu.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          { id: "tokens", piece: "token-stream", tokens: sentenceTokens },
          { id: "ids", piece: "token-stream", tokens: sentenceIds.map(String), color: "info" },
        ],
      },
      alt: `A frase “${sentence}” cortada em ${sentenceTokens.length} tokens (${sentenceTokens.join(", ")}) e, abaixo, os ids correspondentes: ${sentenceIds.join(", ")}.`,
    },
    {
      id: "characters",
      shortTitle: "Caracteres",
      title: "Cortar por caractere deixa a sequência longa demais",
      tag: "mechanism",
      body: [
        `A opção mais simples é um token por caractere. O vocabulário fica minúsculo (umas centenas de símbolos, ou 256 se o corte for por byte) e nenhuma palavra fica sem representação. O preço é o comprimento: “tokenização” vira ${characters.length} tokens.`,
        "Sequências longas custam caro. O Transformer compara cada token com todos os outros, e o custo cresce com o quadrado do comprimento: o triplo de tokens custa cerca de nove vezes mais nessa etapa. Além disso, o modelo gasta capacidade aprendendo a montar palavras a partir de letras.",
      ],
      keyIdea: "Vocabulário pequeno significa sequência longa. E sequência longa custa caro no Transformer.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [{ id: "tokens", piece: "token-stream", tokens: characters }],
      },
      alt: `A palavra “tokenização” cortada em ${characters.length} caracteres.`,
    },
    {
      id: "words",
      shortTitle: "Palavras",
      title: "Cortar por palavra estoura o vocabulário",
      tag: "mechanism",
      body: [
        "No outro extremo, cada palavra é um token. A sequência fica curta, mas o vocabulário explode. Só o verbo “falar” tem dezenas de formas (falo, falas, falamos, falaram, falaríamos…), e cada uma precisaria de uma entrada própria, sem nenhuma relação com as outras.",
        "Pior: toda palavra fora da lista vira um problema de [[Out-of-Vocabulary (OOV)|oov]]. Nomes próprios, erros de digitação e termos novos caem num token genérico [UNK] (unknown), e o modelo perde a informação. Na cena, o vocabulário de palavras não conhece “tokenizam”.",
      ],
      keyIdea: "Vocabulário por palavra é grande, não compartilha nada entre formas da mesma palavra e ainda deixa palavras de fora.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [{ id: "tokens", piece: "token-stream", tokens: ["os", "modelos", "[UNK]", "textos"], query: 2, color: "danger" }],
      },
      alt: "A frase “os modelos tokenizam textos” cortada por palavra. “tokenizam” não está no vocabulário e vira [UNK].",
    },
    {
      id: "subwords",
      shortTitle: "Subpalavras",
      title: "Subpalavras: palavras comuns inteiras, raras em pedaços",
      tag: "mechanism",
      body: [
        "Os tokenizadores modernos usam [[subword|subword]] (subpalavras). Sequências frequentes no corpus de treino do tokenizador viram um token só; palavras raras são montadas com pedaços menores. Como os caracteres (ou bytes) continuam no vocabulário, qualquer texto pode ser representado: não existe mais [UNK].",
        `Na cena, o tokenizador de brinquedo do Laboratório, com ${merges.length} merges aprendidos num corpus pequeno, corta “${sentence}” em ${sentenceTokens.length} tokens: ${sentenceTokens.map((token) => `“${token}”`).join(", ")}. “tokenizam” não aparecia no corpus, mas “tokenizador” e “tokenizadores” sim. Os merges criaram o pedaço “tokeniza”, e o “m” final vem avulso.`,
        "Os três algoritmos mais usados são BPE (família GPT e Llama), WordPiece (BERT) e Unigram (T5, via SentencePiece). A aula 03.04 mostra o BPE passo a passo.",
      ],
      keyIdea: "Subpalavras equilibram as duas pontas: vocabulário de dezenas de milhares de tokens e sequências curtas, sem palavra desconhecida.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [{ id: "tokens", piece: "token-stream", tokens: sentenceTokens, keys: [2, 3] }],
      },
      alt: `A frase “${sentence}” cortada em subpalavras: ${sentenceTokens.join(", ")}. “tokeniza” e “m” estão em destaque.`,
    },
    {
      id: "pipeline",
      shortTitle: "Etapas",
      title: "O tokenizador é um pipeline de quatro etapas",
      tag: "mechanism",
      body: [
        "Normalização: limpa o texto de forma determinística, por exemplo unificando a forma Unicode de “ç” e “ã” (NFC) ou, em alguns modelos, passando tudo para minúsculas.",
        "Pré-tokenização: separa o texto em blocos, em geral por espaços e pontuação, para que nenhum token atravesse a fronteira entre palavras. Modelo: aplica o algoritmo de subpalavras (BPE, WordPiece ou Unigram) dentro de cada bloco. Pós-processamento: acrescenta tokens especiais que o modelo espera, como o de início de sequência.",
        "O mesmo texto pode virar sequências diferentes em tokenizadores diferentes. Por isso cada modelo vem com o seu tokenizador, e trocar um pelo outro quebra o modelo.",
      ],
      keyIdea: "Um tokenizador é parte do modelo: normalização, regras de corte e vocabulário precisam ser exatamente os do treino.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "tokenizer",
            piece: "pipeline",
            stages: [
              { id: "text", label: "texto" },
              { id: "normalize", label: "normalização" },
              { id: "pretokenize", label: "pré-tokenização" },
              { id: "model", label: "BPE / WordPiece" },
              { id: "post", label: "tokens especiais" },
              { id: "ids", label: "ids" },
            ],
            active: "model",
            done: ["text", "normalize", "pretokenize"],
          },
        ],
      },
      alt: "Pipeline do tokenizador: texto, normalização, pré-tokenização, modelo BPE ou WordPiece em destaque, tokens especiais e ids.",
    },
    {
      id: "ids",
      shortTitle: "Ids",
      title: "Cada token vira o seu número no vocabulário",
      tag: "mechanism",
      body: [
        `Depois do corte, cada token é procurado no vocabulário e trocado pelo seu índice. No tokenizador de brinquedo, o vocabulário tem ${vocabulary.length} entradas: os ${baseSymbols.length} caracteres do corpus seguidos de um token por merge. “${sentenceTokens[0]}” vira ${sentenceIds[0]} e “${sentenceTokens[2]}” vira ${sentenceIds[2]}.`,
        "O caminho de volta, a decodificação, é a mesma tabela lida ao contrário. É assim que os ids gerados pelo modelo voltam a ser texto. Os números em si não carregam significado: o id 5 não é “parecido” com o 6. O significado entra na próxima camada, quando cada id escolhe uma linha da matriz de embeddings.",
      ],
      keyIdea: "Um id é só um endereço na tabela do vocabulário. Proximidade entre ids não quer dizer nada.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          { id: "tokens", piece: "token-stream", tokens: sentenceTokens, query: 2 },
          { id: "ids", piece: "token-stream", tokens: sentenceIds.map(String), query: 2, color: "info" },
        ],
      },
      alt: `Tokens e ids lado a lado: ${sentenceTokens.map((token, index) => `${token} → ${sentenceIds[index]}`).join(", ")}.`,
    },
    {
      id: "whitespace",
      shortTitle: "Espaços",
      title: "Espaço e maiúscula mudam o token",
      tag: "example",
      body: [
        "Nos tokenizadores da família GPT, o espaço antes da palavra faz parte do token. “gato” no começo do texto, “ gato” depois de um espaço e “ Gato” com maiúscula são três tokens diferentes, com ids diferentes. O tokenizador do GPT-2 mostra esse espaço como “Ġ” na lista de tokens.",
        "Isso tem efeitos práticos. Um espaço sobrando no fim do prompt muda o primeiro token que o modelo espera gerar. E o modelo precisa aprender, a partir dos dados, que as três formas significam a mesma coisa.",
      ],
      keyIdea: "Para o tokenizador, “gato”, “ gato” e “ Gato” são símbolos diferentes. A equivalência entre eles é aprendida, não dada.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [{ id: "tokens", piece: "token-stream", tokens: ["gato", "␣gato", "␣Gato"], keys: [0, 1, 2] }],
      },
      alt: "Três tokens diferentes: gato, espaço mais gato, e espaço mais Gato com maiúscula.",
    },
    {
      id: "cost-by-language",
      shortTitle: "Custo",
      title: "Texto raro para o tokenizador custa mais tokens",
      tag: "tradeoff",
      body: [
        `O tokenizador aprende os pedaços frequentes no seu próprio corpus. O que é comum ali fica barato; o resto é picado. No brinquedo da cena, ${rareWords.map(({ word, tokens }) => `“${word}” vira ${tokens.length} ${tokens.length === 1 ? "token" : "tokens"}`).join(", ")}.`,
        "Nos tokenizadores reais acontece o mesmo em escala: eles são treinados com muito texto em inglês, e um texto em português costuma precisar de mais tokens que o equivalente em inglês. Para o inglês, a OpenAI cita uma regra prática de cerca de 4 caracteres por token.",
        "Como preço de API, limite de contexto e tempo de geração são contados em tokens, a mesma pergunta pode custar mais e caber menos dependendo do idioma e do domínio do texto.",
      ],
      keyIdea: "Conte tokens, não palavras. Meça o seu texto real no tokenizador do modelo que você vai usar.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          { id: "tokens", piece: "token-stream", tokens: girafas.tokens, color: "danger" },
          {
            id: "counts",
            piece: "metrics-panel",
            metrics: rareWords.map(({ word, tokens }) => ({ id: word, label: word, value: String(tokens.length) })),
            highlight: girafas.word,
          },
        ],
      },
      alt: `“${girafas.word}” cortada em ${girafas.tokens.length} pedaços (${girafas.tokens.join(", ")}). Tokens por palavra: ${rareWords
        .map(({ word, tokens }) => `${word} ${tokens.length}`)
        .join(", ")}.`,
    },
    {
      id: "quirks",
      shortTitle: "Limites",
      title: "Muitos erros curiosos de LLMs começam no tokenizador",
      tag: "tradeoff",
      body: [
        "Como o modelo vê tokens e não letras, tarefas de caractere ficam difíceis: contar quantas letras “r” há numa palavra, inverter uma palavra ou rimar exige que o modelo tenha aprendido a grafia de cada token. Ele não a enxerga diretamente.",
        "Números sofrem do mesmo jeito. Dependendo do tokenizador, “2024” pode ser um token e “2025” dois, e uma conta de cabeça vira uma operação sobre pedaços irregulares de dígitos. Por isso alguns tokenizadores, como o cl100k_base da OpenAI, pré-tokenizam números em grupos de até três dígitos, o que deixa o corte mais regular.",
      ],
      keyIdea: "Quando um LLM erra algo trivial sobre letras ou dígitos, olhe primeiro para os tokens que ele recebeu.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [{ id: "tokens", piece: "token-stream", tokens: tokenize("morango"), color: "danger" }],
      },
      alt: `A palavra “morango” chega ao modelo como ${tokenize("morango").join(", ")}: o modelo vê pedaços, não letras.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Texto → tokens → ids",
      tag: "summary",
      body: [
        "A tokenização transforma texto em uma sequência de ids. Caracteres dão vocabulário pequeno e sequências longas; palavras dão sequências curtas e vocabulário impraticável. Subpalavras ficam no meio e eliminam o [UNK].",
        "O tokenizador é treinado antes do modelo e faz parte dele. Ele define quanto um texto custa, quanto cabe no contexto e explica erros com letras e números. A próxima aula olha para o vocabulário: o que há nele e quanto ele deve ter.",
      ],
      keyIdea: "Tokens são a unidade de tudo num LLM: custo, contexto, velocidade e o que o modelo consegue perceber.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          { id: "tokens", piece: "token-stream", tokens: sentenceTokens },
          { id: "ids", piece: "token-stream", tokens: sentenceIds.map(String), color: "info" },
        ],
      },
      alt: `Resumo: “${sentence}” vira os tokens ${sentenceTokens.join(", ")} e os ids ${sentenceIds.join(", ")}.`,
    },
  ],
  realWorldExample:
    "Uma equipe estima o custo de um chatbot de atendimento contando palavras: 1.000 palavras por conversa, preço por token, “um token é uma palavra”. A conta erra. Os textos são em português, com nomes de produtos e códigos de pedido, e o tokenizador do modelo os corta em bem mais tokens do que palavras. A fatura do primeiro mês vem acima do previsto e algumas conversas longas estouram o limite de contexto. A correção é simples: rodar uma amostra real de conversas no tokenizador do modelo escolhido (por exemplo, com a biblioteca tiktoken) e orçar pelo número medido de tokens.",
  code: {
    language: "python",
    caption:
      "Tokenizar, inspecionar e decodificar com o tiktoken, o tokenizador usado pelos modelos da OpenAI. Rode com textos seus para ver quantos tokens eles custam.",
    source: `import tiktoken

enc = tiktoken.get_encoding("cl100k_base")

text = "Tokenização transforma texto em números."
ids = enc.encode(text)

print(len(text), "caracteres →", len(ids), "tokens")
print(ids)

# Cada id volta para os bytes do seu token: espaços e acentos fazem parte do pedaço.
print([enc.decode_single_token_bytes(i) for i in ids])

# Decodificar é a operação inversa.
assert enc.decode(ids) == text`,
  },
  tradeOffs: {
    pros: [
      "Subpalavras representam qualquer texto sem [UNK], com um vocabulário de tamanho controlado",
      "Palavras frequentes viram um token só, o que mantém as sequências curtas",
      "O tokenizador é determinístico e rápido: a mesma entrada sempre gera os mesmos ids",
    ],
    cons: [
      "Idiomas e domínios pouco presentes no corpus do tokenizador viram mais tokens e custam mais",
      "O modelo não vê letras nem dígitos isolados, o que atrapalha tarefas de caractere e aritmética",
      "O tokenizador fica congelado: mudar o vocabulário depois exige re-treinar ao menos as camadas de entrada e saída",
    ],
    alternatives: [
      "Modelos por byte, como o ByT5, que dispensam vocabulário aprendido em troca de sequências mais longas",
      "Tokenizadores com mais tokens por idioma (vocabulários maiores e multilíngues)",
    ],
  },
  knowledgeCheck: [
    {
      id: "why-subwords",
      prompt: "Qual problema a tokenização por subpalavras resolve em relação à tokenização por palavra?",
      options: [
        "Deixa as sequências mais longas",
        "Elimina o [UNK]: palavras raras são montadas com pedaços conhecidos",
        "Faz o modelo enxergar cada letra",
        "Dispensa o vocabulário",
      ],
      correct: 1,
      explanation:
        "Como os símbolos básicos (caracteres ou bytes) continuam no vocabulário, toda palavra pode ser escrita com pedaços. Palavras comuns viram um token; raras viram vários.",
      lesson: "03-02",
    },
    {
      id: "char-cost",
      prompt: "Por que tokenizar por caractere é caro para um Transformer?",
      options: [
        "Porque caracteres não têm id",
        "Porque o vocabulário fica grande demais",
        "Porque a sequência fica longa, e o custo de comparar todos os tokens entre si cresce com o quadrado do comprimento",
        "Porque o softmax não funciona com caracteres",
      ],
      correct: 2,
      explanation:
        "O vocabulário de caracteres é pequeno, mas cada palavra vira vários tokens. Com o custo quadrático, o triplo de tokens custa cerca de nove vezes mais.",
      lesson: "03-02",
    },
    {
      id: "same-tokenizer",
      prompt: "Você treinou um modelo com o tokenizador A. O que acontece se usar o tokenizador B na inferência?",
      options: [
        "Nada: o texto é o mesmo",
        "Os ids passam a apontar para tokens diferentes dos usados no treino, e a saída perde o sentido",
        "Só a velocidade muda",
        "O modelo ajusta o vocabulário sozinho",
      ],
      correct: 1,
      explanation:
        "O modelo aprendeu o que cada id significa no vocabulário A. Com B, o mesmo id corresponde a outro pedaço de texto.",
      lesson: "03-02",
    },
  ],
  related: ["03-01", "03-03", "03-04", "04-05"],
  references: [
    {
      title: "Sennrich, Haddow e Birch (2016), Neural Machine Translation of Rare Words with Subword Units",
      url: "https://arxiv.org/abs/1508.07909",
      kind: "paper",
    },
    {
      title: "Kudo e Richardson (2018), SentencePiece: A simple and language independent subword tokenizer",
      url: "https://arxiv.org/abs/1808.06226",
      kind: "paper",
    },
    {
      title: "Hugging Face Tokenizers: The tokenization pipeline",
      url: "https://huggingface.co/docs/tokenizers/pipeline",
      kind: "docs",
    },
    {
      title: "Hugging Face Transformers: Summary of the tokenizers",
      url: "https://huggingface.co/docs/transformers/tokenizer_summary",
      kind: "docs",
    },
    {
      title: "openai/tiktoken",
      url: "https://github.com/openai/tiktoken",
      kind: "repo",
    },
  ],
};

export default lesson;
