import { cosineSimilarity } from "../../../lab/embeddings";
import { embed, tokenize } from "../../../lab/retrieval";
import type { LessonContent } from "../../../types/content";

// Transformações da pergunta com contas no arquivo. Os "embeddings" são de brinquedo, como no playground de BM25
// vs. busca vetorial: cada palavra conhecida soma um vetor de conceito com 5 traços
// [home office, estágio, folga, reembolso, quantidade]; palavras fora do dicionário não contam. Seis chunks do
// manual de RH e três perguntas de teste, cada uma com os chunks que a respondem. Para cada técnica (pergunta
// original, reescrita, multi-query e HyDE), as buscas pegam o top-2 de cada versão da pergunta, juntam pelo maior
// score de cada chunk e cortam no top-2 final; o recall é a fração dos chunks certos que voltou.

const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const percent = (value: number) => `${Math.round(value * 100)}%`;
const listing = (items: string[]) => (items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} e ${items[items.length - 1]}`);

const stopwords = new Set(["o", "a", "e", "de", "do", "da", "por", "para", "em", "no", "na", "os", "as", "um", "uma", "com", "que", "ate", "sim"]);
const DIMS = 5;
const concepts: Record<string, number[]> = {
  home: [1, 0, 0, 0, 0],
  office: [1, 0, 0, 0, 0],
  remoto: [1, 0, 0, 0, 0],
  estagiario: [0, 1, 0, 0, 0],
  estagiarios: [0, 1, 0, 0, 0],
  estagio: [0, 1, 0, 0, 0],
  recesso: [0, 0, 1, 0, 0],
  ferias: [0, 0, 1, 0, 0],
  reembolso: [0, 0, 0, 1, 0],
  internet: [0, 0, 0, 0.5, 0],
  dia: [0, 0, 0.3, 0, 0.7],
  dias: [0, 0, 0.3, 0, 0.7],
  semana: [0, 0, 0, 0, 0.6],
  ano: [0, 0, 0.3, 0, 0.3],
  anos: [0, 0, 0, 0, 0.3],
  dura: [0, 0, 0, 0, 0.3],
  quantos: [0, 0, 0, 0, 0.5],
};
const vectorOf = (text: string) => embed(tokenize(text, stopwords), concepts, DIMS);

const chunks = [
  { id: "c1", label: "home office clt", text: "Funcionários CLT podem fazer home office até 3 dias por semana." },
  { id: "c2", label: "home office estágio", text: "Estagiários podem fazer home office 1 dia por semana, com aprovação do supervisor." },
  { id: "c3", label: "recesso estágio", text: "Estagiários têm recesso de 30 dias por ano." },
  { id: "c4", label: "internet", text: "Reembolso de internet para quem está em home office." },
  { id: "c5", label: "férias clt", text: "Férias de funcionários: 30 dias por ano." },
  { id: "c6", label: "duração estágio", text: "O estágio dura até 2 anos." },
].map((chunk) => ({ ...chunk, vector: vectorOf(chunk.text) }));
const labelOf = (id: string) => chunks.find((chunk) => chunk.id === id)?.label ?? id;

const K = 2;
type Hit = { id: string; score: number };
const search = (query: string): Hit[] => {
  const vector = vectorOf(query);
  return chunks
    .map((chunk) => ({ id: chunk.id, score: cosineSimilarity(chunk.vector, vector) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, K);
};
/** Várias buscas viram uma lista só: cada chunk fica com o maior score que recebeu, e corta no top-k. */
const fuse = (queries: string[]): Hit[] => {
  const best = new Map<string, number>();
  for (const hit of queries.flatMap(search)) best.set(hit.id, Math.max(hit.score, best.get(hit.id) ?? 0));
  return [...best.entries()]
    .map(([id, score]) => ({ id, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, K);
};

type Technique = "original" | "rewrite" | "multi" | "hyde";
interface TestQuestion {
  label: string;
  question: string;
  relevant: string[];
  rewrite: string;
  variants: string[];
  hypothetical: string;
}

const HISTORY = "Quantos dias de home office posso fazer?";
const FOLLOW_UP = "E para estagiários?";
const REWRITTEN = "Quantos dias de home office estagiários podem fazer por semana?";
const HYPOTHETICAL = "Sim, estagiários podem fazer home office alguns dias por semana.";
const VAGUE = "Posso trabalhar remotamente sendo estagiário?";

const tests: TestQuestion[] = [
  {
    label: "continuação",
    question: FOLLOW_UP,
    relevant: ["c2"],
    rewrite: REWRITTEN,
    variants: ["home office para estagiários", "estagiário pode trabalhar remoto?", "dias de home office do estágio"],
    hypothetical: "Estagiários podem fazer home office 1 dia por semana.",
  },
  {
    label: "composta",
    question: "Estagiário pode fazer home office e quantos dias de recesso tem?",
    relevant: ["c2", "c3"],
    rewrite: "Estagiário pode fazer home office e quantos dias de recesso o estagiário tem?",
    variants: ["estagiário pode fazer home office?", "quantos dias de recesso o estagiário tem?", "regras de home office e recesso do estágio"],
    hypothetical: "Estagiários podem fazer home office 1 dia por semana e têm recesso de 30 dias por ano.",
  },
  {
    label: "vocabulário diferente",
    question: VAGUE,
    relevant: ["c2"],
    rewrite: "Estagiário pode fazer trabalho remoto?",
    variants: ["estagiário em trabalho remoto", "home office para estagiários", "estágio a distância"],
    hypothetical: HYPOTHETICAL,
  },
];

const queriesFor = (test: TestQuestion, technique: Technique): string[] => {
  if (technique === "rewrite") return [test.rewrite];
  if (technique === "multi") return [test.question, ...test.variants];
  if (technique === "hyde") return [test.hypothetical];
  return [test.question];
};
const recallOf = (test: TestQuestion, technique: Technique) => {
  const found = new Set(fuse(queriesFor(test, technique)).map((hit) => hit.id));
  return test.relevant.filter((id) => found.has(id)).length / test.relevant.length;
};
const techniques: Array<{ id: Technique; label: string; llmCalls: number }> = [
  { id: "original", label: "original", llmCalls: 0 },
  { id: "rewrite", label: "reescrita", llmCalls: 1 },
  { id: "multi", label: "multi-query", llmCalls: 1 },
  { id: "hyde", label: "HyDE", llmCalls: 1 },
];
const meanRecall = (technique: Technique) => tests.reduce((total, test) => total + recallOf(test, technique), 0) / tests.length;
const recallSeries = techniques.map((technique) => ({ label: technique.label, value: Number(meanRecall(technique.id).toFixed(2)) }));
const bestTechnique = recallSeries.reduce((best, entry) => (entry.value > best.value ? entry : best));
const searchesFor = (technique: Technique) => queriesFor(tests[0], technique).length;
const calls = (count: number) => (count === 0 ? "nenhuma chamada" : count === 1 ? "1 chamada" : `${count} chamadas`);
const searches = (count: number) => (count === 1 ? "1 busca" : `${count} buscas`);

// Passo 2: a continuação, antes e depois da reescrita.
const followUpHits = search(FOLLOW_UP);
const rewrittenHits = search(REWRITTEN);
const scoreFor = (query: string, id: string) =>
  cosineSimilarity(vectorOf(query), chunks.find((chunk) => chunk.id === id)?.vector ?? []);
const followUpTarget = scoreFor(FOLLOW_UP, "c2");
const rewrittenTarget = scoreFor(REWRITTEN, "c2");

// Passo 3: a pergunta composta, sozinha e em várias versões.
const composite = tests[1];
const compositeAlone = fuse([composite.question]);
const compositeMulti = fuse(queriesFor(composite, "multi"));

// Passo 4: HyDE, a pergunta com vocabulário diferente dos documentos.
const vagueHits = search(VAGUE);
const hydeHits = search(HYPOTHETICAL);
const vagueTarget = scoreFor(VAGUE, "c2");
const hydeTarget = scoreFor(HYPOTHETICAL, "c2");
/** Coordenadas da cena: home office, estágio e tempo (folga + quantidade), normalizadas. */
const toScene = (vector: readonly number[]): [number, number, number] => {
  const point = [vector[0], vector[1], vector[2] + vector[4]];
  const length = Math.hypot(...point) || 1;
  return [point[0] / length, point[1] / length, point[2] / length];
};

const lesson: LessonContent = {
  id: "08-10",
  subtitle: "Como mexer na pergunta antes da busca: reescrever, desdobrar em várias versões e buscar com uma resposta hipotética.",
  objectives: [
    "Reescrever uma pergunta de continuação para que ela faça sentido sozinha",
    "Usar multi-query e decomposição para cobrir perguntas compostas",
    "Explicar por que o HyDE busca com uma resposta inventada sem pôr a invenção na resposta",
    "Comparar o ganho de recall de cada técnica com o custo em chamadas de LLM",
  ],
  steps: [
    {
      id: "vague",
      shortTitle: "Pergunta vaga",
      title: "“E para estagiários?” não diz nada sozinha",
      tag: "context",
      body: [
        `Você pergunta ao bibliotecário “${HISTORY}”, e depois “${FOLLOW_UP}”. Ele entende, porque lembra da conversa. A busca vetorial não lembra: ela recebe só a última frase e procura chunks parecidos com “estagiários”.`,
        `No índice do assistente de RH, “${FOLLOW_UP}” traz ${listing(followUpHits.map((hit) => `${labelOf(hit.id)} (${fixed(hit.score)})`))}. O chunk que responde, ${labelOf("c2")}, fica de fora, com ${fixed(followUpTarget)}. O problema não está no índice nem no modelo de embedding: está na pergunta que chegou à busca.`,
      ],
      keyIdea: "A busca só vê a pergunta que recebe. Se ela depende da conversa, a busca erra.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "history", kind: "memory", label: "histórico", col: 0, row: 1 },
              { id: "user", kind: "user", label: "e para estagiários?", col: 0, row: 0 },
              { id: "search", kind: "retrieval", label: `top-${K}`, col: 1, row: 0 },
              { id: "wrong", kind: "no-result", label: labelOf(followUpHits[0].id), col: 2, row: 0 },
            ],
            edges: [
              { from: "user", to: "search", label: "só a frase" },
              { from: "search", to: "wrong", label: "chunk errado", variant: "alternative" },
            ],
            active: "search",
          },
        ],
      },
      alt: `A pergunta “${FOLLOW_UP}” vai sozinha para a busca, em destaque, sem o histórico da conversa, e volta com o chunk errado, ${labelOf(followUpHits[0].id)}.`,
    },
    {
      id: "rewrite",
      shortTitle: "Reescrever",
      title: "Um LLM reescreve a pergunta antes da busca",
      tag: "mechanism",
      body: [
        "A solução é fazer o que o bibliotecário faz de cabeça: completar a pergunta com o que veio antes. Um LLM recebe o histórico e a última mensagem e devolve uma pergunta que faz sentido sozinha.",
        `Essa [[reescrita da consulta|query-rewriting]] transforma “${FOLLOW_UP}” em “${REWRITTEN}”. O score de ${labelOf("c2")} sobe de ${fixed(followUpTarget)} para ${fixed(rewrittenTarget)}, e o top-${K} passa a ser ${listing(rewrittenHits.map((hit) => labelOf(hit.id)))}. A reescrita custa uma chamada de LLM a mais antes da busca, e a pergunta original continua indo para a geração da resposta.`,
      ],
      keyIdea: "Reescreva para a busca, não para o usuário: a pergunta reescrita só precisa achar os chunks certos.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "scores",
            piece: "metrics-panel",
            metrics: [
              { id: "before", label: "score do chunk certo, antes", value: fixed(followUpTarget), color: "danger" },
              { id: "after", label: "score do chunk certo, depois", value: fixed(rewrittenTarget), color: "success" },
              { id: "top", label: "1º lugar depois", value: labelOf(rewrittenHits[0].id) },
            ],
            highlight: "after",
          },
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "history", kind: "memory", label: "histórico", col: 0, row: 1 },
              { id: "user", kind: "user", label: "e para estagiários?", col: 0, row: 0 },
              { id: "llm", kind: "llm", label: "reescrever", col: 1, row: 0.5 },
              { id: "search", kind: "retrieval", label: `top-${K}`, col: 2, row: 0.5 },
              { id: "right", kind: "context", label: labelOf(rewrittenHits[0].id), col: 3, row: 0.5 },
            ],
            edges: [
              { from: "user", to: "llm" },
              { from: "history", to: "llm", label: "contexto" },
              { from: "llm", to: "search", label: "pergunta completa" },
              { from: "search", to: "right" },
            ],
            active: "llm",
          },
        ],
      },
      alt: `O histórico e a pergunta entram num LLM que reescreve, em destaque; a pergunta completa vai para a busca e traz ${labelOf(rewrittenHits[0].id)}. O score do chunk certo sobe de ${fixed(followUpTarget)} para ${fixed(rewrittenTarget)}.`,
    },
    {
      id: "multi",
      shortTitle: "Várias buscas",
      title: "Uma pergunta composta pede várias buscas",
      tag: "mechanism",
      body: [
        `“${composite.question}” são duas perguntas numa só. Um vetor único fica no meio do caminho entre os dois assuntos, e o top-${K} vai para um lado só: ${listing(compositeAlone.map((hit) => labelOf(hit.id)))}.`,
        `Com [[multi-query|multi-query]], o LLM gera ${composite.variants.length} versões da pergunta, entre elas as duas subperguntas da [[decomposição|query-decomposition]]. Cada versão faz a sua busca, e os resultados se juntam: cada chunk fica com o maior score que recebeu, e a lista é cortada no top-${K}. Agora voltam ${listing(compositeMulti.map((hit) => labelOf(hit.id)))}, os dois chunks que respondem. Juntar pelo maior score é o jeito mais simples; somar as posições de cada ranking com RRF é a alternativa mais comum.`,
      ],
      keyIdea: "Uma pergunta, várias buscas: cada versão cobre um pedaço do que foi perguntado.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "fanout",
            piece: "pipeline",
            stages: [
              { id: "question", label: "pergunta composta" },
              { id: "llm", label: `llm: ${composite.variants.length} versões` },
              { id: "search", label: `${composite.variants.length + 1} buscas` },
              { id: "fuse", label: "juntar pelo maior", color: "module-08" },
              { id: "top", label: `top-${K}`, color: "brand" },
            ],
            active: "fuse",
            done: ["question", "llm", "search"],
          },
        ],
      },
      alt: `Pipeline: a pergunta composta vai a um LLM que gera ${composite.variants.length} versões, que fazem ${composite.variants.length + 1} buscas contando a original; os resultados se juntam pelo maior score, em destaque, e são cortados no top-${K}.`,
    },
    {
      id: "hyde",
      shortTitle: "HyDE",
      title: "Buscar com uma resposta inventada",
      tag: "mechanism",
      body: [
        `“${VAGUE}” usa palavras que o manual não usa: o manual diz “home office”, a pergunta diz “trabalhar remotamente”. Perguntas e documentos têm formas diferentes, e ficam em regiões diferentes do espaço mesmo quando falam da mesma coisa.`,
        `O [[HyDE|hyde]] (Gao et al., 2022) pede ao LLM uma resposta hipotética, “${HYPOTHETICAL}”, e busca com o embedding dela. A resposta inventada se parece com um documento: o score de ${labelOf("c2")} vai de ${fixed(vagueTarget)}, com a pergunta, para ${fixed(hydeTarget)}, e ele passa de ${vagueHits.some((hit) => hit.id === "c2") ? "um dos dois" : "fora do top-2"} para o 1º lugar. A invenção só serve de isca: a resposta final é gerada a partir dos chunks recuperados, não do texto hipotético.`,
      ],
      keyIdea: "HyDE troca a pergunta por algo parecido com a resposta, porque é com respostas que os documentos se parecem.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "space",
            piece: "vector-space",
            points: [
              ...chunks.map((chunk) => ({ id: chunk.id, label: chunk.label, coords: toScene(chunk.vector), color: "module-08" as const })),
              { id: "question", label: "pergunta", coords: toScene(vectorOf(VAGUE)), color: "danger" },
              { id: "hyde", label: "resposta hipotética", coords: toScene(vectorOf(HYPOTHETICAL)), color: "brand" },
            ],
            query: "hyde",
            neighbors: 1,
            distance: { from: "question", to: "c2", label: `cos ${fixed(vagueTarget)}` },
          },
        ],
      },
      alt: `Os ${chunks.length} chunks, a pergunta e a resposta hipotética no espaço. A resposta hipotética cai em cima de ${labelOf(hydeHits[0].id)}, seu vizinho mais próximo; a pergunta original fica longe dele, com cosseno ${fixed(vagueTarget)}.`,
    },
    {
      id: "compare",
      shortTitle: "Comparar",
      title: "O placar nas três perguntas de teste",
      tag: "example",
      body: [
        `Cada técnica resolve um tipo de problema. Para comparar, a aula usa ${tests.length} perguntas de teste, cada uma com os chunks que a respondem e de um tipo: ${listing(tests.map((test) => test.label))}. O recall é a fração desses chunks que voltou no top-${K} final.`,
        `A pergunta original fica com recall médio de ${percent(meanRecall("original"))}. A reescrita resolve a continuação e a de vocabulário; o HyDE também; nenhuma das duas cobre a pergunta composta inteira. O ${bestTechnique.label} chega a ${percent(bestTechnique.value)}, porque a busca com várias versões cobre os dois lados da composta. Em produção, essa comparação se faz com o conjunto de avaliação do seu domínio, como na aula 08.15.`,
      ],
      keyIdea: "Não existe técnica vencedora em geral: meça cada uma nas perguntas que o seu sistema recebe.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "recall",
            piece: "chart",
            kind: "bar",
            series: recallSeries,
            max: 1,
            highlight: recallSeries.indexOf(bestTechnique),
            color: "module-08",
          },
        ],
      },
      alt: `Recall médio no top-${K} nas ${tests.length} perguntas de teste: ${recallSeries.map((entry) => `${entry.label} ${percent(entry.value)}`).join(", ")}.`,
    },
    {
      id: "cost",
      shortTitle: "Custo",
      title: "Cada técnica é uma chamada a mais antes da busca",
      tag: "tradeoff",
      body: [
        "Melhorar a pergunta tem preço: o usuário espera enquanto um LLM reescreve ou inventa uma resposta, e só depois a busca começa. Num chat, esse tempo extra aparece antes do primeiro token da resposta.",
        `Por pergunta, a original não chama o LLM e faz ${searches(searchesFor("original"))}; a reescrita, ${calls(techniques[1].llmCalls)} e ${searches(searchesFor("rewrite"))}; o multi-query, ${calls(techniques[2].llmCalls)} e ${searches(searchesFor("multi"))}; o HyDE, ${calls(techniques[3].llmCalls)}, que gera um texto mais longo, e ${searches(searchesFor("hyde"))}. Há riscos também: a reescrita pode mudar o sentido da pergunta, e o HyDE puxa para o que o LLM imagina, o que atrapalha em domínios que ele não conhece. Um modelo pequeno e rápido costuma bastar para essas chamadas.`,
      ],
      keyIdea: "Use a transformação que o problema pede: reescrita para conversa, multi-query para perguntas compostas, HyDE para vocabulário diferente.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "scores",
            piece: "metrics-panel",
            metrics: techniques.map((technique) => ({
              id: technique.id,
              label: technique.label,
              value: `${technique.llmCalls} llm · ${searches(searchesFor(technique.id))}`,
              color: technique.id === "multi" ? ("success" as const) : undefined,
            })),
            highlight: "multi",
          },
        ],
      },
      alt: `Custo por pergunta: ${techniques.map((technique) => `${technique.label}, ${calls(technique.llmCalls)} de LLM e ${searches(searchesFor(technique.id))}`).join("; ")}.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Antes de buscar, prepare a pergunta",
      tag: "summary",
      body: [
        "A pergunta do usuário nem sempre é a melhor pergunta para a busca. Reescrever completa o que a conversa deixou implícito; várias versões e subperguntas cobrem perguntas compostas; uma resposta hipotética aproxima a busca da linguagem dos documentos.",
        "Com os chunks certos no contexto, falta o último passo: fazer o modelo responder só com eles, citar as fontes e admitir quando não há base. É o assunto da próxima aula.",
      ],
      keyIdea: "Retrieval augmentation do lado da pergunta: reescrever, desdobrar e expandir, sempre medindo o recall.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "steps",
            piece: "pipeline",
            display: "chips",
            stages: [
              { id: "question", label: "pergunta + histórico" },
              { id: "rewrite", label: "reescrever", color: "module-08" },
              { id: "multi", label: "várias versões", color: "module-08" },
              { id: "hyde", label: "resposta hipotética", color: "module-08" },
              { id: "search", label: "buscar e juntar" },
              { id: "context", label: "contexto", color: "brand" },
            ],
          },
        ],
      },
      alt: "Fluxo em chips: pergunta com histórico, reescrever, várias versões, resposta hipotética, buscar e juntar, contexto.",
    },
  ],
  realWorldExample:
    "O LangChain tem o MultiQueryRetriever, que pede a um LLM várias versões da pergunta, busca com cada uma e devolve a união dos documentos sem repetição. O LlamaIndex implementa o HyDE como uma transformação de consulta (HyDEQueryTransform), aplicada antes do retriever. Os dois frameworks também têm modos de chat que condensam o histórico numa pergunta completa antes de buscar.",
  code: {
    language: "python",
    source: `def multi_query_retrieve(question, llm, search, k=2):
    prompt = f"Gere 3 versões desta pergunta para uma busca, uma por linha:\\n{question}"
    variants = [line for line in llm(prompt).splitlines() if line.strip()]
    best = {}
    for query in [question, *variants]:
        for chunk_id, score in search(query, k=k):
            best[chunk_id] = max(score, best.get(chunk_id, 0.0))
    return sorted(best.items(), key=lambda item: item[1], reverse=True)[:k]

def hyde_retrieve(question, llm, search, k=2):
    hypothetical = llm(f"Escreva um parágrafo curto que responda: {question}")
    return search(hypothetical, k=k)  # a resposta final usa os chunks, não o parágrafo`,
    caption: "Multi-query com junção pelo maior score e HyDE, como na aula. llm e search são as funções da sua aplicação.",
  },
  tradeOffs: {
    pros: [
      "Resolve perguntas de continuação que a busca sozinha não entende",
      "Perguntas compostas passam a recuperar os chunks de todas as partes",
      "Nenhuma mudança no índice: tudo acontece antes da busca",
    ],
    cons: [
      "Cada técnica soma uma chamada de LLM e latência antes da resposta",
      "A reescrita pode mudar o sentido da pergunta sem ninguém perceber",
      "O HyDE depende do que o LLM imagina e piora em domínios que ele não conhece",
    ],
    alternatives: [
      "Busca híbrida, quando o problema é termo exato e não forma da pergunta",
      "Chunks com contexto do documento (contextual retrieval), para aproximar os documentos das perguntas",
      "Pedir ao usuário que esclareça quando a pergunta é ambígua demais",
    ],
  },
  knowledgeCheck: [
    {
      id: "follow-up",
      prompt: "No chat do RH, depois de falar sobre o plano de saúde, o usuário escreve “e o odontológico?”. A busca traz chunks aleatórios sobre odontologia. Qual técnica ataca a causa?",
      options: [
        "Aumentar o top-k",
        "Reescrever a pergunta com o histórico, por exemplo “o plano odontológico está incluído no benefício de saúde?”, antes de buscar",
        "Trocar o modelo de embedding",
        "Diminuir o tamanho dos chunks",
      ],
      correct: 1,
      explanation: "A busca recebeu uma pergunta que só faz sentido com a conversa. A reescrita com o histórico devolve à busca o assunto que estava implícito.",
      lesson: "08-10",
    },
    {
      id: "hyde-wrong-number",
      prompt: "Com HyDE, a resposta hipotética diz “estagiários podem fazer 2 dias de home office”, mas a política diz 1 dia. A resposta ao usuário vai dizer 2 dias?",
      options: [
        "Sim, porque o HyDE gera a resposta final",
        "Não necessariamente: a resposta hipotética só serve para buscar; a geração usa os chunks recuperados, que dizem 1 dia",
        "Sim, a menos que o top-k seja 1",
        "Não, porque o HyDE corrige números sozinho",
      ],
      correct: 1,
      explanation: "No HyDE, o texto inventado é só a isca da busca. Um número errado nele ainda acha o chunk certo, e é o chunk que vai para o contexto da resposta.",
      lesson: "08-10",
    },
  ],
  related: ["08-09", "08-11", "07-09"],
  references: [
    { title: "Gao et al. (2022), Precise Zero-Shot Dense Retrieval without Relevance Labels (HyDE)", url: "https://arxiv.org/abs/2212.10496", kind: "paper" },
    { title: "Ma et al. (2023), Query Rewriting for Retrieval-Augmented Large Language Models", url: "https://arxiv.org/abs/2305.14283", kind: "paper" },
    { title: "LangChain: documentação", url: "https://python.langchain.com/", kind: "docs" },
  ],
};

export default lesson;
