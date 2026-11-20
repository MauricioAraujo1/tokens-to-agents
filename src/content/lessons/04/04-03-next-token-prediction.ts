import { softmax } from "../../../lab/attention";
import type { LessonContent } from "../../../types/content";

// Previsão do próximo token, com contas reais: logits escritos à mão viram probabilidades pelo softmax,
// a perda de cada previsão é −ln p(alvo) e a perplexidade é e elevado à perda média. Os logits e as
// probabilidades do modelo de brinquedo são inventados para o exemplo; as contas, não.

const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const percent = (value: number) => `${Math.round(value * 100)}%`;
const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");

const VOCAB_GPT2 = 50_257;
const prompt = ["A", "capital", "da", "França", "é"];

// Passos 2 e 3: logits do último token para 6 candidatos (num modelo real, para o vocabulário inteiro).
const candidates = ["Paris", "uma", "a", "Lyon", "linda", "Roma"];
const logits = [6.2, 3.4, 3.1, 2.6, 2.2, 1.5];
const probabilities = softmax(logits);
const TARGET = 0;
const targetLoss = -Math.log(probabilities[TARGET]);
const probabilitySum = probabilities.reduce((sum, value) => sum + value, 0);
/** Diferença de logit vira razão de probabilidade: e^(Δ logit). */
const ratioParisUma = Math.exp(logits[0] - logits[1]);

// Passo 4: um texto vira n − 1 pares (contexto, alvo).
const sentence = ["A", "capital", "da", "França", "é", "Paris", "."];
const pairs = sentence.slice(1).map((target, index) => ({ context: sentence.slice(0, index + 1), target }));

// Passo 5: três contextos que exigem tipos diferentes de conhecimento.
const probes = [
  { label: "2 + 2 =", answer: "4", logits: [5.5, 2.5, 2, 1.5] },
  { label: "Ela abriu o guarda-", answer: "chuva", logits: [6, 3.5, 1.5, 1] },
  { label: "O autor de Dom Casmurro é", answer: "Machado", logits: [4, 3.2, 2.8, 2.2] },
];
const probeColumns = ["resposta certa", "2ª opção", "3ª opção", "4ª opção"];
const probeRows = probes.map((probe) => softmax(probe.logits));

// Passo 7: probabilidade que o modelo de brinquedo dá a cada alvo da frase, e a perplexidade.
const targetProbabilities = [0.04, 0.35, 0.6, 0.8, 0.9, 0.95];
const losses = targetProbabilities.map((p) => -Math.log(p));
const meanLoss = losses.reduce((sum, value) => sum + value, 0) / losses.length;
const perplexity = Math.exp(meanLoss);
const hardest = targetProbabilities.indexOf(Math.min(...targetProbabilities));

const lesson: LessonContent = {
  id: "04-03",
  subtitle: "O único objetivo do pré-treino de um LLM: dar a maior probabilidade possível ao token que vem de verdade em seguida.",
  objectives: [
    "Transformar logits em probabilidades com softmax e ler o resultado",
    "Montar os pares de contexto e alvo que um texto gera no treino",
    "Calcular a perda −log p e a perplexidade de uma frase",
    "Explicar por que prever bem obriga o modelo a aprender fatos e regras",
  ],
  steps: [
    {
      id: "fill-blank",
      shortTitle: "Lacuna",
      title: "Uma prova de completar com 50 mil alternativas",
      tag: "context",
      body: [
        `Complete: “${prompt.join(" ")} ___”. Você pensa em “Paris” na hora. A [[previsão do próximo token|next-token-prediction]] é essa prova, feita bilhões de vezes: dado o texto até aqui, qual token vem agora?`,
        `Para o modelo, as alternativas são todos os tokens do vocabulário: ${integer(VOCAB_GPT2)} no GPT-2. Ele não escreve a resposta; ele dá uma nota para cada alternativa. A cena marca o último token, “${prompt[prompt.length - 1]}”, porque é na posição dele que sai a previsão.`,
      ],
      keyIdea: "Prever o próximo token é responder uma questão de múltipla escolha do tamanho do vocabulário.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "metrics",
            piece: "metrics-panel",
            metrics: [
              { id: "vocab", label: "alternativas (GPT-2)", value: integer(VOCAB_GPT2) },
              { id: "context", label: "tokens de contexto", value: String(prompt.length) },
              { id: "answer", label: "respostas por passo", value: "1 token" },
            ],
            highlight: "vocab",
          },
          { id: "prompt", piece: "token-stream", tokens: [...prompt, "___"], query: prompt.length - 1, color: "module-04" },
        ],
      },
      alt: `A frase “${prompt.join(" ")} ___” com o último token em destaque e o painel: ${integer(VOCAB_GPT2)} alternativas no vocabulário do GPT-2.`,
    },
    {
      id: "logits",
      shortTitle: "Logits",
      title: "Primeiro, uma nota bruta para cada token",
      tag: "mechanism",
      body: [
        "O vetor final da última posição é multiplicado por uma matriz com uma linha por token do vocabulário. Cada produto é um [[logit|logit]]: uma nota sem escala fixa. Quanto maior, mais o modelo aposta naquele token.",
        `Na cena, “Paris” leva ${fixed(logits[0], 1)}, “uma” ${fixed(logits[1], 1)} e “Roma” ${fixed(logits[5], 1)}. Os números sozinhos não são probabilidades: não somam 1 e poderiam até ser negativos. O que importa é a diferença entre eles.`,
      ],
      keyIdea: "Logits são as notas brutas do modelo; só as diferenças entre eles têm significado.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "dist",
            piece: "chart",
            kind: "bar",
            series: candidates.map((label, index) => ({ label, value: logits[index] })),
            highlight: TARGET,
            color: "module-04",
          },
        ],
      },
      alt: `Logits do próximo token: ${candidates.map((label, index) => `${label} ${fixed(logits[index], 1)}`).join(", ")}.`,
    },
    {
      id: "softmax",
      shortTitle: "Softmax",
      title: "Depois, o softmax transforma notas em probabilidades",
      tag: "mechanism",
      body: [
        `O [[softmax|softmax]] calcula e elevado a cada logit e divide pela soma. Uma diferença de ${fixed(logits[0] - logits[1], 1)} entre os logits de “Paris” e “uma” vira uma razão de e^${fixed(logits[0] - logits[1], 1)} ≈ ${fixed(ratioParisUma, 1)} entre as probabilidades. Por isso a barra de “Paris” agora domina: ${percent(probabilities[0])}.`,
        `As seis probabilidades somam ${fixed(probabilitySum)}. Se “Paris” for mesmo o próximo token, a perda dessa previsão é −ln(${fixed(probabilities[TARGET])}) = ${fixed(targetLoss)}. É a [[cross-entropy|cross-entropy]]: zero se o modelo der 100% ao token certo, e cada vez maior conforme ele dá menos.`,
      ],
      keyIdea: "Softmax exagera as diferenças: alguns pontos a mais de logit viram muitas vezes mais probabilidade.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "metrics",
            piece: "metrics-panel",
            metrics: [
              { id: "p", label: "P(Paris)", value: percent(probabilities[TARGET]), color: "module-04" },
              { id: "sum", label: "soma", value: fixed(probabilitySum) },
              { id: "loss", label: "perda −ln p", value: fixed(targetLoss) },
            ],
            highlight: "p",
          },
          {
            id: "dist",
            piece: "chart",
            kind: "bar",
            series: candidates.map((label, index) => ({ label, value: Number(probabilities[index].toFixed(3)) })),
            max: 1,
            highlight: TARGET,
            color: "module-04",
          },
        ],
      },
      alt: `Probabilidades depois do softmax: ${candidates.map((label, index) => `${label} ${percent(probabilities[index])}`).join(", ")}. A perda para Paris é ${fixed(targetLoss)}.`,
    },
    {
      id: "self-supervised",
      shortTitle: "Gabarito",
      title: "Todo texto já traz o gabarito",
      tag: "mechanism",
      body: [
        `Ninguém precisa marcar a resposta certa: ela é o próprio texto. A frase “${sentence.join(" ")}” vira ${pairs.length} questões, uma por posição. O contexto “A” tem alvo “capital”; o contexto “A capital” tem alvo “da”; e assim até o ponto final.`,
        "Por isso o treino é chamado de autossupervisionado: qualquer texto da internet, de livros ou de código vira dado de treino. Com a [[máscara causal|causal-mask]], todas as posições são calculadas numa única passada, e a perda do lote é a média das perdas de todas elas.",
      ],
      keyIdea: "Um texto de n tokens dá n − 1 previsões com gabarito, sem nenhuma anotação humana.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "pairs",
            piece: "token-stream",
            tokens: sentence,
            arcs: pairs.map((_, index) => ({ from: index, to: index + 1, weight: 0.6 })),
            color: "module-04",
          },
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "data", kind: "documents", label: "texto", col: 0, row: 0 },
              { id: "tokens", kind: "tokens", label: `${pairs.length} pares`, col: 1, row: 0 },
              { id: "llm", kind: "llm", label: "llm", col: 2, row: 0 },
              { id: "loss", kind: "eval", label: "perda −log p", col: 3, row: 0 },
            ],
            edges: [
              { from: "data", to: "tokens", label: "desloca 1" },
              { from: "tokens", to: "llm", label: "contextos" },
              { from: "llm", to: "loss", label: "previsões" },
            ],
            active: "loss",
            done: ["data", "tokens", "llm"],
          },
        ],
      },
      alt: `A frase “${sentence.join(" ")}” com setas de cada token para o seguinte: ${pairs.length} pares de contexto e alvo. Abaixo, o texto vira pares, o LLM prevê e a perda −log p é calculada.`,
    },
    {
      id: "knowledge",
      shortTitle: "Saber",
      title: "Para prever bem, é preciso saber coisas",
      tag: "example",
      body: [
        `Cada linha da cena é um contexto diferente. Para dar ${percent(probeRows[0][0])} a “${probes[0].answer}” depois de “${probes[0].label}”, o modelo precisa de aritmética. Para completar “${probes[1].label}” com “${probes[1].answer}” (${percent(probeRows[1][0])}), precisa de vocabulário. Para “${probes[2].answer}” depois de “${probes[2].label}”, precisa de um fato.`,
        `A terceira linha é a mais espalhada: “${probes[2].answer}” fica com só ${percent(probeRows[2][0])}. Fatos raros aparecem pouco no treino e deixam a distribuição incerta. A perda média sobre trilhões de tokens só cai se o modelo internalizar gramática, fatos e raciocínio simples: é por isso que um objetivo tão simples produz tanta capacidade.`,
      ],
      keyIdea: "A previsão do próximo token esconde muitas tarefas: gramática, fatos, contas e estilo, todas cobradas pela mesma perda.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "probes",
            piece: "matrix",
            rows: probes.map((probe) => probe.label),
            cols: probeColumns,
            values: probeRows.map((row) => row.map((value) => Number(value.toFixed(2)))),
            scale: { min: 0, max: 1 },
            highlight: { row: 2, col: 0 },
            showValues: true,
            color: "module-04",
          },
        ],
      },
      alt: `Matriz de probabilidades para três contextos: ${probes.map((probe, index) => `${probe.label} ${probe.answer} com ${percent(probeRows[index][0])}`).join("; ")}. O fato literário é o mais incerto.`,
    },
    {
      id: "plausible",
      shortTitle: "Provável",
      title: "Provável não é o mesmo que verdadeiro",
      tag: "tradeoff",
      body: [
        "O objetivo recompensa o token que costuma vir depois no texto de treino. Quando o texto de treino está certo e o fato aparece bastante, provável e verdadeiro coincidem. Quando o fato é raro, ou o texto de treino repete um erro comum, o modelo aprende o erro com a mesma confiança.",
        "Além disso, o modelo sempre tem que escolher algum token: não existe a alternativa “não sei” no vocabulário, a não ser que ele aprenda a escrevê-la. Essa é a raiz das alucinações, tema da aula 04.10.",
      ],
      keyIdea: "O modelo aprende o que é provável no texto de treino; verdade é uma consequência frequente, não uma garantia.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "data", kind: "documents", label: "texto de treino", col: 0, row: 0.5 },
              { id: "llm", kind: "llm", label: "llm", col: 1, row: 0.5 },
              { id: "answer", kind: "answer", label: "fato frequente", col: 2, row: 0 },
              { id: "wrong", kind: "no-result", label: "fato raro", col: 2, row: 1 },
            ],
            edges: [
              { from: "data", to: "llm", label: "−log p" },
              { from: "llm", to: "answer", label: "provável e certo" },
              { from: "llm", to: "wrong", label: "provável e errado", variant: "alternative" },
            ],
            active: "llm",
          },
        ],
      },
      alt: "O texto de treino ensina o LLM pela perda −log p. Para fatos frequentes, a saída provável é certa; para fatos raros, o caminho tracejado leva a uma saída provável e errada.",
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "A nota do modelo numa frase inteira",
      tag: "summary",
      body: [
        `Somando todas as posições de “${sentence.join(" ")}”, a cena mostra a probabilidade que o modelo deu a cada alvo. O mais difícil é “${sentence[hardest + 1]}” logo no começo (${percent(targetProbabilities[hardest])}), com pouco contexto; o ponto final, com a frase quase pronta, sai com ${percent(targetProbabilities[targetProbabilities.length - 1])}.`,
        `A perda média é ${fixed(meanLoss)}, e a [[perplexidade|perplexity]], e^${fixed(meanLoss)} ≈ ${fixed(perplexity, 1)}: é como se o modelo hesitasse entre ${fixed(perplexity, 1)} tokens a cada passo. Treinar é baixar esse número. A próxima aula mostra onde ficam os números que o treino ajusta: os parâmetros.`,
      ],
      keyIdea: "Logits → softmax → −log p(alvo), em toda posição de todo texto: esse é o pré-treino inteiro.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "metrics",
            piece: "metrics-panel",
            metrics: [
              { id: "loss", label: "perda média", value: fixed(meanLoss) },
              { id: "ppl", label: "perplexidade", value: fixed(perplexity, 1), color: "module-04" },
            ],
            highlight: "ppl",
          },
          {
            id: "pairs",
            piece: "token-stream",
            tokens: sentence,
            bars: [0, ...targetProbabilities],
            query: hardest + 1,
            color: "module-04",
          },
        ],
      },
      alt: `A frase “${sentence.join(" ")}” com a probabilidade dada a cada alvo: ${sentence.slice(1).map((token, index) => `${token} ${percent(targetProbabilities[index])}`).join(", ")}. Perda média ${fixed(meanLoss)} e perplexidade ${fixed(perplexity, 1)}.`,
    },
  ],
  realWorldExample:
    "Os relatórios técnicos de modelos abertos, como o do Llama 2, publicam a curva de perda de treino: a média de −log p sobre os tokens, caindo ao longo de trilhões de tokens. É a mesma conta desta aula, feita em escala. Quando um laboratório compara versões de um modelo no mesmo conjunto de validação, a perda e a perplexidade são os primeiros números que ele olha.",
  code: {
    language: "python",
    source: `import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

tokenizer = AutoTokenizer.from_pretrained("openai-community/gpt2")
model = AutoModelForCausalLM.from_pretrained("openai-community/gpt2")

ids = tokenizer("The capital of France is", return_tensors="pt").input_ids
with torch.no_grad():
    probs = model(ids).logits[0, -1].softmax(-1)
top = probs.topk(5)
for p, i in zip(top.values, top.indices):
    print(repr(tokenizer.decode(i)), round(p.item(), 3))`,
    caption: "Os 5 tokens mais prováveis depois de um prompt, direto dos logits da última posição do GPT-2.",
  },
  tradeOffs: {
    pros: [
      "Qualquer texto vira dado de treino, sem anotação humana",
      "Um único objetivo ensina gramática, fatos, estilo e raciocínio simples",
      "A perda é fácil de medir e comparar entre versões do modelo",
    ],
    cons: [
      "Recompensa o que é frequente, não o que é verdadeiro",
      "Fatos raros ficam com distribuições incertas, terreno de alucinações",
      "Prever texto não ensina a seguir instruções: isso exige etapas de ajuste depois",
    ],
    alternatives: [
      "Masked language modeling, como no BERT, que prevê tokens escondidos olhando os dois lados",
      "Objetivos de preenchimento de trecho (span corruption), como no T5",
    ],
  },
  knowledgeCheck: [
    {
      id: "logit-diff",
      prompt: "Dois candidatos têm logits 5 e 3. Sem olhar os outros, quantas vezes o primeiro é mais provável que o segundo?",
      options: ["5/3 ≈ 1,7 vez", "2 vezes", "e² ≈ 7,4 vezes", "Não dá para saber"],
      correct: 2,
      explanation: "No softmax, p₁ / p₂ = e^(z₁ − z₂). Com diferença 2, a razão é e² ≈ 7,4, qualquer que seja o resto da distribuição.",
      lesson: "04-03",
    },
    {
      id: "pairs-count",
      prompt: "Um documento de treino tem 1.001 tokens. Quantas previsões com gabarito ele gera para o modelo?",
      options: ["1", "1.000", "1.001", "Depende de quantas pessoas o anotaram"],
      correct: 1,
      explanation: "Cada posição prevê a seguinte. Com 1.001 tokens, são 1.000 pares de contexto e alvo, sem anotação humana.",
      lesson: "04-03",
    },
  ],
  related: ["03-14", "04-02", "04-10"],
  references: [
    { title: "Bengio et al. (2003), A Neural Probabilistic Language Model", url: "https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf", kind: "paper" },
    { title: "Jurafsky & Martin, Speech and Language Processing (3rd ed. draft)", url: "https://web.stanford.edu/~jurafsky/slp3/", kind: "article" },
    { title: "Touvron et al. (2023), Llama 2: Open Foundation and Fine-Tuned Chat Models", url: "https://arxiv.org/abs/2307.09288", kind: "paper" },
  ],
};

export default lesson;
