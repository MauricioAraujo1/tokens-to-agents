import type { BlockDiagramSpec } from "../../../scene/types";
import type { LessonContent } from "../../../types/content";

// Deploy de um modelo ajustado, com as contas no arquivo. A fusão W' = W + (α / r) · B · A é feita numa matriz de 2 × 2
// com um adaptador de posto 1, e a saída da fusão é comparada com a da base mais o adaptador. A memória compara cópias
// fundidas do Llama 2 7B em bf16 (configuração publicada) com uma base e vários adaptadores LoRA de r = 16 nas 7
// lineares, também em bf16. As porcentagens do rollout são um plano de exemplo, não uma estatística.

const fixed = (value: number, digits = 2) =>
  (value + 0).toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits }).replace("-", "−");
const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");

// Fusão.
const W = [
  [0.5, -0.2],
  [0.1, 0.4],
];
const B = [0.2, 0.1];
const A = [0.3, -0.6];
const RANK = 1;
const ALPHA = 2;
const scaling = ALPHA / RANK;
const delta = B.map((b) => A.map((a) => scaling * b * a));
const merged = W.map((row, i) => row.map((value, j) => value + delta[i][j]));
const x = [1, 2];
const apply = (matrix: number[][], vector: number[]) => matrix.map((row) => row.reduce((sum, value, j) => sum + value * vector[j], 0));
const baseOut = apply(W, x);
const adapterOut = apply(delta, x);
const separate = baseOut.map((value, i) => value + adapterOut[i]);
const fused = apply(merged, x);
const sameOutput = separate.every((value, i) => Math.abs(value - fused[i]) < 1e-12);
const vector = (values: number[]) => `(${values.map((value) => fixed(value)).join("; ")})`;

// Memória.
const D = 4096;
const FFN = 11008;
const LAYERS = 32;
const VOCAB = 32_000;
const totalParams = LAYERS * (4 * D * D + 3 * D * FFN + 2 * D) + D + 2 * VOCAB * D;
const loraParams = LAYERS * (4 * 16 * (D + D) + 3 * 16 * (D + FFN));
const BYTES_BF16 = 2;
const baseGb = (totalParams * BYTES_BF16) / 1e9;
const adapterGb = (loraParams * BYTES_BF16) / 1e9;
const mergedCopies = (n: number) => n * baseGb;
const multiLora = (n: number) => baseGb + n * adapterGb;
const TENANTS = 10;
const MANY = 100;

const flow = (active: string, done?: string[]): BlockDiagramSpec => ({
  id: "flow",
  piece: "block-diagram",
  blocks: [
    { id: "data", kind: "documents", label: "dados", col: 0, row: 0 },
    { id: "train", kind: "llm", label: "ajuste", col: 1, row: 0 },
    { id: "eval", kind: "eval", label: "avaliação", col: 2, row: 0 },
    { id: "serve", kind: "server", label: "deploy", col: 3, row: 0 },
    { id: "users", kind: "user", label: "usuários", col: 3, row: 1 },
    { id: "feedback", kind: "queue", label: "feedback", col: 1, row: 1 },
  ],
  edges: [
    { from: "data", to: "train" },
    { from: "train", to: "eval" },
    { from: "eval", to: "serve", label: "aprovado" },
    { from: "serve", to: "users" },
    { from: "users", to: "feedback", label: "sinais" },
    { from: "feedback", to: "data", label: "novos exemplos", variant: "alternative" },
  ],
  active,
  ...(done ? { done } : {}),
});

const lesson: LessonContent = {
  id: "11-14",
  subtitle: "Levar o modelo ajustado para produção: fundir ou não o adaptador, servir muitos adaptadores sobre uma base, liberar aos poucos e voltar atrás com segurança.",
  objectives: [
    "Fundir um adaptador LoRA nos pesos e verificar que a saída não muda",
    "Comparar cópias fundidas com uma base servindo vários adaptadores",
    "Planejar um rollout com canário e rollback",
    "Fechar o ciclo com feedback de produção",
  ],
  steps: [
    {
      id: "kitchen",
      shortTitle: "Cozinha",
      title: "Uma cozinha, vários temperos",
      tag: "context",
      body: [
        "Um restaurante com dez pratos não monta dez cozinhas. A mesma cozinha, com o mesmo fogão e as mesmas panelas, troca só o tempero de cada prato. Montar uma cozinha por prato funciona, mas custa dez vezes mais espaço.",
        "No deploy de um ajuste com LoRA, a escolha é parecida. Você pode [[fundir o adaptador|adapter-merging]] nos pesos e servir um modelo novo, completo, como se fosse a cozinha dedicada. Ou servir a base uma vez e aplicar o adaptador certo em cada requisição, como o tempero do prato. Em qualquer dos casos, o adaptador publicado é o do melhor [[checkpoint|checkpoint]], com a versão da base anotada.",
      ],
      keyIdea: "Fundir dá um modelo dedicado; servir adaptadores dá uma base compartilhada.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "deploy",
            piece: "block-diagram",
            blocks: [
              { id: "adapter", kind: "documents", label: "adaptador", col: 0, row: 0 },
              { id: "base", kind: "llm", label: "base", col: 0, row: 1 },
              { id: "merge", kind: "app", label: "fundir?", col: 1, row: 0.5 },
              { id: "server", kind: "server", label: "servidor", col: 2, row: 0.5 },
              { id: "users", kind: "user", label: "usuários", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "adapter", to: "merge" },
              { from: "base", to: "merge" },
              { from: "merge", to: "server", label: "modelo ou base + lora" },
              { from: "server", to: "users" },
            ],
            active: "merge",
          },
        ],
      },
      alt: "O adaptador e a base chegam à decisão de fundir ou não, em destaque, que entrega ao servidor um modelo fundido ou a base com o LoRA; o servidor atende os usuários.",
    },
    {
      id: "merge",
      shortTitle: "Fundir",
      title: "W' = W + (α / r) · B · A",
      tag: "mechanism",
      body: [
        `Fundir é fazer a soma uma vez, antes de servir. Na cena, W é uma matriz de 2 × 2, o adaptador tem posto ${RANK}, e α / r = ${fixed(scaling, 0)}. A soma gera W'. Para a entrada x = (1; 2), a base com o adaptador ao lado dá W · x + ΔW · x = ${vector(baseOut)} + ${vector(adapterOut)} = ${vector(separate)}, e o modelo fundido dá W' · x = ${vector(fused)}: ${sameOutput ? "o mesmo resultado" : "um resultado diferente"}.`,
        "Depois de fundido, o modelo tem a arquitetura e a velocidade da base, sem nenhuma conta extra, e roda em qualquer servidor que já rode a base; no PEFT, é o merge_and_unload. O cuidado é com o QLoRA: o adaptador foi treinado sobre a base em 4 bits, e somá-lo à base em 16 bits, ou quantizar de novo depois da soma, muda um pouco as saídas. Avalie o modelo fundido, não só o adaptador.",
      ],
      keyIdea: "A fusão é exata em aritmética exata: o modelo fundido responde igual, sem custo extra.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "outputs",
            piece: "metrics-panel",
            metrics: [
              { id: "separate", label: "W·x + ΔW·x", value: vector(separate) },
              { id: "fused", label: "W'·x", value: vector(fused), color: "module-11" },
              { id: "scale", label: "α / r", value: fixed(scaling, 0) },
            ],
            highlight: "fused",
          },
          {
            id: "matrices",
            piece: "matrix",
            rows: ["linha 1", "linha 2"],
            cols: ["W", "W", "ΔW", "ΔW", "W'", "W'"],
            values: W.map((row, i) => [...row, ...delta[i], ...merged[i]].map((value) => Number(value.toFixed(2)))),
            scale: { min: -0.5, max: 0.7 },
            highlight: { row: 0, col: 5 },
            showValues: true,
            color: "module-11",
          },
        ],
      },
      alt: `As matrizes W, ΔW = (α / r) · B · A e W' = W + ΔW lado a lado. Para x = (1; 2), a base com o adaptador dá ${vector(separate)}, e o modelo fundido, ${vector(fused)}.`,
    },
    {
      id: "multi-lora",
      shortTitle: "Multi-LoRA",
      title: "Uma base, um adaptador por requisição",
      tag: "mechanism",
      body: [
        "Sem fundir, o servidor carrega a base uma vez e mantém vários adaptadores na memória. Cada requisição diz qual adaptador quer, e o servidor calcula W · x para o lote inteiro e soma o B · A · x de cada requisição com o adaptador dela. Requisições de clientes diferentes entram no mesmo lote.",
        "O [[vLLM|vllm]] faz isso com a opção de LoRA ligada, e o S-LoRA mostrou como servir milhares de adaptadores numa GPU, guardando os que não estão em uso na memória da CPU. O preço é uma conta extra pequena por camada e um limite de posto e de adaptadores ativos ao mesmo tempo, configurado no servidor.",
      ],
      keyIdea: "Multi-LoRA compartilha a base entre clientes e aplica o adaptador de cada requisição no mesmo lote.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "serving",
            piece: "client-server",
            nodes: [
              { id: "support", label: "app suporte", role: "client" },
              { id: "legal", label: "app jurídico", role: "client" },
              { id: "queue", label: "fila", role: "queue", size: 6 },
              { id: "server", label: "base + adaptadores", role: "model", utilization: 0.7 },
            ],
            messages: [
              { from: "support", to: "queue", label: "lora=suporte" },
              { from: "legal", to: "queue", label: "lora=jurídico" },
              { from: "queue", to: "server", label: "lote misto" },
            ],
            active: 2,
          },
        ],
      },
      alt: "Dois apps, suporte e jurídico, mandam requisições com o nome do adaptador para uma fila; a fila manda um lote misto, em trânsito, para o servidor com a base e os adaptadores.",
    },
    {
      id: "memory",
      shortTitle: "Memória",
      title: `${TENANTS} clientes: ${TENANTS} modelos ou uma base`,
      tag: "example",
      body: [
        `Cada cópia fundida do Llama 2 7B ocupa ${fixed(baseGb, 1)} GB em bf16. Para ${TENANTS} clientes, cada um com o seu ajuste, são ${fixed(mergedCopies(TENANTS), 1)} GB de pesos, várias GPUs. Com uma base e ${TENANTS} adaptadores de r = 16 nas 7 lineares, ${integer(adapterGb * 1e3)} MB cada, são ${fixed(multiLora(TENANTS), 1)} GB: cabe numa GPU.`,
        `Com ${MANY} clientes, a diferença vira ${integer(mergedCopies(MANY))} GB contra ${fixed(multiLora(MANY), 1)} GB. A regra prática: um ajuste com tráfego alto e latência apertada vale a pena fundir; muitos ajustes com tráfego médio ou baixo cabem melhor como adaptadores sobre uma base.`,
      ],
      keyIdea: "Cópias fundidas multiplicam a base; adaptadores somam megabytes.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "memory-chart",
            piece: "chart",
            kind: "bar",
            series: [
              { label: "1 fundido", value: Number(mergedCopies(1).toFixed(1)) },
              { label: `${TENANTS} fundidos`, value: Number(mergedCopies(TENANTS).toFixed(1)) },
              { label: `base + ${TENANTS}`, value: Number(multiLora(TENANTS).toFixed(1)) },
              { label: `base + ${MANY}`, value: Number(multiLora(MANY).toFixed(1)) },
            ],
            highlight: 2,
            color: "module-11",
          },
        ],
      },
      alt: `Memória de pesos em GB: 1 modelo fundido ${fixed(mergedCopies(1), 1)}, ${TENANTS} fundidos ${fixed(mergedCopies(TENANTS), 1)}, base com ${TENANTS} adaptadores ${fixed(multiLora(TENANTS), 1)}, em destaque, e base com ${MANY} adaptadores ${fixed(multiLora(MANY), 1)}.`,
    },
    {
      id: "rollout",
      shortTitle: "Rollout",
      title: "Liberar aos poucos, voltar rápido",
      tag: "tradeoff",
      body: [
        "Passar na avaliação offline não garante nada com tráfego real. O rollout seguro registra o adaptador com a versão da base, os dados e as notas da avaliação; libera para uma fatia pequena do tráfego, o canário; compara métricas de produção com a versão anterior; e só então amplia.",
        "Voltar atrás precisa ser barato: com adaptadores, é trocar o nome do adaptador na requisição; com modelos fundidos, é manter a versão anterior carregada até o fim do rollout. O que vier de produção, como respostas com nota baixa e casos que falharam, revisado e com consentimento, vira exemplo para o próximo ajuste.",
      ],
      keyIdea: "Registro, canário, comparação e rollback barato antes de 100% do tráfego.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "release",
            piece: "pipeline",
            stages: [
              { id: "registry", label: "registro" },
              { id: "offline", label: "eval offline" },
              { id: "canary", label: "canário 5%", color: "module-11" },
              { id: "half", label: "50%" },
              { id: "full", label: "100%" },
            ],
            active: "canary",
            done: ["registry", "offline"],
            branch: { id: "rollback", label: "rollback", from: "canary", edgeLabel: "piorou", color: "danger" },
          },
        ],
      },
      alt: "Pipeline de liberação: registro e avaliação offline concluídos, canário com 5% do tráfego em destaque, depois 50% e 100%; um ramo tracejado faz rollback se as métricas piorarem.",
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "O ciclo do módulo inteiro",
      tag: "summary",
      body: [
        "Funda o adaptador quando um modelo dedicado e rápido compensa; sirva vários adaptadores sobre uma base quando há muitos ajustes. Registre cada versão, libere com canário, tenha rollback barato e transforme o feedback de produção em dados. O ciclo do módulo fecha aqui: dados, ajuste, avaliação, deploy e de volta aos dados.",
        "O próximo módulo usa modelos, ajustados ou não, como o cérebro de agentes: sistemas que planejam, chamam ferramentas e trabalham em equipe.",
      ],
      keyIdea: "Dados → ajuste → avaliação → deploy → feedback → dados.",
      scene: { kind: "pieces", layout: "single", pieces: [flow("serve", ["data", "train", "eval"])] },
      alt: "O ciclo do módulo: dados, ajuste e avaliação concluídos, deploy em destaque, usuários gerando sinais de feedback que voltam, tracejados, como novos exemplos para os dados.",
    },
  ],
  realWorldExample:
    "O vLLM serve vários adaptadores LoRA sobre uma mesma base: com --enable-lora e --lora-modules, cada adaptador ganha um nome, e o cliente escolhe o adaptador no campo model da API compatível com a OpenAI. O S-LoRA (Sheng et al., 2023) levou a ideia a milhares de adaptadores numa GPU.",
  code: {
    language: "bash",
    source: `vllm serve meta-llama/Llama-2-7b-hf \\
  --enable-lora \\
  --lora-modules suporte=./adapters/suporte juridico=./adapters/juridico \\
  --max-lora-rank 16

curl http://localhost:8000/v1/completions \\
  -H "Content-Type: application/json" \\
  -d '{"model": "suporte", "prompt": "Cadê meu pedido?", "max_tokens": 64}'`,
    caption: "Uma base e dois adaptadores no vLLM; a requisição escolhe o adaptador pelo nome no campo model.",
  },
  tradeOffs: {
    pros: [
      "Fundir dá velocidade de base e roda em qualquer servidor",
      "Multi-LoRA serve muitos ajustes com a memória de uma base",
      "Rollback com adaptadores é trocar um nome na requisição",
    ],
    cons: [
      "Cópias fundidas multiplicam memória e armazenamento",
      "Multi-LoRA soma uma conta extra por camada e limita posto e adaptadores ativos",
      "Adaptadores de QLoRA mudam um pouco ao serem fundidos em 16 bits",
    ],
    alternatives: ["API de fine-tuning de um provedor, que cuida do serviço", "Servir só a base com prompt, quando o ajuste não compensa"],
  },
  knowledgeCheck: [
    {
      id: "merge-or-not",
      prompt: "Uma empresa tem 40 clientes, cada um com um adaptador LoRA próprio sobre a mesma base, e tráfego médio por cliente. Como servir?",
      options: [
        "Fundir os 40 adaptadores e servir 40 modelos completos",
        "Servir a base uma vez com os 40 adaptadores, escolhendo o adaptador por requisição",
        "Somar os 40 adaptadores na mesma base",
        "Treinar um modelo do zero por cliente",
      ],
      correct: 1,
      explanation: "Multi-LoRA compartilha a base e soma só megabytes por cliente. Fundir os 40 multiplicaria a memória por 40; somar todos na mesma base misturaria os comportamentos.",
      lesson: "11-14",
    },
    {
      id: "qlora-merge",
      prompt: "Um adaptador treinado com QLoRA foi fundido na base em 16 bits, e as respostas mudaram um pouco. O que explica?",
      options: [
        "A fusão tem um erro de implementação",
        "O adaptador aprendeu a corrigir a base em 4 bits; somado à base em 16 bits, encontra pesos um pouco diferentes",
        "O vLLM não suporta modelos fundidos",
        "A temperatura mudou",
      ],
      correct: 1,
      explanation: "No QLoRA, o adaptador foi treinado sobre os pesos quantizados. A base em 16 bits é um pouco diferente, então o modelo fundido precisa ser avaliado de novo.",
      lesson: "11-14",
    },
  ],
  related: ["10-13", "11-08", "11-13"],
  references: [
    { title: "vLLM documentation", url: "https://docs.vllm.ai/en/latest/", kind: "docs" },
    { title: "Sheng et al. (2023), S-LoRA: Serving Thousands of Concurrent LoRA Adapters", url: "https://arxiv.org/abs/2311.03285", kind: "paper" },
    { title: "Hugging Face PEFT", url: "https://huggingface.co/docs/peft/index", kind: "docs" },
  ],
};

export default lesson;
