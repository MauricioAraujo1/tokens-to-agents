import { catalog } from "../catalog";
import type { LessonId, SummaryContent } from "../../types/content";

// Cheat sheet do módulo 10 (SUM-01.1). O diagrama é desenhado pelo <Scene> num passo único, e a folha
// tem estilo de impressão em A4 (SUM-01.2). As aulas linkadas saem do catálogo: as 16 do módulo, em ordem.

const lessons: LessonId[] = (catalog.find((module) => module.id === "10")?.lessons ?? []).map((lesson) => lesson.id);

const summary: SummaryContent = {
  module: "10",
  concepts: [
    "Inferência é rodar o modelo treinado com os pesos congelados, uma passada por token gerado. Treinar custa cerca de 6 · N · D FLOPs uma vez; cada token custa cerca de 2 · N, pago de novo a cada pedido.",
    "Prefill lê o prompt inteiro numa passada, é limitado pelo cálculo e define o TTFT. Decode gera um token por passada, relê todos os pesos e é limitado pela banda de memória: o teto de um usuário é banda ÷ bytes dos pesos.",
    "Métricas: TTFT, ITL (tempo entre tokens), tokens por segundo por usuário e do servidor. Latência e throughput brigam: perto da saturação a fila cresce como 1 / (1 − ρ) e o p99 explode antes da média.",
    "KV cache guarda keys e values de cada token para o decode não refazer o prompt; ocupa memória que cresce com o contexto e com os pedidos simultâneos. Prompt caching reaproveita o KV cache de prefixos idênticos entre pedidos.",
    "Batching junta pedidos na mesma leitura dos pesos e multiplica o throughput. O continuous batching troca pedidos a cada passo, sem vagas ociosas, e o chunked prefill evita que um prompt longo trave o decode dos outros.",
    "Quantização (int8, int4, com GPTQ, AWQ ou GGUF) e compressão (poda, 2:4, destilação) diminuem os bytes dos pesos: o modelo cabe em menos GPUs e o decode acelera quase na mesma proporção.",
    "Gerência de memória: pesos + KV cache + ativações dentro da fração reservada da GPU. PagedAttention aloca o cache em blocos sob demanda; sem memória, o motor faz preempção. Speculative decoding, FlashAttention e fusão de kernels atacam o tempo de cada passada.",
    "Em produção: servir com fila, réplicas, streaming e autoscaling; cortar custo com cache, Batch API, prompts menores e roteamento entre modelos; e usar um motor de inferência (vLLM, SGLang, TensorRT-LLM, llama.cpp) que já junta tudo isso.",
  ],
  formulas: [
    "Decode, teto por usuário ≈ banda de memória ÷ bytes dos pesos",
    "Latência total = TTFT + (n − 1) × ITL",
    "Lei de Little: L = λ · W",
    "KV cache por token = 2 × camadas × cabeças de KV × dimensão da cabeça × bytes",
    "Memória dos pesos = parâmetros × bytes por peso (fp16 = 2, int8 = 1, int4 = 0,5)",
    "Speculative decoding: tokens por verificação = (1 − α^(k+1)) / (1 − α)",
  ],
  pitfalls: [
    "Comparar tokens por segundo do servidor com os de um usuário: com lote grande, o primeiro sobe enquanto o segundo cai.",
    "Planejar capacidade pela média e levar a GPU perto de 100%: a fila cresce sem limite e o p99 estoura.",
    "Esquecer o KV cache no dimensionamento: os pesos cabem, mas a memória acaba com contextos longos e muitos pedidos simultâneos.",
    "Colocar dados que mudam a cada pedido (data, id, nome do usuário) no começo do prompt e zerar o prompt caching.",
    "Quantizar e servir sem medir a qualidade no seu próprio conjunto de avaliação.",
    "Rotear para o modelo barato sem medir o erro: a economia aparece na fatura e a perda aparece nos usuários.",
  ],
  diagram: {
    kind: "pieces",
    layout: "single",
    pieces: [
      {
        id: "module-10",
        piece: "block-diagram",
        blocks: [
          { id: "phone", kind: "phone", label: "pedidos", col: 0, row: 0 },
          { id: "queue", kind: "queue", label: "fila + lote contínuo", col: 1, row: 0 },
          { id: "llm", kind: "llm", label: "prefill + decode", col: 2, row: 0 },
          { id: "cache", kind: "kv-cache", label: "kv cache paginado", col: 2, row: 1 },
          { id: "vram", kind: "memory", label: "pesos quantizados", col: 1, row: 1 },
          { id: "answer", kind: "answer", label: "streaming", col: 3, row: 0 },
        ],
        edges: [
          { from: "phone", to: "queue" },
          { from: "queue", to: "llm", label: "um passo" },
          { from: "vram", to: "llm", label: "pesos" },
          { from: "cache", to: "llm", label: "keys e values" },
          { from: "llm", to: "answer", label: "tokens" },
        ],
        active: "llm",
      },
    ],
  },
  lessons,
};

export default summary;
