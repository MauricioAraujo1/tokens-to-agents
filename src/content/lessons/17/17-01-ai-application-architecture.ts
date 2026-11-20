import type { BlockDiagramSpec } from "../../../scene/types";
import type { LessonContent } from "../../../types/content";

// Arquitetura de uma aplicação de IA com as contas no arquivo. O orçamento de latência de um pedido de chat
// soma etapas com tempos DE EXEMPLO (hipóteses rotuladas, meça no seu sistema); a geração usa TTFT e tempo
// entre tokens como na aula 10-13. A concorrência sai da Little's Law (L = λ · W): com pedidos que duram
// segundos, um servidor que prende uma thread por pedido precisa de λ · W threads.

const fixed = (value: number, digits = 1) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");
const percent = (value: number) => `${Math.round(value * 100)}%`;

// Passo 2: orçamento de latência de um pedido, em milissegundos (valores de exemplo).
const OUTPUT_TOKENS = 250;
const TTFT_MS = 400;
const TPOT_MS = 25;
const generationMs = TTFT_MS + (OUTPUT_TOKENS - 1) * TPOT_MS;
const budget = [
  { label: "gateway", value: 15 },
  { label: "sessão", value: 10 },
  { label: "busca", value: 120 },
  { label: "montar prompt", value: 5 },
  { label: "guardrail entrada", value: 60 },
  { label: "llm", value: generationMs },
];
const totalMs = budget.reduce((sum, stage) => sum + stage.value, 0);
const llmShare = generationMs / totalMs;
const beforeLlmMs = totalMs - generationMs;
const firstWordMs = beforeLlmMs + TTFT_MS;

// Passo 3: concorrência. Chegada e duração de exemplo; o pool de threads é uma hipótese.
const ARRIVALS_PER_S = 20;
const durationS = totalMs / 1000;
const openRequests = ARRIVALS_PER_S * durationS;
const THREAD_POOL = 50;
const maxRateWithThreads = THREAD_POOL / durationS;

// Passo 4: fallback. Disponibilidades de exemplo de dois provedores independentes.
const PRIMARY_AVAILABILITY = 0.995;
const FALLBACK_AVAILABILITY = 0.99;
const combinedAvailability = 1 - (1 - PRIMARY_AVAILABILITY) * (1 - FALLBACK_AVAILABILITY);
const MINUTES_PER_MONTH = 30 * 24 * 60;
const downPrimary = (1 - PRIMARY_AVAILABILITY) * MINUTES_PER_MONTH;
const downCombined = (1 - combinedAvailability) * MINUTES_PER_MONTH;

const layers = (active: string, done?: string[]): BlockDiagramSpec => ({
  id: "layers",
  piece: "block-diagram",
  blocks: [
    { id: "phone", kind: "phone", label: "cliente", col: 0, row: 0.5 },
    { id: "backend", kind: "app", label: "backend", col: 1, row: 0.5 },
    { id: "gateway", kind: "server", label: "ai gateway", col: 2, row: 0 },
    { id: "search", kind: "vector-db", label: "busca", col: 2, row: 1 },
    { id: "llm", kind: "llm", label: "modelo", col: 3, row: 0 },
    { id: "cache", kind: "kv-cache", label: "sessão e cache", col: 3, row: 1 },
  ],
  edges: [
    { from: "phone", to: "backend", label: "https" },
    { from: "backend", to: "gateway", label: "prompt" },
    { from: "backend", to: "search", label: "consulta" },
    { from: "gateway", to: "llm", label: "tokens" },
    { from: "backend", to: "cache" },
  ],
  active,
  ...(done ? { done } : {}),
});

const lesson: LessonContent = {
  id: "17-01",
  subtitle: "As camadas de um produto com LLM, onde o tempo de cada pedido vai e por que o modelo pede um backend diferente de um CRUD comum.",
  objectives: [
    "Nomear as camadas de uma aplicação de IA e a responsabilidade de cada uma",
    "Montar o orçamento de latência de um pedido e achar onde o tempo vai",
    "Explicar por que pedidos de segundos pedem um backend assíncrono e sem estado",
    "Planejar fallback entre modelos e calcular o ganho de disponibilidade",
  ],
  steps: [
    {
      id: "layers",
      shortTitle: "Camadas",
      title: "Um app de IA é um app comum com um vizinho caro",
      tag: "context",
      body: [
        "Pense num restaurante: o salão recebe o cliente, a cozinha prepara, a despensa guarda os ingredientes. O cliente nunca entra na cozinha. Num app com LLM é parecido: o celular fala com o seu backend, e só o backend fala com o modelo, com a busca e com os bancos.",
        "Essa divisão é a [[arquitetura de aplicação de IA|ai-application-architecture]]: cliente, backend da aplicação, um [[AI gateway|api-gateway]] que concentra chaves, limites e roteamento para os modelos, a camada de dados (busca vetorial, banco, cache de sessão) e o modelo, por API ou próprio. A chave da API nunca vai para o celular: quem fala com o modelo é sempre um servidor seu.",
      ],
      keyIdea: "O modelo é uma dependência remota, lenta e cara: fica atrás do seu backend, nunca exposto ao cliente.",
      scene: { kind: "pieces", layout: "single", pieces: [layers("backend")] },
      alt: "O cliente fala por HTTPS com o backend, em destaque, que consulta a busca e o cache de sessão e manda o prompt ao AI gateway, que entrega os tokens ao modelo.",
    },
    {
      id: "budget",
      shortTitle: "Orçamento",
      title: "Para onde vão os segundos de um pedido",
      tag: "mechanism",
      body: [
        `Some o tempo de cada etapa de um pedido de chat, com valores de exemplo: gateway, leitura da sessão, busca, montagem do prompt, guardrail de entrada e o modelo. O modelo gera ${OUTPUT_TOKENS} tokens com ${integer(TTFT_MS)} ms até o primeiro token e ${TPOT_MS} ms entre tokens: ${fixed(generationMs / 1000)} s. O pedido inteiro leva ${fixed(totalMs / 1000)} s, e o modelo é ${percent(llmShare)} disso.`,
        `A lição para a arquitetura: otimizar o banco de 10 para 5 ms não muda nada que o usuário sinta. O que muda é começar a mostrar a resposta cedo. Com [[token streaming|token-streaming]], a primeira palavra aparece em ${integer(firstWordMs)} ms (${integer(beforeLlmMs)} ms das etapas anteriores mais o TTFT), e as etapas antes do modelo viram o alvo de otimização da espera percebida.`,
      ],
      keyIdea: "Meça o orçamento de latência por etapa: o modelo domina o total, e as etapas antes dele dominam a primeira palavra.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "budget",
            piece: "chart",
            kind: "bar",
            series: budget,
            highlight: budget.length - 1,
            color: "module-17",
          },
        ],
      },
      alt: `Barras com o tempo de cada etapa, em milissegundos: ${budget.map((stage) => `${stage.label} ${integer(stage.value)}`).join(", ")}. O modelo, em destaque, é ${percent(llmShare)} dos ${fixed(totalMs / 1000)} s.`,
    },
    {
      id: "async",
      shortTitle: "Assíncrono",
      title: "Pedidos de segundos pedem um backend assíncrono",
      tag: "mechanism",
      body: [
        `Um backend de CRUD responde em milissegundos, e prender uma thread por pedido funciona. Com LLM, cada pedido fica ${fixed(durationS)} s aberto, quase todo esperando a rede. Pela [[Little's Law|littles-law]], ${ARRIVALS_PER_S} pedidos por segundo × ${fixed(durationS)} s = ${integer(openRequests)} pedidos abertos ao mesmo tempo. Um pool de ${THREAD_POOL} threads (hipótese do exemplo) aguenta só ${fixed(maxRateWithThreads)} pedidos por segundo, com a CPU quase parada.`,
        `Por isso o backend de IA usa I/O assíncrono (asyncio, Node.js, goroutines), timeouts explícitos em cada chamada e é um [[serviço sem estado|stateless-service]]: o histórico da conversa fica num cache ou banco compartilhado, não na memória do processo. Assim qualquer instância atende qualquer pedido, e escalar o backend é só subir mais cópias.`,
      ],
      keyIdea: "Com pedidos longos, o limite é a concorrência, não a CPU: I/O assíncrono e estado fora do processo.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "async",
            piece: "client-server",
            nodes: [
              { id: "users", label: `${ARRIVALS_PER_S} pedidos/s`, role: "client" },
              { id: "pool", label: `pool de ${THREAD_POOL} threads`, role: "queue", size: Math.round(openRequests - THREAD_POOL) },
              { id: "backend", label: "backend", role: "server", utilization: 0.1 },
              { id: "model", label: "modelo", role: "model", utilization: 0.7 },
            ],
            messages: [
              { from: "users", to: "pool", label: `${integer(openRequests)} abertos` },
              { from: "pool", to: "backend", label: `máx. ${fixed(maxRateWithThreads)}/s` },
              { from: "backend", to: "model", label: `${fixed(durationS)} s esperando` },
            ],
            active: 0,
          },
        ],
      },
      alt: `${ARRIVALS_PER_S} pedidos por segundo mantêm ${integer(openRequests)} pedidos abertos; um pool de ${THREAD_POOL} threads deixa ${integer(openRequests - THREAD_POOL)} na fila e só atende ${fixed(maxRateWithThreads)} por segundo, com o backend quase ocioso esperando o modelo.`,
    },
    {
      id: "fallback",
      shortTitle: "Fallback",
      title: "Quando o modelo cai, o app continua",
      tag: "example",
      body: [
        `Um provedor com ${fixed(PRIMARY_AVAILABILITY * 100)}% de disponibilidade (número de exemplo) fica fora ${integer(downPrimary)} minutos num mês de 30 dias. O gateway pode ter um [[fallback|fallback]]: se o modelo principal responde erro ou estoura o timeout, o pedido vai para um segundo modelo, de outro provedor, com ${fixed(FALLBACK_AVAILABILITY * 100)}%.`,
        `Se as falhas forem independentes, o app só fica sem resposta quando os dois caem juntos: 1 − (1 − ${fixed(PRIMARY_AVAILABILITY, 3)}) × (1 − ${fixed(FALLBACK_AVAILABILITY, 2)}) = ${fixed(combinedAvailability * 100, 3)}%, ou ${fixed(downCombined)} minutos no mês. O preço: o prompt precisa funcionar nos dois modelos, e a qualidade do fallback precisa de [[eval|eval]] próprio, senão o app fica de pé respondendo pior.`,
      ],
      keyIdea: "Fallback entre provedores independentes multiplica as chances de falha, mas só vale com o prompt testado nos dois.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "fallback",
            piece: "block-diagram",
            blocks: [
              { id: "backend", kind: "app", label: "backend", col: 0, row: 0.5 },
              { id: "gateway", kind: "server", label: "ai gateway", col: 1, row: 0.5 },
              { id: "primary", kind: "cloud", label: "modelo principal", col: 2, row: 0 },
              { id: "secondary", kind: "cloud", label: "fallback", col: 2, row: 1 },
              { id: "answer", kind: "answer", label: "resposta", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "backend", to: "gateway" },
              { from: "gateway", to: "primary", label: "1ª tentativa" },
              { from: "gateway", to: "secondary", label: "erro ou timeout", variant: "alternative" },
              { from: "primary", to: "answer" },
              { from: "secondary", to: "answer" },
            ],
            active: "gateway",
          },
        ],
      },
      alt: `O backend chama o AI gateway, em destaque, que tenta o modelo principal; em erro ou timeout, um caminho tracejado leva ao modelo de fallback. A disponibilidade combinada sobe para ${fixed(combinedAvailability * 100, 3)}%.`,
    },
    {
      id: "tradeoff",
      shortTitle: "Decisões",
      title: "Onde cada responsabilidade mora",
      tag: "tradeoff",
      body: [
        "Juntar tudo num serviço só é mais simples no começo, mas mistura o que escala diferente: o backend escala por conexões abertas, a busca por consultas e o modelo por GPU ou por limite do provedor. Separar demais cria latência de rede e mais coisas para operar. Um meio-termo comum: um backend da aplicação, um gateway de modelos compartilhado e a camada de dados gerenciada.",
        `Os [[guardrails|guardrail]] também têm lugar certo. O de entrada roda antes do modelo e soma ao tempo da primeira palavra (${integer(budget[4].value)} ms no exemplo). O de saída, com streaming, precisa checar a resposta em pedaços enquanto ela sai, ou segurar o texto até o fim e perder a vantagem do streaming.`,
      ],
      keyIdea: "Separe as partes que escalam por recursos diferentes, e decida o lugar de cada guardrail olhando a latência.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "decisions",
            piece: "metrics-panel",
            metrics: [
              { id: "total", label: "pedido completo", value: `${fixed(totalMs / 1000)} s` },
              { id: "first", label: "primeira palavra", value: `${integer(firstWordMs)} ms`, color: "success" },
              { id: "open", label: "pedidos abertos", value: integer(openRequests) },
              { id: "availability", label: "com fallback", value: `${fixed(combinedAvailability * 100, 3)}%`, color: "module-17" },
            ],
            highlight: "first",
          },
        ],
      },
      alt: `Painel do desenho: ${fixed(totalMs / 1000)} s por pedido completo, primeira palavra em ${integer(firstWordMs)} ms, ${integer(openRequests)} pedidos abertos e ${fixed(combinedAvailability * 100, 3)}% de disponibilidade com fallback.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "O mapa do módulo",
      tag: "summary",
      body: [
        "Uma aplicação de IA é um backend assíncrono e sem estado na frente de uma dependência lenta e cara. O gateway concentra chaves, limites e fallback; a camada de dados guarda sessão e conhecimento; o modelo responde em streaming. O orçamento de latência mostra onde otimizar.",
        "O resto do módulo desce camada por camada: como consumir APIs de modelos, quando hospedar o próprio, as GPUs, containers, serving, nuvem, infraestrutura como código, escala, balanceamento, monitoração, custo e deploy contínuo. A próxima aula começa pela forma mais comum de usar um LLM: a API de um provedor.",
      ],
      keyIdea: "Arquitetura de IA = backend comum bem feito + gateway de modelos + dados + modelo, cada um escalando do seu jeito.",
      scene: { kind: "pieces", layout: "single", pieces: [layers("llm", ["phone", "backend", "gateway", "search", "cache"])] },
      alt: "O mapa completo: cliente, backend, busca, cache de sessão e AI gateway já percorridos, e o modelo em destaque no fim do caminho.",
    },
  ],
  realWorldExample:
    "O LiteLLM, projeto de código aberto, é um proxy que expõe dezenas de provedores de modelos atrás de uma API no formato da OpenAI, com chaves virtuais por equipe, limites de uso, registro de gastos e fallback entre modelos configurado em arquivo: exatamente o papel do AI gateway desta aula.",
  code: {
    language: "python",
    source: `import asyncio
from openai import AsyncOpenAI

primary = AsyncOpenAI(base_url="https://api.provedor-a.example/v1")
fallback = AsyncOpenAI(base_url="https://api.provedor-b.example/v1")

async def complete(messages: list[dict]) -> str:
    for client, model in [(primary, "modelo-a"), (fallback, "modelo-b")]:
        try:
            response = await asyncio.wait_for(
                client.chat.completions.create(model=model, messages=messages),
                timeout=20,
            )
            return response.choices[0].message.content
        except Exception:
            continue
    raise RuntimeError("nenhum modelo respondeu")`,
    caption: "Chamada assíncrona com timeout explícito e fallback para um segundo provedor; as URLs e modelos são fictícios.",
  },
  tradeOffs: {
    pros: [
      "Backend sem estado escala só subindo cópias, e qualquer instância atende qualquer pedido",
      "Gateway único concentra chaves, limites, custo e fallback num lugar",
      "Orçamento de latência por etapa mostra onde otimizar de verdade",
    ],
    cons: [
      "Cada camada a mais soma rede e mais um serviço para operar",
      "Fallback entre modelos exige prompts e avaliação nos dois",
      "Guardrail de saída e streaming brigam: checar em pedaços é mais difícil",
    ],
    alternatives: [
      "Monolito com chamada direta ao provedor, para protótipos e volume baixo",
      "Plataformas gerenciadas de agentes, quando o time não quer operar o backend",
    ],
  },
  knowledgeCheck: [
    {
      id: "optimize-target",
      prompt: "Num pedido de 7 s, o modelo leva 6,6 s e a busca 120 ms. Os usuários reclamam que a tela fica parada. O que ataca melhor a queixa?",
      options: [
        "Trocar o banco vetorial por um mais rápido",
        "Ligar o streaming dos tokens e encurtar as etapas antes do modelo",
        "Adicionar mais CPUs ao backend",
        "Aumentar o timeout",
      ],
      correct: 1,
      explanation: "A queixa é a espera percebida. Com streaming, a primeira palavra chega depois das etapas iniciais mais o TTFT; o tempo total do modelo não muda, mas a tela começa a andar.",
      lesson: "17-01",
    },
    {
      id: "threads",
      prompt: "Chegam 10 pedidos por segundo e cada um fica 6 s aberto. O backend usa 30 threads, uma por pedido. O que acontece?",
      options: [
        "Nada: 30 threads sobram",
        "Ficam 60 pedidos abertos; com 30 threads, o backend só atende 5 por segundo e o resto enfileira",
        "A CPU vai a 100%",
        "O modelo fica mais rápido",
      ],
      correct: 1,
      explanation: "Pela Little's Law, L = 10 × 6 = 60 pedidos simultâneos. Com 30 threads presas esperando a rede, a vazão máxima é 30 / 6 = 5 por segundo. I/O assíncrono resolve sem gastar CPU.",
      lesson: "17-01",
    },
  ],
  related: ["00-06", "10-13", "17-02"],
  references: [
    { title: "LiteLLM: documentação do proxy", url: "https://docs.litellm.ai/", kind: "docs" },
    { title: "The Twelve-Factor App", url: "https://12factor.net/", kind: "article" },
    { title: "Python: asyncio", url: "https://docs.python.org/3/library/asyncio.html", kind: "docs" },
  ],
};

export default lesson;
