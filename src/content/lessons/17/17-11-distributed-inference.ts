import type { BlockDiagramSpec } from "../../../scene/types";
import type { LessonContent } from "../../../types/content";

// Inferência distribuída do lado da topologia, com as contas no arquivo. O que acontece dentro do motor com
// tensor parallelism está nas aulas 10-16 e 17-04; aqui, a pergunta é onde cada pedaço roda. Pesos do
// Llama 3.1 405B = 405 bilhões × bytes por parâmetro (a Meta publicou versões em bf16 e em fp8). Nós de
// 8 GPUs de 80 GB. A disponibilidade de um nó é DE EXEMPLO. Com N regiões e tolerância à perda de uma,
// cada região precisa aguentar pico ÷ (N − 1), e o total provisionado é N ÷ (N − 1) vezes o pico.

const fixed = (value: number, digits = 1) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");
const percent = (value: number) => `${Math.round(value * 100)}%`;
const GB = 1e9;

// Passo 2: o modelo cabe num nó?
const PARAMS = 405e9;
const GPUS_PER_NODE = 8;
const GPU_GB = 80;
const nodeGB = GPUS_PER_NODE * GPU_GB;
const bf16GB = (PARAMS * 2) / GB;
const fp8GB = (PARAMS * 1) / GB;
const nodesBf16 = Math.ceil(bf16GB / nodeGB);
const fp8FreeGB = nodeGB - fp8GB;

// Passo 3: uma réplica de dois nós cai se qualquer um cair.
const NODE_AVAILABILITY = 0.995;
const replicaAvailability = (nodes: number) => NODE_AVAILABILITY ** nodes;
const HOURS_PER_MONTH = 730;
const downHours = (availability: number) => (1 - availability) * HOURS_PER_MONTH;

// Passo 4: regiões e capacidade de reserva.
const PEAK_REPLICAS = 24;
const regionCounts = [2, 3, 4, 6];
const perRegion = (regions: number) => Math.ceil(PEAK_REPLICAS / (regions - 1));
const totalReplicas = (regions: number) => perRegion(regions) * regions;
const overprovision = regionCounts.map((regions) => ({
  label: `${regions} regiões`,
  value: Math.round((totalReplicas(regions) / PEAK_REPLICAS - 1) * 100),
}));
const THREE = 3;

const replicaDiagram = (active: string, done?: string[]): BlockDiagramSpec => ({
  id: "topology",
  piece: "block-diagram",
  blocks: [
    { id: "lb", kind: "server", label: "balanceador", col: 0, row: 0.5 },
    { id: "node-a", kind: "memory", label: "nó 1: tp 8", col: 1, row: 0 },
    { id: "node-b", kind: "memory", label: "nó 2: tp 8", col: 2, row: 0 },
    { id: "replica-2", kind: "llm", label: "réplica 2 (fp8)", col: 1, row: 1 },
    { id: "replica-3", kind: "llm", label: "réplica 3 (fp8)", col: 2, row: 1 },
  ],
  edges: [
    { from: "lb", to: "node-a", label: "réplica 1" },
    { from: "node-a", to: "node-b", label: "pp: infiniband" },
    { from: "lb", to: "replica-2" },
    { from: "replica-2", to: "replica-3", label: "dados: réplicas" },
  ],
  active,
  ...(done ? { done } : {}),
});

const lesson: LessonContent = {
  id: "17-11",
  subtitle: "Onde cada pedaço do modelo roda: dentro do nó, entre nós, em muitas réplicas e em várias regiões, e quanta capacidade de reserva cada desenho exige.",
  objectives: [
    "Separar os três eixos da distribuição: dividir o modelo, replicar e espalhar por regiões",
    "Decidir entre dividir um modelo em dois nós ou quantizar para caber em um",
    "Calcular a disponibilidade de uma réplica que depende de vários nós",
    "Dimensionar a reserva de capacidade para perder uma região inteira",
  ],
  steps: [
    {
      id: "axes",
      shortTitle: "Três eixos",
      title: "Naipes, orquestras e turnês",
      tag: "context",
      body: [
        "Uma sinfonia grande demais para um músico é dividida em naipes que tocam juntos: é dividir o modelo. Para tocar em mais teatros na mesma noite, você monta várias orquestras iguais: é replicar. Para tocar em vários países, cada orquestra fica perto do público: são as regiões. A inferência distribuída mistura os três eixos.",
        "Dentro de uma réplica, o [[tensor parallelism|tensor-parallelism]] divide cada camada entre as GPUs do nó, pelo NVLink, e o [[pipeline parallelism|pipeline-parallelism]] divide grupos de camadas entre nós, pela rede. Fora dela, réplicas independentes atrás de um balanceador, a mesma ideia do [[data parallelism|data-parallelism]] no treino. E acima de tudo, o [[multi-região|multi-region]]: cópias do serviço em lugares diferentes.",
      ],
      keyIdea: "Distribuir inferência tem três eixos: dividir uma réplica, multiplicar réplicas e espalhar por regiões.",
      scene: { kind: "pieces", layout: "single", pieces: [replicaDiagram("lb")] },
      alt: "Um balanceador, em destaque, manda pedidos para a réplica 1, dividida entre dois nós com tensor parallelism de 8 em cada um e pipeline parallelism pela InfiniBand, e para réplicas 2 e 3 em fp8, cada uma num nó só.",
    },
    {
      id: "fit",
      shortTitle: "Cabe?",
      title: "Dois nós ou um modelo menor",
      tag: "mechanism",
      body: [
        `Um modelo de 405 bilhões de parâmetros, como o Llama 3.1 405B, ocupa ${integer(bf16GB)} GB em bf16. Um nó de ${GPUS_PER_NODE} GPUs de ${GPU_GB} GB tem ${integer(nodeGB)} GB: não cabe. A saída clássica é ${nodesBf16} nós, com tensor parallelism de ${GPUS_PER_NODE} dentro de cada nó e pipeline parallelism de ${nodesBf16} entre eles, a regra que o vLLM recomenda para servir em vários nós.`,
        `A outra saída é a precisão: em fp8, os pesos ocupam ${integer(fp8GB)} GB e cabem num nó só, com ${integer(fp8FreeGB)} GB para KV cache e ativações. A Meta publicou essa versão justamente para isso. Antes de montar réplicas de dois nós, vale medir se a versão quantizada mantém a qualidade no seu [[eval|eval]]: um nó por réplica é bem mais simples de operar.`,
      ],
      keyIdea: "Se o modelo não cabe num nó, compare dividir em dois nós com quantizar para caber em um.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "fit",
            piece: "metrics-panel",
            metrics: [
              { id: "bf16", label: "405B em bf16", value: `${integer(bf16GB)} GB`, color: "danger" },
              { id: "node", label: `um nó (${GPUS_PER_NODE} × ${GPU_GB} GB)`, value: `${integer(nodeGB)} GB` },
              { id: "fp8", label: "405B em fp8", value: `${integer(fp8GB)} GB`, color: "success" },
              { id: "free", label: "sobra em fp8", value: `${integer(fp8FreeGB)} GB`, color: "module-17" },
            ],
            highlight: "fp8",
          },
        ],
      },
      alt: `O modelo de 405B ocupa ${integer(bf16GB)} GB em bf16, mais que os ${integer(nodeGB)} GB de um nó; em fp8, ocupa ${integer(fp8GB)} GB e sobram ${integer(fp8FreeGB)} GB no nó.`,
    },
    {
      id: "blast",
      shortTitle: "Dois nós",
      title: "Uma réplica de dois nós cai com qualquer um deles",
      tag: "mechanism",
      body: [
        `Uma réplica dividida em dois nós só funciona com os dois de pé. Se cada nó fica disponível ${fixed(NODE_AVAILABILITY * 100)}% do tempo (número de exemplo), a réplica fica ${fixed(replicaAvailability(2) * 100, 2)}%: o dobro de horas fora, ${fixed(downHours(replicaAvailability(2)))} contra ${fixed(downHours(replicaAvailability(1)))} por mês. E na hora de escalar, os dois nós precisam nascer juntos e na mesma rede rápida, o que o escalonador precisa tratar como um grupo.`,
        "Na prática, ferramentas como o Ray (que o vLLM usa para servir em vários nós) ou o LeaderWorkerSet do Kubernetes sobem os nós de uma réplica como uma unidade e recriam a unidade inteira quando um nó falha. O custo continua: réplicas maiores são menos réplicas para o mesmo número de GPUs, e cada falha tira uma fatia maior da capacidade.",
      ],
      keyIdea: "Uma réplica multinó soma os riscos de todos os nós: é maior, cai mais e escala em blocos.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "two-nodes",
            piece: "block-diagram",
            blocks: [
              { id: "lb", kind: "server", label: "balanceador", col: 0, row: 0.5 },
              { id: "node-a", kind: "memory", label: "nó 1: camadas 1-63", col: 1.5, row: 0 },
              { id: "node-b", kind: "no-result", label: "nó 2 caiu", col: 3, row: 0 },
              { id: "replica-2", kind: "llm", label: "réplica 2", col: 1.5, row: 1 },
            ],
            edges: [
              { from: "lb", to: "node-a" },
              { from: "node-a", to: "node-b", label: "camadas 64-126", variant: "alternative" },
              { from: "lb", to: "replica-2", label: "assume o tráfego" },
            ],
            active: "node-b",
          },
        ],
      },
      alt: "Uma réplica dividida em dois nós: o nó 1 tem a primeira metade das camadas e o nó 2, que caiu, a segunda; a réplica inteira para, e a réplica 2 assume o tráfego.",
    },
    {
      id: "regions",
      shortTitle: "Regiões",
      title: "Quanto sobra para perder uma região",
      tag: "example",
      body: [
        `O pico pede ${PEAK_REPLICAS} réplicas. Com [[redundância N+1|n-plus-one-redundancy]] no nível de região, o serviço precisa aguentar o pico mesmo sem a maior delas. Com 2 regiões, cada uma precisa de ${perRegion(2)} réplicas: o dobro do pico. Com ${THREE}, cada uma precisa de ${perRegion(THREE)}, ${totalReplicas(THREE)} no total, ${percent(totalReplicas(THREE) / PEAK_REPLICAS - 1)} acima do pico.`,
        `A reserva cai com mais regiões: ${overprovision.map((point) => `${point.label}, ${point.value}%`).join("; ")}. Mas cada região a mais pede cota de GPU, um deploy a mais e dados replicados. Muitos times ficam em 3 regiões e cobrem o resto do pico com uma API externa como [[fallback|fallback]] em vez de pagar GPU parada.`,
      ],
      keyIdea: "Com N regiões, cada uma aguenta pico ÷ (N − 1): a reserva cai de 100% com 2 regiões para 50% com 3.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "overprovision",
            piece: "chart",
            kind: "bar",
            series: overprovision,
            highlight: regionCounts.indexOf(THREE),
            color: "module-17",
          },
        ],
      },
      alt: `Capacidade acima do pico necessária para perder uma região: ${overprovision.map((point) => `${point.label} ${point.value}%`).join(", ")}.`,
    },
    {
      id: "routing",
      shortTitle: "Roteamento",
      title: "Mandar cada usuário para a região certa",
      tag: "tradeoff",
      body: [
        "Um roteamento global (DNS por latência, anycast ou um balanceador global da nuvem) manda cada usuário para a região mais próxima e saudável. Quando uma região cai, o [[failover|failover]] move o tráfego dela para as outras, que precisam ter a reserva calculada antes. Para LLMs, a distância pesa menos que em APIs comuns, porque a geração dura segundos, mas ainda soma no tempo até o primeiro token.",
        "A restrição mais dura costuma ser legal: dados de clientes europeus podem precisar ficar na Europa. Aí o failover não pode atravessar o oceano, e cada jurisdição precisa da própria reserva. A topologia nasce das regras de [[residência de dados|data-residency]] antes de nascer da latência.",
      ],
      keyIdea: "Failover entre regiões só funciona com reserva já paga e dentro das regras de residência dos dados.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "regions-graph",
            piece: "graph",
            nodes: [
              { id: "users-sa", label: "usuários br", x: 0.08, y: 0.25 },
              { id: "users-eu", label: "usuários eu", x: 0.08, y: 0.8 },
              { id: "global", label: "roteamento global", x: 0.38, y: 0.5, color: "module-17" },
              { id: "sa", label: "sa-east (caiu)", x: 0.72, y: 0.12, color: "danger" },
              { id: "us", label: "us-east", x: 0.82, y: 0.45 },
              { id: "eu", label: "eu-west", x: 0.72, y: 0.85 },
            ],
            edges: [
              { from: "users-sa", to: "global" },
              { from: "users-eu", to: "global" },
              { from: "global", to: "sa", label: "fora" },
              { from: "global", to: "us", label: "failover", weight: 0.9 },
              { from: "global", to: "eu", label: "só eu", weight: 0.6 },
            ],
            path: ["users-sa", "global", "us"],
            highlight: ["sa"],
          },
        ],
      },
      alt: "Usuários do Brasil e da Europa chegam a um roteamento global; com a região sa-east fora do ar, o caminho dos usuários do Brasil vai para us-east, e os usuários europeus continuam em eu-west.",
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Do nó ao planeta",
      tag: "summary",
      body: [
        "Divida o modelo só quando ele não cabe: tensor parallelism dentro do nó, pipeline entre nós, e compare sempre com uma versão quantizada num nó só. Réplicas multinó escalam e caem em blocos. Entre regiões, a reserva para perder uma delas é pico ÷ (N − 1) por região, e o failover respeita a residência dos dados.",
        "Com tantas peças espalhadas, alguém precisa ver o que está acontecendo em cada uma. A próxima aula trata de logs e monitoração: o que registrar, quais métricas olhar e quando acordar alguém.",
      ],
      keyIdea: "Topologia de inferência = o menor bloco que cabe + réplicas suficientes + reserva por região.",
      scene: { kind: "pieces", layout: "single", pieces: [replicaDiagram("replica-3", ["lb", "node-a", "node-b", "replica-2"])] },
      alt: "A topologia completa: o balanceador, a réplica de dois nós e a réplica 2 já vistas, e a réplica 3 em fp8 num nó só, em destaque.",
    },
  ],
  realWorldExample:
    "A documentação do vLLM orienta servir modelos maiores que um nó com tensor parallelism igual ao número de GPUs por nó e pipeline parallelism igual ao número de nós, usando o Ray para juntar as máquinas. A Meta publicou o Llama 3.1 405B também em fp8 para que ele coubesse num único servidor de 8 GPUs.",
  tradeOffs: {
    pros: [
      "Dividir o modelo permite servir o que não cabe numa máquina",
      "Réplicas independentes somam capacidade e isolam falhas",
      "Várias regiões aproximam o serviço dos usuários e sobrevivem à perda de uma",
    ],
    cons: [
      "Réplicas multinó caem com qualquer nó e escalam em blocos grandes",
      "Reserva para perder uma região é GPU paga e parada no dia normal",
      "Residência de dados limita para onde o failover pode ir",
    ],
    alternatives: [
      "Quantizar para caber num nó por réplica",
      "Cobrir o pico e o failover com uma API externa em vez de reserva própria",
    ],
  },
  knowledgeCheck: [
    {
      id: "regions-math",
      prompt: "O pico pede 30 réplicas e o serviço precisa aguentar a perda de uma região inteira. Quantas réplicas, no total, com 4 regiões iguais?",
      options: ["30", "40", "60", "120"],
      correct: 1,
      explanation: "Cada região aguenta 30 ÷ (4 − 1) = 10 réplicas, então são 4 × 10 = 40 no total, 33% acima do pico.",
      lesson: "17-11",
    },
    {
      id: "quantize-or-split",
      prompt: "Um modelo não cabe num nó de 8 GPUs em bf16, mas cabe em fp8. A qualidade em fp8 ficou igual no eval do time. O que a aula sugere?",
      options: [
        "Dividir em dois nós, que é sempre mais rápido",
        "Servir em fp8 num nó por réplica: menos rede, menos pontos de falha e escala em blocos menores",
        "Usar tensor parallelism de 16 entre os nós",
        "Servir em fp32",
      ],
      correct: 1,
      explanation: "Com a qualidade mantida, um nó por réplica evita a troca de dados pela rede, cai com uma máquina só e escala em passos menores.",
      lesson: "17-11",
    },
  ],
  related: ["10-16", "17-04", "17-12"],
  references: [
    { title: "Meta (2024), The Llama 3 Herd of Models", url: "https://arxiv.org/abs/2407.21783", kind: "paper" },
    { title: "Ray Serve: documentação", url: "https://docs.ray.io/en/latest/serve/index.html", kind: "docs" },
    {
      title: "AWS Well-Architected: Reliability Pillar",
      url: "https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/welcome.html",
      kind: "docs",
    },
  ],
};

export default lesson;
