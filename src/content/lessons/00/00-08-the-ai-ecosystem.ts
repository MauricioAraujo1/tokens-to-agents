import type { LessonContent } from "../../../types/content";

// O ecossistema em camadas, do chip ao app. A conta de hardware é feita aqui: memória para guardar os
// pesos = parâmetros × bits por peso ÷ 8. A memória da H100 (80 GB) vem da página oficial da NVIDIA.

const BYTES_PER_GB = 1e9;
const weightsGb = (parametersBillions: number, bits: number) => (parametersBillions * 1e9 * bits) / 8 / BYTES_PER_GB;

const SMALL = 7;
const LARGE = 70;
const H100_MEMORY_GB = 80;
const small16 = weightsGb(SMALL, 16);
const small4 = weightsGb(SMALL, 4);
const large16 = weightsGb(LARGE, 16);
const gpusForLarge16 = Math.ceil(large16 / H100_MEMORY_GB);

const gb = (value: number) => `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} GB`;

const lesson: LessonContent = {
  id: "00-08",
  subtitle: "Quem faz os chips, quem treina os modelos, quem fornece as ferramentas e onde o seu app entra nessa cadeia.",
  objectives: [
    "Organizar o ecossistema de IA em camadas, do hardware ao app",
    "Calcular quanta memória de GPU um modelo precisa para guardar os pesos",
    "Diferenciar modelos fechados, acessados por API, de modelos com pesos abertos",
    "Situar frameworks, servidores de inferência e agentes no mapa",
  ],
  steps: [
    {
      id: "stack",
      shortTitle: "Camadas",
      title: "Uma cadeia, do chip ao app",
      tag: "context",
      body: [
        "Pense no pão da padaria: alguém planta o trigo, um moinho faz a farinha, a padaria assa e o café serve o sanduíche. A IA tem a mesma cadeia. Na base, os chips. Em cima, a nuvem que aluga esses chips. Depois, os laboratórios que treinam os modelos, as ferramentas para usá-los e, no topo, os apps.",
        "Cada camada depende da de baixo e tem os seus próprios fornecedores. Saber em que camada você está diz com quem você compete, de quem você depende e o que você precisa aprender.",
      ],
      keyIdea: "O ecossistema de IA é uma pilha: hardware, nuvem, modelos, ferramentas e aplicações.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "chips", kind: "memory", label: "chips", col: 0, row: 0.5 },
              { id: "cloud", kind: "cloud", label: "nuvem", col: 1, row: 0.5 },
              { id: "models", kind: "llm", label: "modelos", col: 2, row: 0.5 },
              { id: "tools", kind: "tool", label: "ferramentas", col: 3, row: 0 },
              { id: "apps", kind: "app", label: "apps", col: 3, row: 1 },
            ],
            edges: [
              { from: "chips", to: "cloud" },
              { from: "cloud", to: "models" },
              { from: "models", to: "tools" },
              { from: "models", to: "apps" },
            ],
            active: "models",
          },
        ],
      },
      alt: "Cadeia em blocos: chips alimentam a nuvem, a nuvem roda os modelos, em destaque, e os modelos servem as ferramentas e os apps.",
    },
    {
      id: "hardware",
      shortTitle: "Hardware",
      title: "A base: memória de GPU",
      tag: "mechanism",
      body: [
        `Modelos rodam em [[GPU|gpu]], e o primeiro limite é a memória. Cada [[parâmetro|parameter]] em 16 bits ocupa 2 bytes. Um modelo de ${SMALL} bilhões de parâmetros precisa de ${gb(small16)} só para os pesos; com 4 bits por peso, cabe em ${gb(small4)}, o bastante para um notebook com uma boa placa de vídeo.`,
        `Um modelo de ${LARGE} bilhões em 16 bits ocupa ${gb(large16)}. Uma GPU de data center como a NVIDIA H100 tem ${gb(H100_MEMORY_GB)}, então são pelo menos ${gpusForLarge16} só para os pesos, sem contar o [[KV cache|kv-cache]]. É por isso que os chips são o gargalo, e o motivo de a nuvem existir nessa cadeia.`,
      ],
      keyIdea: "Memória para os pesos = parâmetros × bits por peso ÷ 8. Essa conta decide onde um modelo pode rodar.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "memory",
            piece: "metrics-panel",
            metrics: [
              { id: "small16", label: `${SMALL}B em 16 bits`, value: gb(small16) },
              { id: "small4", label: `${SMALL}B em 4 bits`, value: gb(small4), color: "success" },
              { id: "large16", label: `${LARGE}B em 16 bits`, value: gb(large16), color: "danger" },
              { id: "gpus", label: `H100 de ${gb(H100_MEMORY_GB)}`, value: `${gpusForLarge16} GPUs` },
            ],
            highlight: "large16",
          },
        ],
      },
      alt: `Painel de memória: ${SMALL}B em 16 bits ocupa ${gb(small16)}, em 4 bits ${gb(small4)}; ${LARGE}B em 16 bits ocupa ${gb(large16)} e precisa de ${gpusForLarge16} GPUs H100.`,
    },
    {
      id: "models",
      shortTitle: "Modelos",
      title: "Modelos fechados e abertos",
      tag: "mechanism",
      body: [
        "Na camada dos modelos há dois jeitos de distribuir. Os fechados, como GPT (OpenAI), Claude (Anthropic) e Gemini (Google), só são acessados por API: você manda o texto e paga por token, sem nunca ver os pesos.",
        "Os modelos de [[pesos abertos|open-weights]], como Llama (Meta), Mistral e Qwen (Alibaba), podem ser baixados, em geral pelo [[Hugging Face|hugging-face]] Hub, e rodados na sua máquina ou na sua nuvem. Você ganha controle e privacidade, e passa a cuidar da infraestrutura.",
      ],
      keyIdea: "Fechado: você aluga o modelo por API. Aberto: você baixa os pesos e roda onde quiser.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "labs",
            piece: "graph",
            nodes: [
              { id: "closed", label: "API fechada", x: 0.2, y: 0.1, color: "info" },
              { id: "gpt", label: "GPT · OpenAI", x: 0.05, y: 0.55 },
              { id: "claude", label: "Claude · Anthropic", x: 0.2, y: 0.95 },
              { id: "gemini", label: "Gemini · Google", x: 0.4, y: 0.55 },
              { id: "hub", label: "Hugging Face Hub", x: 0.8, y: 0.1, color: "module-00" },
              { id: "llama", label: "Llama · Meta", x: 0.6, y: 0.55 },
              { id: "mistral", label: "Mistral", x: 0.8, y: 0.95 },
              { id: "qwen", label: "Qwen · Alibaba", x: 0.95, y: 0.55 },
            ],
            edges: [
              { from: "closed", to: "gpt" },
              { from: "closed", to: "claude" },
              { from: "closed", to: "gemini" },
              { from: "hub", to: "llama", label: "pesos" },
              { from: "hub", to: "mistral", label: "pesos" },
              { from: "hub", to: "qwen", label: "pesos" },
            ],
            highlight: ["hub"],
          },
        ],
      },
      alt: "Dois grupos: GPT, Claude e Gemini ligados à API fechada; Llama, Mistral e Qwen ligados ao Hugging Face Hub, em destaque, de onde os pesos são baixados.",
    },
    {
      id: "tools",
      shortTitle: "Ferramentas",
      title: "Ferramentas entre o código e o modelo",
      tag: "mechanism",
      body: [
        "Entre o seu código e o modelo há uma camada de ferramentas. Os SDKs dos provedores chamam as APIs fechadas. Servidores de inferência como vLLM e Ollama rodam modelos abertos. Frameworks como LangChain e LlamaIndex ligam o modelo a buscas, bancos vetoriais e ferramentas.",
        "Há também padrões de encaixe: o Model Context Protocol (MCP), publicado pela Anthropic em 2024, define como um app expõe ferramentas e dados para qualquer modelo. Trocar de modelo fica mais fácil quando o código fala com essas camadas, e não direto com um fornecedor.",
      ],
      keyIdea: "As ferramentas são o encanamento: deixam trocar de modelo e plugar dados sem reescrever o app.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "code", kind: "laptop", label: "seu código", col: 0, row: 0.5 },
              { id: "framework", kind: "tool", label: "SDK ou framework", col: 1, row: 0.5 },
              { id: "api", kind: "cloud", label: "API fechada", col: 2, row: 0 },
              { id: "local", kind: "server", label: "vLLM ou Ollama", col: 2, row: 1 },
              { id: "weights", kind: "llm", label: "modelo aberto", col: 3, row: 1 },
            ],
            edges: [
              { from: "code", to: "framework" },
              { from: "framework", to: "api", label: "HTTP" },
              { from: "framework", to: "local", label: "local", variant: "alternative" },
              { from: "local", to: "weights" },
            ],
            active: "framework",
          },
        ],
      },
      alt: "Seu código fala com um SDK ou framework, em destaque, que chama uma API fechada ou, pelo caminho alternativo, um servidor local como vLLM ou Ollama rodando um modelo aberto.",
    },
    {
      id: "agents",
      shortTitle: "Agentes",
      title: "No topo: apps e agentes",
      tag: "example",
      body: [
        "Na camada dos apps estão os chats, os assistentes de código e, cada vez mais, os [[agentes|agent]]. Um agente recebe um objetivo, como “descubra por que o pedido 123 atrasou”, e decide sozinho os passos: pensa, chama uma ferramenta, observa o resultado e repete.",
        "Na cena, o agente está na segunda volta do loop, consultando o pedido. Um limite de voltas evita que ele fique preso. Agentes juntam tudo o que está abaixo deles na pilha: o modelo para decidir, as ferramentas para agir e a infraestrutura para rodar.",
      ],
      keyIdea: "Um agente é um modelo num loop: pensar, agir com uma ferramenta, observar, até cumprir o objetivo.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "loop",
            piece: "agent-loop",
            phases: [
              { id: "think", label: "pensar" },
              { id: "act", label: "agir" },
              { id: "observe", label: "observar" },
            ],
            active: "act",
            iteration: 2,
            maxIterations: 5,
            tool: 'buscar_pedido("123")',
          },
        ],
      },
      alt: "Loop de agente com pensar, agir e observar; na iteração 2 de 5, o agente age chamando a ferramenta buscar_pedido para o pedido 123.",
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Onde você entra",
      tag: "summary",
      body: [
        "Chips e nuvem dão a computação. Laboratórios transformam computação e dados em modelos, fechados ou abertos. Ferramentas ligam os modelos ao código. Apps e agentes entregam valor às pessoas. Quem faz AI engineering vive nas duas camadas de cima e precisa entender as de baixo para escolher bem.",
        "Isso fecha o mapa do módulo 00. No módulo 01, você abre a caixa do machine learning e vê, com contas, como um modelo aprende a partir dos dados.",
      ],
      keyIdea: "Você escolhe uma camada para construir, mas paga as contas de todas as de baixo.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "chips", kind: "memory", label: "chips", col: 0, row: 0.5 },
              { id: "cloud", kind: "cloud", label: "nuvem", col: 1, row: 0.5 },
              { id: "models", kind: "llm", label: "modelos", col: 2, row: 0.5 },
              { id: "tools", kind: "tool", label: "ferramentas", col: 3, row: 0 },
              { id: "apps", kind: "agent", label: "apps e agentes", col: 3, row: 1 },
            ],
            edges: [
              { from: "chips", to: "cloud" },
              { from: "cloud", to: "models" },
              { from: "models", to: "tools" },
              { from: "tools", to: "apps" },
            ],
            active: "apps",
            done: ["chips", "cloud", "models", "tools"],
          },
        ],
      },
      alt: "A pilha completa: chips, nuvem, modelos e ferramentas concluídos, e no topo apps e agentes em destaque.",
    },
  ],
  realWorldExample:
    "Em julho de 2023, a Meta publicou o Llama 2 com pesos para download e uma licença que permite uso comercial, com restrições. Empresas passaram a rodar e ajustar um modelo competitivo na própria infraestrutura, algo impossível com modelos acessíveis só por API.",
  code: {
    language: "python",
    source: `def weights_gb(parameters_billions: float, bits: int) -> float:
    return parameters_billions * 1e9 * bits / 8 / 1e9

for name, parameters in [("7B", 7), ("70B", 70)]:
    for bits in (16, 8, 4):
        print(name, f"{bits} bits:", weights_gb(parameters, bits), "GB")`,
    caption: "A conta da memória dos pesos para modelos de 7 e 70 bilhões de parâmetros. KV cache e ativações ocupam memória extra.",
  },
  tradeOffs: {
    pros: [
      "API fechada: os modelos mais fortes, sem cuidar de GPU",
      "Pesos abertos: controle, privacidade e custo previsível em alto volume",
      "Ferramentas e protocolos comuns deixam trocar de fornecedor com menos reescrita",
    ],
    cons: [
      "API fechada: dependência de preço, limites e mudanças de um fornecedor",
      "Pesos abertos: você opera GPU, escala e atualização",
      "O ecossistema muda rápido: frameworks e modelos de hoje podem ser trocados em meses",
    ],
    alternatives: ["Provedores que hospedam modelos abertos por API: pesos abertos sem operar GPU"],
  },
  knowledgeCheck: [
    {
      id: "fits-gpu",
      prompt: "Você quer rodar um modelo de 13 bilhões de parâmetros numa GPU de 24 GB. Os pesos em 16 bits cabem?",
      options: [
        "Sim, sobra muito espaço",
        "Não: 13 bilhões × 2 bytes = 26 GB; em 8 bits (13 GB) ou 4 bits (6,5 GB) caberia",
        "Sim, porque o modelo é pequeno",
        "Não dá para saber sem rodar",
      ],
      correct: 1,
      explanation: "Em 16 bits, cada parâmetro ocupa 2 bytes: 26 GB, mais que os 24 GB. Quantizar para 8 ou 4 bits reduz a memória na mesma proporção.",
      lesson: "00-08",
    },
    {
      id: "private-data",
      prompt: "Um hospital não pode enviar dados de pacientes para fora da própria rede. Que camada do ecossistema resolve isso?",
      options: [
        "Uma API fechada de um provedor externo",
        "Um modelo de pesos abertos rodando num servidor de inferência dentro da rede do hospital",
        "Um framework de agentes",
        "Nenhuma: IA não pode ser usada com dados sensíveis",
      ],
      correct: 1,
      explanation: "Com pesos abertos, o modelo roda na infraestrutura do hospital, e os dados não saem dela.",
      lesson: "00-08",
    },
  ],
  related: ["00-07", "03-15", "04-08"],
  references: [
    { title: "Hugging Face Hub: documentação", url: "https://huggingface.co/docs/hub/index", kind: "docs" },
    { title: "NVIDIA H100 Tensor Core GPU", url: "https://www.nvidia.com/en-us/data-center/h100/", kind: "docs" },
    { title: "Model Context Protocol", url: "https://modelcontextprotocol.io/", kind: "docs" },
  ],
};

export default lesson;
