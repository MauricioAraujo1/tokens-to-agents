import { cosineSimilarity } from "../../../lab/embeddings";
import type { LessonContent } from "../../../types/content";

// Metadados e filtros com contas no arquivo. A base do assistente de RH tem 8 chunks, cada um com
// metadados (departamento, ano, acesso) e um vetor de brinquedo de 4 traços [férias, reembolso, home office,
// viagem]. A pergunta pede home office em 2025, feita por alguém de RH sem acesso à diretoria. Os scores
// saem do cosseno, e o pós-filtro, o pré-filtro e o filtro de permissão são aplicados aqui.

const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });

type Access = "todos" | "diretoria";

interface Chunk {
  id: string;
  label: string;
  department: "rh" | "vendas" | "financeiro";
  year: number;
  access: Access;
  vector: number[];
}

const chunks: Chunk[] = [
  { id: "c1", label: "férias", department: "rh", year: 2025, access: "todos", vector: [1, 0, 0.1, 0] },
  { id: "c2", label: "ho 2023", department: "rh", year: 2023, access: "todos", vector: [0, 0, 1, 0] },
  { id: "c3", label: "ho 2025", department: "rh", year: 2025, access: "todos", vector: [0, 0, 0.95, 0.05] },
  { id: "c4", label: "ho vendas", department: "vendas", year: 2025, access: "todos", vector: [0, 0, 0.9, 0.3] },
  { id: "c5", label: "ho diretoria", department: "rh", year: 2025, access: "diretoria", vector: [0.1, 0.2, 0.9, 0] },
  { id: "c6", label: "ajuda ho", department: "rh", year: 2025, access: "todos", vector: [0, 0.6, 0.7, 0] },
  { id: "c7", label: "viagem", department: "financeiro", year: 2025, access: "todos", vector: [0, 0.8, 0, 0.6] },
  { id: "c8", label: "ho 2024", department: "rh", year: 2024, access: "todos", vector: [0, 0, 1, 0.1] },
];

const QUESTION = "Quantos dias de home office posso fazer em 2025?";
const QUERY_VECTOR = [0.1, 0, 1, 0];
const K = 3;
const THRESHOLD = 0.5;

// O self-query extrai da pergunta o filtro de metadados; o acesso vem do login, não da pergunta.
const extracted = { year: 2025, department: "rh" as const };
const userAccess: Access[] = ["todos"];

const scored = chunks
  .map((chunk) => ({ ...chunk, score: cosineSimilarity(chunk.vector, QUERY_VECTOR) }))
  .sort((a, b) => b.score - a.score);
const scoreOf = (id: string) => scored.find((chunk) => chunk.id === id)?.score ?? 0;

const matchesQuery = (chunk: Chunk) => chunk.year === extracted.year && chunk.department === extracted.department;
const allowed = (chunk: Chunk) => userAccess.includes(chunk.access);

// Pós-filtro: busca o top-k primeiro e filtra depois.
const postTopK = scored.slice(0, K);
const postFiltered = postTopK.filter((chunk) => matchesQuery(chunk) && allowed(chunk));

// Pré-filtro: filtra primeiro e busca o top-k só entre os que passaram.
const candidates = scored.filter((chunk) => matchesQuery(chunk) && allowed(chunk));
const preFiltered = candidates.slice(0, K);
const preAboveThreshold = preFiltered.filter((chunk) => chunk.score >= THRESHOLD);

// Sem o filtro de permissão: o chunk da diretoria entra no top-k.
const withoutAcl = scored.filter(matchesQuery).slice(0, K);
const leaked = withoutAcl.filter((chunk) => !allowed(chunk));

const labels = (items: Array<{ label: string }>) => items.map((item) => item.label).join(", ");
const passIndexes = chunks.map((chunk, index) => (matchesQuery(chunk) && allowed(chunk) ? index : -1)).filter((index) => index >= 0);
const chartSeries = chunks.map((chunk) => ({ label: chunk.label, value: Number(scoreOf(chunk.id).toFixed(2)) }));

const lesson: LessonContent = {
  id: "08-12",
  subtitle: "Como os metadados de cada chunk (ano, departamento, permissão) recortam a busca antes da similaridade e protegem o que o usuário não pode ver.",
  objectives: [
    "Guardar metadados úteis em cada chunk e saber para que cada campo serve",
    "Comparar filtrar antes e depois da busca e prever quantos resultados sobram",
    "Extrair um filtro da própria pergunta com self-query",
    "Aplicar permissões no retriever, e não no prompt",
  ],
  steps: [
    {
      id: "store",
      shortTitle: "Filtros",
      title: "Antes de procurar, escolha a prateleira",
      tag: "context",
      body: [
        "Numa loja online, você não rola o catálogo inteiro: marca “tamanho M” e “até R$ 100” e só então olha os produtos parecidos com o que quer. A busca vetorial sozinha é o catálogo sem filtros: ela acha o que é parecido, mas não sabe que a política de 2023 foi substituída.",
        `Por isso cada [[chunk|chunk]] guarda [[metadados|chunk-metadata]] junto com o vetor: departamento, ano, permissão, fonte e página. O [[retriever|retriever]] combina duas perguntas: “o que é parecido?” (o cosseno) e “o que é permitido e atual?” (o filtro). Na base de brinquedo da aula, são ${chunks.length} chunks do manual de RH, e “ho” quer dizer home office.`,
      ],
      keyIdea: "Similaridade responde “parecido com o quê”; metadados respondem “de quando, de quem e para quem”.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "user", kind: "user", label: "funcionário", col: 0, row: 0.5 },
              { id: "app", kind: "app", label: "assistente rh", col: 1, row: 0.5 },
              { id: "retrieval", kind: "retrieval", label: "filtro + busca", col: 2, row: 0.5 },
              { id: "db", kind: "vector-db", label: `${chunks.length} chunks`, col: 3, row: 0.5 },
            ],
            edges: [
              { from: "user", to: "app", label: "pergunta" },
              { from: "app", to: "retrieval", label: "texto + filtro" },
              { from: "retrieval", to: "db", label: "ano, depto" },
            ],
            active: "retrieval",
          },
        ],
      },
      alt: `Um funcionário pergunta ao assistente de RH, que manda o texto e o filtro ao retriever, em destaque, que consulta o banco vetorial com ${chunks.length} chunks usando ano e departamento.`,
    },
    {
      id: "metadata",
      shortTitle: "Metadados",
      title: "Cada chunk carrega uma etiqueta",
      tag: "mechanism",
      body: [
        `Pense numa etiqueta de supermercado: além do produto, ela diz validade e seção. A pergunta “${QUESTION}” traz duas condições escondidas: ano 2025 e o manual do RH. Quem pergunta não tem acesso aos documentos da diretoria.`,
        `Dos ${chunks.length} chunks, só ${candidates.length} passam nas três condições: ${labels(candidates)}. Os outros falam de home office também, e alguns têm score maior, mas são de outro ano, de vendas ou restritos. Bancos vetoriais guardam esses campos no payload do ponto e aplicam o filtro como uma condição exata (igualdade, faixa, lista), antes ou durante a busca aproximada.`,
      ],
      keyIdea: "Metadado bom é o que vira condição exata: ano, departamento, idioma, versão, permissão.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "chunks",
            piece: "token-stream",
            tokens: chunks.map((chunk) => chunk.label),
            keys: passIndexes,
            color: "module-08",
          },
        ],
      },
      alt: `Os ${chunks.length} chunks da base em fila: ${labels(chunks)}. Ficam em destaque os ${candidates.length} que são de RH, de 2025 e de acesso livre: ${labels(candidates)}.`,
    },
    {
      id: "pre-post",
      shortTitle: "Antes ou depois",
      title: "Filtrar depois da busca pode esvaziar o resultado",
      tag: "mechanism",
      body: [
        `É como pedir os ${K} primeiros da fila e só depois conferir quem tem ingresso: pode sobrar quase ninguém. No pós-filtro, a busca devolve o top-${K} (${labels(postTopK)}) e o filtro corta os que não são de 2025 ou não são liberados. Sobra ${postFiltered.length}: ${labels(postFiltered)}.`,
        `No pré-filtro, o banco só compara a pergunta com os ${candidates.length} candidatos que passaram no filtro e devolve ${preFiltered.length}: ${labels(preFiltered)}. O terceiro tem score ${fixed(scoreOf(preFiltered[preFiltered.length - 1].id))}: abaixo do [[limiar|similarity-threshold]] de ${fixed(THRESHOLD, 1)}, ele também sai, e ficam ${preAboveThreshold.length}. O preço do pré-filtro é que, com filtros muito seletivos, o índice aproximado precisa de cuidado extra para não perder vizinhos; os bancos resolvem isso filtrando durante a travessia do índice.`,
      ],
      keyIdea: "Pós-filtro devolve menos que k; pré-filtro devolve k entre os que valem. Filtro e limiar se somam.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "counts",
            piece: "metrics-panel",
            metrics: [
              { id: "post", label: `pós-filtro (top-${K})`, value: `${postFiltered.length} de ${K}`, color: "danger" },
              { id: "pre", label: `pré-filtro (top-${K})`, value: `${preFiltered.length} de ${K}`, color: "success" },
              { id: "threshold", label: `pré-filtro e score ≥ ${fixed(THRESHOLD, 1)}`, value: String(preAboveThreshold.length) },
            ],
            highlight: "pre",
          },
          {
            id: "scores",
            piece: "chart",
            kind: "bar",
            series: chartSeries,
            max: 1,
            cutoff: { mode: "threshold", value: THRESHOLD, label: `limiar ${fixed(THRESHOLD, 1)}` },
            highlight: chunks.findIndex((chunk) => chunk.id === postFiltered[0]?.id),
            color: "module-08",
          },
        ],
      },
      alt: `Scores de cosseno dos ${chunks.length} chunks: ${chartSeries.map((item) => `${item.label} ${fixed(item.value)}`).join(", ")}. O pós-filtro deixa ${postFiltered.length} de ${K} resultados; o pré-filtro devolve ${preFiltered.length}, e ${preAboveThreshold.length} passam do limiar de ${fixed(THRESHOLD, 1)}.`,
    },
    {
      id: "self-query",
      shortTitle: "Self-query",
      title: "O próprio LLM escreve o filtro",
      tag: "example",
      body: [
        "Ninguém digita “ano = 2025 e departamento = rh” no chat. Quem lê a pergunta e preenche os filtros é um [[LLM|llm]], como um atendente que ouve “quero um tênis de corrida até cem reais” e marca as caixinhas por você.",
        `Isso é [[self-query|self-query]]: o modelo recebe a lista de campos permitidos e devolve um objeto com o texto da busca e o filtro, aqui ano ${extracted.year} e departamento “${extracted.department}”. O filtro precisa ser validado contra um esquema (campos e valores conhecidos) antes de ir ao banco. O acesso nunca vem da pergunta: ele sai do login do usuário, porque um texto como “sou da diretoria” não pode abrir documentos.`,
      ],
      keyIdea: "O LLM sugere o filtro de conteúdo; a permissão vem da identidade, nunca do texto.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "self-query",
            piece: "pipeline",
            stages: [
              { id: "question", label: "pergunta" },
              { id: "llm", label: "llm extrai filtro", color: "module-08" },
              { id: "validate", label: "valida esquema" },
              { id: "search", label: `busca top-${K}` },
              { id: "chunks", label: `${preFiltered.length} chunks` },
            ],
            active: "llm",
            done: ["question"],
            branch: { id: "invalid", label: "sem filtro", from: "validate", edgeLabel: "campo inválido" },
          },
        ],
      },
      alt: `Pipeline do self-query: a pergunta vai ao LLM, em destaque, que extrai o filtro ano ${extracted.year} e departamento ${extracted.department}; o filtro é validado contra o esquema e a busca devolve ${preFiltered.length} chunks. Um ramo tracejado busca sem filtro quando o campo é inválido.`,
    },
    {
      id: "acl",
      shortTitle: "Permissões",
      title: "Permissão se aplica na busca, não no prompt",
      tag: "tradeoff",
      body: [
        `Sem o [[filtro de permissão|access-control-filter]], o top-${K} de RH em 2025 seria ${labels(withoutAcl)}: o chunk “${labels(leaked)}”, restrito à diretoria, tem score ${fixed(scoreOf(leaked[0]?.id ?? ""))} e entraria no contexto. Pedir ao modelo “não revele documentos restritos” não resolve: o texto já está no prompt e uma [[injeção de prompt|prompt-injection]] pode tirá-lo de lá.`,
        "A regra é filtrar pelos grupos do usuário dentro do retriever, com as permissões copiadas da fonte para os metadados de cada chunk na ingestão. Quando a permissão muda na fonte, o metadado precisa mudar também, senão o índice continua mostrando o que não devia. Um bom guardrail é testar a busca com um usuário sem acesso e conferir que o resultado vem vazio.",
      ],
      keyIdea: "O que o usuário não pode ler não pode nem chegar à janela de contexto.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "user", kind: "user", label: "funcionário", col: 0, row: 0.5 },
              { id: "acl", kind: "guardrail", label: "filtro de acesso", col: 1, row: 0.5 },
              { id: "db", kind: "vector-db", label: `${candidates.length} liberados`, col: 2, row: 0 },
              { id: "blocked", kind: "no-result", label: "diretoria", col: 2, row: 1 },
              { id: "context", kind: "context", label: "contexto", col: 3, row: 0 },
            ],
            edges: [
              { from: "user", to: "acl", label: "grupos" },
              { from: "acl", to: "db", label: "acesso: todos" },
              { from: "acl", to: "blocked", label: "bloqueado", variant: "alternative" },
              { from: "db", to: "context", label: `top-${K}` },
            ],
            active: "acl",
          },
        ],
      },
      alt: `O funcionário passa pelo filtro de acesso, em destaque, que libera a busca nos ${candidates.length} chunks permitidos e bloqueia o chunk da diretoria pelo caminho tracejado; só os permitidos chegam ao contexto.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Parecido, atual e permitido",
      tag: "summary",
      body: [
        "Metadados transformam a busca por semelhança numa busca com regras: o ano certo, o departamento certo e só o que o usuário pode ler. Filtrar antes da busca garante k resultados válidos; filtrar depois pode devolver quase nada.",
        "Na próxima aula, o RAG avançado junta várias peças em volta da busca: reescrever a pergunta, buscar trechos pequenos e devolver os grandes, reordenar e comprimir.",
      ],
      keyIdea: "Grave metadados na ingestão, extraia filtros da pergunta, aplique permissões no retriever.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "steps",
            piece: "pipeline",
            display: "chips",
            stages: [
              { id: "ingest", label: "metadados na ingestão" },
              { id: "extract", label: "self-query" },
              { id: "acl", label: "filtro de acesso", color: "module-08" },
              { id: "prefilter", label: "pré-filtro + top-k" },
              { id: "threshold", label: "limiar de score" },
              { id: "context", label: "contexto", color: "brand" },
            ],
          },
        ],
      },
      alt: "Fluxo em chips: metadados na ingestão, self-query, filtro de acesso, pré-filtro com top-k, limiar de score e contexto.",
    },
  ],
  realWorldExample:
    "O Microsoft 365 Copilot só mostra dados que o usuário já tem permissão para ver: ao buscar e-mails e arquivos para montar a resposta, ele respeita as permissões do SharePoint, do OneDrive e do Exchange de quem pergunta. É o filtro de permissão aplicado na recuperação, antes de qualquer texto chegar ao modelo.",
  code: {
    language: "json",
    source: `{
  "query": "dias de home office",
  "filter": {
    "must": [
      { "key": "ano", "match": { "value": 2025 } },
      { "key": "departamento", "match": { "value": "rh" } },
      { "key": "acesso", "match": { "any": ["todos"] } }
    ]
  },
  "limit": 3
}`,
    caption: "Um filtro no formato do Qdrant: o self-query preenche ano e departamento, e a aplicação acrescenta o acesso a partir do login do usuário.",
  },
  tradeOffs: {
    pros: [
      "Tira da resposta versões antigas e documentos de outros departamentos",
      "Garante k resultados válidos quando o filtro é aplicado antes da busca",
      "Protege documentos restritos sem depender de instruções no prompt",
    ],
    cons: [
      "Metadados errados ou desatualizados escondem chunks bons ou mostram os proibidos",
      "Self-query adiciona uma chamada de LLM e pode extrair um filtro errado",
      "Filtros muito seletivos exigem cuidado do índice aproximado para não perder vizinhos",
    ],
    alternatives: [
      "Um índice separado por departamento ou por cliente, quando os grupos são poucos e fixos",
      "Filtros escolhidos na interface (caixas de seleção) em vez de extraídos pelo LLM",
    ],
  },
  knowledgeCheck: [
    {
      id: "post-filter-empty",
      prompt: "A busca devolve o top-5 e só depois o app filtra por ano = 2025. Muitas vezes sobra 1 resultado. Qual é a correção mais direta?",
      options: [
        "Aumentar a temperatura do LLM",
        "Aplicar o filtro de ano antes ou durante a busca, para o top-5 sair só dos chunks de 2025",
        "Trocar o modelo de embedding",
        "Diminuir o k para 1",
      ],
      correct: 1,
      explanation: "O pós-filtro corta depois de escolher os k melhores. Com o pré-filtro, a similaridade só compara os chunks que já valem, e o top-k vem cheio.",
      lesson: "08-12",
    },
    {
      id: "acl-in-prompt",
      prompt: "Uma equipe decide pôr no prompt “ignore os trechos marcados como confidenciais”. Por que isso não protege os documentos?",
      options: [
        "Porque o LLM não lê o prompt de sistema",
        "Porque o texto confidencial já entrou na janela de contexto e pode vazar por erro ou por injeção de prompt",
        "Porque trechos confidenciais têm score baixo",
        "Porque metadados não podem ter permissões",
      ],
      correct: 1,
      explanation: "Permissão é um filtro na recuperação, com os grupos do usuário. O que o usuário não pode ler não deve nem ser recuperado.",
      lesson: "08-12",
    },
  ],
  related: ["06-11", "08-08", "08-13"],
  references: [
    { title: "Qdrant: Filtering", url: "https://qdrant.tech/documentation/concepts/filtering/", kind: "docs" },
    { title: "LangChain: documentação", url: "https://python.langchain.com/", kind: "docs" },
    { title: "Gao et al. (2023), Retrieval-Augmented Generation for Large Language Models: A Survey", url: "https://arxiv.org/abs/2312.10997", kind: "paper" },
  ],
};

export default lesson;
