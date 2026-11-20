import type { LessonContent } from "../../../types/content";

// Um modelo de embedding de brinquedo, calculado aqui: vetores de token com d = 4, mean pooling e um lote
// de 4 pares (pergunta, trecho) antes e depois do treino contrastivo. A perda é a InfoNCE com negativos
// do próprio lote e temperatura 0,05. Os vetores são escolhidos à mão; todo o resto sai das contas abaixo.

const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const percent = (value: number) => `${Math.round(value * 100)}%`;

const dot = (a: number[], b: number[]) => a.reduce((sum, value, index) => sum + value * b[index], 0);
const cosine = (a: number[], b: number[]) => dot(a, b) / (Math.hypot(...a) * Math.hypot(...b));
const round2 = (value: number) => Number(value.toFixed(2));

// Passo 2: saída do encoder, um vetor por token, e a média deles (mean pooling).
const sentenceTokens = ["o", "gato", "dormiu", "no", "sofá"];
const tokenVectors = [
  [0.1, 0.0, 0.2, 0.1],
  [0.9, 0.1, 0.3, -0.2],
  [0.4, 0.8, -0.1, 0.1],
  [0.0, 0.1, 0.3, 0.1],
  [0.3, 0.2, 0.7, -0.4],
];
const meanPooled = tokenVectors[0].map(
  (_, col) => tokenVectors.reduce((sum, row) => sum + row[col], 0) / tokenVectors.length,
);

// Passos 4 e 5: um lote de 4 pares. Antes do treino os vetores não seguem o assunto; depois, seguem.
const pairs = [
  { query: "como trocar a senha", passage: "Para redefinir a senha, abra Configurações." },
  { query: "prazo de entrega", passage: "Pedidos chegam em até 5 dias úteis." },
  { query: "posso devolver?", passage: "Você tem 7 dias para pedir a devolução." },
  { query: "formas de pagamento", passage: "Aceitamos cartão, boleto e Pix." },
];
const queryLabels = ["senha", "entrega", "devolver", "pagamento"];
const passageLabels = ["p: senha", "p: entrega", "p: devolução", "p: pagamento"];

const before = {
  queries: [
    [0.55, 0.5, 0.47, 0.52],
    [0.5, 0.56, 0.5, 0.46],
    [0.47, 0.5, 0.53, 0.55],
    [0.52, 0.46, 0.56, 0.5],
  ],
  passages: [
    [0.5, 0.53, 0.55, 0.46],
    [0.55, 0.47, 0.5, 0.52],
    [0.46, 0.55, 0.5, 0.5],
    [0.5, 0.5, 0.46, 0.56],
  ],
};
const after = {
  queries: [
    [0.8, 0.3, 0.3, 0.4],
    [0.3, 0.8, 0.4, 0.3],
    [0.3, 0.4, 0.8, 0.3],
    [0.4, 0.3, 0.3, 0.8],
  ],
  passages: [
    [0.7, 0.4, 0.3, 0.4],
    [0.4, 0.7, 0.4, 0.3],
    [0.3, 0.5, 0.7, 0.3],
    [0.4, 0.3, 0.3, 0.7],
  ],
};

const TEMPERATURE = 0.05;
const similarityMatrix = (batch: typeof before) =>
  batch.queries.map((query) => batch.passages.map((passage) => cosine(query, passage)));
/** Probabilidade que o softmax(sim / τ) da linha dá ao trecho certo, a diagonal. */
const positiveProbability = (matrix: number[][]) =>
  matrix.map((row, index) => {
    const exps = row.map((value) => Math.exp(value / TEMPERATURE));
    return exps[index] / exps.reduce((sum, value) => sum + value, 0);
  });
const meanLoss = (probabilities: number[]) =>
  probabilities.reduce((sum, probability) => sum - Math.log(probability), 0) / probabilities.length;

const simBefore = similarityMatrix(before);
const simAfter = similarityMatrix(after);
const probBefore = positiveProbability(simBefore);
const probAfter = positiveProbability(simAfter);
const lossBefore = meanLoss(probBefore);
const lossAfter = meanLoss(probAfter);
/** Perda de quem chuta ao acaso entre os 4 trechos do lote: ln 4. */
const chanceLoss = Math.log(pairs.length);

const lesson: LessonContent = {
  id: "06-02",
  subtitle:
    "O que acontece dentro de um modelo de embedding: o Transformer lê o texto, o pooling resume os tokens num vetor só e o treino contrastivo aproxima perguntas das respostas certas.",
  objectives: [
    "Descrever o caminho do texto ao vetor: tokens, encoder, pooling e normalização",
    "Calcular um mean pooling a partir dos vetores de token",
    "Explicar o treino contrastivo com negativos do próprio lote e a perda InfoNCE",
    "Diferenciar o bi-encoder, que codifica pergunta e documento separados, de modelos que leem os dois juntos",
  ],
  steps: [
    {
      id: "text-to-vector",
      shortTitle: "Caminho",
      title: "Do texto a um vetor só",
      tag: "context",
      body: [
        "Pense num tradutor que lê uma frase inteira e, no fim, escreve um único código que resume o sentido dela. O [[modelo de embedding|embedding-model]] faz isso: recebe tokens e devolve um vetor de tamanho fixo, seja a frase curta ou longa.",
        "Por dentro, quase sempre é um [[Transformer|transformer]] do tipo [[encoder|encoder]], como o BERT. A attention mistura cada token com os outros, e na saída cada token tem um vetor contextual. Falta um passo: juntar esses vetores num só. É o pooling, assunto do próximo passo.",
      ],
      keyIdea: "Um modelo de embedding é um Transformer com uma etapa a mais no fim: resumir todos os tokens num vetor.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "tokens", kind: "tokens", label: "tokens", col: 0, row: 0 },
              { id: "encoder", kind: "llm", label: "encoder", col: 1, row: 0 },
              { id: "per-token", kind: "embedding", label: "1 vetor/token", col: 2, row: 0 },
              { id: "pooled", kind: "embedding", label: "1 vetor/frase", col: 3, row: 0 },
            ],
            edges: [
              { from: "tokens", to: "encoder", label: "ids" },
              { from: "encoder", to: "per-token", label: "attention" },
              { from: "per-token", to: "pooled", label: "pooling" },
            ],
            active: "encoder",
          },
        ],
      },
      alt: "Tokens entram no encoder, em destaque, que devolve um vetor por token; o pooling junta tudo num vetor por frase.",
    },
    {
      id: "pooling",
      shortTitle: "Pooling",
      title: "Mean pooling: a média dos vetores de token",
      tag: "mechanism",
      body: [
        `O jeito mais comum de resumir é o [[mean pooling|mean-pooling]]: somar os vetores de todos os tokens e dividir pela quantidade. Para “${sentenceTokens.join(" ")}”, a média das ${sentenceTokens.length} linhas da cena dá [${meanPooled.map((value) => fixed(value)).join("; ")}]. Os tokens de padding ficam de fora da conta, pela máscara de atenção.`,
        "Há outras escolhas. O BERT original usava o vetor do token especial [CLS]. Modelos de embedding feitos a partir de LLMs decoder costumam usar o vetor do último token, o único que já leu a frase inteira por causa da máscara causal. Depois do pooling, muitos modelos normalizam o vetor para comprimento 1.",
      ],
      keyIdea: "Pooling transforma n vetores de token em um vetor de frase. A média é simples e funciona bem.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "pool",
            piece: "matrix",
            rows: [...sentenceTokens, "média"],
            cols: ["d1", "d2", "d3", "d4"],
            values: [...tokenVectors, meanPooled].map((row) => row.map(round2)),
            scale: { min: -1, max: 1 },
            highlight: { row: sentenceTokens.length, col: 0 },
            showValues: true,
          },
        ],
      },
      alt: `Vetores dos tokens ${sentenceTokens.join(", ")} e, na última linha, a média deles: ${meanPooled.map((value) => fixed(value)).join(", ")}.`,
    },
    {
      id: "pairs",
      shortTitle: "Pares",
      title: "O treino usa pares que deveriam ficar perto",
      tag: "mechanism",
      body: [
        "Um encoder recém pré-treinado ainda não dá bons vetores de frase: ele aprendeu a completar palavras, não a medir semelhança. O ajuste vem com pares de textos que deveriam ficar próximos: pergunta e resposta, título e corpo, frase e paráfrase. Milhões de pares assim saem de fóruns, FAQs e artigos.",
        "A técnica é o [[aprendizado contrastivo|contrastive-learning]]: puxar cada par para perto e empurrar os textos que não combinam para longe. O modelo codifica o lote, a perda mede o quanto o par certo se destacou dos outros, e o gradiente ajusta os pesos do encoder.",
      ],
      keyIdea: "O modelo aprende a medir semelhança com exemplos de textos que deveriam ficar perto e textos que deveriam ficar longe.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "pairs", kind: "documents", label: "pares (q, p)", col: 0, row: 0 },
              { id: "encoder", kind: "llm", label: "encoder", col: 1, row: 0 },
              { id: "vectors", kind: "embedding", label: "vetores do lote", col: 2, row: 0 },
              { id: "loss", kind: "eval", label: "perda contrastiva", col: 3, row: 0 },
              { id: "update", kind: "server", label: "otimizador", col: 2, row: 1 },
            ],
            edges: [
              { from: "pairs", to: "encoder", label: "lote" },
              { from: "encoder", to: "vectors" },
              { from: "vectors", to: "loss", label: "similaridades" },
              { from: "loss", to: "update", label: "gradiente" },
              { from: "update", to: "encoder", label: "novos pesos" },
            ],
            active: "loss",
          },
        ],
      },
      alt: "Pares de pergunta e trecho entram no encoder; os vetores do lote vão para a perda contrastiva, em destaque, cujo gradiente volta ao encoder pelo otimizador.",
    },
    {
      id: "in-batch",
      shortTitle: "Lote",
      title: "Os outros pares do lote servem de negativos",
      tag: "mechanism",
      body: [
        `Num lote com ${pairs.length} pares, cada pergunta tem 1 trecho certo e ${pairs.length - 1} errados de graça: os trechos das outras perguntas. A cena mostra os cossenos depois do treino: a diagonal (pergunta com o seu trecho) fica perto de 1, e o resto fica mais baixo.`,
        `A perda InfoNCE trata cada linha como uma classificação: aplica o softmax em similaridade ÷ τ e cobra −ln da probabilidade do trecho certo. Com τ = ${fixed(TEMPERATURE)}, uma diferença de 0,1 no cosseno vira 2 no logit: na linha de “senha”, o trecho certo (${fixed(simAfter[0][0])}) contra o melhor errado (${fixed(Math.max(...simAfter[0].slice(1)))}) já leva ${percent(probAfter[0])} da probabilidade. Lotes maiores trazem mais negativos por pergunta, e por isso esses modelos são treinados com lotes grandes.`,
      ],
      keyIdea: "Negativos do próprio lote: cada pergunta aprende a escolher o seu trecho entre os trechos das outras.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "batch",
            piece: "matrix",
            rows: queryLabels,
            cols: passageLabels,
            values: simAfter.map((row) => row.map(round2)),
            scale: { min: 0, max: 1 },
            highlight: { row: 0, col: 0 },
            showValues: true,
          },
        ],
      },
      alt: `Matriz de cossenos entre 4 perguntas e 4 trechos depois do treino. A diagonal fica alta, como ${fixed(simAfter[0][0])} para senha, e o resto fica mais baixo.`,
    },
    {
      id: "before-after",
      shortTitle: "Antes e depois",
      title: "A perda mostra o que o treino mudou",
      tag: "example",
      body: [
        `Antes do treino, os vetores apontam quase todos para o mesmo lado e os cossenos ficam todos perto de 1: o trecho certo recebe ${percent(probBefore[0])} da probabilidade na linha de “${pairs[0].query}”, o mesmo que um chute entre 4. A perda média é ${fixed(lossBefore)}, praticamente o ln 4 = ${fixed(chanceLoss)} de quem chuta.`,
        `Depois do treino, o trecho certo leva de ${percent(Math.min(...probAfter))} a ${percent(Math.max(...probAfter))} da probabilidade, e a perda cai para ${fixed(lossAfter)}. O modelo não decorou as respostas: aprendeu a pôr “trocar a senha” perto de “redefinir a senha”, uma relação que vale para pares que ele nunca viu.`,
      ],
      keyIdea: "O treino contrastivo transforma cossenos parecidos para todo mundo em cossenos que separam o par certo dos outros.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "probs",
            piece: "chart",
            kind: "bar",
            series: queryLabels.flatMap((label, index) => [
              { label: `${label} antes`, value: round2(probBefore[index]) },
              { label: `${label} depois`, value: round2(probAfter[index]) },
            ]),
            max: 1,
            highlight: 1,
            color: "module-06",
          },
          {
            id: "loss",
            piece: "metrics-panel",
            metrics: [
              { id: "before", label: "perda antes", value: fixed(lossBefore), color: "danger" },
              { id: "after", label: "perda depois", value: fixed(lossAfter), color: "success" },
              { id: "chance", label: "chute (ln 4)", value: fixed(chanceLoss) },
            ],
            highlight: "after",
          },
        ],
      },
      alt: `Probabilidade do trecho certo para cada pergunta, antes e depois do treino. A perda média cai de ${fixed(lossBefore)} para ${fixed(lossAfter)}; o chute daria ${fixed(chanceLoss)}.`,
    },
    {
      id: "bi-encoder",
      shortTitle: "Bi-encoder",
      title: "Pergunta e documento passam pelo modelo separados",
      tag: "tradeoff",
      body: [
        "O modelo que você usa para busca é um [[bi-encoder|bi-encoder]]: o mesmo encoder codifica a pergunta e cada documento sozinhos, e a comparação é só um cosseno no fim. A vantagem é enorme: os documentos são codificados uma vez, na indexação, e a consulta custa um vetor novo mais comparações baratas.",
        "O preço é que pergunta e documento nunca se “leem” um ao outro: todo o sentido do documento precisa caber num vetor fixo, antes de saber o que vão perguntar. Modelos que leem a pergunta e o documento juntos acertam mais, mas custam uma passada por par; eles entram como reranking, no módulo 07.",
      ],
      keyIdea: "Bi-encoder: codifica cada texto uma vez e compara por cosseno. Rápido em escala, com algum custo de precisão.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "query", kind: "user", label: "pergunta", col: 0, row: 0 },
              { id: "doc", kind: "documents", label: "documento", col: 0, row: 1 },
              { id: "encoder", kind: "llm", label: "mesmo encoder", col: 1, row: 0.5 },
              { id: "qv", kind: "embedding", label: "vetor q", col: 2, row: 0 },
              { id: "dv", kind: "embedding", label: "vetor d", col: 2, row: 1 },
              { id: "score", kind: "retrieval", label: "cosseno", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "query", to: "encoder" },
              { from: "doc", to: "encoder", label: "offline" },
              { from: "encoder", to: "qv" },
              { from: "encoder", to: "dv" },
              { from: "qv", to: "score" },
              { from: "dv", to: "score" },
            ],
            active: "score",
          },
        ],
      },
      alt: "Pergunta e documento passam separados pelo mesmo encoder; o documento é codificado offline, e os dois vetores se encontram só no cálculo do cosseno, em destaque.",
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Encoder, pooling e pares",
      tag: "summary",
      body: [
        "Um modelo de embedding é um encoder que lê os tokens, um pooling que resume tudo num vetor e um treino contrastivo que ensina o que é parecido. A qualidade final depende muito dos pares de treino: um modelo treinado com perguntas da web pode medir mal a semelhança entre cláusulas de contrato.",
        "Na próxima aula você vai usar esses modelos com textos reais: o que muda entre frases curtas e documentos longos, e por que a pergunta e o documento não são textos do mesmo tipo.",
      ],
      keyIdea: "Embedding de texto = encoder + pooling + aprendizado contrastivo com pares do domínio certo.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "tokens", kind: "tokens", label: "tokens", col: 0, row: 0 },
              { id: "encoder", kind: "llm", label: "encoder", col: 1, row: 0 },
              { id: "per-token", kind: "embedding", label: "1 vetor/token", col: 2, row: 0 },
              { id: "pooled", kind: "embedding", label: "1 vetor/frase", col: 3, row: 0 },
              { id: "db", kind: "vector-db", label: "banco vetorial", col: 3, row: 1 },
            ],
            edges: [
              { from: "tokens", to: "encoder", label: "ids" },
              { from: "encoder", to: "per-token", label: "attention" },
              { from: "per-token", to: "pooled", label: "pooling" },
              { from: "pooled", to: "db", label: "indexar" },
            ],
            active: "pooled",
            done: ["tokens", "encoder", "per-token"],
          },
        ],
      },
      alt: "Resumo: tokens, encoder, um vetor por token, pooling num vetor por frase, em destaque, e indexação no banco vetorial.",
    },
  ],
  realWorldExample:
    "O modelo all-MiniLM-L6-v2, um dos mais baixados do Hugging Face, foi feito assim: os autores pegaram um MiniLM pré-treinado e o ajustaram com um objetivo contrastivo em mais de 1 bilhão de pares de frases. O cartão do modelo descreve a tarefa: dada uma frase do par, prever qual entre várias frases sorteadas era o seu par de verdade. A saída usa mean pooling e tem 384 dimensões.",
  code: {
    language: "python",
    source: `from datasets import Dataset
from sentence_transformers import SentenceTransformer, SentenceTransformerTrainer
from sentence_transformers.losses import MultipleNegativesRankingLoss

model = SentenceTransformer("sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2")

pairs = Dataset.from_dict({
    "anchor": ["como trocar a senha", "prazo de entrega"],
    "positive": ["Para redefinir a senha, abra Configurações.", "Pedidos chegam em até 5 dias úteis."],
})

# Negativos do próprio lote; scale=20 equivale à temperatura 0,05.
loss = MultipleNegativesRankingLoss(model, scale=20.0)

trainer = SentenceTransformerTrainer(model=model, train_dataset=pairs, loss=loss)
trainer.train()`,
    caption:
      "Ajuste fino contrastivo com Sentence Transformers: cada par (pergunta, trecho) usa os trechos dos outros pares do lote como negativos, a mesma perda calculada na aula.",
  },
  tradeOffs: {
    pros: [
      "O bi-encoder codifica os documentos uma vez, e a busca vira comparação de vetores",
      "O treino contrastivo aproveita pares baratos de coletar, como pergunta e resposta",
      "Dá para ajustar o modelo ao seu domínio com alguns milhares de pares próprios",
    ],
    cons: [
      "Todo o sentido do texto precisa caber num vetor fixo, antes de conhecer a pergunta",
      "O modelo só mede bem o tipo de semelhança que os pares de treino ensinaram",
      "Negativos do lote podem ser fáceis demais; bons modelos também usam negativos difíceis, escolhidos a dedo",
    ],
    alternatives: [
      "Modelos que leem pergunta e documento juntos, usados como reranking (módulo 07)",
      "Vetores tirados direto de um LLM sem treino contrastivo, em geral piores para busca",
    ],
  },
  knowledgeCheck: [
    {
      id: "pooling-padding",
      prompt: "Num lote, uma frase de 5 tokens é completada com 3 tokens de padding. Como o mean pooling deve tratar o padding?",
      options: [
        "Incluir os 8 vetores na média",
        "Usar a máscara de atenção para tirar o padding, e dividir a soma dos 5 vetores reais por 5",
        "Usar só o último vetor, que é padding",
        "Dobrar o peso do primeiro token",
      ],
      correct: 1,
      explanation:
        "O padding não faz parte do texto. Incluí-lo puxaria a média para vetores sem sentido e faria a mesma frase ter vetores diferentes conforme o lote.",
      lesson: "06-02",
    },
    {
      id: "batch-size",
      prompt: "Por que modelos de embedding treinados com negativos do próprio lote costumam ganhar com lotes maiores?",
      options: [
        "Porque lotes maiores usam menos memória",
        "Porque cada pergunta passa a ter mais trechos errados para comparar, e a tarefa de achar o certo fica mais informativa",
        "Porque o pooling fica mais preciso",
        "Porque a temperatura sobe sozinha",
      ],
      correct: 1,
      explanation:
        "Com N pares no lote, cada pergunta tem N − 1 negativos de graça. Mais negativos aproximam melhor a tarefa real de achar o trecho certo entre muitos.",
      lesson: "06-02",
    },
  ],
  related: ["06-01", "06-03", "03-12"],
  references: [
    {
      title: "Reimers e Gurevych (2019), Sentence-BERT: Sentence Embeddings using Siamese BERT-Networks",
      url: "https://arxiv.org/abs/1908.10084",
      kind: "paper",
    },
    {
      title: "Gao, Yao e Chen (2021), SimCSE: Simple Contrastive Learning of Sentence Embeddings",
      url: "https://arxiv.org/abs/2104.08821",
      kind: "paper",
    },
    {
      title: "Wang et al. (2022), Text Embeddings by Weakly-Supervised Contrastive Pre-training (E5)",
      url: "https://arxiv.org/abs/2212.03533",
      kind: "paper",
    },
  ],
};

export default lesson;
