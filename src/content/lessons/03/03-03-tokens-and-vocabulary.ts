import { softmax } from "../../../lab/attention";
import { applyMerges, trainBpe } from "../../../lab/bpe";
import { bpeTokenizerContent } from "../../playgrounds/bpe-tokenizer";
import type { LessonContent } from "../../../types/content";

const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const millions = (value: number) => `${fixed(value / 1e6, 1)} M`;

// Tamanhos de vocabulário publicados, em milhares de tokens. cl100k_base e o200k_base são aproximados.
const vocabularies = [
  { label: "BERT", name: "BERT base (WordPiece)", size: 30_522, shown: "30.522" },
  { label: "GPT-2", name: "GPT-2 (BPE por byte)", size: 50_257, shown: "50.257" },
  { label: "Llama2", name: "Llama 2 (SentencePiece BPE)", size: 32_000, shown: "32.000" },
  { label: "cl100k", name: "cl100k_base (OpenAI)", size: 100_000, shown: "≈ 100 mil" },
  { label: "Llama3", name: "Llama 3 (BPE, tiktoken)", size: 128_256, shown: "128.256" },
  { label: "o200k", name: "o200k_base (OpenAI)", size: 200_000, shown: "≈ 200 mil" },
];

// Composição do vocabulário do GPT-2: 256 bytes, 50 mil merges e 1 token especial.
const gpt2 = { bytes: 256, merges: 50_000, special: 1 };
const gpt2Total = gpt2.bytes + gpt2.merges + gpt2.special;

// Curva calculada com o tokenizador de brinquedo do Laboratório: quanto maior o vocabulário,
// menos tokens o mesmo corpus ocupa.
const corpus = bpeTokenizerContent.corpus;
const merges = trainBpe(corpus, bpeTokenizerContent.mergeCount);
const baseSymbols = new Set(corpus.replace(/\s+/g, "")).size;
const corpusWords = corpus.split(/\s+/).length;
const curve = [0, 5, 10, 15, 20, 25, 30].map((count) => ({
  vocab: baseSymbols + count,
  tokens: applyMerges(corpus, merges, count).words.flat().length,
}));
const first = curve[0];
const last = curve[curve.length - 1];

// Parâmetros da matriz de embedding: |V| × d.
const gpt2Embedding = 50_257 * 768;
const GPT2_SMALL_PARAMS = 124e6;
const llama3Embedding = 128_256 * 4096;

// Passo da saída: logits hipotéticos para os candidatos depois de "O gato subiu no".
const candidates = ["␣muro", "␣telhado", "␣sofá", "␣carro", "␣mar"];
const logits = [3.1, 2.6, 1.9, 0.4, -0.5];
const probabilities = softmax(logits);

const lesson: LessonContent = {
  id: "03-03",
  subtitle:
    "O vocabulário é a tabela fixa entre pedaços de texto e números. O que entra nela e o tamanho dela mudam o custo, a memória e o comportamento do modelo.",
  objectives: [
    "Descrever o que compõe um vocabulário: símbolos base, subpalavras e tokens especiais",
    "Explicar para que servem tokens especiais como [CLS], [SEP], <|endoftext|> e os de chat",
    "Pesar o tamanho do vocabulário: sequências mais curtas contra matrizes maiores",
    "Ligar o vocabulário à última camada do modelo, que pontua todos os tokens a cada passo",
  ],
  steps: [
    {
      id: "fixed-table",
      shortTitle: "Tabela",
      title: "O vocabulário é uma tabela fixa de tokens",
      tag: "context",
      body: [
        "O [[Vocabulary|vocabulary]] (vocabulário) é a lista de todos os [[tokens|token]] que o tokenizador conhece, cada um com um id de 0 a |V| − 1. Ele é definido quando o tokenizador é treinado e não muda depois. Qualquer texto que o modelo lê ou escreve é uma sequência de ids dessa tabela.",
        "Os tamanhos variam bastante entre modelos: 30.522 tokens no BERT base, 50.257 no GPT-2, 32 mil no Llama 2 e 128.256 no Llama 3. Os tokenizadores mais recentes da OpenAI chegam a cerca de 200 mil.",
      ],
      keyIdea: "|V|, o tamanho do vocabulário, é uma decisão de projeto tomada antes do treino e difícil de mudar depois.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "sizes",
            piece: "chart",
            kind: "bar",
            series: vocabularies.map((vocab) => ({ label: vocab.label, value: vocab.size / 1000 })),
          },
          {
            id: "sizes-metrics",
            piece: "metrics-panel",
            metrics: vocabularies.map((vocab) => ({ id: vocab.label, label: vocab.name, value: vocab.shown })),
          },
        ],
      },
      alt: `Tamanho do vocabulário por modelo: ${vocabularies.map((vocab) => `${vocab.name} ${vocab.shown}`).join(", ")}.`,
    },
    {
      id: "what-is-inside",
      shortTitle: "Conteúdo",
      title: "Dentro do vocabulário: bytes, subpalavras e tokens especiais",
      tag: "mechanism",
      body: [
        `O GPT-2 mostra bem a composição. São ${gpt2.bytes} tokens base, um para cada byte possível, o que garante que qualquer texto em qualquer idioma tenha representação. Depois vêm ${gpt2.merges.toLocaleString("pt-BR")} tokens criados por merges do BPE, como “ing” ou “Ġthe” (o “Ġ” marca o espaço antes da palavra). Por fim, ${gpt2.special} token especial, <|endoftext|>. Total: ${gpt2Total.toLocaleString("pt-BR")}.`,
        "A ordem dos merges importa: o tokenizador aplica primeiro os merges aprendidos primeiro, que são os pares mais frequentes do corpus. A aula 03.04 mostra esse processo.",
      ],
      keyIdea: "Um vocabulário de subpalavras sempre contém os símbolos base. É isso que garante que nenhum texto fique sem representação.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          { id: "examples", piece: "token-stream", tokens: ["a", "ing", "Ġthe", "<|endoftext|>"], keys: [3] },
          {
            id: "composition",
            piece: "metrics-panel",
            metrics: [
              { id: "bytes", label: "bytes base", value: String(gpt2.bytes) },
              { id: "merges", label: "merges", value: gpt2.merges.toLocaleString("pt-BR") },
              { id: "special", label: "especiais", value: String(gpt2.special) },
              { id: "total", label: "total", value: gpt2Total.toLocaleString("pt-BR") },
            ],
            highlight: "total",
          },
        ],
      },
      alt: `Exemplos de entradas do vocabulário do GPT-2: a, ing, Ġthe e <|endoftext|>. Composição: ${gpt2.bytes} bytes, ${gpt2.merges.toLocaleString("pt-BR")} merges e ${gpt2.special} especial, total ${gpt2Total.toLocaleString("pt-BR")}.`,
    },
    {
      id: "special-tokens",
      shortTitle: "Especiais",
      title: "Tokens especiais dão estrutura à entrada",
      tag: "mechanism",
      body: [
        "Um [[special token|special-token]] (token especial) não vem do texto: ele é inserido pelo tokenizador para marcar estrutura. No BERT, [CLS] abre a entrada e a sua saída é usada para classificar a frase inteira, [SEP] separa dois trechos, [PAD] completa sequências curtas até o tamanho do lote e [MASK] esconde a palavra que o modelo deve adivinhar no treino.",
        "No GPT-2, <|endoftext|> separa documentos no treino. Quando o modelo o gera, a aplicação sabe que a resposta acabou.",
      ],
      keyIdea: "Tokens especiais são combinados entre o tokenizador e o modelo. O modelo aprende o papel de cada um no treino.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "examples",
            piece: "token-stream",
            tokens: ["[CLS]", "o", "gato", "dorme", "[SEP]", "[PAD]", "[PAD]"],
            keys: [0, 4, 5, 6],
          },
        ],
      },
      alt: "Formato de entrada do BERT: [CLS], os tokens do texto, [SEP] e dois [PAD] completando o tamanho.",
    },
    {
      id: "chat-tokens",
      shortTitle: "Chat",
      title: "Modelos de chat marcam os papéis com tokens especiais",
      tag: "mechanism",
      body: [
        "Um modelo de chat não recebe “mensagens”: recebe uma sequência de tokens em que tokens especiais marcam quem fala. No Llama 3, cada mensagem abre com <|start_header_id|>, o papel (system, user ou assistant), <|end_header_id|>, o texto e fecha com <|eot_id|>. Esse formato é o chat template do modelo.",
        "Por segurança, o texto digitado pelo usuário não pode virar token especial. Se alguém escreve a string “<|eot_id|>”, ela deve ser tokenizada como texto comum. O tiktoken, por exemplo, recusa por padrão codificar strings de tokens especiais que aparecem no texto.",
      ],
      keyIdea: "O chat template é parte do contrato do modelo. Usar o formato errado degrada as respostas sem dar erro.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "examples",
            piece: "token-stream",
            tokens: ["<|start_header_id|>", "user", "<|end_header_id|>", "Olá", "<|eot_id|>"],
            keys: [0, 2, 4],
          },
        ],
      },
      alt: "Uma mensagem no formato do Llama 3: <|start_header_id|>, user, <|end_header_id|>, o texto Olá e <|eot_id|>.",
    },
    {
      id: "bigger-vocab-shorter-text",
      shortTitle: "Menos tokens",
      title: "Vocabulário maior deixa o texto mais curto",
      tag: "mechanism",
      body: [
        `Cada token novo no vocabulário junta um pedaço frequente que antes ocupava dois. Com o tokenizador de brinquedo do Laboratório, o mesmo corpus de ${corpusWords} palavras ocupa ${first.tokens} tokens com ${first.vocab} símbolos (só caracteres) e ${last.tokens} tokens com ${last.vocab}. O gráfico mostra a queda conforme o vocabulário cresce.`,
        "Nos modelos reais acontece o mesmo: um vocabulário maior codifica mais texto por token. Isso significa mais conteúdo dentro do mesmo limite de contexto e menos passos de geração para a mesma resposta.",
      ],
      keyIdea: "Mais tokens no vocabulário significam menos tokens por texto, com retornos cada vez menores.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "curve",
            piece: "chart",
            kind: "line",
            series: curve.map((point) => ({ label: String(point.vocab), value: point.tokens })),
            highlight: curve.length - 1,
          },
        ],
      },
      alt: `Tokens necessários para o corpus conforme o vocabulário cresce: ${curve
        .map((point) => `|V| ${point.vocab}: ${point.tokens}`)
        .join(", ")}.`,
    },
    {
      id: "bigger-vocab-more-parameters",
      shortTitle: "Mais memória",
      title: "Mas cada token novo é uma linha a mais nas matrizes",
      tag: "tradeoff",
      body: [
        `Cada token tem um vetor de d números na matriz de embedding de entrada, que tem |V| × d parâmetros. No GPT-2 small (d = 768), são ${millions(gpt2Embedding)} de parâmetros, cerca de ${fixed((gpt2Embedding / GPT2_SMALL_PARAMS) * 100, 0)}% dos 124 milhões do modelo. No Llama 3 8B (d = 4096, |V| = 128.256), só a matriz de entrada tem ${millions(llama3Embedding)}.`,
        "A camada de saída tem o mesmo tamanho e roda a cada token gerado. Além disso, tokens raros aparecem pouco no treino e acabam com vetores mal aprendidos. Vocabulários grandes valem a pena em modelos grandes e multilíngues; em modelos pequenos, a matriz pode dominar o orçamento de parâmetros.",
      ],
      keyIdea: "O tamanho do vocabulário troca comprimento de sequência por parâmetros e por tokens raros mal treinados.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "params",
            piece: "metrics-panel",
            metrics: [
              { id: "gpt2", label: "GPT-2 small: 50.257 × 768", value: millions(gpt2Embedding) },
              { id: "share", label: "fatia do modelo", value: `${fixed((gpt2Embedding / GPT2_SMALL_PARAMS) * 100, 0)}%` },
              { id: "llama3", label: "Llama 3 8B: 128.256 × 4096", value: millions(llama3Embedding) },
            ],
            highlight: "share",
          },
        ],
      },
      alt: `Parâmetros da matriz de embedding: GPT-2 small ${millions(gpt2Embedding)}, cerca de ${fixed((gpt2Embedding / GPT2_SMALL_PARAMS) * 100, 0)}% do modelo; Llama 3 8B ${millions(llama3Embedding)}.`,
    },
    {
      id: "output-over-vocabulary",
      shortTitle: "Saída",
      title: "A cada passo, o modelo pontua o vocabulário inteiro",
      tag: "mechanism",
      body: [
        "Na última camada, o modelo produz um número para cada token do vocabulário: o [[logit|logit]]. O softmax transforma esses |V| logits numa distribuição de probabilidade, e o próximo token é escolhido a partir dela. Com |V| = 128.256, são 128.256 probabilidades a cada token gerado.",
        `A cena simplifica para cinco candidatos depois de “O gato subiu no”, como se o vocabulário tivesse só esses tokens, e calcula o softmax dos seus logits. “${candidates[0]}” fica com ${fixed(probabilities[0])}. Num modelo real, a mesma conta é feita sobre os |V| logits. O espaço faz parte do token, como no GPT-2.`,
      ],
      keyIdea: "Gerar texto é escolher, a cada passo, um id do vocabulário. O modelo só consegue escrever tokens que existem nessa tabela.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "output",
            piece: "chart",
            kind: "bar",
            series: candidates.map((label, index) => ({ label, value: probabilities[index] })),
            max: 1,
            highlight: 0,
          },
        ],
      },
      alt: `Probabilidades dos candidatos, pelo softmax dos logits: ${candidates
        .map((label, index) => `${label} ${fixed(probabilities[index])}`)
        .join(", ")}.`,
    },
    {
      id: "undertrained-tokens",
      shortTitle: "Tokens raros",
      title: "Tokens que existem no vocabulário, mas quase nunca no treino",
      tag: "example",
      body: [
        "O tokenizador e o modelo podem ser treinados com dados diferentes. Se uma string era comum no corpus do tokenizador, ela ganha um token. Se depois quase não aparece nos dados do modelo, o vetor desse token fica praticamente sem treino.",
        "Foi o que aconteceu com tokens como “ SolidGoldMagikarp” no vocabulário do GPT-2 e do GPT-3, um nome de usuário frequente no texto usado para treinar o tokenizador. Pedir ao modelo para repetir esse token gerava respostas estranhas. Esses casos ficaram conhecidos como glitch tokens.",
      ],
      keyIdea: "Ter um token no vocabulário não garante que o modelo saiba usá-lo. O vetor dele precisa ter sido treinado.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          { id: "examples", piece: "token-stream", tokens: ["Repita", "a", "palavra", "␣SolidGoldMagikarp"], query: 3, color: "danger" },
        ],
      },
      alt: "Um prompt que pede para repetir o token SolidGoldMagikarp, em destaque como token raro.",
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "O vocabulário define o que o modelo lê e escreve",
      tag: "summary",
      body: [
        "O vocabulário é uma tabela fixa com símbolos base, subpalavras e tokens especiais. Os especiais dão estrutura: início, fim, separação, máscara e papéis do chat.",
        "O tamanho |V| é um trade-off. Vocabulários maiores encurtam as sequências, mas aumentam as matrizes de entrada e saída e criam tokens raros mal treinados. A próxima aula mostra como o BPE escolhe quais tokens entram na tabela.",
      ],
      keyIdea: "Tudo o que o modelo produz é uma escolha entre as |V| linhas dessa tabela.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "curve",
            piece: "chart",
            kind: "line",
            series: curve.map((point) => ({ label: String(point.vocab), value: point.tokens })),
          },
        ],
      },
      alt: `Resumo: com o vocabulário crescendo de ${first.vocab} para ${last.vocab}, o corpus cai de ${first.tokens} para ${last.tokens} tokens.`,
    },
  ],
  realWorldExample:
    "Na troca do Llama 2 para o Llama 3, a Meta aumentou o vocabulário de 32 mil para 128.256 tokens, com um tokenizador baseado no tiktoken. Segundo a Meta, o novo vocabulário codifica o texto com até 15% menos tokens que o do Llama 2. Para quem roda o modelo, isso significa mais texto dentro da mesma janela de contexto e menos passos de geração por resposta. Em troca, as matrizes de entrada e saída quadruplicaram de linhas, um custo de memória que pesa mais na versão de 8B do que na de 70B.",
  code: {
    language: "python",
    caption:
      "Inspecionando o vocabulário e os tokens especiais com a biblioteca transformers. O tokenizador do BERT insere [CLS] e [SEP] sozinho.",
    source: `from transformers import AutoTokenizer

tok = AutoTokenizer.from_pretrained("google-bert/bert-base-uncased")

print(tok.vocab_size)          # 30522
print(tok.all_special_tokens)  # inclui [CLS], [SEP], [PAD], [MASK] e [UNK]

enc = tok("O gato dorme.")
print(enc["input_ids"])
print(tok.convert_ids_to_tokens(enc["input_ids"]))  # começa com [CLS] e termina com [SEP]

gpt2 = AutoTokenizer.from_pretrained("openai-community/gpt2")
print(len(gpt2))               # 50257
print(gpt2.eos_token)          # <|endoftext|>`,
  },
  tradeOffs: {
    pros: [
      "Vocabulários maiores codificam mais texto por token: mais conteúdo no contexto e menos passos de geração",
      "Tokens especiais dão ao modelo marcadores explícitos de estrutura, papéis e fim de resposta",
      "Os símbolos base (bytes) garantem que qualquer texto tenha representação",
    ],
    cons: [
      "Cada token novo acrescenta d parâmetros na entrada e d na saída, e a saída roda a cada token gerado",
      "Tokens raros recebem pouco treino e podem gerar comportamento estranho",
      "O vocabulário fica congelado: mudá-lo depois do treino exige re-treinar ao menos as camadas de entrada e saída",
    ],
    alternatives: [
      "Amarrar (tie) as matrizes de entrada e saída, como no GPT-2, para dividir o custo em parâmetros",
      "Vocabulários menores em modelos pequenos, aceitando sequências mais longas",
    ],
  },
  knowledgeCheck: [
    {
      id: "vocab-size-tradeoff",
      prompt: "O que acontece quando se aumenta o tamanho do vocabulário, mantendo o resto do modelo?",
      options: [
        "As sequências ficam mais longas e o modelo fica menor",
        "As sequências ficam mais curtas e as matrizes de embedding e de saída ficam maiores",
        "Nada muda, porque o vocabulário não afeta o modelo",
        "O modelo deixa de precisar de tokens especiais",
      ],
      correct: 1,
      explanation:
        "Mais tokens juntam pedaços maiores de texto, então cada texto vira menos tokens. Em troca, cada token novo é uma linha a mais nas matrizes |V| × d.",
      lesson: "03-03",
    },
    {
      id: "special-token-role",
      prompt: "Para que serve o <|eot_id|> no formato de chat do Llama 3?",
      options: [
        "Marcar o fim de uma mensagem, para o modelo e a aplicação saberem onde ela acaba",
        "Substituir palavras desconhecidas",
        "Separar sílabas",
        "Indicar o idioma do texto",
      ],
      correct: 0,
      explanation:
        "Tokens especiais de chat delimitam as mensagens e os papéis. Quando o modelo gera <|eot_id|>, a aplicação para a geração.",
      lesson: "03-03",
    },
    {
      id: "output-size",
      prompt: "Quantas probabilidades a camada de saída calcula a cada token gerado?",
      options: [
        "Uma, a do token escolhido",
        "Uma por token já gerado",
        "Uma por token do vocabulário, |V| no total",
        "Uma por camada do modelo",
      ],
      correct: 2,
      explanation:
        "A camada de saída produz um logit por token do vocabulário, e o softmax transforma os |V| logits numa distribuição.",
      lesson: "03-03",
    },
  ],
  related: ["03-02", "03-04", "03-05", "04-03", "04-04"],
  references: [
    {
      title: "Sennrich, Haddow e Birch (2016), Neural Machine Translation of Rare Words with Subword Units",
      url: "https://arxiv.org/abs/1508.07909",
      kind: "paper",
    },
    {
      title: "Wu et al. (2016), Google's Neural Machine Translation System (WordPiece)",
      url: "https://arxiv.org/abs/1609.08144",
      kind: "paper",
    },
    {
      title: "Devlin et al. (2018), BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding",
      url: "https://arxiv.org/abs/1810.04805",
      kind: "paper",
    },
    {
      title: "Radford et al. (2019), Language Models are Unsupervised Multitask Learners (GPT-2)",
      url: "https://cdn.openai.com/better-language-models/language_models_are_unsupervised_multitask_learners.pdf",
      kind: "paper",
    },
    {
      title: "Hugging Face Transformers: Tokenizer",
      url: "https://huggingface.co/docs/transformers/main_classes/tokenizer",
      kind: "docs",
    },
  ],
};

export default lesson;
