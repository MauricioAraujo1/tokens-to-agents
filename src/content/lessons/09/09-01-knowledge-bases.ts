import type { LessonContent } from "../../../types/content";

// A base de conhecimento de brinquedo de uma empresa de software, calculada aqui: 6 artigos com dono e data
// de revisão, e 8 perguntas reais de clientes classificadas pelo formato do conhecimento que as responde.
// A idade de cada artigo sai das datas, contada a partir de um "hoje" fixo, e o prazo de revisão é de 180 dias.

type Shape = "texto" | "registro" | "relação";

interface Article {
  id: string;
  title: string;
  owner?: string;
  reviewed: string;
  shape: Shape;
}

const TODAY = "2026-06-30";
const REVIEW_DAYS = 180;
const DAY_MS = 24 * 60 * 60 * 1000;

const articles: Article[] = [
  { id: "kb-01", title: "trocar senha", owner: "suporte", reviewed: "2026-05-12", shape: "texto" },
  { id: "kb-02", title: "reembolso", owner: "financeiro", reviewed: "2025-09-03", shape: "texto" },
  { id: "kb-03", title: "planos e preços", owner: "vendas", reviewed: "2026-06-01", shape: "registro" },
  { id: "kb-04", title: "prazos de entrega", reviewed: "2025-11-20", shape: "registro" },
  { id: "kb-05", title: "contas e gerentes", owner: "comercial", reviewed: "2026-03-15", shape: "relação" },
  { id: "kb-06", title: "integração erp", reviewed: "2024-12-10", shape: "texto" },
];

const ageInDays = (date: string) => Math.round((Date.parse(TODAY) - Date.parse(date)) / DAY_MS);
const ages = articles.map((article) => ({ label: article.id, value: ageInDays(article.reviewed) }));
const withOwner = articles.filter((article) => article.owner !== undefined).length;
const fresh = articles.filter((article) => ageInDays(article.reviewed) <= REVIEW_DAYS).length;
const stale = articles.length - fresh;
const oldest = [...ages].sort((a, b) => b.value - a.value)[0];
const oldestArticle = articles.find((article) => article.id === oldest.label);

const questions: Array<{ label: string; shape: Shape }> = [
  { label: "trocar a senha", shape: "texto" },
  { label: "reembolso após 10 dias", shape: "texto" },
  { label: "preço do plano Pro", shape: "registro" },
  { label: "prazo para Manaus", shape: "registro" },
  { label: "usuários do Básico", shape: "registro" },
  { label: "gerente de quem comprou o Pro", shape: "relação" },
  { label: "clientes da Ana com ERP", shape: "relação" },
  { label: "ERP com SSO", shape: "texto" },
];
const shapes: Shape[] = ["texto", "registro", "relação"];
const countOf = (shape: Shape) => questions.filter((question) => question.shape === shape).length;
const shapeMatrix = questions.map((question) => shapes.map((shape) => (question.shape === shape ? 1 : 0)));

const lesson: LessonContent = {
  id: "09-01",
  subtitle: "O caderno oficial de uma organização: o que separa uma base de conhecimento de uma pilha de documentos, e os três formatos que ela pode ter.",
  objectives: [
    "Definir base de conhecimento e diferenciá-la de um repositório de arquivos",
    "Reconhecer conhecimento em texto, em registros e em relações",
    "Explicar por que dono, fonte e data de revisão fazem parte do dado",
    "Ligar a base de conhecimento ao RAG e ao resto do módulo",
  ],
  steps: [
    {
      id: "notebook",
      shortTitle: "O caderno",
      title: "O caderno que a empresa inteira consulta",
      tag: "context",
      body: [
        "Toda equipe tem respostas que se repetem: como trocar a senha, qual é o prazo de reembolso, quem cuida de cada cliente. Se essas respostas moram na cabeça de duas pessoas, o atendimento para quando elas saem de férias. Uma central de ajuda resolve isso escrevendo as respostas uma vez, num lugar que todos consultam.",
        "Esse lugar é uma [[base de conhecimento|knowledge-base]]: uma coleção organizada e curada, feita para ser consultada, em que cada item tem dono, fonte e data. Nos sistemas especialistas dos anos 1970 e 1980, a base era um conjunto de regras e fatos. Hoje ela costuma ser a [[memória não paramétrica|non-parametric-memory]] que um [[LLM|llm]] consulta por [[RAG|rag]].",
      ],
      keyIdea: "Uma base de conhecimento é escrita uma vez, por quem sabe, para ser lida muitas vezes, por quem precisa.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "team", kind: "user", label: "equipe", col: 0, row: 0 },
              { id: "kb", kind: "documents", label: "base", col: 1, row: 0.5 },
              { id: "help", kind: "app", label: "central de ajuda", col: 2, row: 0 },
              { id: "bot", kind: "llm", label: "assistente", col: 2, row: 1 },
              { id: "client", kind: "user", label: "clientes", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "team", to: "kb", label: "escreve" },
              { from: "kb", to: "help", label: "artigos" },
              { from: "kb", to: "bot", label: "rag" },
              { from: "help", to: "client" },
              { from: "bot", to: "client" },
            ],
            active: "kb",
          },
        ],
      },
      alt: "A equipe escreve na base de conhecimento, em destaque, que alimenta a central de ajuda e um assistente com RAG; os dois atendem os clientes.",
    },
    {
      id: "shapes",
      shortTitle: "Formatos",
      title: "Texto, registro e relação",
      tag: "mechanism",
      body: [
        "Nem todo conhecimento tem o mesmo formato. “Como trocar a senha” é um passo a passo: texto para ler. “Preço do plano Pro” é um valor exato: um registro numa tabela. “Quem é o gerente do cliente que comprou o Pro” junta dois fatos: é uma relação entre coisas.",
        "Cada formato pede um armazenamento. [[Dado não estruturado|unstructured-data]], como artigos e PDFs, vai para um índice de busca ou um [[banco vetorial|vector-database]]. [[Dado estruturado|structured-data]] vai para tabelas, consultadas com um filtro exato. Relações vão para um [[grafo de conhecimento|knowledge-graph]], o assunto da próxima aula. Uma base madura costuma ter os três, com a mesma regra de curadoria.",
      ],
      keyIdea: "O formato do conhecimento decide onde guardá-lo: texto num índice, valores numa tabela, ligações num grafo.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "docs", kind: "documents", label: "texto", col: 0, row: 0 },
              { id: "table", kind: "sql-db", label: "registros", col: 0, row: 1 },
              { id: "graph", kind: "nosql-db", label: "relações", col: 1, row: 0.5 },
              { id: "query", kind: "retrieval", label: "consulta", col: 2, row: 0.5 },
              { id: "answer", kind: "answer", label: "resposta", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "docs", to: "query", label: "busca" },
              { from: "table", to: "query", label: "filtro exato" },
              { from: "graph", to: "query", label: "ligações" },
              { from: "query", to: "answer" },
            ],
            active: "query",
          },
        ],
      },
      alt: "Três armazenamentos, texto, registros e relações, alimentam a mesma consulta, em destaque, que produz a resposta.",
    },
    {
      id: "curation",
      shortTitle: "Curadoria",
      title: "Dono, fonte e data fazem parte do dado",
      tag: "mechanism",
      body: [
        `Uma pasta de arquivos guarda o que alguém jogou lá. Uma base guarda o que alguém se responsabiliza por manter certo. Na base de brinquedo da cena, ${articles.length} artigos: ${withOwner} têm dono, e ${fresh} foram revisados nos últimos ${REVIEW_DAYS} dias.`,
        `Os metadados de curadoria são campos, não enfeite: dono (quem corrige), fonte (de onde veio), data de revisão (quando foi conferido) e formato. Eles viram filtro na busca, como na [[filtragem por metadados|metadata-filtering]] do módulo 6, e permitem achar o que está para vencer. Os ${articles.length - withOwner} artigos sem dono são os primeiros a apodrecer: ninguém recebe o aviso quando o produto muda.`,
      ],
      keyIdea: "Sem dono e sem data, um artigo é só um arquivo: ninguém sabe se ainda vale.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "health",
            piece: "metrics-panel",
            metrics: [
              { id: "total", label: "artigos", value: String(articles.length) },
              { id: "owner", label: "com dono", value: `${withOwner} de ${articles.length}`, color: "success" },
              { id: "fresh", label: `revisados ≤ ${REVIEW_DAYS} dias`, value: `${fresh} de ${articles.length}`, color: "info" },
              { id: "orphan", label: "sem dono", value: String(articles.length - withOwner), color: "danger" },
            ],
            highlight: "owner",
          },
        ],
      },
      alt: `Painel da base: ${articles.length} artigos, ${withOwner} com dono, ${fresh} revisados nos últimos ${REVIEW_DAYS} dias e ${articles.length - withOwner} sem dono.`,
    },
    {
      id: "questions",
      shortTitle: "Perguntas",
      title: "Oito perguntas, três formatos",
      tag: "example",
      body: [
        `Pegue ${questions.length} perguntas que chegaram ao suporte e marque o formato que as responde. ${countOf("texto")} pedem texto, ${countOf("registro")} pedem um registro exato e ${countOf("relação")} pedem combinar fatos sobre entidades diferentes.`,
        `As ${countOf("relação")} de relação são as difíceis para uma busca em texto: “clientes da Ana com ERP” precisa da lista de contas da Ana e, para cada conta, saber se ela usa a integração. Nenhum parágrafo isolado diz isso. É o tipo de pergunta que motiva grafos e a [[recuperação em vários saltos|multi-hop-retrieval]].`,
      ],
      keyIdea: "Antes de escolher a tecnologia, classifique as perguntas: o formato da resposta diz onde ela deveria morar.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "shape-matrix",
            piece: "matrix",
            rows: questions.map((question) => question.label),
            cols: shapes,
            values: shapeMatrix,
            scale: { min: 0, max: 1 },
            highlight: { row: 5, col: 2 },
            color: "module-09",
          },
        ],
      },
      alt: `Matriz com ${questions.length} perguntas nas linhas e três formatos nas colunas: ${countOf("texto")} de texto, ${countOf("registro")} de registro e ${countOf("relação")} de relação, com “gerente de quem comprou o Pro” em destaque.`,
    },
    {
      id: "maintenance",
      shortTitle: "Manutenção",
      title: "O custo que ninguém vê: manter",
      tag: "tradeoff",
      body: [
        `Escrever o artigo é a parte barata. O caro é manter: o produto muda, a política muda, e o artigo fica para trás sem avisar ninguém. Na cena, a altura da barra é a idade da última revisão em dias, e a linha marca o prazo de ${REVIEW_DAYS} dias.`,
        `${stale} dos ${articles.length} artigos passaram do prazo. O mais velho é o ${oldest.label} (${oldestArticle?.title}), com ${oldest.value} dias e sem dono. Um assistente com RAG lê esse artigo com a mesma confiança que lê o revisado ontem: a base precisa ter a data para que o sistema possa desconfiar. A última aula do módulo trata disso a fundo.`,
      ],
      keyIdea: "Uma base vale o quanto é mantida: data de revisão e dono são o que permite saber o que está vencido.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "ages",
            piece: "chart",
            kind: "bar",
            series: ages,
            cutoff: { mode: "threshold", value: REVIEW_DAYS, label: `${REVIEW_DAYS} dias` },
            highlight: ages.indexOf(oldest),
            color: "module-09",
          },
        ],
      },
      alt: `Idade da última revisão de cada artigo, em dias: ${ages.map((item) => `${item.label} ${item.value}`).join(", ")}. ${stale} passam do prazo de ${REVIEW_DAYS} dias; o ${oldest.label} é o mais velho.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Da cabeça das pessoas para a base",
      tag: "summary",
      body: [
        "Uma base de conhecimento é conhecimento curado: escrito uma vez, com dono, fonte e data, e guardado no formato que combina com as perguntas. Texto vai para busca, valores para tabelas, ligações para grafos.",
        "A próxima aula abre o terceiro formato: o grafo de conhecimento, em que cada fato é uma tripla e as perguntas de relação viram caminhos.",
      ],
      keyIdea: "Capturar, estruturar, dar dono, revisar e servir: é um processo contínuo, não um upload.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "cycle",
            piece: "pipeline",
            display: "chips",
            stages: [
              { id: "capture", label: "capturar o que se repete" },
              { id: "shape", label: "escolher o formato" },
              { id: "owner", label: "dar dono e fonte", color: "module-09" },
              { id: "review", label: "revisar no prazo" },
              { id: "serve", label: "servir a pessoas e ao RAG" },
              { id: "next", label: "relações: grafo", color: "brand" },
            ],
          },
        ],
      },
      alt: "Fluxo em chips: capturar o que se repete, escolher o formato, dar dono e fonte, revisar no prazo, servir a pessoas e ao RAG e, para relações, o grafo.",
    },
  ],
  realWorldExample:
    "O Wikidata, da Wikimedia, é uma base de conhecimento livre e colaborativa: cada item tem um identificador (Q42 é Douglas Adams), cada afirmação pode ter referências, e o conteúdo é editado por pessoas e bots e consultado por máquinas com SPARQL. Ele fornece dados estruturados para os projetos da Wikimedia, como a Wikipedia.",
  code: {
    language: "json",
    source: `{
  "id": "kb-02",
  "title": "Política de reembolso",
  "shape": "texto",
  "owner": "financeiro",
  "source": "https://intranet.exemplo/politicas/reembolso-v3.pdf",
  "reviewed": "2025-09-03",
  "reviewEveryDays": 180,
  "body": "Pedidos de reembolso são aceitos em até 7 dias após a compra..."
}`,
    caption: "Um artigo da base com os metadados de curadoria como campos: dono, fonte, data de revisão e prazo, prontos para virar filtro.",
  },
  tradeOffs: {
    pros: [
      "Uma resposta oficial, escrita uma vez e reaproveitada por pessoas e por assistentes",
      "Dono e data permitem saber o que está vencido e quem corrige",
      "Serve de memória não paramétrica para o RAG, sem treinar o modelo",
    ],
    cons: [
      "Manter custa mais que escrever, e o custo cresce com o número de artigos",
      "Conhecimento de relação fica espalhado em vários artigos e é difícil de combinar",
      "Sem curadoria, vira uma pasta de arquivos com informação contraditória",
    ],
    alternatives: [
      "Grafo de conhecimento para relações entre entidades",
      "Tabelas e APIs para valores que mudam o tempo todo, como preço e estoque",
    ],
  },
  knowledgeCheck: [
    {
      id: "shape-choice",
      prompt: "“Qual é o limite de usuários do plano Básico?” Onde essa resposta deveria morar?",
      options: [
        "Num artigo longo sobre os planos, para o RAG achar o parágrafo",
        "Num registro estruturado, com o valor num campo consultado por filtro exato",
        "No prompt de sistema do assistente",
        "Nos pesos do modelo, com fine-tuning",
      ],
      correct: 1,
      explanation: "É um valor exato que muda com o produto. Num registro, ele é lido sem ambiguidade e atualizado num lugar só.",
      lesson: "09-01",
    },
    {
      id: "no-owner",
      prompt: "Uma base tem 400 artigos, e 150 não têm dono nem data de revisão. Qual é o risco principal para o assistente que usa essa base no RAG?",
      options: [
        "A busca fica mais lenta",
        "O assistente cita artigos vencidos com a mesma confiança dos atualizados, e ninguém é avisado para corrigir",
        "Os embeddings ficam maiores",
        "O modelo esquece os outros 250 artigos",
      ],
      correct: 1,
      explanation: "Sem data, o sistema não tem como desconfiar do conteúdo; sem dono, ninguém recebe a mudança do produto. O erro aparece só na resposta ao cliente.",
      lesson: "09-01",
    },
  ],
  related: ["08-01", "09-02", "06-11"],
  references: [
    { title: "Wikidata: Introduction", url: "https://www.wikidata.org/wiki/Wikidata:Introduction", kind: "docs" },
    { title: "Hogan et al. (2020), Knowledge Graphs", url: "https://arxiv.org/abs/2003.02320", kind: "paper" },
    {
      title: "Lewis et al. (2020), Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks",
      url: "https://arxiv.org/abs/2005.11401",
      kind: "paper",
    },
  ],
};

export default lesson;
