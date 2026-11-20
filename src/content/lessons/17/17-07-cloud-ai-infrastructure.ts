import type { BlockDiagramSpec } from "../../../scene/types";
import type { LessonContent } from "../../../types/content";

// Infraestrutura de IA na nuvem com as contas no arquivo. A matriz de responsabilidades é uma simplificação
// da aula (1 = você cuida, 0 = o provedor cuida), e as contagens por andar saem dela. A cota da AWS para
// instâncias P sob demanda é medida em vCPUs; a p5.48xlarge tem 192 vCPUs e 8 GPUs H100 (página da AWS).
// O número de nós vem do dimensionamento da aula 17-04.

const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");

// Passo 2: quem cuida de cada parte, por andar.
const duties = ["hardware", "driver e so", "orquestração", "motor", "escala", "pesos"];
const floors = [
  { id: "vm", label: "vm com gpu", owned: [0, 1, 1, 1, 1, 1] },
  { id: "k8s", label: "kubernetes gerenciado", owned: [0, 0, 1, 1, 1, 1] },
  { id: "endpoint", label: "endpoint gerenciado", owned: [0, 0, 0, 0, 1, 1] },
  { id: "maas", label: "modelo por token", owned: [0, 0, 0, 0, 0, 0] },
];
const ownedCount = floors.map((floor) => ({ label: floor.label, value: floor.owned.reduce((sum, value) => sum + value, 0) }));

// Passo 4: cota em vCPUs para os nós de GPU.
const P5_VCPUS = 192;
const P5_GPUS = 8;
const NODES = 4;
const SURGE_NODES = 1;
const quotaVcpus = (NODES + SURGE_NODES) * P5_VCPUS;
const totalGpus = (NODES + SURGE_NODES) * P5_GPUS;
const DEFAULT_QUOTA_VCPUS = 0;

const floorsDiagram = (active: string): BlockDiagramSpec => ({
  id: "floors",
  piece: "block-diagram",
  blocks: [
    { id: "app", kind: "app", label: "seu app", col: 0, row: 0.5 },
    { id: "vm", kind: "server", label: "vm com gpu", col: 1.5, row: 0 },
    { id: "k8s", kind: "server", label: "k8s gerenciado", col: 1.5, row: 1 },
    { id: "endpoint", kind: "cloud", label: "endpoint gerenciado", col: 3, row: 0 },
    { id: "maas", kind: "cloud", label: "modelo por token", col: 3, row: 1 },
  ],
  edges: [
    { from: "app", to: "vm" },
    { from: "app", to: "k8s" },
    { from: "app", to: "endpoint" },
    { from: "app", to: "maas" },
  ],
  active,
});

const lesson: LessonContent = {
  id: "17-07",
  subtitle: "Os andares que a nuvem oferece para IA, de máquinas com GPU a modelos cobrados por token, e o que fica com você em cada um.",
  objectives: [
    "Diferenciar VM com GPU, Kubernetes gerenciado, endpoint gerenciado e modelo como serviço",
    "Ler o modelo de responsabilidade compartilhada de cada andar",
    "Planejar cota de GPU antes de precisar dela",
    "Escolher o andar pelo controle que você precisa e pela operação que aguenta",
  ],
  steps: [
    {
      id: "floors",
      shortTitle: "Andares",
      title: "Morar de aluguel, mobiliado ou num hotel",
      tag: "context",
      body: [
        "Você pode alugar um apartamento vazio e mobiliar tudo, alugar um mobiliado ou ficar num hotel, onde até a cama é feita por outra pessoa. Quanto mais pronto, menos trabalho e menos liberdade para mudar a cozinha. As [[plataformas de IA na nuvem|cloud-ai-platform]] oferecem os mesmos andares para rodar modelos.",
        "No andar de baixo, uma VM com GPU, como as instâncias P5 da AWS: você instala tudo. Depois, Kubernetes gerenciado (EKS, GKE, AKS), com o control plane cuidado pelo provedor. Acima, o [[endpoint gerenciado|managed-endpoint]] (SageMaker, Vertex AI): você entrega o modelo e recebe uma URL que escala. No topo, o modelo cobrado por token (Amazon Bedrock, Vertex AI, Azure OpenAI), que é uma [[API de modelo|model-api]] dentro da sua conta de nuvem.",
      ],
      keyIdea: "A nuvem vende o mesmo modelo em quatro andares: quanto mais alto, menos operação e menos controle.",
      scene: { kind: "pieces", layout: "single", pieces: [floorsDiagram("app")] },
      alt: "O seu app, em destaque, pode usar quatro andares da nuvem: VM com GPU, Kubernetes gerenciado, endpoint gerenciado e modelo cobrado por token.",
    },
    {
      id: "responsibility",
      shortTitle: "Quem cuida",
      title: "O que é seu em cada andar",
      tag: "mechanism",
      body: [
        "O [[modelo de responsabilidade compartilhada|shared-responsibility-model]] diz o que o provedor garante e o que fica com você. Na matriz, 1 é seu e 0 é do provedor. O hardware é sempre do provedor. Na VM, driver, sistema, orquestração, motor, escala e pesos são seus. No Kubernetes gerenciado, os nós vêm com driver, mas o resto continua com você.",
        `No endpoint gerenciado, o provedor roda o motor num container pronto e você cuida da política de escala e dos pesos. No modelo por token, nada da lista é seu. As contagens: ${ownedCount.map((floor) => `${floor.label} ${floor.value}`).join(", ")}. Segurança dos dados, chaves e permissões continuam suas em todos os andares.`,
      ],
      keyIdea: "Cada andar acima tira itens da sua lista; segurança, chaves e dados nunca saem dela.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "duties",
            piece: "matrix",
            rows: floors.map((floor) => floor.label),
            cols: duties,
            values: floors.map((floor) => floor.owned),
            scale: { min: 0, max: 1 },
            showValues: true,
            highlight: { row: 2, col: 4 },
            color: "module-17",
          },
        ],
      },
      alt: `Matriz de responsabilidades, com 1 para você e 0 para o provedor, nas colunas ${duties.join(", ")}. Itens seus por andar: ${ownedCount.map((floor) => `${floor.label} ${floor.value}`).join(", ")}.`,
    },
    {
      id: "endpoint",
      shortTitle: "Endpoint",
      title: "Endpoint gerenciado: você entrega o modelo, recebe uma URL",
      tag: "mechanism",
      body: [
        "No endpoint gerenciado, você aponta para os pesos num bucket (ou para uma imagem sua), escolhe o tipo de instância com GPU, o mínimo e o máximo de instâncias, e o provedor faz o resto: sobe as máquinas, coloca um balanceador com HTTPS e autenticação da nuvem, escala pela métrica escolhida e manda logs e métricas para o serviço de monitoração dele.",
        "É o meio-termo de quem quer pesos próprios sem operar um cluster. O preço: a hora da instância costuma ser mais cara que a mesma VM crua, os recursos do motor são os que o container gerenciado expõe e a configuração fica no formato daquele provedor.",
      ],
      keyIdea: "Endpoint gerenciado = seus pesos, a operação do provedor, cobrado por instância-hora.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "managed",
            piece: "block-diagram",
            blocks: [
              { id: "bucket", kind: "documents", label: "pesos no bucket", col: 0, row: 0 },
              { id: "endpoint", kind: "cloud", label: "endpoint", col: 1, row: 0.5 },
              { id: "inst-a", kind: "server", label: "instância gpu", col: 2, row: 0 },
              { id: "inst-b", kind: "server", label: "instância gpu", col: 2, row: 1 },
              { id: "app", kind: "app", label: "seu app", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "bucket", to: "endpoint", label: "deploy" },
              { from: "endpoint", to: "inst-a" },
              { from: "endpoint", to: "inst-b", label: "escala" },
              { from: "app", to: "endpoint", label: "https" },
            ],
            active: "endpoint",
          },
        ],
      },
      alt: "Os pesos num bucket são implantados num endpoint gerenciado, em destaque, que sobe e escala instâncias com GPU; o seu app chama o endpoint por HTTPS.",
    },
    {
      id: "quota",
      shortTitle: "Cota",
      title: "A GPU que você não pediu não existe",
      tag: "example",
      body: [
        `Nas nuvens, GPU tem [[cota|gpu-quota]] por conta, por região e por família de instância, e contas novas costumam começar com pouca ou nenhuma (${DEFAULT_QUOTA_VCPUS} no exemplo). Na AWS, a cota das instâncias P sob demanda é contada em vCPUs, não em GPUs: cada p5.48xlarge tem ${P5_VCPUS} vCPUs e ${P5_GPUS} H100.`,
        `Os ${NODES} nós da aula de GPUs, mais ${SURGE_NODES} de folga para deploys, pedem ${integer(quotaVcpus)} vCPUs de cota para ${totalGpus} GPUs. Aumentos passam por análise e podem levar dias, e mesmo com cota a região pode não ter máquinas livres naquela [[zona de disponibilidade|availability-zone]]. Peça antes do lançamento, em mais de uma região, e considere reservas de capacidade para o que não pode faltar.`,
      ],
      keyIdea: "Cota de GPU é planejamento: calcule em vCPUs ou GPUs, peça cedo e em mais de uma região.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "quota",
            piece: "metrics-panel",
            metrics: [
              { id: "nodes", label: "nós p5.48xlarge", value: `${NODES} + ${SURGE_NODES}` },
              { id: "gpus", label: "gpus h100", value: String(totalGpus) },
              { id: "vcpus", label: "cota necessária", value: `${integer(quotaVcpus)} vCPUs`, color: "module-17" },
              { id: "default", label: "cota de conta nova (exemplo)", value: String(DEFAULT_QUOTA_VCPUS), color: "danger" },
            ],
            highlight: "vcpus",
          },
        ],
      },
      alt: `Cota de GPU: ${NODES} nós mais ${SURGE_NODES} de folga, ${totalGpus} GPUs H100, ${integer(quotaVcpus)} vCPUs de cota necessária, contra ${DEFAULT_QUOTA_VCPUS} numa conta nova do exemplo.`,
    },
    {
      id: "choose",
      shortTitle: "Escolher",
      title: "Controle custa operação",
      tag: "tradeoff",
      body: [
        "Subir de andar reduz o que você opera, mas também o que você controla: no modelo por token, você não escolhe o motor, a quantização nem o hardware; na VM, escolhe tudo e responde por tudo. Andares altos também prendem mais ao provedor, porque a configuração e as APIs são dele.",
        "Muitos times começam no topo, com modelo por token, descem para endpoint gerenciado quando precisam de pesos próprios, e só chegam ao Kubernetes com GPU quando o volume e o time justificam. Dá para misturar andares: o LLM principal por token e um modelo pequeno de classificação num endpoint.",
      ],
      keyIdea: "Comece no andar mais alto que atende e desça só quando controle ou custo pedirem.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "owned",
            piece: "chart",
            kind: "bar",
            series: ownedCount,
            highlight: 2,
            color: "module-17",
          },
        ],
      },
      alt: `Itens que ficam com você em cada andar: ${ownedCount.map((floor) => `${floor.label} ${floor.value}`).join(", ")}. O endpoint gerenciado, em destaque, é o meio-termo.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Escolher o andar certo",
      tag: "summary",
      body: [
        "A nuvem vende capacidade de IA em andares: VM com GPU, Kubernetes gerenciado, endpoint gerenciado e modelo por token. Cada andar acima tira operação das suas mãos e um pouco de controle. Em todos, cota de GPU, dados, chaves e permissões são responsabilidade sua.",
        "Quem cria esses recursos clicando no console não consegue recriá-los igual depois. A próxima aula escreve a infraestrutura como código, para que cada ambiente nasça de um arquivo revisado.",
      ],
      keyIdea: "Andar mais alto = menos operação; andar mais baixo = mais controle. A cota de GPU vale para todos.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "decision",
            piece: "pipeline",
            display: "chips",
            stages: [
              { id: "maas", label: "modelo por token primeiro", color: "module-17" },
              { id: "endpoint", label: "endpoint para pesos próprios" },
              { id: "k8s", label: "kubernetes com volume e time" },
              { id: "vm", label: "vm para controle total" },
              { id: "quota", label: "cota pedida cedo", color: "module-17" },
            ],
          },
        ],
      },
      alt: "Guia em chips: modelo por token primeiro, endpoint para pesos próprios, Kubernetes com volume e time, VM para controle total e cota pedida cedo.",
    },
  ],
  realWorldExample:
    "Na AWS, os quatro andares existem lado a lado: instâncias EC2 P5 com 8 H100, o Amazon EKS para Kubernetes, endpoints do Amazon SageMaker para hospedar modelos próprios e o Amazon Bedrock, que dá acesso por API a modelos de vários provedores dentro da conta AWS. O Google Cloud tem a mesma escada com Compute Engine, GKE e Vertex AI.",
  tradeOffs: {
    pros: [
      "Andares altos levam ao ar em horas, sem operar GPU",
      "Endpoints gerenciados juntam pesos próprios com escala e logs prontos",
      "Os andares se misturam: cada modelo no andar que faz sentido",
    ],
    cons: [
      "Andares altos limitam motor, quantização e hardware",
      "Configurações e APIs de cada provedor prendem a ele",
      "Cota e disponibilidade de GPU limitam qualquer andar com instância dedicada",
    ],
    alternatives: [
      "Nuvens especializadas em GPU, com preço por hora menor e menos serviços em volta",
      "Hardware próprio em data center, para uso alto e constante por anos",
    ],
  },
  knowledgeCheck: [
    {
      id: "floor-choice",
      prompt: "Uma startup precisa de um modelo ajustado com fine-tuning em produção em duas semanas, sem ninguém para operar Kubernetes. Qual andar faz mais sentido?",
      options: [
        "VM com GPU, instalando tudo à mão",
        "Endpoint gerenciado, entregando os pesos ajustados",
        "Kubernetes gerenciado com pool de GPU",
        "Modelo por token, que aceita qualquer peso",
      ],
      correct: 1,
      explanation: "Os pesos são próprios, então o modelo por token não serve (salvo quando o provedor oferece fine-tuning hospedado). O endpoint gerenciado roda os pesos sem exigir operação de cluster.",
      lesson: "17-07",
    },
    {
      id: "quota-vcpus",
      prompt: "Você vai rodar 3 instâncias com 96 vCPUs e 8 GPUs cada, e a cota da família é contada em vCPUs. Qual cota pedir, sem folga?",
      options: ["24", "96", "288", "3"],
      correct: 2,
      explanation: "A cota é em vCPUs: 3 × 96 = 288. Pedir 24 (o número de GPUs) não liberaria nem uma instância.",
      lesson: "17-07",
    },
  ],
  related: ["17-06", "17-08", "17-03"],
  references: [
    { title: "Amazon EC2 P5", url: "https://aws.amazon.com/ec2/instance-types/p5/", kind: "docs" },
    { title: "Amazon Bedrock: documentação", url: "https://docs.aws.amazon.com/bedrock/", kind: "docs" },
    { title: "Google Cloud: Vertex AI", url: "https://cloud.google.com/vertex-ai/docs", kind: "docs" },
  ],
};

export default lesson;
