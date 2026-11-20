import type { GraphSpec, SceneColor } from "../../../scene/types";
import type { LessonContent } from "../../../types/content";

// GraphRAG num corpus de brinquedo, calculado aqui. As triplas de cada um dos 6 chunks são fixas, como se
// um LLM as tivesse extraído. Elas viram um grafo de entidades, e a fase de movimento local do Louvain (a
// base do Leiden, que o GraphRAG da Microsoft usa) agrupa os nós em comunidades, com a modularidade da
// divisão. As chamadas de LLM de cada etapa saem das contagens: uma extração por chunk, um relatório por
// comunidade, um "map" por relatório e um "reduce" na busca global.

type Triple = [subject: string, predicate: string, object: string];

const chunks: Array<{ id: string; triples: Triple[] }> = [
  { id: "c1", triples: [["Ana", "lidera", "Atlas"], ["Atlas", "usa", "Postgres"]] },
  { id: "c2", triples: [["Atlas", "roda_em", "Orion"], ["Atlas", "publica_em", "Kafka"]] },
  { id: "c3", triples: [["Orion", "hospeda", "Postgres"], ["Orion", "hospeda", "Kafka"]] },
  { id: "c4", triples: [["Bruno", "mentora", "Ana"], ["Bruno", "mentora", "Caio"], ["Ana", "trabalha_com", "Caio"]] },
  { id: "c5", triples: [["Caio", "atende", "Banco Sol"], ["Banco Sol", "assina", "Contrato"]] },
  { id: "c6", triples: [["Varejo Max", "assina", "Contrato"], ["Varejo Max", "indicou", "Banco Sol"]] },
];

const triples = chunks.flatMap((chunk) => chunk.triples);
const entities = [...new Set(triples.flatMap(([subject, , object]) => [subject, object]))];
const m = triples.length;
const neighbors = new Map<string, string[]>(entities.map((entity) => [entity, []]));
for (const [subject, , object] of triples) {
  neighbors.get(subject)?.push(object);
  neighbors.get(object)?.push(subject);
}
const degree = (node: string) => neighbors.get(node)?.length ?? 0;

/** Fase de movimento local do Louvain: cada nó vai para a comunidade vizinha que mais aumenta a modularidade. */
function localMoving(): Map<string, string> {
  const community = new Map<string, string>(entities.map((entity) => [entity, entity]));
  const total = (label: string) =>
    entities.filter((entity) => community.get(entity) === label).reduce((sum, entity) => sum + degree(entity), 0);
  let moved = true;
  while (moved) {
    moved = false;
    for (const node of entities) {
      const own = community.get(node) ?? node;
      community.delete(node);
      const options = [...new Set([own, ...(neighbors.get(node) ?? []).flatMap((other) => community.get(other) ?? [])])];
      let best = own;
      let bestGain = Number.NEGATIVE_INFINITY;
      for (const option of options) {
        const linksIn = (neighbors.get(node) ?? []).filter((other) => community.get(other) === option).length;
        const gain = linksIn - (degree(node) * total(option)) / (2 * m);
        if (gain > bestGain + 1e-12) {
          bestGain = gain;
          best = option;
        }
      }
      community.set(node, best);
      if (best !== own) moved = true;
    }
  }
  return community;
}

const community = localMoving();
const groups = [...new Set(entities.map((entity) => community.get(entity) ?? entity))];
const membersOf = (group: string) => entities.filter((entity) => community.get(entity) === group);
const modularityOf = (assignment: (entity: string) => string) => {
  const labels = [...new Set(entities.map(assignment))];
  return labels.reduce((sum, label) => {
    const inside = triples.filter(([subject, , object]) => assignment(subject) === label && assignment(object) === label).length;
    const degrees = entities.filter((entity) => assignment(entity) === label).reduce((total, entity) => total + degree(entity), 0);
    return sum + inside / m - (degrees / (2 * m)) ** 2;
  }, 0);
};
const modularity = modularityOf((entity) => community.get(entity) ?? entity);
const bridges = triples.filter(([subject, , object]) => community.get(subject) !== community.get(object));

const NAMES: Array<[member: string, name: string]> = [
  ["Atlas", "plataforma"],
  ["Ana", "equipe"],
  ["Contrato", "clientes"],
];
const nameOf = (group: string) => NAMES.find(([member]) => community.get(member) === group)?.[1] ?? group;
const COLORS: SceneColor[] = ["info", "success", "module-09"];
const colorOf = (entity: string) => COLORS[groups.indexOf(community.get(entity) ?? entity) % COLORS.length];

// Busca global contra top-k: cada chunk cobre o tema da comunidade da maioria das suas entidades.
const themeOf = (chunk: (typeof chunks)[number]) => {
  const votes = chunk.triples.flatMap(([subject, , object]) => [subject, object]).map((entity) => community.get(entity) ?? entity);
  return [...new Set(votes)].sort((a, b) => votes.filter((vote) => vote === b).length - votes.filter((vote) => vote === a).length)[0];
};
const themes = new Set(chunks.map(themeOf));
const TOP_K = 2;
const topKThemesMax = Math.min(TOP_K, themes.size);

const llmCalls = {
  ragIndex: 0,
  graphIndex: chunks.length + groups.length,
  ragQuery: 1,
  localQuery: 1,
  globalQuery: groups.length + 1,
};
const callSeries = [
  { label: "índice RAG", value: llmCalls.ragIndex },
  { label: "índice GraphRAG", value: llmCalls.graphIndex },
  { label: "consulta RAG", value: llmCalls.ragQuery },
  { label: "consulta local", value: llmCalls.localQuery },
  { label: "consulta global", value: llmCalls.globalQuery },
];

const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });

const layout: Record<string, { x: number; y: number }> = {
  Postgres: { x: 0, y: 0 },
  Kafka: { x: 0.35, y: 0 },
  Atlas: { x: 0.25, y: 0.5 },
  Orion: { x: 0, y: 0.75 },
  Ana: { x: 0.5, y: 0.6 },
  Bruno: { x: 0.65, y: 1 },
  Caio: { x: 0.7, y: 0.45 },
  "Banco Sol": { x: 0.85, y: 0.1 },
  Contrato: { x: 1, y: 0.55 },
  "Varejo Max": { x: 0.6, y: 0 },
};
const graph: GraphSpec = {
  id: "entities",
  piece: "graph",
  nodes: entities.map((entity) => ({ id: entity, label: entity, color: colorOf(entity), ...layout[entity] })),
  edges: triples.map(([subject, , object]) => ({ from: subject, to: object })),
  highlight: bridges.flatMap(([subject, , object]) => [subject, object]),
};

const lesson: LessonContent = {
  id: "09-05",
  subtitle: "Quando a pergunta é sobre o corpus inteiro: extrair um grafo de entidades, agrupar em comunidades, resumir cada uma e responder em map-reduce.",
  objectives: [
    "Explicar por que o RAG com top-k falha em perguntas globais sobre o corpus",
    "Descrever a indexação do GraphRAG: extração, grafo, comunidades e relatórios",
    "Calcular uma divisão em comunidades e a sua modularidade",
    "Comparar a busca global e a busca local, e o custo de cada uma em chamadas de LLM",
  ],
  steps: [
    {
      id: "global",
      shortTitle: "O todo",
      title: "“Do que trata este acervo?”",
      tag: "context",
      body: [
        `Peça a um bibliotecário um resumo dos temas da biblioteca, e ele traz ${TOP_K} páginas soltas, as que mais se parecem com a sua pergunta. É o que o RAG com [[top-k|top-k]] faz: ele é ótimo para achar o trecho que responde, mas uma pergunta sobre o todo não tem um trecho que responde.`,
        `No corpus da aula, ${chunks.length} [[chunks|chunk]] cobrem ${themes.size} temas. Com k = ${TOP_K}, o contexto traz no máximo ${topKThemesMax} temas, e o modelo resume o que viu, não o corpus. O [[GraphRAG|graphrag]] (Edge et al., Microsoft Research, 2024) foi proposto para essas perguntas de entendimento global: ele prepara, na indexação, resumos que cobrem o corpus inteiro.`,
      ],
      keyIdea: "Top-k responde “onde está?”; perguntas sobre o todo pedem um resumo preparado de todo o corpus.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "user", kind: "user", label: "quais os temas?", col: 0, row: 0.5 },
              { id: "retrieval", kind: "retrieval", label: `top-${TOP_K}`, col: 1, row: 0.5 },
              { id: "context", kind: "context", label: `${TOP_K} chunks`, col: 2, row: 0.5 },
              { id: "partial", kind: "no-result", label: "visão parcial", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "user", to: "retrieval" },
              { from: "retrieval", to: "context", label: `de ${chunks.length}` },
              { from: "context", to: "partial", label: `≤ ${topKThemesMax} de ${themes.size} temas`, variant: "alternative" },
            ],
            active: "context",
          },
        ],
      },
      alt: `A pergunta sobre os temas passa pelo top-${TOP_K}, que traz ${TOP_K} dos ${chunks.length} chunks; o contexto, em destaque, cobre no máximo ${topKThemesMax} dos ${themes.size} temas e leva a uma visão parcial.`,
    },
    {
      id: "index",
      shortTitle: "Indexar",
      title: "Indexação: texto, entidades, grafo",
      tag: "mechanism",
      body: [
        `O GraphRAG gasta o trabalho antes da pergunta. Para cada chunk, um LLM faz a [[extração de entidades|entity-extraction]]: lista entidades, relações e uma descrição curta de cada uma. Entidades com o mesmo nome em chunks diferentes viram um nó só.`,
        `Nos ${chunks.length} chunks da aula, as extrações somam ${triples.length} relações entre ${entities.length} entidades. A Ana aparece em c1 e em c4; o Atlas, em c1 e em c2: é essa fusão que liga trechos que nunca citam um ao outro. Depois vêm as comunidades e os relatórios, com mais chamadas de LLM.`,
      ],
      keyIdea: "A indexação do GraphRAG lê cada chunk com um LLM e funde as entidades num grafo só.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "docs", kind: "documents", label: `${chunks.length} chunks`, col: 0, row: 0 },
              { id: "extract", kind: "llm", label: "extração", col: 1, row: 0 },
              { id: "graph", kind: "nosql-db", label: `${entities.length} entidades`, col: 2, row: 0 },
              { id: "communities", kind: "retrieval", label: "comunidades", col: 3, row: 0 },
              { id: "reports", kind: "llm", label: "relatórios", col: 3, row: 1 },
              { id: "store", kind: "documents", label: `${groups.length} resumos`, col: 2, row: 1 },
            ],
            edges: [
              { from: "docs", to: "extract" },
              { from: "extract", to: "graph", label: `${triples.length} relações` },
              { from: "graph", to: "communities", label: "leiden" },
              { from: "communities", to: "reports" },
              { from: "reports", to: "store" },
            ],
            active: "extract",
          },
        ],
      },
      alt: `${chunks.length} chunks passam pela extração do LLM, em destaque, que gera ${triples.length} relações entre ${entities.length} entidades; o grafo é dividido em comunidades, e um LLM escreve ${groups.length} resumos.`,
    },
    {
      id: "communities",
      shortTitle: "Comunidades",
      title: "Agrupar o grafo em comunidades",
      tag: "mechanism",
      body: [
        `Olhe o grafo e os grupos aparecem: a turma da plataforma, a equipe, os clientes. A [[detecção de comunidades|community-detection]] acha esses grupos sozinha: muitas arestas dentro, poucas entre eles. Aqui, ${groups.length} comunidades (${groups.map((group) => `${nameOf(group)}: ${membersOf(group).join(", ")}`).join("; ")}), ligadas só por ${bridges.length} arestas, em destaque.`,
        `A nota da divisão é a [[modularidade|modularity]]: Q = Σ (Lc / m − (dc / 2m)²), em que Lc são as arestas dentro da comunidade, dc a soma dos graus e m o total de arestas. Esta divisão tem Q = ${fixed(modularity)}; tudo numa comunidade só daria ${fixed(Math.abs(modularityOf(() => "todos")))}. O GraphRAG usa o [[Leiden|leiden-algorithm]] (Traag et al., 2019) de forma hierárquica, com comunidades dentro de comunidades. A cena usa a fase de movimento local do Louvain, que é a base do Leiden.`,
      ],
      keyIdea: "Comunidades são os temas do corpus, achados pela estrutura do grafo, não por palavras.",
      scene: { kind: "pieces", layout: "single", pieces: [graph] },
      alt: `Grafo de ${entities.length} entidades colorido por ${groups.length} comunidades: ${groups.map((group) => `${nameOf(group)} com ${membersOf(group).join(", ")}`).join("; ")}. As ${bridges.length} arestas entre comunidades ligam os nós em destaque.`,
    },
    {
      id: "map-reduce",
      shortTitle: "Busca global",
      title: "Relatórios e busca global em map-reduce",
      tag: "mechanism",
      body: [
        `Para cada comunidade, um LLM escreve um [[relatório de comunidade|community-report]]: quem está nela, como se relacionam e os fatos principais. É como ter um resumo por estante da biblioteca, escrito antes de alguém perguntar.`,
        `A [[busca global|graphrag-global-search]] responde em map-reduce. No map, cada um dos ${groups.length} relatórios recebe a pergunta e gera uma resposta parcial com uma nota de utilidade. No reduce, as parciais com nota mais alta são juntadas numa resposta final. São ${groups.length} + 1 = ${llmCalls.globalQuery} chamadas, e a resposta cobre os ${themes.size} temas porque todo relatório foi lido.`,
      ],
      keyIdea: "Busca global: perguntar a cada resumo de comunidade e juntar as respostas parciais.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "global",
            piece: "pipeline",
            stages: [
              { id: "question", label: "pergunta" },
              { id: "report", label: "relatório" },
              { id: "partial", label: "parcial + nota", color: "module-09" },
              { id: "reduce", label: "reduce" },
              { id: "answer", label: "resposta", color: "brand" },
            ],
            active: "partial",
            done: ["question", "report"],
            repeat: { from: "report", to: "partial", label: `× ${groups.length}` },
          },
        ],
      },
      alt: `Pipeline da busca global: a pergunta vai a cada relatório, que gera uma resposta parcial com nota, repetido ${groups.length} vezes; o reduce junta as parciais na resposta.`,
    },
    {
      id: "compare",
      shortTitle: "Comparar",
      title: "Global e local, lado a lado",
      tag: "example",
      body: [
        `Para “quais são os temas do acervo?”, a busca global lê os ${groups.length} relatórios e cobre os ${themes.size} temas; o top-${TOP_K} cobre no máximo ${topKThemesMax}. No artigo original, os autores compararam as respostas com as de um RAG vetorial usando um LLM como juiz, e a busca global ganhou em abrangência e diversidade em perguntas desse tipo.`,
        "Para perguntas sobre uma entidade, como “com quem a Ana trabalha?”, o GraphRAG tem a [[busca local|graphrag-local-search]]: acha a Ana no grafo, junta os vizinhos, as relações, o relatório da comunidade dela e os chunks de origem, e responde numa chamada só. Global para o todo, local para o específico.",
      ],
      keyIdea: "Pergunta sobre o todo: busca global. Pergunta sobre uma entidade: busca local, a partir do nó.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "coverage",
            piece: "metrics-panel",
            metrics: [
              { id: "themes", label: "temas no corpus", value: String(themes.size) },
              { id: "topk", label: `cobertos com top-${TOP_K}`, value: `≤ ${topKThemesMax}`, color: "danger" },
              { id: "global", label: "cobertos com busca global", value: String(themes.size), color: "success" },
              { id: "calls", label: "chamadas na busca global", value: String(llmCalls.globalQuery), color: "info" },
            ],
            highlight: "global",
          },
        ],
      },
      alt: `Painel: ${themes.size} temas no corpus; o top-${TOP_K} cobre no máximo ${topKThemesMax}; a busca global, em destaque, cobre ${themes.size}, com ${llmCalls.globalQuery} chamadas de LLM.`,
    },
    {
      id: "cost",
      shortTitle: "Custo",
      title: "O preço: LLM na indexação inteira",
      tag: "tradeoff",
      body: [
        `O RAG vetorial indexa sem chamar o LLM: só embeddings. O GraphRAG chama o LLM uma vez por chunk para extrair e uma vez por comunidade para resumir: ${chunks.length} + ${groups.length} = ${llmCalls.graphIndex} chamadas neste brinquedo. Num acervo real, com milhares de chunks e hierarquia de comunidades, essa conta domina o custo, e a extração é refeita quando os documentos mudam.`,
        "A extração também erra: entidades duplicadas (“Banco Sol” e “Bco. Sol”), relações inventadas, nomes fundidos que eram pessoas diferentes. Por isso surgiram variantes mais baratas, como o LightRAG (Guo et al., 2024), e o próprio GraphRAG recomenda ajustar os prompts de extração ao domínio. Vale para corpora estáveis com muitas perguntas sobre o todo; para perguntas pontuais, o RAG comum basta.",
      ],
      keyIdea: "GraphRAG troca custo de indexação por respostas globais: vale quando o corpus é estável e as perguntas são amplas.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "calls",
            piece: "chart",
            kind: "bar",
            series: callSeries,
            highlight: 1,
            color: "module-09",
          },
        ],
      },
      alt: `Chamadas de LLM no brinquedo: ${callSeries.map((item) => `${item.label} ${item.value}`).join(", ")}. A indexação do GraphRAG, em destaque, é a etapa mais cara.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Grafo, comunidades, relatórios",
      tag: "summary",
      body: [
        "GraphRAG: extrair entidades e relações de cada chunk com um LLM, fundir num grafo, agrupar em comunidades com Leiden, resumir cada comunidade e responder em map-reduce sobre os resumos (global) ou a partir das entidades da pergunta (local).",
        "A próxima aula foca no lado da consulta: como achar as entidades da pergunta no grafo, andar vários saltos e montar o contexto a partir do subgrafo.",
      ],
      keyIdea: "O GraphRAG prepara o entendimento do corpus na indexação, para responder sobre o todo na consulta.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "docs", kind: "documents", label: "chunks", col: 0, row: 0 },
              { id: "graph", kind: "nosql-db", label: "grafo", col: 1, row: 0 },
              { id: "store", kind: "documents", label: "relatórios", col: 2, row: 0 },
              { id: "user", kind: "user", label: "pergunta", col: 0, row: 1 },
              { id: "llm", kind: "llm", label: "map-reduce", col: 2, row: 1 },
              { id: "answer", kind: "answer", label: "resposta global", col: 3, row: 1 },
            ],
            edges: [
              { from: "docs", to: "graph", label: "extração" },
              { from: "graph", to: "store", label: "comunidades" },
              { from: "store", to: "llm" },
              { from: "user", to: "llm" },
              { from: "llm", to: "answer" },
            ],
            active: "llm",
            done: ["docs", "graph", "store", "user"],
          },
        ],
      },
      alt: "Na indexação, chunks viram grafo e o grafo vira relatórios de comunidade; na consulta, a pergunta e os relatórios vão ao LLM em map-reduce, em destaque, que dá a resposta global.",
    },
  ],
  realWorldExample:
    "A Microsoft Research publicou o GraphRAG como projeto de código aberto, com o pipeline de indexação (extração de entidades, comunidades hierárquicas com Leiden e relatórios) e os modos de consulta global e local. No artigo, a avaliação usou corpora de transcrições de podcast e de notícias, com perguntas de entendimento global geradas para cada corpus.",
  code: {
    language: "bash",
    source: `pip install graphrag
graphrag init --root ./acervo          # cria settings.yaml e os prompts de extração
# copie os .txt para ./acervo/input e configure a chave do LLM no .env
graphrag index --root ./acervo         # extrai, monta o grafo, detecta comunidades, escreve relatórios
graphrag query --root ./acervo --method global --query "Quais são os principais temas?"
graphrag query --root ./acervo --method local --query "Com quem a Ana trabalha?"`,
    caption: "O fluxo da CLI do GraphRAG da Microsoft: indexar uma vez e consultar nos modos global e local.",
  },
  tradeOffs: {
    pros: [
      "Responde perguntas sobre o corpus inteiro, que o top-k não alcança",
      "Funde entidades de chunks diferentes e liga trechos que não se citam",
      "Os relatórios de comunidade servem também como sumário navegável do acervo",
    ],
    cons: [
      "Uma chamada de LLM por chunk e por comunidade na indexação",
      "Erros de extração (duplicatas, relações inventadas) entram no grafo",
      "Atualizar o corpus pede refazer extração e comunidades das partes afetadas",
    ],
    alternatives: [
      "RAG vetorial com reranking, para perguntas pontuais",
      "Resumo hierárquico dos documentos, sem grafo, quando as entidades importam pouco",
    ],
  },
  knowledgeCheck: [
    {
      id: "when-global",
      prompt: "Qual pergunta pede a busca global do GraphRAG, e não a local?",
      options: [
        "“Qual é o e-mail do Caio?”",
        "“Quais riscos aparecem com mais frequência em todos os relatórios de projeto do ano?”",
        "“Em que cluster roda o Atlas?”",
        "“Quem mentora a Ana?”",
      ],
      correct: 1,
      explanation: "A pergunta é sobre o corpus inteiro: nenhum trecho sozinho responde. A busca global lê os relatórios de todas as comunidades. As outras partem de uma entidade e cabem na busca local.",
      lesson: "09-05",
    },
    {
      id: "map-calls",
      prompt: "Um índice GraphRAG tem 40 comunidades no nível escolhido para a busca global. Quantas chamadas de LLM, no mínimo, uma pergunta global faz?",
      options: ["1", "40", "41", "80"],
      correct: 2,
      explanation: "Uma chamada de map por relatório de comunidade (40) e uma de reduce para juntar as parciais: 41. Escolher um nível mais alto da hierarquia, com menos comunidades, reduz a conta.",
      lesson: "09-05",
    },
  ],
  related: ["09-04", "09-06", "08-13"],
  references: [
    {
      title: "Edge et al. (2024), From Local to Global: A Graph RAG Approach to Query-Focused Summarization",
      url: "https://arxiv.org/abs/2404.16130",
      kind: "paper",
    },
    { title: "Microsoft GraphRAG: documentação", url: "https://microsoft.github.io/graphrag/", kind: "docs" },
    {
      title: "Traag, Waltman e van Eck (2019), From Louvain to Leiden: guaranteeing well-connected communities",
      url: "https://arxiv.org/abs/1810.08473",
      kind: "paper",
    },
  ],
};

export default lesson;
