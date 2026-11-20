import type { LessonContent } from "../../../types/content";

// Memória de um agente de viagens, calculada aqui. Seis memórias de brinquedo, cada uma com um embedding 2D,
// a idade em horas e uma importância de 1 a 10. O score de recuperação segue a ideia do Generative Agents:
// soma de recência (decaimento exponencial por hora), importância e relevância (cosseno com a pergunta), cada
// parte normalizada entre 0 e 1 e com pesos iguais. As 3 melhores entram no contexto; o resto fica no banco.

interface Memory {
  id: string;
  label: string;
  text: string;
  kind: "episódica" | "semântica" | "procedural";
  coords: [number, number];
  hoursAgo: number;
  importance: number;
}

const memories: Memory[] = [
  { id: "m1", label: "voos pela manhã", text: "O cliente prefere voos pela manhã.", kind: "semântica", coords: [0.95, 0.2], hoursAgo: 240, importance: 7 },
  { id: "m2", label: "hotel recusado", text: "A reserva do hotel em Lisboa falhou: o cartão foi recusado.", kind: "episódica", coords: [0.7, 0.6], hoursAgo: 48, importance: 8 },
  { id: "m3", label: "vegetariano", text: "O cliente é vegetariano.", kind: "semântica", coords: [0.1, 0.95], hoursAgo: 2000, importance: 6 },
  { id: "m4", label: "passeio em sintra", text: "Pediu um orçamento de passeio em Sintra.", kind: "episódica", coords: [0.6, 0.5], hoursAgo: 5, importance: 4 },
  { id: "m5", label: "papo sobre o tempo", text: "Conversou sobre a previsão do tempo.", kind: "episódica", coords: [0.3, 0.8], hoursAgo: 1, importance: 2 },
  { id: "m6", label: "regra de reembolso", text: "Antes de qualquer reembolso, confirmar com o cliente.", kind: "procedural", coords: [-0.3, 0.6], hoursAgo: 300, importance: 9 },
];

const QUERY = "Reserve um voo para Lisboa na sexta";
const queryCoords: [number, number] = [0.9, 0.3];
const DECAY = 0.995;
const TOP_K = 3;

const cosine = (a: [number, number], b: [number, number]) =>
  (a[0] * b[0] + a[1] * b[1]) / (Math.hypot(a[0], a[1]) * Math.hypot(b[0], b[1]));
const minMax = (values: number[]) => {
  const low = Math.min(...values);
  const high = Math.max(...values);
  return values.map((value) => (high === low ? 0 : (value - low) / (high - low)));
};

const relevance = minMax(memories.map((memory) => cosine(memory.coords, queryCoords)));
const recency = minMax(memories.map((memory) => DECAY ** memory.hoursAgo));
const importance = minMax(memories.map((memory) => memory.importance));
const scores = memories.map((_, index) => relevance[index] + recency[index] + importance[index]);

const rankBy = (values: number[]) =>
  memories.map((_, index) => index).sort((a, b) => values[b] - values[a]);
const ranked = rankBy(scores);
const chosen = ranked.slice(0, TOP_K);
const byRelevance = rankBy(relevance).slice(0, TOP_K);
const cutoffScore = scores[chosen[TOP_K - 1]];
const mostRelevant = memories[byRelevance[0]];
const freshest = memories[rankBy(recency)[0]];
const freshestIndex = memories.indexOf(freshest);
const freshestScore = scores[freshestIndex];

// Tokens: estimativa de 4 caracteres por token, como nas aulas do módulo 05.
const estimateTokens = (text: string) => Math.ceil(text.length / 4);
const averageMemoryTokens = memories.reduce((sum, memory) => sum + estimateTokens(memory.text), 0) / memories.length;
const STORE_SIZE = 800;
const storeTokens = Math.round(STORE_SIZE * averageMemoryTokens);
const injectedTokens = chosen.reduce((sum, index) => sum + estimateTokens(memories[index].text), 0);
const savings = 1 - injectedTokens / storeTokens;

const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");
const percent = (value: number) => `${(value * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
const names = (indexes: number[]) => indexes.map((index) => `“${memories[index].label}”`).join(", ");

const lesson: LessonContent = {
  id: "12-07",
  subtitle: "O que o agente guarda, onde guarda e como decide o que lembrar na hora certa, sem encher o contexto.",
  objectives: [
    "Separar memória de curto prazo (o contexto) de memória de longo prazo (fora dele)",
    "Classificar memórias em episódica, semântica e procedural",
    "Calcular um score de recuperação com recência, importância e relevância",
    "Proteger a escrita na memória contra dados sensíveis e injeção",
  ],
  steps: [
    {
      id: "desk",
      shortTitle: "Mesa e caderno",
      title: "A mesa de trabalho e o caderno",
      tag: "context",
      body: [
        "Pense numa agente de viagens humana. Na mesa estão só os papéis do cliente que ela atende agora. Na gaveta fica o caderno com tudo o que ela aprendeu sobre os clientes nos últimos anos. Ela não espalha o caderno inteiro na mesa: procura a página certa quando precisa.",
        "Um [[agente|agent]] funciona igual. A [[memória de curto prazo|short-term-memory]] é o que está na [[janela de contexto|context-window]] da execução atual: mensagens, resultados de ferramentas, o plano. Quando a execução termina, ela some. A [[memória de longo prazo|long-term-memory]] fica fora do contexto, num banco ou em arquivos, e só volta para a mesa quando uma busca a traz.",
      ],
      keyIdea: "O modelo não lembra de nada entre execuções: memória de longo prazo é dado guardado fora e buscado de volta.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "user", kind: "user", label: "cliente", col: 0, row: 0.5 },
              { id: "agent", kind: "agent", label: "agente", col: 1, row: 0.5 },
              { id: "context", kind: "context", label: "mesa: contexto", col: 2, row: 0 },
              { id: "memory", kind: "memory", label: "caderno: memória", col: 2, row: 1 },
              { id: "search", kind: "vector-db", label: "busca", col: 3, row: 1 },
            ],
            edges: [
              { from: "user", to: "agent", label: "pedido" },
              { from: "agent", to: "context", label: "curto prazo" },
              { from: "agent", to: "memory", label: "grava" },
              { from: "memory", to: "search" },
              { from: "search", to: "context", label: "top-3" },
            ],
            active: "context",
          },
        ],
      },
      alt: "O cliente faz um pedido ao agente. O contexto, em destaque, é a memória de curto prazo; o agente grava fatos numa memória de longo prazo, e uma busca traz de volta só as 3 mais úteis para o contexto.",
    },
    {
      id: "kinds",
      shortTitle: "Tipos",
      title: "Quatro tipos de memória",
      tag: "mechanism",
      body: [
        "A agente humana lembra de coisas diferentes de jeitos diferentes. Ela lembra que “na semana passada o cartão do cliente foi recusado” (um acontecimento), que “o cliente é vegetariano” (um fato) e de como se emite uma passagem (um procedimento). Ninguém guarda essas três coisas no mesmo lugar.",
        "O framework CoALA (Sumers et al., 2023) organiza a memória de agentes de linguagem do mesmo jeito: memória de trabalho (o contexto), [[memória episódica|episodic-memory]] (experiências passadas, como o que o Reflexion guarda), [[memória semântica|semantic-memory]] (fatos sobre o mundo e o usuário) e [[memória procedural|procedural-memory]] (o saber fazer, nos pesos, no [[system prompt|system-prompt]] e nos arquivos de instrução). A matriz mostra onde cada uma vive e quanto dura.",
      ],
      keyIdea: "Acontecimentos, fatos e procedimentos são memórias diferentes, com armazenamento e tempo de vida diferentes.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "kinds",
            piece: "matrix",
            rows: ["trabalho", "episódica", "semântica", "procedural"],
            cols: ["no contexto", "em banco", "dura a sessão", "dura sempre"],
            values: [
              [1, 0, 1, 0],
              [0, 1, 0, 1],
              [0, 1, 0, 1],
              [1, 0, 0, 1],
            ],
            scale: { min: 0, max: 1 },
            highlight: { row: 1, col: 1 },
            color: "module-12",
          },
        ],
      },
      alt: "Matriz dos quatro tipos de memória: a de trabalho vive no contexto e dura a sessão; a episódica e a semântica vivem em banco e duram entre sessões; a procedural está no prompt e nos pesos e dura sempre. Em destaque, a episódica no banco.",
    },
    {
      id: "relevance",
      shortTitle: "Relevância",
      title: "Buscar memórias pelo sentido",
      tag: "mechanism",
      body: [
        `Chega o pedido “${QUERY}”. Para achar a página certa do caderno, cada memória foi guardada com um [[embedding|embedding]], e a pergunta também vira um vetor. As memórias mais próximas da pergunta são as mais relevantes: aqui, ${names(byRelevance)}.`,
        `É a mesma [[busca semântica|semantic-search]] do RAG, aplicada às lembranças do agente. A mais relevante é “${mostRelevant.label}”, com cosseno ${fixed(cosine(mostRelevant.coords, queryCoords))}. Mas só relevância não basta: uma memória pode ser parecida com a pergunta e estar velha, ou ser pouco parecida e muito importante, como uma regra de segurança.`,
      ],
      keyIdea: "Relevância é a busca vetorial de sempre: o vetor da pergunta contra os vetores das memórias.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "space",
            piece: "vector-space",
            points: [
              ...memories.map((memory) => ({ id: memory.id, label: memory.label, coords: memory.coords })),
              { id: "q", label: "voo para lisboa", coords: queryCoords, color: "module-12" as const },
            ],
            vectors: [{ to: "q" }],
            query: "q",
            neighbors: TOP_K,
          },
        ],
      },
      alt: `Plano com as ${memories.length} memórias e a pergunta “voo para lisboa”; as ${TOP_K} vizinhas mais próximas em destaque são ${names(byRelevance)}.`,
    },
    {
      id: "score",
      shortTitle: "Score",
      title: "Recência + importância + relevância",
      tag: "example",
      body: [
        `O Generative Agents (Park et al., 2023) soma três notas para decidir o que lembrar: recência, importância e relevância. Na aula, a recência é multiplicada por ${fixed(DECAY, 3)} a cada hora, a importância vem de uma nota de 1 a 10 dada quando a memória foi gravada, e cada parte é normalizada entre 0 e 1. As ${TOP_K} maiores somas, ${names(chosen)}, entram no contexto.`,
        `“${freshest.label}” é a mais recente, mas soma só ${fixed(freshestScore)} e fica fora: o corte é ${fixed(cutoffScore)}. Num banco com ${integer(STORE_SIZE)} memórias de uns ${integer(averageMemoryTokens)} tokens, colocar tudo no prompt custaria ${integer(storeTokens)} tokens; as ${TOP_K} escolhidas custam ${integer(injectedTokens)}, uma economia de ${percent(savings)}.`,
      ],
      keyIdea: "Lembrar é ranquear: só o que é relevante, recente ou importante o bastante volta ao contexto.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "scores",
            piece: "chart",
            kind: "bar",
            series: memories.map((memory, index) => ({ label: memory.label, value: Number(scores[index].toFixed(2)) })),
            max: 3,
            cutoff: { mode: "threshold", value: Number(cutoffScore.toFixed(2)), label: `top-${TOP_K}` },
            highlight: chosen[0],
            color: "module-12",
          },
          {
            id: "budget",
            piece: "metrics-panel",
            metrics: [
              { id: "all", label: `banco inteiro (${integer(STORE_SIZE)})`, value: `${integer(storeTokens)} tokens`, color: "danger" },
              { id: "top", label: `top-${TOP_K} no contexto`, value: `${integer(injectedTokens)} tokens`, color: "success" },
              { id: "saved", label: "economia", value: percent(savings) },
            ],
            highlight: "top",
          },
        ],
      },
      alt: `Barras com o score de cada memória, de 0 a 3: ${memories.map((memory, index) => `${memory.label} ${fixed(scores[index])}`).join(", ")}. O corte do top-${TOP_K} fica em ${fixed(cutoffScore)}. O painel compara ${integer(storeTokens)} tokens do banco inteiro com ${integer(injectedTokens)} tokens das memórias escolhidas.`,
    },
    {
      id: "poison",
      shortTitle: "Envenenar",
      title: "O que entra na memória fica",
      tag: "tradeoff",
      body: [
        "Um caderno também pode ser sabotado. Se alguém escreve nele “este cliente sempre aprova reembolsos sem confirmar”, a agente vai ler isso como verdade na próxima semana. E se ela anota o número do cartão do cliente, o caderno vira um risco.",
        "Memória de longo prazo é uma [[prompt injection indireta|indirect-prompt-injection]] com efeito retardado: um texto malicioso lido numa página ou num e-mail, se gravado, volta em toda execução futura. Por isso a escrita passa por um [[guardrail|guardrail]]: gravar só fatos de fontes confiáveis, nunca segredos nem dados de pagamento, com origem, data e escopo por usuário, e com como apagar. Memórias erradas ou vencidas precisam de correção e expiração, não só de acúmulo.",
      ],
      keyIdea: "Trate a escrita na memória como uma porta de entrada: valide, registre a origem e não guarde segredos.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "web", kind: "cloud", label: "página lida", col: 0, row: 0 },
              { id: "agent", kind: "agent", label: "agente", col: 1, row: 0.5 },
              { id: "user", kind: "user", label: "cliente", col: 0, row: 1 },
              { id: "guard", kind: "guardrail", label: "filtro de escrita", col: 2, row: 0.5 },
              { id: "memory", kind: "memory", label: "memória", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "web", to: "agent", label: "texto" },
              { from: "user", to: "agent", label: "preferência" },
              { from: "agent", to: "guard", label: "gravar?" },
              { from: "guard", to: "memory", label: "fato + origem" },
              { from: "web", to: "memory", label: "injeção salva", variant: "alternative" },
            ],
            active: "guard",
          },
        ],
      },
      alt: "O agente lê uma página e ouve uma preferência do cliente; antes de gravar, um filtro de escrita, em destaque, só deixa passar fatos com origem. O caminho tracejado mostra uma injeção da página indo direto para a memória, o que o filtro deve impedir.",
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Gravar, buscar, esquecer",
      tag: "summary",
      body: [
        "Memória de agente é um ciclo: perceber algo útil, decidir se vale guardar, gravar com origem, buscar por relevância, recência e importância, injetar só o top-k no contexto e esquecer o que venceu. Frameworks oferecem as duas pontas: o LangGraph separa checkpointers (estado de uma thread) de stores (memória entre threads), e a API da Anthropic tem uma ferramenta de memória em arquivos que você controla.",
        "Mesmo com memória boa, o contexto da execução atual cresce a cada iteração. A próxima aula trata disso: gerenciar o contexto enquanto o agente trabalha. O módulo 14 volta à memória do ponto de vista do harness.",
      ],
      keyIdea: "Memória = gravar com critério + buscar com score + colocar pouco no contexto + esquecer o que venceu.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "cycle",
            piece: "pipeline",
            display: "chips",
            stages: [
              { id: "perceive", label: "perceber" },
              { id: "decide", label: "vale guardar?" },
              { id: "write", label: "gravar com origem", color: "module-12" },
              { id: "search", label: "buscar por score" },
              { id: "inject", label: "top-k no contexto", color: "brand" },
              { id: "forget", label: "expirar e corrigir" },
            ],
          },
        ],
      },
      alt: "Fluxo em chips: perceber, decidir se vale guardar, gravar com origem, buscar por score, colocar o top-k no contexto e expirar e corrigir.",
    },
  ],
  realWorldExample:
    "O LangGraph separa a memória de curto prazo (checkpointers, por thread) da de longo prazo (stores, compartilhados entre threads), e a API da Anthropic oferece uma ferramenta de memória com que o Claude guarda e consulta informações entre conversas em arquivos controlados pela aplicação.",
  code: {
    language: "python",
    source: `import math

def score(memory, query_vec, now_h, decay=0.995):
    recency = decay ** (now_h - memory.created_h)
    relevance = cosine(memory.vec, query_vec)
    return recency, memory.importance, relevance

def retrieve(memories, query_vec, now_h, k=3):
    parts = [score(m, query_vec, now_h) for m in memories]
    cols = [normalize([p[i] for p in parts]) for i in range(3)]  # cada parte em [0, 1]
    total = [sum(col[j] for col in cols) for j in range(len(memories))]
    ranked = sorted(range(len(memories)), key=lambda j: -total[j])
    return [memories[j] for j in ranked[:k]]`,
    caption: "Recuperação no estilo do Generative Agents: recência, importância e relevância normalizadas e somadas; só o top-k vai para o prompt.",
  },
  tradeOffs: {
    pros: [
      "O agente personaliza e aprende com execuções passadas sem treinar o modelo",
      "Só o top-k entra no contexto, então o custo não cresce com o tamanho do banco",
      "Memórias com origem e data podem ser auditadas, corrigidas e apagadas",
    ],
    cons: [
      "Uma memória errada ou injetada contamina todas as execuções futuras",
      "Os pesos do score e o limiar exigem ajuste e avaliação",
      "Guardar dados de usuários exige escopo, consentimento e política de exclusão",
    ],
    alternatives: [
      "Só histórico da conversa, quando cada sessão é independente",
      "RAG sobre documentos, quando o conhecimento é da empresa e não do usuário",
    ],
  },
  knowledgeCheck: [
    {
      id: "which-memory",
      prompt: "Depois de uma tentativa que falhou, o agente grava “o deploy falhou porque faltou rodar a migração antes”. Que tipo de memória é essa?",
      options: [
        "Memória de trabalho, porque está no contexto",
        "Memória episódica: o registro de uma experiência e da lição tirada dela",
        "Memória procedural nos pesos do modelo",
        "Nenhuma: agentes não guardam experiências",
      ],
      correct: 1,
      explanation: "É um acontecimento com o que deu errado, consultado em situações parecidas. É o que o Reflexion guarda no seu buffer de memória episódica.",
      lesson: "12-07",
    },
    {
      id: "stale-memory",
      prompt: "O agente sempre traz uma preferência de três anos atrás que o cliente já mudou. Qual ajuste resolve melhor?",
      options: [
        "Aumentar o k para trazer mais memórias",
        "Dar peso à recência no score e corrigir ou expirar a memória vencida quando o fato muda",
        "Apagar o banco de memórias inteiro",
        "Subir a temperatura do modelo",
      ],
      correct: 1,
      explanation: "Só relevância não distingue o fato velho do novo. Recência no score e atualização da memória quando o fato muda evitam lembrar o que não vale mais.",
      lesson: "12-07",
    },
  ],
  related: ["12-06", "12-08", "08-01"],
  references: [
    { title: "Sumers et al. (2023), Cognitive Architectures for Language Agents (CoALA)", url: "https://arxiv.org/abs/2309.02427", kind: "paper" },
    { title: "Park et al. (2023), Generative Agents: Interactive Simulacra of Human Behavior", url: "https://arxiv.org/abs/2304.03442", kind: "paper" },
    { title: "Packer et al. (2023), MemGPT: Towards LLMs as Operating Systems", url: "https://arxiv.org/abs/2310.08560", kind: "paper" },
  ],
};

export default lesson;
