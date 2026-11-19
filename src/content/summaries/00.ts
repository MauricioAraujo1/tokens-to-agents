import { catalog } from "../catalog";
import type { LessonId, SummaryContent } from "../../types/content";

// Cheat sheet do módulo 00. O diagrama é desenhado pelo <Scene> num passo único. As aulas linkadas
// saem do catálogo: as 8 do módulo, em ordem.

const lessons: LessonId[] = (catalog.find((module) => module.id === "00")?.lessons ?? []).map((lesson) => lesson.id);

const summary: SummaryContent = {
  module: "00",
  concepts: [
    "Inteligência artificial: sistemas que entendem, decidem, preveem ou geram. Toda IA de hoje é estreita: forte no que os dados cobrem e frágil fora disso.",
    "Regras contra aprendizado: regras sabem só o que alguém escreveu; um modelo ajusta parâmetros a partir de exemplos e devolve uma decisão com uma confiança.",
    "IA ⊃ machine learning ⊃ deep learning: no ML clássico a pessoa escolhe as features; no deep learning a rede aprende as features direto dos dados crus.",
    "IA generativa: o modelo aprende a chance do próximo pedaço e gera um pedaço por vez, sorteando. Recombina padrões em saídas novas, que soam plausíveis mesmo quando são falsas.",
    "Discriminativo estima P(classe | x) e só classifica; generativo estima P(x | classe) ou P(x) e consegue classificar e criar exemplos novos.",
    "Tipos de modelo pela entrada e pela saída: classe (classificação), número (regressão), vetor (embedding) e sequência (geração); multimodais aceitam vários tipos de entrada.",
    "Sistema moderno: treino raro, inferência a cada pedido. Em volta do modelo ficam a api, a busca (RAG), o prompt montado dentro da janela de contexto, a fila de GPUs, guardrails e evals.",
    "AI engineering constrói com modelos prontos e mede o sistema com evals; ML engineering constrói o modelo, dos dados ao MLOps. O ecossistema vai de chips e nuvem a modelos, ferramentas e apps.",
  ],
  formulas: [
    "P(classe | x) ∝ P(x | classe) · P(classe)",
    "P(frase) = P(w₂ | w₁) · P(w₃ | w₂) · … (bigramas)",
    "softmax(zᵢ) = e^zᵢ / Σⱼ e^zⱼ",
    "Parâmetros de uma camada densa = entradas × saídas + saídas",
    "Memória dos pesos = parâmetros × bits por peso ÷ 8",
    "Latência ≈ tokens de entrada ÷ velocidade de leitura + tokens de saída ÷ velocidade de geração",
  ],
  pitfalls: [
    "Achar que todo sistema de IA aprende: busca e regras também são IA, sem nenhum parâmetro aprendido.",
    "Usar deep learning numa planilha com boas features: um modelo clássico costuma ser menor, mais barato e tão bom quanto.",
    "Confiar num texto gerado só porque soa bem: o modelo otimiza o provável, e a verdade vem das fontes no contexto.",
    "Esquecer que prompt e resposta dividem a mesma janela de contexto, e que cada token custa tempo e dinheiro.",
    "Publicar uma mudança de prompt ou de modelo sem rodar os evals: a correção de um caso pode quebrar outros.",
    "Escolher um modelo aberto sem fazer a conta da memória: 70 bilhões de parâmetros em 16 bits pedem 140 GB só para os pesos.",
  ],
  diagram: {
    kind: "pieces",
    layout: "single",
    pieces: [
      {
        id: "module-00",
        piece: "block-diagram",
        blocks: [
          { id: "data", kind: "documents", label: "dados", col: 0, row: 0 },
          { id: "train", kind: "eval", label: "treino", col: 1, row: 0 },
          { id: "model", kind: "llm", label: "modelo", col: 2, row: 0.5 },
          { id: "context", kind: "context", label: "prompt e contexto", col: 1, row: 1 },
          { id: "app", kind: "app", label: "app", col: 3, row: 0 },
          { id: "user", kind: "user", label: "pessoas", col: 3, row: 1 },
        ],
        edges: [
          { from: "data", to: "train" },
          { from: "train", to: "model", label: "pesos" },
          { from: "context", to: "model" },
          { from: "model", to: "app", label: "inferência" },
          { from: "app", to: "user", label: "resposta" },
        ],
        active: "model",
      },
    ],
  },
  lessons,
};

export default summary;
