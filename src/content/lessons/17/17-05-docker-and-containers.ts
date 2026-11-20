import type { BlockDiagramSpec } from "../../../scene/types";
import type { LessonContent } from "../../../types/content";

// Containers com as contas no arquivo. Os tamanhos das camadas são DE EXEMPLO, na ordem de grandeza de uma
// imagem com CUDA, PyTorch e um motor de inferência. O cache de build do Docker reaproveita uma camada só se
// ela e todas as anteriores não mudaram: com o código copiado antes das dependências, cada mudança de código
// reconstrói e reenvia as dependências. Velocidades de envio e de download são hipóteses rotuladas.

const fixed = (value: number, digits = 1) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");

// Passo 2: camadas da imagem, em GB.
const layers = [
  { id: "base", label: "base cuda + python", sizeGB: 4 },
  { id: "system", label: "pacotes do sistema", sizeGB: 0.3 },
  { id: "deps", label: "dependências python", sizeGB: 6 },
  { id: "code", label: "código do app", sizeGB: 0.02 },
];
const imageGB = layers.reduce((sum, layer) => sum + layer.sizeGB, 0);
const sizeOf = (id: string) => layers.find((layer) => layer.id === id)?.sizeGB ?? 0;

// Passo 4: o que é reconstruído e enviado a cada mudança de código.
const badOrderGB = sizeOf("deps") + sizeOf("code");
const goodOrderGB = sizeOf("code");
const DEPLOYS_PER_MONTH = 40;
const UPLOAD_GBPS = 0.1;
const badMonthGB = badOrderGB * DEPLOYS_PER_MONTH;
const goodMonthGB = goodOrderGB * DEPLOYS_PER_MONTH;
const badPushS = badOrderGB / UPLOAD_GBPS;
const goodPushS = goodOrderGB / UPLOAD_GBPS;
const ratio = badOrderGB / goodOrderGB;

// Passo 5: subir num nó novo. Pesos de um 8B em bf16; velocidades de exemplo.
const WEIGHTS_GB = 16;
const PULL_GBPS = 0.5;
const LOCAL_DISK_GBPS = 2;
const pullImageS = imageGB / PULL_GBPS;
const pullWithWeightsS = (imageGB + WEIGHTS_GB) / PULL_GBPS;
const weightsFromLocalS = WEIGHTS_GB / LOCAL_DISK_GBPS;
const pullTimes = [
  { label: "imagem sem pesos", value: Math.round(pullImageS) },
  { label: "imagem com pesos", value: Math.round(pullWithWeightsS) },
  { label: "sem pesos + disco local", value: Math.round(pullImageS + weightsFromLocalS) },
  { label: "imagem em cache + disco", value: Math.round(weightsFromLocalS) },
];

const shipping = (active: string, done?: string[]): BlockDiagramSpec => ({
  id: "shipping",
  piece: "block-diagram",
  blocks: [
    { id: "laptop", kind: "laptop", label: "dockerfile", col: 0, row: 0.5 },
    { id: "build", kind: "tool", label: "docker build", col: 1, row: 0.5 },
    { id: "registry", kind: "cloud", label: "registry", col: 2, row: 0.5 },
    { id: "node-a", kind: "server", label: "nó gpu 1", col: 3, row: 0 },
    { id: "node-b", kind: "server", label: "nó gpu 2", col: 3, row: 1 },
  ],
  edges: [
    { from: "laptop", to: "build" },
    { from: "build", to: "registry", label: "push" },
    { from: "registry", to: "node-a", label: "pull" },
    { from: "registry", to: "node-b", label: "pull" },
  ],
  active,
  ...(done ? { done } : {}),
});

const lesson: LessonContent = {
  id: "17-05",
  subtitle: "Empacotar o motor, as bibliotecas e o código numa imagem que roda igual em qualquer máquina com GPU, e montar essa imagem para builds e deploys rápidos.",
  objectives: [
    "Explicar o que são imagem, container, Dockerfile e registry",
    "Ordenar as camadas de um Dockerfile para aproveitar o cache de build",
    "Descrever como um container enxerga a GPU do host",
    "Decidir onde ficam os pesos do modelo: na imagem ou fora dela",
  ],
  steps: [
    {
      id: "box",
      shortTitle: "A caixa",
      title: "O contêiner de navio do software",
      tag: "context",
      body: [
        "Antes dos contêineres de navio, cada carga era embarcada de um jeito: sacos, caixas, barris. Com uma caixa de tamanho padrão, o mesmo guindaste carrega qualquer coisa em qualquer porto. Um [[container|container]] faz isso com software: o motor de inferência, as bibliotecas de CUDA e o seu código viajam juntos, e rodam igual no notebook, no CI e no nó de GPU.",
        "A receita é o [[Dockerfile|dockerfile]]. O docker build segue a receita e produz uma [[imagem de container|container-image]], que é enviada (push) a um [[registry|container-registry]]. Cada máquina baixa (pull) a mesma imagem, identificada por uma tag e por um digest, e roda containers a partir dela. O “na minha máquina funciona” some, porque a máquina vai junto.",
      ],
      keyIdea: "Uma imagem empacota tudo o que o serviço precisa; o registry a distribui igual para todas as máquinas.",
      scene: { kind: "pieces", layout: "single", pieces: [shipping("registry")] },
      alt: "Do Dockerfile no notebook, o docker build gera a imagem e faz push para o registry, em destaque, de onde dois nós de GPU fazem pull.",
    },
    {
      id: "layers",
      shortTitle: "Camadas",
      title: "Uma imagem é uma pilha de camadas",
      tag: "mechanism",
      body: [
        `Cada instrução do Dockerfile que muda arquivos gera uma [[camada|image-layer]]. Na imagem de exemplo: a base com CUDA e Python (${fixed(sizeOf("base"))} GB), pacotes do sistema (${fixed(sizeOf("system"))} GB), as dependências Python com PyTorch e o motor (${fixed(sizeOf("deps"))} GB) e o seu código (${fixed(sizeOf("code"), 2)} GB). Total: ${fixed(imageGB, 2)} GB.`,
        "O cache de build reaproveita uma camada se a instrução e os arquivos dela não mudaram, e se nenhuma camada de baixo mudou. Mudou uma camada, tudo o que vem depois é refeito. Por isso a ordem importa: o que muda pouco (base, sistema, dependências) vai embaixo, e o que muda a cada commit (o código) vai por último.",
      ],
      keyIdea: "Uma camada mudada invalida todas as de cima: coloque o que muda mais por último.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "layer-sizes",
            piece: "chart",
            kind: "bar",
            series: layers.map((layer) => ({ label: layer.label, value: layer.sizeGB })),
            highlight: 2,
            color: "module-17",
          },
        ],
      },
      alt: `Tamanho de cada camada da imagem de exemplo, em GB: ${layers.map((layer) => `${layer.label} ${fixed(layer.sizeGB, 2)}`).join(", ")}. As dependências, em destaque, são a maior camada.`,
    },
    {
      id: "gpu",
      shortTitle: "GPU",
      title: "Como o container chega na GPU",
      tag: "mechanism",
      body: [
        "Um container não é uma máquina virtual: ele divide o kernel do host, só com a visão de arquivos, processos e rede isolada. A GPU continua sendo do host, e o driver da NVIDIA também. A imagem leva as bibliotecas de [[CUDA|cuda]] do lado do usuário; o driver do host precisa ser novo o suficiente para a versão de CUDA da imagem.",
        "Quem liga as duas pontas é o [[NVIDIA Container Toolkit|nvidia-container-toolkit]]: com docker run --gpus all, ele monta os dispositivos e as bibliotecas do driver dentro do container. No Kubernetes, o mesmo papel é do device plugin da NVIDIA, que anuncia as GPUs de cada nó para o escalonador.",
      ],
      keyIdea: "A imagem leva o CUDA; o host leva o driver; o toolkit da NVIDIA conecta os dois.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "gpu-path",
            piece: "block-diagram",
            blocks: [
              { id: "container", kind: "app", label: "container: vllm", col: 0, row: 0.5 },
              { id: "toolkit", kind: "tool", label: "container toolkit", col: 1, row: 0.5 },
              { id: "driver", kind: "server", label: "driver no host", col: 2, row: 0.5 },
              { id: "gpu", kind: "memory", label: "gpu", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "container", to: "toolkit", label: "--gpus all" },
              { from: "toolkit", to: "driver" },
              { from: "driver", to: "gpu" },
            ],
            active: "toolkit",
          },
        ],
      },
      alt: "O container com o vLLM pede a GPU com --gpus all; o NVIDIA Container Toolkit, em destaque, liga o container ao driver do host, que controla a GPU.",
    },
    {
      id: "cache",
      shortTitle: "Cache",
      title: "A ordem certa poupa gigabytes por deploy",
      tag: "example",
      body: [
        `Com COPY . . antes do pip install, cada commit muda a camada do código, e as dependências que vêm depois são refeitas: ${fixed(badOrderGB, 2)} GB reconstruídos e enviados por deploy, ${integer(badPushS)} s de push a ${fixed(UPLOAD_GBPS)} GB/s (velocidade de exemplo). Com COPY requirements.txt, RUN pip install e só então COPY . ., o commit muda só a última camada: ${fixed(goodOrderGB, 2)} GB e ${fixed(goodPushS)} s.`,
        `Em ${DEPLOYS_PER_MONTH} deploys por mês, são ${integer(badMonthGB)} GB contra ${fixed(goodMonthGB, 1)} GB, ${integer(ratio)} vezes menos bytes no build, no registry e na rede dos nós. Além da ordem: um .dockerignore que deixa de fora dados e checkpoints, builds em múltiplos estágios que não levam compiladores para a imagem final e tags imutáveis, para o nó rodar exatamente a imagem testada.`,
      ],
      keyIdea: "Dependências antes do código: o commit do dia reenvia megabytes, não gigabytes.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "cache-metrics",
            piece: "metrics-panel",
            metrics: [
              { id: "bad", label: "código antes das deps", value: `${fixed(badOrderGB, 2)} GB/deploy`, color: "danger" },
              { id: "good", label: "deps antes do código", value: `${fixed(goodOrderGB, 2)} GB/deploy`, color: "success" },
              { id: "month", label: `${DEPLOYS_PER_MONTH} deploys`, value: `${integer(badMonthGB)} → ${fixed(goodMonthGB)} GB` },
              { id: "saving", label: "menos bytes", value: `${integer(ratio)}×`, color: "module-17" },
            ],
            highlight: "saving",
          },
        ],
      },
      alt: `Com o código copiado antes das dependências, cada deploy reenvia ${fixed(badOrderGB, 2)} GB; na ordem certa, ${fixed(goodOrderGB, 2)} GB. Em ${DEPLOYS_PER_MONTH} deploys, ${integer(badMonthGB)} GB contra ${fixed(goodMonthGB)} GB, ${integer(ratio)} vezes menos.`,
    },
    {
      id: "weights",
      shortTitle: "Pesos",
      title: "Pesos dentro ou fora da imagem",
      tag: "tradeoff",
      body: [
        `Colocar os ${WEIGHTS_GB} GB de pesos de um 8B dentro da imagem deixa tudo versionado junto, mas cada nó novo baixa ${fixed(imageGB + WEIGHTS_GB, 1)} GB: ${integer(pullWithWeightsS)} s a ${fixed(PULL_GBPS)} GB/s (velocidade de exemplo). Sem os pesos, a imagem sai em ${integer(pullImageS)} s, e os pesos vêm de um disco local ou de um cache do nó a ${LOCAL_DISK_GBPS} GB/s, em ${integer(weightsFromLocalS)} s.`,
        `Num nó que já tem a imagem em cache, o [[cold start|cold-start]] vira só a leitura dos pesos. O custo de tirar os pesos da imagem é versionar duas coisas: a tag da imagem e a revisão exata do modelo, que precisam viajar juntas na configuração do deploy.`,
      ],
      keyIdea: "Pesos fora da imagem deixam pull e cold start rápidos, mas pedem versionar imagem e modelo juntos.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "pull",
            piece: "chart",
            kind: "bar",
            series: pullTimes,
            highlight: 3,
            color: "module-17",
          },
        ],
      },
      alt: `Tempo para preparar um nó, em segundos, com velocidades de exemplo: ${pullTimes.map((item) => `${item.label} ${item.value}`).join(", ")}.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Uma imagem, muitas máquinas",
      tag: "summary",
      body: [
        "O Dockerfile descreve a imagem em camadas, da mais estável para a mais volátil. O registry guarda versões imutáveis, e cada nó de GPU roda a mesma imagem com o toolkit da NVIDIA ligando o container ao driver. Pesos grandes ficam fora da imagem, com a revisão fixada ao lado da tag.",
        "Uma imagem num nó é um container. Dezenas de réplicas em vários nós, que sobem, caem e são trocadas sem parar o serviço, pedem um orquestrador: a próxima aula leva o model serving para o Kubernetes.",
      ],
      keyIdea: "Container = ambiente reproduzível; camadas bem ordenadas = builds e deploys rápidos.",
      scene: { kind: "pieces", layout: "single", pieces: [shipping("node-b", ["laptop", "build", "registry", "node-a"])] },
      alt: "O caminho completo: Dockerfile, build, registry e o primeiro nó já percorridos, e o segundo nó de GPU em destaque recebendo a mesma imagem.",
    },
  ],
  realWorldExample:
    "O vLLM publica a imagem oficial vllm/vllm-openai no Docker Hub, com o servidor compatível com a API da OpenAI pronto. A documentação do projeto mostra o docker run com --gpus all, o cache do Hugging Face montado como volume (os pesos ficam fora da imagem) e --ipc=host para a memória compartilhada que o PyTorch usa.",
  code: {
    language: "bash",
    source: `docker run --gpus all \\
  -v ~/.cache/huggingface:/root/.cache/huggingface \\
  --env "HUGGING_FACE_HUB_TOKEN=$HF_TOKEN" \\
  -p 8000:8000 \\
  --ipc=host \\
  vllm/vllm-openai:latest \\
  --model meta-llama/Llama-3.1-8B-Instruct`,
    caption: "A imagem oficial do vLLM com acesso à GPU e os pesos num volume do host. Em produção, troque latest por uma tag fixa.",
  },
  tradeOffs: {
    pros: [
      "O mesmo ambiente no notebook, no CI e em produção",
      "Cache de camadas deixa builds e pushes do dia a dia pequenos",
      "Imagens imutáveis permitem voltar a uma versão anterior em segundos",
    ],
    cons: [
      "Imagens com CUDA e PyTorch passam fácil de 10 GB",
      "Driver do host e CUDA da imagem precisam ser compatíveis",
      "Pesos fora da imagem pedem versionar modelo e imagem juntos",
    ],
    alternatives: [
      "Ambientes gerenciados (conda, venv) direto na máquina, para um servidor só",
      "Endpoints gerenciados de nuvem, que recebem só os pesos e cuidam da imagem",
    ],
  },
  knowledgeCheck: [
    {
      id: "layer-order",
      prompt: "Todo build reinstala 6 GB de dependências, mesmo quando só uma linha de código muda. Qual é a causa mais provável no Dockerfile?",
      options: [
        "A imagem base é grande demais",
        "O código é copiado antes do pip install, e a camada do código invalida as de cima",
        "Falta o --gpus all",
        "O registry está lento",
      ],
      correct: 1,
      explanation: "O cache reaproveita uma camada só se nada abaixo dela mudou. Copiando o código antes das dependências, todo commit invalida a instalação. Copie o requirements.txt, instale e copie o código por último.",
      lesson: "17-05",
    },
    {
      id: "driver",
      prompt: "Uma imagem com uma versão nova de CUDA falha ao achar a GPU num nó antigo, embora o docker run use --gpus all. O que verificar primeiro?",
      options: [
        "Se a imagem tem o driver da NVIDIA instalado",
        "Se o driver do host é novo o suficiente para a versão de CUDA da imagem",
        "Se a porta 8000 está aberta",
        "Se a imagem tem menos de 10 GB",
      ],
      correct: 1,
      explanation: "O driver é do host, não da imagem. A imagem leva as bibliotecas de CUDA, que exigem um driver mínimo; um host com driver antigo não roda a versão nova.",
      lesson: "17-05",
    },
  ],
  related: ["17-04", "17-06", "17-14"],
  references: [
    { title: "Docker: Build cache", url: "https://docs.docker.com/build/cache/", kind: "docs" },
    {
      title: "NVIDIA Container Toolkit: documentação",
      url: "https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/index.html",
      kind: "docs",
    },
    { title: "Open Container Initiative", url: "https://opencontainers.org/", kind: "docs" },
  ],
};

export default lesson;
