import { softmax } from "../../../lab/attention";
import type { LessonContent } from "../../../types/content";

// Geração autorregressiva de brinquedo: uma tabela de logits escrita à mão, indexada pelo último token,
// faz o papel do modelo. A cada passo, o softmax transforma os logits em probabilidades, a decodificação
// gulosa pega a maior, o token entra no texto e o laço recomeça. As contas de prefill e decode também
// são calculadas aqui.

const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");
const percent = (value: number) => `${Math.round(value * 100)}%`;

const END = "<fim>";
const MAX_NEW_TOKENS = 10;

/** O "modelo": para cada último token, os candidatos e os seus logits. */
const table: Record<string, Array<{ token: string; logit: number }>> = {
  no: [
    { token: "telhado", logit: 3 },
    { token: "muro", logit: 2.6 },
    { token: "sofá", logit: 1.5 },
    { token: "carro", logit: 0.8 },
  ],
  telhado: [
    { token: "e", logit: 2.5 },
    { token: ".", logit: 2.2 },
    { token: "de", logit: 0.6 },
    { token: ",", logit: 1 },
  ],
  e: [
    { token: "dormiu", logit: 2.8 },
    { token: "miou", logit: 2.3 },
    { token: "pulou", logit: 1.4 },
    { token: "caiu", logit: 1.1 },
  ],
  dormiu: [
    { token: ".", logit: 3.2 },
    { token: "lá", logit: 1.9 },
    { token: "e", logit: 1.2 },
    { token: "muito", logit: 1 },
  ],
  ".": [
    { token: END, logit: 3.5 },
    { token: "O", logit: 1.6 },
    { token: "Depois", logit: 1.2 },
    { token: "Ele", logit: 1 },
  ],
};

const prompt = ["O", "gato", "subiu", "no"];

interface GenerationStep {
  candidates: Array<{ token: string; probability: number }>;
  chosen: string;
  probability: number;
}

function generate(start: string[]) {
  const text = [...start];
  const steps: GenerationStep[] = [];
  while (steps.length < MAX_NEW_TOKENS) {
    const options = table[text[text.length - 1]];
    const probabilities = softmax(options.map((option) => option.logit));
    const candidates = options.map((option, index) => ({ token: option.token, probability: probabilities[index] }));
    const best = candidates.reduce((winner, candidate) => (candidate.probability > winner.probability ? candidate : winner));
    steps.push({ candidates, chosen: best.token, probability: best.probability });
    text.push(best.token);
    if (best.token === END) break;
  }
  return { text, steps };
}

const { text: generated, steps } = generate(prompt);
const newTokens = generated.slice(prompt.length);
const firstStep = steps[0];
const firstSorted = [...firstStep.candidates].sort((a, b) => b.probability - a.probability);
const passes = steps.length;

// Prefill e decode: um prompt de n tokens e uma resposta de T tokens.
const PROMPT_TOKENS = 1000;
const OUTPUT_TOKENS = 200;
/** Sem cache, a passada t relê o prompt e tudo o que já foi gerado. */
const positionsWithoutCache = OUTPUT_TOKENS * PROMPT_TOKENS + (OUTPUT_TOKENS * (OUTPUT_TOKENS - 1)) / 2;
/** Com KV cache, o prompt é lido uma vez (prefill) e cada passada seguinte processa só o token novo. */
const positionsWithCache = PROMPT_TOKENS + OUTPUT_TOKENS - 1;
const cacheGain = positionsWithoutCache / positionsWithCache;

const lesson: LessonContent = {
  id: "04-02",
  subtitle: "Como um LLM escreve uma resposta inteira repetindo uma única operação: prever o próximo token, escolher um e colocá-lo de volta na entrada.",
  objectives: [
    "Descrever o laço autorregressivo da geração de texto",
    "Simular a decodificação gulosa a partir de uma tabela de probabilidades",
    "Explicar como a geração para: token de fim ou limite de tokens",
    "Diferenciar prefill e decode e o papel do KV cache no custo",
  ],
  steps: [
    {
      id: "streaming",
      shortTitle: "Aos pedaços",
      title: "A resposta chega aos pedaços",
      tag: "context",
      body: [
        "Num chat, a resposta aparece aos poucos, como se alguém digitasse. Não é efeito visual: o modelo realmente produz um pedaço de cada vez, e o servidor manda cada pedaço para a tela assim que ele fica pronto. Isso se chama streaming.",
        "Cada pedaço é um [[token|token]]. Para escrever uma resposta de 200 tokens, o modelo roda 200 vezes, uma por token. Essa forma de gerar, em que cada saída vira parte da próxima entrada, se chama [[autorregressiva|autoregressive]].",
      ],
      keyIdea: "Um LLM não escreve a resposta de uma vez: ele gera um token, devolve e gera o seguinte.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "phone", kind: "phone", label: "chat", col: 0, row: 0 },
              { id: "api", kind: "server", label: "servidor", col: 1, row: 0 },
              { id: "llm", kind: "llm", label: "llm", col: 2, row: 0 },
              { id: "tokens", kind: "tokens", label: "tokens", col: 3, row: 0 },
            ],
            edges: [
              { from: "phone", to: "api", label: "prompt" },
              { from: "api", to: "llm" },
              { from: "llm", to: "tokens", label: "um por vez" },
            ],
            active: "tokens",
            done: ["phone", "api", "llm"],
          },
        ],
      },
      alt: "O chat manda o prompt ao servidor, que chama o LLM; o LLM devolve tokens um por vez, em destaque.",
    },
    {
      id: "loop",
      shortTitle: "O laço",
      title: "Prever, escolher, anexar, repetir",
      tag: "mechanism",
      body: [
        "O laço tem quatro passos. O texto atual entra no modelo; o modelo devolve uma probabilidade para cada token do vocabulário; uma regra escolhe um token; o token escolhido é anexado ao texto. Aí tudo recomeça, agora com um token a mais.",
        "A regra mais simples é a [[decodificação gulosa|greedy-decoding]]: pegar sempre o token mais provável. Ela é determinística: o mesmo prompt dá sempre a mesma resposta. A aula 04.06 mostra as regras que sorteiam, com temperatura e top-p.",
      ],
      keyIdea: "Toda a geração é o mesmo laço: o modelo prevê, uma regra escolhe, o token volta para a entrada.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "loop",
            piece: "pipeline",
            stages: [
              { id: "context", label: "texto atual" },
              { id: "model", label: "modelo", color: "module-04" },
              { id: "probs", label: "probabilidades" },
              { id: "pick", label: "escolha" },
              { id: "append", label: "anexar token" },
            ],
            active: "pick",
            done: ["context", "model", "probs"],
            repeat: { from: "context", to: "append", label: "até o fim" },
            branch: { id: "stop", label: "parar", from: "pick", edgeLabel: END, color: "muted" },
          },
        ],
      },
      alt: `Pipeline do laço de geração: texto atual, modelo, probabilidades, escolha (em destaque) e anexar token, repetido até o fim; da escolha sai um ramo para parar quando o token é ${END}.`,
    },
    {
      id: "first-token",
      shortTitle: "1º token",
      title: "O primeiro passo, com números",
      tag: "example",
      body: [
        `O prompt é “${prompt.join(" ")}”. Na cena, o modelo de brinquedo dá ${percent(firstSorted[0].probability)} para “${firstSorted[0].token}”, ${percent(firstSorted[1].probability)} para “${firstSorted[1].token}” e o resto para as outras opções. A decodificação gulosa escolhe “${firstStep.chosen}”.`,
        `Num modelo real, as barras seriam ${integer(50_257)} no vocabulário do GPT-2, mas a lógica é a mesma: os [[logits|logit]] do último token passam pelo [[softmax|softmax]] e viram probabilidades que somam 1. Só a última posição importa para escolher o próximo token.`,
      ],
      keyIdea: "Cada passo da geração é uma escolha sobre uma distribuição; a gulosa pega a barra mais alta.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          { id: "text", piece: "token-stream", tokens: prompt, query: prompt.length - 1, color: "module-04" },
          {
            id: "candidates",
            piece: "chart",
            kind: "bar",
            series: firstSorted.map((candidate) => ({ label: candidate.token, value: Number(candidate.probability.toFixed(3)) })),
            max: 1,
            highlight: 0,
            color: "module-04",
          },
        ],
      },
      alt: `Depois de “${prompt.join(" ")}”, as probabilidades do próximo token: ${firstSorted.map((candidate) => `${candidate.token} ${percent(candidate.probability)}`).join(", ")}. A escolhida é ${firstStep.chosen}.`,
    },
    {
      id: "full-run",
      shortTitle: "Até o fim",
      title: "O laço rodando até o token de fim",
      tag: "mechanism",
      body: [
        `Repetindo o laço, o texto cresce: ${steps.map((step) => `“${step.chosen}” (${percent(step.probability)})`).join(", ")}. As barras da cena mostram a confiança do modelo em cada token que ele escolheu. Foram ${passes} passadas pelo modelo para ${newTokens.length} tokens novos.`,
        `A geração para por dois motivos. O modelo pode escolher o [[token de fim|eos-token]], que ele aprendeu a prever no fim dos textos de treino; ou a resposta atinge o limite de tokens pedido pela aplicação (o max_new_tokens, aqui ${MAX_NEW_TOKENS}). Sem um dos dois, o modelo continuaria escrevendo.`,
      ],
      keyIdea: "A resposta termina quando o modelo prevê o token de fim ou quando o limite de tokens é atingido.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "progress",
            piece: "metrics-panel",
            metrics: [
              { id: "prompt", label: "tokens do prompt", value: String(prompt.length) },
              { id: "new", label: "tokens gerados", value: String(newTokens.length), color: "module-04" },
              { id: "passes", label: "passadas no modelo", value: String(passes) },
              { id: "limit", label: "max_new_tokens", value: String(MAX_NEW_TOKENS) },
            ],
            highlight: "new",
          },
          {
            id: "text",
            piece: "token-stream",
            tokens: generated,
            query: generated.length - 1,
            bars: [...prompt.map(() => 0), ...steps.map((step) => step.probability)],
            color: "module-04",
          },
        ],
      },
      alt: `O texto completo, “${generated.join(" ")}”, com barras da probabilidade de cada token gerado; ${newTokens.length} tokens novos em ${passes} passadas, parando no ${END}.`,
    },
    {
      id: "cost",
      shortTitle: "Custo",
      title: "Prefill e decode: por que a saída é a parte lenta",
      tag: "tradeoff",
      body: [
        `Imagine um prompt de ${integer(PROMPT_TOKENS)} tokens e uma resposta de ${OUTPUT_TOKENS}. O prompt inteiro é processado de uma vez, em paralelo: é o prefill. Depois, cada token da resposta exige uma passada sequencial: é o decode. Por isso a resposta demora mais que a leitura do prompt, mesmo sendo menor.`,
        `Se cada passada relesse tudo, seriam ${integer(positionsWithoutCache)} posições processadas. Com o [[KV cache|kv-cache]], as keys e values já calculados ficam guardados e cada passada processa só o token novo: ${integer(positionsWithCache)} posições, cerca de ${Math.round(cacheGain)} vezes menos. O módulo 10 detalha esse cache.`,
      ],
      keyIdea: "A leitura do prompt é paralela; a escrita da resposta é sequencial, um token por passada.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "cost",
            piece: "metrics-panel",
            metrics: [
              { id: "without", label: "posições sem cache", value: integer(positionsWithoutCache), color: "danger" },
              { id: "with", label: "posições com KV cache", value: integer(positionsWithCache), color: "success" },
              { id: "gain", label: "redução", value: `${fixed(cacheGain, 0)}×` },
            ],
            highlight: "with",
          },
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "prompt", kind: "context", label: "prompt", col: 0, row: 0 },
              { id: "llm", kind: "llm", label: "llm", col: 1, row: 0 },
              { id: "cache", kind: "kv-cache", label: "kv cache", col: 1, row: 1 },
              { id: "answer", kind: "answer", label: "resposta", col: 2, row: 0 },
            ],
            edges: [
              { from: "prompt", to: "llm", label: "prefill" },
              { from: "llm", to: "cache", label: "guarda k, v" },
              { from: "llm", to: "answer", label: "decode" },
            ],
            active: "cache",
            done: ["prompt", "llm"],
          },
        ],
      },
      alt: `Prompt de ${integer(PROMPT_TOKENS)} tokens e resposta de ${OUTPUT_TOKENS}: ${integer(positionsWithoutCache)} posições processadas sem cache e ${integer(positionsWithCache)} com KV cache. O diagrama mostra o prefill entrando no LLM, o KV cache guardando keys e values e o decode gerando a resposta.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Uma resposta, muitas passadas",
      tag: "summary",
      body: [
        "Gerar texto é repetir: o modelo lê o texto atual, devolve probabilidades para o próximo token, uma regra escolhe e o token escolhido entra no texto. O laço termina no token de fim ou no limite de tokens.",
        "A próxima aula entra no passo do meio: como o modelo calcula essas probabilidades e por que prever o próximo token basta para ele aprender tanto.",
      ],
      keyIdea: "Geração autorregressiva: uma previsão por token, cada uma condicionada a tudo o que veio antes.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "phone", kind: "phone", label: "chat", col: 0, row: 0 },
              { id: "prompt", kind: "context", label: "texto atual", col: 1, row: 0 },
              { id: "llm", kind: "llm", label: "llm", col: 2, row: 0 },
              { id: "tokens", kind: "tokens", label: "próximo token", col: 2, row: 1 },
              { id: "answer", kind: "answer", label: "resposta", col: 3, row: 0 },
            ],
            edges: [
              { from: "phone", to: "prompt" },
              { from: "prompt", to: "llm" },
              { from: "llm", to: "tokens", label: "escolhe" },
              { from: "tokens", to: "prompt", label: "anexa" },
              { from: "llm", to: "answer", label: END },
            ],
            active: "answer",
            done: ["phone", "prompt", "llm", "tokens"],
          },
        ],
      },
      alt: `O texto atual entra no LLM, que escolhe o próximo token; o token volta para o texto atual, e quando sai ${END} a resposta vai para o chat.`,
    },
  ],
  realWorldExample:
    "As APIs de chat oferecem a opção de streaming: o servidor manda cada token assim que ele é gerado, e o app mostra a resposta crescendo. As mesmas APIs cobram e limitam a saída por tokens, com um parâmetro de máximo de tokens; quando ele é atingido, a resposta vem cortada e a API informa que parou pelo limite, não pelo token de fim.",
  code: {
    language: "python",
    source: `import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

tokenizer = AutoTokenizer.from_pretrained("openai-community/gpt2")
model = AutoModelForCausalLM.from_pretrained("openai-community/gpt2")

ids = tokenizer("The cat climbed onto the", return_tensors="pt").input_ids
for _ in range(5):
    logits = model(ids).logits[0, -1]          # só a última posição importa
    next_id = logits.argmax().view(1, 1)       # decodificação gulosa
    ids = torch.cat([ids, next_id], dim=1)     # o token volta para a entrada
print(tokenizer.decode(ids[0]))`,
    caption: "O laço autorregressivo escrito à mão, sem KV cache. Na prática, model.generate(ids, max_new_tokens=5) faz o mesmo, com cache.",
  },
  tradeOffs: {
    pros: [
      "Uma única operação, repetida, gera textos de qualquer tamanho",
      "Permite mostrar a resposta enquanto ela é gerada (streaming)",
      "Cada token novo pode usar tudo o que veio antes, inclusive o que o próprio modelo escreveu",
    ],
    cons: [
      "A saída é sequencial: respostas longas levam mais tempo, token por token",
      "Um token ruim no começo contamina o resto, porque vira entrada das próximas previsões",
      "Guardar o KV cache de conversas longas ocupa muita memória na GPU",
    ],
    alternatives: [
      "Decodificação especulativa: um modelo pequeno propõe vários tokens e o grande confere de uma vez",
      "Modelos de difusão de texto, que refinam a sequência inteira em paralelo, ainda pouco usados em produção",
    ],
  },
  knowledgeCheck: [
    {
      id: "cut-answer",
      prompt: "Uma resposta da API veio cortada no meio da frase. Qual é a causa mais provável?",
      options: [
        "O modelo esqueceu o prompt",
        "A geração atingiu o limite máximo de tokens antes do token de fim",
        "A temperatura estava em 0",
        "O KV cache foi apagado",
      ],
      correct: 1,
      explanation: "A geração para no token de fim ou no limite de tokens. Se o limite chega primeiro, o texto é interrompido onde estiver.",
      lesson: "04-02",
    },
    {
      id: "latency",
      prompt: "Dois pedidos têm o mesmo prompt. Um pede 50 tokens de resposta e o outro 500. Por que o segundo demora bem mais?",
      options: [
        "Porque o prompt é lido 10 vezes",
        "Porque cada token da resposta exige uma passada sequencial pelo modelo",
        "Porque respostas longas usam outro modelo",
        "Porque o tokenizador fica mais lento",
      ],
      correct: 1,
      explanation: "O prefill do prompt é igual nos dois. A diferença está no decode: são 500 passadas sequenciais contra 50.",
      lesson: "04-02",
    },
  ],
  related: ["03-12", "04-03", "10-02"],
  references: [
    { title: "Hugging Face Transformers: Generation with LLMs", url: "https://huggingface.co/docs/transformers/llm_tutorial", kind: "docs" },
    { title: "Jay Alammar, The Illustrated GPT-2", url: "https://jalammar.github.io/illustrated-gpt2/", kind: "article" },
    { title: "Radford et al. (2019), Language Models are Unsupervised Multitask Learners", url: "https://cdn.openai.com/better-language-models/language_models_are_unsupervised_multitask_learners.pdf", kind: "paper" },
  ],
};

export default lesson;
