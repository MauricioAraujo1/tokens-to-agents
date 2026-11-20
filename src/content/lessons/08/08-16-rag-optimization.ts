import { cosineSimilarity } from "../../../lab/embeddings";
import type { LessonContent } from "../../../types/content";

// Otimização de RAG com contas no arquivo. Um conjunto de avaliação de 8 perguntas do assistente de RH
// guarda a posição do chunk certo no top-5 (0 = não veio) antes e depois de uma única mudança: um cabeçalho
// com o documento e a seção antes de cada chunk. Daí saem hit@k e MRR. Depois, um cache semântico de brinquedo
// (vetores de 3 traços [home office, reembolso, férias] e limiar de cosseno) e o custo em tokens de k = 8
// contra rerank até k = 3.

const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");
const percent = (value: number) => `${Math.round(value * 100)}%`;

// Passos 2 e 3: posição do chunk certo para cada pergunta, antes e depois do cabeçalho contextual.
const TOP = 5;
const before = [1, 3, 0, 2, 0, 1, 4, 0];
const after = [1, 1, 2, 1, 0, 1, 2, 3];
const ks = [1, 2, 3, 4, 5];
const hitAt = (ranks: number[], k: number) => ranks.filter((rank) => rank >= 1 && rank <= k).length / ranks.length;
const mrr = (ranks: number[]) => ranks.reduce((total, rank) => total + (rank > 0 ? 1 / rank : 0), 0) / ranks.length;
const series = (ranks: number[]) => ks.map((k) => ({ label: `hit@${k}`, value: Number(hitAt(ranks, k).toFixed(2)) }));
const HEADLINE_K = 3;
const missesBefore = before.filter((rank) => rank === 0 || rank > HEADLINE_K).length;
const missesAfter = after.filter((rank) => rank === 0 || rank > HEADLINE_K).length;
const failureReduction = (missesBefore - missesAfter) / missesBefore;
const stillMissing = after.filter((rank) => rank === 0).length;

// Passo 4: cache semântico. Cada pergunta compara com as que já estão no cache; acima do limiar, é hit.
const CACHE_THRESHOLD = 0.95;
const log = [
  { text: "quantos dias de home office?", vector: [1, 0, 0], intent: "ho-dias" },
  { text: "posso fazer home office quantos dias?", vector: [0.98, 0.1, 0], intent: "ho-dias" },
  { text: "como pedir reembolso?", vector: [0, 1, 0], intent: "reembolso" },
  { text: "dias de home office por semana", vector: [0.97, 0, 0.15], intent: "ho-dias" },
  { text: "táxi precisa de nota no reembolso?", vector: [0.1, 0.9, 0.3], intent: "reembolso-nota" },
  { text: "quando posso tirar férias?", vector: [0, 0, 1], intent: "ferias-quando" },
  { text: "home office: quantos dias?", vector: [1, 0.05, 0], intent: "ho-dias" },
  { text: "quantos dias de férias eu tenho?", vector: [0.3, 0, 0.95], intent: "ferias-saldo" },
];
const cache: typeof log = [];
const results = log.map((query) => {
  const scores = cache.map((cached) => ({ cached, score: cosineSimilarity(query.vector, cached.vector) }));
  const best = scores.sort((a, b) => b.score - a.score)[0];
  if (best && best.score >= CACHE_THRESHOLD) return { query, hit: true, wrong: best.cached.intent !== query.intent, score: best.score, matched: best.cached.text };
  cache.push(query);
  return { query, hit: false, wrong: false, score: best?.score ?? 0, matched: "" };
});
const hits = results.filter((result) => result.hit);
const falseHits = hits.filter((result) => result.wrong);
const falseHit = falseHits[0];
const nearMiss = results.find((result) => result.query.intent === "reembolso-nota");

// Passo 5: tokens de entrada por pergunta com k = 8 e com rerank até k = 3.
const CHUNK_TOKENS = 300;
const SYSTEM_TOKENS = 400;
const QUESTION_TOKENS = 50;
const K_WIDE = 8;
const K_RERANKED = 3;
const promptTokens = (k: number) => SYSTEM_TOKENS + QUESTION_TOKENS + k * CHUNK_TOKENS;
const tokensWide = promptTokens(K_WIDE);
const tokensReranked = promptTokens(K_RERANKED);
const tokenSaving = 1 - tokensReranked / tokensWide;
const llmCallsWithCache = log.length - hits.length;

const lesson: LessonContent = {
  id: "08-16",
  subtitle: "Como melhorar um RAG medindo antes e depois de cada mudança: mais acertos na busca, menos chamadas com cache semântico e menos tokens por pergunta.",
  objectives: [
    "Medir o efeito de uma mudança com hit@k antes e depois, no mesmo conjunto de avaliação",
    "Explicar por que um cabeçalho contextual nos chunks melhora a busca",
    "Calcular o ganho e o risco de um cache semântico pelo limiar de similaridade",
    "Cortar tokens por pergunta com rerank sem perder o trecho certo",
  ],
  steps: [
    {
      id: "measure",
      shortTitle: "Medir antes",
      title: "Nenhum ajuste sem exame antes",
      tag: "context",
      body: [
        "Um médico não troca o remédio sem pedir o exame de novo: senão, não sabe se o paciente melhorou pelo remédio ou por acaso. Otimizar RAG é igual. A tentação é mudar o chunk size, o modelo de embedding e o prompt de uma vez e “sentir” que ficou melhor.",
        `O método é fixo: um conjunto de avaliação (como o [[golden dataset|golden-dataset]] da aula anterior), uma métrica, uma mudança por vez. Aqui são ${before.length} perguntas do assistente de RH, e para cada uma guardamos a posição do chunk certo no top-${TOP}. A métrica é hit@k: a fração de perguntas em que o chunk certo aparece entre os k primeiros, a mesma ideia de hit rate do módulo 07.`,
      ],
      keyIdea: "Otimizar é um experimento: mesmo conjunto, uma mudança, a métrica antes e depois.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "golden", kind: "documents", label: `${before.length} perguntas`, col: 0, row: 0.5 },
              { id: "app", kind: "app", label: "rag atual", col: 1, row: 0.5 },
              { id: "retrieval", kind: "retrieval", label: `top-${TOP}`, col: 2, row: 0.5 },
              { id: "eval", kind: "eval", label: "hit@k", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "golden", to: "app" },
              { from: "app", to: "retrieval", label: "busca" },
              { from: "retrieval", to: "eval", label: "posição certa" },
            ],
            active: "eval",
          },
        ],
      },
      alt: `As ${before.length} perguntas do conjunto de avaliação passam pelo RAG atual, a busca devolve o top-${TOP} e a avaliação, em destaque, mede em que posição veio o chunk certo.`,
    },
    {
      id: "before",
      shortTitle: "Antes",
      title: "A linha de base: onde o chunk certo aparece",
      tag: "mechanism",
      body: [
        `As posições do chunk certo foram ${before.map((rank) => (rank === 0 ? "fora" : `${rank}º`)).join(", ")}. Em ${percent(hitAt(before, 1))} das perguntas ele vem em 1º; com k = ${HEADLINE_K}, em ${percent(hitAt(before, HEADLINE_K))}. Mesmo com k = ${TOP}, ${before.filter((rank) => rank === 0).length} perguntas ficam sem o trecho que responde.`,
        `Olhando os chunks que falharam, o padrão é o de sempre: “o limite é de 2 dias” não diz de quê. O chunk perdeu o título do documento e da seção, e o embedding dele fica perto de qualquer limite. O MRR, a média de 1 / posição, é ${fixed(mrr(before))} nesta linha de base.`,
      ],
      keyIdea: "Antes de escolher a otimização, leia as falhas: elas dizem qual peça mexer.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "summary-metrics",
            piece: "metrics-panel",
            metrics: [
              { id: "hit", label: `hit@${HEADLINE_K}`, value: percent(hitAt(before, HEADLINE_K)) },
              { id: "mrr", label: "MRR", value: fixed(mrr(before)) },
              { id: "misses", label: `fora do top-${HEADLINE_K}`, value: String(missesBefore), color: "danger" },
            ],
            highlight: "misses",
          },
          {
            id: "hits",
            piece: "chart",
            kind: "bar",
            series: series(before),
            max: 1,
            highlight: HEADLINE_K - 1,
            color: "module-08",
          },
        ],
      },
      alt: `Linha de base: ${series(before).map((item) => `${item.label} ${percent(item.value)}`).join(", ")}. MRR ${fixed(mrr(before))} e ${missesBefore} perguntas fora do top-${HEADLINE_K}.`,
    },
    {
      id: "after",
      shortTitle: "Depois",
      title: "Uma mudança: o cabeçalho em cada chunk",
      tag: "mechanism",
      body: [
        `A mudança foi uma só: antes de gerar o embedding, cada chunk ganha um cabeçalho com o documento e a seção, como “Política de home office, estagiários: o limite é de 2 dias”. É a ideia da [[contextual retrieval|contextual-retrieval]]. No mesmo conjunto, hit@1 vai de ${percent(hitAt(before, 1))} para ${percent(hitAt(after, 1))}, hit@${HEADLINE_K} de ${percent(hitAt(before, HEADLINE_K))} para ${percent(hitAt(after, HEADLINE_K))}, e o MRR de ${fixed(mrr(before))} para ${fixed(mrr(after))}.`,
        `As falhas no top-${HEADLINE_K} caem de ${missesBefore} para ${missesAfter}, ${percent(failureReduction)} a menos neste conjunto de brinquedo. Com dados reais, a Anthropic publicou que embeddings contextuais reduziram as falhas de recuperação no top-20 em 35%, que somados a BM25 contextual chegaram a 49% e, com reranking, a 67%. ${stillMissing} pergunta continua sem o chunk: o próximo passo é ler essa falha, não acumular técnicas.`,
      ],
      keyIdea: "Uma mudança medida vale mais que cinco mudanças sentidas.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "summary-metrics",
            piece: "metrics-panel",
            metrics: [
              { id: "hit", label: `hit@${HEADLINE_K}`, value: percent(hitAt(after, HEADLINE_K)), color: "success" },
              { id: "mrr", label: "MRR", value: fixed(mrr(after)), color: "success" },
              { id: "misses", label: `fora do top-${HEADLINE_K}`, value: String(missesAfter) },
            ],
            highlight: "hit",
          },
          {
            id: "hits",
            piece: "chart",
            kind: "bar",
            series: series(after),
            max: 1,
            highlight: HEADLINE_K - 1,
            color: "module-08",
          },
        ],
      },
      alt: `Depois do cabeçalho contextual: ${series(after).map((item) => `${item.label} ${percent(item.value)}`).join(", ")}. MRR ${fixed(mrr(after))} e ${missesAfter} perguntas fora do top-${HEADLINE_K}.`,
    },
    {
      id: "cache",
      shortTitle: "Cache",
      title: "A pergunta repetida não precisa de RAG",
      tag: "example",
      body: [
        `Num balcão de RH, metade das pessoas pergunta a mesma coisa com outras palavras. Um [[cache semântico|semantic-cache]] guarda as respostas e compara cada pergunta nova com as já respondidas pelo cosseno dos embeddings. No log de ${log.length} perguntas, com limiar de ${fixed(CACHE_THRESHOLD)}, ${hits.length} são hits: o sistema faz ${llmCallsWithCache} buscas e gerações em vez de ${log.length}.`,
        `O limiar é o risco. “${nearMiss?.query.text ?? ""}” ficou em ${fixed(nearMiss?.score ?? 0)} contra a pergunta de reembolso já guardada e passou como miss, o que está certo: é outra pergunta. Mas “${falseHit?.query.text ?? ""}” bateu ${fixed(falseHit?.score ?? 0)} com “${falseHit?.matched ?? ""}” e recebeu a resposta errada. Um hit falso entrega com confiança a resposta de outra pergunta; por isso o cache precisa de limiar alto, chave com o usuário quando a resposta depende dele e prazo de validade quando o documento muda.`,
      ],
      keyIdea: "Cache semântico corta chamadas, mas cada ponto a menos no limiar troca economia por respostas erradas.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "user", kind: "user", label: "pergunta", col: 0, row: 0.5 },
              { id: "cache", kind: "kv-cache", label: `cache ≥ ${fixed(CACHE_THRESHOLD)}`, col: 1, row: 0.5 },
              { id: "answer", kind: "answer", label: `${hits.length} hits`, col: 2, row: 0 },
              { id: "retrieval", kind: "retrieval", label: "busca", col: 2, row: 1 },
              { id: "llm", kind: "llm", label: `${llmCallsWithCache} gerações`, col: 3, row: 1 },
            ],
            edges: [
              { from: "user", to: "cache", label: "embedding" },
              { from: "cache", to: "answer", label: "hit" },
              { from: "cache", to: "retrieval", label: "miss", variant: "alternative" },
              { from: "retrieval", to: "llm" },
            ],
            active: "cache",
          },
        ],
      },
      alt: `A pergunta vai ao cache semântico, em destaque, com limiar de ${fixed(CACHE_THRESHOLD)}. ${hits.length} das ${log.length} perguntas do log são hits e recebem a resposta guardada; as outras ${llmCallsWithCache} seguem pelo caminho tracejado para a busca e a geração.`,
    },
    {
      id: "tokens",
      shortTitle: "Tokens",
      title: "Menos chunks, melhor escolhidos",
      tag: "tradeoff",
      body: [
        `Mandar ${K_WIDE} chunks “por garantia” é como levar a mala cheia para uma viagem de dois dias: pesa em toda escada. Com chunks de ${CHUNK_TOKENS} tokens, ${SYSTEM_TOKENS} de instruções e ${QUESTION_TOKENS} de pergunta, cada chamada lê ${integer(tokensWide)} tokens com k = ${K_WIDE}.`,
        `Buscando ${K_WIDE} candidatos e reordenando com um reranker (módulo 07) para mandar só ${K_RERANKED}, a chamada cai para ${integer(tokensReranked)} tokens, ${percent(tokenSaving)} a menos em custo de entrada e no tempo até o primeiro token. O risco é cortar o trecho certo: a mudança só vale se o hit@${K_RERANKED} depois do rerank ficar igual ou melhor, medido no mesmo conjunto de avaliação.`,
      ],
      keyIdea: "Rerank paga uma chamada barata para economizar tokens na chamada cara.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "cost",
            piece: "metrics-panel",
            metrics: [
              { id: "wide", label: `k = ${K_WIDE}`, value: `${integer(tokensWide)} tokens`, color: "danger" },
              { id: "reranked", label: `rerank até k = ${K_RERANKED}`, value: `${integer(tokensReranked)} tokens`, color: "success" },
              { id: "saving", label: "economia por chamada", value: percent(tokenSaving) },
              { id: "cache", label: "chamadas com cache", value: `${llmCallsWithCache} de ${log.length}` },
            ],
            highlight: "saving",
          },
        ],
      },
      alt: `Tokens de entrada por pergunta: ${integer(tokensWide)} com k = ${K_WIDE} e ${integer(tokensReranked)} com rerank até k = ${K_RERANKED}, ${percent(tokenSaving)} a menos. Com o cache, são ${llmCallsWithCache} chamadas em ${log.length} perguntas.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Medir, mudar uma coisa, medir de novo",
      tag: "summary",
      body: [
        "Otimizar RAG é um ciclo: medir a linha de base, ler as falhas, mudar uma coisa e medir de novo no mesmo conjunto. Qualidade (hit@k, faithfulness), custo (tokens, chamadas) e latência entram na mesma conta, e uma melhora num não pode esconder a piora em outro.",
        "Este módulo fecha o RAG com documentos e chunks. O módulo 09 vai além do texto solto: bases de conhecimento, grafos de conhecimento e o GraphRAG, que busca por relações entre entidades.",
      ],
      keyIdea: "A otimização certa é a que a sua avaliação mostra, não a da moda.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "cycle",
            piece: "pipeline",
            display: "chips",
            stages: [
              { id: "baseline", label: "medir a linha de base" },
              { id: "read", label: "ler as falhas" },
              { id: "change", label: "mudar uma coisa", color: "module-08" },
              { id: "measure", label: "medir de novo" },
              { id: "keep", label: "manter ou reverter", color: "brand" },
            ],
          },
        ],
      },
      alt: "Fluxo em chips: medir a linha de base, ler as falhas, mudar uma coisa, medir de novo e manter ou reverter.",
    },
  ],
  realWorldExample:
    "A Anthropic publicou em 2024 o método Contextual Retrieval: um LLM escreve, para cada chunk, uma frase situando o trecho no documento, e essa frase entra antes do embedding e do índice BM25. Nos testes publicados, as falhas de recuperação no top-20 caíram 35% só com embeddings contextuais, 49% somando BM25 contextual e 67% com reranking. Para o cache, o GPTCache é um projeto de código aberto que guarda respostas de LLM e reaproveita as de perguntas semanticamente parecidas.",
  code: {
    language: "python",
    source: `def hit_at(ranks, k):
    """Fração das perguntas com o chunk certo entre os k primeiros (0 = não veio)."""
    return sum(1 for r in ranks if 1 <= r <= k) / len(ranks)

before = [1, 3, 0, 2, 0, 1, 4, 0]
after = [1, 1, 2, 1, 0, 1, 2, 3]
for k in range(1, 6):
    print(k, hit_at(before, k), hit_at(after, k))`,
    caption: "As contas da cena: hit@k do mesmo conjunto de avaliação antes e depois do cabeçalho contextual.",
  },
  tradeOffs: {
    pros: [
      "Mudanças medidas uma a uma mostram o que de fato ajudou",
      "Cabeçalhos contextuais melhoram a busca sem trocar o modelo de embedding",
      "Cache semântico e rerank cortam chamadas e tokens na parte mais cara do pipeline",
    ],
    cons: [
      "Montar e manter o conjunto de avaliação custa tempo de especialistas",
      "Cabeçalhos gerados por LLM exigem reindexar a base inteira",
      "Um limiar de cache baixo devolve com confiança a resposta de outra pergunta",
    ],
    alternatives: [
      "Ajustar chunk size e overlap antes de técnicas mais caras",
      "Busca híbrida, quando as falhas envolvem códigos, nomes ou termos exatos",
      "Roteamento para um modelo menor nas perguntas simples",
    ],
  },
  knowledgeCheck: [
    {
      id: "one-change",
      prompt: "Um time trocou o chunk size, o modelo de embedding e o prompt na mesma semana, e o hit@3 subiu de 60% para 70%. Qual é o problema?",
      options: [
        "Nenhum: subiu, então todas as mudanças ajudaram",
        "Não dá para saber qual mudança ajudou; uma delas pode até ter piorado e sido compensada pelas outras",
        "Hit@3 não mede a busca",
        "O prompt não afeta a geração",
      ],
      correct: 1,
      explanation: "Com três mudanças juntas, o ganho não tem dono. Uma mudança por vez, no mesmo conjunto, mostra o efeito de cada uma.",
      lesson: "08-16",
    },
    {
      id: "cache-threshold",
      prompt: "O cache semântico passou a responder “quantos dias de férias tenho?” com a resposta de “quando posso tirar férias?”. O que ajustar primeiro?",
      options: [
        "Baixar o limiar para ter mais hits",
        "Subir o limiar de similaridade e revisar os hits falsos no conjunto de avaliação",
        "Aumentar o k da busca",
        "Desligar o modelo de embedding",
      ],
      correct: 1,
      explanation: "Hit falso é limiar baixo demais para essas perguntas. Subir o limiar troca um pouco de economia por respostas certas; um conjunto de pares de perguntas ajuda a escolher o valor.",
      lesson: "08-16",
    },
  ],
  related: ["08-15", "07-12", "09-05"],
  references: [
    { title: "Anthropic (2024), Introducing Contextual Retrieval", url: "https://www.anthropic.com/news/contextual-retrieval", kind: "article" },
    { title: "GPTCache: cache semântico para LLMs", url: "https://github.com/zilliztech/GPTCache", kind: "repo" },
    { title: "Gao et al. (2023), Retrieval-Augmented Generation for Large Language Models: A Survey", url: "https://arxiv.org/abs/2312.10997", kind: "paper" },
  ],
};

export default lesson;
