import type { LessonContent } from "../../../types/content";

// Um assistente de atendimento ao longo de 4 sessões com a mesma cliente, calculado aqui. Cada sessão
// produz fatos candidatos; o write-back grava só os duráveis num log append-only, e a consolidação
// (o valor mais recente vence por entidade e atributo, repetições são ignoradas) gera o estado. O custo de
// recarregar usa uma estimativa de brinquedo de tokens por fato.

interface Candidate {
  session: number;
  attribute: string;
  value: string;
  durable: boolean;
}

const ENTITY = "Marina";
const candidates: Candidate[] = [
  { session: 1, attribute: "canal", value: "e-mail", durable: true },
  { session: 1, attribute: "plano", value: "Básico", durable: true },
  { session: 2, attribute: "canal", value: "WhatsApp", durable: true },
  { session: 2, attribute: "humor", value: "com pressa hoje", durable: false },
  { session: 3, attribute: "plano", value: "Pro", durable: true },
  { session: 3, attribute: "canal", value: "WhatsApp", durable: true },
  { session: 4, attribute: "cidade", value: "Recife", durable: true },
  { session: 4, attribute: "humor", value: "irritada com o atraso", durable: false },
];
const SESSIONS = [...new Set(candidates.map((candidate) => candidate.session))];

const log = candidates
  .filter((candidate) => candidate.durable)
  .map((candidate, index) => ({ ...candidate, id: `e${index + 1}` }));
type Event = (typeof log)[number];
const discarded = candidates.length - log.length;

function consolidate(events: Event[]) {
  const state = new Map<string, Event>();
  let superseded = 0;
  let duplicates = 0;
  for (const event of events) {
    const current = state.get(event.attribute);
    if (current?.value === event.value) {
      duplicates++;
      continue;
    }
    if (current) superseded++;
    state.set(event.attribute, event);
  }
  return { state, superseded, duplicates };
}

const finalState = consolidate(log);
const stateText = [...finalState.state.values()].map((event) => `${event.attribute}: ${event.value}`);
const valuesInLog = (attribute: string) => [...new Set(log.filter((event) => event.attribute === attribute).map((event) => event.value))];
const channelValues = valuesInLog("canal");

// Arcos do log: cada evento aponta para o que ele substitui ou repete.
const arcs = log.flatMap((event, index) => {
  const previous = log.slice(0, index).reverse().find((other) => other.attribute === event.attribute);
  if (!previous) return [];
  return [{ from: index, to: log.indexOf(previous), weight: 0.8, label: previous.value === event.value ? "repete" : "substitui" }];
});

const TOKENS_PER_FACT = 40;
const loadSeries = SESSIONS.flatMap((session) => {
  const events = log.filter((event) => event.session <= session);
  return [
    { label: `S${session} log`, value: events.length * TOKENS_PER_FACT },
    { label: `S${session} estado`, value: consolidate(events).state.size * TOKENS_PER_FACT },
  ];
});

const lesson: LessonContent = {
  id: "09-09",
  subtitle: "Conhecimento que sobrevive ao fim da conversa: o que gravar, como guardar o histórico num log e como consolidar fatos que mudam e se repetem.",
  objectives: [
    "Explicar por que um LLM esquece entre sessões e onde o conhecimento persistente mora",
    "Decidir quais fatos de uma conversa merecem write-back",
    "Separar o log append-only do estado consolidado",
    "Consolidar fatos repetidos e contraditórios com uma regra explícita",
  ],
  steps: [
    {
      id: "amnesia",
      shortTitle: "Amnésia",
      title: "Cada conversa começa do zero",
      tag: "context",
      body: [
        `Na sessão 2, a ${ENTITY} avisa: “prefiro WhatsApp”. Na sessão 3, o assistente manda um e-mail. Para ela, é descaso; para o sistema, é arquitetura: o modelo não guarda nada entre chamadas. Tudo o que ele sabe da ${ENTITY} está no que vier no prompt daquela chamada.`,
        "Os pesos só mudam com treino, e o histórico da conversa some quando a sessão acaba. Para lembrar, o sistema precisa de [[conhecimento persistente|persistent-knowledge]]: gravado fora do modelo e fora da sessão, num banco que sobrevive a reinícios e é o mesmo para todas as instâncias do serviço. Nunca na memória do processo, que outra réplica não vê e que um deploy apaga.",
      ],
      keyIdea: "O modelo não lembra: quem lembra é o armazenamento que o sistema consulta a cada sessão.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "s2", kind: "phone", label: "sessão 2", col: 0, row: 0 },
              { id: "s3", kind: "phone", label: "sessão 3", col: 0, row: 1 },
              { id: "llm", kind: "llm", label: "assistente", col: 1.5, row: 0.5 },
              { id: "ok", kind: "answer", label: "anotado", col: 3, row: 0 },
              { id: "forgot", kind: "no-result", label: "manda e-mail", col: 3, row: 1 },
            ],
            edges: [
              { from: "s2", to: "llm", label: "prefiro whatsapp" },
              { from: "s3", to: "llm", label: "nova conversa" },
              { from: "llm", to: "ok" },
              { from: "llm", to: "forgot", label: "esqueceu", variant: "alternative" },
            ],
            active: "llm",
          },
        ],
      },
      alt: `Na sessão 2, a ${ENTITY} diz que prefere WhatsApp e o assistente, em destaque, responde que anotou; na sessão 3, sem nada gravado, ele esquece e manda e-mail, num caminho tracejado.`,
    },
    {
      id: "write-back",
      shortTitle: "Gravar",
      title: "Write-back: o que merece ficar",
      tag: "mechanism",
      body: [
        "Nem tudo o que aparece numa conversa deve ser lembrado. “Prefiro WhatsApp” vale para as próximas conversas; “estou com pressa hoje” vale só para hoje. Gravar tudo enche o armazenamento de ruído e, pior, de coisas que a pessoa não esperava que fossem guardadas.",
        `O [[write-back|write-back]] é a etapa que extrai fatos candidatos da conversa (em geral, um LLM com saída estruturada), decide se cada um é durável e grava os que forem. Nas ${SESSIONS.length} sessões, surgiram ${candidates.length} candidatos: ${log.length} gravados e ${discarded} descartados como passageiros. Cada gravação leva um id, para que repetir a etapa depois de uma falha não grave o mesmo fato duas vezes.`,
      ],
      keyIdea: "Grave fatos duráveis e explícitos, com id: o passageiro e o sensível ficam de fora.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "write",
            piece: "pipeline",
            stages: [
              { id: "chat", label: "conversa" },
              { id: "extract", label: "extrair fatos" },
              { id: "durable", label: "é durável?", color: "module-09" },
              { id: "append", label: "gravar no log" },
            ],
            active: "durable",
            done: ["chat", "extract"],
            branch: { id: "drop", label: "descartar", from: "durable", edgeLabel: `${discarded} passageiros` },
          },
        ],
      },
      alt: `Pipeline do write-back: conversa, extrair fatos, a decisão “é durável?”, em destaque, e gravar no log; um ramo tracejado descarta os ${discarded} fatos passageiros.`,
    },
    {
      id: "log",
      shortTitle: "Log",
      title: "Guardar o histórico, não só o último valor",
      tag: "mechanism",
      body: [
        "Um caderno de anotações em que você só escreve no fim, nunca apaga, e risca o que mudou com uma nota “substituído na página tal”. Dá para saber o que vale hoje e também o que valia antes, e por quê.",
        `O [[log append-only|append-only-log]] guarda cada fato gravado, em ordem: ${log.map((event) => `${event.id} ${event.attribute}: ${event.value}`).join("; ")}. Os arcos da cena ligam cada evento ao anterior do mesmo atributo: ${arcs.filter((arc) => arc.label === "substitui").length} substituições e ${arcs.filter((arc) => arc.label === "repete").length} repetição. O estado atual é derivado do log, e pode ser refeito do zero a qualquer momento: é a ideia do event sourcing.`,
      ],
      keyIdea: "O log é a fonte; o estado é uma vista derivada dele, que pode ser reconstruída.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "log",
            piece: "token-stream",
            tokens: log.map((event) => `${event.id} ${event.value}`),
            arcs,
            color: "module-09",
          },
        ],
      },
      alt: `Log com ${log.length} eventos em ordem: ${log.map((event) => `${event.id} ${event.value}`).join(", ")}. Arcos ligam cada evento ao anterior do mesmo atributo, marcando substituições e repetições.`,
    },
    {
      id: "consolidate",
      shortTitle: "Consolidar",
      title: "Consolidar: um valor por atributo",
      tag: "example",
      body: [
        `Se o assistente recebesse o log inteiro como anotações soltas, leria “canal: ${channelValues.join("” e “canal: ")}” e teria de adivinhar qual vale. Ele pode escolher qualquer um dos dois, e o erro só aparece quando a ${ENTITY} reclama.`,
        `A [[consolidação|knowledge-consolidation]] aplica uma regra explícita: por (entidade, atributo), o valor mais recente vence, e repetir o valor atual não muda nada. Dos ${log.length} eventos, saem ${finalState.state.size} fatos (${stateText.join("; ")}), com ${finalState.superseded} substituições e ${finalState.duplicates} duplicata. Regras melhores pesam a fonte: o que a cliente disse vale mais que o que o modelo inferiu.`,
      ],
      keyIdea: "Contradição se resolve na consolidação, com regra escrita, não no prompt, por adivinhação.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "state",
            piece: "metrics-panel",
            metrics: [
              { id: "events", label: "eventos no log", value: String(log.length) },
              { id: "facts", label: "fatos no estado", value: String(finalState.state.size), color: "success" },
              { id: "superseded", label: "substituídos", value: String(finalState.superseded), color: "info" },
              { id: "duplicates", label: "duplicatas", value: String(finalState.duplicates) },
            ],
            highlight: "facts",
          },
        ],
      },
      alt: `Painel da consolidação: ${log.length} eventos no log viram ${finalState.state.size} fatos no estado, em destaque, com ${finalState.superseded} substituídos e ${finalState.duplicates} duplicata.`,
    },
    {
      id: "load",
      shortTitle: "Recarregar",
      title: "O que recarregar na próxima sessão",
      tag: "tradeoff",
      body: [
        `Na abertura de cada sessão, o sistema carrega o que sabe da ${ENTITY}. Carregar o log cresce com cada fato gravado; carregar o estado cresce só com os atributos distintos. Com ${TOKENS_PER_FACT} tokens por fato, a cena compara os dois, sessão a sessão.`,
        `Na sessão ${SESSIONS[SESSIONS.length - 1]}, o log já tem ${log.length} eventos e o estado, ${finalState.state.size}. O log cresce a cada fato gravado, para sempre; o estado fica limitado aos atributos distintos. Com meses de uso e muitos atributos, até o estado deixa de caber: aí o sistema busca só os fatos relevantes para a conversa, como num RAG sobre a memória. O preço do estado é perder nuance; por isso o log continua guardado, para auditoria e para refazer a consolidação com uma regra melhor.`,
      ],
      keyIdea: "Recarregue o estado, não o log; e, quando o estado crescer, busque só o relevante.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "load",
            piece: "chart",
            kind: "bar",
            series: loadSeries,
            highlight: loadSeries.length - 1,
            color: "module-09",
          },
        ],
      },
      alt: `Tokens carregados por sessão, log contra estado: ${loadSeries.map((item) => `${item.label} ${item.value}`).join(", ")}.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Gravar, consolidar, recarregar",
      tag: "summary",
      body: [
        "Um sistema de conhecimento persistente tem quatro peças: write-back seletivo, log append-only como fonte, consolidação com regra explícita e recarga do estado (ou de parte dele) na sessão seguinte. Tudo num armazenamento compartilhado, não na memória do processo.",
        "A memória de agentes, no módulo 12, usa essas peças. A próxima aula compara as duas grandes formas de conhecimento externo que vimos: RAG, que sintetiza na hora, e a wiki, que sintetiza quando a fonte chega.",
      ],
      keyIdea: "Persistir é um ciclo: gravar o durável, consolidar com regra, recarregar o relevante.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "phone", kind: "phone", label: "sessão", col: 0, row: 0.5 },
              { id: "agent", kind: "agent", label: "assistente", col: 1, row: 0.5 },
              { id: "log", kind: "queue", label: "log append-only", col: 2, row: 0 },
              { id: "state", kind: "memory", label: "estado", col: 3, row: 0.5 },
              { id: "load", kind: "retrieval", label: "recarga", col: 2, row: 1 },
            ],
            edges: [
              { from: "phone", to: "agent" },
              { from: "agent", to: "log", label: "write-back" },
              { from: "log", to: "state", label: "consolida" },
              { from: "state", to: "load", label: "relevantes" },
              { from: "load", to: "agent", label: "próxima sessão" },
            ],
            active: "state",
            done: ["phone", "agent", "log"],
          },
        ],
      },
      alt: "A sessão fala com o assistente, que grava fatos duráveis no log append-only; o log é consolidado no estado, em destaque, e a recarga leva os fatos relevantes ao assistente na próxima sessão.",
    },
  ],
  realWorldExample:
    "Em 2024, a OpenAI lançou a memória do ChatGPT: o assistente guarda detalhes entre conversas, como preferências que o usuário mencionou, e o usuário pode ver, apagar ou desligar as memórias nas configurações. O controle pelo usuário é parte do desenho: o que é gravado fica visível e pode ser removido.",
  code: {
    language: "python",
    source: `def consolidar(log):
    estado, substituidos, duplicatas = {}, 0, 0
    for evento in log:                      # em ordem de gravação
        chave = (evento["entidade"], evento["atributo"])
        atual = estado.get(chave)
        if atual == evento["valor"]:
            duplicatas += 1
            continue
        if atual is not None:
            substituidos += 1
        estado[chave] = evento["valor"]     # o mais recente vence
    return estado, substituidos, duplicatas`,
    caption: "A consolidação da aula: o estado é uma dobra sobre o log, com a regra “o mais recente vence” escrita no código.",
  },
  tradeOffs: {
    pros: [
      "O assistente lembra preferências e fatos entre sessões e entre instâncias do serviço",
      "O log guarda o histórico e permite refazer o estado com uma regra nova",
      "A consolidação resolve contradições antes que cheguem ao modelo",
    ],
    cons: [
      "Extrair e decidir o que é durável custa uma chamada de LLM e erra",
      "Guardar dados pessoais exige consentimento, visibilidade e remoção",
      "“O mais recente vence” falha quando a fonte mais nova é menos confiável",
    ],
    alternatives: [
      "Recarregar o histórico bruto da conversa, para sessões curtas",
      "Busca vetorial sobre o log, quando os fatos são muitos e pouco estruturados",
    ],
  },
  knowledgeCheck: [
    {
      id: "in-process",
      prompt: "Um serviço de chat roda em 4 réplicas e guarda as preferências dos usuários num dicionário na memória do processo. O que acontece?",
      options: [
        "Funciona, porque cada réplica tem uma cópia",
        "A preferência gravada numa réplica não existe nas outras e some no próximo deploy",
        "O modelo passa a lembrar sozinho",
        "Fica mais rápido e sem efeitos colaterais",
      ],
      correct: 1,
      explanation: "Estado em memória de processo é local e volátil. Conhecimento persistente precisa de um armazenamento compartilhado entre as réplicas e que sobreviva a reinícios.",
      lesson: "09-09",
    },
    {
      id: "durable",
      prompt: "Qual destes fatos de uma conversa deveria passar pelo write-back?",
      options: [
        "“Estou com sono hoje”",
        "“Meu CNPJ mudou: o novo é o da filial de Recife”",
        "“Pode repetir a última frase?”",
        "“Obrigado!”",
      ],
      correct: 1,
      explanation: "É um fato durável, que muda o atendimento das próximas sessões e substitui o valor anterior. Os outros valem só para o momento.",
      lesson: "09-09",
    },
  ],
  related: ["09-08", "09-10", "12-07"],
  references: [
    { title: "Packer et al. (2023), MemGPT: Towards LLMs as Operating Systems", url: "https://arxiv.org/abs/2310.08560", kind: "paper" },
    {
      title: "Park et al. (2023), Generative Agents: Interactive Simulacra of Human Behavior",
      url: "https://arxiv.org/abs/2304.03442",
      kind: "paper",
    },
    { title: "Martin Fowler: Event Sourcing", url: "https://martinfowler.com/eaaDev/EventSourcing.html", kind: "article" },
  ],
};

export default lesson;
