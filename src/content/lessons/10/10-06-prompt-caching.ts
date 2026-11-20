import type { LessonContent } from "../../../types/content";

// Prompt caching em contas. O casamento é por prefixo: o KV cache é guardado em blocos de 16 tokens
// (o tamanho de bloco padrão do vLLM), e o hash de cada bloco inclui o hash do bloco anterior.
// Uma árvore de prefixos de brinquedo (a ideia da RadixAttention do SGLang) mede quantos tokens o cache poupa.
// O custo usa os multiplicadores documentados pela Anthropic: escrever no cache custa 1,25 × o preço de entrada
// e ler custa 0,1 ×, com validade padrão de 5 minutos. O preço por milhão de tokens é só um exemplo.
// O prefill usa o teto teórico de um modelo de 7B numa H100 (cerca de 989 TFLOPS densos em BF16).

const fixed = (value: number, digits = 1) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");
const percent = (value: number) => `${Math.round(value * 100)}%`;
const money = (value: number) => `US$ ${fixed(value, 3)}`;

// Passo 2: um prompt de 10.000 tokens de prefixo estável, em blocos de 16.
const BLOCK_TOKENS = 16;
const PREFIX_TOKENS = 10_000;
const QUESTION_TOKENS = 200;
const prefixBlocks = Math.floor(PREFIX_TOKENS / BLOCK_TOKENS);
const promptPieces = ["[sistema]", "regras", "manual p. 1", "manual p. 2", "…", "manual p. 40", "pergunta nova"];
const cachedBars = promptPieces.map((_, index) => (index < promptPieces.length - 1 ? 1 : 0));
const timestampPieces = ["[18:42:07]", "[sistema]", "regras", "manual p. 1", "…", "manual p. 40", "pergunta nova"];
const timestampBars = timestampPieces.map(() => 0);

// Passo 3: árvore de prefixos. Cada nó é processado uma vez; sem cache, cada pedido processa o caminho inteiro.
const nodeTokens: Record<string, number> = { system: 2000, manualA: 8000, manualB: 6000 };
const requests = [
  { id: "q1", path: ["system", "manualA"] },
  { id: "q2", path: ["system", "manualA"] },
  { id: "q3", path: ["system", "manualB"] },
  { id: "q4", path: ["system", "manualA"] },
  { id: "q5", path: ["system", "manualB"] },
];
const tokensOf = (path: string[]) => path.reduce((total, node) => total + nodeTokens[node], 0) + QUESTION_TOKENS;
const withoutTree = requests.reduce((total, request) => total + tokensOf(request.path), 0);
const uniqueNodes = new Set(requests.flatMap((request) => request.path));
const withTree = [...uniqueNodes].reduce((total, node) => total + nodeTokens[node], 0) + requests.length * QUESTION_TOKENS;
const treeHitRate = 1 - withTree / withoutTree;

// Passo 4: 20 perguntas no mesmo prefixo dentro da validade do cache.
const CALLS = 20;
const WRITE = 1.25;
const READ = 0.1;
const EXAMPLE_PRICE_PER_M = 3;
const noCacheUnits = CALLS * (PREFIX_TOKENS + QUESTION_TOKENS);
const firstCallUnits = PREFIX_TOKENS * WRITE + QUESTION_TOKENS;
const laterCallUnits = PREFIX_TOKENS * READ + QUESTION_TOKENS;
const cacheUnits = firstCallUnits + (CALLS - 1) * laterCallUnits;
const saving = 1 - cacheUnits / noCacheUnits;
const cost = (units: number) => (units / 1e6) * EXAMPLE_PRICE_PER_M;
const singleUseOverhead = WRITE - 1;
const PARAMS = 7e9;
const PEAK_FLOPS = 989e12;
const prefillMs = (tokens: number) => ((2 * PARAMS * tokens) / PEAK_FLOPS) * 1000;
const ttftCold = prefillMs(PREFIX_TOKENS + QUESTION_TOKENS);
const ttftWarm = prefillMs(QUESTION_TOKENS);

const lesson: LessonContent = {
  id: "10-06",
  subtitle: "Como reaproveitar o KV cache do começo de prompt que muitos pedidos repetem, quanto isso corta de custo e de espera, e o que quebra o cache.",
  objectives: [
    "Explicar por que o prompt caching só funciona com prefixo idêntico",
    "Descrever o cache em blocos com hash encadeado e a árvore de prefixos",
    "Calcular a economia com os multiplicadores de escrita e leitura do cache",
    "Ordenar um prompt para maximizar o cache hit rate",
  ],
  steps: [
    {
      id: "same-start",
      shortTitle: "Mesmo começo",
      title: "Todo pedido começa igual",
      tag: "context",
      body: [
        "Numa cozinha de restaurante, ninguém pica cebola do zero a cada prato: a mise en place fica pronta e cada pedido só adiciona o que é dele. Num assistente, o “pré-preparo” é o prompt de sistema, as instruções, as ferramentas e às vezes um manual inteiro, repetidos em todo pedido.",
        "O [[prefill|prefill]] desse começo gera sempre o mesmo [[KV cache|kv-cache]]. O [[prompt caching|prompt-caching]] guarda esse cache depois do primeiro pedido e, nos seguintes, pula o prefill da parte repetida: só a pergunta nova passa pelo modelo. Dentro dos motores de inferência, a mesma ideia se chama [[prefix caching|prefix-caching]].",
      ],
      keyIdea: "O que se repete no começo do prompt pode ser processado uma vez e lido muitas.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "users", kind: "user", label: "muitos usuários", col: 0, row: 0.5 },
              { id: "app", kind: "app", label: "mesmo sistema", col: 1, row: 0.5 },
              { id: "cache", kind: "kv-cache", label: "prefixo pronto", col: 2, row: 0 },
              { id: "llm", kind: "llm", label: "só a pergunta", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "users", to: "app", label: "perguntas" },
              { from: "app", to: "cache", label: "prefixo" },
              { from: "cache", to: "llm", label: "kv pronto" },
              { from: "app", to: "llm", label: "pergunta nova" },
            ],
            active: "cache",
          },
        ],
      },
      alt: "Muitos usuários mandam perguntas a um app com o mesmo prompt de sistema; o prefixo já processado sai do cache, em destaque, e o modelo processa só a pergunta nova.",
    },
    {
      id: "prefix",
      shortTitle: "Prefixo",
      title: "Só vale o começo idêntico",
      tag: "mechanism",
      body: [
        "A key e o value de um token dependem de todos os tokens antes dele, por causa da attention causal. Então o cache só serve enquanto o começo é idêntico, token a token. Mudou uma vírgula na posição 50, tudo dali para a frente precisa ser recalculado.",
        `Os motores guardam o cache em blocos de ${BLOCK_TOKENS} tokens, e o hash de cada bloco mistura o hash do bloco anterior com os tokens dele. Um prefixo de ${integer(PREFIX_TOKENS)} tokens vira ${integer(prefixBlocks)} blocos, e um pedido novo procura os hashes em ordem até o primeiro que falta. Na cena, as barras marcam o que veio do cache: tudo menos a pergunta nova. Se o prompt começasse com a hora atual, o primeiro bloco mudaria a cada segundo e nenhum dos ${integer(prefixBlocks)} blocos seria achado.`,
      ],
      keyIdea: "Prompt caching casa prefixos, não pedaços: a primeira diferença invalida tudo o que vem depois.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [{ id: "prompt", piece: "token-stream", tokens: promptPieces, bars: cachedBars, color: "module-10" }],
      },
      alt: `Prompt em pedaços: ${promptPieces.join(", ")}. Todos têm barra cheia, vindos do cache, menos a pergunta nova. O prefixo de ${integer(PREFIX_TOKENS)} tokens ocupa ${integer(prefixBlocks)} blocos de ${BLOCK_TOKENS}.`,
    },
    {
      id: "tree",
      shortTitle: "Árvore",
      title: "Uma árvore de prefixos compartilhados",
      tag: "mechanism",
      body: [
        "Quando pedidos diferentes compartilham partes diferentes do começo, os prefixos formam uma árvore: o prompt de sistema no tronco, um manual em cada galho, as perguntas nas folhas. O SGLang guarda o cache exatamente assim, numa árvore radix (RadixAttention), e o vLLM chega ao mesmo efeito com os hashes encadeados.",
        `Com ${requests.length} perguntas, ${requests.filter((request) => request.path.includes("manualA")).length} sobre o manual A (${integer(nodeTokens.manualA)} tokens) e ${requests.filter((request) => request.path.includes("manualB")).length} sobre o B (${integer(nodeTokens.manualB)}), sob um sistema de ${integer(nodeTokens.system)} tokens: sem cache, o prefill processa ${integer(withoutTree)} tokens. Com a árvore, cada nó é processado uma vez: ${integer(withTree)} tokens. O [[cache hit rate|cache-hit-rate]] em tokens é de ${percent(treeHitRate)}.`,
      ],
      keyIdea: "Cada nó da árvore de prefixos é processado uma vez, não importa quantas folhas dependam dele.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "radix",
            piece: "graph",
            nodes: [
              { id: "system", label: `sistema · ${integer(nodeTokens.system)}`, x: 0.12, y: 0.5, color: "module-10" },
              { id: "manualA", label: `manual A · ${integer(nodeTokens.manualA)}`, x: 0.45, y: 0.25 },
              { id: "manualB", label: `manual B · ${integer(nodeTokens.manualB)}`, x: 0.45, y: 0.75 },
              { id: "q1", label: "q1", x: 0.85, y: 0.08 },
              { id: "q2", label: "q2", x: 0.85, y: 0.25 },
              { id: "q4", label: "q4", x: 0.85, y: 0.42 },
              { id: "q3", label: "q3", x: 0.85, y: 0.66 },
              { id: "q5", label: "q5", x: 0.85, y: 0.86 },
            ],
            edges: [
              { from: "system", to: "manualA", weight: 0.9 },
              { from: "system", to: "manualB", weight: 0.7 },
              { from: "manualA", to: "q1", weight: 0.3 },
              { from: "manualA", to: "q2", weight: 0.3 },
              { from: "manualA", to: "q4", weight: 0.3 },
              { from: "manualB", to: "q3", weight: 0.3 },
              { from: "manualB", to: "q5", weight: 0.3 },
            ],
            path: ["system", "manualA", "q4"],
            highlight: ["system", "manualA"],
          },
        ],
      },
      alt: `Árvore de prefixos: o sistema de ${integer(nodeTokens.system)} tokens no tronco, os manuais A e B nos galhos e cinco perguntas nas folhas. A pergunta q4 reaproveita o sistema e o manual A. Sem cache, ${integer(withoutTree)} tokens de prefill; com a árvore, ${integer(withTree)}, hit rate de ${percent(treeHitRate)}.`,
    },
    {
      id: "bill",
      shortTitle: "A conta",
      title: "Escrever custa um pouco mais, ler custa um décimo",
      tag: "example",
      body: [
        `Na API da Anthropic, escrever um trecho no cache custa ${fixed(WRITE, 2)} vezes o preço normal de entrada, ler custa ${fixed(READ, 1)} vez, e o cache vale por 5 minutos (renovados a cada uso), com opção de 1 hora. Com um prefixo de ${integer(PREFIX_TOKENS)} tokens, perguntas de ${QUESTION_TOKENS} e ${CALLS} chamadas na validade: sem cache, ${integer(noCacheUnits)} tokens cobrados. Com cache, ${integer(firstCallUnits)} na primeira e ${integer(laterCallUnits)} em cada uma das outras, ${integer(cacheUnits)} no total: ${percent(saving)} a menos.`,
        `Num preço de exemplo de US$ ${EXAMPLE_PRICE_PER_M} por milhão de tokens de entrada, são ${money(cost(noCacheUnits))} contra ${money(cost(cacheUnits))}. A espera também cai: num 7B numa H100, o teto teórico do prefill do prompt inteiro é ${fixed(ttftCold)} ms e o da pergunta sozinha, ${fixed(ttftWarm)} ms. Um prefixo usado uma vez só sai ${percent(singleUseOverhead)} mais caro; a primeira leitura já paga a escrita.`,
      ],
      keyIdea: "Com escrita a 1,25 × e leitura a 0,1 ×, um único reuso já compensa o cache.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "bill",
            piece: "metrics-panel",
            metrics: [
              { id: "without", label: "sem cache", value: `${integer(noCacheUnits)} tokens`, color: "danger" },
              { id: "with", label: "com cache", value: `${integer(cacheUnits)} tokens`, color: "success" },
              { id: "saving", label: "economia", value: percent(saving) },
              { id: "ttft", label: "prefill (7B, teto)", value: `${fixed(ttftCold)} → ${fixed(ttftWarm)} ms` },
            ],
            highlight: "saving",
          },
        ],
      },
      alt: `${CALLS} chamadas com prefixo de ${integer(PREFIX_TOKENS)} tokens: ${integer(noCacheUnits)} tokens cobrados sem cache e ${integer(cacheUnits)} com cache, ${percent(saving)} a menos. O prefill teórico cai de ${fixed(ttftCold)} ms para ${fixed(ttftWarm)} ms.`,
    },
    {
      id: "breakers",
      shortTitle: "O que quebra",
      title: "Estável primeiro, volátil no fim",
      tag: "tradeoff",
      body: [
        "O cache quebra com qualquer coisa que muda no começo: a data e a hora no prompt de sistema, o nome do usuário antes das instruções, ferramentas em ordem diferente, um JSON serializado com as chaves em outra ordem. A regra é montar o prompt do mais estável para o mais volátil: instruções e ferramentas, depois documentos, depois o histórico e, por último, a pergunta.",
        "O cache também expira e é despejado quando a memória enche, e é separado por modelo: trocar de modelo começa do zero. Num serviço com vários clientes, o cache não pode vazar entre eles; os provedores isolam o cache por organização. Meça sempre o hit rate: os campos de uso da API dizem quantos tokens foram lidos e escritos no cache em cada chamada.",
      ],
      keyIdea: "Um carimbo de hora no topo do prompt zera o cache de todos os pedidos.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "app", kind: "app", label: "hora no topo", col: 0, row: 0.5 },
              { id: "cache", kind: "kv-cache", label: "prefixo pronto", col: 1, row: 0 },
              { id: "miss", kind: "no-result", label: "miss: hash novo", col: 1, row: 1 },
              { id: "llm", kind: "llm", label: "prefill inteiro", col: 2, row: 0.5 },
            ],
            edges: [
              { from: "app", to: "cache", label: "1º bloco mudou", variant: "alternative" },
              { from: "app", to: "miss" },
              { from: "miss", to: "llm", label: `${integer(PREFIX_TOKENS)} tokens` },
            ],
            active: "miss",
          },
          { id: "prompt", piece: "token-stream", tokens: timestampPieces, bars: timestampBars, color: "danger" },
        ],
      },
      alt: "Com a hora no topo do prompt, o primeiro bloco muda a cada pedido: o caminho tracejado até o cache falha, o pedido cai no miss, em destaque, e o modelo refaz o prefill inteiro. Nenhum pedaço do prompt tem barra de cache.",
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Processe uma vez, leia muitas",
      tag: "summary",
      body: [
        "Prompt caching reaproveita o KV cache de um prefixo idêntico, em blocos achados por hash ou numa árvore de prefixos. Corta o custo de entrada e o tempo até o primeiro token, desde que o prompt comece sempre igual e o reuso aconteça dentro da validade.",
        "O cache economiza prefill. A próxima aula ataca o decode: colocar vários pedidos na mesma passada do modelo, o batching.",
      ],
      keyIdea: "Prompt caching é ordem e disciplina: o estável no começo, o volátil no fim, e o hit rate medido.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "rules",
            piece: "pipeline",
            display: "chips",
            stages: [
              { id: "stable", label: "instruções e ferramentas" },
              { id: "docs", label: "documentos", color: "module-10" },
              { id: "history", label: "histórico" },
              { id: "question", label: "pergunta nova" },
              { id: "measure", label: "medir o hit rate", color: "brand" },
            ],
          },
        ],
      },
      alt: "Fluxo em chips da ordem do prompt: instruções e ferramentas, documentos, histórico, pergunta nova, e por fim medir o hit rate.",
    },
  ],
  realWorldExample:
    "Na API da Anthropic, o desenvolvedor marca até onde o prompt deve ser guardado com cache_control. A resposta traz cache_creation_input_tokens e cache_read_input_tokens, e a documentação lista a escrita a 1,25 × o preço de entrada, a leitura a 0,1 × e a validade padrão de 5 minutos. No vLLM, o automatic prefix caching faz o mesmo dentro do servidor, sem marcação: cada bloco de KV cache é identificado pelo hash do prefixo e reaproveitado por qualquer pedido que comece igual.",
  code: {
    language: "python",
    source: `import hashlib

BLOCK = 16  # tokens por bloco de KV cache

def block_hashes(tokens):
    """Hash de cada bloco completo, encadeado com o hash do bloco anterior."""
    hashes, parent = [], ""
    for start in range(0, len(tokens) // BLOCK * BLOCK, BLOCK):
        block = ",".join(map(str, tokens[start:start + BLOCK]))
        parent = hashlib.sha256((parent + block).encode()).hexdigest()
        hashes.append(parent)
    return hashes

cache = set()
def cached_tokens(tokens):
    hits = 0
    for h in block_hashes(tokens):
        if h not in cache:
            break
        hits += BLOCK
    cache.update(block_hashes(tokens))
    return hits`,
    caption: "O casamento por prefixo em blocos: o hash encadeado faz a busca parar no primeiro bloco diferente.",
  },
  tradeOffs: {
    pros: [
      "Corta o custo de entrada dos tokens repetidos para uma fração",
      "Reduz o tempo até o primeiro token, porque o prefill do prefixo some",
      "É exato: o cache reaproveitado é o mesmo que o modelo calcularia",
    ],
    cons: [
      "Só casa prefixos idênticos: qualquer mudança no começo zera o reuso",
      "A escrita custa mais caro, e o cache expira e pode ser despejado",
      "Prende memória da GPU com blocos que talvez não sejam lidos de novo",
    ],
    alternatives: [
      "Cache semântico de respostas, quando a pergunta inteira se repete",
      "Prompts mais curtos, quando o prefixo não se repete o bastante",
      "Batch API, quando a espera não importa e o desconto é maior",
    ],
  },
  knowledgeCheck: [
    {
      id: "timestamp",
      prompt: "Um time pôs “Agora são 14:32:05” na primeira linha do prompt de sistema, e o hit rate do cache caiu para zero. Por quê?",
      options: [
        "O cache não aceita números",
        "O começo do prompt muda a cada pedido, e o casamento é por prefixo: nenhum bloco depois da hora é reaproveitado",
        "O modelo esquece o prompt de sistema",
        "A hora deixa o prompt longo demais",
      ],
      correct: 1,
      explanation: "A key e o value de cada token dependem de tudo antes dele. Mudando o primeiro bloco, mudam os hashes de todos. A hora precisa ir para o fim, depois da parte estável.",
      lesson: "10-06",
    },
    {
      id: "single-use",
      prompt: "Com escrita no cache a 1,25 × o preço de entrada e leitura a 0,1 ×, quando marcar um prefixo para cache não compensa?",
      options: [
        "Quando ele é reusado 20 vezes em 5 minutos",
        "Quando ele é usado uma vez só dentro da validade: paga 25% a mais e nunca é lido",
        "Quando ele tem mais de 1.000 tokens",
        "Sempre compensa",
      ],
      correct: 1,
      explanation: "A escrita custa 0,25 × a mais; cada leitura economiza 0,9 ×. Um reuso já paga a escrita, mas sem reuso o cache só encarece.",
      lesson: "10-06",
    },
  ],
  related: ["10-05", "10-07", "08-16"],
  references: [
    { title: "Anthropic: Prompt caching", url: "https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching", kind: "docs" },
    { title: "Zheng et al. (2023), SGLang: Efficient Execution of Structured Language Model Programs", url: "https://arxiv.org/abs/2312.07104", kind: "paper" },
    { title: "vLLM: documentação", url: "https://docs.vllm.ai/", kind: "docs" },
  ],
};

export default lesson;
