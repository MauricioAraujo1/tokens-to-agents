import type { LessonContent } from "../../../types/content";

// Frameworks de agentes com contas no arquivo: as cinco peças que todo agente de produção precisa (loop,
// execução de ferramentas, estado salvo, pausa humana e vários agentes) e quem escreve cada uma. A matriz
// marca 1 quando a documentação oficial citada na aula descreve o recurso pronto, numa foto de 2025-2026;
// frameworks mudam rápido, então confira a versão que você usa.

interface Feature {
  id: string;
  label: string;
}

const features: Feature[] = [
  { id: "loop", label: "loop do agente" },
  { id: "tools", label: "executar ferramentas" },
  { id: "state", label: "estado salvo" },
  { id: "human", label: "pausa humana" },
  { id: "multi", label: "vários agentes" },
];

interface Option {
  id: string;
  label: string;
  /** Recursos entregues prontos, segundo a documentação oficial citada. */
  provides: string[];
  /** Como o desenvolvedor descreve o agente nessa opção. */
  style: string;
}

const options: Option[] = [
  { id: "api", label: "API direta", provides: [], style: "você escreve o loop em volta das chamadas" },
  {
    id: "langgraph",
    label: "LangGraph",
    provides: ["loop", "tools", "state", "human", "multi"],
    style: "um grafo explícito de nós e arestas sobre um estado",
  },
  {
    id: "claude",
    label: "Claude Agent SDK",
    provides: ["loop", "tools", "state", "human", "multi"],
    style: "o loop do Claude Code pronto, configurado com ferramentas, permissões e subagentes",
  },
  {
    id: "crewai",
    label: "CrewAI",
    provides: ["loop", "tools", "state", "human", "multi"],
    style: "papéis e tarefas numa crew, com processo sequencial ou hierárquico",
  },
];

const matrixValues = features.map((feature) => options.map((option) => (option.provides.includes(feature.id) ? 1 : 0)));
const yourCode = (option: Option) => features.length - option.provides.length;
const apiOption = options[0];
const frameworkOptions = options.slice(1);

const HANDOFF_TARGET = "Refund Agent";
const handoffTool = `transfer_to_${HANDOFF_TARGET.toLowerCase().replace(/ /g, "_")}`;

const decisionChips = [
  { id: "api", label: "comece pela API" },
  { id: "loop", label: "o loop simples resolve?" },
  { id: "pause", label: "precisa pausar e retomar?" },
  { id: "team", label: "precisa de vários agentes?" },
  { id: "pick", label: "escolha um framework", color: "module-12" as const },
  { id: "read", label: "leia o código que ele roda" },
];

const lesson: LessonContent = {
  id: "12-16",
  subtitle: "O que um framework de agentes entrega pronto, como os principais se diferenciam, e quando vale começar sem nenhum.",
  objectives: [
    "Listar as peças que um framework de agentes entrega: loop, ferramentas, estado, pausa humana e vários agentes",
    "Comparar o estilo de LangGraph, Claude Agent SDK, CrewAI e OpenAI Agents SDK",
    "Decidir entre a API direta e um framework para um caso concreto",
  ],
  steps: [
    {
      id: "kit",
      shortTitle: "O kit",
      title: "Tijolos ou casa pré-fabricada",
      tag: "context",
      body: [
        "Dá para construir uma casa comprando tijolo, cimento e fio, ou comprar um kit pré-fabricado com as paredes, a fiação e o encanamento no lugar. O kit sobe mais rápido; com os tijolos, você sabe exatamente o que tem dentro de cada parede.",
        `Um [[framework de agentes|agent-framework]] é o kit: entrega pronto o [[loop do agente|agent-loop]], a execução das ferramentas pedidas por [[tool calling|tool-calling]], o [[estado|agent-state]] salvo entre passos, a pausa para aprovação humana e a coordenação de vários agentes. Com a API direta, você escreve as ${features.length} peças. Com um framework, escreve as ferramentas, o prompt e as regras do seu caso.`,
      ],
      keyIdea: "O framework entrega o encanamento do agente; você entra com as ferramentas, o prompt e as regras.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "kit",
            piece: "block-diagram",
            blocks: [
              { id: "code", kind: "laptop", label: "seu código", col: 0, row: 0.5 },
              { id: "framework", kind: "agent", label: "framework", col: 1, row: 0.5 },
              { id: "llm", kind: "llm", label: "api do modelo", col: 2, row: 0 },
              { id: "tool", kind: "tool", label: "ferramentas", col: 2, row: 1 },
              { id: "state", kind: "memory", label: "estado salvo", col: 3, row: 0 },
              { id: "human", kind: "user", label: "aprovação", col: 3, row: 1 },
            ],
            edges: [
              { from: "code", to: "framework", label: "tools + prompt" },
              { from: "framework", to: "llm", label: "loop" },
              { from: "framework", to: "tool", label: "executa" },
              { from: "llm", to: "state" },
              { from: "tool", to: "human", label: "pausa" },
            ],
            active: "framework",
          },
        ],
      },
      alt: "Seu código entrega ferramentas e prompt ao framework, em destaque, que roda o loop com a API do modelo, executa as ferramentas, guarda o estado e pausa para aprovação humana.",
    },
    {
      id: "features",
      shortTitle: "Peças",
      title: "As mesmas peças, prontas",
      tag: "mechanism",
      body: [
        "Todo kit de casa traz paredes, telhado e porta; o que muda é o estilo e o quanto você pode mexer. Com frameworks de agentes é igual: as peças básicas aparecem em todos.",
        `Na matriz, 1 quer dizer que a documentação oficial descreve a peça pronta. Com a ${apiOption.label}, você escreve ${yourCode(apiOption)} de ${features.length}. ${frameworkOptions.map((option) => `${option.label} entrega ${option.provides.length}`).join("; ")}. A diferença está no estilo: no ${frameworkOptions[0].label}, ${frameworkOptions[0].style}; no ${frameworkOptions[1].label}, ${frameworkOptions[1].style}; no ${frameworkOptions[2].label}, ${frameworkOptions[2].style}.`,
      ],
      keyIdea: "Os frameworks maduros entregam as mesmas peças; escolha pelo estilo de descrever o agente e pelo ecossistema.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "features",
            piece: "matrix",
            rows: features.map((feature) => feature.label),
            cols: options.map((option) => option.label),
            values: matrixValues,
            scale: { min: 0, max: 1 },
            highlight: { row: features.findIndex((feature) => feature.id === "human"), col: 0 },
            showValues: true,
            color: "module-12",
          },
        ],
      },
      alt: `Matriz de peças por opção. Linhas: ${features.map((feature) => feature.label).join(", ")}. Colunas: ${options.map((option) => option.label).join(", ")}. A API direta tem 0 em todas, você escreve tudo; os três frameworks têm 1 em todas.`,
    },
    {
      id: "layers",
      shortTitle: "Camadas",
      title: "Cada camada esconde a de baixo",
      tag: "mechanism",
      body: [
        "Numa casa pré-fabricada, a parede esconde o cano. Isso é ótimo até o cano vazar: aí você precisa saber onde ele passa.",
        "Um framework fica entre o seu app e a API do modelo, às vezes em cima de outro: o create_agent do LangChain roda sobre o LangGraph. Cada camada monta prompts e chamadas que você não escreveu. A Anthropic recomenda começar pelas APIs do modelo direto, porque muitos padrões cabem em poucas linhas, e, se usar um framework, entender o código que ele roda: abstrações escondem o prompt e a resposta e dificultam a depuração.",
      ],
      keyIdea: "Quanto mais camadas, menos código seu e menos visibilidade do prompt que chega ao modelo.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "layers",
            piece: "graph",
            nodes: [
              { id: "app", label: "seu app", x: 0.08, y: 0.5 },
              { id: "langchain", label: "LangChain create_agent", x: 0.32, y: 0.2 },
              { id: "langgraph", label: "LangGraph", x: 0.58, y: 0.2, color: "module-12" },
              { id: "sdk", label: "Claude Agent SDK", x: 0.45, y: 0.8 },
              { id: "client", label: "SDK cliente", x: 0.75, y: 0.5 },
              { id: "api", label: "API do modelo", x: 0.94, y: 0.5 },
            ],
            edges: [
              { from: "app", to: "langchain" },
              { from: "langchain", to: "langgraph", label: "roda sobre" },
              { from: "langgraph", to: "client" },
              { from: "app", to: "sdk" },
              { from: "sdk", to: "api" },
              { from: "app", to: "client", label: "sem framework" },
              { from: "client", to: "api" },
            ],
            path: ["app", "langchain", "langgraph", "client", "api"],
          },
        ],
      },
      alt: "Grafo de camadas: o app pode chamar o SDK cliente direto, usar o Claude Agent SDK, ou passar pelo create_agent do LangChain, que roda sobre o LangGraph. O caminho em destaque atravessa LangChain, LangGraph e o SDK cliente até a API do modelo.",
    },
    {
      id: "handoff",
      shortTitle: "Handoff",
      title: "Por baixo, tudo vira ferramenta",
      tag: "example",
      body: [
        "Abra a parede do kit e você encontra o mesmo cano de qualquer casa. Abra um framework e você encontra o mesmo mecanismo do módulo 05: ferramentas descritas para o modelo.",
        `No OpenAI Agents SDK, um [[handoff|handoff]] para o agente “${HANDOFF_TARGET}” aparece para o modelo como uma ferramenta chamada ${handoffTool}. Quando o modelo de triagem chama essa ferramenta, o SDK troca o agente ativo. Saber disso ajuda a depurar: se o handoff não acontece, o problema costuma estar na descrição da ferramenta de handoff, como em qualquer escolha de ferramenta.`,
      ],
      keyIdea: "Handoffs, subagentes e aprovações costumam ser ferramentas e prompts gerados pelo framework.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "handoff",
            piece: "block-diagram",
            blocks: [
              { id: "user", kind: "user", label: "cliente", col: 0, row: 0.5 },
              { id: "triage", kind: "agent", label: "triagem", col: 1, row: 0.5 },
              { id: "tool", kind: "tool", label: "transfer_to_…", col: 2, row: 0.5 },
              { id: "refund", kind: "agent", label: "reembolso", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "user", to: "triage", label: "quero devolver" },
              { from: "triage", to: "tool", label: "tool call" },
              { from: "tool", to: "refund", label: "troca o agente" },
            ],
            active: "tool",
            done: ["user", "triage"],
          },
        ],
      },
      alt: `O cliente pede uma devolução ao agente de triagem, que chama a ferramenta ${handoffTool}, em destaque; o SDK então passa a conversa ao agente de reembolso.`,
    },
    {
      id: "decide",
      shortTitle: "Escolher",
      title: "Quando trazer um framework",
      tag: "tradeoff",
      body: [
        "Para uma casinha de ferramentas no quintal, tijolo resolve. Para um prédio com elevador, você quer peças prontas e testadas.",
        "Um agente com um loop e três ferramentas cabe em poucas dezenas de linhas com a API. O framework passa a valer quando aparecem as peças difíceis: retomar depois de uma falha, pausar horas por uma aprovação, coordenar vários agentes, acompanhar cada passo. O ecossistema também muda rápido: o AutoGen, framework multiagente da Microsoft, foi arquivado, e a documentação dele indica o Microsoft Agent Framework para projetos novos.",
      ],
      keyIdea: "Comece simples; traga o framework quando precisar de persistência, pausa humana ou vários agentes.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "decide",
            piece: "pipeline",
            display: "chips",
            stages: decisionChips,
          },
        ],
      },
      alt: `Fluxo de decisão em chips: ${decisionChips.map((chip) => chip.label).join(", ")}.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "O kit e o que fica com você",
      tag: "summary",
      body: [
        "Frameworks de agentes entregam o loop, a execução de ferramentas, o estado salvo, a pausa humana e a coordenação de agentes. Eles se diferenciam no jeito de descrever o agente: grafo, loop pronto configurável, ou papéis e tarefas.",
        "Ferramentas, prompts, limites e avaliação continuam com você em qualquer escolha. A próxima aula abre o mais explícito deles: LangChain e LangGraph, com grafos de estado e checkpoints.",
      ],
      keyIdea: "Framework = encanamento pronto; as decisões do agente continuam sendo suas.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "kit",
            piece: "block-diagram",
            blocks: [
              { id: "code", kind: "laptop", label: "seu código", col: 0, row: 0.5 },
              { id: "framework", kind: "agent", label: "framework", col: 1, row: 0.5 },
              { id: "llm", kind: "llm", label: "api do modelo", col: 2, row: 0 },
              { id: "tool", kind: "tool", label: "ferramentas", col: 2, row: 1 },
              { id: "state", kind: "memory", label: "estado salvo", col: 3, row: 0 },
              { id: "eval", kind: "eval", label: "seus testes", col: 3, row: 1 },
            ],
            edges: [
              { from: "code", to: "framework", label: "tools + prompt" },
              { from: "framework", to: "llm", label: "loop" },
              { from: "framework", to: "tool", label: "executa" },
              { from: "llm", to: "state" },
              { from: "tool", to: "eval", label: "avalia" },
            ],
            active: "code",
            done: ["framework", "llm", "tool", "state"],
          },
        ],
      },
      alt: "Seu código, em destaque, entrega ferramentas e prompt ao framework, que cuida do loop, das ferramentas e do estado; os testes que avaliam o agente continuam sendo seus.",
    },
  ],
  realWorldExample:
    "O Claude Agent SDK expõe como biblioteca, em Python e TypeScript, o mesmo loop, as ferramentas embutidas, os hooks, os subagentes, as permissões e as sessões do Claude Code. O LangChain, por sua vez, oferece create_agent, um agente pronto que roda sobre o LangGraph e herda dele a execução durável e a pausa humana.",
  code: {
    language: "python",
    source: `from langchain.agents import create_agent

def buscar_pedido(numero: str) -> str:
    """Busca o status de um pedido pelo número."""
    return f"Pedido {numero}: enviado"

agent = create_agent(
    model="anthropic:claude-opus-5-5",
    tools=[buscar_pedido],
    system_prompt="Você atende clientes de uma loja.",
)
agent.invoke({"messages": [{"role": "user", "content": "Cadê o pedido 4821?"}]})`,
    caption: "Um agente com create_agent do LangChain: você escreve a ferramenta e o prompt; o loop roda no LangGraph por baixo.",
  },
  tradeOffs: {
    pros: [
      "Persistência, pausa humana e vários agentes prontos e testados",
      "Integrações com muitos modelos e ferramentas",
      "Menos código de infraestrutura para manter",
    ],
    cons: [
      "Camadas que escondem o prompt e as chamadas, e dificultam depurar",
      "APIs que mudam rápido e projetos que são arquivados",
      "Dependência do modelo mental e das versões do framework",
    ],
    alternatives: [
      "API direta com um loop próprio, para agentes pequenos",
      "Um runtime gerenciado pelo provedor do modelo, quando você não quer operar o loop",
    ],
  },
  knowledgeCheck: [
    {
      id: "when-framework",
      prompt: "Um agente responde dúvidas com duas ferramentas de leitura e termina em segundos. Outro aprova compras que esperam até um dia por um gerente. Qual precisa mais de um framework com persistência?",
      options: [
        "O primeiro, porque é mais simples",
        "O segundo, porque precisa pausar, salvar o estado e retomar depois",
        "Nenhum: frameworks só servem para vários agentes",
        "Os dois igualmente",
      ],
      correct: 1,
      explanation: "Pausar horas e retomar exige estado salvo e retomada, que o framework entrega pronto. Um loop curto de leitura cabe com a API direta.",
      lesson: "12-16",
    },
    {
      id: "handoff-debug",
      prompt: "No OpenAI Agents SDK, o agente de triagem nunca passa a conversa ao agente de reembolso. Onde olhar primeiro?",
      options: [
        "Na temperatura do modelo",
        "Na descrição da ferramenta de handoff, que o modelo lê para decidir chamá-la",
        "No banco de dados de pedidos",
        "No número de tokens da resposta",
      ],
      correct: 1,
      explanation: "O handoff é exposto ao modelo como uma ferramenta transfer_to_<agente>. Se ele não é chamado, o problema é o mesmo de qualquer escolha de ferramenta: descrição e instruções.",
      lesson: "12-16",
    },
  ],
  related: ["12-15", "12-17", "13-01"],
  references: [
    { title: "Anthropic: Building effective agents", url: "https://www.anthropic.com/engineering/building-effective-agents", kind: "article" },
    { title: "Claude Agent SDK: overview", url: "https://code.claude.com/docs/en/agent-sdk/overview", kind: "docs" },
    { title: "OpenAI Agents SDK: Handoffs", url: "https://openai.github.io/openai-agents-python/handoffs/", kind: "docs" },
  ],
};

export default lesson;
