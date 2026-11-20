import type { BlockDiagramSpec } from "../../../scene/types";
import type { LessonContent } from "../../../types/content";

// O caminho de uma pergunta num assistente com busca, calculado com números de exemplo declarados aqui:
// o orçamento de tokens do prompt montado e o tempo de resposta a partir de velocidades supostas de
// leitura e de geração. As velocidades são hipóteses da aula, não medições de um produto.

const CONTEXT_WINDOW = 8192;
const SNIPPETS = 3;
const SNIPPET_TOKENS = 500;
const budget = [
  { label: "instruções", value: 400 },
  { label: "histórico", value: 1200 },
  { label: "trechos", value: SNIPPETS * SNIPPET_TOKENS },
  { label: "pergunta", value: 60 },
  { label: "resposta", value: 800 },
];
const promptTokens = budget.filter((part) => part.label !== "resposta").reduce((sum, part) => sum + part.value, 0);
const answerBudget = budget.find((part) => part.label === "resposta")?.value ?? 0;
const usedTokens = promptTokens + answerBudget;
const snippetsIndex = budget.findIndex((part) => part.label === "trechos");

const READ_TOKENS_PER_SECOND = 5000;
const ANSWER_TOKENS = 300;
const models = [
  { id: "small", label: "modelo menor", tokensPerSecond: 150 },
  { id: "large", label: "modelo maior", tokensPerSecond: 40 },
];
const firstTokenSeconds = promptTokens / READ_TOKENS_PER_SECOND;
const totalSeconds = (tokensPerSecond: number) => firstTokenSeconds + ANSWER_TOKENS / tokensPerSecond;

const seconds = (value: number) => `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} s`;
const thousands = (value: number) => value.toLocaleString("pt-BR");
const percent = (value: number) => `${Math.round(value * 100)}%`;

const requestFlow = (active: string): BlockDiagramSpec => ({
  id: "flow",
  piece: "block-diagram",
  blocks: [
    { id: "phone", kind: "phone", label: "app", col: 0, row: 0.5 },
    { id: "api", kind: "server", label: "api", col: 1, row: 0.5 },
    { id: "search", kind: "vector-db", label: "busca", col: 2, row: 0 },
    { id: "context", kind: "context", label: "prompt montado", col: 2, row: 1 },
    { id: "llm", kind: "llm", label: "modelo", col: 3, row: 0.5 },
  ],
  edges: [
    { from: "phone", to: "api", label: "pergunta" },
    { from: "api", to: "search" },
    { from: "search", to: "context", label: "trechos" },
    { from: "context", to: "llm" },
  ],
  active,
});

const lesson: LessonContent = {
  id: "00-06",
  subtitle: "Do treino que acontece uma vez à resposta que sai em segundos: as peças de um assistente de IA de verdade.",
  objectives: [
    "Separar treino e inferência no ciclo de vida de um modelo",
    "Seguir uma pergunta do app até o modelo e de volta",
    "Montar o orçamento de tokens de um prompt dentro da janela de contexto",
    "Estimar o tempo de resposta a partir da velocidade de leitura e de geração",
  ],
  steps: [
    {
      id: "two-phases",
      shortTitle: "Duas fases",
      title: "Treinar uma vez, usar milhões",
      tag: "context",
      body: [
        "Um modelo de linguagem passa por duas fases. Primeiro é treinado: o [[pré-treino|pre-training]] lê uma quantidade enorme de texto, e um [[fine-tuning|fine-tuning]] o ajusta para seguir instruções e conversar. Isso pode levar semanas em milhares de GPUs e acontece poucas vezes.",
        "Depois vem a [[inferência|inference]]: o modelo pronto, com os pesos congelados, responde cada pergunta. Ela acontece a cada mensagem de cada usuário. Quase todo o trabalho de quem constrói produtos de IA está nessa segunda fase.",
      ],
      keyIdea: "Treino ajusta os pesos e é raro; inferência usa os pesos e acontece a cada requisição.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "lifecycle",
            piece: "pipeline",
            stages: [
              { id: "data", label: "dados" },
              { id: "pretrain", label: "pré-treino" },
              { id: "finetune", label: "fine-tuning" },
              { id: "eval", label: "avaliação" },
              { id: "deploy", label: "deploy" },
              { id: "inference", label: "inferência", color: "module-00" },
            ],
            active: "inference",
            done: ["data", "pretrain", "finetune", "eval", "deploy"],
          },
        ],
      },
      alt: "Pipeline do ciclo de vida: dados, pré-treino, fine-tuning, avaliação e deploy já concluídos, e a inferência em destaque.",
    },
    {
      id: "request",
      shortTitle: "A pergunta",
      title: "O caminho de uma pergunta",
      tag: "mechanism",
      body: [
        "Você pergunta ao assistente da loja: “qual é o prazo de troca?”. O app manda o texto para uma api, o servidor da empresa. A api não passa a pergunta direto ao modelo: primeiro ela busca, na base de documentos da loja, os trechos que falam de trocas.",
        `Com os trechos em mãos, a api monta o prompt: instruções, histórico da conversa, os ${SNIPPETS} trechos e a pergunta. Só então chama o [[LLM|llm]]. Esse padrão de buscar antes de gerar é o [[RAG|rag]], e é o que faz o modelo responder sobre dados que não estavam no treino.`,
      ],
      keyIdea: "O modelo é uma peça no meio do caminho. Quem decide o que ele vê é o código em volta dele.",
      scene: { kind: "pieces", layout: "single", pieces: [requestFlow("api")] },
      alt: "O app manda a pergunta para a api, em destaque, que consulta a busca; os trechos encontrados entram no prompt montado, que vai para o modelo.",
    },
    {
      id: "context",
      shortTitle: "Contexto",
      title: "Tudo o que o modelo vê",
      tag: "mechanism",
      body: [
        `O modelo não lembra de nada entre chamadas: ele só vê o que está no prompt. Esse prompt tem um limite, a [[janela de contexto|context-window]], medida em [[tokens|token]]. Num modelo de exemplo com janela de ${thousands(CONTEXT_WINDOW)} tokens, as partes da cena somam ${thousands(promptTokens)} tokens de entrada mais ${thousands(answerBudget)} reservados para a resposta.`,
        `Ao todo, ${thousands(usedTokens)} tokens, ${percent(usedTokens / CONTEXT_WINDOW)} da janela. Os trechos da busca são a maior parte. Mais trechos dão mais chance de a resposta estar lá, mas custam mais tokens, mais tempo e mais dinheiro, e podem diluir o que importa.`,
      ],
      keyIdea: "O prompt é a única memória do modelo numa chamada, e cada token dele tem custo.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "budget",
            piece: "chart",
            kind: "bar",
            series: budget,
            highlight: snippetsIndex,
            color: "module-00",
          },
        ],
      },
      alt: `Barras com os tokens de cada parte do prompt: instruções, histórico, trechos, pergunta e resposta; os trechos, com ${thousands(SNIPPETS * SNIPPET_TOKENS)} tokens, estão em destaque.`,
    },
    {
      id: "serving",
      shortTitle: "Servir",
      title: "Uma GPU, muitos usuários",
      tag: "mechanism",
      body: [
        "Do outro lado, o modelo roda em servidores com GPU. Pedidos de muitos usuários entram numa fila e são processados juntos, em lote, porque a GPU faz muitas contas em paralelo: atender várias pessoas de uma vez sai bem mais barato do que atender uma de cada vez.",
        "A geração acontece token a token, e cada token sai assim que fica pronto. É por isso que o texto aparece aos poucos na tela: a resposta chega em streaming. Para não refazer contas, o servidor guarda o que já calculou de cada conversa no [[KV cache|kv-cache]].",
      ],
      keyIdea: "Servir um modelo é um problema de fila e de lote: manter a GPU ocupada sem deixar ninguém esperando.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "serving",
            piece: "client-server",
            nodes: [
              { id: "web", label: "web", role: "client" },
              { id: "mobile", label: "app", role: "client" },
              { id: "api", label: "api", role: "server" },
              { id: "queue", label: "fila", role: "queue", size: 3 },
              { id: "gpu", label: "modelo na GPU", role: "model", utilization: 0.8 },
            ],
            messages: [
              { from: "mobile", to: "api", label: "POST /chat" },
              { from: "api", to: "queue", label: "pedido" },
              { from: "queue", to: "gpu", label: "lote" },
              { from: "gpu", to: "mobile", label: "tokens em streaming" },
            ],
            active: 3,
          },
        ],
      },
      alt: "Clientes web e app mandam pedidos para a api, que os coloca numa fila; a fila entrega lotes ao modelo na GPU, que devolve os tokens em streaming.",
    },
    {
      id: "latency",
      shortTitle: "Latência",
      title: "Quanto tempo a resposta leva",
      tag: "tradeoff",
      body: [
        `Suponha um servidor que lê o prompt a ${thousands(READ_TOKENS_PER_SECOND)} tokens por segundo. Os ${thousands(promptTokens)} tokens de entrada levam ${seconds(firstTokenSeconds)}: é o tempo até o primeiro token. Depois, a resposta de ${ANSWER_TOKENS} tokens sai na velocidade de geração do modelo.`,
        `Com um modelo menor gerando ${models[0].tokensPerSecond} tokens por segundo, a resposta completa leva ${seconds(totalSeconds(models[0].tokensPerSecond))}. Com um maior, a ${models[1].tokensPerSecond} tokens por segundo, leva ${seconds(totalSeconds(models[1].tokensPerSecond))}. Escolher o modelo é sempre pesar qualidade contra tempo e custo.`,
      ],
      keyIdea: "Tempo de resposta ≈ tokens de entrada ÷ velocidade de leitura + tokens de saída ÷ velocidade de geração.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "latency",
            piece: "metrics-panel",
            metrics: [
              { id: "first", label: "primeiro token", value: seconds(firstTokenSeconds), color: "success" },
              ...models.map((model) => ({ id: model.id, label: `${model.label}, completa`, value: seconds(totalSeconds(model.tokensPerSecond)) })),
            ],
            highlight: "first",
          },
        ],
      },
      alt: `Painel de latência: primeiro token em ${seconds(firstTokenSeconds)}, resposta completa em ${seconds(totalSeconds(models[0].tokensPerSecond))} com o modelo menor e ${seconds(totalSeconds(models[1].tokensPerSecond))} com o maior.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "O sistema em volta do modelo",
      tag: "summary",
      body: [
        "Um sistema de IA moderno é muito mais que o modelo: tem a api que orquestra, a busca que traz os dados certos, o prompt montado, a fila de GPUs e, em volta de tudo, [[guardrails|guardrail]] que barram entradas e saídas perigosas e avaliações que medem a qualidade.",
        "Construir esse sistema em volta de um modelo pronto é um trabalho com nome próprio. Na próxima aula, você vê a diferença entre esse trabalho, a AI engineering, e o de treinar modelos, a ML engineering.",
      ],
      keyIdea: "Modelo + contexto + serviço + segurança + avaliação: o produto é o sistema inteiro.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "phone", kind: "phone", label: "app", col: 0, row: 0.5 },
              { id: "guard", kind: "guardrail", label: "guardrail", col: 1, row: 0.5 },
              { id: "api", kind: "server", label: "api", col: 2, row: 0 },
              { id: "search", kind: "vector-db", label: "busca", col: 2, row: 1 },
              { id: "context", kind: "context", label: "prompt montado", col: 3, row: 1 },
              { id: "llm", kind: "llm", label: "modelo", col: 3, row: 0 },
            ],
            edges: [
              { from: "phone", to: "guard", label: "pergunta" },
              { from: "guard", to: "api" },
              { from: "api", to: "search" },
              { from: "search", to: "context", label: "trechos" },
              { from: "context", to: "llm" },
            ],
            active: "llm",
            done: ["phone", "guard", "api", "search", "context"],
          },
        ],
      },
      alt: "O sistema completo: o app passa por um guardrail até a api, que busca trechos, monta o prompt e chama o modelo, em destaque.",
    },
  ],
  realWorldExample:
    "O vLLM, servidor de inferência de código aberto criado na Universidade da Califórnia em Berkeley, junta pedidos de muitos usuários em lotes contínuos e organiza o KV cache em páginas de memória, como um sistema operacional faz com a RAM. É a técnica do artigo PagedAttention.",
  code: {
    language: "json",
    source: `{
  "model": "nome-do-modelo",
  "messages": [
    { "role": "system", "content": "Você é o assistente da loja. Responda só com base nos trechos." },
    { "role": "user", "content": "Trechos: [...]\\n\\nPergunta: qual é o prazo de troca?" }
  ],
  "max_tokens": 800,
  "stream": true
}`,
    caption: "O corpo típico de uma chamada a uma API de chat: instruções, trechos e pergunta viram mensagens, a resposta tem um teto de tokens e chega em streaming.",
  },
  tradeOffs: {
    pros: [
      "Usar um modelo pronto via API dispensa treino e coloca um produto no ar em dias",
      "A busca antes da geração deixa o modelo responder sobre dados privados e atuais",
      "Streaming faz a resposta parecer rápida mesmo quando a geração completa demora",
    ],
    cons: [
      "Cada token do prompt e da resposta custa tempo e dinheiro",
      "O modelo só sabe o que está no prompt: uma busca ruim leva a uma resposta ruim",
      "Mais peças significam mais pontos de falha para monitorar",
    ],
    alternatives: ["Fine-tuning, quando o problema é estilo ou formato e não falta de informação", "Um modelo menor e local, quando latência ou privacidade pesam mais que qualidade"],
  },
  knowledgeCheck: [
    {
      id: "stale-answer",
      prompt: "A política de trocas da loja mudou ontem, e o assistente ainda responde com a regra antiga. Onde está o problema mais provável?",
      options: [
        "O modelo precisa ser pré-treinado de novo",
        "A base de documentos que a busca consulta ainda tem a política antiga",
        "A GPU está lenta",
        "A janela de contexto é pequena demais",
      ],
      correct: 1,
      explanation: "Com RAG, o modelo responde com os trechos que a busca entrega. Atualizar a base resolve, sem treinar nada.",
      lesson: "00-06",
    },
    {
      id: "slow-first-token",
      prompt: "Os usuários reclamam que o assistente demora para começar a responder. Qual mudança ataca o tempo até o primeiro token?",
      options: [
        "Pedir respostas mais longas",
        "Mandar menos tokens no prompt, por exemplo com menos trechos ou um histórico resumido",
        "Desligar o streaming",
        "Trocar a fila por uma fila maior",
      ],
      correct: 1,
      explanation: "O primeiro token só sai depois que o prompt inteiro é lido. Prompts menores encurtam essa espera.",
      lesson: "00-06",
    },
  ],
  related: ["00-05", "00-07", "08-01"],
  references: [
    { title: "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks", url: "https://arxiv.org/abs/2005.11401", kind: "paper" },
    { title: "Efficient Memory Management for Large Language Model Serving with PagedAttention", url: "https://arxiv.org/abs/2309.06180", kind: "paper" },
    { title: "vLLM: documentação", url: "https://docs.vllm.ai/", kind: "docs" },
  ],
};

export default lesson;
