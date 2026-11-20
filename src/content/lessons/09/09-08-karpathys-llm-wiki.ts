import type { GraphSpec } from "../../../scene/types";
import type { LessonContent } from "../../../types/content";

// A wiki mantida por LLM, como descrita no gist "LLM Wiki" de Andrej Karpathy (abril de 2026), aplicada a
// uma wiki de brinquedo de 8 páginas sobre RAG, calculada aqui. A ingestão de uma fonte nova cria uma
// página e atualiza as que se ligam a ela; o lint acha páginas órfãs (sem link de entrada) e links para
// páginas que não existem. O tamanho do index.md usa uma estimativa de brinquedo de tokens por linha.

const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");

type Links = Record<string, string[]>;

const before: Links = {
  index: ["rag", "graphrag", "embeddings", "chunking", "bm25"],
  rag: ["embeddings", "chunking", "bm25", "reranking"],
  graphrag: ["rag", "leiden"],
  leiden: ["graphrag"],
  embeddings: ["rag"],
  chunking: ["rag"],
  bm25: ["rag"],
  hnsw: ["embeddings"],
};

// Ingestão do artigo do LightRAG: uma página nova e links novos nas páginas que tratam do assunto.
const NEW_SOURCE = "LightRAG (Guo et al., 2024)";
const NEW_PAGE = "lightrag";
const after: Links = {
  ...before,
  [NEW_PAGE]: ["graphrag", "rag"],
  index: [...before.index, NEW_PAGE],
  graphrag: [...before.graphrag, NEW_PAGE],
  rag: [...before.rag, NEW_PAGE],
};
const changed = Object.keys(after).filter((page) => JSON.stringify(after[page]) !== JSON.stringify(before[page]));
const updated = changed.filter((page) => page !== NEW_PAGE);

const pagesOf = (links: Links) => Object.keys(links);
const linkCount = (links: Links) => Object.values(links).reduce((total, targets) => total + targets.length, 0);
const inbound = (links: Links, page: string) => pagesOf(links).filter((source) => links[source].includes(page)).length;
const orphans = pagesOf(after).filter((page) => page !== "index" && inbound(after, page) === 0);
const missing = [...new Set(Object.values(after).flat())].filter((target) => !(target in after));
const backlinksOf = (page: string) => pagesOf(after).filter((source) => after[source].includes(page));

const layout: Record<string, { x: number; y: number }> = {
  index: { x: 0, y: 0.5 },
  rag: { x: 0.4, y: 0.5 },
  graphrag: { x: 0.4, y: 0 },
  leiden: { x: 0.75, y: 0 },
  embeddings: { x: 0.75, y: 0.5 },
  chunking: { x: 0.4, y: 1 },
  bm25: { x: 0.15, y: 1 },
  hnsw: { x: 1, y: 0.75 },
  lightrag: { x: 0.12, y: 0.05 },
  reranking: { x: 0.75, y: 1 },
};
const wiki = (links: Links, extra: Partial<GraphSpec> = {}, withMissing = false): GraphSpec => ({
  id: "wiki",
  piece: "graph",
  nodes: [
    ...pagesOf(links).map((page) => ({ id: page, label: page, ...layout[page] })),
    ...(withMissing ? missing.map((page) => ({ id: page, label: `${page}?`, color: "danger" as const, ...layout[page] })) : []),
  ],
  edges: pagesOf(links).flatMap((source) =>
    links[source].filter((target) => withMissing || target in links).map((target) => ({ from: source, to: target })),
  ),
  ...extra,
});

// O index.md tem uma linha por página: link e resumo. Quantos tokens ele ocupa com a wiki crescendo?
const TOKENS_PER_INDEX_LINE = 30;
const INDEX_BUDGET = 50_000;
const pageCounts = [100, 300, 1_000, 3_000, 10_000];
const indexSeries = pageCounts.map((pages) => ({ label: `${integer(pages)} pág.`, value: pages * TOKENS_PER_INDEX_LINE }));
const firstOverBudget = indexSeries.find((item) => item.value >= INDEX_BUDGET);
const firstOverPages = pageCounts.find((pages) => pages * TOKENS_PER_INDEX_LINE >= INDEX_BUDGET) ?? 0;

const GIST_URL = "https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f";

const lesson: LessonContent = {
  id: "09-08",
  subtitle: "A proposta de Andrej Karpathy: em vez de buscar nos documentos a cada pergunta, deixar um LLM escrever e manter uma wiki de markdown que acumula o que foi aprendido.",
  objectives: [
    "Descrever as três camadas da LLM Wiki: fontes brutas, wiki e schema",
    "Explicar as operações de ingestão, consulta e lint",
    "Calcular as páginas tocadas por uma ingestão e as órfãs achadas pelo lint",
    "Reconhecer o limite de escala do index.md e o que fazer depois dele",
  ],
  steps: [
    {
      id: "layers",
      shortTitle: "Camadas",
      title: "Um caderno que o LLM escreve por você",
      tag: "context",
      body: [
        "Imagine um assistente de pesquisa que, a cada artigo que você entrega, lê, escreve um resumo, atualiza as páginas de conceito que o artigo afeta, corrige o que ficou velho e deixa tudo ligado por links. Você escolhe o que ler e faz as perguntas. A papelada é com ele.",
        "Em abril de 2026, Andrej Karpathy publicou essa ideia num gist chamado LLM Wiki. São três camadas: as fontes brutas, que o LLM lê e nunca edita; a [[wiki|llm-wiki]], uma pasta de páginas markdown que o LLM escreve e você lê; e o schema, um [[arquivo de contexto|context-file]] como CLAUDE.md ou AGENTS.md que diz ao LLM como a wiki é organizada. Ele usa o Obsidian para ler, e resume: “Obsidian is the IDE; the LLM is the programmer; the wiki is the codebase.”",
      ],
      keyIdea: "Fontes imutáveis, wiki escrita pelo LLM, schema com as regras: o conhecimento fica num artefato que cresce.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "user", kind: "user", label: "você", col: 0, row: 0 },
              { id: "raw", kind: "documents", label: "fontes brutas", col: 1, row: 0 },
              { id: "schema", kind: "context", label: "schema", col: 1, row: 1 },
              { id: "agent", kind: "agent", label: "llm", col: 2, row: 0.5 },
              { id: "wiki", kind: "documents", label: "wiki .md", col: 3, row: 0 },
              { id: "viewer", kind: "laptop", label: "obsidian", col: 3, row: 1 },
            ],
            edges: [
              { from: "user", to: "raw", label: "escolhe" },
              { from: "raw", to: "agent", label: "só lê" },
              { from: "schema", to: "agent", label: "regras" },
              { from: "agent", to: "wiki", label: "escreve" },
              { from: "wiki", to: "viewer", label: "você lê" },
            ],
            active: "agent",
          },
        ],
      },
      alt: "Você escolhe as fontes brutas; o LLM, em destaque, só lê as fontes, segue as regras do schema e escreve a wiki em markdown, que você lê no Obsidian.",
    },
    {
      id: "ingest",
      shortTitle: "Ingestão",
      title: "Ingestão: uma fonte mexe em várias páginas",
      tag: "mechanism",
      body: [
        `Chega o artigo “${NEW_SOURCE}”. O LLM não guarda o artigo como um bloco: ele cria a página ${NEW_PAGE} com o resumo e atualiza as páginas que tratam do assunto. Na wiki de brinquedo, a ingestão toca ${changed.length} páginas: a nova e ${updated.join(", ")}, além de uma linha no log.`,
        `O gist estima que uma fonte pode tocar de 10 a 15 páginas numa wiki real, e o autor diz preferir ingerir uma fonte por vez, acompanhando. Dois arquivos organizam o trabalho: o index.md, um catálogo com um link e um resumo de uma linha por página, e o log.md, um [[log append-only|append-only-log]] com cada ingestão, consulta e lint, com prefixos fáceis de achar com grep. A wiki passou de ${linkCount(before)} para ${linkCount(after)} links.`,
      ],
      keyIdea: "Ingerir é integrar: resumo novo, páginas afetadas atualizadas, índice e log em dia.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [wiki(after, { highlight: changed })],
      },
      alt: `Wiki de ${pagesOf(after).length} páginas ligadas por links; a ingestão do ${NEW_SOURCE} criou ${NEW_PAGE} e atualizou ${updated.join(", ")}, em destaque.`,
    },
    {
      id: "query",
      shortTitle: "Consulta",
      title: "Consulta: ler a wiki e arquivar a resposta",
      tag: "mechanism",
      body: [
        "Para responder, o LLM lê primeiro o index.md, escolhe as páginas que importam, lê essas páginas e responde citando-as. É como consultar um caderno bem organizado: o sumário leva direto às páginas, sem reler os livros.",
        "O passo que muda o jogo vem depois: uma boa resposta pode ser arquivada na wiki como página nova. Uma comparação pedida hoje vira conhecimento consultável amanhã. Nada disso exige banco vetorial: o gist afirma que o índice em arquivo funciona bem em escala moderada, de cerca de 100 fontes e algumas centenas de páginas.",
      ],
      keyIdea: "Responder lendo páginas já sintetizadas, e guardar as boas respostas: a wiki aprende com o uso.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "user", kind: "user", label: "pergunta", col: 0, row: 0 },
              { id: "index", kind: "context", label: "index.md", col: 1, row: 0 },
              { id: "pages", kind: "documents", label: "páginas", col: 2, row: 0 },
              { id: "agent", kind: "agent", label: "llm", col: 3, row: 0 },
              { id: "answer", kind: "answer", label: "resposta citada", col: 3, row: 1 },
              { id: "new", kind: "documents", label: "página nova", col: 2, row: 1 },
            ],
            edges: [
              { from: "user", to: "index" },
              { from: "index", to: "pages", label: "escolhe" },
              { from: "pages", to: "agent", label: "lê" },
              { from: "agent", to: "answer" },
              { from: "answer", to: "new", label: "arquiva" },
            ],
            active: "answer",
            done: ["user", "index", "pages", "agent"],
          },
        ],
      },
      alt: "A pergunta passa pelo index.md, que leva às páginas certas; o LLM lê as páginas e dá a resposta citada, em destaque, que é arquivada como página nova.",
    },
    {
      id: "lint",
      shortTitle: "Lint",
      title: "Lint: a faxina periódica",
      tag: "example",
      body: [
        "Uma wiki que só cresce acumula entulho: páginas que ninguém liga, links para páginas que nunca foram escritas, afirmações que uma fonte mais nova desmentiu. De tempos em tempos, você pede ao LLM uma revisão da saúde da wiki.",
        `O [[lint da wiki|wiki-lint]] procura contradições entre páginas, afirmações vencidas, [[páginas órfãs|orphan-page]], conceitos sem página e links que faltam. Na wiki da cena, é contar links: ${orphans.join(", ")} não tem nenhum [[backlink|backlink]], e ${missing.join(", ")} é citado por ${backlinksOf(missing[0]).join(", ")}, mas não existe. A correção vai para a fila do LLM: ligar ${orphans[0]} a partir de embeddings e escrever ${missing[0]}.`,
      ],
      keyIdea: "Órfãs e links quebrados saem da estrutura; contradições e vencidos pedem que o LLM releia.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [wiki(after, { highlight: [...orphans, ...missing] }, true)],
      },
      alt: `A wiki com a página órfã ${orphans.join(", ")} e o link quebrado para ${missing.join(", ")}, em vermelho, em destaque.`,
    },
    {
      id: "scale",
      shortTitle: "Escala",
      title: "Até onde o index.md aguenta",
      tag: "tradeoff",
      body: [
        `O index.md é lido inteiro a cada consulta. Com uma estimativa de ${TOKENS_PER_INDEX_LINE} tokens por linha (link e resumo curto), ele cresce em linha reta com a wiki. A cena compara com um orçamento de ${integer(INDEX_BUDGET)} tokens reservados para ele no contexto.`,
        `Com ${integer(firstOverPages)} páginas, o índice já ocupa ${integer(firstOverPages * TOKENS_PER_INDEX_LINE)} tokens e passa do orçamento. Para escalas maiores, o próprio gist sugere uma busca local sobre os arquivos markdown, híbrida com BM25 e vetores: a wiki volta a ter um passo de recuperação, só que sobre páginas sintetizadas, não sobre os documentos brutos. E há um risco que não some com escala: um erro que o LLM escreve numa página é lido como fato nas consultas seguintes.`,
      ],
      keyIdea: "O índice em arquivo vale para centenas de páginas; além disso, a wiki precisa de busca.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "index-size",
            piece: "chart",
            kind: "bar",
            series: indexSeries,
            cutoff: { mode: "threshold", value: INDEX_BUDGET, label: `${integer(INDEX_BUDGET)} tokens` },
            highlight: firstOverBudget ? indexSeries.indexOf(firstOverBudget) : undefined,
            color: "module-09",
          },
        ],
      },
      alt: `Tokens do index.md por tamanho da wiki: ${indexSeries.map((item) => `${item.label} ${integer(item.value)}`).join(", ")}. A partir de ${integer(firstOverPages)} páginas, passa do orçamento de ${integer(INDEX_BUDGET)}.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Ingerir, consultar, revisar",
      tag: "summary",
      body: [
        "A LLM Wiki troca “buscar e sintetizar a cada pergunta” por “sintetizar quando a fonte chega e manter”. Fontes imutáveis, wiki escrita pelo LLM, schema com as regras; ingestão que integra, consulta que arquiva, lint que limpa. O humano cura e pergunta; o LLM faz a papelada.",
        "É um caso de conhecimento persistente: algo que sobrevive às sessões e melhora com o uso. A próxima aula generaliza a ideia: como sistemas guardam, consolidam e recarregam conhecimento entre conversas.",
      ],
      keyIdea: "A wiki é um artefato que acumula: cada fonte e cada boa resposta a deixam mais completa.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "ops",
            piece: "pipeline",
            display: "chips",
            stages: [
              { id: "curate", label: "você escolhe a fonte" },
              { id: "ingest", label: "ingestão: resumo e páginas", color: "module-09" },
              { id: "log", label: "index.md e log.md" },
              { id: "query", label: "consulta com citações" },
              { id: "file", label: "arquivar boas respostas" },
              { id: "lint", label: "lint periódico", color: "brand" },
            ],
          },
        ],
      },
      alt: "Fluxo em chips: você escolhe a fonte, ingestão com resumo e páginas, index.md e log.md, consulta com citações, arquivar boas respostas e lint periódico.",
    },
  ],
  realWorldExample:
    "O gist “LLM Wiki” de Andrej Karpathy é um “arquivo de ideia”: um texto deliberadamente abstrato para ser entregue a um agente de LLM, que então monta uma versão concreta com o usuário. Ele descreve o agente aberto de um lado e o Obsidian do outro, git para histórico, e cita usos como pesquisa, leitura de livros e wikis de equipe.",
  code: {
    language: "bash",
    source: `mkdir -p raw wiki
cat > AGENTS.md <<'EOF'
# Schema da wiki
- raw/ é somente leitura: nunca edite as fontes.
- Toda página nova entra em wiki/index.md com link e resumo de uma linha.
- Toda operação acrescenta uma linha em wiki/log.md: ## [AAAA-MM-DD] operação | título
- Cada afirmação cita a fonte em raw/.
EOF

echo "## [2026-11-19] ingest | LightRAG (Guo et al., 2024)" >> wiki/log.md
grep "^## \\[" wiki/log.md | tail -5   # as últimas operações`,
    caption: "Um esqueleto possível: o schema como AGENTS.md, as pastas das camadas e o log append-only com prefixos que o grep encontra.",
  },
  tradeOffs: {
    pros: [
      "A síntese é feita uma vez, na ingestão, e reaproveitada em toda consulta",
      "Contradições e ligações entre fontes ficam explícitas nas páginas",
      "Markdown e git: legível por pessoas, versionado e sem infraestrutura extra em escala moderada",
    ],
    cons: [
      "Um erro escrito pelo LLM vira fato para as consultas seguintes",
      "Cada ingestão custa chamadas de LLM e reescreve várias páginas",
      "O index.md lido inteiro não escala além de algumas centenas de páginas sem busca",
    ],
    alternatives: [
      "RAG sobre as fontes brutas, sem síntese guardada",
      "Grafo de conhecimento com relações tipadas em vez de páginas em texto",
    ],
  },
  knowledgeCheck: [
    {
      id: "raw-immutable",
      prompt: "Por que o schema da LLM Wiki proíbe o LLM de editar as fontes brutas?",
      options: [
        "Para economizar disco",
        "Para que sempre exista a versão original contra a qual conferir o que o LLM escreveu na wiki",
        "Porque markdown não pode ser editado",
        "Porque o Obsidian não abre arquivos editados",
      ],
      correct: 1,
      explanation: "A wiki é derivada e pode conter erros do LLM. As fontes imutáveis são a referência para o lint e para corrigir uma página que se afastou do original.",
      lesson: "09-08",
    },
    {
      id: "orphan-fix",
      prompt: "O lint achou a página “hnsw” sem nenhum link de entrada. Qual é a correção mais útil?",
      options: [
        "Apagar a página",
        "Ligar a página a partir das páginas que tratam do conceito, como embeddings e busca vetorial, e listá-la no index.md",
        "Renomear a página",
        "Copiar o conteúdo dela para todas as outras",
      ],
      correct: 1,
      explanation: "Uma órfã é conhecimento que ninguém encontra navegando. Ligar das páginas vizinhas e do índice a coloca de volta no caminho das consultas.",
      lesson: "09-08",
    },
  ],
  related: ["09-07", "09-09", "09-10"],
  references: [
    { title: "Andrej Karpathy (2026), LLM Wiki (gist)", url: GIST_URL, kind: "article" },
    { title: "Obsidian", url: "https://obsidian.md/", kind: "docs" },
    { title: "AGENTS.md", url: "https://agents.md/", kind: "docs" },
  ],
};

export default lesson;
