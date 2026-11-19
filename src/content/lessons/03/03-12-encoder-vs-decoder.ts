import { attentionRow } from "../../../lab/attention";
import type { PipelineSpec } from "../../../scene/types";
import type { LessonContent } from "../../../types/content";

// Encoder e decoder com a mesma conta de attention e os mesmos vetores de brinquedo, com 5 traços
// [ambíguo, dinheiro, ação, função, adjetivo]. A única diferença entre os dois mapas é a máscara causal.
// Todos os pesos e saídas da cena são calculados aqui.

const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });

type Matrix = number[][];

/** Vetor linha × matriz: x · W. */
const project = (x: number[], weights: Matrix) =>
  weights[0].map((_, col) => x.reduce((total, value, row) => total + value * weights[row][col], 0));
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

const tokens = ["o", "banco", "cobrou", "juros", "altos"];
const BANCO = 1;
const COBROU = 2;
const JUROS = 3;
const DINHEIRO = 1;

// Vetores de entrada (embedding + posição já somados). "banco" é ambíguo: pode ser assento ou instituição.
const X: Matrix = [
  [0, 0, 0, 1, 0],
  [1, 0.3, 0, 0, 0],
  [0, 0.8, 1, 0, 0],
  [0, 1, 0, 0, 0],
  [0, 0.2, 0, 0, 1],
];
// W_Q: um token ambíguo procura contexto de dinheiro; uma ação procura dinheiro; dinheiro procura a ação;
// um adjetivo procura o nome que modifica. Keys e values são os próprios vetores.
const W_Q: Matrix = [
  [0, 3, 0, 0, 0],
  [0, 0, 2, 0, 0],
  [0, 2, 0, 0, 0],
  [0, 0, 0, 1, 0],
  [0, 2, 0, 0, 0],
];
const Q = X.map((x) => project(x, W_Q));

// Encoder: cada token vê a frase inteira.
const encoder = Q.map((query) => attentionRow(query, X, X));
// Decoder: cada token vê só a si mesmo e os anteriores (máscara causal); o softmax é refeito sobre eles.
const decoder = Q.map((query, row) => attentionRow(query, X.slice(0, row + 1), X.slice(0, row + 1)));
const padded = (weights: number[]) => tokens.map((_, col) => weights[col] ?? 0);
const encoderWeights = encoder.map((row) => row.weights);
const decoderWeights = decoder.map((row) => padded(row.weights));

const futureShare = sum(encoderWeights[BANCO].slice(BANCO + 1));
const encoderMoney = encoder[BANCO].output[DINHEIRO];
const decoderMoney = decoder[BANCO].output[DINHEIRO];

// Cross-attention: o decoder escreve em inglês, com queries escritas no espaço das keys do encoder.
const target = ["the", "bank", "charged", "high", "interest"];
const targetQueries: Matrix = [
  [0, 0, 0, 3, 0],
  [3, 1, 0, 0, 0],
  [0, 0, 3, 0, 0],
  [0, 0, 0, 0, 3],
  [0, 3, 0, 0, 0],
];
const cross = targetQueries.map((query) => attentionRow(query, X, X));
const HIGH = 3;
const argmax = (values: number[]) => values.indexOf(Math.max(...values));

// Encoder-only (BERT): a posição mascarada procura o sujeito ambíguo, a ação e o adjetivo, dos dois lados.
const masked = tokens.map((token, index) => (index === JUROS ? "[MASK]" : token));
const maskedKeys = X.map((x, index) => (index === JUROS ? x.map(() => 0) : x));
const maskQuery = [1, 0, 2, 0, 2];
const maskRow = attentionRow(maskQuery, maskedKeys, maskedKeys);

// Decoder-only (GPT): para prever o token depois de "cobrou", só o passado conta.
const prefix = tokens.slice(0, COBROU + 1);
const gptRow = decoder[COBROU].weights;

// Sinal de treino por sequência de 512 tokens.
const SEQUENCE = 512;
const MLM_RATE = 0.15;
const mlmTargets = Math.round(SEQUENCE * MLM_RATE);

const arcsFrom = (query: number, weights: number[]) =>
  weights.map((weight, index) => ({
    from: query,
    to: index,
    weight,
    label: index !== query && weight >= 0.1 ? fixed(weight) : undefined,
  }));

const original: PipelineSpec = {
  id: "pipeline",
  piece: "pipeline",
  stages: [
    { id: "source", label: "frase de origem" },
    { id: "encoder", label: "encoder × 6", color: "info" },
    { id: "decoder", label: "decoder × 6", color: "module-03" },
    { id: "target", label: "tradução" },
  ],
  active: "decoder",
  done: ["source", "encoder"],
};

const lesson: LessonContent = {
  id: "03-12",
  subtitle:
    "As duas metades do Transformer original: uma pilha que lê a entrada nos dois sentidos e outra que gera a saída um token por vez, olhando só para trás.",
  objectives: [
    "Diferenciar a self-attention bidirecional do encoder da self-attention causal do decoder",
    "Explicar como a cross-attention liga o decoder à saída do encoder",
    "Descrever a geração autorregressiva, um token por vez",
    "Associar BERT, GPT e T5 às arquiteturas encoder-only, decoder-only e encoder-decoder",
    "Justificar por que os LLMs atuais são, em geral, decoder-only",
  ],
  steps: [
    {
      id: "context",
      shortTitle: "Contexto",
      title: "Duas pilhas de blocos no Transformer original",
      tag: "context",
      body: [
        "O Transformer de 2017 foi feito para tradução, como os modelos [[seq2seq|seq2seq]] com RNN que vieram antes dele. Ele tem duas pilhas de 6 blocos. O [[encoder|encoder]] lê a frase de origem inteira e produz um vetor contextual por token. O [[decoder|decoder]] escreve a tradução, um token por vez, consultando esses vetores.",
        "Os dois usam as mesmas peças: self-attention, feed-forward, conexões residuais e normalização. A diferença está em quem cada token pode ver. No encoder, todo token vê a frase inteira. No decoder, cada token só vê os anteriores, e há uma subcamada a mais, que olha para o encoder.",
      ],
      keyIdea: "Encoder entende a entrada inteira de uma vez. Decoder gera a saída da esquerda para a direita, consultando o encoder.",
      scene: { kind: "pieces", layout: "single", pieces: [original] },
      alt: "Pipeline do Transformer original: frase de origem, encoder com 6 blocos, decoder com 6 blocos (em destaque) e tradução.",
    },
    {
      id: "bidirectional",
      shortTitle: "Encoder",
      title: "O encoder olha para os dois lados",
      tag: "mechanism",
      body: [
        "Em “o banco cobrou juros altos”, “banco” é ambíguo: pode ser um assento ou uma instituição. Quem resolve são as palavras que vêm depois, “cobrou juros”. O encoder permite isso: a self-attention dele não tem máscara, e cada token pontua todos os outros, antes e depois dele.",
        `Na cena, a linha de “banco” dá ${fixed(futureShare)} do peso aos tokens à direita, e o vetor de saída dele ganha ${fixed(encoderMoney)} de “dinheiro”. Depois do encoder, “banco” já é o banco que cobra juros.`,
      ],
      keyIdea: "Sem máscara, cada token do encoder usa o contexto à esquerda e à direita. É o melhor arranjo para entender um texto que já está inteiro.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          { id: "weights", piece: "matrix", rows: tokens, cols: tokens, values: encoderWeights, scale: { min: 0, max: 1 }, highlight: { row: BANCO, col: JUROS }, showValues: true, color: "info" },
        ],
      },
      alt: `Matriz de pesos do encoder, 5 × 5, sem máscara. A linha de banco é ${tokens.map((token, index) => `${token} ${fixed(encoderWeights[BANCO][index])}`).join(", ")}.`,
    },
    {
      id: "causal",
      shortTitle: "Decoder",
      title: "O decoder só olha para trás",
      tag: "mechanism",
      body: [
        "O decoder gera texto: quando ele produz o token da posição t, os tokens de t + 1 em diante ainda não existem. Para o treino imitar essa situação, a self-attention do decoder usa a máscara causal da aula 03.08: as pontuações das posições futuras viram −∞ antes do softmax, e o peso delas fica 0.",
        `Com os mesmos vetores e a mesma W_Q, a linha de “banco” agora só vê “o” e a si mesmo. O vetor de saída de “banco” fica com ${fixed(decoderMoney)} de “dinheiro”, contra ${fixed(encoderMoney)} no encoder. Nesta posição, o decoder ainda não sabe de que banco se trata; vai saber quando “cobrou” e “juros” entrarem, nas posições seguintes.`,
      ],
      keyIdea: "A máscara causal é a única diferença entre a self-attention do encoder e a do decoder. Ela troca contexto futuro pela capacidade de gerar.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          { id: "weights", piece: "matrix", rows: tokens, cols: tokens, values: decoderWeights, scale: { min: 0, max: 1 }, causalMask: true, highlight: { row: BANCO, col: BANCO }, showValues: true, color: "module-03" },
        ],
      },
      alt: `Matriz de pesos do decoder, 5 × 5, com máscara causal: as células acima da diagonal estão apagadas. A linha de banco é o ${fixed(decoderWeights[BANCO][0])} e banco ${fixed(decoderWeights[BANCO][BANCO])}.`,
    },
    {
      id: "cross",
      shortTitle: "Cross",
      title: "A cross-attention liga o decoder ao encoder",
      tag: "mechanism",
      body: [
        "Cada bloco do decoder original tem três subcamadas: a self-attention com máscara, a [[cross-attention|cross-attention]] e a feed-forward. Na cross-attention, as queries vêm do decoder e as keys e os values vêm da saída final do encoder. Todos os blocos do decoder consultam a mesma saída do encoder.",
        `Na cena, o decoder escreve “the bank charged high interest”. A ordem das palavras muda entre as línguas: “high” vem antes de “interest” em inglês, mas “altos” vem depois de “juros” em português. A cross-attention não depende da ordem: a query de “high” dá ${fixed(cross[HIGH].weights[4])} do peso a “${tokens[argmax(cross[HIGH].weights)]}”, que está no fim da frase.`,
      ],
      keyIdea: "Na cross-attention, o decoder pergunta e o encoder responde. É por ela que a frase de origem entra na geração.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          { id: "cross", piece: "matrix", rows: target, cols: tokens, values: cross.map((row) => row.weights), scale: { min: 0, max: 1 }, highlight: { row: HIGH, col: 4 }, showValues: true, color: "info" },
        ],
      },
      alt: `Pesos de cross-attention, com o decoder nas linhas (${target.join(", ")}) e o encoder nas colunas (${tokens.join(", ")}). Cada linha tem o maior peso em: ${target.map((token, index) => `${token} → ${tokens[argmax(cross[index].weights)]}`).join(", ")}.`,
    },
    {
      id: "autoregressive",
      shortTitle: "Geração",
      title: "Gerar um token por vez",
      tag: "mechanism",
      body: [
        "Na inferência, o decoder é [[autorregressivo|autoregressive]]: começa com um token especial de início, prevê o próximo token, acrescenta esse token à entrada e repete, até prever o token de fim. Cada token novo depende de todos os que vieram antes.",
        "No treino, não é preciso esperar. A frase-alvo inteira entra de uma vez, deslocada uma posição, e a máscara causal garante que a posição t só veja os tokens até t. Assim, todas as posições aprendem a prever o próximo token em paralelo, numa única passada.",
      ],
      keyIdea: "Gerar é sequencial: um token por passada. Treinar é paralelo: a máscara causal deixa todas as posições aprenderem ao mesmo tempo.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "pipeline",
            piece: "pipeline",
            stages: [
              { id: "bos", label: "<início>" },
              { id: "the", label: "the" },
              { id: "bank", label: "bank" },
              { id: "charged", label: "charged", color: "module-03" },
              { id: "next", label: "próximo?" },
            ],
            active: "charged",
            done: ["bos", "the", "bank"],
          },
        ],
      },
      alt: "Geração autorregressiva: a partir do token de início, o decoder já gerou the e bank, está gerando charged, e o próximo token ainda não existe.",
    },
    {
      id: "encoder-only",
      shortTitle: "BERT",
      title: "Encoder-only: BERT e o texto com lacunas",
      tag: "example",
      body: [
        "Um modelo só de encoder não gera texto, mas entende muito bem um texto pronto. O BERT, de 2018, é o exemplo clássico. Ele é pré-treinado com [[masked language modeling|masked-language-modeling]]: 15% dos tokens de cada frase são escolhidos, a maior parte trocada por [MASK], e o modelo precisa adivinhar os originais usando os dois lados.",
        `Na cena, a posição de [MASK] busca a ação, o sujeito ambíguo e o adjetivo, à esquerda e à direita: ${masked.map((token, index) => `${token} ${fixed(maskRow.weights[index])}`).join(", ")}. Modelos encoder-only servem para classificar textos, extrair entidades e gerar vetores de busca.`,
      ],
      keyIdea: "Encoder-only lê o texto inteiro nos dois sentidos. É bom para entender e representar, não para escrever.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          { id: "sentence", piece: "token-stream", tokens: masked, query: JUROS, keys: [COBROU, 4], arcs: arcsFrom(JUROS, maskRow.weights), bars: maskRow.weights, color: "info" },
        ],
      },
      alt: `A frase o banco cobrou [MASK] altos, com a posição mascarada consultando os dois lados: ${masked.map((token, index) => `${token} ${fixed(maskRow.weights[index])}`).join(", ")}.`,
    },
    {
      id: "decoder-only",
      shortTitle: "GPT",
      title: "Decoder-only: GPT e o próximo token",
      tag: "example",
      body: [
        "Um modelo só de decoder tira o encoder e a cross-attention, e fica com uma pilha de blocos com self-attention causal. O GPT, de 2018, e os seus sucessores são assim. O pré-treino é prever o próximo token em textos enormes. Sem encoder, o prompt e a resposta formam uma única sequência.",
        `Na cena, para prever o que vem depois de “cobrou”, o modelo só tem “${prefix.join(" ")}”. A query de “cobrou” distribui o peso assim: ${prefix.map((token, index) => `${token} ${fixed(gptRow[index])}`).join(", ")}. O que vier depois ainda não existe.`,
      ],
      keyIdea: "Decoder-only é um único bloco repetido, com máscara causal, treinado para continuar texto. Prompt e resposta são a mesma sequência.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          { id: "sentence", piece: "token-stream", tokens: [...prefix, "?"], query: COBROU, keys: [argmax(gptRow)], arcs: arcsFrom(COBROU, gptRow), bars: [...gptRow, 0], color: "module-03" },
        ],
      },
      alt: `O prefixo ${prefix.join(" ")}, seguido de uma posição vazia. A query de cobrou dá ${prefix.map((token, index) => `${token} ${fixed(gptRow[index])}`).join(", ")}.`,
    },
    {
      id: "encoder-decoder",
      shortTitle: "T5",
      title: "Encoder-decoder: T5 e texto para texto",
      tag: "example",
      body: [
        "A arquitetura completa continua em uso quando há uma entrada bem definida e uma saída diferente dela: tradução, resumo, reescrita. O T5, de 2019, transformou toda tarefa em “texto para texto”: um prefixo diz a tarefa (por exemplo, “translate English to German:”), o encoder lê a entrada e o decoder escreve a resposta. O BART segue a mesma arquitetura, pré-treinado para reconstruir textos corrompidos.",
        "A vantagem é a divisão de trabalho: o encoder lê a entrada com contexto dos dois lados e o decoder só precisa gerar. O custo é ter duas pilhas e duas formas de attention para manter, e uma fronteira fixa entre entrada e saída.",
      ],
      keyIdea: "Encoder-decoder separa ler de escrever. Faz sentido quando a tarefa transforma uma entrada numa saída diferente.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "pipeline",
            piece: "pipeline",
            stages: [
              { id: "source", label: "prefixo + texto" },
              { id: "encoder", label: "encoder", color: "info" },
              { id: "decoder", label: "decoder", color: "module-03" },
              { id: "target", label: "texto de saída" },
            ],
            active: "decoder",
            done: ["source", "encoder"],
          },
        ],
      },
      alt: "Pipeline do T5: prefixo da tarefa mais texto de entrada, encoder, decoder (em destaque) e texto de saída.",
    },
    {
      id: "why-decoder-only",
      shortTitle: "Por que GPT",
      title: "Por que os LLMs atuais são decoder-only",
      tag: "tradeoff",
      body: [
        `Num texto de ${SEQUENCE} tokens, o masked language modeling do BERT cobra a previsão de ${Math.round(MLM_RATE * 100)}% das posições: cerca de ${mlmTargets} tokens. A previsão do próximo token cobra todas as ${SEQUENCE}. Cada texto vira muito mais sinal de treino.`,
        "Há outras razões. Uma pilha só é mais simples de escalar. Qualquer tarefa vira continuação de texto, sem fronteira fixa entre entrada e saída. E a máscara causal combina com o KV cache: as keys e os values do passado não mudam quando um token novo chega. A desvantagem é ler o prompt só da esquerda para a direita: cada token do prompt não vê os que vêm depois dele, nem mesmo dentro do prompt.",
      ],
      keyIdea: "Decoder-only aproveita todo token como alvo de treino, usa uma arquitetura só e trata qualquer tarefa como continuação de texto.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "metrics",
            piece: "metrics-panel",
            metrics: [
              { id: "mlm", label: "alvos por texto (BERT)", value: String(mlmTargets) },
              { id: "clm", label: "alvos por texto (GPT)", value: String(SEQUENCE) },
            ],
            highlight: "clm",
          },
          { id: "targets", piece: "chart", kind: "bar", series: [{ label: "BERT", value: mlmTargets }, { label: "GPT", value: SEQUENCE }], highlight: 1, color: "module-03" },
        ],
      },
      alt: `Posições com alvo de treino num texto de ${SEQUENCE} tokens: masked language modeling ${mlmTargets}, previsão do próximo token ${SEQUENCE}.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Encoder e decoder em uma linha",
      tag: "summary",
      body: [
        "O encoder usa self-attention sem máscara e produz vetores contextuais da entrada inteira. O decoder usa self-attention com máscara causal, gera um token por vez e, no modelo original, consulta o encoder pela cross-attention.",
        "Daí vêm as três famílias: encoder-only (BERT) para entender, decoder-only (GPT, Llama) para gerar e encoder-decoder (T5, BART) para transformar um texto em outro. A próxima aula monta o bloco completo, com conexões residuais e normalização.",
      ],
      keyIdea: "Mesmos blocos, máscaras diferentes: sem máscara para entender, com máscara causal para gerar.",
      scene: {
        kind: "pieces",
        layout: "row",
        pieces: [
          { id: "encoder", piece: "matrix", rows: tokens, cols: tokens, values: encoderWeights, scale: { min: 0, max: 1 }, highlight: { row: BANCO, col: JUROS }, color: "info" },
          { id: "decoder", piece: "matrix", rows: tokens, cols: tokens, values: decoderWeights, scale: { min: 0, max: 1 }, causalMask: true, highlight: { row: BANCO, col: BANCO }, color: "module-03" },
        ],
      },
      alt: `Os dois mapas de pesos lado a lado: à esquerda, o encoder, sem máscara, com banco → juros ${fixed(encoderWeights[BANCO][JUROS])}; à direita, o decoder, com máscara causal, em que banco só vê o e ele mesmo.`,
    },
  ],
  realWorldExample:
    "A escolha da arquitetura aparece até no nome das classes da biblioteca transformers, do Hugging Face. Um classificador de sentimento ou um modelo de vetores para busca semântica costuma partir de um encoder como o BERT e é carregado com AutoModelForSequenceClassification ou AutoModel. Um chatbot parte de um decoder-only, como o Llama, carregado com AutoModelForCausalLM. Um tradutor ou resumidor pode usar um T5, com AutoModelForSeq2SeqLM. Num sistema RAG, é comum ter as duas coisas ao mesmo tempo: um encoder pequeno gera os vetores dos documentos e da pergunta, e um decoder grande escreve a resposta com os trechos encontrados.",
  code: {
    language: "python",
    caption:
      "A mesma self-attention com e sem máscara causal. Trocar o último token muda a saída da posição 1 no encoder, que vê o futuro, e não muda no decoder.",
    source: `import numpy as np

def softmax(x):
    e = np.exp(x - x.max(axis=-1, keepdims=True))
    return e / e.sum(axis=-1, keepdims=True)

def self_attention(X, causal):
    n, d = X.shape
    scores = X @ X.T / np.sqrt(d)
    if causal:
        future = np.triu(np.ones((n, n), dtype=bool), k=1)
        scores = np.where(future, -np.inf, scores)
    return softmax(scores) @ X

rng = np.random.default_rng(0)
X = rng.normal(size=(5, 16))
X_changed = X.copy()
X_changed[4] = rng.normal(size=16)   # troca só o último token

for causal in (False, True):
    before = self_attention(X, causal)[1]
    after = self_attention(X_changed, causal)[1]
    print("decoder" if causal else "encoder", np.allclose(before, after))
# encoder False: a posição 1 vê o futuro e muda
# decoder True: a posição 1 não depende do que vem depois`,
  },
  tradeOffs: {
    pros: [
      "Encoder: cada token usa contexto dos dois lados, o que dá representações melhores para classificar e buscar",
      "Decoder: gera texto de qualquer tamanho e treina com todas as posições como alvo",
      "Encoder-decoder: separa a leitura da entrada da escrita da saída, bom para tradução e resumo",
    ],
    cons: [
      "Encoder-only não gera texto livre",
      "Decoder-only lê o prompt só da esquerda para a direita",
      "Encoder-decoder tem duas pilhas e uma fronteira fixa entre entrada e saída",
    ],
    alternatives: [
      "Prefix LM: decoder com attention bidirecional no prompt e causal na resposta",
      "Modelos de difusão para texto, que geram todos os tokens juntos e refinam em várias passadas",
    ],
  },
  knowledgeCheck: [
    {
      id: "mask-difference",
      prompt: "Qual é a diferença entre a self-attention do encoder e a do decoder?",
      options: [
        "O encoder usa softmax e o decoder não",
        "O decoder usa máscara causal: cada token só vê os anteriores; no encoder, cada token vê a frase inteira",
        "O encoder não tem keys",
        "O decoder tem menos cabeças",
      ],
      correct: 1,
      explanation:
        "A conta é a mesma. No decoder, as pontuações das posições futuras viram −∞ antes do softmax, o que permite gerar e treinar a previsão do próximo token.",
      lesson: "03-12",
    },
    {
      id: "cross-source",
      prompt: "Na cross-attention do Transformer original, de onde vêm as queries, as keys e os values?",
      options: [
        "Tudo vem do encoder",
        "As queries vêm do decoder; as keys e os values, da saída do encoder",
        "As queries vêm do encoder; as keys e os values, do decoder",
        "Tudo vem do decoder",
      ],
      correct: 1,
      explanation: "O decoder pergunta, com as suas queries, e consulta as keys e os values que o encoder produziu a partir da frase de origem.",
      lesson: "03-12",
    },
    {
      id: "bert-family",
      prompt: "Qual destas combinações de modelo e arquitetura está correta?",
      options: [
        "BERT é decoder-only",
        "GPT é encoder-only",
        "T5 é encoder-decoder",
        "BERT é encoder-decoder",
      ],
      correct: 2,
      explanation: "BERT é encoder-only, GPT é decoder-only e T5 (assim como o BART) é encoder-decoder.",
      lesson: "03-12",
    },
  ],
  related: ["03-01", "03-08", "03-09", "03-13", "04-02"],
  references: [
    {
      title: "Vaswani et al. (2017), Attention Is All You Need",
      url: "https://arxiv.org/abs/1706.03762",
      kind: "paper",
    },
    {
      title: "Devlin et al. (2018), BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding",
      url: "https://arxiv.org/abs/1810.04805",
      kind: "paper",
    },
    {
      title: "Brown et al. (2020), Language Models are Few-Shot Learners",
      url: "https://arxiv.org/abs/2005.14165",
      kind: "paper",
    },
    {
      title: "Raffel et al. (2019), Exploring the Limits of Transfer Learning with a Unified Text-to-Text Transformer",
      url: "https://arxiv.org/abs/1910.10683",
      kind: "paper",
    },
    {
      title: "Lewis et al. (2019), BART: Denoising Sequence-to-Sequence Pre-training for Natural Language Generation, Translation, and Comprehension",
      url: "https://arxiv.org/abs/1910.13461",
      kind: "paper",
    },
  ],
};

export default lesson;
