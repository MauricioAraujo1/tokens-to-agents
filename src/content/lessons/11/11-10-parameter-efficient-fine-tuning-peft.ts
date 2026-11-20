import type { LessonContent } from "../../../types/content";

// A família PEFT com as contas no Llama 2 7B (d = 4096, 32 camadas, FFN de 11008, keys e values de 4096, sem GQA),
// calculadas aqui: prompt tuning com 20 tokens virtuais; prefix tuning com 20 posições de key e value por camada, sem a
// MLP de reparametrização; adapters de gargalo com m = 64, dois por camada, com bias; IA³ com vetores para keys, values
// e a entrada da down_proj; e LoRA com r = 8 em q e v. Os resultados citados são dos papers: adapters a 0,4 ponto do
// ajuste completo no GLUE com 3,6% de parâmetros por tarefa (Houlsby et al., 2019), e prompt tuning se igualando ao
// ajuste completo quando o modelo passa de bilhões de parâmetros (Lester et al., 2021).

const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");
const share = (value: number) => `${fixed(value * 100, 3)}%`;

const D = 4096;
const FFN = 11008;
const LAYERS = 32;
const VOCAB = 32_000;
const totalParams = LAYERS * (4 * D * D + 3 * D * FFN + 2 * D) + D + 2 * VOCAB * D;

const VIRTUAL_TOKENS = 20;
const BOTTLENECK = 64;
const RANK = 8;

const methods = [
  { id: "prompt", label: "prompt tuning", params: VIRTUAL_TOKENS * D },
  { id: "ia3", label: "IA³", params: LAYERS * (D + D + FFN) },
  { id: "lora", label: "LoRA q,v r=8", params: LAYERS * 2 * RANK * (D + D) },
  { id: "prefix", label: "prefix tuning", params: LAYERS * 2 * VIRTUAL_TOKENS * D },
  { id: "adapter", label: "adapters m=64", params: LAYERS * 2 * (2 * D * BOTTLENECK + BOTTLENECK + D) },
];
const byId = (id: string) => methods.find((method) => method.id === id)?.params ?? 0;
const smallest = methods[0];
const largest = methods[methods.length - 1];
const spread = largest.params / smallest.params;

const virtualTokens = ["[v1]", "[v2]", "[v3]", "[v4]"];
const realTokens = ["resuma", "o", "contrato", ":"];

const matrixRows = ["prompt tuning", "prefix tuning", "adapters", "IA³", "LoRA"];
const matrixCols = ["latência extra", "funde em W", "ocupa contexto"];
const properties = [
  [1, 0, 1],
  [1, 0, 1],
  [1, 0, 0],
  [0, 1, 0],
  [0, 1, 0],
];

const lesson: LessonContent = {
  id: "11-10",
  subtitle: "A família de métodos que ajusta uma fração mínima de parâmetros: prompt tuning, prefix tuning, adapters, IA³ e LoRA, com a conta de cada um e onde cada um pesa.",
  objectives: [
    "Classificar os métodos PEFT por onde eles mexem: entrada, attention, camadas novas ou pesos",
    "Calcular os parâmetros treináveis de cada método num 7B",
    "Comparar custo de inferência, fusão nos pesos e uso de contexto",
    "Escolher um método para um caso concreto",
  ],
  steps: [
    {
      id: "car",
      shortTitle: "Personalizar",
      title: "Personalizar o carro sem abrir o motor",
      tag: "context",
      body: [
        "Há vários jeitos de deixar um carro do seu jeito sem mexer no motor: um adesivo no vidro, um acessório parafusado no painel, uma regulagem de banco e espelho. Cada um é barato, reversível e mexe num lugar diferente.",
        "O [[PEFT|peft]] reúne os métodos que fazem isso com um modelo: o modelo base fica congelado e só uma peça pequena treina. Ela pode entrar antes da entrada (tokens virtuais), dentro da attention (prefixos de key e value), entre as camadas ([[adapters de gargalo|bottleneck-adapter]]) ou como um ajuste nos pesos existentes ([[IA³|ia3]] e [[LoRA|lora]]).",
      ],
      keyIdea: "PEFT congela o modelo e treina uma peça pequena; o que muda entre os métodos é onde a peça entra.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "family",
            piece: "block-diagram",
            blocks: [
              { id: "prompt", kind: "tokens", label: "tokens virtuais", col: 0, row: 0 },
              { id: "prefix", kind: "kv-cache", label: "prefixo k, v", col: 0, row: 1 },
              { id: "base", kind: "llm", label: "base congelada", col: 1.5, row: 0.5 },
              { id: "adapter", kind: "memory", label: "adapters", col: 3, row: 0 },
              { id: "weights", kind: "embedding", label: "lora, ia³", col: 3, row: 1 },
            ],
            edges: [
              { from: "prompt", to: "base", label: "entrada" },
              { from: "prefix", to: "base", label: "attention" },
              { from: "adapter", to: "base", label: "entre camadas" },
              { from: "weights", to: "base", label: "nos pesos" },
            ],
            active: "base",
          },
        ],
      },
      alt: "A base congelada, em destaque, recebe peças pequenas em quatro lugares: tokens virtuais na entrada, prefixos de key e value na attention, adapters entre as camadas e LoRA ou IA³ nos pesos.",
    },
    {
      id: "virtual",
      shortTitle: "Tokens virtuais",
      title: "Prompt tuning e prefix tuning",
      tag: "mechanism",
      body: [
        `No [[prompt tuning|prompt-tuning]], ${VIRTUAL_TOKENS} vetores de embedding são colocados antes do texto e são os únicos parâmetros treinados: ${VIRTUAL_TOKENS} × ${D} = ${integer(byId("prompt"))} números no Llama 2 7B. É um prompt que nenhum humano escreveria, aprendido por gradiente. O paper mostrou que a distância para o ajuste completo some quando o modelo passa de bilhões de parâmetros.`,
        `O [[prefix tuning|prefix-tuning]] vai mais fundo: treina ${VIRTUAL_TOKENS} posições de key e value em cada uma das ${LAYERS} camadas de attention, ${integer(byId("prefix"))} números. Os dois ocupam posições do contexto, o que encurta o espaço para o texto real, e não podem ser somados aos pesos: o custo continua em toda chamada.`,
      ],
      keyIdea: "Prompt e prefix tuning treinam entradas, não pesos: são minúsculos, mas ocupam contexto em toda chamada.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "tokens",
            piece: "token-stream",
            tokens: [...virtualTokens, ...realTokens],
            bars: [...virtualTokens.map(() => 1), ...realTokens.map(() => 0)],
            color: "module-11",
          },
        ],
      },
      alt: "Quatro tokens virtuais com barras, os únicos treinados, antes do texto real: resuma o contrato.",
    },
    {
      id: "layers",
      shortTitle: "Adapters",
      title: "Adapters de gargalo e IA³",
      tag: "mechanism",
      body: [
        `Os adapters de Houlsby inserem, depois da attention e da FFN, uma camada que desce de ${D} para m = ${BOTTLENECK} dimensões, aplica uma não linearidade e volta, somando o resultado à saída. Com dois por camada, são ${integer(byId("adapter"))} parâmetros. No paper, chegaram a 0,4 ponto do ajuste completo no GLUE treinando 3,6% dos parâmetros por tarefa.`,
        `O IA³ é o mais econômico entre os que mexem nos pesos: aprende vetores que multiplicam, elemento a elemento, as keys, os values e a ativação da FFN. São ${integer(byId("ia3"))} números no 7B. Como é só uma escala, pode ser absorvido nas matrizes depois do treino. Os adapters não: são camadas a mais, em sequência, e somam latência em toda chamada.`,
      ],
      keyIdea: "Adapters acrescentam camadas, e latência; IA³ e LoRA mexem nos pesos e podem ser fundidos.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "block",
            piece: "block-diagram",
            blocks: [
              { id: "attention", kind: "llm", label: "attention", col: 0, row: 0 },
              { id: "adapter-1", kind: "memory", label: `adapter ${D}→${BOTTLENECK}→${D}`, col: 1, row: 0 },
              { id: "ffn", kind: "llm", label: "ffn", col: 2, row: 0 },
              { id: "adapter-2", kind: "memory", label: "adapter", col: 3, row: 0 },
              { id: "ia3", kind: "embedding", label: "ia³: escala k, v, ffn", col: 1, row: 1 },
            ],
            edges: [
              { from: "attention", to: "adapter-1" },
              { from: "adapter-1", to: "ffn" },
              { from: "ffn", to: "adapter-2" },
              { from: "ia3", to: "attention", label: "×", variant: "alternative" },
              { from: "ia3", to: "ffn", label: "×", variant: "alternative" },
            ],
            active: "adapter-1",
          },
        ],
      },
      alt: `Um bloco do Transformer com um adapter de gargalo, em destaque, depois da attention, que desce de ${D} para ${BOTTLENECK} dimensões e volta, e outro depois da FFN. Embaixo, o IA³ multiplica keys, values e a ativação da FFN.`,
    },
    {
      id: "count",
      shortTitle: "As contas",
      title: "Cinco métodos no Llama 2 7B",
      tag: "example",
      body: [
        `Os números vão de ${integer(smallest.params)} parâmetros (prompt tuning) a ${integer(largest.params)} (adapters), uma diferença de ${integer(spread)} vezes. Como os tamanhos variam tanto, a cena usa log₁₀: cada unidade a mais é dez vezes mais parâmetros. Mesmo o maior fica em ${share(largest.params / totalParams)} dos ${integer(totalParams)} do modelo.`,
        "Contar parâmetros não decide sozinho. Os métodos com mais parâmetros costumam ter mais capacidade para tarefas longe do pré-treino, e os minúsculos ficam bons quando o modelo é grande e a tarefa é próxima do que ele já sabe. O LoRA ficou popular por ficar no meio: capacidade ajustável pelo posto e nenhum custo na inferência depois de fundido.",
      ],
      keyIdea: "Todos treinam menos de 1% do modelo; o que os separa é capacidade e custo de inferência.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "params",
            piece: "metrics-panel",
            metrics: [
              { id: "prompt", label: "prompt tuning", value: integer(byId("prompt")) },
              { id: "lora", label: "LoRA q, v (r = 8)", value: integer(byId("lora")), color: "module-11" },
              { id: "adapter", label: `adapters (m = ${BOTTLENECK})`, value: integer(byId("adapter")) },
            ],
            highlight: "lora",
          },
          {
            id: "log-params",
            piece: "chart",
            kind: "bar",
            series: methods.map((method) => ({ label: method.label, value: Number(Math.log10(method.params).toFixed(2)) })),
            highlight: 2,
            color: "module-11",
          },
        ],
      },
      alt: `Parâmetros treináveis no Llama 2 7B, em log₁₀: ${methods.map((method) => `${method.label} ${integer(method.params)}`).join(", ")}.`,
    },
    {
      id: "choose",
      shortTitle: "Escolher",
      title: "Onde cada método cobra o preço",
      tag: "tradeoff",
      body: [
        "A matriz resume as diferenças que pesam em produção. Prompt e prefix tuning ocupam contexto e somam custo em toda chamada. Adapters de gargalo somam camadas e latência. IA³ e LoRA podem ser fundidos nos pesos, e aí o modelo ajustado roda na mesma velocidade da base.",
        "Na prática: LoRA (ou QLoRA, com pouca memória) é o ponto de partida padrão; IA³ e prompt tuning servem quando há muitas tarefas e cada adaptador precisa ser minúsculo; adapters de gargalo aparecem mais em modelos encoder e em trabalhos mais antigos. A biblioteca PEFT do Hugging Face implementa todos com a mesma interface.",
      ],
      keyIdea: "Para servir rápido, prefira o que funde nos pesos; para guardar milhares de tarefas, o que é minúsculo.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "properties",
            piece: "matrix",
            rows: matrixRows,
            cols: matrixCols,
            values: properties,
            scale: { min: 0, max: 1 },
            highlight: { row: 4, col: 1 },
            showValues: true,
            color: "module-11",
          },
        ],
      },
      alt: "Matriz de propriedades com 1 para sim e 0 para não. Prompt e prefix tuning: latência extra e ocupam contexto. Adapters: latência extra. IA³ e LoRA: fundem nos pesos, com LoRA em destaque.",
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Uma família, uma pergunta: onde a peça entra",
      tag: "summary",
      body: [
        "Prompt tuning treina a entrada, prefix tuning treina keys e values, adapters acrescentam camadas, IA³ escala ativações e LoRA soma um desvio de posto baixo. Todos congelam a base e treinam menos de 1% dos parâmetros; LoRA e IA³ ainda somem na inferência depois de fundidos.",
        "Vários desses métodos, como o QLoRA, dependem de guardar números com menos bits. A próxima aula explica a quantização do zero: escala, arredondamento e erro.",
      ],
      keyIdea: "Entrada, attention, camadas novas ou pesos: cada PEFT mexe num lugar e cobra num lugar.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "decision",
            piece: "pipeline",
            display: "chips",
            stages: [
              { id: "default", label: "padrão: LoRA", color: "module-11" },
              { id: "memory", label: "pouca memória: QLoRA" },
              { id: "many", label: "milhares de tarefas: IA³ ou prompt tuning" },
              { id: "encoder", label: "encoder antigo: adapters" },
            ],
          },
        ],
      },
      alt: "Chips de decisão: padrão LoRA, em destaque; pouca memória, QLoRA; milhares de tarefas, IA³ ou prompt tuning; encoder antigo, adapters.",
    },
  ],
  realWorldExample:
    "A biblioteca PEFT do Hugging Face oferece LoraConfig, PromptTuningConfig, PrefixTuningConfig e IA3Config com a mesma função get_peft_model. Trocar de método é trocar a configuração; o treino e o salvamento do adaptador continuam iguais.",
  code: {
    language: "python",
    source: `from peft import IA3Config, PromptTuningConfig, get_peft_model

prompt = PromptTuningConfig(task_type="CAUSAL_LM", num_virtual_tokens=20)
ia3 = IA3Config(task_type="CAUSAL_LM")

model = get_peft_model(base_model, prompt)  # ou ia3
model.print_trainable_parameters()`,
    caption: "Dois métodos PEFT com a mesma interface: prompt tuning com 20 tokens virtuais e IA³ com os módulos padrão do modelo.",
  },
  tradeOffs: {
    pros: [
      "Todos treinam uma fração mínima dos parâmetros, com pouca memória de otimizador",
      "Um adaptador por tarefa, de kilobytes a dezenas de megabytes",
      "Os métodos que fundem nos pesos não custam nada na inferência",
    ],
    cons: [
      "Prompt e prefix tuning ocupam contexto e ficam fracos em modelos pequenos",
      "Adapters de gargalo somam latência em toda chamada",
      "Os mais minúsculos têm pouca capacidade para tarefas longe do pré-treino",
    ],
    alternatives: ["Ajuste completo, quando há memória e a tarefa exige capacidade", "Prompt e few-shot, sem treino nenhum"],
  },
  knowledgeCheck: [
    {
      id: "latency-budget",
      prompt: "Um serviço tem orçamento de latência apertado e vai servir um único modelo ajustado. Qual método PEFT encaixa melhor?",
      options: [
        "Prefix tuning, porque treina poucos parâmetros",
        "LoRA ou IA³, que podem ser fundidos nos pesos e rodam na velocidade da base",
        "Adapters de gargalo, porque têm mais capacidade",
        "Prompt tuning com 200 tokens virtuais",
      ],
      correct: 1,
      explanation: "Depois de fundidos, LoRA e IA³ não acrescentam nenhuma conta. Prefix e prompt tuning ocupam contexto, e adapters somam camadas em sequência.",
      lesson: "11-10",
    },
    {
      id: "prompt-tuning-count",
      prompt: "Quantos parâmetros treina o prompt tuning com 50 tokens virtuais num modelo com d_model = 2048?",
      options: ["2.048", "102.400", "4.194.304", "50"],
      correct: 1,
      explanation: "Cada token virtual é um vetor de embedding de 2048 números: 50 × 2048 = 102.400.",
      lesson: "11-10",
    },
  ],
  related: ["11-08", "11-09", "11-11"],
  references: [
    { title: "Houlsby et al. (2019), Parameter-Efficient Transfer Learning for NLP", url: "https://arxiv.org/abs/1902.00751", kind: "paper" },
    { title: "Lester et al. (2021), The Power of Scale for Parameter-Efficient Prompt Tuning", url: "https://arxiv.org/abs/2104.08691", kind: "paper" },
    { title: "Liu et al. (2022), Few-Shot Parameter-Efficient Fine-Tuning is Better and Cheaper than In-Context Learning (IA³)", url: "https://arxiv.org/abs/2205.05638", kind: "paper" },
    { title: "Hugging Face PEFT", url: "https://huggingface.co/docs/peft/index", kind: "docs" },
  ],
};

export default lesson;
