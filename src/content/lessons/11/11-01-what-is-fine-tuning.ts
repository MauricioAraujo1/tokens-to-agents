import type { BlockDiagramSpec } from "../../../scene/types";
import type { LessonContent } from "../../../types/content";

// O que é fine-tuning, com as contas no arquivo. Um modelo de brinquedo escolhe a primeira palavra de uma
// resposta de atendimento entre 5 candidatas; o ajuste treina essa escolha com a cross-entropy, cujo gradiente
// nos logits é p − y, tratando os logits como os parâmetros. Depois, o tamanho de uma cópia ajustada do
// Llama 2 7B, contado pela configuração publicada (d = 4096, 32 camadas, FFN de 11008, vocabulário de 32000),
// contra um adaptador LoRA com r = 8 em q_proj e v_proj.

const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");
const percent = (value: number) => `${Math.round(value * 100)}%`;

const softmax = (logits: number[]) => {
  const top = Math.max(...logits);
  const exps = logits.map((value) => Math.exp(value - top));
  const total = exps.reduce((sum, value) => sum + value, 0);
  return exps.map((value) => value / total);
};

const CANDIDATES = ["Prezado", "Olá", "Caro", "Oi", "Bom"];
const TARGET = "Olá";
const targetIndex = CANDIDATES.indexOf(TARGET);
const START_LOGITS = [2.0, 1.0, 1.2, 0.5, 0.3];
const LEARNING_RATE = 0.5;
const STEPS = 8;

const train = (logits: number[], steps: number) => {
  let current = [...logits];
  for (let step = 0; step < steps; step += 1) {
    const probs = softmax(current);
    current = current.map((value, index) => value - LEARNING_RATE * (probs[index] - (index === targetIndex ? 1 : 0)));
  }
  return current;
};

const before = softmax(START_LOGITS);
const afterLogits = train(START_LOGITS, STEPS);
const after = softmax(afterLogits);
const lossBefore = -Math.log(before[targetIndex]);
const lossAfter = -Math.log(after[targetIndex]);
const maxShift = Math.max(...afterLogits.map((value, index) => Math.abs(value - START_LOGITS[index])));
const favoriteBefore = CANDIDATES[before.indexOf(Math.max(...before))];

const series = (probs: number[]) => CANDIDATES.map((label, index) => ({ label, value: Number(probs[index].toFixed(2)) }));

// Llama 2 7B pela configuração publicada.
const D = 4096;
const FFN = 11008;
const LAYERS = 32;
const VOCAB = 32_000;
const totalParams = LAYERS * (4 * D * D + 3 * D * FFN + 2 * D) + D + 2 * VOCAB * D;
const BYTES_BF16 = 2;
const fullCopyGb = (totalParams * BYTES_BF16) / 1e9;
const RANK = 8;
const loraParams = LAYERS * 2 * RANK * (D + D);
const adapterMb = (loraParams * BYTES_BF16) / 1e6;
const VARIANTS = 3;

const flow = (active: string, done?: string[]): BlockDiagramSpec => ({
  id: "flow",
  piece: "block-diagram",
  blocks: [
    { id: "base", kind: "llm", label: "modelo base", col: 0, row: 0 },
    { id: "data", kind: "documents", label: "seus exemplos", col: 1, row: 1 },
    { id: "train", kind: "eval", label: "ajuste fino", col: 2, row: 0 },
    { id: "tuned", kind: "llm", label: "modelo ajustado", col: 3, row: 0 },
  ],
  edges: [
    { from: "base", to: "train", label: "pesos" },
    { from: "data", to: "train", label: "poucos mil" },
    { from: "train", to: "tuned", label: "pesos novos" },
  ],
  active,
  ...(done ? { done } : {}),
});

const lesson: LessonContent = {
  id: "11-01",
  subtitle: "Treinar um pouco mais um modelo que já sabe muito, com os seus exemplos, para ele se comportar do jeito que o seu produto precisa.",
  objectives: [
    "Definir fine-tuning e o que ele reaproveita do pré-treino",
    "Ver, numa conta de brinquedo, como poucos passos de gradiente mudam a resposta preferida",
    "Diferenciar o ajuste completo do ajuste com adaptadores pequenos",
    "Reconhecer o que o fine-tuning ensina bem (comportamento) e o que ensina mal (fatos novos)",
  ],
  steps: [
    {
      id: "residency",
      shortTitle: "Residência",
      title: "Um médico formado fazendo residência",
      tag: "context",
      body: [
        "Um médico recém-formado já sabe anatomia, farmacologia e como conversar com pacientes. Na residência em cardiologia, ele não volta para a primeira série: atende casos da especialidade, com supervisão, até agir como cardiologista. Pouco tempo de treino, porque a base já está lá.",
        "[[Fine-tuning|fine-tuning]] é a residência de um modelo. Você parte de um [[modelo base|base-model]] que passou pelo [[pré-treino|pre-training]] e continua o treino com alguns milhares de exemplos seus: respostas do seu suporte, laudos no seu formato, código no seu estilo. O resultado é o mesmo modelo, com os pesos levemente mudados.",
      ],
      keyIdea: "Fine-tuning não cria um modelo do zero: especializa um modelo pronto com um conjunto pequeno de exemplos.",
      scene: { kind: "pieces", layout: "single", pieces: [flow("train")] },
      alt: "O modelo base entrega os pesos, e os seus exemplos entram no ajuste fino, em destaque, que produz o modelo ajustado com pesos novos.",
    },
    {
      id: "same-loss",
      shortTitle: "Mesma perda",
      title: "O mesmo treino de antes, com outros dados",
      tag: "mechanism",
      body: [
        `Imagine um assistente de uma loja cuja marca começa toda resposta com “${TARGET}”. O modelo base, treinado em texto da web, prefere começar com “${favoriteBefore}”: na cena, ele dá só ${percent(before[targetIndex])} de chance a “${TARGET}”. O ajuste precisa mudar essa preferência sem estragar o resto.`,
        `A ferramenta é a mesma do pré-treino: prever o próximo token e medir o erro com a [[cross-entropy|cross-entropy]], −log p(token certo). Hoje a perda é −log(${fixed(before[targetIndex])}) = ${fixed(lossBefore)}. O gradiente dessa perda nos [[logits|logit]] é p − y: empurra para cima o token certo e para baixo os outros, na proporção da probabilidade de cada um.`,
      ],
      keyIdea: "Fine-tuning usa a mesma perda de próximo token do pré-treino; só os exemplos mudam.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "probs",
            piece: "chart",
            kind: "bar",
            series: series(before),
            max: 1,
            highlight: targetIndex,
            color: "module-11",
          },
        ],
      },
      alt: `Probabilidade da primeira palavra antes do ajuste: ${CANDIDATES.map((label, index) => `${label} ${percent(before[index])}`).join(", ")}. A palavra da marca, ${TARGET}, está em destaque.`,
    },
    {
      id: "steps",
      shortTitle: "Passos",
      title: `${STEPS} passos de gradiente depois`,
      tag: "mechanism",
      body: [
        `Com taxa de aprendizado ${fixed(LEARNING_RATE, 1)} e ${STEPS} passos de [[gradiente|gradient]] neste exemplo, a chance de “${TARGET}” sobe de ${percent(before[targetIndex])} para ${percent(after[targetIndex])}, e a perda cai de ${fixed(lossBefore)} para ${fixed(lossAfter)}. Nenhum logit andou mais que ${fixed(maxShift)}: foi um empurrão, não uma reconstrução.`,
        "Num LLM de verdade, o gradiente não para nos logits: atravessa a rede e ajusta bilhões de [[pesos|weight]] um pouquinho cada. Por isso o fine-tuning usa uma [[taxa de aprendizado|learning-rate]] menor que a do pré-treino e poucas [[épocas|epoch]]: a ideia é mover o modelo o suficiente para o comportamento novo, e não mais.",
      ],
      keyIdea: "Poucos passos com taxa baixa bastam para mudar uma preferência, porque o modelo já está perto.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "metrics",
            piece: "metrics-panel",
            metrics: [
              { id: "p-before", label: `P(${TARGET}) antes`, value: percent(before[targetIndex]) },
              { id: "p-after", label: `P(${TARGET}) depois`, value: percent(after[targetIndex]), color: "success" },
              { id: "loss", label: "perda", value: `${fixed(lossBefore)} → ${fixed(lossAfter)}` },
            ],
            highlight: "p-after",
          },
          {
            id: "probs",
            piece: "chart",
            kind: "bar",
            series: series(after),
            max: 1,
            highlight: targetIndex,
            color: "module-11",
          },
        ],
      },
      alt: `Depois de ${STEPS} passos, ${TARGET} passa de ${percent(before[targetIndex])} para ${percent(after[targetIndex])} de chance, e a perda cai de ${fixed(lossBefore)} para ${fixed(lossAfter)}.`,
    },
    {
      id: "copies",
      shortTitle: "Cópias",
      title: "Ajustar tudo ou ajustar um pedaço",
      tag: "example",
      body: [
        `No [[ajuste completo|full-fine-tuning]], todos os pesos mudam, e cada versão ajustada é um modelo inteiro. Contando pela configuração do Llama 2 7B, são ${integer(totalParams)} parâmetros, ${fixed(fullCopyGb, 1)} GB em 16 bits. Três produtos com três ajustes viram ${fixed(VARIANTS * fullCopyGb, 1)} GB para guardar e servir.`,
        `A alternativa é congelar o modelo e treinar só um [[adaptador|adapter]] pequeno. Com [[LoRA|lora]] de posto 8 nas projeções de query e value, o adaptador tem ${integer(loraParams)} parâmetros, cerca de ${fixed(adapterMb, 1)} MB. O modelo base fica um só, e cada produto carrega o seu adaptador. As aulas 11.08 a 11.10 mostram como.`,
      ],
      keyIdea: "Ajuste completo gera um modelo inteiro por versão; adaptadores geram arquivos de megabytes sobre a mesma base.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "variants",
            piece: "block-diagram",
            blocks: [
              { id: "base", kind: "llm", label: "base congelada", col: 0, row: 0.5 },
              { id: "support", kind: "memory", label: "adaptador suporte", col: 1, row: 0 },
              { id: "legal", kind: "memory", label: "adaptador jurídico", col: 1, row: 1 },
              { id: "server", kind: "server", label: "um servidor", col: 2, row: 0.5 },
              { id: "users", kind: "user", label: "produtos", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "base", to: "support" },
              { from: "base", to: "legal" },
              { from: "support", to: "server", label: `${fixed(adapterMb, 1)} MB` },
              { from: "legal", to: "server", label: `${fixed(adapterMb, 1)} MB` },
              { from: "server", to: "users" },
            ],
            active: "server",
          },
        ],
      },
      alt: `Uma base congelada recebe dois adaptadores, de suporte e jurídico, de cerca de ${fixed(adapterMb, 1)} MB cada, servidos por um mesmo servidor, em destaque, para os produtos.`,
    },
    {
      id: "behavior",
      shortTitle: "O que ensina",
      title: "Ensina comportamento, não uma enciclopédia",
      tag: "tradeoff",
      body: [
        "O fine-tuning é ótimo para o que se repete em todo exemplo: formato de saída, tom, vocabulário da área, quando recusar, como chamar uma ferramenta. É fraco para fatos que mudam: a tabela de preços do mês que vem não está nos exemplos de hoje, e o modelo pode inventar uma com toda a confiança.",
        "Por isso a ordem prática é a da cena: primeiro um bom [[prompt|prompt]], depois exemplos no prompt ([[few-shot|few-shot]]), depois [[RAG|rag]] para conhecimento que muda, e fine-tuning quando o comportamento ainda não sai ou quando o prompt ficou longo e caro demais. A aula 11.03 transforma isso numa decisão com contas.",
      ],
      keyIdea: "Use fine-tuning para como o modelo responde; use busca para o que ele precisa saber hoje.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "ladder",
            piece: "pipeline",
            stages: [
              { id: "prompt", label: "prompt" },
              { id: "few-shot", label: "few-shot" },
              { id: "rag", label: "RAG" },
              { id: "ft", label: "fine-tuning", color: "module-11" },
            ],
            active: "ft",
            done: ["prompt", "few-shot", "rag"],
            branch: { id: "facts", label: "fatos novos → RAG", from: "ft", edgeLabel: "não ensina bem", color: "danger" },
          },
        ],
      },
      alt: "Escada de soluções: prompt, few-shot e RAG concluídos e fine-tuning em destaque, com um ramo avisando que fatos novos vão melhor no RAG.",
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Uma residência curta e bem escolhida",
      tag: "summary",
      body: [
        "Fine-tuning continua o treino de um modelo pronto, com a mesma perda e poucos exemplos, para mudar o comportamento. Pode mexer em todos os pesos ou só num adaptador pequeno, e funciona melhor para forma e estilo do que para fatos.",
        "A próxima aula compara o pré-treino e o fine-tuning lado a lado: dados, taxa de aprendizado e o risco de o modelo esquecer o que sabia.",
      ],
      keyIdea: "Modelo base + seus exemplos + poucos passos de treino = modelo ajustado.",
      scene: { kind: "pieces", layout: "single", pieces: [flow("tuned", ["base", "data", "train"])] },
      alt: "O mesmo fluxo com o modelo base, os exemplos e o ajuste concluídos, e o modelo ajustado em destaque.",
    },
  ],
  realWorldExample:
    "A OpenAI oferece fine-tuning dos seus modelos pela API: você envia um arquivo JSONL com conversas de exemplo e recebe um modelo com nome próprio. A documentação recomenda tentar antes prompts e few-shot, e usar o ajuste para estilo, formato e tarefas em que o prompt sozinho não basta.",
  code: {
    language: "python",
    source: `from transformers import AutoModelForCausalLM
from peft import LoraConfig, get_peft_model

model = AutoModelForCausalLM.from_pretrained("meta-llama/Llama-2-7b-hf")
config = LoraConfig(r=8, target_modules=["q_proj", "v_proj"], task_type="CAUSAL_LM")
model = get_peft_model(model, config)
model.print_trainable_parameters()`,
    caption: "Congela o Llama 2 7B e acrescenta um adaptador LoRA de posto 8: o print mostra os cerca de 4,2 milhões de parâmetros treináveis contra os 6,7 bilhões do modelo.",
  },
  tradeOffs: {
    pros: [
      "Reaproveita todo o conhecimento do pré-treino com poucos exemplos",
      "Muda formato, tom e comportamento de um jeito que o prompt não garante",
      "Permite prompts mais curtos, e respostas mais baratas e rápidas",
    ],
    cons: [
      "Precisa de exemplos bons, e de manutenção quando o produto muda",
      "Ensina mal fatos que mudam e pode reforçar alucinações",
      "Pode fazer o modelo esquecer habilidades que tinha",
    ],
    alternatives: ["Prompt e few-shot, quando o comportamento já sai bem", "RAG, quando o problema é conhecimento atualizado"],
  },
  knowledgeCheck: [
    {
      id: "what-changes",
      prompt: "Depois de um fine-tuning com 3 mil conversas de suporte, o que mudou no modelo?",
      options: [
        "A arquitetura ganhou camadas novas obrigatoriamente",
        "Os pesos se moveram um pouco a partir do modelo pronto, com a mesma perda de próximo token",
        "O modelo passou a consultar as conversas na hora da resposta",
        "O vocabulário do tokenizador foi refeito",
      ],
      correct: 1,
      explanation: "Fine-tuning continua o treino do modelo pronto: mesma arquitetura, mesma perda, pesos levemente ajustados pelos exemplos.",
      lesson: "11-01",
    },
    {
      id: "price-table",
      prompt: "Uma loja quer que o assistente responda com a tabela de preços, que muda todo mês. O fine-tuning é a melhor ferramenta?",
      options: [
        "Sim: basta ajustar de novo a cada mês e confiar no modelo",
        "Não: o fato muda e precisa de fonte; RAG resolve melhor, e o fine-tuning pode cuidar do formato da resposta",
        "Sim: fine-tuning é a única forma de colocar fatos no modelo",
        "Não: modelos de linguagem não conseguem falar de preços",
      ],
      correct: 1,
      explanation: "Fine-tuning ensina bem comportamento e mal fatos voláteis. A tabela atual vem da busca; o ajuste pode padronizar como ela é apresentada.",
      lesson: "11-01",
    },
  ],
  related: ["04-11", "11-02", "11-03"],
  references: [
    { title: "OpenAI: Fine-tuning guide", url: "https://platform.openai.com/docs/guides/fine-tuning", kind: "docs" },
    { title: "Hugging Face PEFT", url: "https://huggingface.co/docs/peft/index", kind: "docs" },
    { title: "Hu et al. (2021), LoRA: Low-Rank Adaptation of Large Language Models", url: "https://arxiv.org/abs/2106.09685", kind: "paper" },
  ],
};

export default lesson;
