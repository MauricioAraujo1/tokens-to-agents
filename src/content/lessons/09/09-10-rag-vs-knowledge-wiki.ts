import type { LessonContent } from "../../../types/content";

// RAG contra uma wiki mantida por LLM, com um modelo de custo de brinquedo calculado aqui. Um tema tem 12
// fontes. No RAG, cada pergunta de síntese busca 2 chunks de cada fonte e o LLM integra tudo na hora. Na
// wiki, cada fonte é ingerida uma vez (ler a fonte, ler e reescrever as páginas afetadas) e a pergunta lê
// 2 páginas já sintetizadas, achadas por busca. Os tamanhos em tokens são hipóteses do modelo, declaradas
// abaixo; o ponto de empate sai delas.

const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");

const SOURCES_ON_TOPIC = 12;
const SOURCE_TOKENS = 3_000;
const CHUNK_TOKENS = 400;
const CHUNKS_PER_SOURCE = 2;
const PAGE_TOKENS = 600;
const PAGES_TOUCHED = 10;
const PAGES_READ = 2;

const wikiIngestPerSource = SOURCE_TOKENS + 2 * PAGES_TOUCHED * PAGE_TOKENS;
const wikiIngestTotal = SOURCES_ON_TOPIC * wikiIngestPerSource;
const ragPerQuery = SOURCES_ON_TOPIC * CHUNKS_PER_SOURCE * CHUNK_TOKENS;
const wikiPerQuery = PAGES_READ * PAGE_TOKENS;
const breakEven = Math.ceil(wikiIngestTotal / (ragPerQuery - wikiPerQuery));

// Quantas vezes a síntese do tema é feita: no RAG, uma por pergunta; na wiki, uma por fonte ingerida.
const queryCounts = [10, breakEven, 50, 100, 500];
const synthesisMatrix = queryCounts.map((queries) => [queries, SOURCES_ON_TOPIC]);
const totalTokens = (queries: number) => ({ rag: queries * ragPerQuery, wiki: wikiIngestTotal + queries * wikiPerQuery });

const lesson: LessonContent = {
  id: "09-10",
  subtitle: "Sintetizar na hora da pergunta ou quando a fonte chega: o que cada abordagem custa, onde cada uma erra e por que os sistemas maduros usam as duas.",
  objectives: [
    "Diferenciar síntese na consulta (RAG) de síntese na ingestão (wiki)",
    "Calcular o ponto de empate de custo entre as duas num modelo explícito",
    "Reconhecer o risco de erro que se acumula numa wiki escrita por LLM",
    "Desenhar um sistema híbrido que usa a wiki e as fontes brutas",
  ],
  steps: [
    {
      id: "two-ways",
      shortTitle: "Dois jeitos",
      title: "O buscador e o enciclopedista",
      tag: "context",
      body: [
        "Um buscador acha documentos na hora em que você pergunta e deixa a leitura com você. Um enciclopedista lê as fontes antes, escreve um verbete que junta tudo e, quando você pergunta, entrega o verbete. Os dois respondem; o trabalho de juntar acontece em momentos diferentes.",
        "O [[RAG|rag]] é o buscador: faz [[síntese na consulta|query-time-synthesis]], buscando chunks e deixando o LLM integrá-los a cada pergunta. A [[LLM Wiki|llm-wiki]] da aula anterior é o enciclopedista: faz [[síntese na ingestão|ingest-time-synthesis]], integrando cada fonte nas páginas quando ela chega. O gist de Karpathy descreve exatamente esse contraste: no RAG, o conhecimento é redescoberto a cada pergunta; na wiki, ele se acumula.",
      ],
      keyIdea: "RAG sintetiza a cada pergunta; a wiki sintetiza uma vez por fonte e guarda o resultado.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "raw", kind: "documents", label: "fontes", col: 0, row: 0.5 },
              { id: "search", kind: "retrieval", label: "busca", col: 1, row: 0 },
              { id: "llm", kind: "llm", label: "síntese na consulta", col: 2, row: 0 },
              { id: "ingest", kind: "agent", label: "síntese na ingestão", col: 1, row: 1 },
              { id: "wiki", kind: "documents", label: "wiki", col: 2, row: 1 },
              { id: "answer", kind: "answer", label: "resposta", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "raw", to: "search", label: "a cada pergunta" },
              { from: "search", to: "llm", label: "chunks" },
              { from: "llm", to: "answer" },
              { from: "raw", to: "ingest", label: "a cada fonte" },
              { from: "ingest", to: "wiki", label: "páginas" },
              { from: "wiki", to: "answer", label: "lê páginas" },
            ],
            active: "answer",
          },
        ],
      },
      alt: "As fontes seguem dois caminhos até a resposta: em cima, a busca a cada pergunta e a síntese na consulta; embaixo, a síntese na ingestão a cada fonte, que escreve a wiki.",
    },
    {
      id: "when",
      shortTitle: "Quando",
      title: "Quantas vezes a mesma síntese é feita",
      tag: "mechanism",
      body: [
        `Pense num tema com ${SOURCES_ON_TOPIC} fontes e em perguntas que pedem juntar todas, como “o que as fontes dizem sobre o risco X?”. No RAG, cada pergunta refaz a integração das ${SOURCES_ON_TOPIC} fontes do zero. Na wiki, cada fonte é integrada uma vez, na ingestão, e a página do tema já está pronta.`,
        `A matriz conta as sínteses do tema: com ${queryCounts[0]} perguntas, ${queryCounts[0]} no RAG e ${SOURCES_ON_TOPIC} na wiki; com ${queryCounts[queryCounts.length - 1]}, ${queryCounts[queryCounts.length - 1]} contra ${SOURCES_ON_TOPIC}. A coluna da wiki não muda com as perguntas, só com as fontes. É também por isso que a wiki resolve contradições uma vez, na página, enquanto o RAG pode resolvê-las de um jeito diferente em cada resposta.`,
      ],
      keyIdea: "No RAG, o trabalho de síntese escala com as perguntas; na wiki, com as fontes.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "synthesis",
            piece: "matrix",
            rows: queryCounts.map((queries) => `${integer(queries)} perguntas`),
            cols: ["RAG", "wiki"],
            values: synthesisMatrix,
            showValues: true,
            highlight: { row: queryCounts.length - 1, col: 0 },
            color: "module-09",
          },
        ],
      },
      alt: `Matriz de sínteses do tema por número de perguntas: ${queryCounts.map((queries) => `${queries} perguntas, ${queries} no RAG e ${SOURCES_ON_TOPIC} na wiki`).join("; ")}.`,
    },
    {
      id: "tokens",
      shortTitle: "Tokens",
      title: "A conta de tokens e o ponto de empate",
      tag: "example",
      body: [
        `Hipóteses do modelo: fonte de ${integer(SOURCE_TOKENS)} tokens, chunk de ${CHUNK_TOKENS}, página de ${PAGE_TOKENS}; a ingestão lê a fonte e lê e reescreve ${PAGES_TOUCHED} páginas; a pergunta na wiki lê ${PAGES_READ} páginas. Ingerir as ${SOURCES_ON_TOPIC} fontes custa ${SOURCES_ON_TOPIC} × ${integer(wikiIngestPerSource)} = ${integer(wikiIngestTotal)} tokens, pagos antes da primeira pergunta.`,
        `Depois, cada pergunta de síntese custa ${integer(ragPerQuery)} tokens no RAG (${CHUNKS_PER_SOURCE} chunks de cada fonte) e ${integer(wikiPerQuery)} na wiki. A economia por pergunta paga a ingestão em ⌈${integer(wikiIngestTotal)} / ${integer(ragPerQuery - wikiPerQuery)}⌉ = ${breakEven} perguntas. Com 500 perguntas: ${integer(totalTokens(500).rag)} no RAG contra ${integer(totalTokens(500).wiki)} na wiki. Com poucas perguntas, ou perguntas pontuais de um chunk, o RAG sai mais barato.`,
      ],
      keyIdea: "A wiki paga adiantado e economiza por pergunta: compensa quando muitas perguntas pedem a mesma síntese.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "cost",
            piece: "metrics-panel",
            metrics: [
              { id: "ingest", label: "ingestão da wiki", value: integer(wikiIngestTotal), color: "danger" },
              { id: "rag", label: "por pergunta, RAG", value: integer(ragPerQuery) },
              { id: "wiki", label: "por pergunta, wiki", value: integer(wikiPerQuery), color: "success" },
              { id: "break-even", label: "empate em", value: `${breakEven} perguntas`, color: "info" },
            ],
            highlight: "break-even",
          },
        ],
      },
      alt: `Painel de tokens: ingestão da wiki ${integer(wikiIngestTotal)}, ${integer(ragPerQuery)} por pergunta no RAG, ${integer(wikiPerQuery)} por pergunta na wiki; o empate, em destaque, chega com ${breakEven} perguntas.`,
    },
    {
      id: "errors",
      shortTitle: "Erros",
      title: "O erro que se acumula",
      tag: "tradeoff",
      body: [
        "No RAG, um erro de leitura morre com a resposta: a próxima pergunta lê as fontes de novo. Na wiki, um erro escrito numa página vira fonte para todas as consultas seguintes, e uma resposta arquivada que se apoiou nele espalha o erro para uma página nova. É o telefone sem fio, com registro permanente.",
        "As defesas vêm do próprio desenho: fontes brutas imutáveis para conferir, cada afirmação da página com [[citação|citation]] da fonte, e o lint periódico relendo páginas contra as fontes. Sem citação por afirmação, a wiki perde a [[proveniência|provenance]], e não há como saber qual frase veio de onde, nem o que corrigir quando uma fonte cai.",
      ],
      keyIdea: "A wiki precisa de citação por afirmação e de revisão contra as fontes: sem isso, erros viram fatos.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "errors",
            piece: "block-diagram",
            blocks: [
              { id: "raw", kind: "documents", label: "fonte", col: 0, row: 0 },
              { id: "ingest", kind: "agent", label: "ingestão", col: 1, row: 0 },
              { id: "page", kind: "documents", label: "página com erro", col: 2, row: 0 },
              { id: "answer", kind: "answer", label: "resposta errada", col: 3, row: 0 },
              { id: "filed", kind: "no-result", label: "erro arquivado", col: 3, row: 1 },
              { id: "lint", kind: "eval", label: "lint contra a fonte", col: 2, row: 1 },
            ],
            edges: [
              { from: "raw", to: "ingest" },
              { from: "ingest", to: "page", label: "erro" },
              { from: "page", to: "answer", label: "cita" },
              { from: "answer", to: "filed", label: "arquiva", variant: "alternative" },
              { from: "lint", to: "page", label: "corrige" },
            ],
            active: "lint",
          },
        ],
      },
      alt: "Um erro da ingestão entra numa página, que é citada numa resposta errada, e a resposta arquivada espalha o erro, num caminho tracejado; o lint contra a fonte, em destaque, corrige a página.",
    },
    {
      id: "hybrid",
      shortTitle: "Híbrido",
      title: "Os dois juntos",
      tag: "tradeoff",
      body: [
        "Uma enciclopédia boa não substitui a biblioteca: o verbete resume, e a nota de rodapé leva ao livro. Sistemas maduros fazem o mesmo: a wiki responde o que já foi sintetizado, e a busca nas fontes brutas cobre o que a wiki não tem ou quando é preciso conferir a frase original.",
        "Na prática: a pergunta busca primeiro nas páginas da wiki; se a página cita as fontes, os chunks citados entram no contexto junto; se nada na wiki responde, a busca cai para as fontes brutas, e a boa resposta pode virar página nova. É a mesma ideia do GraphRAG: preparar sínteses na indexação sem jogar fora os chunks de origem.",
      ],
      keyIdea: "Wiki para o sintetizado, fontes para o detalhe e a conferência: as duas camadas se completam.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "user", kind: "user", label: "pergunta", col: 0, row: 0.5 },
              { id: "wiki", kind: "documents", label: "páginas da wiki", col: 1, row: 0 },
              { id: "raw", kind: "vector-db", label: "chunks das fontes", col: 1, row: 1 },
              { id: "context", kind: "context", label: "página + citações", col: 2, row: 0.5 },
              { id: "llm", kind: "llm", label: "resposta", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "user", to: "wiki", label: "primeiro" },
              { from: "user", to: "raw", label: "se faltar", variant: "alternative" },
              { from: "wiki", to: "context", label: "síntese" },
              { from: "raw", to: "context", label: "trechos citados" },
              { from: "context", to: "llm" },
            ],
            active: "context",
          },
        ],
      },
      alt: "A pergunta busca primeiro nas páginas da wiki e, se faltar, nos chunks das fontes, num caminho tracejado; síntese e trechos citados se juntam no contexto, em destaque, que vai para o LLM.",
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Quando cada um",
      tag: "summary",
      body: [
        "RAG: fontes que mudam muito, perguntas pontuais, pouca repetição, nenhuma síntese guardada para envelhecer. Wiki: corpus curado e estável, muitas perguntas que pedem a mesma síntese, contradições que precisam ser resolvidas uma vez. Os dois: wiki para o sintetizado, fontes para conferir.",
        "Qualquer que seja a escolha, o conhecimento envelhece. A última aula do módulo trata disso: detectar mudanças, guardar a validade de cada fato e atualizar sem perder o histórico.",
      ],
      keyIdea: "Escolha pelo padrão das perguntas e pela velocidade das fontes, não pela moda.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "choose",
            piece: "pipeline",
            display: "chips",
            stages: [
              { id: "volatile", label: "fontes mudam muito: RAG" },
              { id: "point", label: "perguntas pontuais: RAG" },
              { id: "repeat", label: "mesma síntese muitas vezes: wiki", color: "module-09" },
              { id: "conflict", label: "contradições a resolver: wiki" },
              { id: "both", label: "conferir a frase: fontes", color: "brand" },
            ],
          },
        ],
      },
      alt: "Fluxo em chips: fontes que mudam muito pedem RAG; perguntas pontuais, RAG; a mesma síntese muitas vezes, wiki; contradições a resolver, wiki; conferir a frase, fontes.",
    },
  ],
  realWorldExample:
    "A Wikipedia é a versão humana da síntese na ingestão: editores leem as fontes, escrevem um verbete que as integra e citam cada afirmação, com a regra de que o conteúdo precisa ser verificável em fontes publicadas. Um buscador web é a versão da síntese na consulta: acha os documentos na hora e deixa a integração com quem lê. O gist “LLM Wiki” propõe que um LLM faça o papel dos editores.",
  code: {
    language: "python",
    source: `FONTES, FONTE, PAGINA, CHUNK = 12, 3_000, 600, 400
PAGINAS_TOCADAS, PAGINAS_LIDAS, CHUNKS_POR_FONTE = 10, 2, 2

ingestao_wiki = FONTES * (FONTE + 2 * PAGINAS_TOCADAS * PAGINA)
por_pergunta_rag = FONTES * CHUNKS_POR_FONTE * CHUNK
por_pergunta_wiki = PAGINAS_LIDAS * PAGINA

empate = -(-ingestao_wiki // (por_pergunta_rag - por_pergunta_wiki))  # teto da divisão
print(ingestao_wiki, por_pergunta_rag, por_pergunta_wiki, empate)  # 180000 9600 1200 22`,
    caption: "O modelo de custo da aula: troque as hipóteses pelos números do seu corpus para achar o seu ponto de empate.",
  },
  tradeOffs: {
    pros: [
      "RAG: sempre lê a fonte atual, sem síntese guardada que possa envelhecer",
      "Wiki: síntese feita uma vez por fonte e reaproveitada em toda pergunta",
      "Híbrido: respostas sintetizadas com a frase original a um clique",
    ],
    cons: [
      "RAG: refaz a integração a cada pergunta e pode resolver contradições de jeitos diferentes",
      "Wiki: custo adiantado de ingestão e erros que persistem",
      "Híbrido: duas camadas para manter coerentes",
    ],
    alternatives: ["GraphRAG, que prepara resumos de comunidades na indexação", "Grafo de conhecimento para fatos com relações tipadas"],
  },
  knowledgeCheck: [
    {
      id: "choose-rag",
      prompt: "Um assistente responde sobre notas técnicas que mudam todo dia, e cada pergunta é sobre um item específico. RAG ou wiki?",
      options: [
        "Wiki, porque sintetiza melhor",
        "RAG: as fontes mudam rápido e as perguntas são pontuais, então a síntese guardada envelheceria sem ser reaproveitada",
        "Wiki, porque dispensa busca",
        "Nenhum dos dois: só fine-tuning",
      ],
      correct: 1,
      explanation: "A wiki compensa quando a mesma síntese é pedida muitas vezes e as fontes são estáveis. Aqui, ela seria reescrita todo dia para perguntas que um chunk responde.",
      lesson: "09-10",
    },
    {
      id: "break-even",
      prompt: "No modelo da aula, a ingestão das páginas passa a custar o dobro. O que acontece com o ponto de empate?",
      options: [
        "Cai pela metade",
        "Dobra, aproximadamente: são precisas mais perguntas para pagar o custo adiantado",
        "Não muda",
        "A wiki passa a ser sempre mais barata",
      ],
      correct: 1,
      explanation: "O empate é o custo da ingestão dividido pela economia por pergunta. Com a economia igual e a ingestão dobrada, o número de perguntas para empatar também dobra.",
      lesson: "09-10",
    },
  ],
  related: ["09-09", "09-11", "08-02"],
  references: [
    { title: "Andrej Karpathy (2026), LLM Wiki (gist)", url: "https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f", kind: "article" },
    {
      title: "Lewis et al. (2020), Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks",
      url: "https://arxiv.org/abs/2005.11401",
      kind: "paper",
    },
    { title: "Wikipedia: Verifiability", url: "https://en.wikipedia.org/wiki/Wikipedia:Verifiability", kind: "article" },
  ],
};

export default lesson;
