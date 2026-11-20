import type { BlockDiagramSpec } from "../../../scene/types";
import type { LessonContent } from "../../../types/content";

// Modelo próprio com as contas no arquivo. Todos os preços são DE EXEMPLO: o preço misturado da API sai de
// uma proporção de entrada e saída, o custo fixo do servidor próprio soma GPUs ligadas o mês inteiro e as
// horas de operação. O ponto de equilíbrio, em tokens por mês, é custo fixo ÷ preço por token da API. A
// vazão por GPU é uma hipótese rotulada (meça no seu hardware). Pesos = parâmetros × bytes por parâmetro.

const money = (value: number, digits = 0) =>
  `US$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
const fixed = (value: number, digits = 1) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");
const percent = (value: number) => `${Math.round(value * 100)}%`;
const MILLION = 1e6;
const BILLION = 1e9;
const GB = 1e9;

// Passo 3: tamanho dos pesos por precisão.
const weightsGB = (params: number, bytes: number) => (params * bytes) / GB;
const SMALL_PARAMS = 8e9;
const LARGE_PARAMS = 70e9;
const small16 = weightsGB(SMALL_PARAMS, 2);
const large16 = weightsGB(LARGE_PARAMS, 2);
const large4 = weightsGB(LARGE_PARAMS, 0.5);
const GPU_MEMORY_GB = 80;

// Passo 4: preços de exemplo da API, por milhão de tokens, e a mistura de entrada e saída.
const API_INPUT = 0.5;
const API_OUTPUT = 1.5;
const INPUT_SHARE = 0.8;
const blendedPerMillion = API_INPUT * INPUT_SHARE + API_OUTPUT * (1 - INPUT_SHARE);

// Custo fixo do servidor próprio: GPUs de exemplo e horas de operação de exemplo.
const GPU_HOURLY = 2.5;
const HOURS_PER_MONTH = 730;
const GPUS = 2;
const OPS_HOURS = 20;
const OPS_RATE = 100;
const gpuMonthly = GPU_HOURLY * HOURS_PER_MONTH * GPUS;
const opsMonthly = OPS_HOURS * OPS_RATE;
const fixedMonthly = gpuMonthly + opsMonthly;
const breakEvenTokens = (fixedMonthly / blendedPerMillion) * MILLION;

// Teto do servidor próprio: vazão total (entrada + saída) medida por GPU, hipótese, a 60% de uso.
const TOKENS_PER_S_PER_GPU = 8000;
const TARGET_UTILIZATION = 0.6;
const capacityTokens = TOKENS_PER_S_PER_GPU * 3600 * HOURS_PER_MONTH * GPUS * TARGET_UTILIZATION;

const volumes = [1, 2, 5, 10, 20].map((billions) => billions * BILLION);
const apiCost = (tokens: number) => (tokens / MILLION) * blendedPerMillion;
const volumeSeries = volumes.map((tokens) => ({ label: `${integer(tokens / BILLION)} bi`, value: Number((apiCost(tokens) / 1000).toFixed(1)) }));
const firstWinning = volumes.findIndex((tokens) => apiCost(tokens) >= fixedMonthly);

const hosting = (active: string, done?: string[]): BlockDiagramSpec => ({
  id: "hosting",
  piece: "block-diagram",
  blocks: [
    { id: "hub", kind: "documents", label: "pesos abertos", col: 0, row: 0 },
    { id: "engine", kind: "server", label: "vllm na sua gpu", col: 1, row: 0 },
    { id: "memory", kind: "memory", label: "vram", col: 1, row: 1 },
    { id: "backend", kind: "app", label: "seu backend", col: 2, row: 0 },
    { id: "guard", kind: "guardrail", label: "dados ficam aqui", col: 3, row: 0 },
  ],
  edges: [
    { from: "hub", to: "engine", label: "download" },
    { from: "engine", to: "memory" },
    { from: "backend", to: "engine", label: "/v1/chat" },
    { from: "backend", to: "guard" },
  ],
  active,
  ...(done ? { done } : {}),
});

const lesson: LessonContent = {
  id: "17-03",
  subtitle: "Rodar um modelo de pesos abertos na sua infraestrutura: o que você assume, quanta memória ele pede e a partir de quantos tokens por mês compensa.",
  objectives: [
    "Listar as responsabilidades que passam a ser suas ao hospedar um modelo",
    "Estimar a memória dos pesos a partir dos parâmetros e da precisão",
    "Calcular o ponto de equilíbrio com a API em tokens por mês",
    "Reconhecer quando privacidade ou customização decidem antes do custo",
  ],
  steps: [
    {
      id: "own",
      shortTitle: "Em casa",
      title: "Cozinhar em casa em vez de pedir comida",
      tag: "context",
      body: [
        "Pedir comida é prático: paga por prato e não lava louça. Cozinhar em casa pede fogão, compras e tempo, mas fica mais barato quando a família come todo dia, e você controla cada ingrediente. [[Self-hosting|self-hosting]] é cozinhar em casa: você baixa os pesos de um modelo [[open weights|open-weights]] e roda na sua GPU, com um motor de inferência como o [[vLLM|vllm]].",
        "O motivo mais comum nem é custo. É [[residência de dados|data-residency]]: o texto dos clientes não sai da sua rede nem do país. Os outros são controle (a versão só muda quando você quer), customização (rodar um modelo que você ajustou com fine-tuning) e latência previsível, sem dividir a fila com os outros clientes de um provedor.",
      ],
      keyIdea: "Hospedar o modelo troca preço por token por responsabilidade: você ganha controle dos dados, da versão e do custo em escala.",
      scene: { kind: "pieces", layout: "single", pieces: [hosting("engine")] },
      alt: "Pesos abertos são baixados para um servidor com vLLM na sua GPU, em destaque, que carrega o modelo na VRAM; o seu backend chama /v1/chat, e os dados ficam dentro da sua rede.",
    },
    {
      id: "duties",
      shortTitle: "O que é seu",
      title: "Tudo o que o provedor fazia agora é seu",
      tag: "mechanism",
      body: [
        "Na API, você só mandava texto. Aqui, a lista cresce: escolher o modelo e a licença dos pesos, escolher a precisão (bf16, fp8, 4 bits), subir o motor com a API no formato da OpenAI, colocar autenticação e limites na frente, escalar réplicas, monitorar e atualizar o motor e o modelo quando sair uma versão melhor.",
        "Nenhum item é difícil sozinho, e o módulo inteiro existe para eles: GPUs, containers, serving, nuvem e monitoração. Mas somados viram horas de engenharia todo mês, e essas horas entram no [[custo total de propriedade|total-cost-of-ownership]] tanto quanto a GPU.",
      ],
      keyIdea: "O custo de hospedar é GPU mais operação: conte as horas de quem mantém o serviço de pé.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "duties",
            piece: "pipeline",
            stages: [
              { id: "license", label: "modelo e licença" },
              { id: "precision", label: "precisão" },
              { id: "engine", label: "motor + api", color: "module-17" },
              { id: "auth", label: "auth e limites" },
              { id: "scale", label: "escalar" },
              { id: "monitor", label: "monitorar" },
              { id: "update", label: "atualizar" },
            ],
            active: "engine",
            done: ["license", "precision"],
          },
        ],
      },
      alt: "Pipeline das responsabilidades: modelo e licença, precisão, motor com API (em destaque), autenticação e limites, escalar, monitorar e atualizar.",
    },
    {
      id: "memory",
      shortTitle: "Memória",
      title: "Primeiro, os pesos precisam caber",
      tag: "mechanism",
      body: [
        `A conta de bolso: memória dos pesos = parâmetros × bytes por parâmetro. Um modelo de ${integer(SMALL_PARAMS / BILLION)} bilhões em bf16 (2 bytes) ocupa ${integer(small16)} GB e cabe com folga numa GPU de ${GPU_MEMORY_GB} GB. Um de ${integer(LARGE_PARAMS / BILLION)} bilhões ocupa ${integer(large16)} GB: não cabe numa GPU só e pede pelo menos duas com [[tensor parallelism|tensor-parallelism]].`,
        `A [[quantização|quantization]] em 4 bits leva o modelo de ${integer(LARGE_PARAMS / BILLION)} bilhões para cerca de ${integer(large4)} GB, que cabe numa GPU de ${GPU_MEMORY_GB} GB. E caber não basta: o que sobra vira [[KV cache|kv-cache]], que decide quantos pedidos rodam ao mesmo tempo. O módulo 10 faz essa conta em detalhe; aqui, ela define quantas GPUs entram no custo.`,
      ],
      keyIdea: "Parâmetros × bytes dá a memória dos pesos; o que sobra na GPU é a concorrência que você pode vender.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "weights",
            piece: "metrics-panel",
            metrics: [
              { id: "small", label: `${integer(SMALL_PARAMS / BILLION)}B em bf16`, value: `${integer(small16)} GB`, color: "success" },
              { id: "large", label: `${integer(LARGE_PARAMS / BILLION)}B em bf16`, value: `${integer(large16)} GB`, color: "danger" },
              { id: "large4", label: `${integer(LARGE_PARAMS / BILLION)}B em 4 bits`, value: `${integer(large4)} GB`, color: "module-17" },
              { id: "gpu", label: "uma gpu", value: `${GPU_MEMORY_GB} GB` },
            ],
            highlight: "large4",
          },
        ],
      },
      alt: `Memória dos pesos: ${integer(SMALL_PARAMS / BILLION)}B em bf16 ocupa ${integer(small16)} GB, ${integer(LARGE_PARAMS / BILLION)}B em bf16 ocupa ${integer(large16)} GB e não cabe numa GPU de ${GPU_MEMORY_GB} GB, e ${integer(LARGE_PARAMS / BILLION)}B em 4 bits ocupa ${integer(large4)} GB.`,
    },
    {
      id: "break-even",
      shortTitle: "Equilíbrio",
      title: "A partir de quantos tokens por mês compensa",
      tag: "example",
      body: [
        `Na API de um modelo pequeno, com preços de exemplo de ${money(API_INPUT, 2)} por milhão de tokens de entrada e ${money(API_OUTPUT, 2)} de saída e ${percent(INPUT_SHARE)} dos tokens sendo de entrada, o milhão misturado sai por ${money(blendedPerMillion, 2)}. Do lado próprio, ${GPUS} GPUs a ${money(GPU_HOURLY, 2)} por hora ligadas o mês inteiro custam ${money(gpuMonthly)}, e ${OPS_HOURS} horas de operação a ${money(OPS_RATE)} somam ${money(opsMonthly)}: ${money(fixedMonthly)} fixos por mês.`,
        `O equilíbrio é custo fixo ÷ preço por token: ${fixed(breakEvenTokens / BILLION)} bilhões de tokens por mês. Abaixo disso a API é mais barata; acima, cada token a mais no servidor próprio sai quase de graça, até o teto. Com ${integer(TOKENS_PER_S_PER_GPU)} tokens por segundo por GPU (hipótese de vazão medida) a ${percent(TARGET_UTILIZATION)} de uso, as ${GPUS} GPUs entregam ${fixed(capacityTokens / BILLION)} bilhões por mês. Como o [[custo por token|cost-per-token]] de uma GPU cai com a utilização (aula 10-14), é ela que decide se o equilíbrio chega.`,
      ],
      keyIdea: "Equilíbrio = custo fixo mensal ÷ preço por token da API; abaixo dele, a API ganha.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "volume",
            piece: "chart",
            kind: "bar",
            series: volumeSeries,
            cutoff: { mode: "threshold", value: Number((fixedMonthly / 1000).toFixed(2)), label: `próprio ${money(fixedMonthly)}` },
            highlight: firstWinning,
            color: "module-17",
          },
        ],
      },
      alt: `Custo mensal da API, em milhares de dólares de exemplo, por volume de tokens: ${volumeSeries.map((point) => `${point.label} ${point.value}`).join(", ")}. A linha de ${money(fixedMonthly)} do servidor próprio fica entre 5 e 10 bilhões; o equilíbrio é ${fixed(breakEvenTokens / BILLION)} bilhões de tokens por mês.`,
    },
    {
      id: "hybrid",
      shortTitle: "Híbrido",
      title: "Não precisa ser tudo ou nada",
      tag: "tradeoff",
      body: [
        "Os modelos abertos que cabem em uma ou duas GPUs resolvem bem classificação, extração, resumo e RAG sobre os seus documentos. Tarefas difíceis de raciocínio ainda costumam ir melhor nos modelos de fronteira, que só existem por API. Por isso muitas empresas misturam as duas coisas.",
        "Um [[roteador de modelos|model-routing]] manda o tráfego de alto volume ou com dados sensíveis para o modelo próprio e o resto para a API. O servidor próprio fica com utilização alta e estável, que é onde ele é barato, e a API absorve os picos e os casos difíceis, onde pagar por token é melhor.",
      ],
      keyIdea: "Hospede o volume previsível e sensível; mande o pico e o difícil para a API.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "hybrid",
            piece: "block-diagram",
            blocks: [
              { id: "backend", kind: "app", label: "backend", col: 0, row: 0.5 },
              { id: "router", kind: "server", label: "roteador", col: 1, row: 0.5 },
              { id: "own", kind: "llm", label: "modelo próprio", col: 2.5, row: 0 },
              { id: "api", kind: "cloud", label: "api de fronteira", col: 2.5, row: 1 },
            ],
            edges: [
              { from: "backend", to: "router" },
              { from: "router", to: "own", label: "volume e sigilo" },
              { from: "router", to: "api", label: "pico e difícil", variant: "alternative" },
            ],
            active: "router",
          },
        ],
      },
      alt: "O backend chama um roteador, em destaque, que manda o tráfego de volume e com dados sensíveis para o modelo próprio e, por um caminho tracejado, os picos e os casos difíceis para uma API de fronteira.",
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Quando hospedar",
      tag: "summary",
      body: [
        "Hospede quando os dados não podem sair, quando você precisa de um modelo ajustado ou de uma versão congelada, ou quando o volume passa com folga do ponto de equilíbrio. Na conta, entram GPUs ligadas o mês inteiro, redundância e as horas de quem opera, não só o preço da hora da GPU.",
        "A próxima aula abre a caixa do hardware: que GPU escolher, o que é uma instância de GPU e por que a conexão entre as GPUs importa tanto quanto a memória delas.",
      ],
      keyIdea: "Self-hosting compensa com volume alto e estável, dados sensíveis ou modelo próprio; o resto fica na API.",
      scene: { kind: "pieces", layout: "single", pieces: [hosting("guard", ["hub", "engine", "memory", "backend"])] },
      alt: "O caminho completo do modelo próprio: pesos abertos, vLLM na GPU, VRAM e backend já percorridos, e a fronteira dos dados em destaque.",
    },
  ],
  realWorldExample:
    "A Meta publica os pesos da família Llama para download, com licença própria, e eles rodam em motores abertos como vLLM, TGI e llama.cpp. O vLLM sobe um servidor compatível com a API da OpenAI com um comando só, então um backend que já usava o SDK da OpenAI passa a falar com o modelo próprio trocando a base_url.",
  code: {
    language: "bash",
    source: `pip install vllm
vllm serve meta-llama/Llama-3.1-8B-Instruct --max-model-len 8192 --api-key "$VLLM_API_KEY"

curl http://localhost:8000/v1/chat/completions \\
  -H "Authorization: Bearer $VLLM_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"model": "meta-llama/Llama-3.1-8B-Instruct", "messages": [{"role": "user", "content": "Oi!"}]}'`,
    caption: "Subir um modelo de 8B com o vLLM, protegido por uma chave, e chamar a API no formato da OpenAI. Os pesos do Llama exigem aceitar a licença no Hugging Face.",
  },
  tradeOffs: {
    pros: [
      "Os dados não saem da sua rede, e a versão do modelo só muda quando você quer",
      "Custo por token cai muito com volume alto e utilização estável",
      "Permite servir modelos ajustados com fine-tuning e adapters",
    ],
    cons: [
      "GPU ligada custa o mês inteiro, mesmo sem tráfego",
      "Operação vira trabalho fixo: motor, drivers, escala, monitoração e plantão",
      "Os maiores modelos de fronteira não têm pesos abertos",
    ],
    alternatives: [
      "API de modelo, abaixo do ponto de equilíbrio ou para tarefas de fronteira",
      "Endpoint gerenciado de nuvem com pesos abertos, que tira o hardware das suas mãos",
    ],
  },
  knowledgeCheck: [
    {
      id: "fits",
      prompt: "Você quer servir um modelo de 34 bilhões de parâmetros em bf16 numa GPU de 80 GB. O que a conta de bolso diz?",
      options: [
        "Não cabe: 34 GB passa de 80 GB",
        "Cabe: são cerca de 68 GB de pesos, mas sobra pouco para o KV cache e a concorrência fica baixa",
        "Cabe com 70 GB livres",
        "Precisa de 8 GPUs",
      ],
      correct: 1,
      explanation: "34 bilhões × 2 bytes ≈ 68 GB. Os pesos cabem, mas sobram uns 12 GB para KV cache e ativações; quantizar ou dividir em duas GPUs aumenta a concorrência.",
      lesson: "17-03",
    },
    {
      id: "break-even-volume",
      prompt: "O servidor próprio custa US$ 6.000 por mês, somando GPUs e operação. A API cobra, em média, US$ 1,00 por milhão de tokens. Seu app consome 3 bilhões de tokens por mês. O que faz sentido pelo custo?",
      options: [
        "Hospedar, porque GPU é sempre mais barata",
        "Ficar na API: 3 bilhões custam US$ 3.000, abaixo do equilíbrio de 6 bilhões",
        "Hospedar, porque o equilíbrio é 3 bilhões",
        "Os dois custam igual",
      ],
      correct: 1,
      explanation: "O equilíbrio é 6.000 ÷ 1,00 = 6.000 milhões de tokens. Com 3 bilhões, a API custa US$ 3.000, metade do servidor próprio. Privacidade pode mudar a decisão, mas o custo, não.",
      lesson: "17-03",
    },
  ],
  related: ["17-02", "17-04", "10-14"],
  references: [
    { title: "vLLM: documentação", url: "https://docs.vllm.ai/", kind: "docs" },
    { title: "Hugging Face Hub: documentação", url: "https://huggingface.co/docs/hub/index", kind: "docs" },
    { title: "llama.cpp", url: "https://github.com/ggml-org/llama.cpp", kind: "repo" },
  ],
};

export default lesson;
