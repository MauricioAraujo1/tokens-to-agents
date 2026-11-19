import { softmax } from "../../../lab/attention";
import type { PipelineSpec } from "../../../scene/types";
import type { LessonContent } from "../../../types/content";

// Treino de um Transformer: a perda, o gradiente, um laço de descida de gradiente de brinquedo, o
// cronograma de taxa de aprendizado do paper original e as contas de custo (6 · N · D) e de Chinchilla.
// Todos os números da cena são calculados aqui; os tamanhos de modelos e datasets são os publicados.

const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const vector = (values: number[]) => `[${values.map((value) => fixed(value)).join("; ")}]`;
const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");
/** Notação científica legível: 3,15 × 10²³. */
const scientific = (value: number) => {
  const exponent = Math.floor(Math.log10(value));
  const superscript = String(exponent)
    .split("")
    .map((digit) => "⁰¹²³⁴⁵⁶⁷⁸⁹"[Number(digit)])
    .join("");
  return `${fixed(value / 10 ** exponent)} × 10${superscript}`;
};

// Passo 1: perda de um modelo que ainda chuta uniforme sobre o vocabulário do GPT-2.
const VOCAB = 50_257;
const initialLoss = Math.log(VOCAB);

// Passos 2 e 3: a frase de treino e a perda numa posição.
const sentence = ["O", "gato", "dormiu", "no", "sofá"];
const candidates = ["sofá", "chão", "telhado", "carro", "banco", "mar"];
const logits = [3.1, 2.4, 1.7, 0.9, 0.6, -0.5];
const TARGET = 0;
const probabilities = softmax(logits);
/** −log p; o + 0 evita o −0 quando p = 1. */
const nll = (p: number) => -Math.log(p) + 0;
const positionLoss = nll(probabilities[TARGET]);
const lossCurve = [0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1];

// Passo 5: gradiente da cross-entropy em relação aos logits = p − y.
const oneHot = candidates.map((_, index) => (index === TARGET ? 1 : 0));
const gradient = probabilities.map((p, index) => p - oneHot[index]);

// Passo 6: descida de gradiente direto nos logits de 5 candidatos, que começam iguais (chute uniforme).
const STEPS = 12;
const LEARNING_RATE = 1;
const trainLogits = (count: number) => {
  let z = [0, 0, 0, 0, 0];
  const losses: number[] = [];
  for (let step = 0; step <= count; step += 1) {
    const p = softmax(z);
    losses.push(nll(p[0]));
    z = z.map((value, index) => value - LEARNING_RATE * (p[index] - (index === 0 ? 1 : 0)));
  }
  return losses;
};
const descent = trainLogits(STEPS);

// Passo 7: cronograma do Transformer original, lr = d^−0,5 · min(passo^−0,5, passo · aquecimento^−1,5).
const D_MODEL = 512;
const WARMUP = 4000;
const schedule = (step: number) => D_MODEL ** -0.5 * Math.min(step ** -0.5, step * WARMUP ** -1.5);
const scheduleSteps = Array.from({ length: 20 }, (_, index) => (index + 1) * 2000);
const peakRate = schedule(WARMUP);

// Passo 8: custo de treino ≈ 6 · parâmetros · tokens.
const runs = [
  { id: "gpt3", label: "GPT-3 175B", params: 175e9, tokens: 300e9 },
  { id: "chinchilla", label: "Chinchilla 70B", params: 70e9, tokens: 1.4e12 },
  { id: "llama2", label: "Llama 2 7B", params: 7e9, tokens: 2e12 },
];
const flops = (run: { params: number; tokens: number }) => 6 * run.params * run.tokens;
const [gpt3, chinchilla, llama2] = runs;

// Passo 9: Chinchilla, cerca de 20 tokens de treino por parâmetro.
const TOKENS_PER_PARAM = 20;
const sizes = [1e9, 7e9, 13e9, 70e9];
const billions = (value: number) => fixed(value / 1e9, 0);

const loop = (activeStage: string, done: string[]): PipelineSpec => ({
  id: "loop",
  piece: "pipeline",
  stages: [
    { id: "batch", label: "lote de texto" },
    { id: "forward", label: "passada" },
    { id: "loss", label: "perda" },
    { id: "backward", label: "gradiente" },
    { id: "update", label: "AdamW" },
  ],
  active: activeStage,
  done,
  branch: { id: "repeat", label: "próximo lote", from: "update", edgeLabel: "repete", color: "muted" },
});

const lesson: LessonContent = {
  id: "03-14",
  subtitle:
    "Como um Transformer com pesos aleatórios aprende a prever o próximo token: a perda, o gradiente, o otimizador, a taxa de aprendizado e quanto texto e cálculo isso exige.",
  objectives: [
    "Montar os pares de entrada e alvo da previsão do próximo token",
    "Calcular a cross-entropy e a perplexidade e ler os seus valores",
    "Explicar o gradiente da perda em relação aos logits e um passo de otimização",
    "Ler um cronograma de taxa de aprendizado com aquecimento",
    "Estimar o custo de um treino com 6 · N · D e a quantidade de tokens pela regra de Chinchilla",
  ],
  steps: [
    {
      id: "context",
      shortTitle: "Contexto",
      title: "Pesos aleatórios não sabem nada",
      tag: "context",
      body: [
        `A aula anterior montou o modelo, mas os seus milhões de pesos começam aleatórios. Nesse estado, a distribuição sobre o próximo token é quase uniforme: com o vocabulário do GPT-2, cada um dos ${integer(VOCAB)} tokens fica com cerca de 1 / ${integer(VOCAB)} de probabilidade.`,
        "O [[pre-training|pre-training]] (pré-treino) é o que transforma esse chute em conhecimento. É um laço repetido bilhões de vezes: pegar um lote de texto, rodar o modelo, medir o erro das previsões, calcular o gradiente desse erro em relação a cada peso e ajustar os pesos um pouco na direção que diminui o erro.",
      ],
      keyIdea: "Treinar é repetir: prever, medir o erro, calcular o gradiente e ajustar os pesos. Tudo o que o modelo sabe vem desse laço.",
      scene: { kind: "pieces", layout: "single", pieces: [loop("forward", ["batch"])] },
      alt: "Laço de treino: lote de texto, passada pelo modelo (em destaque), perda, gradiente e AdamW, com um ramo que volta para o próximo lote.",
    },
    {
      id: "targets",
      shortTitle: "Alvos",
      title: "O alvo de cada posição é o token seguinte",
      tag: "mechanism",
      body: [
        `O texto de treino já traz as respostas. Para “${sentence.join(" ")}”, a entrada é a sequência sem o último token e o alvo é a mesma sequência deslocada uma posição: “${sentence[0]}” deve prever “${sentence[1]}”, “${sentence[1]}” deve prever “${sentence[2]}”, e assim por diante. Não é preciso rotular nada: o próprio texto é o gabarito.`,
        `Com a máscara causal, cada posição só vê o que veio antes dela, então as ${sentence.length - 1} previsões saem de uma única passada, em paralelo. Usar o texto verdadeiro como entrada, e não o que o modelo geraria, se chama [[teacher forcing|teacher-forcing]]. É por isso que treinar um Transformer é paralelo, mas gerar texto com ele é sequencial.`,
      ],
      keyIdea: "Um texto de n tokens dá n − 1 exemplos de treino de uma vez: cada posição prevê a seguinte, vendo só o passado.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "sentence",
            piece: "token-stream",
            tokens: sentence,
            arcs: sentence.slice(1).map((_, index) => ({ from: index, to: index + 1, weight: 1, label: "alvo" })),
          },
        ],
      },
      alt: `A frase ${sentence.join(" ")}, com uma seta de cada token para o seguinte: ${sentence.slice(1).map((token, index) => `${sentence[index]} → ${token}`).join(", ")}.`,
    },
    {
      id: "cross-entropy",
      shortTitle: "Perda",
      title: "Cross-entropy: −log da probabilidade do token certo",
      tag: "mechanism",
      body: [
        `A perda de cada posição é a [[cross-entropy|cross-entropy]]: −log p, onde p é a probabilidade que o modelo deu ao token certo. Depois de “O gato dormiu no”, se o modelo dá ${fixed(probabilities[TARGET])} a “${candidates[TARGET]}”, a perda é −log ${fixed(probabilities[TARGET])} = ${fixed(positionLoss)}. A perda do lote é a média de todas as posições.`,
        `A curva mostra o formato: perto de p = 1, a perda é quase 0; quando p cai, a perda dispara (${fixed(nll(lossCurve[0]))} com p = ${fixed(lossCurve[0])}). Errar com confiança custa muito. O modelo do passo anterior, com chute uniforme, começa com perda ln ${integer(VOCAB)} = ${fixed(initialLoss)}.`,
      ],
      keyIdea: "A cross-entropy só olha a probabilidade do token certo e pune com −log: quanto menor essa probabilidade, maior a perda.",
      scene: {
        kind: "pieces",
        layout: "row",
        pieces: [
          { id: "probabilities", piece: "chart", kind: "bar", series: candidates.map((label, index) => ({ label, value: probabilities[index] })), max: 1, highlight: TARGET, color: "module-03" },
          { id: "curve", piece: "chart", kind: "line", series: lossCurve.map((p) => ({ label: fixed(p, 1), value: nll(p) })), highlight: lossCurve.indexOf(0.5), color: "danger" },
        ],
      },
      alt: `À esquerda, as probabilidades dos candidatos depois de O gato dormiu no, com sofá em ${fixed(probabilities[TARGET])}. À direita, a curva −log p: ${lossCurve.map((p) => `p ${fixed(p, 2)} → ${fixed(nll(p))}`).join("; ")}.`,
    },
    {
      id: "perplexity",
      shortTitle: "Perplexidade",
      title: "Perplexidade: entre quantos tokens o modelo hesita",
      tag: "mechanism",
      body: [
        `A [[perplexity|perplexity]] (perplexidade) é e elevado à perda média. Ela tem uma leitura direta: um modelo com perplexidade k está, em média, tão indeciso quanto se escolhesse ao acaso entre k tokens. O modelo de chute uniforme tem perplexidade e^${fixed(initialLoss)} = ${integer(Math.exp(initialLoss))}: o vocabulário inteiro.`,
        `Na posição da cena, com perda ${fixed(positionLoss)}, a perplexidade é ${fixed(Math.exp(positionLoss))}: quase como hesitar entre 2 tokens. Uma perda média de 3 corresponde a perplexidade ${fixed(Math.exp(3), 1)}. A perplexidade só vale para comparar modelos com o mesmo tokenizador, porque depende de como o texto foi cortado.`,
      ],
      keyIdea: "Perplexidade = e^perda. É o número efetivo de opções entre as quais o modelo hesita a cada token.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "metrics",
            piece: "metrics-panel",
            metrics: [
              { id: "loss-start", label: "perda inicial", value: fixed(initialLoss) },
              { id: "ppl-start", label: "perplexidade inicial", value: integer(Math.exp(initialLoss)) },
              { id: "loss-now", label: "perda na posição", value: fixed(positionLoss) },
              { id: "ppl-now", label: "perplexidade na posição", value: fixed(Math.exp(positionLoss)) },
            ],
            highlight: "ppl-now",
          },
        ],
      },
      alt: `Perda e perplexidade. Modelo uniforme: perda ${fixed(initialLoss)} e perplexidade ${integer(Math.exp(initialLoss))}. Na posição da cena: perda ${fixed(positionLoss)} e perplexidade ${fixed(Math.exp(positionLoss))}.`,
    },
    {
      id: "gradient",
      shortTitle: "Gradiente",
      title: "O gradiente diz para onde mexer cada logit",
      tag: "mechanism",
      body: [
        "Com softmax e cross-entropy juntos, o gradiente da perda em relação aos logits é simples: p − y, a probabilidade prevista menos o alvo one-hot. Para o token certo, o valor é p − 1, negativo: subir esse logit diminui a perda. Para cada token errado, o valor é p, positivo: baixar o logit dele diminui a perda.",
        `Na cena, o gradiente é ${vector(gradient)}. “${candidates[TARGET]}” recebe ${fixed(gradient[TARGET])}, e “${candidates[1]}”, o erro mais provável, recebe o maior empurrão para baixo, ${fixed(gradient[1])}. A backpropagation leva esse sinal de volta por todos os blocos e calcula o gradiente de cada um dos pesos.`,
      ],
      keyIdea: "O gradiente nos logits é p − y: puxa para cima o token certo e empurra para baixo os errados, na proporção da confiança em cada um.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "gradient",
            piece: "matrix",
            rows: ["p (previsto)", "y (alvo)", "p − y"],
            cols: candidates,
            values: [probabilities, oneHot, gradient],
            scale: { min: -1, max: 1 },
            highlight: { row: 2, col: TARGET },
            showValues: true,
            color: "module-03",
          },
        ],
      },
      alt: `Gradiente da perda nos logits. Previsto: ${vector(probabilities)}. Alvo: ${vector(oneHot)}. p − y: ${vector(gradient)}.`,
    },
    {
      id: "descent",
      shortTitle: "Descida",
      title: "Passo a passo, a perda cai",
      tag: "mechanism",
      body: [
        `Um passo de otimização subtrai de cada peso o gradiente multiplicado pela taxa de aprendizado. A cena faz isso diretamente nos logits de 5 candidatos, que começam iguais: a perda começa em ln 5 = ${fixed(descent[0])} e, depois de ${STEPS} passos com taxa ${LEARNING_RATE}, chega a ${fixed(descent[STEPS])}. Cada passo ajuda menos que o anterior, porque o gradiente encolhe à medida que p se aproxima de 1.`,
        "Num modelo real, o ajuste é nos pesos, e o otimizador padrão é o AdamW. Ele guarda uma média móvel do gradiente e outra do seu quadrado, e dá a cada peso um passo do tamanho certo para ele. O “W” é o decaimento de peso aplicado à parte, que puxa os pesos para perto de zero. O GPT-3 foi treinado com Adam, β₁ = 0,9, β₂ = 0,95 e decaimento de 0,1, valores que viraram padrão.",
      ],
      keyIdea: "Cada passo move os pesos contra o gradiente. Repetido milhões de vezes, sobre bilhões de tokens, isso é o treino.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          { id: "descent", piece: "chart", kind: "line", series: descent.map((loss, step) => ({ label: String(step), value: loss })), highlight: STEPS, color: "success" },
        ],
      },
      alt: `Perda a cada passo de descida de gradiente: ${descent.map((loss, step) => `passo ${step} ${fixed(loss)}`).join(", ")}.`,
    },
    {
      id: "schedule",
      shortTitle: "Taxa",
      title: "A taxa de aprendizado sobe devagar e depois cai",
      tag: "mechanism",
      body: [
        `A taxa de aprendizado não é constante. No começo, os gradientes são grandes e instáveis, e passos grandes podem fazer o treino divergir. O Transformer original usou lr = d_model^−0,5 · min(passo^−0,5, passo · aquecimento^−1,5), com d_model = ${D_MODEL} e ${integer(WARMUP)} passos de aquecimento: a taxa cresce em linha reta até o passo ${integer(WARMUP)}, onde chega a ${fixed(peakRate * 1000, 2)} × 10⁻³, e depois cai com 1/√passo.`,
        "Os LLMs atuais usam a mesma ideia com outra curva: aquecimento linear por alguns milhares de passos e depois decaimento em cosseno até cerca de 10% do pico. Outros cuidados comuns são cortar a norma do gradiente em 1,0, para um lote ruim não estragar os pesos, e treinar em bfloat16, que usa metade da memória do float32.",
      ],
      keyIdea: "Aquecer evita passos grandes enquanto o modelo ainda é instável; decair permite ajustes finos no fim do treino.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          { id: "schedule", piece: "chart", kind: "line", series: scheduleSteps.map((step) => ({ label: `${step / 1000}k`, value: schedule(step) * 1000 })), highlight: scheduleSteps.indexOf(WARMUP), color: "module-03" },
        ],
      },
      alt: `Taxa de aprendizado do Transformer original, em milésimos, a cada 2 mil passos: ${scheduleSteps.map((step) => `${step / 1000}k ${fixed(schedule(step) * 1000)}`).join(", ")}. O pico é no passo ${integer(WARMUP)}.`,
    },
    {
      id: "compute",
      shortTitle: "Custo",
      title: "Quanto cálculo um treino consome",
      tag: "example",
      body: [
        "Uma estimativa útil: treinar custa cerca de 6 operações de ponto flutuante por parâmetro e por token, 2 na passada para a frente e 4 na volta do gradiente. Com N parâmetros e D tokens de treino, o custo é cerca de 6 · N · D.",
        `O GPT-3, com 175 bilhões de parâmetros e 300 bilhões de tokens, dá ${scientific(flops(gpt3))} operações, praticamente o valor que o próprio paper reporta (3,14 × 10²³). O Chinchilla, com 70 bilhões e 1,4 trilhão de tokens, ${scientific(flops(chinchilla))}. O Llama 2 7B, com 2 trilhões de tokens, ${scientific(flops(llama2))}. Para comparar: o Transformer base de 2017 treinou em 12 horas, em 8 GPUs.`,
      ],
      keyIdea: "Custo de treino ≈ 6 · parâmetros · tokens. Dobrar o modelo ou o texto dobra a conta.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "metrics",
            piece: "metrics-panel",
            metrics: runs.map((run) => ({ id: run.id, label: run.label, value: scientific(flops(run)) })),
            highlight: "gpt3",
          },
        ],
      },
      alt: `Custo de treino estimado por 6 · N · D: ${runs.map((run) => `${run.label} ${scientific(flops(run))} operações`).join("; ")}.`,
    },
    {
      id: "chinchilla",
      shortTitle: "Chinchilla",
      title: "Quantos tokens para cada parâmetro",
      tag: "tradeoff",
      body: [
        `Com um orçamento fixo de cálculo, vale mais um modelo maior com menos texto ou um menor com mais texto? O estudo do Chinchilla (2022) mediu isso e achou que, para o melhor resultado por orçamento de treino, parâmetros e tokens devem crescer juntos: cerca de ${TOKENS_PER_PARAM} tokens por parâmetro. O Chinchilla, com 70 bilhões de parâmetros e 1,4 trilhão de tokens, superou o Gopher, de 280 bilhões, com o mesmo cálculo.`,
        `A regra minimiza o custo de treino, não o de uso. Um modelo menor é mais barato para servir, então pode valer treiná-lo muito além do ponto ótimo. O Llama 2 7B viu 2 trilhões de tokens, ${integer(llama2.tokens / llama2.params)} por parâmetro, mais de ${Math.floor(llama2.tokens / llama2.params / TOKENS_PER_PARAM)} vezes a regra. O treino fica mais caro, e cada resposta depois fica mais barata.`,
      ],
      keyIdea: "O ótimo de treino é cerca de 20 tokens por parâmetro. Modelos feitos para servir muito são treinados bem além disso.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          { id: "tokens", piece: "chart", kind: "bar", series: sizes.map((n) => ({ label: `${billions(n)}B`, value: (TOKENS_PER_PARAM * n) / 1e9 })), highlight: sizes.length - 1, color: "module-03" },
        ],
      },
      alt: `Tokens de treino ótimos pela regra de Chinchilla, em bilhões: ${sizes.map((n) => `${billions(n)}B parâmetros → ${integer((TOKENS_PER_PARAM * n) / 1e9)} bilhões de tokens`).join("; ")}.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Treinar um Transformer em uma linha",
      tag: "summary",
      body: [
        "Cada posição prevê o token seguinte; a cross-entropy mede −log p do token certo; o gradiente p − y volta por todos os blocos; o AdamW ajusta os pesos com uma taxa que aquece e decai. O laço se repete sobre trilhões de tokens, com custo de cerca de 6 · N · D.",
        "O resultado é um modelo pré-treinado, que sabe continuar texto. Transformá-lo num assistente exige etapas seguintes, como fine-tuning supervisionado e aprendizado por preferência, vistas nos módulos 04 e 11. A última aula do módulo mostra onde encontrar modelos já treinados.",
      ],
      keyIdea: "Pré-treino é previsão do próximo token, cross-entropy e descida de gradiente, em escala enorme.",
      scene: { kind: "pieces", layout: "single", pieces: [loop("update", ["batch", "forward", "loss", "backward"])] },
      alt: "Laço de treino com lote, passada, perda e gradiente concluídos e o passo do AdamW em andamento, antes de voltar para o próximo lote.",
    },
  ],
  realWorldExample: `Num treino de verdade, o painel que a equipe acompanha é a curva da perda de validação. Ela começa perto de ln(vocabulário), ${fixed(initialLoss)} para o vocabulário do GPT-2, cai rápido nos primeiros milhares de passos e depois desce devagar por semanas. Picos repentinos na perda são um sinal clássico de instabilidade: as respostas comuns são voltar a um checkpoint anterior, pular o lote problemático ou reduzir a taxa de aprendizado. O relatório do Llama 2 descreve essa receita: AdamW com β₂ = 0,95, aquecimento de 2.000 passos, decaimento em cosseno até 10% do pico, decaimento de peso de 0,1 e corte de gradiente em 1,0.`,
  code: {
    language: "python",
    caption:
      "O laço de treino de um modelo de linguagem em PyTorch, com um modelo mínimo no lugar do Transformer: alvos deslocados, cross-entropy, gradiente, corte de norma e um passo do AdamW.",
    source: `import math
import torch
import torch.nn.functional as F

vocab, d_model, n_ctx = 1000, 128, 64
model = torch.nn.Sequential(        # no lugar de um Transformer, só para mostrar o laço
    torch.nn.Embedding(vocab, d_model),
    torch.nn.Linear(d_model, vocab),
)
opt = torch.optim.AdamW(model.parameters(), lr=3e-4, betas=(0.9, 0.95), weight_decay=0.1)

tokens = torch.randint(0, vocab, (8, n_ctx + 1))   # 8 textos de 65 tokens
inputs, targets = tokens[:, :-1], tokens[:, 1:]     # o alvo é o token seguinte

logits = model(inputs)                              # (8, 64, vocab)
loss = F.cross_entropy(logits.reshape(-1, vocab), targets.reshape(-1))
print(round(loss.item(), 2), round(math.log(vocab), 2))
# perto de ln(1000) ≈ 6.91: no início, o modelo chuta quase uniforme

loss.backward()                                     # gradiente de todos os pesos
torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
opt.step()                                          # um passo do AdamW
opt.zero_grad()`,
  },
  tradeOffs: {
    pros: [
      "Não exige rótulos: qualquer texto vira exemplos de treino, um por posição",
      "Todas as posições treinam em paralelo, numa única passada por lote",
      "O custo é previsível (cerca de 6 · N · D), o que permite planejar o treino antes de começar",
    ],
    cons: [
      "Exige trilhões de tokens e semanas de GPUs para modelos grandes",
      "Picos de perda e divergências podem desperdiçar dias de treino",
      "O objetivo é continuar texto, não seguir instruções: o modelo pré-treinado ainda precisa de ajuste",
    ],
    alternatives: [
      "Partir de um modelo pré-treinado e fazer só fine-tuning (módulo 11)",
      "Destilação: treinar um modelo menor para imitar as distribuições de um maior",
    ],
  },
  knowledgeCheck: [
    {
      id: "loss-value",
      prompt: "O modelo dá probabilidade 0,5 ao token certo. Qual é a cross-entropy dessa posição?",
      options: ["0,5", "−log 0,5 ≈ 0,69", "1", "e^0,5"],
      correct: 1,
      explanation: "A cross-entropy é −log p do token certo: −ln 0,5 ≈ 0,69. Com p = 1, seria 0; quanto menor p, maior a perda.",
      lesson: "03-14",
    },
    {
      id: "perplexity",
      prompt: "Um modelo que chuta de forma uniforme entre 50.257 tokens tem que perplexidade?",
      options: ["1", "ln 50.257 ≈ 10,8", "50.257", "0"],
      correct: 2,
      explanation:
        "A perda é ln 50.257 ≈ 10,8 e a perplexidade é e^perda = 50.257: o modelo hesita entre o vocabulário inteiro.",
      lesson: "03-14",
    },
    {
      id: "chinchilla",
      prompt: "Pela regra de Chinchilla, quantos tokens de treino são o ótimo para um modelo de 7 bilhões de parâmetros?",
      options: ["7 bilhões", "Cerca de 140 bilhões", "Cerca de 2 trilhões", "Cerca de 20 milhões"],
      correct: 1,
      explanation:
        "Cerca de 20 tokens por parâmetro: 20 × 7 bilhões = 140 bilhões. O Llama 2 7B foi treinado com 2 trilhões, muito além, para ficar melhor sem aumentar o custo de uso.",
      lesson: "03-14",
    },
  ],
  related: ["01-12", "02-06", "02-07", "03-13", "04-11", "11-02"],
  references: [
    {
      title: "Vaswani et al. (2017), Attention Is All You Need",
      url: "https://arxiv.org/abs/1706.03762",
      kind: "paper",
    },
    {
      title: "Loshchilov e Hutter (2017), Decoupled Weight Decay Regularization",
      url: "https://arxiv.org/abs/1711.05101",
      kind: "paper",
    },
    {
      title: "Kaplan et al. (2020), Scaling Laws for Neural Language Models",
      url: "https://arxiv.org/abs/2001.08361",
      kind: "paper",
    },
    {
      title: "Hoffmann et al. (2022), Training Compute-Optimal Large Language Models",
      url: "https://arxiv.org/abs/2203.15556",
      kind: "paper",
    },
    {
      title: "Touvron et al. (2023), Llama 2: Open Foundation and Fine-Tuned Chat Models",
      url: "https://arxiv.org/abs/2307.09288",
      kind: "paper",
    },
    {
      title: "PyTorch: torch.nn.functional.cross_entropy",
      url: "https://pytorch.org/docs/stable/generated/torch.nn.functional.cross_entropy.html",
      kind: "docs",
    },
  ],
};

export default lesson;
