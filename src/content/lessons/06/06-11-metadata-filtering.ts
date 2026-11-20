import type { VectorPoint } from "../../../scene/types";
import type { LessonContent } from "../../../types/content";

// Filtro por metadados com contas reais: 12 trechos de dois clientes (acme e beta) num mapa 2D, a busca
// sem filtro, o pós-filtro com 3 e com 6 candidatos, o pré-filtro com força bruta no subconjunto, e quantos
// candidatos um pós-filtro precisa pedir conforme a seletividade do filtro. Coordenadas escolhidas à mão.

const percent = (value: number) => `${Math.round(value * 100)}%`;
const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");
const results = (count: number) => `${count} ${count === 1 ? "resultado" : "resultados"}`;

type Coords2 = [number, number];
type Tenant = "acme" | "beta";
const distance = (a: Coords2, b: Coords2) => Math.hypot(a[0] - b[0], a[1] - b[1]);

const chunks: Array<{ id: string; tenant: Tenant; coords: Coords2 }> = [
  { id: "b1", tenant: "beta", coords: [0.3, 0.3] },
  { id: "b2", tenant: "beta", coords: [-0.35, 0.15] },
  { id: "a1", tenant: "acme", coords: [0.55, -0.45] },
  { id: "b3", tenant: "beta", coords: [0.1, -0.75] },
  { id: "a2", tenant: "acme", coords: [-0.9, 0.6] },
  { id: "a3", tenant: "acme", coords: [1, 0.7] },
  { id: "b4", tenant: "beta", coords: [-0.6, -0.8] },
  { id: "a4", tenant: "acme", coords: [1.4, -1] },
  { id: "b5", tenant: "beta", coords: [-1.3, -0.2] },
  { id: "a5", tenant: "acme", coords: [-1.5, 1.4] },
  { id: "b6", tenant: "beta", coords: [1.2, 1.5] },
  { id: "a6", tenant: "acme", coords: [0, 1.6] },
];
const QUERY: Coords2 = [0.05, 0];
const TENANT: Tenant = "acme";
const K = 3;

const rank = (list: typeof chunks) => [...list].sort((a, b) => distance(QUERY, a.coords) - distance(QUERY, b.coords));
const allRanked = rank(chunks);
const allowed = chunks.filter((chunk) => chunk.tenant === TENANT);
const exactFiltered = rank(allowed).slice(0, K).map((chunk) => chunk.id);

const postFilter = (candidates: number) => {
  const survivors = allRanked.slice(0, candidates).filter((chunk) => chunk.tenant === TENANT).slice(0, K);
  return {
    candidates,
    returned: survivors.length,
    correct: survivors.filter((chunk) => exactFiltered.includes(chunk.id)).length,
    comparisons: chunks.length,
  };
};
const post3 = postFilter(K);
const post6 = postFilter(2 * K);
const pre = { returned: K, correct: K, comparisons: allowed.length };
const unfilteredTop = allRanked.slice(0, K);
const betaInTop = unfilteredTop.filter((chunk) => chunk.tenant !== TENANT).length;

const pointsOf = (list: typeof chunks): VectorPoint[] => [
  ...list.map((chunk) => ({
    id: chunk.id,
    label: `${chunk.id} · ${chunk.tenant}`,
    coords: chunk.coords,
    color: chunk.tenant === TENANT ? ("success" as const) : ("muted" as const),
  })),
  { id: "query", label: "consulta (acme)", coords: QUERY, color: "brand" },
];

// Passo 4: um pós-filtro que quer k = 10 resultados precisa pedir cerca de k ÷ seletividade candidatos.
const WANTED = 10;
const selectivities = [0.5, 0.2, 0.1, 0.05, 0.01];
const oversample = selectivities.map((selectivity) => ({ selectivity, candidates: WANTED / selectivity }));
const EF_SEARCH_DEFAULT = 40;
const expectedSurvivors = (selectivity: number) => EF_SEARCH_DEFAULT * selectivity;

const lesson: LessonContent = {
  id: "06-11",
  subtitle:
    "Como combinar “parecido com isto” e “só deste cliente, deste idioma, deste ano”: filtrar antes, filtrar depois ou filtrar dentro do índice, e por que a escolha errada devolve poucos resultados ou vaza dados.",
  objectives: [
    "Explicar o filtro por metadados como uma busca vetorial restrita a um subconjunto",
    "Mostrar com um exemplo por que o pós-filtro devolve menos resultados que o pedido",
    "Calcular quantos candidatos um pós-filtro precisa pela seletividade do filtro",
    "Aplicar filtros de cliente (tenant) do lado do servidor, como regra de segurança",
  ],
  steps: [
    {
      id: "store-filters",
      shortTitle: "Filtros",
      title: "“Parecido com este”, mas só no tamanho 42",
      tag: "context",
      body: [
        "Numa loja online, você pede tênis parecidos com o que está vendo, mas só no tamanho 42 e em estoque. A semelhança vem dos vetores; o tamanho e o estoque vêm dos metadados. O [[filtro por metadados|metadata-filtering]] junta as duas coisas: buscar os vizinhos mais próximos só entre os registros que passam numa condição do payload.",
        `Num sistema com vários clientes, o filtro mais importante é o do tenant. Na cena, o usuário é da empresa ${TENANT}, e a base guarda trechos da ${TENANT} e da beta no mesmo índice. A busca precisa devolver os ${K} trechos da ${TENANT} mais parecidos com a pergunta, e nenhum da beta.`,
      ],
      keyIdea: "Filtro por metadados = busca vetorial dentro de um subconjunto definido pelo payload.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "user", kind: "user", label: "usuário acme", col: 0, row: 0 },
              { id: "vector", kind: "embedding", label: "vetor", col: 1, row: 0 },
              { id: "filter", kind: "retrieval", label: "tenant = acme", col: 2, row: 0 },
              { id: "db", kind: "vector-db", label: "acme + beta", col: 2, row: 1 },
              { id: "answer", kind: "answer", label: `top-${K} da acme`, col: 3, row: 0 },
            ],
            edges: [
              { from: "user", to: "vector", label: "pergunta" },
              { from: "vector", to: "filter" },
              { from: "db", to: "filter", label: "candidatos" },
              { from: "filter", to: "answer" },
            ],
            active: "filter",
          },
        ],
      },
      alt: `A pergunta do usuário da ${TENANT} vira vetor e passa por um filtro tenant = ${TENANT}, em destaque, sobre um banco com trechos de dois clientes; a resposta traz o top-${K} da ${TENANT}.`,
    },
    {
      id: "post-filter",
      shortTitle: "Pós-filtro",
      title: "Filtrar depois: o top-k encolhe",
      tag: "mechanism",
      body: [
        `O jeito ingênuo é buscar o top-${K} na base inteira e jogar fora o que não passa no filtro. Na cena, os ${K} vizinhos mais próximos da pergunta, sem filtro, são ${unfilteredTop.map((chunk) => chunk.id).join(", ")}: ${betaInTop} deles são da beta. Depois do filtro, ${post3.returned === 1 ? "sobra" : "sobram"} ${results(post3.returned)}, e o usuário pediu ${K}.`,
        `Isso é o [[pós-filtro|post-filtering]]. Ele é rápido e usa o índice normalmente, mas quebra quando o filtro é seletivo: os resultados que passam no filtro podem estar mais longe do que os k primeiros candidatos. Pedir mais candidatos ajuda: com ${2 * K}, o pós-filtro devolve ${post6.returned} trechos, ${post6.correct} deles entre os ${K} certos.`,
      ],
      keyIdea: "Pós-filtro: busca primeiro, filtra depois. Rápido, mas devolve menos que k quando o filtro corta muito.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [{ id: "space", piece: "vector-space", points: pointsOf(chunks), query: "query", neighbors: K }],
      },
      alt: `Mapa com trechos da ${TENANT}, em verde, e da beta, em cinza. Os ${K} vizinhos da consulta sem filtro são ${unfilteredTop.map((chunk) => `${chunk.id} da ${chunk.tenant}`).join(", ")}.`,
    },
    {
      id: "pre-filter",
      shortTitle: "Pré-filtro",
      title: "Filtrar antes: certo, mas sem o atalho do índice",
      tag: "mechanism",
      body: [
        `O [[pré-filtro|pre-filtering]] inverte a ordem: primeiro seleciona os registros da ${TENANT}, depois busca só entre eles. Na cena sobraram ${allowed.length} trechos, e a busca exata entre eles devolve ${exactFiltered.join(", ")}: os ${K} certos, com ${pre.comparisons} comparações.`,
        "O problema aparece em escala. O índice aproximado foi construído com a base inteira, e um subconjunto arbitrário não tem um índice próprio. Ou a busca no subconjunto é força bruta, ótima quando o filtro deixa poucos registros, ou ela anda pelo grafo pulando os nós barrados, e o grafo pode se partir em ilhas quando o filtro corta muito.",
      ],
      keyIdea: "Pré-filtro: filtra primeiro, busca depois. Resultado certo, mas o índice global não serve direto ao subconjunto.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [{ id: "space", piece: "vector-space", points: pointsOf(allowed), query: "query", neighbors: K }],
      },
      alt: `O mesmo mapa só com os ${allowed.length} trechos da ${TENANT}. Os ${K} vizinhos da consulta agora são ${exactFiltered.join(", ")}.`,
    },
    {
      id: "selectivity",
      shortTitle: "Seletividade",
      title: "Quantos candidatos o pós-filtro precisa pedir",
      tag: "mechanism",
      body: [
        `Se o filtro deixa passar uma fração s da base, um pós-filtro que quer ${WANTED} resultados precisa pedir em média ${WANTED} ÷ s candidatos. Com s = 50%, bastam ${integer(oversample[0].candidates)}; com s = 1%, ${integer(oversample[oversample.length - 1].candidates)}. A cena mostra a curva: o custo explode quando o filtro fica seletivo.`,
        `O pgvector mostra o efeito na prática: com um índice HNSW, o filtro do WHERE é aplicado depois da busca no índice, e o padrão hnsw.ef_search = ${EF_SEARCH_DEFAULT} limita os candidatos. Com um filtro que deixa passar 1%, sobram em média ${expectedSurvivors(0.01).toLocaleString("pt-BR")} linhas. A versão 0.8.0 trouxe as buscas iterativas no índice, que continuam lendo candidatos até completar o resultado.`,
      ],
      keyIdea: "Pós-filtro precisa de cerca de k ÷ s candidatos. Filtros seletivos pedem outra estratégia.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "oversample",
            piece: "chart",
            kind: "line",
            series: oversample.map((point) => ({ label: `s = ${percent(point.selectivity)}`, value: point.candidates })),
            highlight: oversample.length - 1,
            color: "module-06",
          },
        ],
      },
      alt: `Candidatos que um pós-filtro precisa pedir para devolver ${WANTED} resultados: ${oversample.map((point) => `${integer(point.candidates)} com seletividade ${percent(point.selectivity)}`).join(", ")}.`,
    },
    {
      id: "compare",
      shortTitle: "Comparar",
      title: "As estratégias na mesma pergunta",
      tag: "example",
      body: [
        `Na tabela, cada estratégia responde à mesma pergunta da ${TENANT}. Pós-filtro com ${K} candidatos: ${results(post3.returned)}, ${post3.correct} certo. Pós-filtro com ${2 * K}: ${results(post6.returned)}, ${post6.correct} certos. Pré-filtro com força bruta: ${pre.correct} certos com ${pre.comparisons} comparações.`,
        "Bancos dedicados tentam ficar com o melhor dos dois: filtrar dentro do índice. O Qdrant, por exemplo, cria índices de payload para os campos filtrados, escolhe entre percorrer o grafo com o filtro e fazer força bruta no subconjunto conforme a seletividade estimada, e acrescenta ligações extras ao grafo para que ele não se parta sob filtros comuns.",
      ],
      keyIdea: "Filtro dentro do índice com plano por seletividade: grafo para filtros largos, força bruta para filtros estreitos.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "strategies",
            piece: "matrix",
            rows: [`pós-filtro, ${K} candidatos`, `pós-filtro, ${2 * K} candidatos`, "pré-filtro (força bruta)"],
            cols: ["devolvidos", `certos (de ${K})`, "comparações"],
            values: [
              [post3.returned, post3.correct, post3.comparisons],
              [post6.returned, post6.correct, post6.comparisons],
              [pre.returned, pre.correct, pre.comparisons],
            ],
            highlight: { row: 2, col: 1 },
            showValues: true,
          },
        ],
      },
      alt: `Tabela das estratégias: pós-filtro com ${K} candidatos devolve ${post3.returned}; com ${2 * K}, ${post6.returned}; o pré-filtro devolve os ${K} certos com ${pre.comparisons} comparações.`,
    },
    {
      id: "tenant-security",
      shortTitle: "Segurança",
      title: "O filtro de tenant é regra de segurança",
      tag: "tradeoff",
      body: [
        "Quando o filtro separa clientes, ele deixa de ser uma preferência e vira um [[filtro de permissões|access-control-filter]]. O tenant precisa vir da identidade autenticada, no servidor, e nunca de um campo que o navegador manda. Um filtro esquecido numa rota nova devolve documentos de outra empresa, e o modelo de linguagem lê esses documentos como se fossem do usuário.",
        "Há duas formas comuns de isolar: uma coleção (ou namespace) por cliente, simples e forte, mas pesada com milhares de clientes pequenos; ou uma coleção única com o tenant no payload, indexado e aplicado sempre pelo servidor. A última aula do módulo abre o índice aproximado que está por baixo de tudo isso.",
      ],
      keyIdea: "Filtro de tenant vem do token, no servidor. Em dados de vários clientes, filtro esquecido é vazamento.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "phone", kind: "phone", label: "app", col: 0, row: 0.5 },
              { id: "api", kind: "server", label: "API", col: 1, row: 0.5 },
              { id: "guard", kind: "guardrail", label: "tenant do token", col: 2, row: 0 },
              { id: "db", kind: "vector-db", label: "coleção única", col: 3, row: 0.5 },
              { id: "leak", kind: "no-result", label: "dados da beta", col: 2, row: 1 },
            ],
            edges: [
              { from: "phone", to: "api", label: "pergunta + token" },
              { from: "api", to: "guard" },
              { from: "guard", to: "db", label: "tenant = acme" },
              { from: "api", to: "leak", label: "filtro esquecido", variant: "alternative" },
            ],
            active: "guard",
          },
        ],
      },
      alt: "O app manda a pergunta com o token; a API aplica o tenant vindo do token, em destaque, antes de consultar a coleção. Sem o filtro, o caminho tracejado leva a dados de outro cliente.",
    },
  ],
  realWorldExample:
    "A documentação do pgvector descreve o problema do pós-filtro com índices aproximados: o filtro é aplicado depois da busca no índice, então uma consulta com WHERE pode devolver menos linhas que o LIMIT. As saídas sugeridas são aumentar hnsw.ef_search, criar índices parciais ou partições para filtros frequentes e, a partir da versão 0.8.0, ligar as buscas iterativas (hnsw.iterative_scan). O Qdrant documenta a abordagem de filtrar durante a busca no HNSW, com índices de payload nos campos filtrados.",
  code: {
    language: "python",
    source: `from qdrant_client import QdrantClient, models

client = QdrantClient(url="http://localhost:6333")

# Índice de payload no campo filtrado: o planejador usa a seletividade para escolher a estratégia.
client.create_payload_index(
    collection_name="manual",
    field_name="tenant",
    field_schema=models.PayloadSchemaType.KEYWORD,
)

def search(vector: list[float], tenant_from_token: str):
    return client.query_points(
        collection_name="manual",
        query=vector,
        query_filter=models.Filter(
            must=[models.FieldCondition(key="tenant", match=models.MatchValue(value=tenant_from_token))]
        ),
        limit=3,
    )`,
    caption: "Filtro de tenant no Qdrant: índice de payload no campo e o tenant aplicado em toda busca, vindo da identidade autenticada.",
  },
  tradeOffs: {
    pros: [
      "Junta semelhança e regras de negócio numa consulta só",
      "Isola clientes numa coleção compartilhada, com o tenant no payload",
      "Bancos com filtro no índice mantêm o top-k completo mesmo com filtros seletivos",
    ],
    cons: [
      "Pós-filtro devolve menos que k quando o filtro corta muito",
      "Pré-filtro com força bruta fica caro quando o subconjunto é grande",
      "Filtros sem índice de payload deixam a consulta lenta",
    ],
    alternatives: ["Uma coleção ou namespace por cliente", "Índices parciais ou partições para os filtros mais comuns"],
  },
  knowledgeCheck: [
    {
      id: "fewer-results",
      prompt:
        "Uma busca pede LIMIT 10 com filtro idioma = 'it', que vale para 0,5% dos documentos, sobre um índice HNSW com pós-filtro e ef_search = 40. Costuma voltar 0 ou 1 linha. Por quê?",
      options: [
        "Não existem documentos em italiano",
        "O índice olha cerca de 40 candidatos e só depois filtra; com 0,5% de seletividade, sobram em média 0,2 linhas",
        "O idioma não pode ser filtrado",
        "O LIMIT está errado",
      ],
      correct: 1,
      explanation: "40 × 0,005 = 0,2 resultados esperados. Para filtros tão seletivos: buscas iterativas, índices parciais, pré-filtro com força bruta ou filtro dentro do índice.",
      lesson: "06-11",
    },
    {
      id: "tenant-source",
      prompt: "De onde deve vir o valor do filtro de tenant numa busca vetorial de um SaaS?",
      options: [
        "De um parâmetro enviado pelo navegador",
        "Da identidade autenticada, resolvida no servidor e aplicada em toda consulta",
        "Do próprio texto da pergunta",
        "De nenhum lugar: o vetor já separa os clientes",
      ],
      correct: 1,
      explanation: "O tenant é controle de acesso. Se vier do cliente, qualquer um pode trocar o valor e ler dados de outra empresa.",
      lesson: "06-11",
    },
  ],
  related: ["06-10", "06-12", "08-02"],
  references: [
    { title: "Qdrant: Filtering", url: "https://qdrant.tech/documentation/concepts/filtering/", kind: "docs" },
    { title: "Qdrant: Indexing (índices de payload)", url: "https://qdrant.tech/documentation/concepts/indexing/", kind: "docs" },
    { title: "pgvector: filtering e iterative index scans", url: "https://github.com/pgvector/pgvector", kind: "repo" },
  ],
};

export default lesson;
