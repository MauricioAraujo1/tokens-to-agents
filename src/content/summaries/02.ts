import { catalog } from "../catalog";
import type { LessonId, SummaryContent } from "../../types/content";

// Cheat sheet do módulo 02 (SUM-01.1). O diagrama é desenhado pelo <Scene> num passo único, e a folha
// tem estilo de impressão em A4 (SUM-01.2). As aulas linkadas saem do catálogo: as 11 do módulo, em ordem.

const lessons: LessonId[] = (catalog.find((module) => module.id === "02")?.lessons ?? []).map((lesson) => lesson.id);

const summary: SummaryContent = {
  module: "02",
  concepts: [
    "Deep learning: redes com muitas camadas que aprendem as próprias features a partir de dados brutos. O XOR mostra o porquê: nenhuma reta o separa, mas uma camada escondida com as features OU e E resolve.",
    "Neurônio: z = Σ wᵢ · xᵢ + b e saída = ativação(z); o peso diz direção e força, o viés é um limiar ajustável. Camada densa: h = ativação(x · W + b), com n · m pesos e m vieses. Sem ativação, camadas empilhadas colapsam numa só, porque W₁ · W₂ é outra matriz.",
    "Ativações: ReLU e GELU nas camadas escondidas, porque deixam o gradiente passar; sigmoid, softmax ou nenhuma na saída, conforme a tarefa. A derivada da sigmoid é no máximo 0,25.",
    "Forward: camada por camada até os logits e o softmax. Custa cerca de 2 FLOPs por parâmetro por exemplo, e no treino guarda as ativações para a volta.",
    "Backprop: regra da cadeia no grafo computacional, da perda para trás. Entrega todos os gradientes numa passada que custa cerca de 2× o forward.",
    "Otimização: w ← w − η · ∇L em mini-lotes. Momentum amortece o zigue-zague em vales estreitos, Adam adapta o passo de cada parâmetro, e a agenda faz aquecimento e decaimento em cosseno.",
    "CNN: kernels pequenos com pesos compartilhados deslizam pela imagem e geram mapas de features; o pooling resume. RNN: um estado atualizado a cada token, com pesos compartilhados no tempo, que esquece o que ficou longe.",
    "Escala: multiplicação de matriz é paralelismo puro para a GPU; precisão mista corta memória e tempo. Com várias GPUs, paralelismo de dados soma gradientes por all-reduce, e ZeRO, tensor e pipeline parallelism dividem modelos grandes.",
  ],
  formulas: [
    "z = Σ wᵢ · xᵢ + b e h = f(z)",
    "Camada densa: parâmetros = n_entradas · n_saídas + n_saídas",
    "σ(z) = 1 / (1 + e^(−z)), com σ′(z) = σ(z) · (1 − σ(z)) ≤ 0,25",
    "∂L/∂w = ∂L/∂ŷ · ∂ŷ/∂h · ∂h/∂z · ∂z/∂w",
    "w ← w − η · ∇L(w); momentum: v ← β · v + ∇L, w ← w − η · v",
    "Convolução sem padding: saída = entrada − kernel + 1; campo receptivo de L camadas 3 × 3 = 1 + 2L",
    "RNN: h_t = tanh(W_x · x_t + W_h · h_(t−1) + b)",
    "Ring all-reduce: tráfego por GPU = 2 · (N − 1) / N × tamanho dos gradientes; Adam em precisão mista ≈ 16 bytes por parâmetro",
  ],
  pitfalls: [
    "Empilhar camadas sem ativação entre elas: a rede inteira vira uma camada linear.",
    "Usar sigmoid ou tanh nas camadas escondidas de uma rede funda: o gradiente some antes de chegar às primeiras camadas.",
    "Pôr sigmoid ou softmax na saída de uma regressão: a previsão fica presa entre 0 e 1.",
    "Escolher a taxa de aprendizado sem testar: pequena demais não sai do lugar, grande demais faz a perda explodir em NaN.",
    "Esquecer as ativações e o estado do otimizador na conta de memória: o treino pede muito mais do que os pesos sozinhos.",
    "Culpar a GPU pela lentidão quando o gargalo é o carregamento de dados ou operações pequenas limitadas pela memória.",
  ],
  diagram: {
    kind: "pieces",
    layout: "single",
    pieces: [
      {
        id: "module-02",
        piece: "block-diagram",
        blocks: [
          { id: "batch", kind: "queue", label: "mini-lote", col: 0, row: 0 },
          { id: "net", kind: "llm", label: "rede: forward", col: 1, row: 0 },
          { id: "loss", kind: "eval", label: "perda", col: 2, row: 0 },
          { id: "backprop", kind: "tool", label: "backprop + adam", col: 2, row: 1 },
          { id: "gpus", kind: "server", label: "gpus: all-reduce", col: 1, row: 1 },
          { id: "answer", kind: "answer", label: "previsão", col: 3, row: 0 },
        ],
        edges: [
          { from: "batch", to: "net" },
          { from: "net", to: "loss", label: "logits" },
          { from: "loss", to: "backprop", label: "gradientes" },
          { from: "backprop", to: "gpus", label: "média" },
          { from: "gpus", to: "net", label: "pesos novos" },
          { from: "net", to: "answer", label: "inferência" },
        ],
        active: "net",
      },
    ],
  },
  lessons,
};

export default summary;
