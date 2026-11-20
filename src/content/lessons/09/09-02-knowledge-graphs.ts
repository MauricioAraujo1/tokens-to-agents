import type { GraphSpec } from "../../../scene/types";
import type { LessonContent } from "../../../types/content";

// Um grafo de conhecimento de brinquedo, calculado aqui: 8 triplas viram nós e arestas, uma ontologia com
// o tipo de cada entidade valida as triplas extraídas de um texto, e duas regras de inferência (fica_em é
// transitiva; sediada_em seguida de fica_em dá localizada_em) derivam fatos que ninguém escreveu.

type Triple = [subject: string, predicate: string, object: string];
type EntityType = "Pessoa" | "Empresa" | "Projeto" | "Tecnologia" | "Cidade" | "Estado" | "País";

const triples: Triple[] = [
  ["Ana", "trabalha_em", "Acme"],
  ["Bruno", "trabalha_em", "Acme"],
  ["Bruno", "mentora", "Ana"],
  ["Ana", "lidera", "Atlas"],
  ["Atlas", "usa", "Postgres"],
  ["Acme", "sediada_em", "Recife"],
  ["Recife", "fica_em", "Pernambuco"],
  ["Pernambuco", "fica_em", "Brasil"],
];

const types: Record<string, EntityType> = {
  Ana: "Pessoa",
  Bruno: "Pessoa",
  Acme: "Empresa",
  Atlas: "Projeto",
  Postgres: "Tecnologia",
  Recife: "Cidade",
  Pernambuco: "Estado",
  Brasil: "País",
};

const PLACES: EntityType[] = ["Cidade", "Estado", "País"];
// Ontologia: para cada relação, os tipos aceitos no sujeito (domínio) e no objeto (imagem).
const ontology: Record<string, { domain: EntityType[]; range: EntityType[] }> = {
  trabalha_em: { domain: ["Pessoa"], range: ["Empresa"] },
  mentora: { domain: ["Pessoa"], range: ["Pessoa"] },
  lidera: { domain: ["Pessoa"], range: ["Projeto"] },
  usa: { domain: ["Projeto"], range: ["Tecnologia"] },
  sediada_em: { domain: ["Empresa"], range: ["Cidade"] },
  fica_em: { domain: PLACES, range: PLACES },
};

const entities = [...new Set(triples.flatMap(([subject, , object]) => [subject, object]))];
const relationTypes = [...new Set(triples.map(([, predicate]) => predicate))];

const isValid = ([subject, predicate, object]: Triple) => {
  const rule = ontology[predicate];
  const subjectType = types[subject];
  const objectType = types[object];
  return rule !== undefined && subjectType !== undefined && objectType !== undefined
    && rule.domain.includes(subjectType) && rule.range.includes(objectType);
};

// Triplas que um LLM extraiu de um parágrafo novo: a ontologia decide quais entram no grafo.
const extracted: Triple[] = [
  ["Bruno", "lidera", "Atlas"],
  ["Recife", "trabalha_em", "Acme"],
  ["Atlas", "usa", "Postgres"],
  ["Ana", "usa", "Postgres"],
  ["Acme", "sediada_em", "Recife"],
];
const accepted = extracted.filter(isValid);
const rejected = extracted.filter((triple) => !isValid(triple));
const showTriple = ([subject, predicate, object]: Triple) => `(${subject}, ${predicate}, ${object})`;

// Inferência: fecho transitivo de fica_em e a regra sediada_em ∘ fica_em* ⇒ localizada_em.
const key = ([subject, predicate, object]: Triple) => `${subject}|${predicate}|${object}`;
function infer(base: Triple[]): Triple[] {
  const known = new Set(base.map(key));
  const all = [...base];
  let changed = true;
  while (changed) {
    changed = false;
    const candidates: Triple[] = [];
    for (const [a, p, b] of all) {
      for (const [c, q, d] of all) {
        if (b !== c || q !== "fica_em") continue;
        if (p === "fica_em") candidates.push([a, "fica_em", d]);
        if (p === "sediada_em" || p === "localizada_em") candidates.push([a, "localizada_em", d]);
      }
      if (p === "sediada_em") candidates.push([a, "localizada_em", b]);
    }
    for (const candidate of candidates) {
      if (known.has(key(candidate))) continue;
      known.add(key(candidate));
      all.push(candidate);
      changed = true;
    }
  }
  return all.slice(base.length);
}
const inferred = infer(triples);

// Pergunta: em que estado fica a empresa onde a Ana trabalha? Segue trabalha_em, sediada_em e fica_em.
const follow = (from: string, predicate: string) => triples.find(([subject, p]) => subject === from && p === predicate)?.[2] ?? "";
const company = follow("Ana", "trabalha_em");
const city = follow(company, "sediada_em");
const state = follow(city, "fica_em");
const answerPath = ["Ana", company, city, state];

const layout: Record<string, { x: number; y: number }> = {
  Bruno: { x: 0, y: 0 },
  Ana: { x: 0.33, y: 0 },
  Atlas: { x: 0.66, y: 0 },
  Postgres: { x: 1, y: 0 },
  Acme: { x: 0.33, y: 0.5 },
  Recife: { x: 0.33, y: 1 },
  Pernambuco: { x: 0.66, y: 1 },
  Brasil: { x: 1, y: 1 },
};
const graphOf = (extra: Partial<GraphSpec> = {}): GraphSpec => ({
  id: "kg",
  piece: "graph",
  nodes: entities.map((entity) => ({ id: entity, label: entity, ...layout[entity] })),
  edges: triples.map(([subject, predicate, object]) => ({ from: subject, to: object, label: predicate })),
  ...extra,
});

const lesson: LessonContent = {
  id: "09-02",
  subtitle: "Fatos como triplas, entidades como nós e relações como arestas: como um grafo responde perguntas que nenhum parágrafo responde sozinho.",
  objectives: [
    "Escrever fatos como triplas sujeito, predicado e objeto",
    "Transformar um conjunto de triplas num grafo e responder seguindo um caminho",
    "Usar uma ontologia para validar triplas extraídas por um LLM",
    "Explicar como regras de inferência derivam fatos novos",
  ],
  steps: [
    {
      id: "board",
      shortTitle: "O quadro",
      title: "O quadro do detetive",
      tag: "context",
      body: [
        "Nos filmes, o detetive prende fotos num quadro e liga as fotos com barbante: “trabalha com”, “mora em”, “é irmão de”. Para responder “onde a suspeita trabalhava?”, ele não relê os depoimentos: segue o barbante.",
        `Um [[grafo de conhecimento|knowledge-graph]] é esse quadro em dados. As fotos são [[entidades|entity]] (pessoas, empresas, cidades) e os barbantes são [[relações|relation]] com nome. O grafo da cena tem ${entities.length} entidades, ${relationTypes.length} tipos de relação e ${triples.length} fatos. A Google lançou o seu Knowledge Graph em 2012 com essa ideia: a busca passar a entender coisas, não só palavras.`,
      ],
      keyIdea: "Num grafo de conhecimento, o conhecimento está nas ligações: responder é seguir barbantes.",
      scene: { kind: "pieces", layout: "single", pieces: [graphOf()] },
      alt: `Grafo com ${entities.length} entidades: Bruno mentora Ana; Ana e Bruno trabalham na Acme; Ana lidera o Atlas, que usa Postgres; a Acme fica sediada em Recife, que fica em Pernambuco, que fica no Brasil.`,
    },
    {
      id: "triple",
      shortTitle: "Tripla",
      title: "Cada fato é uma tripla",
      tag: "mechanism",
      body: [
        "Toda frase simples de fato tem três partes: quem, a relação e com o quê. “Ana trabalha na Acme” vira (Ana, trabalha_em, Acme). Não importa como a frase foi escrita no documento: a tripla é a mesma.",
        `A [[tripla|triple]] é sujeito, predicado e objeto, a unidade do padrão [[RDF|rdf]] do W3C. O sujeito e o objeto são entidades com identificador único, e o predicado é o tipo de relação. As ${triples.length} triplas da aula geram o grafo inteiro: cada entidade distinta vira um nó (${entities.length}) e cada tripla vira uma aresta com rótulo (${triples.length}).`,
      ],
      keyIdea: "Uma tripla é a menor frase de fato que existe: sujeito, predicado, objeto.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "triple",
            piece: "token-stream",
            tokens: [...triples[0]],
            query: 1,
            arcs: [{ from: 0, to: 2, weight: 1, label: "predicado" }],
            color: "module-09",
          },
        ],
      },
      alt: "A tripla Ana, trabalha_em, Acme: o predicado no meio, em destaque, e um arco ligando o sujeito Ana ao objeto Acme.",
    },
    {
      id: "path",
      shortTitle: "Caminho",
      title: "Responder é andar no grafo",
      tag: "mechanism",
      body: [
        `“Em que estado fica a empresa onde a Ana trabalha?” Nenhuma tripla responde isso sozinha. Mas o caminho existe: Ana trabalha na ${company}, a ${company} fica em ${city}, ${city} fica em ${state}. Três arestas, três saltos.`,
        `O grafo também deriva fatos com [[regras de inferência|inference-rule]]. Com duas regras (fica_em é transitiva; sediada_em seguida de fica_em dá localizada_em), as ${triples.length} triplas geram ${inferred.length} novas: ${inferred.map(showTriple).join(", ")}. Ninguém escreveu esses fatos: eles saem da estrutura. É o tipo de dedução que um LLM faz com texto, mas aqui é exata e auditável.`,
      ],
      keyIdea: "Perguntas compostas viram caminhos: cada salto é uma tripla, e o caminho inteiro é a justificativa da resposta.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [graphOf({ path: answerPath, visited: answerPath, highlight: [state] })],
      },
      alt: `O caminho Ana, ${company}, ${city}, ${state} em destaque no grafo; ${state}, a resposta, aparece realçado.`,
    },
    {
      id: "ontology",
      shortTitle: "Ontologia",
      title: "A ontologia barra triplas sem sentido",
      tag: "example",
      body: [
        `Em sistemas com LLM, as triplas costumam ser extraídas do texto pelo próprio LLM. E ele erra. De ${extracted.length} triplas extraídas de um parágrafo novo, ${rejected.length} não fazem sentido: ${rejected.map(showTriple).join(" e ")}. Uma cidade não trabalha numa empresa, e quem usa tecnologia, neste esquema, é o projeto.`,
        `A [[ontologia|ontology]] é o esquema do grafo: os tipos de entidade e, para cada relação, os tipos aceitos no sujeito (domínio) e no objeto (imagem). Validar contra ela é barato e pega erros de extração antes que entrem no grafo: ${accepted.length} triplas passaram e ${rejected.length} foram rejeitadas. Mas ela checa tipos, não verdade: ${showTriple(accepted[0])} passa, e só a fonte diz se é fato. Padrões como RDFS e OWL, do W3C, formalizam esse esquema.`,
      ],
      keyIdea: "Extraia com o LLM, valide com a ontologia: o esquema é o guardrail do grafo.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "text", kind: "documents", label: "parágrafo", col: 0, row: 0.5 },
              { id: "llm", kind: "llm", label: "extração", col: 1, row: 0.5 },
              { id: "schema", kind: "guardrail", label: "ontologia", col: 2, row: 0.5 },
              { id: "graph", kind: "nosql-db", label: "grafo", col: 3, row: 0 },
              { id: "reject", kind: "no-result", label: "rejeitadas", col: 3, row: 1 },
            ],
            edges: [
              { from: "text", to: "llm" },
              { from: "llm", to: "schema", label: `${extracted.length} triplas` },
              { from: "schema", to: "graph", label: `${accepted.length} válidas` },
              { from: "schema", to: "reject", label: `${rejected.length} inválidas`, variant: "alternative" },
            ],
            active: "schema",
            done: ["text", "llm"],
          },
        ],
      },
      alt: `Um parágrafo passa pela extração do LLM, que produz ${extracted.length} triplas; a ontologia, em destaque, aceita ${accepted.length} no grafo e rejeita ${rejected.length}, num caminho tracejado.`,
    },
    {
      id: "limits",
      shortTitle: "Limites",
      title: "Exato, mas incompleto",
      tag: "tradeoff",
      body: [
        "O grafo responde com precisão o que está nele e mostra o caminho que usou. Mas ele só sabe o que foi extraído. Se o texto dizia “a Ana coordena o time do Atlas” e a extração não mapeou “coordena” para lidera, o fato simplesmente não existe no grafo.",
        "Grafos de conhecimento seguem a hipótese do mundo aberto: a ausência de uma tripla não quer dizer que o fato é falso, só que ninguém o registrou. Por isso, na prática, o grafo trabalha ao lado do texto: ele dá as ligações exatas, e os [[chunks|chunk]] dão as nuances e as citações.",
      ],
      keyIdea: "O grafo acerta o que tem e não sabe o que não tem: combine com o texto original.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "question", kind: "user", label: "pergunta", col: 0, row: 0.5 },
              { id: "graph", kind: "nosql-db", label: "grafo", col: 1, row: 0 },
              { id: "chunks", kind: "vector-db", label: "chunks", col: 1, row: 1 },
              { id: "context", kind: "context", label: "caminho + trechos", col: 2, row: 0.5 },
              { id: "llm", kind: "llm", label: "resposta", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "question", to: "graph", label: "entidades" },
              { from: "question", to: "chunks", label: "busca" },
              { from: "graph", to: "context", label: "triplas" },
              { from: "chunks", to: "context", label: "citações" },
              { from: "context", to: "llm" },
            ],
            active: "context",
          },
        ],
      },
      alt: "A pergunta consulta o grafo pelas entidades e o banco vetorial pela busca; triplas e citações se juntam no contexto, em destaque, que vai para o LLM.",
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Triplas, caminhos e esquema",
      tag: "summary",
      body: [
        "Um grafo de conhecimento guarda fatos como triplas, responde perguntas compostas seguindo caminhos, deriva fatos com regras e usa uma ontologia para barrar o que não faz sentido.",
        "A próxima aula mostra onde esse grafo mora: os bancos de grafos, os modelos de grafo de propriedades e RDF, e as linguagens Cypher e SPARQL.",
      ],
      keyIdea: "Texto vira tripla, tripla vira aresta, pergunta vira caminho.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "steps",
            piece: "pipeline",
            display: "chips",
            stages: [
              { id: "text", label: "texto" },
              { id: "extract", label: "extrair triplas" },
              { id: "validate", label: "validar na ontologia", color: "module-09" },
              { id: "graph", label: "grafo" },
              { id: "infer", label: "inferir fatos" },
              { id: "path", label: "responder por caminho", color: "brand" },
            ],
          },
        ],
      },
      alt: "Fluxo em chips: texto, extrair triplas, validar na ontologia, grafo, inferir fatos e responder por caminho.",
    },
  ],
  realWorldExample:
    "O Knowledge Graph da Google, lançado em 2012, alimenta os painéis de conhecimento da busca: ao procurar uma pessoa ou um lugar, o painel lateral mostra entidades e relações (onde nasceu, obras, cônjuge) em vez de só links. A empresa oferece a Knowledge Graph Search API para consultar entidades desse grafo.",
  code: {
    language: "python",
    source: `from rdflib import Graph, Namespace

EX = Namespace("http://exemplo.org/")
g = Graph()
g.add((EX.Ana, EX.trabalha_em, EX.Acme))
g.add((EX.Acme, EX.sediada_em, EX.Recife))
g.add((EX.Recife, EX.fica_em, EX.Pernambuco))

consulta = """
PREFIX ex: <http://exemplo.org/>
SELECT ?estado WHERE {
  ex:Ana ex:trabalha_em ?empresa .
  ?empresa ex:sediada_em ?cidade .
  ?cidade ex:fica_em ?estado .
}"""
for linha in g.query(consulta):
    print(linha.estado)  # http://exemplo.org/Pernambuco`,
    caption: "As triplas da aula em RDF com rdflib, e a pergunta de três saltos como um padrão SPARQL: cada linha do WHERE é uma tripla com variáveis.",
  },
  tradeOffs: {
    pros: [
      "Responde perguntas compostas seguindo caminhos explícitos e auditáveis",
      "Regras de inferência derivam fatos sem chamar o modelo",
      "A ontologia valida o que entra e mantém o vocabulário de relações consistente",
    ],
    cons: [
      "Extrair triplas de texto custa chamadas de LLM e erra",
      "Só sabe o que foi extraído: a ausência de uma tripla não diz que o fato é falso",
      "Modelar a ontologia pede tempo e acordo entre as equipes",
    ],
    alternatives: [
      "Busca em chunks, quando as perguntas são sobre um trecho e não sobre ligações",
      "Tabelas relacionais, quando as relações são poucas e fixas",
    ],
  },
  knowledgeCheck: [
    {
      id: "to-triples",
      prompt: "“O Atlas, liderado pela Ana, usa Postgres.” Quais triplas essa frase gera?",
      options: [
        "(Atlas, liderado_pela_Ana_usa, Postgres)",
        "(Ana, lidera, Atlas) e (Atlas, usa, Postgres)",
        "(Ana, usa, Postgres)",
        "Uma tripla só, porque é uma frase só",
      ],
      correct: 1,
      explanation: "A frase tem dois fatos. Separados em triplas, a relação lidera liga Ana ao projeto e a relação usa liga o projeto à tecnologia, e os dois podem ser combinados num caminho.",
      lesson: "09-02",
    },
    {
      id: "open-world",
      prompt: "O grafo não tem nenhuma tripla (Bruno, lidera, X). O que se pode concluir?",
      options: [
        "Que o Bruno não lidera nenhum projeto",
        "Que o fato não foi registrado: o Bruno pode liderar algo que a extração não pegou",
        "Que a ontologia proíbe o Bruno de liderar",
        "Que o grafo está corrompido",
      ],
      correct: 1,
      explanation: "Na hipótese do mundo aberto, ausência de tripla não é negação. Para afirmar que não lidera, seria preciso uma fonte que diga isso ou um domínio fechado e completo.",
      lesson: "09-02",
    },
  ],
  related: ["09-01", "09-03", "09-04"],
  references: [
    { title: "Hogan et al. (2020), Knowledge Graphs", url: "https://arxiv.org/abs/2003.02320", kind: "paper" },
    { title: "W3C: RDF 1.1 Concepts and Abstract Syntax", url: "https://www.w3.org/TR/rdf11-concepts/", kind: "docs" },
    { title: "Google Knowledge Graph Search API", url: "https://developers.google.com/knowledge-graph", kind: "docs" },
  ],
};

export default lesson;
