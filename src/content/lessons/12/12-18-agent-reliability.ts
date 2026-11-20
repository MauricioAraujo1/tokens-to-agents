import type { LessonContent } from "../../../types/content";

// Confiabilidade com contas no arquivo: uma cadeia de passos em que cada um acerta com probabilidade P,
// independentes entre si (p^n); o mesmo com retries quando a falha é detectável, (1 − (1 − p)^(r + 1))^n;
// o pass^k do τ-bench para uma tarefa com chance P_TRIAL por tentativa (p^k, supondo tentativas
// independentes); as esperas de um backoff exponencial com teto; e uma cobrança repetida com e sem chave
// de idempotência. Todas as probabilidades são de brinquedo.

const percent = (value: number, digits = 1) =>
  `${(value * 100).toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits })}%`;
const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const money = (value: number) => `R$ ${value.toLocaleString("pt-BR")}`;

// Passo 1: erros que se acumulam numa cadeia.
const P = 0.95;
const STEPS = 10;
const chainLengths = Array.from({ length: STEPS }, (_, index) => index + 1);
const chain = (steps: number, p = P) => p ** steps;
const chainSeries = chainLengths.map((steps) => ({ label: `${steps} passos`, value: Number((chain(steps) * 100).toFixed(1)) }));
const chainAtEnd = chain(STEPS);

// Passo 2: retries para falhas detectáveis.
const stepWithRetries = (retries: number) => 1 - (1 - P) ** (retries + 1);
const chainWithRetries = (retries: number) => stepWithRetries(retries) ** STEPS;
const expectedAttempts = (retries: number) =>
  Array.from({ length: retries + 1 }, (_, attempt) => (1 - P) ** attempt).reduce((sum, value) => sum + value, 0);
const RETRIES = 2;

// Passo 3 e 4: cobrança repetida depois de um timeout, e as esperas do backoff.
const CHARGE = 150;
const ATTEMPTS_SENT = 2;
const chargedWithoutKey = CHARGE * ATTEMPTS_SENT;
const chargedWithKey = CHARGE;
const BASE_SECONDS = 1;
const CAP_SECONDS = 30;
const backoff = Array.from({ length: 6 }, (_, attempt) => Math.min(CAP_SECONDS, BASE_SECONDS * 2 ** attempt));
const worstWait = backoff.reduce((sum, value) => sum + value, 0);

// Passo 5: pass^k (todas as k tentativas acertam) contra pass@k (pelo menos uma acerta).
const P_TRIAL = 0.8;
const trials = Array.from({ length: 8 }, (_, index) => index + 1);
const passHat = (k: number) => P_TRIAL ** k;
const passAt = (k: number) => 1 - (1 - P_TRIAL) ** k;
const passHatSeries = trials.map((k) => ({ label: `k = ${k}`, value: Number((passHat(k) * 100).toFixed(1)) }));
const K = 8;

const exchange = [
  { from: "agent", to: "api", label: "cobrar + chave" },
  { from: "api", to: "agent", label: "timeout" },
  { from: "agent", to: "queue", label: `espera ${backoff[0]} s` },
  { from: "queue", to: "api", label: "mesma chave" },
  { from: "api", to: "db", label: "chave já vista" },
  { from: "api", to: "agent", label: "resposta salva" },
];
const RETRY = exchange.findIndex((message) => message.label === "mesma chave");
const nodeNames: Record<string, string> = { agent: "agente", api: "api de pagamentos", queue: "fila de retry", db: "registro de chaves" };

const lesson: LessonContent = {
  id: "12-18",
  subtitle: "Por que agentes que acertam quase sempre falham em tarefas longas, e as técnicas que seguram a cadeia: retries, backoff, idempotência, limites e avaliação repetida.",
  objectives: [
    "Calcular a chance de sucesso de uma cadeia de passos, com e sem retries",
    "Repetir chamadas com backoff exponencial e chave de idempotência sem efeito duplicado",
    "Medir consistência com pass^k em vez de um acerto isolado",
    "Combinar limites, checkpoints e avaliação num agente de produção",
  ],
  steps: [
    {
      id: "chain",
      shortTitle: "A corrente",
      title: "Uma corrente de elos quase perfeitos",
      tag: "context",
      body: [
        `Uma corrente com elos que aguentam o peso ${percent(P, 0)} das vezes parece forte. Mas a corrente inteira só aguenta se todos os elos aguentarem. Com ${STEPS} elos, ela segura só ${percent(chainAtEnd)} das vezes.`,
        `São os [[erros que se acumulam|compounding-errors]]: se cada passo de um [[agente|agent]] acerta com probabilidade p e os passos são independentes, n passos acertam com pⁿ. Com p = ${fixed(P)}, a curva cai de ${percent(chain(1))} para ${percent(chainAtEnd)} em ${STEPS} passos. A Anthropic cita esse risco como o preço da autonomia: quanto mais passos sem verificação, mais o erro de um passo contamina os seguintes.`,
      ],
      keyIdea: "Em tarefas longas, a confiabilidade de cada passo é elevada ao número de passos.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "chain",
            piece: "chart",
            kind: "line",
            series: chainSeries,
            max: 100,
            highlight: STEPS - 1,
            color: "module-12",
          },
        ],
      },
      alt: `Chance de sucesso da cadeia, em %, por número de passos com ${percent(P, 0)} cada: ${chainSeries.map((item) => `${item.label} ${fixed(item.value, 1)}`).join(", ")}.`,
    },
    {
      id: "retry",
      shortTitle: "Retry",
      title: "Trocar o elo antes de partir",
      tag: "mechanism",
      body: [
        "Se você percebe que um elo trincou, troca o elo e segue: a corrente não precisa partir. Mas isso só funciona com a trinca visível. Um elo que parece bom e não aguenta passa pela inspeção.",
        `O [[retry|retry]] é a troca do elo: quando a falha é detectável (timeout, erro da API, JSON fora do schema), o passo roda de novo. Com ${RETRIES} retries por passo, cada passo acerta com 1 − ${fixed(1 - P)}^${RETRIES + 1} = ${percent(stepWithRetries(RETRIES), 3)}, e os ${STEPS} passos com ${percent(chainWithRetries(RETRIES))}, contra ${percent(chainAtEnd)} sem retry. O custo médio sobe pouco: ${fixed(expectedAttempts(RETRIES), 4)} tentativas por passo. Falhas silenciosas, como uma resposta errada mas bem formatada, não disparam retry: para elas existem verificação e [[eval|eval]].`,
      ],
      keyIdea: "Retry conserta falhas que você consegue detectar; as silenciosas precisam de verificação.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "retry",
            piece: "metrics-panel",
            metrics: [
              { id: "none", label: "sem retry", value: percent(chainWithRetries(0)), color: "danger" },
              { id: "one", label: "1 retry por passo", value: percent(chainWithRetries(1)) },
              { id: "two", label: `${RETRIES} retries por passo`, value: percent(chainWithRetries(RETRIES)), color: "success" },
              { id: "cost", label: "tentativas por passo", value: fixed(expectedAttempts(RETRIES), 4) },
            ],
            highlight: "two",
          },
        ],
      },
      alt: `Sucesso da cadeia de ${STEPS} passos: sem retry ${percent(chainWithRetries(0))}, com 1 retry ${percent(chainWithRetries(1))}, com ${RETRIES} retries ${percent(chainWithRetries(RETRIES))}, a ${fixed(expectedAttempts(RETRIES), 4)} tentativas por passo em média.`,
    },
    {
      id: "idempotency",
      shortTitle: "Idempotência",
      title: "Repetir sem cobrar duas vezes",
      tag: "mechanism",
      body: [
        `Você aperta “pagar”, a tela trava, e você aperta de novo. Se a loja não reconhecer o segundo clique, você paga duas vezes. Um agente que chama cobrar(${money(CHARGE)}), recebe timeout e tenta de novo está na mesma situação: o timeout não diz se a primeira cobrança aconteceu.`,
        `Retry só é seguro com [[idempotência|idempotency]]: a operação dá o mesmo efeito executada uma ou várias vezes. Na API da Stripe, o cliente gera uma chave única e a manda no cabeçalho Idempotency-Key; uma repetição com a mesma chave devolve a resposta salva da primeira, e a Stripe compara os parâmetros para recusar uma chave reusada com outro pedido. Sem chave, as ${ATTEMPTS_SENT} tentativas cobram ${money(chargedWithoutKey)}; com a chave, ${money(chargedWithKey)}.`,
      ],
      keyIdea: "Antes de repetir uma ação com efeito, garanta que a repetição é reconhecida: chave de idempotência por operação.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "idempotency",
            piece: "block-diagram",
            blocks: [
              { id: "agent", kind: "agent", label: "agente", col: 0, row: 0.5 },
              { id: "tool", kind: "tool", label: `cobrar ${money(CHARGE)}`, col: 1, row: 0.5 },
              { id: "api", kind: "server", label: "pagamentos", col: 2, row: 0.5 },
              { id: "keys", kind: "kv-cache", label: "chaves vistas", col: 3, row: 0 },
              { id: "double", kind: "no-result", label: `cobrou ${money(chargedWithoutKey)}`, col: 3, row: 1 },
            ],
            edges: [
              { from: "agent", to: "tool", label: "retry" },
              { from: "tool", to: "api", label: "mesma chave" },
              { from: "api", to: "keys", label: "já processada" },
              { from: "api", to: "double", label: "sem chave", variant: "alternative" },
            ],
            active: "api",
          },
        ],
      },
      alt: `O agente repete a chamada cobrar ${money(CHARGE)} com a mesma chave; a API de pagamentos, em destaque, consulta as chaves já vistas e devolve a resposta salva. O caminho tracejado mostra que, sem chave, o retry cobra ${money(chargedWithoutKey)}.`,
    },
    {
      id: "backoff",
      shortTitle: "Backoff",
      title: "Esperar cada vez mais",
      tag: "example",
      body: [
        "Quando a loja está lotada, voltar a cada segundo só aumenta a fila. Quem volta em 1 minuto, depois em 2, depois em 4, dá tempo para a fila andar.",
        `O [[backoff exponencial|exponential-backoff]] espera base × 2ⁿ entre as tentativas, com um teto: com base de ${BASE_SECONDS} s e teto de ${CAP_SECONDS} s, as esperas são ${backoff.join(", ")} segundos, ${worstWait} s no pior caso somando ${backoff.length} tentativas. Para muitos clientes não voltarem todos no mesmo instante, cada espera é sorteada entre 0 e esse valor (o jitter). Na cena, o retry sai de uma fila, com a mesma chave de idempotência da primeira tentativa.`,
      ],
      keyIdea: "Backoff com jitter espaça os retries, e a mesma chave em todas as tentativas torna a repetição segura.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "exchange",
            piece: "client-server",
            nodes: [
              { id: "agent", label: "agente", role: "server" },
              { id: "queue", label: "fila de retry", role: "queue", size: 1 },
              { id: "api", label: "api de pagamentos", role: "server" },
              { id: "db", label: "registro de chaves", role: "database" },
            ],
            messages: exchange,
            active: RETRY,
          },
        ],
      },
      alt: `Troca de mensagens: ${exchange.map((message) => `${nodeNames[message.from]} para ${nodeNames[message.to]}, ${message.label}`).join("; ")}. A mensagem em trânsito é o retry com a mesma chave.`,
    },
    {
      id: "consistency",
      shortTitle: "pass^k",
      title: "Acertar uma vez não é ser confiável",
      tag: "tradeoff",
      body: [
        `Um funcionário que acerta ${percent(P_TRIAL, 0)} dos atendimentos parece bom. Mas o cliente que volta toda semana quer acerto toda vez: em ${K} visitas, a chance de ser bem atendido em todas é ${percent(passHat(K))}.`,
        `O τ-bench (Yao et al., 2024) propôs a métrica [[pass^k|pass-hat-k]] para medir isso: a chance de o agente acertar a mesma tarefa em todas as k tentativas. Com ${percent(P_TRIAL, 0)} por tentativa e tentativas independentes, pass^k = ${fixed(P_TRIAL, 1)}^k: ${percent(passHat(1))} em k = 1 e ${percent(passHat(K))} em k = ${K}. O pass@k, que conta pelo menos um acerto, vai para ${percent(passAt(K), 4)} no mesmo k e esconde o problema. Rode cada tarefa do seu [[eval|eval]] várias vezes e acompanhe as duas.`,
      ],
      keyIdea: "Para agentes em produção, meça se ele acerta sempre (pass^k), não se acerta alguma vez (pass@k).",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "passk",
            piece: "chart",
            kind: "bar",
            series: passHatSeries,
            max: 100,
            highlight: K - 1,
            color: "module-12",
          },
        ],
      },
      alt: `pass^k em %, com ${percent(P_TRIAL, 0)} de acerto por tentativa: ${passHatSeries.map((item) => `${item.label} ${fixed(item.value, 1)}`).join(", ")}.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Um agente que aguenta o mundo real",
      tag: "summary",
      body: [
        "Confiabilidade vem de camadas: passos curtos e verificáveis, retries com backoff para falhas detectáveis, chaves de idempotência em toda ação com efeito, [[limite de iterações|max-iterations]] e uma [[condição de parada|stop-condition]] clara, checkpoints para retomar, [[guardrails|guardrail]] nas ações de risco e avaliação repetida com pass^k.",
        "Este módulo fechou o ciclo do agente: loop, ferramentas, memória, contexto, vários agentes, pessoas no fluxo e confiabilidade. O próximo módulo trata do Model Context Protocol, o padrão aberto que liga agentes a ferramentas e dados.",
      ],
      keyIdea: "Agente confiável = poucos passos sem verificação + retries seguros + limites + avaliação repetida.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "layers",
            piece: "block-diagram",
            blocks: [
              { id: "agent", kind: "agent", label: "agente", col: 0, row: 0.5 },
              { id: "guard", kind: "guardrail", label: "limites + risco", col: 1, row: 0 },
              { id: "memory", kind: "memory", label: "checkpoints", col: 1, row: 1 },
              { id: "tool", kind: "tool", label: "tool idempotente", col: 2, row: 0.5 },
              { id: "eval", kind: "eval", label: "pass^k", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "agent", to: "guard" },
              { from: "agent", to: "memory", label: "salva" },
              { from: "guard", to: "tool", label: "retry + chave" },
              { from: "tool", to: "eval", label: "avalia" },
            ],
            active: "eval",
            done: ["agent", "guard", "memory", "tool"],
          },
        ],
      },
      alt: "O agente passa por limites e verificação de risco e salva checkpoints; as ferramentas são idempotentes e repetidas com chave; no fim, a avaliação com pass^k, em destaque, mede a consistência.",
    },
  ],
  realWorldExample:
    "A Stripe aceita o cabeçalho Idempotency-Key em todas as requisições POST: o cliente gera a chave (a Stripe sugere UUID v4), e uma repetição com a mesma chave devolve o resultado salvo da primeira, o que deixa repetir com segurança depois de um erro de conexão. O τ-bench, de 2024, avalia agentes em domínios de atendimento como varejo e companhia aérea e introduziu o pass^k para medir consistência entre tentativas.",
  code: {
    language: "python",
    source: `import random
import time
import uuid

def call_with_retry(operation, attempts=4, base=1.0, cap=30.0):
    key = str(uuid.uuid4())  # a mesma chave em todas as tentativas
    for attempt in range(attempts):
        try:
            return operation(idempotency_key=key)
        except TimeoutError:
            if attempt == attempts - 1:
                raise
            time.sleep(random.uniform(0, min(cap, base * 2 ** attempt)))`,
    caption: "Retry com backoff exponencial, jitter e teto: a chave de idempotência é criada uma vez e reenviada em cada tentativa.",
  },
  tradeOffs: {
    pros: [
      "Retries com backoff resolvem a maioria das falhas transitórias sem intervenção",
      "Idempotência torna a repetição segura em ações com efeito",
      "pass^k revela agentes que acertam por sorte",
    ],
    cons: [
      "Retries aumentam a latência e o custo nos casos que falham",
      "Falhas silenciosas não são pegas por retry",
      "Medir pass^k exige rodar cada tarefa várias vezes",
    ],
    alternatives: [
      "Encurtar a cadeia: menos passos autônomos e mais passos fixos no código",
      "Verificação depois de cada passo, com um avaliador ou testes automáticos",
    ],
  },
  knowledgeCheck: [
    {
      id: "long-chain",
      prompt: "Um agente faz 20 passos, cada um com 98% de acerto e independentes. Qual é a melhor leitura?",
      options: [
        "O agente acerta 98% das tarefas",
        "A tarefa inteira acerta cerca de 0,98²⁰ ≈ 67% das vezes; vale encurtar a cadeia ou verificar os passos",
        "Acerta 20 × 98%",
        "Acerta 100%, porque cada passo é quase perfeito",
      ],
      correct: 1,
      explanation: "Os erros se acumulam: a cadeia só acerta se todos os passos acertarem, pⁿ = 0,98²⁰ ≈ 0,67.",
      lesson: "12-18",
    },
    {
      id: "safe-retry",
      prompt: "A chamada criar_reembolso deu timeout. Como repetir com segurança?",
      options: [
        "Repetir imediatamente, sem mudar nada",
        "Repetir com backoff e a mesma chave de idempotência da primeira tentativa",
        "Repetir com uma chave nova a cada tentativa",
        "Nunca repetir: avisar o cliente que falhou",
      ],
      correct: 1,
      explanation: "O timeout não diz se o reembolso aconteceu. Com a mesma chave, o servidor reconhece a repetição e devolve o resultado original; uma chave nova criaria um segundo reembolso.",
      lesson: "12-18",
    },
  ],
  related: ["12-17", "13-01", "16-05"],
  references: [
    { title: "Yao et al. (2024), τ-bench: A Benchmark for Tool-Agent-User Interaction in Real-World Domains", url: "https://arxiv.org/abs/2406.12045", kind: "paper" },
    { title: "Stripe: Idempotent requests", url: "https://docs.stripe.com/api/idempotent_requests", kind: "docs" },
    { title: "AWS Architecture Blog: Exponential Backoff And Jitter", url: "https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/", kind: "article" },
  ],
};

export default lesson;
