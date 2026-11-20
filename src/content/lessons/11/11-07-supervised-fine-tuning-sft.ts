import type { BlockDiagramSpec } from "../../../scene/types";
import type { LessonContent } from "../../../types/content";

// SFT com as contas no arquivo. As probabilidades que o modelo dá a cada token certo são de brinquedo; a perda é a
// média de −log p, com e sem a máscara que zera os tokens do prompt. O packing compara 8 exemplos completados com
// padding até o mais longo do lote contra os mesmos tokens concatenados em blocos de 1024. Os hiperparâmetros do
// Llama 2 são os publicados (Touvron et al., 2023): 27.540 exemplos, taxa 2 × 10⁻⁵, lote 64, 2 épocas.

const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");
const percent = (value: number) => `${Math.round(value * 100)}%`;
const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;

const promptTokens = ["<user>", "prazo", "?", "<assistant>"];
const answerTokens = ["5", "dias", "úteis", "<end>"];
const tokens = [...promptTokens, ...answerTokens];
// Probabilidade do token certo em cada posição. O primeiro token não tem contexto e não é previsto.
const promptProbs = [0.02, 0.3, 0.9];
const answerProbs = [0.2, 0.7, 0.55, 0.85];
const nll = (p: number) => -Math.log(p);
const lossAll = mean([...promptProbs, ...answerProbs].map(nll));
const lossAnswer = mean(answerProbs.map(nll));
const hardestPrompt = nll(Math.min(...promptProbs));
const answerLosses = answerTokens.map((token, index) => ({ label: token, value: Number(nll(answerProbs[index]).toFixed(2)) }));
const hardestAnswer = answerLosses.reduce((best, item, index) => (item.value > answerLosses[best].value ? index : best), 0);

// Packing.
const MAX_LENGTH = 1024;
const lengths = [620, 180, 410, 95, 760, 300, 240, 505];
const realTokens = lengths.reduce((sum, length) => sum + length, 0);
const paddedSlots = lengths.length * Math.max(...lengths);
const packedSlots = Math.ceil(realTokens / MAX_LENGTH) * MAX_LENGTH;
const paddedWaste = 1 - realTokens / paddedSlots;
const packedWaste = 1 - realTokens / packedSlots;
const slotSaving = 1 - packedSlots / paddedSlots;

// Hiperparâmetros.
const LLAMA2_EXAMPLES = 27_540;
const LLAMA2_BATCH = 64;
const LLAMA2_EPOCHS = 2;
const PER_DEVICE = 4;
const ACCUMULATION = 8;
const GPUS = 2;
const effectiveBatch = PER_DEVICE * ACCUMULATION * GPUS;
const stepsPerEpoch = Math.ceil(LLAMA2_EXAMPLES / LLAMA2_BATCH);

const flow = (active: string, done?: string[]): BlockDiagramSpec => ({
  id: "flow",
  piece: "block-diagram",
  blocks: [
    { id: "pairs", kind: "documents", label: "pedido e resposta", col: 0, row: 0 },
    { id: "tokens", kind: "tokens", label: "chat template", col: 1, row: 0 },
    { id: "llm", kind: "llm", label: "modelo", col: 2, row: 0 },
    { id: "loss", kind: "eval", label: "perda na resposta", col: 3, row: 0 },
  ],
  edges: [
    { from: "pairs", to: "tokens" },
    { from: "tokens", to: "llm", label: "sequência" },
    { from: "llm", to: "loss", label: "probabilidades" },
    { from: "loss", to: "llm", label: "gradiente", variant: "alternative" },
  ],
  active,
  ...(done ? { done } : {}),
});

const lesson: LessonContent = {
  id: "11-07",
  subtitle: "Como o modelo aprende com pares de pedido e resposta: a perda só nos tokens da resposta, o packing das sequências e os hiperparâmetros que importam.",
  objectives: [
    "Explicar o SFT como previsão do próximo token em exemplos de instrução",
    "Calcular a perda com e sem a máscara dos tokens do prompt",
    "Medir o desperdício de padding e o ganho do packing",
    "Escolher taxa de aprendizado, lote efetivo e épocas para um ajuste",
  ],
  steps: [
    {
      id: "apprentice",
      shortTitle: "Aprendiz",
      title: "Copiar a resposta do mestre",
      tag: "context",
      body: [
        "Um aprendiz de redação recebe o pedido do cliente e o texto que o redator-chefe escreveu. O exercício é reescrever a resposta, palavra por palavra, tentando adivinhar a próxima antes de olhar. A correção é só na resposta: ninguém dá nota por ele copiar o pedido do cliente.",
        "O [[SFT|supervised-fine-tuning]] faz isso com o modelo. Cada exemplo passa pelo chat template, o modelo prevê cada token da resposta a partir dos anteriores, e a [[cross-entropy|cross-entropy]] mede o erro. Com muitas tarefas diferentes escritas como instruções, isso vira [[instruction tuning|instruction-tuning]]: o FLAN ajustou um modelo em mais de 60 datasets assim e ele passou a seguir instruções de tarefas que não estavam no treino.",
      ],
      keyIdea: "SFT é prever o próximo token da resposta, exemplo por exemplo, com o pedido como contexto.",
      scene: { kind: "pieces", layout: "single", pieces: [flow("loss")] },
      alt: "Pares de pedido e resposta passam pelo chat template e entram no modelo; a perda na resposta, em destaque, devolve o gradiente ao modelo pelo caminho tracejado.",
    },
    {
      id: "masking",
      shortTitle: "Máscara",
      title: "A perda só conta a resposta",
      tag: "mechanism",
      body: [
        `Na cena, as barras marcam os tokens que entram na perda. Sem máscara, todos entram, e a média de −log p fica em ${fixed(lossAll)}. O vilão é o pedido do usuário: prever “prazo” depois de “<user>” é quase impossível (p = ${fixed(promptProbs[0])}, perda ${fixed(hardestPrompt)}), e esse erro domina o gradiente.`,
        `Com [[loss masking|loss-masking]], os rótulos dos tokens do prompt viram −100, o valor que a cross-entropy do PyTorch ignora, e a perda fica em ${fixed(lossAnswer)}, só sobre a resposta. O modelo gasta o treino aprendendo a responder, não a imitar perguntas de usuários. No TRL, o SFTTrainer faz isso para datasets no formato de prompt e completion.`,
      ],
      keyIdea: "Mascarar o prompt concentra o gradiente no que o modelo deve escrever.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "losses",
            piece: "metrics-panel",
            metrics: [
              { id: "all", label: "perda em todos os tokens", value: fixed(lossAll) },
              { id: "answer", label: "perda só na resposta", value: fixed(lossAnswer), color: "module-11" },
              { id: "worst", label: "pior token do prompt", value: fixed(hardestPrompt), color: "danger" },
            ],
            highlight: "answer",
          },
          {
            id: "sequence",
            piece: "token-stream",
            tokens,
            bars: [...promptTokens.map(() => 0), ...answerTokens.map(() => 1)],
            query: promptTokens.length,
            color: "module-11",
          },
        ],
      },
      alt: `Sequência de treino com o prompt sem barras e a resposta, 5 dias úteis e o token de fim, com barras: só ela entra na perda. Perda ${fixed(lossAll)} com todos os tokens, ${fixed(lossAnswer)} só com a resposta.`,
    },
    {
      id: "per-token",
      shortTitle: "Por token",
      title: "Onde o modelo ainda erra",
      tag: "mechanism",
      body: [
        `Dentro da resposta, cada token tem a sua perda. O mais difícil é “${answerLosses[hardestAnswer].label}”, com ${fixed(answerLosses[hardestAnswer].value)}: é o fato específico do produto, que o modelo base não tinha como saber. Os tokens de forma, como o fim da resposta, já saem fáceis.`,
        "Isso explica por que o SFT ensina formato rápido e fatos devagar. A forma se repete em todo exemplo e logo fica barata. Um fato aparece em poucos exemplos, e decorá-lo exige épocas a mais, que também decoram o resto e levam ao [[overfitting|overfitting]]. Para fatos, a resposta continua sendo RAG.",
      ],
      keyIdea: "Tokens de forma ficam fáceis cedo; fatos raros continuam caros e são o primeiro sinal de decoreba.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [{ id: "token-loss", piece: "chart", kind: "bar", series: answerLosses, highlight: hardestAnswer, color: "module-11" }],
      },
      alt: `Perda de cada token da resposta: ${answerLosses.map((item) => `${item.label} ${fixed(item.value)}`).join(", ")}. O token ${answerLosses[hardestAnswer].label} é o mais difícil.`,
    },
    {
      id: "packing",
      shortTitle: "Packing",
      title: "Lotes sem espaço vazio",
      tag: "example",
      body: [
        `Exemplos têm tamanhos diferentes, e um lote precisa de sequências do mesmo comprimento. Completar com padding até o mais longo dos ${lengths.length} exemplos ocupa ${integer(paddedSlots)} posições para ${integer(realTokens)} tokens reais: ${percent(paddedWaste)} de desperdício. A GPU faz as contas do padding mesmo assim.`,
        `O [[sequence packing|sequence-packing]] concatena os exemplos e corta em blocos de ${integer(MAX_LENGTH)}: ${integer(packedSlots)} posições, ${percent(packedWaste)} de sobra só no último bloco e ${percent(slotSaving)} menos contas. O cuidado é a attention não misturar exemplos vizinhos no mesmo bloco: implementações sem padding reiniciam as posições e limitam a attention a cada exemplo.`,
      ],
      keyIdea: "Packing troca padding por tokens reais; a attention precisa respeitar a fronteira entre exemplos.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "waste",
            piece: "metrics-panel",
            metrics: [
              { id: "padded", label: "posições com padding", value: integer(paddedSlots) },
              { id: "packed", label: "posições com packing", value: integer(packedSlots), color: "module-11" },
              { id: "saving", label: "contas a menos", value: percent(slotSaving), color: "success" },
            ],
            highlight: "packed",
          },
          {
            id: "packer",
            piece: "block-diagram",
            blocks: [
              { id: "queue", kind: "queue", label: `${lengths.length} exemplos`, col: 0, row: 0 },
              { id: "pack", kind: "app", label: "concatenar e cortar", col: 1, row: 0 },
              { id: "blocks", kind: "memory", label: `blocos de ${integer(MAX_LENGTH)}`, col: 2, row: 0 },
              { id: "gpu", kind: "server", label: "gpu", col: 3, row: 0 },
            ],
            edges: [
              { from: "queue", to: "pack" },
              { from: "pack", to: "blocks", label: `${integer(realTokens)} tokens` },
              { from: "blocks", to: "gpu" },
            ],
            active: "pack",
          },
        ],
      },
      alt: `${lengths.length} exemplos são concatenados e cortados em blocos de ${integer(MAX_LENGTH)}, em destaque: ${integer(packedSlots)} posições em vez das ${integer(paddedSlots)} com padding, ${percent(slotSaving)} menos contas.`,
    },
    {
      id: "hyperparameters",
      shortTitle: "Taxa e lote",
      title: "Taxa baixa, lote efetivo, poucas épocas",
      tag: "tradeoff",
      body: [
        `O SFT do Llama 2 usou ${integer(LLAMA2_EXAMPLES)} exemplos, [[taxa de aprendizado|learning-rate]] de 2 × 10⁻⁵ com decaimento cosseno, lote de ${LLAMA2_BATCH} e ${LLAMA2_EPOCHS} épocas: cerca de ${integer(stepsPerEpoch)} passos por época. Se a sua GPU só cabe ${PER_DEVICE} exemplos, a [[acumulação de gradiente|gradient-accumulation]] de ${ACCUMULATION} passos em ${GPUS} GPUs chega ao mesmo lote efetivo: ${PER_DEVICE} × ${ACCUMULATION} × ${GPUS} = ${effectiveBatch}.`,
        "Mais épocas não é mais aprendizado: com poucos milhares de exemplos, a perda de treino continua caindo enquanto o modelo decora, e a de validação sobe. O SFT completo também guarda gradiente e estado do Adam para todos os pesos, o que para um 7B não cabe numa GPU comum. As próximas aulas atacam esse custo com LoRA e QLoRA.",
      ],
      keyIdea: "Taxa baixa, lote efetivo pela acumulação e poucas épocas, conferidas pela validação.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "hparams",
            piece: "metrics-panel",
            metrics: [
              { id: "lr", label: "taxa (Llama 2 SFT)", value: "2 × 10⁻⁵" },
              { id: "batch", label: "lote efetivo", value: `${PER_DEVICE} × ${ACCUMULATION} × ${GPUS} = ${effectiveBatch}`, color: "module-11" },
              { id: "epochs", label: "épocas", value: `${LLAMA2_EPOCHS}` },
              { id: "steps", label: "passos por época", value: integer(stepsPerEpoch) },
            ],
            highlight: "batch",
          },
        ],
      },
      alt: `Hiperparâmetros: taxa de 2 × 10⁻⁵, lote efetivo de ${effectiveBatch} com ${PER_DEVICE} exemplos por GPU, acumulação de ${ACCUMULATION} e ${GPUS} GPUs, ${LLAMA2_EPOCHS} épocas e ${integer(stepsPerEpoch)} passos por época.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "O SFT em uma frase",
      tag: "summary",
      body: [
        "Renderize cada exemplo com o chat template, calcule a cross-entropy só nos tokens da resposta, junte exemplos com packing, use taxa baixa, lote efetivo por acumulação e poucas épocas, e acompanhe a validação.",
        "Ajustar todos os pesos de um 7B exige memória de várias GPUs. A próxima aula mostra o LoRA, que treina uma fração mínima dos parâmetros.",
      ],
      keyIdea: "SFT = próximo token + máscara no prompt + packing + taxa baixa.",
      scene: { kind: "pieces", layout: "single", pieces: [flow("llm", ["pairs", "tokens", "loss"])] },
      alt: "O mesmo fluxo com pares, chat template e perda concluídos e o modelo ajustado em destaque.",
    },
  ],
  realWorldExample:
    "O Llama 2-Chat começou por um SFT com 27.540 exemplos de alta qualidade escritos por anotadores. O paper conta que zerar a perda dos tokens do prompt do usuário e treinar só nos tokens da resposta fez parte da receita, com taxa de 2 × 10⁻⁵ e 2 épocas.",
  code: {
    language: "python",
    source: `from datasets import load_dataset
from trl import SFTConfig, SFTTrainer

data = load_dataset("json", data_files={"train": "train.jsonl", "validation": "val.jsonl"})

config = SFTConfig(
    output_dir="sft-suporte",
    learning_rate=2e-5,
    num_train_epochs=2,
    per_device_train_batch_size=4,
    gradient_accumulation_steps=8,
    packing=True,
)
trainer = SFTTrainer(
    model="meta-llama/Llama-2-7b-hf",
    args=config,
    train_dataset=data["train"],
    eval_dataset=data["validation"],
)
trainer.train()`,
    caption: "SFT com o TRL: taxa e épocas do Llama 2, lote efetivo pela acumulação e packing ligado. Com datasets no formato prompt e completion, a perda fica só no completion.",
  },
  tradeOffs: {
    pros: [
      "Simples: a mesma perda do pré-treino, com uma máscara",
      "Poucos milhares de exemplos mudam bastante o comportamento",
      "Packing e acumulação deixam o treino eficiente em GPUs modestas",
    ],
    cons: [
      "Só imita: o modelo não aprende a ser melhor que os exemplos",
      "Com poucos exemplos e muitas épocas, decora",
      "SFT de todos os pesos precisa de muita memória",
    ],
    alternatives: ["DPO ou RLHF depois do SFT, para preferências", "LoRA e QLoRA, para treinar com menos memória"],
  },
  knowledgeCheck: [
    {
      id: "user-style",
      prompt: "Depois do SFT, o modelo às vezes continua a resposta escrevendo uma nova pergunta do usuário. Qual configuração do treino é a suspeita?",
      options: [
        "A taxa de aprendizado baixa",
        "A perda calculada em todos os tokens, sem máscara e sem token de fim, que ensinou o modelo a escrever falas do usuário",
        "O packing desligado",
        "O lote efetivo grande",
      ],
      correct: 1,
      explanation: "Sem máscara, o modelo também aprende a prever as mensagens do usuário. Mascarar o prompt e treinar o token de fim ensina a responder e parar.",
      lesson: "11-07",
    },
    {
      id: "effective-batch",
      prompt: "Você quer lote efetivo de 128 e a GPU só cabe 8 exemplos por vez, numa máquina com 4 GPUs. Qual acumulação de gradiente usar?",
      options: ["2", "4", "16", "128"],
      correct: 1,
      explanation: "Lote efetivo = exemplos por GPU × acumulação × GPUs. 8 × 4 × 4 = 128.",
      lesson: "11-07",
    },
  ],
  related: ["04-11", "04-13", "11-08"],
  references: [
    { title: "Wei et al. (2021), Finetuned Language Models Are Zero-Shot Learners (FLAN)", url: "https://arxiv.org/abs/2109.01652", kind: "paper" },
    { title: "Touvron et al. (2023), Llama 2: Open Foundation and Fine-Tuned Chat Models", url: "https://arxiv.org/abs/2307.09288", kind: "paper" },
    { title: "Hugging Face TRL: SFT Trainer", url: "https://huggingface.co/docs/trl/sft_trainer", kind: "docs" },
  ],
};

export default lesson;
