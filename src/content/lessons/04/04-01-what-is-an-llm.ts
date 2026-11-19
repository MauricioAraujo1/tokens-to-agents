import type { LessonContent } from "../../../types/content";

// O que é um LLM, a partir de um autocompletar de brinquedo: contamos qual palavra vem depois de
// "está" num corpus pequeno e transformamos as contagens em probabilidades. Os tamanhos de GPT-2 e
// GPT-3 são os publicados no paper do GPT-3 (Brown et al., 2020).

const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const percent = (value: number) => `${Math.round(value * 100)}%`;

const corpus = [
  "o café está quente",
  "o café está pronto",
  "o café está quente",
  "o café está frio",
  "o café está quente",
  "o café está pronto",
  "o café está amargo",
  "o café está forte",
];
const CONTEXT_WORD = "está";
const prompt = ["o", "café", CONTEXT_WORD];

const nextCounts = new Map<string, number>();
for (const sentence of corpus) {
  const words = sentence.split(" ");
  const position = words.indexOf(CONTEXT_WORD);
  const next = words[position + 1];
  nextCounts.set(next, (nextCounts.get(next) ?? 0) + 1);
}
const totalNext = [...nextCounts.values()].reduce((sum, value) => sum + value, 0);
const nextDistribution = [...nextCounts.entries()]
  .map(([label, count]) => ({ label, value: count / totalNext }))
  .sort((a, b) => b.value - a.value);
const top = nextDistribution[0];

// Tamanhos publicados (Brown et al., 2020): GPT-2 com 1,5 bilhão de parâmetros, GPT-3 com 175 bilhões
// e cerca de 300 bilhões de tokens de treino.
const GPT2_PARAMS = 1.5e9;
const GPT3_PARAMS = 175e9;
const GPT3_TOKENS = 300e9;
const growth = GPT3_PARAMS / GPT2_PARAMS;
const tokensPerParam = GPT3_TOKENS / GPT3_PARAMS;

const lesson: LessonContent = {
  id: "04-01",
  subtitle: "Um modelo de linguagem enorme, treinado em muito texto para prever o próximo token, que vira ferramenta para quase qualquer tarefa com texto.",
  objectives: [
    "Definir um LLM como um modelo que devolve uma distribuição sobre o próximo token",
    "Explicar o que o “large” mede: parâmetros e texto de treino",
    "Reconhecer por que o mesmo modelo resolve tarefas diferentes só mudando o prompt",
    "Separar o que um LLM sabe fazer do que ele não garante",
  ],
  steps: [
    {
      id: "autocomplete",
      shortTitle: "Autocompletar",
      title: "Um autocompletar que leu a internet",
      tag: "context",
      body: [
        "O teclado do celular sugere a próxima palavra enquanto você digita. Um [[LLM|llm]] faz a mesma coisa, só que muito melhor: ele recebe o seu texto, escolhe um próximo pedaço, junta esse pedaço ao texto e repete até formar uma resposta inteira.",
        "Por dentro, é um [[Transformer|transformer]] do tipo decoder com bilhões de [[parâmetros|parameter]]. O app manda o [[prompt|prompt]] para um servidor, o modelo gera a resposta [[token|token]] por token e o servidor devolve o texto para a tela.",
      ],
      keyIdea: "Um LLM é um modelo de linguagem grande: um autocompletar treinado em tanto texto que passa a resolver tarefas.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "user", kind: "user", label: "você", col: 0, row: 0 },
              { id: "phone", kind: "phone", label: "chat", col: 1, row: 0 },
              { id: "llm", kind: "llm", label: "llm", col: 2, row: 0 },
              { id: "answer", kind: "answer", label: "resposta", col: 3, row: 0 },
            ],
            edges: [
              { from: "user", to: "phone", label: "pergunta" },
              { from: "phone", to: "llm", label: "prompt" },
              { from: "llm", to: "answer", label: "token a token" },
            ],
            active: "llm",
          },
        ],
      },
      alt: "Você digita uma pergunta no chat, o prompt chega ao LLM, em destaque, e a resposta sai token a token.",
    },
    {
      id: "distribution",
      shortTitle: "Distribuição",
      title: "Texto entra, probabilidades saem",
      tag: "mechanism",
      body: [
        `Imagine um autocompletar que só leu ${corpus.length} frases sobre café. Depois de “${prompt.join(" ")}”, ele conta o que veio em seguida: “${top.label}” apareceu em ${percent(top.value)} das vezes, e o resto se divide entre as outras palavras. Ele não devolve uma palavra: devolve uma distribuição.`,
        `Um LLM faz isso sem contar frases inteiras. Ele calcula, para cada token do vocabulário, um número que vira probabilidade. A soma dá 1, como nas barras da cena (${nextDistribution.map((item) => `${item.label} ${fixed(item.value)}`).join(", ")}). Por isso ele generaliza para frases que nunca viu.`,
      ],
      keyIdea: "A saída de um LLM não é uma palavra: é uma probabilidade para cada token possível.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          { id: "prompt", piece: "token-stream", tokens: prompt, query: prompt.length - 1, color: "module-04" },
          {
            id: "next",
            piece: "chart",
            kind: "bar",
            series: nextDistribution.map((item) => ({ label: item.label, value: Number(item.value.toFixed(3)) })),
            max: 1,
            highlight: 0,
            color: "module-04",
          },
        ],
      },
      alt: `O prompt “${prompt.join(" ")}” e as probabilidades da próxima palavra: ${nextDistribution.map((item) => `${item.label} ${percent(item.value)}`).join(", ")}.`,
    },
    {
      id: "large",
      shortTitle: "O que é grande",
      title: "Grande em parâmetros e em texto",
      tag: "mechanism",
      body: [
        `“Large” mede duas coisas: quantos números ajustáveis o modelo tem e quanto texto ele leu no treino. O GPT-2, de 2019, tinha 1,5 bilhão de parâmetros. O GPT-3, de 2020, tinha 175 bilhões, cerca de ${Math.round(growth)} vezes mais, e foi treinado com uns 300 bilhões de tokens.`,
        `A conta dá cerca de ${fixed(tokensPerParam, 1)} tokens de treino por parâmetro no GPT-3. Trabalhos seguintes, como o Chinchilla, mostraram que vale treinar com mais texto por parâmetro. O tamanho não define sozinho a qualidade: dados e treino pesam tanto quanto.`,
      ],
      keyIdea: "Um LLM é grande em parâmetros e em dados de treino; os dois crescem juntos.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "sizes",
            piece: "metrics-panel",
            metrics: [
              { id: "gpt2", label: "GPT-2 (2019)", value: "1,5 bi parâmetros" },
              { id: "gpt3", label: "GPT-3 (2020)", value: "175 bi parâmetros", color: "module-04" },
              { id: "tokens", label: "tokens de treino do GPT-3", value: "≈ 300 bi" },
              { id: "ratio", label: "tokens por parâmetro", value: fixed(tokensPerParam, 1) },
            ],
            highlight: "gpt3",
          },
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "data", kind: "documents", label: "texto da web", col: 0, row: 0 },
              { id: "tokens", kind: "tokens", label: "tokens", col: 1, row: 0 },
              { id: "train", kind: "eval", label: "pré-treino", col: 2, row: 0 },
              { id: "llm", kind: "llm", label: "llm", col: 3, row: 0 },
            ],
            edges: [
              { from: "data", to: "tokens" },
              { from: "tokens", to: "train" },
              { from: "train", to: "llm", label: "pesos" },
            ],
            active: "llm",
            done: ["data", "tokens", "train"],
          },
        ],
      },
      alt: "Painel com os tamanhos do GPT-2 (1,5 bilhão de parâmetros) e do GPT-3 (175 bilhões, 300 bilhões de tokens de treino). Abaixo, texto da web vira tokens, passa pelo pré-treino e produz os pesos do LLM.",
    },
    {
      id: "tasks",
      shortTitle: "Muitas tarefas",
      title: "Um modelo, muitas tarefas",
      tag: "example",
      body: [
        "Antes dos LLMs, cada tarefa tinha o seu modelo: um para traduzir, outro para classificar, outro para resumir. Com um LLM, a tarefa vira texto no prompt: “Traduza para inglês: …”, “Resuma em 3 linhas: …”, “Esse comentário é positivo ou negativo?”.",
        "O paper do GPT-3 mostrou isso em escala: com alguns exemplos no próprio prompt (few-shot), sem treinar de novo, o mesmo modelo resolvia tradução, perguntas e aritmética simples. Por isso ele também é chamado de [[foundation model|foundation-model]]: uma base que serve a muitos produtos.",
      ],
      keyIdea: "Com um LLM, trocar de tarefa é trocar o texto do prompt, não treinar outro modelo.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "tasks",
            piece: "graph",
            nodes: [
              { id: "llm", label: "LLM", x: 0.5, y: 0.5, color: "module-04" },
              { id: "translate", label: "traduzir", x: 0.12, y: 0.15 },
              { id: "summarize", label: "resumir", x: 0.88, y: 0.15 },
              { id: "classify", label: "classificar", x: 0.12, y: 0.85 },
              { id: "code", label: "escrever código", x: 0.88, y: 0.85 },
              { id: "extract", label: "extrair dados", x: 0.5, y: 0.08 },
            ],
            edges: [
              { from: "llm", to: "translate", label: "prompt" },
              { from: "llm", to: "summarize", label: "prompt" },
              { from: "llm", to: "classify", label: "prompt" },
              { from: "llm", to: "code", label: "prompt" },
              { from: "llm", to: "extract", label: "prompt" },
            ],
            highlight: ["llm"],
          },
        ],
      },
      alt: "Um LLM no centro ligado a cinco tarefas: traduzir, resumir, classificar, escrever código e extrair dados, todas pedidas por prompt.",
    },
    {
      id: "limits",
      shortTitle: "Limites",
      title: "O que um LLM não garante",
      tag: "tradeoff",
      body: [
        "O modelo aprendeu a produzir o texto mais provável, não o texto verdadeiro. Na maior parte do tempo, os dois coincidem. Quando a pergunta sai do que ele viu no treino, ou fala de algo que aconteceu depois da data de corte dos dados, ele ainda devolve um texto fluente, só que sem base.",
        "Ele também não tem memória entre conversas nem acesso à internet por padrão: só enxerga o que está na [[janela de contexto|context-window]]. Para fatos novos ou privados, o sistema em volta busca documentos e coloca no prompt; para ações, chama ferramentas.",
      ],
      keyIdea: "Fluência não é garantia de verdade: um LLM precisa de fontes e checagens em volta dele.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "phone", kind: "phone", label: "pergunta", col: 0, row: 0.5 },
              { id: "llm", kind: "llm", label: "llm", col: 1, row: 0.5 },
              { id: "answer", kind: "answer", label: "texto provável", col: 2, row: 0 },
              { id: "unknown", kind: "no-result", label: "fato recente", col: 2, row: 1 },
            ],
            edges: [
              { from: "phone", to: "llm" },
              { from: "llm", to: "answer", label: "visto no treino" },
              { from: "llm", to: "unknown", label: "fora do treino", variant: "alternative" },
            ],
            active: "llm",
          },
        ],
      },
      alt: "Uma pergunta chega ao LLM. Se o assunto estava no treino, sai um texto provável; se é um fato recente, o caminho tracejado leva a uma resposta sem base.",
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "O caminho do texto",
      tag: "summary",
      body: [
        "Um LLM recebe texto, quebra em tokens, passa pelo Transformer e devolve uma probabilidade para cada token do vocabulário. Um token é escolhido, entra no texto e o ciclo recomeça.",
        "As próximas aulas abrem cada pedaço desse caminho: como o texto é gerado token a token, como a previsão é calculada, o que são os parâmetros e quanto texto cabe na janela.",
      ],
      keyIdea: "LLM = Transformer grande + muito texto + previsão do próximo token, repetida.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "path",
            piece: "pipeline",
            display: "chips",
            stages: [
              { id: "text", label: "texto" },
              { id: "tokens", label: "tokens" },
              { id: "transformer", label: "Transformer", color: "module-04" },
              { id: "probs", label: "probabilidades" },
              { id: "next", label: "próximo token", color: "brand" },
            ],
            repeat: { from: "tokens", to: "next", label: "repete" },
          },
        ],
      },
      alt: "Fluxo em chips: texto, tokens, Transformer, probabilidades e próximo token, com o trecho de tokens até o próximo token repetido.",
    },
  ],
  realWorldExample:
    "Assistentes como o ChatGPT, o Claude e o Gemini são LLMs servidos por API. O mesmo modelo responde perguntas no chat, resume documentos num app corporativo e completa código num editor: o que muda entre esses produtos é o prompt e o sistema montado em volta do modelo.",
  code: {
    language: "python",
    source: `from transformers import pipeline

generator = pipeline("text-generation", model="openai-community/gpt2")
print(generator("The coffee is", max_new_tokens=5)[0]["generated_text"])`,
    caption: "O GPT-2 (o modelo pequeno, de 124 milhões de parâmetros) completando um texto em poucas linhas com a biblioteca transformers.",
  },
  tradeOffs: {
    pros: [
      "Um único modelo resolve muitas tarefas de texto só mudando o prompt",
      "Generaliza para frases e pedidos que nunca viu exatamente",
      "Dispensa treinar um modelo por tarefa para começar um produto",
    ],
    cons: [
      "Produz texto plausível mesmo quando não sabe a resposta",
      "Conhece o mundo só até a data de corte dos dados de treino",
      "É caro de treinar e de servir por causa do tamanho",
    ],
    alternatives: ["Modelos pequenos e especializados para uma tarefa só", "Regras e buscas tradicionais quando a resposta é exata e conhecida"],
  },
  knowledgeCheck: [
    {
      id: "llm-output",
      prompt: "Qual é a saída direta de um LLM a cada passo da geração?",
      options: [
        "Uma frase completa já revisada",
        "Uma probabilidade para cada token do vocabulário",
        "O documento da internet mais parecido com o prompt",
        "Uma resposta buscada num banco de dados",
      ],
      correct: 1,
      explanation: "O modelo calcula uma distribuição sobre o próximo token. A resposta inteira sai de repetir essa escolha token a token.",
      lesson: "04-01",
    },
    {
      id: "new-task",
      prompt: "Uma equipe precisa classificar comentários e também resumir chamados. Com um LLM, qual é o primeiro passo mais simples?",
      options: [
        "Treinar dois modelos novos do zero",
        "Escrever dois prompts diferentes para o mesmo modelo e avaliar o resultado",
        "Comprar duas GPUs, uma por tarefa",
        "Esperar a próxima versão do modelo",
      ],
      correct: 1,
      explanation: "Um LLM recebe a tarefa como texto. Antes de treinar qualquer coisa, vale testar prompts e medir a qualidade.",
      lesson: "04-01",
    },
  ],
  related: ["03-01", "04-02", "04-03"],
  references: [
    { title: "Brown et al. (2020), Language Models are Few-Shot Learners", url: "https://arxiv.org/abs/2005.14165", kind: "paper" },
    { title: "Zhao et al. (2023), A Survey of Large Language Models", url: "https://arxiv.org/abs/2303.18223", kind: "paper" },
    { title: "Bommasani et al. (2021), On the Opportunities and Risks of Foundation Models", url: "https://arxiv.org/abs/2108.07258", kind: "paper" },
  ],
};

export default lesson;
