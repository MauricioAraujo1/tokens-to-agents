import type { BlockDiagramSpec } from "../../../scene/types";
import type { LessonContent } from "../../../types/content";

// Uma RNN com estado de um número só: h_t = tanh(w_x · x_t + w_h · h_(t−1)), lendo duas frases palavra
// por palavra. O valor de cada palavra é escrito à mão (positivo = elogio, negativo = negação); os estados,
// a comparação entre as frases e o quanto a influência de uma palavra encolhe com a distância saem daqui.

const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits }).replace("-", "−");
const percent = (value: number) => `${Math.round(value * 100)}%`;

const W_X = 1;
const W_H = 0.8;
const WORDS: Record<string, number> = { o: 0, filme: 0.1, não: -1.2, foi: 0, bom: 1 };

const run = (tokens: string[]) => {
  const states: number[] = [];
  let h = 0;
  for (const token of tokens) {
    h = Math.tanh(W_X * WORDS[token] + W_H * h);
    states.push(h);
  }
  return states;
};

const positive = ["o", "filme", "foi", "bom"];
const negated = ["o", "filme", "não", "foi", "bom"];
const positiveStates = run(positive);
const negatedStates = run(negated);
const positiveFinal = positiveStates[positiveStates.length - 1];
const negatedFinal = negatedStates[negatedStates.length - 1];
const NAO = negated.indexOf("não");

// Quanto o estado final depende de um estado anterior: ∂h_T/∂h_k = Π w_h · (1 − h_t²), de k + 1 até T.
const influence = (states: number[], from: number) =>
  states.slice(from + 1).reduce((product, h) => product * W_H * (1 - h * h), 1);
const naoInfluence = influence(negatedStates, NAO);
const firstInfluence = influence(negatedStates, 0);
// Como |tanh'| ≤ 1, a influência de um estado a d passos de distância é no máximo w_h^d.
const DISTANCES = [1, 2, 3, 4, 5, 6, 7, 8];
const bound = DISTANCES.map((distance) => W_H ** distance);
const boundAtEight = bound[bound.length - 1];

const reader = (active: string, done?: string[]): BlockDiagramSpec => ({
  id: "reader",
  piece: "block-diagram",
  blocks: [
    { id: "words", kind: "tokens", label: "uma palavra", col: 0, row: 0 },
    { id: "cell", kind: "llm", label: "célula rnn", col: 1, row: 0 },
    { id: "state", kind: "memory", label: "estado h", col: 2, row: 1 },
    { id: "answer", kind: "answer", label: "sentimento", col: 3, row: 0 },
  ],
  edges: [
    { from: "words", to: "cell", label: "x_t" },
    { from: "state", to: "cell", label: "h anterior" },
    { from: "cell", to: "answer", label: "h final" },
  ],
  active,
  ...(done ? { done } : {}),
});

const lesson: LessonContent = {
  id: "02-09",
  subtitle: "Uma rede que lê uma palavra por vez e carrega um resumo do que já leu. Como ela funciona, por que esquece e o que veio depois dela.",
  objectives: [
    "Calcular o estado oculto de uma RNN ao longo de uma frase",
    "Desenrolar a RNN no tempo e ver o compartilhamento de pesos",
    "Explicar por que a influência de palavras distantes some",
    "Comparar RNN, LSTM e Transformer",
  ],
  steps: [
    {
      id: "reading",
      shortTitle: "Ler em ordem",
      title: "Ler uma frase carregando um resumo",
      tag: "context",
      body: [
        "Quando você lê “o filme não foi bom”, não guarda cada palavra separada: carrega um resumo que muda a cada palavra. Ao chegar em “bom”, você ainda lembra do “não”. Uma [[RNN|rnn]] faz isso: lê um token por vez e mantém um [[estado oculto|hidden-state]] h, um vetor que resume tudo o que já viu.",
        "A conta de cada passo é h_t = tanh(W_x · x_t + W_h · h_(t−1) + b): mistura a palavra nova com o estado anterior. Os mesmos W_x e W_h servem para todas as posições, do mesmo jeito que uma CNN reusa o kernel em todos os pixels. Aqui, o compartilhamento é no tempo.",
      ],
      keyIdea: "RNN: um estado que é atualizado a cada token, com os mesmos pesos em todas as posições.",
      scene: { kind: "pieces", layout: "single", pieces: [reader("cell")] },
      alt: "Uma palavra por vez entra na célula RNN, em destaque, junto com o estado anterior; no fim, o estado final vira o sentimento da frase.",
    },
    {
      id: "unroll",
      shortTitle: "Desenrolar",
      title: "A mesma célula, repetida no tempo",
      tag: "mechanism",
      body: [
        `Para entender a RNN, desenhe uma cópia da célula por palavra: é desenrolar no tempo. Cada estado h_t recebe a palavra x_t e o estado anterior h_(t−1). A frase “${negated.join(" ")}” vira uma cadeia de ${negated.length} passos, de h0 = 0 até h${negated.length}.`,
        "Desenrolada, a RNN é uma rede profunda comum, com uma camada por palavra e os mesmos pesos em todas. O treino aplica o backprop nessa cadeia, do último estado até o primeiro: é o [[backpropagation through time|backpropagation-through-time]]. A cadeia também mostra o problema: tudo acontece em fila, um passo depois do outro.",
      ],
      keyIdea: "Desenrolada no tempo, uma RNN é uma rede com uma camada por token e pesos compartilhados.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "unrolled",
            piece: "graph",
            nodes: [
              { id: "h0", label: "h0", x: 0, y: 0.15 },
              ...negated.map((_, index) => ({ id: `h${index + 1}`, label: `h${index + 1}`, x: (index + 1) / negated.length, y: 0.15, color: "module-02" as const })),
              ...negated.map((_, index) => ({ id: `x${index + 1}`, label: `x${index + 1}`, x: (index + 1) / negated.length, y: 0.95 })),
            ],
            edges: [
              ...negated.map((_, index) => ({ from: `h${index}`, to: `h${index + 1}`, label: "W_h", weight: 0.6 })),
              ...negated.map((token, index) => ({ from: `x${index + 1}`, to: `h${index + 1}`, label: token, weight: 0.3 })),
            ],
            path: ["h0", ...negated.map((_, index) => `h${index + 1}`)],
            highlight: [`h${negated.length}`],
          },
        ],
      },
      alt: `A RNN desenrolada: uma cadeia de estados de h0 a h${negated.length}, ligados pelo mesmo peso W_h, e cada palavra da frase entrando no seu estado; o último estado está em destaque.`,
    },
    {
      id: "numbers",
      shortTitle: "A conta",
      title: "O “não” fica no estado",
      tag: "example",
      body: [
        `Com estado de um número só, w_x = ${fixed(W_X, 0)} e w_h = ${fixed(W_H, 1)}, cada palavra tem um valor: “bom” vale ${fixed(WORDS.bom, 1)} e “não” vale ${fixed(WORDS["não"], 1)}. Na frase “${positive.join(" ")}”, o estado termina em ${fixed(positiveFinal)}. As barras mostram os estados da frase com “não”, de −1 (vazia) a 1 (cheia).`,
        `Depois do “não”, o estado cai para ${fixed(negatedStates[NAO])} e continua negativo em “foi”. Quando “bom” chega, ele soma ${fixed(WORDS.bom, 1)} a um estado que veio negativo, e o final fica em ${fixed(negatedFinal)}: ${percent(negatedFinal / positiveFinal)} do elogio sem negação. A memória do “não” mudou o significado de “bom”.`,
      ],
      keyIdea: "O estado carrega o contexto: a mesma palavra muda de efeito dependendo do que veio antes.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "states",
            piece: "token-stream",
            tokens: negated,
            bars: negatedStates.map((h) => (h + 1) / 2),
            arcs: negated.slice(1).map((_, index) => ({ from: index, to: index + 1, weight: 0.5, label: fixed(negatedStates[index]) })),
            color: "module-02",
          },
          {
            id: "finals",
            piece: "metrics-panel",
            metrics: [
              { id: "positive", label: "h final: foi bom", value: fixed(positiveFinal), color: "success" },
              { id: "negated", label: "h final: não foi bom", value: fixed(negatedFinal), color: "danger" },
            ],
            highlight: "negated",
          },
        ],
      },
      alt: `Os tokens de “${negated.join(" ")}” com barras do estado oculto depois de cada um; o estado cai no “não” e termina em ${fixed(negatedFinal)}, contra ${fixed(positiveFinal)} na frase sem negação.`,
    },
    {
      id: "forgetting",
      shortTitle: "Esquecer",
      title: "Por que a RNN esquece o começo",
      tag: "mechanism",
      body: [
        `Quanto o estado final depende de um estado antigo? Pela regra da cadeia, ∂h_T/∂h_k é o produto de w_h · (1 − h_t²) em cada passo do caminho. Na frase da aula, a influência do estado logo depois do “não” sobre o final é ${fixed(naoInfluence)}, e a do estado depois de “o”, ${fixed(firstInfluence)}.`,
        `Como a derivada da tanh nunca passa de 1, a influência a d passos de distância é no máximo ${fixed(W_H, 1)}^d: o gráfico mostra esse teto, que chega a ${percent(boundAtEight)} em 8 passos. Na prática fica bem abaixo. É o [[vanishing gradient|vanishing-gradient]] no tempo: a RNN aprende mal relações entre palavras distantes. Com w_h maior que 1, o problema inverte e o gradiente explode.`,
      ],
      keyIdea: "Cada passo multiplica a influência por um fator menor que 1, e a memória longa se apaga.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "bound",
            piece: "chart",
            kind: "line",
            series: DISTANCES.map((distance, index) => ({ label: String(distance), value: Number(bound[index].toFixed(3)) })),
            max: 1,
            highlight: DISTANCES.length - 1,
            color: "module-02",
          },
        ],
      },
      alt: `Curva do teto da influência de um estado sobre outro a 1 até 8 passos de distância: cai de ${percent(bound[0])} para ${percent(boundAtEight)}.`,
    },
    {
      id: "successors",
      shortTitle: "LSTM, Transformer",
      title: "LSTM, GRU e o que veio depois",
      tag: "tradeoff",
      body: [
        "A [[LSTM|lstm]] ataca o esquecimento com uma segunda memória, a célula c, atualizada por soma: c_t = f · c_(t−1) + i · g. Portões aprendidos decidem o que esquecer (f), o que escrever (i) e o que mostrar. Quando f fica perto de 1, o gradiente atravessa muitos passos quase sem encolher. A [[GRU|gru]] faz o mesmo com dois portões e menos parâmetros.",
        "Mesmo assim, as duas leem em fila: o token 100 espera os 99 anteriores, o que desperdiça GPUs no treino. O Transformer troca a fila por attention, que olha todos os tokens ao mesmo tempo. O preço é que o custo cresce com o quadrado do comprimento, enquanto a RNN gasta o mesmo por token e guarda só o estado.",
      ],
      keyIdea: "LSTM e GRU lembram por mais tempo; o Transformer abandona a fila e treina em paralelo.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "versus",
            piece: "block-diagram",
            blocks: [
              { id: "sentence", kind: "tokens", label: "frase inteira", col: 0, row: 0.5 },
              { id: "lstm", kind: "queue", label: "lstm: em fila", col: 1, row: 0 },
              { id: "transformer", kind: "llm", label: "transformer", col: 1, row: 1 },
              { id: "out", kind: "answer", label: "representação", col: 2, row: 0.5 },
            ],
            edges: [
              { from: "sentence", to: "lstm", label: "1 token por vez", variant: "alternative" },
              { from: "lstm", to: "out" },
              { from: "sentence", to: "transformer", label: "todos juntos" },
              { from: "transformer", to: "out" },
            ],
            active: "transformer",
          },
        ],
      },
      alt: "A mesma frase pode entrar numa LSTM, um token por vez, em fila, ou num Transformer, todos os tokens juntos, em destaque; os dois produzem uma representação.",
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Memória em fila",
      tag: "summary",
      body: [
        "Uma RNN lê a sequência em ordem e carrega um estado que resume o passado, com os mesmos pesos em todas as posições. Ela é barata por token, mas esquece o que ficou longe e não paraleliza o treino ao longo da sequência.",
        "Esse limite de paralelismo é central para a próxima aula: GPUs são máquinas de fazer muitas contas ao mesmo tempo, e as arquiteturas que venceram são as que dão a elas trabalho em paralelo.",
      ],
      keyIdea: "RNN = estado + pesos compartilhados no tempo; o ponto fraco é a fila.",
      scene: { kind: "pieces", layout: "single", pieces: [reader("answer", ["words", "cell", "state"])] },
      alt: "As palavras passaram pela célula RNN e pelo estado; o sentimento final está em destaque.",
    },
  ],
  realWorldExample:
    "Em 2016, o Google Tradutor trocou o sistema por frases pelo GNMT, uma rede de tradução com 8 camadas de LSTM no encoder e 8 no decoder, descrita no paper de Wu et al. No ano seguinte, o Transformer foi apresentado justamente como alternativa às redes recorrentes em tradução.",
  code: {
    language: "python",
    source: `import torch
from torch import nn

rnn = nn.RNN(input_size=1, hidden_size=1, bias=False, batch_first=True)
with torch.no_grad():
    rnn.weight_ih_l0.fill_(1.0)   # w_x
    rnn.weight_hh_l0.fill_(0.8)   # w_h

# o, filme, não, foi, bom
x = torch.tensor([[0.0, 0.1, -1.2, 0.0, 1.0]]).unsqueeze(-1)
states, h_final = rnn(x)
print(states.squeeze())           # o estado depois de cada palavra`,
    caption: "A RNN da aula em PyTorch, com a tanh padrão: os estados batem com as barras da cena.",
  },
  tradeOffs: {
    pros: [
      "Custo e memória constantes por token: só o estado é guardado",
      "Lida com sequências de qualquer comprimento com os mesmos pesos",
      "Boa para streaming, em que os dados chegam um por vez",
    ],
    cons: [
      "Esquece dependências distantes por causa do vanishing gradient",
      "Treino em fila: não paraleliza ao longo da sequência",
      "Gradientes podem explodir e exigem corte (gradient clipping)",
    ],
    alternatives: ["LSTM e GRU para memória mais longa", "Transformer com attention para treino paralelo"],
  },
  knowledgeCheck: [
    {
      id: "same-weights",
      prompt: "Uma RNN lê uma frase de 50 tokens. Quantos conjuntos diferentes de pesos W_x e W_h ela usa?",
      options: ["50, um por token", "1, compartilhado por todas as posições", "2, um para o começo e outro para o fim", "Depende do vocabulário"],
      correct: 1,
      explanation: "A mesma célula é aplicada em todas as posições. Desenrolada, parecem 50 camadas, mas todas usam os mesmos pesos.",
      lesson: "02-09",
    },
    {
      id: "long-dependency",
      prompt: "Um modelo precisa ligar o sujeito do começo de um parágrafo ao verbo 80 tokens depois. Por que uma RNN simples sofre aqui?",
      options: [
        "Porque ela não aceita mais de 50 tokens",
        "Porque a influência de um estado é multiplicada por um fator menor que 1 a cada passo e quase some em 80 passos",
        "Porque ela lê o texto de trás para a frente",
        "Porque ela não tem pesos",
      ],
      correct: 1,
      explanation: "Pela regra da cadeia, o gradiente entre estados distantes é um produto de muitos fatores pequenos. LSTM, GRU e attention foram criados para contornar isso.",
      lesson: "02-09",
    },
  ],
  related: ["02-08", "02-10", "03-01"],
  references: [
    { title: "Understanding LSTM Networks (Christopher Olah)", url: "https://colah.github.io/posts/2015-08-Understanding-LSTMs/", kind: "article" },
    { title: "The Unreasonable Effectiveness of Recurrent Neural Networks (Andrej Karpathy)", url: "https://karpathy.github.io/2015/05/21/rnn-effectiveness/", kind: "article" },
    { title: "Google's Neural Machine Translation System (Wu et al.)", url: "https://arxiv.org/abs/1609.08144", kind: "paper" },
  ],
};

export default lesson;
