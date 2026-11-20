import { catalog } from "../catalog";
import type { LessonId, SummaryContent } from "../../types/content";

// Cheat sheet do módulo 04 (SUM-01.1). O diagrama é desenhado pelo <Scene> num passo único, e a folha
// tem estilo de impressão em A4 (SUM-01.2). As aulas linkadas saem do catálogo: as 13 do módulo, em ordem.

const lessons: LessonId[] = (catalog.find((module) => module.id === "04")?.lessons ?? []).map((lesson) => lesson.id);

const summary: SummaryContent = {
  module: "04",
  concepts: [
    "LLM: um Transformer decoder grande, pré-treinado em trilhões de tokens, que devolve uma probabilidade para cada token do vocabulário. A tarefa muda pelo prompt, sem treinar outro modelo.",
    "Geração autorregressiva: prever, escolher, anexar e repetir, uma passada por token, até o token de fim ou o limite de tokens. O prompt é lido em paralelo (prefill); a resposta sai em sequência (decode).",
    "Previsão do próximo token: logits → softmax → −log p(alvo). Todo texto traz o gabarito, e prever bem obriga o modelo a aprender gramática, fatos e raciocínio simples.",
    "Parâmetros: ≈ 12 · L · d² nos blocos. Memória dos pesos = parâmetros × bytes por peso; treino com Adam pede cerca de 16 bytes por parâmetro; cada token custa ≈ 2 · N FLOPs dos parâmetros ativos.",
    "Janela de contexto: sistema, histórico, documentos, pergunta e resposta dividem o mesmo limite. O KV cache cresce linearmente com o contexto, e informação no meio de contextos longos tende a ser menos usada.",
    "Amostragem: softmax(logits / T), corte top-k e top-p, renormalização e sorteio. Temperatura baixa para respostas repetíveis; mais alta, com top-p, para variedade.",
    "Escolha de modelo: SLM ou LLM, aberto ou fechado, multimodal ou não. Restrições cortam a lista, testes com os seus casos decidem e o custo no seu volume desempata.",
    "Ciclo de vida: dados → pré-treino (modelo base) → SFT → preferências (RLHF com modelo de recompensa e PPO, ou DPO) → avaliação → deploy → feedback.",
  ],
  formulas: [
    "p_i = e^(z_i / T) / Σ_j e^(z_j / T)",
    "Perda = −ln p(token certo); perplexidade = e^(perda média)",
    "Parâmetros ≈ 12 · L · d² + V · d; memória = parâmetros × bytes por peso",
    "KV cache por token = 2 · camadas · d · bytes",
    "Tokens por imagem = (lado ÷ patch)²",
    "P(A ≻ B) = σ(r_A − r_B); perda DPO = −ln σ(β · [(log π_w − log π_ref,w) − (log π_l − log π_ref,l)])",
  ],
  pitfalls: [
    "Esquecer que a resposta ocupa a janela de contexto: sem reservar espaço, ela sai cortada.",
    "Confundir tom confiante com resposta certa: o modelo gera o provável, e alucinações soam tão seguras quanto fatos.",
    "Escolher o modelo pelo topo de um ranking público em vez dos seus casos de teste.",
    "Achar que temperatura 0 corrige um prompt ruim: ela só torna a mesma resposta repetível.",
    "Chamar todo modelo de pesos abertos de open source e usar sem ler a licença.",
    "Calcular a memória de um modelo MoE pelos parâmetros ativos: os pesos de todos os experts precisam estar carregados.",
  ],
  diagram: {
    kind: "pieces",
    layout: "single",
    pieces: [
      {
        id: "module-04",
        piece: "block-diagram",
        blocks: [
          { id: "data", kind: "documents", label: "dados", col: 0, row: 0 },
          { id: "train", kind: "eval", label: "pré-treino + ajuste", col: 1, row: 0 },
          { id: "llm", kind: "llm", label: "llm", col: 2, row: 0 },
          { id: "context", kind: "context", label: "janela de contexto", col: 1, row: 1 },
          { id: "sampler", kind: "retrieval", label: "amostragem", col: 2, row: 1 },
          { id: "answer", kind: "answer", label: "token a token", col: 3, row: 1 },
        ],
        edges: [
          { from: "data", to: "train" },
          { from: "train", to: "llm", label: "pesos" },
          { from: "context", to: "llm", label: "prompt" },
          { from: "llm", to: "sampler", label: "probabilidades" },
          { from: "sampler", to: "answer" },
        ],
        active: "llm",
      },
    ],
  },
  lessons,
};

export default summary;
