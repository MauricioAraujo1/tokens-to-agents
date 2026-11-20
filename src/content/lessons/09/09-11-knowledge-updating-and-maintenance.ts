import type { GraphSpec } from "../../../scene/types";
import type { LessonContent } from "../../../types/content";

// Envelhecimento e atualização de uma base de brinquedo, calculados aqui. Oito fatos conferidos no mesmo
// dia, cada um com o prazo de validade do seu tipo: a curva mostra a fração vencida mês a mês, sem revisão.
// Depois, fatos com intervalo de validade (início e fim) respondem "quem lidera o Atlas?" em duas datas,
// e a invalidação encerra o fato antigo em vez de apagá-lo.

const percent = (value: number) => `${Math.round(value * 100)}%`;
const DAYS_PER_MONTH = 30;

const facts: Array<{ label: string; kind: string; maxAgeDays: number }> = [
  { label: "preço do plano Pro", kind: "preço", maxAgeDays: 30 },
  { label: "preço do plano Básico", kind: "preço", maxAgeDays: 30 },
  { label: "prazo de reembolso", kind: "política", maxAgeDays: 180 },
  { label: "regra de home office", kind: "política", maxAgeDays: 180 },
  { label: "gerente do Banco Sol", kind: "organograma", maxAgeDays: 90 },
  { label: "líder do Atlas", kind: "organograma", maxAgeDays: 90 },
  { label: "limite da API", kind: "especificação", maxAgeDays: 365 },
  { label: "endereço do suporte", kind: "especificação", maxAgeDays: 365 },
];

const months = [0, 2, 4, 6, 8, 10, 12, 14];
const staleAt = (month: number) => facts.filter((fact) => month * DAYS_PER_MONTH > fact.maxAgeDays).length;
const staleSeries = months.map((month) => ({ label: `mês ${month}`, value: Math.round((staleAt(month) / facts.length) * 100) }));
const firstHalf = months.find((month) => staleAt(month) / facts.length >= 0.5) ?? 0;
const kinds = [...new Set(facts.map((fact) => fact.kind))];
const maxAgeOf = (kind: string) => facts.find((fact) => fact.kind === kind)?.maxAgeDays ?? 0;

// Fatos com validade no tempo. `end` vazio quer dizer que o fato ainda vale.
interface TimedFact {
  subject: string;
  predicate: string;
  object: string;
  start: string;
  end?: string;
}
const timeline: TimedFact[] = [
  { subject: "Ana", predicate: "cargo", object: "Analista", start: "2022-01", end: "2024-03" },
  { subject: "Ana", predicate: "cargo", object: "Gerente", start: "2024-03" },
  { subject: "Ana", predicate: "lidera", object: "Atlas", start: "2023-05", end: "2025-08" },
  { subject: "Bruno", predicate: "lidera", object: "Atlas", start: "2025-08" },
];
const validAt = (fact: TimedFact, month: string) => fact.start <= month && (fact.end === undefined || month < fact.end);
const leaderAt = (month: string) =>
  timeline.filter((fact) => fact.predicate === "lidera" && fact.object === "Atlas" && validAt(fact, month)).map((fact) => fact.subject);
const PAST = "2024-10";
const NOW = "2026-06";
const pastLeader = leaderAt(PAST).join(", ");
const currentLeader = leaderAt(NOW).join(", ");
const closed = timeline.filter((fact) => fact.end !== undefined).length;
const shortMonth = (month: string) => `${month.slice(5, 7)}/${month.slice(2, 4)}`;
const edgeLabel = (fact: TimedFact) =>
  fact.end === undefined ? `${fact.predicate} desde ${shortMonth(fact.start)}` : `${fact.predicate} até ${shortMonth(fact.end)}`;

const temporalGraph = (extra: Partial<GraphSpec>): GraphSpec => ({
  id: "timeline",
  piece: "graph",
  nodes: [
    { id: "Ana", label: "Ana", x: 0, y: 0.5 },
    { id: "Bruno", label: "Bruno", x: 1, y: 0.5 },
    { id: "Atlas", label: "Atlas", x: 0.5, y: 0 },
    { id: "Analista", label: "Analista", x: 0.2, y: 1 },
    { id: "Gerente", label: "Gerente", x: 0.55, y: 1 },
  ],
  edges: timeline.map((fact) => ({ from: fact.subject, to: fact.object, label: edgeLabel(fact) })),
  ...extra,
});

const provenance = {
  fact: "reembolso: 7 dias",
  source: "politica-reembolso-v4.pdf",
  extractedBy: "extrator v2",
  extractedAt: "2026-05-02",
  checkedAt: "2026-06-10",
};

const lesson: LessonContent = {
  id: "09-11",
  subtitle: "Todo fato tem prazo: como medir o envelhecimento, guardar a validade e a origem de cada fato, e atualizar a base sem apagar o histórico.",
  objectives: [
    "Medir o frescor de um fato pelo prazo de validade do seu tipo",
    "Guardar fatos com intervalo de validade e consultar o que valia numa data",
    "Registrar a proveniência de cada fato",
    "Desenhar uma atualização incremental que invalida em vez de apagar",
  ],
  steps: [
    {
      id: "stale",
      shortTitle: "Envelheceu",
      title: "A política mudou; a base, não",
      tag: "context",
      body: [
        "O financeiro mudou o prazo de reembolso de 7 para 14 dias. O PDF novo foi para a intranet, mas a wiki, o grafo e o índice continuam dizendo 7. O assistente responde com toda a confiança, cita a fonte e erra, porque a fonte que ele cita é a versão velha.",
        "Nenhuma das técnicas do módulo protege contra isso sozinha: grafo, wiki e RAG guardam o que receberam. Manter conhecimento é um processo contínuo: saber quando cada fato foi conferido, perceber quando a fonte muda e atualizar o que depende dela. É o equivalente, para a base, do [[corte de conhecimento|knowledge-cutoff]] de um modelo: tudo tem uma data a partir da qual não sabe mais.",
      ],
      keyIdea: "Uma base de conhecimento não fica errada de repente: ela fica velha em silêncio.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "source", kind: "documents", label: "política: 14 dias", col: 0, row: 0 },
              { id: "kb", kind: "nosql-db", label: "base: 7 dias", col: 1, row: 0.5 },
              { id: "llm", kind: "llm", label: "assistente", col: 2, row: 0.5 },
              { id: "wrong", kind: "no-result", label: "resposta vencida", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "source", to: "kb", label: "não chegou", variant: "alternative" },
              { from: "kb", to: "llm", label: "7 dias" },
              { from: "llm", to: "wrong" },
            ],
            active: "kb",
          },
        ],
      },
      alt: "A política nova, de 14 dias, não chega à base, num caminho tracejado; a base, em destaque, ainda diz 7 dias, e o assistente dá uma resposta vencida.",
    },
    {
      id: "freshness",
      shortTitle: "Frescor",
      title: "Cada tipo de fato tem um prazo",
      tag: "mechanism",
      body: [
        "Leite e sal ficam no mesmo armário, mas têm validades muito diferentes. Fatos também: preço muda todo mês, especificação técnica dura um ano. Tratar tudo com o mesmo prazo ou revisa demais o estável ou deixa o volátil apodrecer.",
        `O [[frescor do conhecimento|knowledge-freshness]] compara o tempo desde a última conferência com o prazo do tipo: ${kinds.map((kind) => `${kind}, ${maxAgeOf(kind)} dias`).join("; ")}. Com os ${facts.length} fatos conferidos no mesmo dia e nenhuma revisão, a curva mostra a fração vencida: ${percent(staleAt(2) / facts.length)} no mês 2, ${percent(staleAt(firstHalf) / facts.length)} já no mês ${firstHalf} e ${percent(staleAt(14) / facts.length)} no mês 14. A revisão de cada fato vai para a fila antes do vencimento, por tipo.`,
      ],
      keyIdea: "Frescor = idade da conferência ÷ prazo do tipo. O prazo é do tipo de fato, não da base inteira.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "stale",
            piece: "chart",
            kind: "line",
            series: staleSeries,
            max: 100,
            highlight: months.indexOf(firstHalf),
            color: "module-09",
          },
        ],
      },
      alt: `Porcentagem de fatos vencidos sem revisão: ${staleSeries.map((item) => `${item.label} ${item.value}%`).join(", ")}. No mês ${firstHalf}, metade já venceu.`,
    },
    {
      id: "validity",
      shortTitle: "Validade",
      title: "Guardar quando cada fato valeu",
      tag: "mechanism",
      body: [
        `Quando a liderança do Atlas passa da Ana para o Bruno, apagar “Ana lidera Atlas” parece certo, mas perde uma informação: quem liderava em outubro de 2024? Um contrato, uma auditoria ou um relatório antigo podem precisar dessa resposta.`,
        `Com [[validade temporal|temporal-validity]], cada aresta tem início e fim. A consulta passa a ter uma data: em ${PAST}, o líder do Atlas era ${pastLeader}; em ${NOW}, é ${currentLeader}. A cena destaca o fato vigente. Dos ${timeline.length} fatos, ${closed} estão encerrados e continuam consultáveis. O Wikidata faz o mesmo com os qualificadores de data de início e de fim nas afirmações.`,
      ],
      keyIdea: "Fato com início e fim responde “o que vale hoje” e também “o que valia naquela data”.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [temporalGraph({ path: [currentLeader, "Atlas"], highlight: [currentLeader], visited: [currentLeader, "Atlas"] })],
      },
      alt: `Grafo temporal: Ana foi Analista até ${shortMonth("2024-03")} e é Gerente desde então; Ana liderou o Atlas até ${shortMonth("2025-08")}; ${currentLeader}, em destaque, lidera o Atlas desde ${shortMonth("2025-08")}.`,
    },
    {
      id: "provenance",
      shortTitle: "Origem",
      title: "De onde veio, e quando foi conferido",
      tag: "mechanism",
      body: [
        "Um fato sem origem é um boato. Quando o assistente diz “o reembolso é de 7 dias”, a pergunta seguinte de quem audita é: segundo qual documento, de quando, e quem conferiu? Sem essas respostas, não dá para saber se o erro está na fonte, na extração ou na atualização.",
        `A [[proveniência|provenance]] guarda, por fato: a fonte (${provenance.source}), o processo que extraiu (${provenance.extractedBy}, em ${provenance.extractedAt}) e a última conferência (${provenance.checkedAt}). Ela permite achar todos os fatos que vieram de um documento quando ele muda, e refazer só os que um extrator com defeito produziu. O W3C tem um vocabulário padrão para isso, o PROV-O.`,
      ],
      keyIdea: "Fonte, processo e datas por fato: é o que permite atualizar só o que mudou e explicar cada resposta.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "provenance",
            piece: "metrics-panel",
            metrics: [
              { id: "fact", label: "fato", value: provenance.fact, color: "module-09" },
              { id: "source", label: "fonte", value: provenance.source },
              { id: "extracted", label: "extraído", value: `${provenance.extractedBy} · ${provenance.extractedAt}` },
              { id: "checked", label: "conferido em", value: provenance.checkedAt, color: "success" },
            ],
            highlight: "source",
          },
        ],
      },
      alt: `Proveniência do fato ${provenance.fact}: fonte ${provenance.source}, extraído por ${provenance.extractedBy} em ${provenance.extractedAt} e conferido em ${provenance.checkedAt}.`,
    },
    {
      id: "update",
      shortTitle: "Atualizar",
      title: "Atualizar sem apagar a história",
      tag: "example",
      body: [
        "O PDF da política muda. Reprocessar a base inteira toda noite é caro e lento; esperar alguém lembrar é pior. O caminho é reagir à mudança da fonte e tocar só o que depende dela.",
        `O [[hash do conteúdo|content-hash]] revela que o PDF mudou, e a [[indexação incremental|incremental-indexing]] manda só ele para a fila. O extrator relê, a proveniência acha os fatos que vieram dele, e cada fato substituído recebe [[invalidação|fact-invalidation]]: a data de fim, em vez de ser apagado. Se o fato novo contradiz outra fonte, a atualização para e vai para revisão humana. Tudo idempotente: reprocessar o mesmo hash não muda nada.`,
      ],
      keyIdea: "Detectar pela fonte, reprocessar só o afetado, invalidar o antigo, e chamar uma pessoa quando houver conflito.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "update",
            piece: "block-diagram",
            blocks: [
              { id: "source", kind: "documents", label: "pdf mudou", col: 0, row: 0 },
              { id: "hash", kind: "kv-cache", label: "hash novo", col: 1, row: 0 },
              { id: "queue", kind: "queue", label: "fila", col: 2, row: 0 },
              { id: "extract", kind: "agent", label: "reextrair", col: 3, row: 0 },
              { id: "check", kind: "eval", label: "conflito?", col: 3, row: 1 },
              { id: "graph", kind: "nosql-db", label: "invalida o antigo", col: 2, row: 1 },
            ],
            edges: [
              { from: "source", to: "hash" },
              { from: "hash", to: "queue", label: "só o afetado" },
              { from: "queue", to: "extract" },
              { from: "extract", to: "check" },
              { from: "check", to: "graph", label: "sem conflito" },
            ],
            active: "check",
            done: ["source", "hash", "queue", "extract"],
          },
        ],
      },
      alt: "O PDF mudou e gera um hash novo; só o documento afetado vai para a fila e é reextraído; a checagem de conflito, em destaque, libera a gravação, que invalida o fato antigo em vez de apagar.",
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Manter é parte do sistema",
      tag: "summary",
      body: [
        "Prazo por tipo de fato, validade com início e fim, proveniência por fato, atualização disparada pela mudança da fonte, invalidação em vez de remoção e revisão humana nos conflitos. Com isso, a base sabe o que está velho, o que valia antes e de onde veio cada resposta.",
        "Assim termina o módulo de sistemas de conhecimento. O próximo muda de assunto: o que acontece dentro do servidor quando o modelo gera tokens, e como fazer a inferência ficar rápida e barata.",
      ],
      keyIdea: "Conhecimento confiável = fato + validade + origem + um processo que percebe quando a fonte muda.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "steps",
            piece: "pipeline",
            display: "chips",
            stages: [
              { id: "ttl", label: "prazo por tipo de fato" },
              { id: "validity", label: "início e fim" },
              { id: "provenance", label: "fonte e datas", color: "module-09" },
              { id: "detect", label: "detectar pela fonte" },
              { id: "invalidate", label: "invalidar, não apagar" },
              { id: "review", label: "revisão humana nos conflitos", color: "brand" },
            ],
          },
        ],
      },
      alt: "Fluxo em chips: prazo por tipo de fato, início e fim, fonte e datas, detectar pela fonte, invalidar sem apagar e revisão humana nos conflitos.",
    },
  ],
  realWorldExample:
    "No Wikidata, uma afirmação pode ter qualificadores de data de início (P580) e de fim (P582), referências que dizem de onde veio, e um ranking: preferida, normal ou obsoleta. Quando um dado muda, como o chefe de governo de um país, a afirmação antiga não é apagada: ela ganha data de fim, e a nova passa a ser a preferida.",
  code: {
    language: "python",
    source: `from datetime import date

fatos = [
    ("Ana", "lidera", "Atlas", date(2023, 5, 1), date(2025, 8, 1)),
    ("Bruno", "lidera", "Atlas", date(2025, 8, 1), None),   # fim vazio: ainda vale
]

def quem_lidera(projeto, em):
    return [s for s, p, o, inicio, fim in fatos
            if p == "lidera" and o == projeto and inicio <= em and (fim is None or em < fim)]

print(quem_lidera("Atlas", date(2024, 10, 1)))  # ['Ana']
print(quem_lidera("Atlas", date(2026, 6, 30)))  # ['Bruno']`,
    caption: "Fatos com início e fim: a mesma pergunta, feita em duas datas, responde quem valia em cada uma.",
  },
  tradeOffs: {
    pros: [
      "O sistema sabe o que está vencido antes de responder com ele",
      "Histórico preservado: dá para responder o que valia numa data e auditar mudanças",
      "Atualização incremental pela fonte custa só o que mudou",
    ],
    cons: [
      "Cada fato carrega mais campos (validade, fonte, datas) e as consultas ficam mais complexas",
      "Prazos por tipo precisam de dono e de revisão",
      "Conflitos entre fontes exigem revisão humana, que não escala sozinha",
    ],
    alternatives: [
      "Reprocessar a base inteira em intervalos fixos, para bases pequenas",
      "Ferramentas que leem a fonte na hora, para dados muito voláteis",
    ],
  },
  knowledgeCheck: [
    {
      id: "invalidate",
      prompt: "O gerente da conta Banco Sol mudou. Qual é a atualização certa no grafo?",
      options: [
        "Apagar a aresta antiga e criar a nova",
        "Pôr data de fim na aresta antiga e criar a nova com data de início, ambas com a fonte da mudança",
        "Manter as duas arestas sem datas",
        "Esperar o próximo reprocessamento completo da base",
      ],
      correct: 1,
      explanation: "Invalidar preserva o histórico e responde perguntas sobre datas passadas. A fonte registrada explica a mudança e permite desfazê-la se a fonte estiver errada.",
      lesson: "09-11",
    },
    {
      id: "freshness-kind",
      prompt: "Uma base revisa todos os fatos a cada 180 dias. Qual é o problema?",
      options: [
        "Nenhum: 180 dias é um prazo seguro",
        "Fatos voláteis, como preços mensais, passam a maior parte do tempo vencidos, e fatos estáveis são revisados sem necessidade",
        "A base fica lenta",
        "Os embeddings perdem qualidade",
      ],
      correct: 1,
      explanation: "O prazo certo é o do tipo de fato. Um prazo único é longo demais para o volátil e curto demais para o estável.",
      lesson: "09-11",
    },
  ],
  related: ["09-10", "08-03", "10-01"],
  references: [
    { title: "Wikidata: Help:Ranking", url: "https://www.wikidata.org/wiki/Help:Ranking", kind: "docs" },
    { title: "W3C: PROV-O, The PROV Ontology", url: "https://www.w3.org/TR/prov-o/", kind: "docs" },
    { title: "Graphiti: grafos de conhecimento temporais para agentes", url: "https://github.com/getzep/graphiti", kind: "repo" },
  ],
};

export default lesson;
