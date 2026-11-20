import type { LessonContent } from "../../../types/content";

// Preparação de um dataset de fine-tuning para o suporte de uma loja de brinquedo. Os tamanhos das conversas, a
// distribuição de intenções e as 4 paráfrases por atendimento são suposições do exemplo, declaradas no texto.
// As contas: tokens cortados pelo comprimento máximo, a divisão 80/10/10 e a chance de vazamento de uma divisão
// aleatória, 1 − (1 − 0,8)³, quando cada exemplo de validação tem 3 irmãos parafraseados.

const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");
const percent = (value: number, digits = 0) =>
  `${(value * 100).toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits })}%`;

const MAX_SEQ_LENGTH = 1024;
const lengths = [180, 420, 260, 1350, 310, 95, 520, 2300];
const truncated = lengths.filter((length) => length > MAX_SEQ_LENGTH);
const totalTokens = lengths.reduce((sum, length) => sum + length, 0);
const lostTokens = truncated.reduce((sum, length) => sum + (length - MAX_SEQ_LENGTH), 0);
const longest = Math.max(...lengths);

const THREADS = 300;
const PARAPHRASES = 4;
const examples = THREADS * PARAPHRASES;
const SPLIT = { train: 0.8, validation: 0.1, test: 0.1 };
const trainCount = Math.round(examples * SPLIT.train);
const validationCount = Math.round(examples * SPLIT.validation);
const testCount = examples - trainCount - validationCount;
const siblings = PARAPHRASES - 1;
const randomLeak = 1 - (1 - SPLIT.train) ** siblings;

const intents = [
  { label: "rastreio", value: 520 },
  { label: "troca", value: 310 },
  { label: "reembolso", value: 220 },
  { label: "cancelar", value: 110 },
  { label: "garantia", value: 40 },
];
const intentTotal = intents.reduce((sum, intent) => sum + intent.value, 0);
const largestIntent = intents[0];
const smallestIntent = intents[intents.length - 1];
const imbalance = largestIntent.value / smallestIntent.value;

const rendered = ["<system>", "suporte", "<user>", "cadê", "meu", "pedido?", "<assistant>", "chega", "amanhã", "<end>"];

const lesson: LessonContent = {
  id: "11-04",
  subtitle: "Como transformar atendimentos reais num dataset de treino: formato de conversa, comprimento, divisão sem vazamento e cobertura dos casos.",
  objectives: [
    "Escrever exemplos no formato de conversa com papéis, em JSONL",
    "Medir o comprimento dos exemplos e o que o truncamento corta",
    "Dividir treino, validação e teste sem vazar paráfrases entre eles",
    "Checar a cobertura das intenções antes de treinar",
  ],
  steps: [
    {
      id: "recipes",
      shortTitle: "Receitas",
      title: "Um caderno de receitas para o modelo",
      tag: "context",
      body: [
        "Um aprendiz de cozinha aprende copiando receitas: cada ficha tem o pedido do cliente e o prato pronto. Se metade das fichas está rasgada, se todas são de sobremesa ou se a mesma receita aparece cem vezes, o aprendiz aprende errado, por mais talentoso que seja.",
        "No fine-tuning, as fichas são o [[dataset de instruções|instruction-dataset]]: exemplos de pedido e resposta que mostram o comportamento desejado. A fonte costuma ser o que você já tem, como tickets do suporte ou respostas aprovadas, selecionado e convertido para um arquivo de treino.",
      ],
      keyIdea: "O modelo ajustado nunca fica melhor que os exemplos que ele copia.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "tickets", kind: "sql-db", label: "tickets", col: 0, row: 0 },
              { id: "select", kind: "app", label: "selecionar", col: 1, row: 0 },
              { id: "jsonl", kind: "documents", label: "train.jsonl", col: 2, row: 0 },
              { id: "train", kind: "llm", label: "ajuste", col: 3, row: 0 },
              { id: "review", kind: "user", label: "revisão humana", col: 1, row: 1 },
            ],
            edges: [
              { from: "tickets", to: "select" },
              { from: "review", to: "select", label: "aprova" },
              { from: "select", to: "jsonl", label: "conversas" },
              { from: "jsonl", to: "train" },
            ],
            active: "jsonl",
          },
        ],
      },
      alt: "Tickets de um banco de dados passam por uma seleção com revisão humana e viram o arquivo train.jsonl, em destaque, que alimenta o ajuste.",
    },
    {
      id: "format",
      shortTitle: "Formato",
      title: "Uma linha, uma conversa",
      tag: "mechanism",
      body: [
        "O formato mais comum é [[JSONL|jsonl]]: um objeto JSON por linha, cada um com uma lista de mensagens com [[papéis|message-role]] (system, user, assistant), como no código desta aula. Uma linha pode ter várias trocas, quando o comportamento depende da conversa toda.",
        "Na hora do treino, o [[chat template|chat-template]] do modelo transforma as mensagens numa única sequência, com [[tokens especiais|special-token]] marcando cada papel, como na cena. Use o mesmo template no treino e na inferência: se o modelo aprende com uma marcação e recebe outra em produção, o ajuste se perde em silêncio.",
      ],
      keyIdea: "Mensagens com papéis viram uma sequência pelo chat template, e o template precisa ser o mesmo no treino e em produção.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [{ id: "rendered", piece: "token-stream", tokens: rendered, query: rendered.indexOf("<assistant>"), color: "module-11" }],
      },
      alt: "Uma conversa renderizada pelo chat template: system suporte, user cadê meu pedido, e o marcador assistant, em destaque, seguido de chega amanhã e do token de fim.",
    },
    {
      id: "length",
      shortTitle: "Comprimento",
      title: "Meça os tokens antes de treinar",
      tag: "mechanism",
      body: [
        `O treino tem um comprimento máximo de sequência, aqui ${integer(MAX_SEQ_LENGTH)} tokens. Nas ${lengths.length} conversas da cena, ${truncated.length} passam do limite, a maior com ${integer(longest)}. O [[truncamento|truncation]] corta o fim: ${integer(lostTokens)} dos ${integer(totalTokens)} tokens somem, e o fim é justamente a resposta.`,
        "Uma resposta cortada ensina o modelo a parar no meio da frase. Antes de treinar, conte os tokens com o tokenizador do modelo e decida por exemplo: descartar, resumir o histórico antigo da conversa ou aumentar o limite, que custa memória proporcional ao comprimento.",
      ],
      keyIdea: "Truncar corta o fim da conversa, que é a resposta: meça e trate os exemplos longos antes.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "lengths",
            piece: "chart",
            kind: "bar",
            series: lengths.map((length, index) => ({ label: `#${index + 1}`, value: length })),
            cutoff: { mode: "threshold", value: MAX_SEQ_LENGTH, label: `passa de ${integer(MAX_SEQ_LENGTH)}` },
            color: "module-11",
          },
        ],
      },
      alt: `Tokens de ${lengths.length} conversas; ${truncated.length} passam do limite de ${integer(MAX_SEQ_LENGTH)} e ficam em destaque, a maior com ${integer(longest)} tokens.`,
    },
    {
      id: "split",
      shortTitle: "Divisão",
      title: "Treino, validação e teste sem vazamento",
      tag: "example",
      body: [
        `Suponha ${integer(examples)} exemplos vindos de ${THREADS} atendimentos, cada um reescrito em ${PARAPHRASES} paráfrases. A divisão 80/10/10 dá ${integer(trainCount)} de [[treino|training-set]], ${validationCount} de [[validação|validation-set]] e ${testCount} de [[teste|test-set]]. Se a divisão for aleatória por exemplo, cada exemplo de validação tem ${siblings} irmãos, e a chance de pelo menos um cair no treino é 1 − 0,2³ = ${percent(randomLeak, 1)}.`,
        "Isso é [[vazamento de dados|data-leakage]]: o modelo é avaliado em frases que ele quase decorou, e a nota fica otimista demais. A correção é dividir por grupo: todas as paráfrases de um atendimento vão para o mesmo lado. Faça o mesmo por cliente ou por data quando o produto vai ver clientes ou meses novos.",
      ],
      keyIdea: "Divida por grupo (atendimento, cliente, data), nunca por linha, quando os exemplos têm parentes.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "leak",
            piece: "metrics-panel",
            metrics: [
              { id: "random", label: "vazamento, divisão aleatória", value: percent(randomLeak, 1), color: "danger" },
              { id: "group", label: "vazamento, divisão por grupo", value: "0%", color: "success" },
              { id: "sizes", label: "treino / validação / teste", value: `${integer(trainCount)} / ${validationCount} / ${testCount}` },
            ],
            highlight: "group",
          },
          {
            id: "split",
            piece: "block-diagram",
            blocks: [
              { id: "all", kind: "documents", label: `${integer(examples)} exemplos`, col: 0, row: 0.5 },
              { id: "group", kind: "app", label: "por atendimento", col: 1, row: 0.5 },
              { id: "train", kind: "documents", label: `treino ${integer(trainCount)}`, col: 2, row: 0 },
              { id: "val", kind: "eval", label: `validação ${validationCount}`, col: 2, row: 1 },
              { id: "test", kind: "eval", label: `teste ${testCount}`, col: 3, row: 1 },
            ],
            edges: [
              { from: "all", to: "group" },
              { from: "group", to: "train" },
              { from: "group", to: "val" },
              { from: "group", to: "test" },
            ],
            active: "group",
          },
        ],
      },
      alt: `${integer(examples)} exemplos são divididos por atendimento, em destaque, em treino ${integer(trainCount)}, validação ${validationCount} e teste ${testCount}. A divisão aleatória vazaria em ${percent(randomLeak, 1)} dos exemplos de validação; por grupo, em 0%.`,
    },
    {
      id: "coverage",
      shortTitle: "Cobertura",
      title: "O que o dataset não mostra, o modelo não aprende",
      tag: "tradeoff",
      body: [
        `Conte os exemplos por intenção. Nos ${integer(intentTotal)} do exemplo, “${largestIntent.label}” tem ${largestIntent.value} e “${smallestIntent.label}” tem ${smallestIntent.value}, ${Math.round(imbalance)} vezes menos. O modelo vai responder rastreio muito bem e garantia mal, e pode até puxar perguntas de garantia para a resposta de rastreio.`,
        "Equilibrar tem um custo: repetir os raros (oversampling) aumenta o risco de decorar, e cortar os frequentes joga dado fora. O caminho mais seguro é escrever ou coletar mais exemplos raros, e incluir de propósito o que o modelo deve recusar ou encaminhar para uma pessoa.",
      ],
      keyIdea: "Cobertura pesa mais que volume: cada intenção, e cada recusa, precisa de exemplos.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [{ id: "intents", piece: "chart", kind: "bar", series: intents, highlight: intents.length - 1, color: "module-11" }],
      },
      alt: `Exemplos por intenção: ${intents.map((intent) => `${intent.label} ${intent.value}`).join(", ")}. Garantia, a menor, está em destaque.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Do ticket ao arquivo de treino",
      tag: "summary",
      body: [
        "Selecione exemplos que mostram o comportamento certo, escreva cada um como conversa com papéis em JSONL, renderize com o chat template do modelo, conte os tokens, divida por grupo e confira a cobertura de cada intenção.",
        "Formato certo não garante dado bom. A próxima aula limpa o dataset: duplicatas, quase duplicatas, exemplos ruins e contaminação com o teste.",
      ],
      keyIdea: "Formato com papéis, tokens medidos, divisão por grupo e cobertura das intenções.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "checklist",
            piece: "pipeline",
            display: "chips",
            stages: [
              { id: "select", label: "selecionar exemplos" },
              { id: "jsonl", label: "conversas em JSONL" },
              { id: "template", label: "chat template do modelo" },
              { id: "tokens", label: "contar tokens" },
              { id: "split", label: "dividir por grupo", color: "module-11" },
              { id: "coverage", label: "conferir cobertura" },
            ],
          },
        ],
      },
      alt: "Lista em chips: selecionar exemplos, conversas em JSONL, chat template do modelo, contar tokens, dividir por grupo, em destaque, e conferir cobertura.",
    },
  ],
  realWorldExample:
    "A API de fine-tuning da OpenAI recebe exatamente esse formato: um arquivo JSONL em que cada linha tem uma lista messages com papéis system, user e assistant. O SFTTrainer do Hugging Face TRL aceita o mesmo formato de conversa e aplica o chat template do modelo antes de tokenizar.",
  code: {
    language: "json",
    source: `{"messages": [{"role": "system", "content": "Você é o suporte da Loja Aurora."}, {"role": "user", "content": "Cadê meu pedido 4812?"}, {"role": "assistant", "content": "O pedido 4812 saiu ontem e chega amanhã."}]}
{"messages": [{"role": "system", "content": "Você é o suporte da Loja Aurora."}, {"role": "user", "content": "Quero trocar o tamanho."}, {"role": "assistant", "content": "Claro! A troca é grátis em até 30 dias."}]}`,
    caption: "Duas linhas de um train.jsonl: cada linha é uma conversa completa, com o papel de cada mensagem.",
  },
  tradeOffs: {
    pros: [
      "Tickets e respostas aprovadas já existentes viram dados de treino com pouco esforço",
      "O formato de conversa com papéis é aceito pelas APIs e bibliotecas principais",
      "Divisão por grupo dá uma avaliação honesta",
    ],
    cons: [
      "Dados reais trazem erros, respostas ruins e dados pessoais que precisam de limpeza",
      "Intenções raras ficam com poucos exemplos",
      "Conversas longas pedem truncamento ou mais memória",
    ],
    alternatives: ["Gerar exemplos sintéticos para as intenções raras (aula 11.06)", "Começar com poucos exemplos escritos à mão por especialistas"],
  },
  knowledgeCheck: [
    {
      id: "template-mismatch",
      prompt: "O modelo ajustado vai bem no notebook de testes e mal em produção. Em produção, a API monta o prompt com outro formato de marcação. Qual a causa provável?",
      options: [
        "A temperatura de produção",
        "Treino e produção usam chat templates diferentes, e o modelo não reconhece os papéis",
        "O dataset era pequeno demais",
        "O modelo esqueceu o pré-treino",
      ],
      correct: 1,
      explanation: "O ajuste aprende com uma sequência de tokens específica. Se produção usa outra marcação para os papéis, o modelo vê uma entrada diferente da que aprendeu.",
      lesson: "11-04",
    },
    {
      id: "split-by-customer",
      prompt: "O dataset tem várias conversas de cada cliente, e o produto vai atender clientes novos. Como dividir treino e teste?",
      options: [
        "Aleatoriamente por conversa",
        "Por cliente: todas as conversas de um cliente ficam do mesmo lado",
        "Colocar as conversas mais curtas no teste",
        "Usar o mesmo conjunto para treino e teste",
      ],
      correct: 1,
      explanation: "Dividir por cliente imita a produção, em que o modelo vê clientes que não estavam no treino, e evita que detalhes de um cliente vazem para o teste.",
      lesson: "11-04",
    },
  ],
  related: ["01-08", "05-03", "11-05"],
  references: [
    { title: "OpenAI: Fine-tuning guide", url: "https://platform.openai.com/docs/guides/fine-tuning", kind: "docs" },
    { title: "Hugging Face TRL: SFT Trainer", url: "https://huggingface.co/docs/trl/sft_trainer", kind: "docs" },
    { title: "Hugging Face Transformers: Chat templates", url: "https://huggingface.co/docs/transformers/main/en/chat_templating", kind: "docs" },
  ],
};

export default lesson;
