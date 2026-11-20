import type { LessonContent } from "../../../types/content";

// O que é inferência, em contas: o custo de treinar um modelo de 7B (≈ 6 · N · D FLOPs, Kaplan et al., 2020,
// com os 2 trilhões de tokens do Llama 2) contra o custo de cada token gerado (≈ 2 · N FLOPs), e o tempo ideal
// de uma resposta numa H100: o prefill limitado pelo cálculo e cada token do decode limitado pela banda de memória.
// Os números da H100 (80 GB, 3,35 TB/s, cerca de 989 TFLOPS densos em BF16) vêm da página da NVIDIA.

const fixed = (value: number, digits = 1) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");
const SUPERSCRIPT = "⁰¹²³⁴⁵⁶⁷⁸⁹";
/** Notação científica legível: 8,4 × 10²². */
const scientific = (value: number) => {
  const exponent = Math.floor(Math.log10(value));
  const mantissa = value / 10 ** exponent;
  const power = String(exponent)
    .split("")
    .map((digit) => SUPERSCRIPT[Number(digit)])
    .join("");
  return `${fixed(mantissa)} × 10${power}`;
};

// Passo 2: treino contra inferência, em FLOPs.
const PARAMS = 7e9;
const TRAIN_TOKENS = 2e12;
const trainingFlops = 6 * PARAMS * TRAIN_TOKENS;
const flopsPerToken = 2 * PARAMS;
const ANSWER_TOKENS = 500;
const flopsPerAnswer = flopsPerToken * ANSWER_TOKENS;
const answersToMatchTraining = trainingFlops / flopsPerAnswer;

// Passo 4: uma resposta numa H100, no teto teórico.
const H100_FLOPS = 989e12;
const H100_BANDWIDTH = 3.35e12;
const H100_MEMORY_GB = 80;
const GB = 1e9;
const FP16_BYTES = 2;
const weightBytes = PARAMS * FP16_BYTES;
const PROMPT_TOKENS = 500;
const OUTPUT_TOKENS = 300;
const prefillMs = ((flopsPerToken * PROMPT_TOKENS) / H100_FLOPS) * 1000;
const decodeMsPerToken = (weightBytes / H100_BANDWIDTH) * 1000;
const decodeMs = decodeMsPerToken * OUTPUT_TOKENS;
const totalMs = prefillMs + decodeMs;
const decodeShare = decodeMs / totalMs;
const CHUNK = 50;
const chunks = OUTPUT_TOKENS / CHUNK;
const timeSeries = [
  { label: `prefill (${PROMPT_TOKENS})`, value: Number(prefillMs.toFixed(0)) },
  ...Array.from({ length: chunks }, (_, index) => ({
    label: `tokens ${index * CHUNK + 1}–${(index + 1) * CHUNK}`,
    value: Number((decodeMsPerToken * CHUNK).toFixed(0)),
  })),
];

// Passo 5: quantas GPUs de 80 GB só para os pesos, em fp16.
const SEVENTY_B = 70e9;
const gpusFor = (params: number) => Math.ceil((params * FP16_BYTES) / GB / H100_MEMORY_GB);

const lesson: LessonContent = {
  id: "10-01",
  subtitle: "O que acontece depois do treino: cada pergunta vira contas com pesos congelados, pagas a cada token, para sempre.",
  objectives: [
    "Diferenciar treino e inferência pelo que cada um calcula e por quantas vezes acontece",
    "Comparar o custo de treinar um modelo com o custo de gerar um token",
    "Descrever o laço da geração: uma passada do modelo por token",
    "Estimar o tempo ideal de uma resposta numa GPU a partir dos pesos e da banda de memória",
  ],
  steps: [
    {
      id: "order",
      shortTitle: "Um pedido",
      title: "Treinar é aprender a receita; inferir é cozinhar cada prato",
      tag: "context",
      body: [
        "Um chef passa anos aprendendo receitas. Depois disso, cada pedido que chega na cozinha é só executar o que ele já sabe, rápido e sem errar. Com um LLM é igual: o treino acontece uma vez e grava o que o modelo aprendeu nos pesos. Cada pergunta que você manda depois é um pedido novo para a cozinha.",
        "[[Inferência|inference]] é rodar o modelo já treinado sobre uma entrada nova. Os pesos ficam congelados: não há gradiente, nem atualização, só a passada para a frente, uma vez por token gerado. Ela roda num servidor com [[GPU|gpu]], a cada requisição, e é o que o usuário espera enquanto o texto aparece na tela.",
      ],
      keyIdea: "Treino é um projeto que acaba; inferência é a operação que roda a cada pedido, enquanto o produto existir.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "phone", kind: "phone", label: "app", col: 0, row: 0 },
              { id: "api", kind: "server", label: "servidor com gpu", col: 1, row: 0 },
              { id: "llm", kind: "llm", label: "pesos congelados", col: 2, row: 0 },
              { id: "answer", kind: "answer", label: "resposta", col: 3, row: 0 },
            ],
            edges: [
              { from: "phone", to: "api", label: "pergunta" },
              { from: "api", to: "llm", label: "tokens" },
              { from: "llm", to: "answer", label: "um token por vez" },
            ],
            active: "llm",
          },
        ],
      },
      alt: "O app manda a pergunta ao servidor com GPU, que entrega os tokens ao modelo de pesos congelados, em destaque, e a resposta sai um token por vez.",
    },
    {
      id: "flops",
      shortTitle: "Treino × uso",
      title: "Quanto custa treinar e quanto custa responder",
      tag: "mechanism",
      body: [
        `Dá para comparar os dois custos em [[FLOPs|flops]]. Treinar um modelo de N parâmetros com D tokens custa cerca de 6 · N · D operações; gerar um token custa cerca de 2 · N. Para um modelo de 7 bilhões de parâmetros treinado com os 2 trilhões de tokens do Llama 2, o treino dá ${scientific(trainingFlops)} FLOPs e cada token gerado ${scientific(flopsPerToken)}.`,
        `Uma resposta de ${ANSWER_TOKENS} tokens custa ${scientific(flopsPerAnswer)} FLOPs. Seriam ${integer(answersToMatchTraining / 1e9)} bilhões de respostas para empatar com o treino inteiro. Parece muito, mas um produto popular responde milhões de pedidos por dia, todo dia: ao longo da vida do modelo, a conta da inferência passa a do treino. Por isso o módulo inteiro é sobre servir mais tokens com o mesmo hardware.`,
      ],
      keyIdea: "Cada token custa pouco, mas a inferência é paga de novo a cada pedido; o treino, uma vez só.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "cost",
            piece: "metrics-panel",
            metrics: [
              { id: "train", label: "treino: 6 · N · D", value: `${scientific(trainingFlops)} FLOPs` },
              { id: "token", label: "um token: 2 · N", value: `${scientific(flopsPerToken)} FLOPs` },
              { id: "answer", label: `resposta de ${ANSWER_TOKENS} tokens`, value: `${scientific(flopsPerAnswer)} FLOPs` },
              { id: "match", label: "respostas para empatar", value: `${integer(answersToMatchTraining / 1e9)} bilhões`, color: "module-10" },
            ],
            highlight: "match",
          },
        ],
      },
      alt: `Painel de custos de um modelo de 7B: treino com ${scientific(trainingFlops)} FLOPs, ${scientific(flopsPerToken)} FLOPs por token gerado e ${integer(answersToMatchTraining / 1e9)} bilhões de respostas de ${ANSWER_TOKENS} tokens para igualar o treino.`,
    },
    {
      id: "loop",
      shortTitle: "O laço",
      title: "Uma passada inteira do modelo para cada token",
      tag: "mechanism",
      body: [
        "Um LLM não escreve a frase de uma vez. Ele lê o texto, calcula a probabilidade de cada token do vocabulário ser o próximo, escolhe um, cola esse token no fim do texto e repete. A geração é [[autorregressiva|autoregressive]]: cada token depende de todos os anteriores.",
        `Cada volta do laço é uma passada por todas as camadas, usando todos os ${integer(PARAMS / 1e9)} bilhões de pesos. O texto de entrada é tokenizado uma vez, o prompt é lido numa passada só, e daí em diante vem uma passada por token até sair o token de fim ou bater o limite de tokens. Uma resposta de ${OUTPUT_TOKENS} tokens são ${OUTPUT_TOKENS} passadas, uma depois da outra.`,
      ],
      keyIdea: "Gerar N tokens é rodar o modelo N vezes em sequência; nenhuma volta pode começar antes da anterior terminar.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "loop",
            piece: "pipeline",
            stages: [
              { id: "tokenize", label: "tokenizar" },
              { id: "forward", label: "passada no modelo", color: "module-10" },
              { id: "logits", label: "probabilidades" },
              { id: "pick", label: "escolher token" },
              { id: "append", label: "anexar ao texto" },
              { id: "stream", label: "enviar ao app" },
            ],
            active: "forward",
            done: ["tokenize"],
            repeat: { from: "forward", to: "append", label: "× cada token" },
          },
        ],
      },
      alt: "Pipeline da geração: tokenizar, passada no modelo, probabilidades, escolher token e anexar ao texto, com as quatro etapas do meio repetidas para cada token, e enfim enviar ao app.",
    },
    {
      id: "time",
      shortTitle: "O tempo",
      title: "Para onde vão os milissegundos de uma resposta",
      tag: "example",
      body: [
        `Num chip como a NVIDIA H100, ler um prompt de ${PROMPT_TOKENS} tokens custa ${scientific(flopsPerToken * PROMPT_TOKENS)} FLOPs, cerca de ${fixed(prefillMs)} ms no pico de ${integer(H100_FLOPS / 1e12)} TFLOPS. Depois, cada token novo obriga a GPU a ler os ${integer(weightBytes / GB)} GB de pesos em fp16 da memória: a ${fixed(H100_BANDWIDTH / 1e12, 2)} TB/s, são ${fixed(decodeMsPerToken)} ms por token, no melhor caso.`,
        `Uma resposta de ${OUTPUT_TOKENS} tokens leva então ${integer(decodeMs)} ms só na geração, ${Math.round(decodeShare * 100)}% do tempo total de ${fixed(totalMs / 1000, 2)} s. Ler a pergunta é rápido; escrever a resposta é lento. Esses são tetos teóricos, sem rede, fila nem desperdício: na prática os números são piores, mas a proporção vale, e a próxima aula explica por quê.`,
      ],
      keyIdea: "O tempo de uma resposta é quase todo geração token a token, e cada token custa uma leitura completa dos pesos.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "time",
            piece: "chart",
            kind: "bar",
            series: timeSeries,
            highlight: 0,
            color: "module-10",
          },
        ],
      },
      alt: `Barras de tempo ideal numa H100: o prefill de ${PROMPT_TOKENS} tokens leva ${fixed(prefillMs)} ms e cada bloco de ${CHUNK} tokens gerados leva ${integer(decodeMsPerToken * CHUNK)} ms; a geração soma ${integer(decodeMs)} ms.`,
    },
    {
      id: "where",
      shortTitle: "Onde roda",
      title: "API de terceiros ou GPU própria",
      tag: "tradeoff",
      body: [
        "Há dois jeitos de ter inferência. Pela API de um provedor, você paga por token e não vê a GPU: é como pedir comida por aplicativo. Rodando um modelo aberto no seu servidor, você aluga a cozinha inteira: paga a hora da GPU esteja ela ocupada ou parada, mas controla o modelo, os dados e a latência.",
        `O primeiro limite de quem roda o próprio modelo é a memória. Em fp16, um modelo de 7B ocupa ${integer(weightBytes / GB)} GB e cabe numa GPU de ${H100_MEMORY_GB} GB, com espaço sobrando para o [[KV cache|kv-cache]]. Um de 70B ocupa ${integer((SEVENTY_B * FP16_BYTES) / GB)} GB e precisa de pelo menos ${gpusFor(SEVENTY_B)} GPUs só para os pesos. As aulas de quantização, memória e custo mostram como mudar essas contas.`,
      ],
      keyIdea: "API troca controle por simplicidade; GPU própria troca simplicidade por controle e só compensa ocupada.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "app", kind: "app", label: "seu app", col: 0, row: 0.5 },
              { id: "cloud", kind: "cloud", label: "api: paga por token", col: 1, row: 0 },
              { id: "api", kind: "server", label: "gpu própria", col: 1, row: 1 },
              { id: "vram", kind: "memory", label: `${H100_MEMORY_GB} gb de vram`, col: 2, row: 1 },
              { id: "llm", kind: "llm", label: "modelo aberto", col: 3, row: 1 },
            ],
            edges: [
              { from: "app", to: "cloud", label: "https" },
              { from: "app", to: "api", label: "rede interna" },
              { from: "api", to: "vram" },
              { from: "vram", to: "llm", label: "pesos" },
            ],
            active: "vram",
          },
        ],
      },
      alt: `O app pode chamar uma API na nuvem, paga por token, ou uma GPU própria; no segundo caminho, a VRAM de ${H100_MEMORY_GB} GB, em destaque, precisa guardar os pesos do modelo aberto.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Do pedido ao token na tela",
      tag: "summary",
      body: [
        "Inferência é o modelo treinado trabalhando: o pedido entra numa fila, a GPU lê o prompt, gera a resposta um token por vez e devolve cada token em streaming. O custo é pequeno por token e enorme no agregado, e o gargalo é mais a memória do que o cálculo.",
        "A próxima aula abre a passada em duas fases com perfis opostos: o prefill, que lê o prompt inteiro em paralelo, e o decode, que escreve token a token.",
      ],
      keyIdea: "Otimizar inferência é servir mais tokens, mais rápido, com a mesma GPU.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "phone", kind: "phone", label: "pedido", col: 0, row: 0 },
              { id: "queue", kind: "queue", label: "fila", col: 1, row: 0 },
              { id: "api", kind: "server", label: "gpu", col: 2, row: 0 },
              { id: "llm", kind: "llm", label: "prefill + decode", col: 2, row: 1 },
              { id: "answer", kind: "answer", label: "streaming", col: 3, row: 1 },
            ],
            edges: [
              { from: "phone", to: "queue" },
              { from: "queue", to: "api" },
              { from: "api", to: "llm" },
              { from: "llm", to: "answer", label: "tokens" },
            ],
            active: "answer",
            done: ["phone", "queue", "api", "llm"],
          },
        ],
      },
      alt: "O pedido passa pela fila, chega à GPU, que roda o prefill e o decode do modelo, e os tokens voltam em streaming, em destaque.",
    },
  ],
  realWorldExample:
    "O paper do Llama 2 informa que o pré-treino da família inteira consumiu 3,3 milhões de horas de GPU A100 de 80 GB. Esse custo foi pago uma vez. Depois que a Meta publicou os pesos no Hugging Face, cada empresa que baixa o modelo e o coloca num servidor passa a pagar a própria inferência, pedido a pedido, com os mesmos pesos congelados.",
  code: {
    language: "python",
    source: `import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

name = "meta-llama/Llama-2-7b-hf"
tokenizer = AutoTokenizer.from_pretrained(name)
model = AutoModelForCausalLM.from_pretrained(name, torch_dtype=torch.float16, device_map="auto")

inputs = tokenizer("A capital do Brasil é", return_tensors="pt").to(model.device)
with torch.no_grad():  # inferência: sem gradientes, pesos congelados
    output = model.generate(**inputs, max_new_tokens=20)
print(tokenizer.decode(output[0], skip_special_tokens=True))`,
    caption: "Inferência com Hugging Face Transformers: os pesos em fp16 vão para a GPU, e generate roda uma passada por token novo, sem calcular gradientes.",
  },
  tradeOffs: {
    pros: [
      "Os pesos já treinados servem para qualquer número de pedidos, sem treinar de novo",
      "Cada token custa pouco: cerca de 2 FLOPs por parâmetro",
      "A mesma GPU atende muitos usuários quando o servidor é bem feito",
    ],
    cons: [
      "O custo se repete a cada pedido e cresce com o uso do produto",
      "A geração é sequencial: respostas longas demoram, token a token",
      "Modelos grandes exigem várias GPUs só para caber na memória",
    ],
    alternatives: ["API de um provedor, pagando por token", "Modelos menores (SLM) rodando no próprio aparelho"],
  },
  knowledgeCheck: [
    {
      id: "inference-grows",
      prompt: "Um produto de chat dobrou o número de usuários. Qual custo cresce junto, e por quê?",
      options: [
        "O do treino, porque o modelo precisa ser treinado de novo para cada usuário",
        "O da inferência, porque cada pedido novo roda o modelo de novo, token a token",
        "Nenhum, porque os pesos já estão prontos",
        "Só o do armazenamento dos pesos",
      ],
      correct: 1,
      explanation: "O treino foi pago uma vez. Cada pedido novo exige novas passadas do modelo, então a conta da inferência acompanha o uso.",
      lesson: "10-01",
    },
    {
      id: "answer-slower",
      prompt: "Por que gerar uma resposta de 300 tokens demora muito mais do que ler um prompt de 500 tokens?",
      options: [
        "Porque o prompt é lido em paralelo numa passada, e cada token da resposta exige uma passada própria, em sequência",
        "Porque os tokens da resposta são maiores",
        "Porque o modelo treina enquanto responde",
        "Porque a GPU desliga entre um token e outro",
      ],
      correct: 0,
      explanation: "O prompt inteiro entra numa passada só. A resposta é autorregressiva: cada token depende do anterior, e cada passada relê todos os pesos.",
      lesson: "10-01",
    },
  ],
  related: ["10-02", "04-02", "00-06"],
  references: [
    { title: "Touvron et al. (2023), Llama 2: Open Foundation and Fine-Tuned Chat Models", url: "https://arxiv.org/abs/2307.09288", kind: "paper" },
    { title: "Kaplan et al. (2020), Scaling Laws for Neural Language Models", url: "https://arxiv.org/abs/2001.08361", kind: "paper" },
    { title: "NVIDIA H100 Tensor Core GPU", url: "https://www.nvidia.com/en-us/data-center/h100/", kind: "docs" },
  ],
};

export default lesson;
