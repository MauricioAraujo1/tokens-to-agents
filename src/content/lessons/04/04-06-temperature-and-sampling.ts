import { samplingDistribution, sampleToken, seededRandom, softmaxWithTemperature } from "../../../lab/sampling";
import type { LessonContent } from "../../../types/content";
import { samplingContent } from "../../playgrounds/sampling";

// Temperatura e amostragem com a mesma distribuição e o mesmo código do playground do Laboratório:
// logits = ln(p), softmax de logits / T, corte top-k e top-p e sorteio com seed. Todo número da cena sai
// das funções de src/lab/sampling.ts.

const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const percent = (value: number) => `${Math.round(value * 100)}%`;

const base = samplingContent.distribution;
const tokens = base.map((entry) => entry.token);
const logits = base.map((entry) => Math.log(entry.probability));
const PROMPT = samplingContent.prompt;

/** Entropia em bits: quantas perguntas de sim ou não, em média, para adivinhar o token sorteado. */
const entropy = (probabilities: number[]) =>
  -probabilities.reduce((total, p) => (p > 0 ? total + p * Math.log2(p) : total), 0);

const COLD = 0.5;
const HOT = 1.5;
const atBase = softmaxWithTemperature(logits, 1);
const atCold = softmaxWithTemperature(logits, COLD);
const atHot = softmaxWithTemperature(logits, HOT);
const series = (probabilities: number[]) =>
  tokens.map((label, index) => ({ label, value: Number(probabilities[index].toFixed(3)) }));

// Top-k e top-p com temperatura 1.
const TOP_P = 0.9;
const TOP_K = 5;
const nucleus = samplingDistribution(base, { temperature: 1, topK: tokens.length, topP: TOP_P });
const nucleusKept = nucleus.filter((row) => row.cut === null);
const topKOnly = samplingDistribution(base, { temperature: 1, topK: TOP_K, topP: 1 });
const topKKept = topKOnly.filter((row) => row.cut === null);
const topKMass = topKKept.reduce((total, row) => total + row.probability, 0);
const hotNucleus = samplingDistribution(base, { temperature: HOT, topK: tokens.length, topP: TOP_P });
const hotNucleusKept = hotNucleus.filter((row) => row.cut === null).length;

// Sorteio com seed: temperatura 1 e top-p 0,9.
const SEED = 42;
const DRAWS = 8;
const random = seededRandom(SEED);
const draws = Array.from({ length: DRAWS }, () => sampleToken(nucleus, random));
const distinctDraws = new Set(draws).size;
const topDraws = draws.filter((token) => token === tokens[0]).length;
const finalOf = (token: string) => nucleus.find((row) => row.token === token)?.final ?? 0;

const lesson: LessonContent = {
  id: "04-06",
  subtitle: "Como a temperatura deixa a distribuição do próximo token mais concentrada ou mais espalhada, e como top-k e top-p cortam a cauda antes do sorteio.",
  objectives: [
    "Calcular o efeito da temperatura sobre as probabilidades do próximo token",
    "Aplicar os cortes top-k e top-p e renormalizar o que sobrou",
    "Explicar por que uma seed torna o sorteio reproduzível",
    "Escolher temperatura e corte conforme a tarefa",
  ],
  steps: [
    {
      id: "same-prompt",
      shortTitle: "Variações",
      title: "Mesma pergunta, respostas diferentes",
      tag: "context",
      body: [
        "Peça duas vezes o mesmo poema a um chat e você recebe dois poemas. O modelo não mudou: os pesos e as probabilidades são os mesmos. O que mudou foi o sorteio. Em vez de pegar sempre o token mais provável, a aplicação sorteia um token de acordo com as probabilidades.",
        "Essa etapa se chama [[amostragem|sampling]] e fica entre os logits e o token escolhido. Ela tem botões: a [[temperatura|temperature]], que achata ou afia a distribuição, e os cortes [[top-k|top-k]] e [[top-p|top-p]], que tiram da disputa os tokens improváveis.",
      ],
      keyIdea: "O modelo calcula as probabilidades; a amostragem decide como escolher entre elas.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "phone", kind: "phone", label: "prompt", col: 0, row: 0.5 },
              { id: "llm", kind: "llm", label: "llm", col: 1, row: 0.5 },
              { id: "sampler", kind: "retrieval", label: "amostragem", col: 2, row: 0.5 },
              { id: "a", kind: "answer", label: "versão 1", col: 3, row: 0 },
              { id: "b", kind: "answer", label: "versão 2", col: 3, row: 1 },
            ],
            edges: [
              { from: "phone", to: "llm" },
              { from: "llm", to: "sampler", label: "probabilidades" },
              { from: "sampler", to: "a", label: "sorteio 1" },
              { from: "sampler", to: "b", label: "sorteio 2" },
            ],
            active: "sampler",
          },
        ],
      },
      alt: "O prompt entra no LLM, que entrega probabilidades à etapa de amostragem, em destaque; dois sorteios produzem duas versões diferentes da resposta.",
    },
    {
      id: "temperature",
      shortTitle: "Temperatura",
      title: "A temperatura divide os logits antes do softmax",
      tag: "mechanism",
      body: [
        `Depois de “${PROMPT}”, o modelo de exemplo dá ${percent(atBase[0])} para “${tokens[0]}”, ${percent(atBase[1])} para “${tokens[1]}” e o resto para a cauda. Essa é a distribuição com temperatura 1: os [[logits|logit]] passam direto pelo [[softmax|softmax]].`,
        `Com temperatura T, a conta vira softmax(logits / T). Dividir por T < 1 aumenta as diferenças entre os logits; dividir por T > 1 diminui. A entropia mede o espalhamento: em T = 1, ela é ${fixed(entropy(atBase))} bits, o equivalente a sortear entre cerca de ${fixed(2 ** entropy(atBase), 1)} tokens igualmente prováveis.`,
      ],
      keyIdea: "Temperatura é um divisor dos logits: abaixo de 1 concentra, acima de 1 espalha.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "metrics",
            piece: "metrics-panel",
            metrics: [
              { id: "t", label: "temperatura", value: "1" },
              { id: "top", label: `P(${tokens[0]})`, value: percent(atBase[0]), color: "module-04" },
              { id: "entropy", label: "entropia", value: `${fixed(entropy(atBase))} bits` },
            ],
            highlight: "top",
          },
          { id: "dist", piece: "chart", kind: "bar", series: series(atBase), max: 1, highlight: 0, color: "module-04" },
        ],
      },
      alt: `Distribuição do próximo token depois de “${PROMPT}” com temperatura 1: ${tokens.map((token, index) => `${token} ${percent(atBase[index])}`).join(", ")}. Entropia de ${fixed(entropy(atBase))} bits.`,
    },
    {
      id: "cold-hot",
      shortTitle: "Frio e quente",
      title: "Frio concentra, quente espalha",
      tag: "mechanism",
      body: [
        `Com T = ${fixed(COLD, 1)}, os logits dobram de tamanho, e “${tokens[0]}” sobe de ${percent(atBase[0])} para ${percent(atCold[0])}; a entropia cai para ${fixed(entropy(atCold))} bits. Com T = ${fixed(HOT, 1)}, “${tokens[0]}” desce para ${percent(atHot[0])}, a cauda engorda e a entropia sobe para ${fixed(entropy(atHot))} bits.`,
        "No limite, T → 0 põe toda a probabilidade no maior logit: é a decodificação gulosa da aula 04.02. A ordem dos tokens nunca muda com a temperatura; só a distância entre eles. Temperaturas muito altas dão chance real a tokens que não fazem sentido, e o texto começa a desandar.",
      ],
      keyIdea: "A temperatura não troca o favorito: ela decide o quanto o favorito domina.",
      scene: {
        kind: "pieces",
        layout: "row",
        pieces: [
          { id: "dist", piece: "chart", kind: "bar", series: series(atCold), max: 1, highlight: 0, color: "info" },
          { id: "hot", piece: "chart", kind: "bar", series: series(atHot), max: 1, highlight: 0, color: "danger" },
        ],
      },
      alt: `À esquerda, temperatura ${fixed(COLD, 1)}: ${tokens[0]} com ${percent(atCold[0])}. À direita, temperatura ${fixed(HOT, 1)}: ${tokens[0]} com ${percent(atHot[0])} e a cauda mais alta.`,
    },
    {
      id: "top-p",
      shortTitle: "Top-p",
      title: "Top-k e top-p cortam a cauda",
      tag: "mechanism",
      body: [
        `O top-k fica com os k tokens mais prováveis. Com k = ${TOP_K}, sobram ${topKKept.map((row) => row.token).join(", ")}, que somam ${percent(topKMass)}, e o resto sai. O problema: k é fixo, mas às vezes 2 tokens fazem sentido e às vezes 20.`,
        `O top-p, ou nucleus sampling, fica com o menor grupo de tokens cuja soma chega a p. Com p = ${fixed(TOP_P, 1)}, entram ${nucleusKept.length} tokens (${nucleusKept.map((row) => row.token).join(", ")}); depois, as probabilidades são renormalizadas e “${tokens[0]}” passa de ${percent(atBase[0])} para ${percent(nucleusKept[0].final)}. Com T = ${fixed(HOT, 1)}, a mesma regra deixaria entrar ${hotNucleusKept}: o corte se adapta à forma da distribuição.`,
      ],
      keyIdea: "Top-p corta pela massa de probabilidade, não por um número fixo de tokens.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "metrics",
            piece: "metrics-panel",
            metrics: [
              { id: "t", label: "top-p", value: fixed(TOP_P, 1) },
              { id: "top", label: "tokens no sorteio", value: `${nucleusKept.length} de ${tokens.length}`, color: "module-04" },
              { id: "entropy", label: `P(${tokens[0]}) renormalizada`, value: percent(nucleusKept[0].final) },
            ],
            highlight: "top",
          },
          {
            id: "dist",
            piece: "chart",
            kind: "bar",
            series: series(atBase),
            max: 1,
            cutoff: { mode: "top-p", value: TOP_P, label: `p = ${fixed(TOP_P, 1)}` },
            highlight: 0,
            color: "module-04",
          },
        ],
      },
      alt: `Distribuição com temperatura 1 e corte top-p ${fixed(TOP_P, 1)}: ficam ${nucleusKept.map((row) => row.token).join(", ")}; ${tokens.slice(nucleusKept.length).join(", ")} ficam esmaecidos.`,
    },
    {
      id: "draws",
      shortTitle: "Sorteio",
      title: "O sorteio, com seed",
      tag: "example",
      body: [
        `Com temperatura 1, top-p ${fixed(TOP_P, 1)} e seed ${SEED}, ${DRAWS} sorteios saíram assim: ${draws.join(", ")}. “${tokens[0]}” saiu ${topDraws} vezes, com chance de ${percent(finalOf(tokens[0]))} em cada sorteio, e apareceram ${distinctDraws} tokens diferentes.`,
        "A seed fixa o gerador pseudoaleatório: rodar de novo com a mesma seed repete a mesma sequência, o que ajuda em testes. Em APIs com muitos servidores e lotes variáveis, a mesma seed nem sempre garante a mesma resposta, porque detalhes numéricos da GPU mudam os logits.",
      ],
      keyIdea: "Sortear é escolher na proporção das probabilidades que sobraram; a seed torna a sequência repetível.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "metrics",
            piece: "metrics-panel",
            metrics: [
              { id: "t", label: "seed", value: String(SEED) },
              { id: "top", label: `“${tokens[0]}” sorteado`, value: `${topDraws} de ${DRAWS}`, color: "module-04" },
              { id: "entropy", label: "tokens distintos", value: String(distinctDraws) },
            ],
            highlight: "top",
          },
          { id: "draws", piece: "token-stream", tokens: draws, bars: draws.map(finalOf), color: "module-04" },
        ],
      },
      alt: `Oito sorteios com seed ${SEED}: ${draws.join(", ")}, com barras da chance de cada token sorteado. ${tokens[0]} saiu ${topDraws} vezes.`,
    },
    {
      id: "when",
      shortTitle: "Quando usar",
      title: "Cada tarefa pede um ajuste",
      tag: "tradeoff",
      body: [
        "Para extrair dados, classificar ou gerar código que vai ser executado, você quer a mesma resposta sempre: temperatura 0 ou perto disso. Para brainstorming, texto criativo ou várias opções de título, a variação é o objetivo: temperatura perto de 1, com top-p cortando a cauda.",
        "Mexa em um botão por vez: temperatura e top-p fazem coisas parecidas, e mudar os dois junto deixa o efeito difícil de entender. A faixa aceita varia por API; algumas aceitam temperatura de 0 a 2. Temperatura baixa não corrige um prompt ruim: ela só torna a mesma resposta mais repetível.",
      ],
      keyIdea: "Tarefa com resposta certa: temperatura baixa. Tarefa com muitas respostas boas: temperatura mais alta e top-p.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "laptop", kind: "laptop", label: "extrair json", col: 0, row: 0 },
              { id: "cold", kind: "llm", label: "t = 0", col: 1, row: 0 },
              { id: "stable", kind: "answer", label: "sempre igual", col: 2, row: 0 },
              { id: "phone", kind: "phone", label: "ideias de título", col: 0, row: 1 },
              { id: "hot", kind: "llm", label: "t = 1, p = 0,9", col: 1, row: 1 },
              { id: "varied", kind: "answer", label: "variações", col: 2, row: 1 },
            ],
            edges: [
              { from: "laptop", to: "cold" },
              { from: "cold", to: "stable", label: "gulosa" },
              { from: "phone", to: "hot" },
              { from: "hot", to: "varied", label: "sorteio" },
            ],
            active: "hot",
          },
        ],
      },
      alt: "Duas rotas. Extrair JSON usa temperatura 0 e dá sempre a mesma resposta; ideias de título usam temperatura 1 com top-p 0,9, em destaque, e dão variações.",
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Do logit ao token sorteado",
      tag: "summary",
      body: [
        "A ordem do processamento é: dividir os logits pela temperatura, aplicar o softmax, cortar com top-k e top-p, renormalizar e sortear. Com temperatura 0, o sorteio vira a escolha do maior. O modelo é o mesmo em todos os casos; muda só a regra de escolha.",
        "Com isso fecha o caminho da geração. As próximas aulas olham para o modelo em si: o tamanho certo para cada caso, abertos e fechados, e modelos que leem imagens e áudio.",
      ],
      keyIdea: "logits ÷ T → softmax → top-k → top-p → sorteio.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "path",
            piece: "pipeline",
            display: "chips",
            stages: [
              { id: "logits", label: "logits" },
              { id: "temperature", label: "÷ temperatura", color: "module-04" },
              { id: "softmax", label: "softmax" },
              { id: "topk", label: "top-k" },
              { id: "topp", label: "top-p", color: "module-04" },
              { id: "draw", label: "sorteio", color: "brand" },
            ],
          },
        ],
      },
      alt: "Fluxo em chips: logits, divisão pela temperatura, softmax, top-k, top-p e sorteio.",
    },
  ],
  realWorldExample:
    "As APIs de modelos expõem esses botões como parâmetros da chamada: temperature e top_p na API da OpenAI e da Anthropic, e temperature, top_k e top_p no generate do Hugging Face Transformers. O playground de temperatura e amostragem do Laboratório usa as mesmas funções desta aula, com a mesma distribuição de “O céu hoje está”.",
  code: {
    language: "python",
    source: `import numpy as np

def sample(logits, temperature=1.0, top_p=1.0, rng=np.random.default_rng(42)):
    if temperature == 0:
        return int(np.argmax(logits))                 # gulosa
    z = np.asarray(logits) / temperature
    p = np.exp(z - z.max()); p /= p.sum()           # softmax
    order = np.argsort(-p)
    cumulative = np.cumsum(p[order])
    keep = order[: np.searchsorted(cumulative, top_p) + 1]   # núcleo top-p
    q = p[keep] / p[keep].sum()                     # renormaliza
    return int(rng.choice(keep, p=q))`,
    caption: "Temperatura, top-p e sorteio em NumPy, na mesma ordem do playground: dividir, softmax, cortar, renormalizar e sortear.",
  },
  tradeOffs: {
    pros: [
      "Gera variedade sem mudar o modelo",
      "Top-p evita tokens absurdos sem fixar quantos tokens entram",
      "Temperatura 0 dá respostas repetíveis para tarefas com resposta certa",
    ],
    cons: [
      "Temperatura alta aumenta a chance de erros e de texto sem sentido",
      "Temperatura baixa tende a repetir frases e respostas genéricas",
      "Mesmo com seed, APIs distribuídas nem sempre repetem a resposta exata",
    ],
    alternatives: ["Min-p, que corta tokens abaixo de uma fração da probabilidade do favorito", "Beam search, que mantém as várias sequências mais prováveis em paralelo"],
  },
  knowledgeCheck: [
    {
      id: "json-temperature",
      prompt: "Um serviço extrai campos de notas fiscais em JSON e às vezes devolve formatos diferentes para a mesma nota. Qual ajuste de amostragem ajuda primeiro?",
      options: [
        "Subir a temperatura para 1,5",
        "Baixar a temperatura para 0 ou perto disso",
        "Aumentar o top-p para 1",
        "Trocar a seed a cada chamada",
      ],
      correct: 1,
      explanation: "Com temperatura 0, o modelo escolhe sempre o token mais provável e a saída fica repetível. Variação é indesejada numa extração.",
      lesson: "04-06",
    },
    {
      id: "top-p-adapts",
      prompt: "Com top-p = 0,9, numa posição em que um token tem 95% de probabilidade, quantos tokens entram no sorteio?",
      options: ["Só 1", "Sempre 10", "Exatamente 90% do vocabulário", "Depende da seed"],
      correct: 0,
      explanation: "O top-p junta os tokens mais prováveis até a soma chegar a p. Um token de 95% já passa de 0,9 sozinho, então só ele entra.",
      lesson: "04-06",
    },
  ],
  related: ["04-02", "04-03", "05-08"],
  references: [
    { title: "Holtzman et al. (2019), The Curious Case of Neural Text Degeneration", url: "https://arxiv.org/abs/1904.09751", kind: "paper" },
    { title: "Fan et al. (2018), Hierarchical Neural Story Generation", url: "https://arxiv.org/abs/1805.04833", kind: "paper" },
    { title: "Hugging Face Transformers: Generation strategies", url: "https://huggingface.co/docs/transformers/generation_strategies", kind: "docs" },
  ],
};

export default lesson;
