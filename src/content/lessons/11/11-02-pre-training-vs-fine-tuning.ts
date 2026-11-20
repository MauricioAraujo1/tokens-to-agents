import type { LessonContent } from "../../../types/content";

// Pré-treino e fine-tuning lado a lado. Os números do Llama 2 são os publicados (Touvron et al., 2023):
// 2 trilhões de tokens de pré-treino com taxa de aprendizado de pico 3 × 10⁻⁴ no 7B, e SFT com taxa inicial de
// 2 × 10⁻⁵. O ajuste da equipe (5 mil exemplos de 400 tokens, 3 épocas) é uma suposição declarada no texto.
// O esquecimento usa um modelo de 1 parâmetro: a tarefa antiga tem perda (w − 2)², a nova, (w − 5)², e o
// gradiente descendente parte do ótimo antigo. A mistura com dados gerais soma as duas perdas com peso λ.

const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");

const PRETRAIN_TOKENS = 2e12;
const PRETRAIN_LR = 3e-4;
const SFT_LR = 2e-5;
const lrRatio = PRETRAIN_LR / SFT_LR;

const EXAMPLES = 5_000;
const TOKENS_PER_EXAMPLE = 400;
const EPOCHS = 3;
const fineTuneTokens = EXAMPLES * TOKENS_PER_EXAMPLE * EPOCHS;
const dataRatio = PRETRAIN_TOKENS / fineTuneTokens;

// Esquecimento num modelo de 1 parâmetro.
const OLD_OPTIMUM = 2;
const NEW_OPTIMUM = 5;
const STEP_SIZE = 0.1;
const STEPS = 10;
const MIX_WEIGHT = 1;
const oldLoss = (w: number) => (w - OLD_OPTIMUM) ** 2;
const newLoss = (w: number) => (w - NEW_OPTIMUM) ** 2;

const trajectory = (mixWeight: number) => {
  const points = [OLD_OPTIMUM];
  for (let step = 0; step < STEPS; step += 1) {
    const w = points[points.length - 1];
    const gradient = 2 * (w - NEW_OPTIMUM) + mixWeight * 2 * (w - OLD_OPTIMUM);
    points.push(w - STEP_SIZE * gradient);
  }
  return points;
};
const plain = trajectory(0);
const mixed = trajectory(MIX_WEIGHT);
const plainEnd = plain[plain.length - 1];
const mixedEnd = mixed[mixed.length - 1];

const rawText = ["a", "cláusula", "de", "rescisão", "prevê", "multa", "de", "20%"];
const chatPrompt = ["<user>", "multa", "da", "rescisão", "?", "<assistant>"];
const chatAnswer = ["20%", "do", "valor", "."];

const lesson: LessonContent = {
  id: "11-02",
  subtitle: "O que muda entre aprender a linguagem com trilhões de tokens e especializar o modelo com milhares de exemplos: dados, taxa de aprendizado e o risco de esquecer.",
  objectives: [
    "Comparar a escala de dados e a taxa de aprendizado do pré-treino e do ajuste",
    "Diferenciar continuar o pré-treino com texto do domínio e fazer SFT com instruções",
    "Calcular, num modelo de brinquedo, como o ajuste faz o modelo esquecer a tarefa antiga",
    "Escolher formas de reduzir o esquecimento",
  ],
  steps: [
    {
      id: "build-renovate",
      shortTitle: "Obra e reforma",
      title: "Construir a casa e reformar a cozinha",
      tag: "context",
      body: [
        "Construir uma casa leva meses, exige fundação, estrutura e um orçamento enorme. Reformar a cozinha leva semanas e custa uma fração disso, mas só funciona porque a casa já está de pé. Ninguém derruba a casa para trocar o armário.",
        "O [[pré-treino|pre-training]] é a obra: o modelo aprende a linguagem e o mundo lendo trilhões de tokens, e sai dali um [[modelo base|base-model]]. O [[fine-tuning|fine-tuning]] é a reforma: parte desse modelo pronto e, com os seus dados, ajusta o que importa para o seu uso.",
      ],
      keyIdea: "O pré-treino constrói a base geral; o fine-tuning reforma uma parte dela para um uso específico.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "web", kind: "documents", label: "web, livros, código", col: 0, row: 0 },
              { id: "pretrain", kind: "server", label: "pré-treino", col: 1, row: 0 },
              { id: "base", kind: "llm", label: "modelo base", col: 2, row: 0 },
              { id: "mine", kind: "documents", label: "seus dados", col: 2, row: 1 },
              { id: "tuned", kind: "llm", label: "modelo ajustado", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "web", to: "pretrain", label: "trilhões" },
              { from: "pretrain", to: "base" },
              { from: "base", to: "tuned", label: "fine-tuning" },
              { from: "mine", to: "tuned", label: "milhares" },
            ],
            active: "tuned",
          },
        ],
      },
      alt: "Em cima, web, livros e código passam pelo pré-treino e viram o modelo base. O modelo base e os seus dados alimentam o fine-tuning, que gera o modelo ajustado, em destaque.",
    },
    {
      id: "scale",
      shortTitle: "Escala",
      title: "Mesma perda, outra escala",
      tag: "mechanism",
      body: [
        `O Llama 2 7B foi pré-treinado com 2 trilhões de tokens. Um ajuste típico de equipe, com ${integer(EXAMPLES)} exemplos de ${TOKENS_PER_EXAMPLE} tokens por ${EPOCHS} [[épocas|epoch]], soma ${integer(fineTuneTokens / 1e6)} milhões de tokens: o pré-treino leu cerca de ${integer(dataRatio)} vezes mais. Os dois usam a mesma perda de próximo token; o que muda é quanto e o quê.`,
        `A [[taxa de aprendizado|learning-rate]] também cai. No paper do Llama 2, o pré-treino do 7B usa pico de 3 × 10⁻⁴, e o SFT começa em 2 × 10⁻⁵, ${integer(lrRatio)} vezes menor. Os pesos já estão num bom lugar; passos grandes jogariam o modelo para longe do que ele aprendeu.`,
      ],
      keyIdea: "O ajuste usa ordens de grandeza menos dados e uma taxa de aprendizado bem menor.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "metrics",
            piece: "metrics-panel",
            metrics: [
              { id: "pretrain", label: "pré-treino (Llama 2)", value: "2 tri tokens" },
              { id: "ft", label: `ajuste (${EPOCHS} épocas)`, value: `${integer(fineTuneTokens / 1e6)} mi tokens` },
              { id: "ratio", label: "razão de dados", value: `≈ ${integer(dataRatio)} ×`, color: "module-11" },
              { id: "lr", label: "taxa: pré-treino / SFT", value: `${integer(lrRatio)} ×` },
            ],
            highlight: "ratio",
          },
        ],
      },
      alt: `Pré-treino com 2 trilhões de tokens contra ${integer(fineTuneTokens / 1e6)} milhões no ajuste, uma razão de cerca de ${integer(dataRatio)} vezes; a taxa de aprendizado do pré-treino é ${integer(lrRatio)} vezes a do SFT.`,
    },
    {
      id: "two-kinds",
      shortTitle: "Dois tipos",
      title: "Texto do domínio ou pares de instrução",
      tag: "mechanism",
      body: [
        "Há dois jeitos de ajustar. No [[pré-treino continuado|continued-pretraining]], você dá ao modelo texto bruto da área, como contratos ou prontuários, e ele prevê todos os tokens, como no pré-treino. Ele aprende vocabulário e estilo, mas continua sendo um modelo que completa texto.",
        "No [[SFT|supervised-fine-tuning]], cada exemplo é um par de pedido e resposta, e a perda conta só os tokens da resposta. Na cena, as barras marcam os tokens que entram na perda: todos no texto bruto, só a resposta no par. Muitas equipes fazem os dois, nessa ordem, quando o domínio tem um vocabulário muito próprio.",
      ],
      keyIdea: "Pré-treino continuado ensina a língua do domínio; SFT ensina a responder pedidos.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          { id: "raw", piece: "token-stream", tokens: rawText, bars: rawText.map(() => 1), color: "muted" },
          {
            id: "chat",
            piece: "token-stream",
            tokens: [...chatPrompt, ...chatAnswer],
            bars: [...chatPrompt.map(() => 0), ...chatAnswer.map(() => 1)],
            query: chatPrompt.length,
            color: "module-11",
          },
        ],
      },
      alt: "Em cima, um texto de contrato com todos os tokens marcados para a perda. Embaixo, um par de pergunta e resposta em que só os tokens da resposta, 20% do valor, entram na perda.",
    },
    {
      id: "forgetting",
      shortTitle: "Esquecer",
      title: "Aprender a nova, esquecer a antiga",
      tag: "example",
      body: [
        `Um modelo de brinquedo com um único peso w mostra o risco. A tarefa antiga é ótima em w = ${OLD_OPTIMUM}, com perda (w − ${OLD_OPTIMUM})²; a nova, em w = ${NEW_OPTIMUM}. O ajuste parte do ótimo antigo e só olha a tarefa nova. Depois de ${STEPS} passos, w = ${fixed(plainEnd)}: a perda nova caiu de ${fixed(newLoss(OLD_OPTIMUM))} para ${fixed(newLoss(plainEnd))}, e a antiga subiu de 0 para ${fixed(oldLoss(plainEnd))}.`,
        "Nada no gradiente protege a tarefa antiga, porque ela não está nos dados. Isso é o [[esquecimento catastrófico|catastrophic-forgetting]]: num LLM, aparece como um modelo que acerta o formato do seu suporte e piora em matemática, em outro idioma ou em seguir instruções gerais.",
      ],
      keyIdea: "O ajuste só protege o que está nos dados de ajuste; o resto pode piorar sem aviso.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "old-loss",
            piece: "chart",
            kind: "line",
            series: plain.map((w, step) => ({ label: `${step}`, value: Number(oldLoss(w).toFixed(2)) })),
            highlight: STEPS,
            color: "danger",
          },
        ],
      },
      alt: `Perda da tarefa antiga a cada passo do ajuste: começa em 0 e sobe até ${fixed(oldLoss(plainEnd))} no passo ${STEPS}.`,
    },
    {
      id: "remember",
      shortTitle: "Lembrar",
      title: "Misturar dados gerais no ajuste",
      tag: "tradeoff",
      body: [
        `Uma defesa simples é misturar exemplos gerais com os do domínio. No brinquedo, somar a perda antiga com peso λ = ${MIX_WEIGHT} leva w para ${fixed(mixedEnd)}: a perda antiga fica em ${fixed(oldLoss(mixedEnd))}, e a nova, em ${fixed(newLoss(mixedEnd))}. Não é de graça: a tarefa nova fica pior que no ajuste puro, com ${fixed(newLoss(plainEnd))}. É uma troca, regulada pelo peso da mistura.`,
        "Outras defesas seguem a mesma ideia de não ir longe demais: taxa de aprendizado baixa, poucas épocas, penalizar a distância dos pesos originais (o EWC pesa essa distância pela importância de cada peso) ou treinar só um [[adaptador|adapter]] pequeno com o resto congelado, como no [[LoRA|lora]].",
      ],
      keyIdea: "Esquecer menos custa um pouco de desempenho na tarefa nova; o peso da mistura escolhe o ponto.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "losses",
            piece: "metrics-panel",
            metrics: [
              { id: "plain-old", label: "só domínio: perda antiga", value: fixed(oldLoss(plainEnd)), color: "danger" },
              { id: "mixed-old", label: "com mistura: perda antiga", value: fixed(oldLoss(mixedEnd)), color: "success" },
              { id: "mixed-new", label: "com mistura: perda nova", value: fixed(newLoss(mixedEnd)) },
            ],
            highlight: "mixed-old",
          },
          {
            id: "mix",
            piece: "block-diagram",
            blocks: [
              { id: "domain", kind: "documents", label: "dados do domínio", col: 0, row: 0 },
              { id: "general", kind: "documents", label: "dados gerais", col: 0, row: 1 },
              { id: "queue", kind: "queue", label: "mistura", col: 1, row: 0.5 },
              { id: "train", kind: "llm", label: "ajuste", col: 2, row: 0.5 },
            ],
            edges: [
              { from: "domain", to: "queue" },
              { from: "general", to: "queue", label: "replay" },
              { from: "queue", to: "train" },
            ],
            active: "queue",
          },
        ],
      },
      alt: `Dados do domínio e dados gerais entram numa mistura, em destaque, antes do ajuste. Com a mistura, a perda antiga fica em ${fixed(oldLoss(mixedEnd))} em vez de ${fixed(oldLoss(plainEnd))}, e a nova sobe para ${fixed(newLoss(mixedEnd))}.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Obra rara, reformas frequentes",
      tag: "summary",
      body: [
        "O pré-treino é caro, raro e geral: trilhões de tokens, taxa de aprendizado alta, todos os tokens na perda. O ajuste é barato, frequente e específico: milhares de exemplos, taxa baixa, e o cuidado de não esquecer o que o modelo já sabia.",
        "Na próxima aula você decide quando o ajuste vale a pena, comparando com prompt e RAG.",
      ],
      keyIdea: "Pré-treino: a casa. Pré-treino continuado: o vocabulário do bairro. SFT: o jeito de atender.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "path",
            piece: "pipeline",
            display: "chips",
            stages: [
              { id: "pretrain", label: "pré-treino: trilhões de tokens" },
              { id: "continued", label: "pré-treino continuado: texto do domínio" },
              { id: "sft", label: "SFT: pedido e resposta", color: "module-11" },
              { id: "check", label: "conferir o que esqueceu" },
            ],
          },
        ],
      },
      alt: "Sequência de chips: pré-treino com trilhões de tokens, pré-treino continuado com texto do domínio, SFT com pedido e resposta, em destaque, e a conferência do que o modelo esqueceu.",
    },
  ],
  realWorldExample:
    "O Llama 2-Chat foi feito a partir do Llama 2 base: o mesmo modelo pré-treinado com 2 trilhões de tokens passou por SFT, com taxa de aprendizado inicial de 2 × 10⁻⁵, e depois por RLHF. A Meta publicou os dois, e a diferença de comportamento entre eles vem só das etapas de ajuste.",
  tradeOffs: {
    pros: [
      "O ajuste aproveita um pré-treino que custaria milhões para refazer",
      "Pré-treino continuado ensina o vocabulário de um domínio sem precisar de pares de instrução",
      "Taxa baixa e poucas épocas deixam o ajuste rápido e previsível",
    ],
    cons: [
      "O ajuste pode apagar habilidades que não estão nos dados",
      "Pré-treino continuado pede muito mais texto do que um SFT",
      "Proteger o que o modelo sabia custa um pouco de desempenho na tarefa nova",
    ],
    alternatives: ["Treinar só adaptadores (LoRA), que limita quanto o modelo pode se afastar", "Misturar dados gerais (replay) no ajuste"],
  },
  knowledgeCheck: [
    {
      id: "which-kind",
      prompt: "Um hospital tem 2 milhões de prontuários sem perguntas nem respostas e quer um modelo que entenda o jargão médico. Qual ajuste começa melhor?",
      options: [
        "SFT direto, tratando cada prontuário como resposta",
        "Pré-treino continuado com os prontuários, antes de um SFT com pares de pedido e resposta",
        "Pré-treinar um modelo do zero só com os prontuários",
        "Nenhum: jargão não se aprende com treino",
      ],
      correct: 1,
      explanation: "Texto bruto sem pares serve para o pré-treino continuado, que ensina o vocabulário. Para responder pedidos, ainda é preciso um SFT com exemplos de instrução.",
      lesson: "11-02",
    },
    {
      id: "forgetting-fix",
      prompt: "Depois do ajuste, o modelo responde bem no formato do suporte, mas piorou para resumir textos em inglês. Qual mudança ataca a causa?",
      options: [
        "Aumentar a taxa de aprendizado para o modelo aprender mais rápido",
        "Misturar exemplos gerais, como resumos em inglês, nos dados de ajuste, ou treinar com menos passos",
        "Treinar mais épocas só com os dados do suporte",
        "Trocar o tokenizador",
      ],
      correct: 1,
      explanation: "O modelo esqueceu o que não estava nos dados de ajuste. Colocar exemplos da habilidade antiga na mistura, ou se afastar menos dos pesos originais, reduz o esquecimento.",
      lesson: "11-02",
    },
  ],
  related: ["03-14", "04-11", "11-03"],
  references: [
    { title: "Touvron et al. (2023), Llama 2: Open Foundation and Fine-Tuned Chat Models", url: "https://arxiv.org/abs/2307.09288", kind: "paper" },
    { title: "Kirkpatrick et al. (2017), Overcoming catastrophic forgetting in neural networks", url: "https://arxiv.org/abs/1612.00796", kind: "paper" },
    { title: "Hugging Face TRL: SFT Trainer", url: "https://huggingface.co/docs/trl/sft_trainer", kind: "docs" },
  ],
};

export default lesson;
