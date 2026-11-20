import type { LessonContent } from "../../../types/content";

// Treino e validação de um ajuste com curvas de brinquedo, escritas como fórmulas aqui e avaliadas a cada 100 passos:
// treino = 0,55 + 1,45 · e^(−t/250) − 0,00008 · t (sempre cai) e validação = 0,8 + 1,25 · e^(−t/250) + 2,5 × 10⁻⁷ · t²
// (cai e depois sobe). O early stopping com paciência 2 escolhe o melhor checkpoint. A taxa de aprendizado tem
// aquecimento linear de 100 passos até 2 × 10⁻⁴ e decaimento cosseno até 0. O tamanho dos checkpoints usa o Llama 2 7B
// (configuração publicada) e o LoRA com r = 16 nas 7 lineares: pesos em 2 bytes e, para retomar, os dois momentos do
// Adam em fp32 (8 bytes); no ajuste completo, também a cópia fp32 dos pesos (4 bytes).

const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");

const EVAL_EVERY = 100;
const TOTAL_STEPS = 1200;
const trainLoss = (step: number) => 0.55 + 1.45 * Math.exp(-step / 250) - 0.00008 * step;
const validationLoss = (step: number) => 0.8 + 1.25 * Math.exp(-step / 250) + 2.5e-7 * step * step;
const evalSteps = Array.from({ length: TOTAL_STEPS / EVAL_EVERY }, (_, index) => (index + 1) * EVAL_EVERY);

const PATIENCE = 2;
const earlyStop = () => {
  let best = { step: evalSteps[0], loss: validationLoss(evalSteps[0]) };
  let waited = 0;
  for (const step of evalSteps.slice(1)) {
    const loss = validationLoss(step);
    if (loss < best.loss) {
      best = { step, loss };
      waited = 0;
    } else {
      waited += 1;
      if (waited >= PATIENCE) return { best, stoppedAt: step };
    }
  }
  return { best, stoppedAt: evalSteps[evalSteps.length - 1] };
};
const { best, stoppedAt } = earlyStop();
const bestIndex = evalSteps.indexOf(best.step);
const gapAtBest = best.loss - trainLoss(best.step);
const lastStep = evalSteps[evalSteps.length - 1];
const gapAtEnd = validationLoss(lastStep) - trainLoss(lastStep);
const savedSteps = TOTAL_STEPS - stoppedAt;

const series = (loss: (step: number) => number) => evalSteps.map((step) => ({ label: `${step}`, value: Number(loss(step).toFixed(3)) }));

// Taxa de aprendizado.
const PEAK_LR = 2e-4;
const WARMUP = 100;
const learningRate = (step: number) =>
  step < WARMUP ? (PEAK_LR * step) / WARMUP : 0.5 * PEAK_LR * (1 + Math.cos((Math.PI * (step - WARMUP)) / (TOTAL_STEPS - WARMUP)));
const lrSteps = [0, ...evalSteps];
const halfway = WARMUP + (TOTAL_STEPS - WARMUP) / 2;

// Checkpoints.
const D = 4096;
const FFN = 11008;
const LAYERS = 32;
const VOCAB = 32_000;
const totalParams = LAYERS * (4 * D * D + 3 * D * FFN + 2 * D) + D + 2 * VOCAB * D;
const loraParams = LAYERS * (4 * 16 * (D + D) + 3 * 16 * (D + FFN));
const loraCheckpointMb = (loraParams * (2 + 8)) / 1e6;
const fullCheckpointGb = (totalParams * (2 + 4 + 8)) / 1e9;
const checkpoints = evalSteps.length;

const lesson: LessonContent = {
  id: "11-12",
  subtitle: "Acompanhar o ajuste pelas curvas de perda de treino e de validação, parar na hora certa, aquecer e decair a taxa de aprendizado e guardar os checkpoints certos.",
  objectives: [
    "Ler as curvas de perda de treino e de validação e reconhecer o overfitting",
    "Aplicar early stopping com paciência e ficar com o melhor checkpoint",
    "Calcular a taxa de aprendizado com aquecimento e decaimento cosseno",
    "Estimar o espaço dos checkpoints de LoRA e de ajuste completo",
  ],
  steps: [
    {
      id: "mock-exams",
      shortTitle: "Simulados",
      title: "Estudar com simulados",
      tag: "context",
      body: [
        "Quem estuda para uma prova refaz os exercícios do livro até acertar tudo. Mas acertar os exercícios que você já viu não prova nada: o que mostra se você aprendeu é um simulado com questões novas. Quando a nota do simulado para de subir, mais horas no mesmo livro só servem para decorar.",
        "No ajuste, a [[perda de treino|loss-function]] é o livro, e a [[perda de validação|validation-loss]] é o simulado: medida a cada tantos passos em exemplos do [[conjunto de validação|validation-set]], que nunca atualizam os pesos. A cada avaliação, o treino salva um [[checkpoint|checkpoint]], para poder voltar ao melhor ponto.",
      ],
      keyIdea: "A perda de treino mostra se o modelo decora; a de validação mostra se ele aprende.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "loop",
            piece: "block-diagram",
            blocks: [
              { id: "train", kind: "documents", label: "treino", col: 0, row: 0 },
              { id: "model", kind: "llm", label: "modelo", col: 1, row: 0 },
              { id: "val", kind: "eval", label: "validação", col: 2, row: 0 },
              { id: "ckpt", kind: "memory", label: "checkpoint", col: 3, row: 0 },
              { id: "val-data", kind: "documents", label: "exemplos novos", col: 2, row: 1 },
            ],
            edges: [
              { from: "train", to: "model", label: "atualiza" },
              { from: "model", to: "val", label: `a cada ${EVAL_EVERY}` },
              { from: "val-data", to: "val" },
              { from: "val", to: "ckpt", label: "salva" },
            ],
            active: "val",
          },
        ],
      },
      alt: `Os exemplos de treino atualizam o modelo; a cada ${EVAL_EVERY} passos, a validação, em destaque, mede a perda em exemplos novos e salva um checkpoint.`,
    },
    {
      id: "curves",
      shortTitle: "Duas curvas",
      title: "Uma curva cai sempre; a outra vira",
      tag: "mechanism",
      body: [
        `Na cena, a perda de treino cai do começo ao fim: de ${fixed(trainLoss(evalSteps[0]))} no passo ${evalSteps[0]} para ${fixed(trainLoss(lastStep))} no passo ${lastStep}. A de validação cai até o passo ${best.step}, onde chega a ${fixed(best.loss, 3)}, e depois sobe até ${fixed(validationLoss(lastStep))}.`,
        `A distância entre as duas conta a história. No passo ${best.step}, a validação está ${fixed(gapAtBest)} acima do treino; no fim, ${fixed(gapAtEnd)}. O treino continua melhorando porque o modelo começa a decorar os exemplos, e a validação piora porque o que ele decorou não vale para exemplos novos: é o [[overfitting|overfitting]].`,
      ],
      keyIdea: "Treino caindo com validação subindo é o sinal de overfitting.",
      scene: {
        kind: "pieces",
        layout: "row",
        pieces: [
          { id: "train-curve", piece: "chart", kind: "line", series: series(trainLoss), max: 1.7, color: "info" },
          { id: "val-curve", piece: "chart", kind: "line", series: series(validationLoss), max: 1.7, highlight: bestIndex, color: "module-11" },
        ],
      },
      alt: `À esquerda, a perda de treino cai de ${fixed(trainLoss(evalSteps[0]))} para ${fixed(trainLoss(lastStep))}. À direita, a perda de validação cai até ${fixed(best.loss, 3)} no passo ${best.step}, em destaque, e sobe até ${fixed(validationLoss(lastStep))}.`,
    },
    {
      id: "early-stopping",
      shortTitle: "Parar",
      title: "Early stopping com paciência",
      tag: "mechanism",
      body: [
        `O [[early stopping|early-stopping]] para o treino quando a validação não melhora por um número de avaliações seguidas, a paciência. Com paciência ${PATIENCE}, o melhor é o passo ${best.step}; os passos ${evalSteps[bestIndex + 1]} e ${evalSteps[bestIndex + 2]} pioram, e o treino para no ${stoppedAt}, economizando ${integer(savedSteps)} dos ${integer(TOTAL_STEPS)} passos.`,
        `No fim, o treino carrega o checkpoint do passo ${best.step}, não o último. A perplexidade de validação desse ponto é e^${fixed(best.loss, 3)} ≈ ${fixed(Math.exp(best.loss))}. Paciência baixa demais para cedo por causa de ruído; alta demais deixa o overfitting avançar. Com conjuntos de validação pequenos, o ruído é grande, e vale avaliar com mais exemplos.`,
      ],
      keyIdea: "Pare quando a validação para de melhorar e volte ao melhor checkpoint.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "stop",
            piece: "metrics-panel",
            metrics: [
              { id: "best", label: "melhor passo", value: `${best.step}`, color: "module-11" },
              { id: "loss", label: "perda de validação", value: fixed(best.loss, 3) },
              { id: "stopped", label: `parou (paciência ${PATIENCE})`, value: `${stoppedAt}` },
              { id: "saved", label: "passos economizados", value: integer(savedSteps), color: "success" },
            ],
            highlight: "best",
          },
          { id: "val-curve", piece: "chart", kind: "line", series: series(validationLoss), max: 1.7, highlight: bestIndex, color: "module-11" },
        ],
      },
      alt: `A curva de validação com o melhor ponto, passo ${best.step}, em destaque. Com paciência ${PATIENCE}, o treino para no passo ${stoppedAt} e economiza ${integer(savedSteps)} passos.`,
    },
    {
      id: "schedule",
      shortTitle: "Taxa",
      title: "Aquecer e depois decair",
      tag: "example",
      body: [
        `A [[taxa de aprendizado|learning-rate]] não fica fixa. No [[agendamento|learning-rate-schedule]] da cena, ela sobe em linha reta nos primeiros ${WARMUP} passos até ${fixed(PEAK_LR * 1e4, 0)} × 10⁻⁴, um valor comum para LoRA, e depois desce em cosseno até zero no passo ${integer(TOTAL_STEPS)}. No meio do caminho, no passo ${integer(halfway)}, está na metade: ${fixed(learningRate(halfway) * 1e4, 0)} × 10⁻⁴.`,
        "O aquecimento evita passos grandes enquanto o estado do Adam ainda não tem estimativas boas dos gradientes. O decaimento deixa os passos finais pequenos, para o modelo assentar. Uma taxa alta demais aparece como perda de treino que oscila ou explode; baixa demais, como uma curva que mal desce.",
      ],
      keyIdea: "Aquecimento curto, pico moderado, decaimento até zero.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "lr",
            piece: "chart",
            kind: "line",
            series: lrSteps.map((step) => ({ label: `${step}`, value: Number((learningRate(step) * 1e4).toFixed(3)) })),
            highlight: 1,
            color: "module-11",
          },
        ],
      },
      alt: `Taxa de aprendizado, em unidades de 10⁻⁴, por passo: sobe de 0 a ${fixed(PEAK_LR * 1e4, 0)} nos primeiros ${WARMUP} passos e desce em cosseno até 0 no passo ${integer(TOTAL_STEPS)}.`,
    },
    {
      id: "checkpoints",
      shortTitle: "Checkpoints",
      title: "Quais checkpoints guardar",
      tag: "tradeoff",
      body: [
        `Um checkpoint de LoRA com r = 16 guarda os pesos do adaptador e o estado do Adam para retomar: cerca de ${integer(loraCheckpointMb)} MB. No ajuste completo do 7B, pesos, cópia fp32 e Adam somam cerca de ${integer(fullCheckpointGb)} GB por checkpoint. Com ${checkpoints} avaliações, são ${fixed((checkpoints * loraCheckpointMb) / 1e3, 1)} GB no LoRA e ${fixed((checkpoints * fullCheckpointGb) / 1e3, 1)} TB no ajuste completo.`,
        "Por isso o treino costuma guardar só o melhor e os últimos, e apagar o resto. Guardar o estado do otimizador custa espaço, mas é o que permite retomar depois de uma falha sem perder o aquecimento e os momentos do Adam. Para publicar, basta o adaptador do melhor checkpoint.",
      ],
      keyIdea: "Guarde o melhor e os últimos; o estado do otimizador serve para retomar, não para publicar.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "sizes",
            piece: "metrics-panel",
            metrics: [
              { id: "lora", label: "checkpoint LoRA r = 16", value: `${integer(loraCheckpointMb)} MB`, color: "module-11" },
              { id: "full", label: "checkpoint ajuste completo", value: `${integer(fullCheckpointGb)} GB`, color: "danger" },
              { id: "all", label: `${checkpoints} checkpoints completos`, value: `${fixed((checkpoints * fullCheckpointGb) / 1e3, 1)} TB` },
            ],
            highlight: "lora",
          },
          {
            id: "kept",
            piece: "block-diagram",
            blocks: [
              { id: "c600", kind: "memory", label: `passo ${best.step - EVAL_EVERY}`, col: 0, row: 0 },
              { id: "c-best", kind: "memory", label: `passo ${best.step} (melhor)`, col: 1, row: 0 },
              { id: "c-last", kind: "memory", label: `passo ${stoppedAt} (último)`, col: 2, row: 0 },
              { id: "publish", kind: "documents", label: "adaptador final", col: 3, row: 0 },
            ],
            edges: [
              { from: "c600", to: "c-best" },
              { from: "c-best", to: "c-last" },
              { from: "c-best", to: "publish", label: "publica" },
            ],
            active: "c-best",
          },
        ],
      },
      alt: `Checkpoints dos passos ${best.step - EVAL_EVERY}, ${best.step}, o melhor, em destaque, e ${stoppedAt}, o último; só o adaptador do melhor é publicado. Um checkpoint de LoRA tem cerca de ${integer(loraCheckpointMb)} MB, e um do ajuste completo, ${integer(fullCheckpointGb)} GB.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "O painel do treino",
      tag: "summary",
      body: [
        "Separe validação antes de treinar, avalie a cada tantos passos, aqueça e decaia a taxa, pare com early stopping e carregue o melhor checkpoint. Curva de treino que oscila é taxa alta; validação que sobe é overfitting; as duas paradas no alto pedem mais capacidade ou dados melhores.",
        "Perda de validação baixa ainda não diz se as respostas ficaram boas. A próxima aula avalia o modelo ajustado na tarefa: win rate, regressões e o custo do alinhamento.",
      ],
      keyIdea: "Validar, aquecer, decair, parar no melhor, guardar o necessário.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "routine",
            piece: "pipeline",
            stages: [
              { id: "split", label: "separar validação" },
              { id: "train", label: "treinar com aquecimento" },
              { id: "eval", label: `avaliar a cada ${EVAL_EVERY}` },
              { id: "stop", label: "early stopping", color: "module-11" },
              { id: "best", label: "melhor checkpoint" },
            ],
            active: "stop",
            done: ["split", "train", "eval"],
            branch: { id: "resume", label: "retomar do último", from: "train", edgeLabel: "falhou", color: "danger" },
          },
        ],
      },
      alt: "Pipeline do treino: separar validação, treinar com aquecimento e avaliar concluídos, early stopping em destaque e melhor checkpoint; um ramo tracejado retoma do último checkpoint se o treino falhar.",
    },
  ],
  realWorldExample:
    "O Trainer do Hugging Face Transformers faz essa rotina com argumentos: eval_strategy e eval_steps para avaliar, save_total_limit para apagar checkpoints antigos, load_best_model_at_end com metric_for_best_model=\"eval_loss\" para voltar ao melhor, e o EarlyStoppingCallback com early_stopping_patience para parar.",
  code: {
    language: "python",
    source: `from transformers import EarlyStoppingCallback, TrainingArguments

args = TrainingArguments(
    output_dir="lora-suporte",
    learning_rate=2e-4,
    warmup_steps=100,
    lr_scheduler_type="cosine",
    eval_strategy="steps",
    eval_steps=100,
    save_steps=100,
    save_total_limit=3,
    load_best_model_at_end=True,
    metric_for_best_model="eval_loss",
)
callbacks = [EarlyStoppingCallback(early_stopping_patience=2)]`,
    caption: "Aquecimento de 100 passos com decaimento cosseno, avaliação e checkpoint a cada 100 passos, só 3 checkpoints guardados e early stopping com paciência 2.",
  },
  tradeOffs: {
    pros: [
      "A validação mostra o overfitting antes de ele chegar à produção",
      "Early stopping economiza passos e escolhe o melhor ponto sozinho",
      "Checkpoints permitem retomar depois de uma falha",
    ],
    cons: [
      "Avaliar com frequência deixa o treino mais lento",
      "Validação pequena é ruidosa e pode parar cedo demais",
      "Perda de validação baixa não garante respostas boas na tarefa",
    ],
    alternatives: ["Fixar o número de épocas por experimentos anteriores", "Avaliar com métricas da tarefa além da perda"],
  },
  knowledgeCheck: [
    {
      id: "read-curves",
      prompt: "Depois de 3 épocas, a perda de treino caiu de 1,4 para 0,2 e a de validação foi de 1,5 para 1,1 e depois subiu para 1,6. O que fazer?",
      options: [
        "Treinar mais épocas, porque a perda de treino ainda cai",
        "Voltar ao checkpoint com menor perda de validação e usar menos épocas ou mais dados",
        "Aumentar a taxa de aprendizado",
        "Ignorar a validação",
      ],
      correct: 1,
      explanation: "Treino caindo e validação subindo é overfitting. O melhor modelo está no ponto de menor validação; menos épocas, mais dados ou mais regularização evitam o problema.",
      lesson: "11-12",
    },
    {
      id: "noisy-stop",
      prompt: "Com 30 exemplos de validação e paciência 1, o treino para sempre cedo, e o modelo sai fraco. Qual ajuste faz mais sentido?",
      options: [
        "Remover a validação",
        "Usar mais exemplos de validação e paciência maior, para o ruído não decidir a parada",
        "Avaliar a cada passo",
        "Trocar a perda por acurácia",
      ],
      correct: 1,
      explanation: "Com poucos exemplos, a perda de validação oscila por acaso. Mais exemplos reduzem o ruído e mais paciência evita parar num pico ocasional.",
      lesson: "11-12",
    },
  ],
  related: ["01-08", "01-09", "11-13"],
  references: [
    { title: "Hugging Face Transformers: Trainer", url: "https://huggingface.co/docs/transformers/main_classes/trainer", kind: "docs" },
    { title: "Goodfellow, Bengio e Courville, Deep Learning: Regularization (early stopping)", url: "https://www.deeplearningbook.org/contents/regularization.html", kind: "article" },
    { title: "Loshchilov e Hutter (2016), SGDR: Stochastic Gradient Descent with Warm Restarts", url: "https://arxiv.org/abs/1608.03983", kind: "paper" },
  ],
};

export default lesson;
