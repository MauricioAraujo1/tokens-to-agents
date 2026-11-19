import { catalog } from "../catalog";
import type { LessonId, SummaryContent } from "../../types/content";

// Cheat sheet do módulo 01 (SUM-01.1). O diagrama é desenhado pelo <Scene> num passo único, e a folha
// tem estilo de impressão em A4 (SUM-01.2). As aulas linkadas saem do catálogo: as 12 do módulo, em ordem.

const lessons: LessonId[] = (catalog.find((module) => module.id === "01")?.lessons ?? []).map((lesson) => lesson.id);

const summary: SummaryContent = {
  module: "01",
  concepts: [
    "Machine learning inverte a programação: dados com respostas entram no treino e saem as regras (os parâmetros do modelo). Inferência é aplicar esses parâmetros a uma entrada nova.",
    "Três famílias: supervisionado (pares entrada e rótulo), não supervisionado (estrutura sem rótulo: grupos, PCA, anomalias) e por reforço (um agente maximiza a recompensa somada, com desconto γ).",
    "Classificação prevê uma categoria: a regressão logística devolve sigmoide(w · x + b), a fronteira de decisão é w · x + b = 0, e o limiar troca falsos alarmes por casos perdidos. Com várias classes, um logit por classe e softmax.",
    "Regressão prevê um número: mínimos quadrados acham a reta que minimiza Σ resíduo². RMSE dá o erro típico na unidade do alvo e R² compara com prever sempre a média.",
    "k-means alterna atribuir cada ponto ao centroide mais perto e mover cada centroide para a média do grupo. A inércia só cai; k se escolhe pelo cotovelo, e várias inicializações evitam mínimos locais.",
    "Treino ajusta os pesos, validação escolhe hiperparâmetros e o teste mede uma vez. Qualquer informação do teste que chega às decisões é vazamento e infla a nota.",
    "Overfitting: erro de treino baixo e de validação alto. Underfitting: os dois altos. Mais dados, regularização (λ · Σw²) e early stopping são as defesas.",
    "A descida do gradiente atualiza w ← w − η · ∇L(w). η pequeno é lento, grande oscila ou diverge; o SGD estima o gradiente com mini-batches. A perda define o que é erro: MSE (média), MAE (mediana), cross-entropy (classes e próximo token).",
  ],
  formulas: [
    "ŷ = w · x + b (regressão linear); p = σ(w · x + b) = 1 / (1 + e^−(w · x + b)) (regressão logística)",
    "MSE = (1/n) Σ (y − ŷ)²; MAE = (1/n) Σ |y − ŷ|; R² = 1 − MSE / Var(y)",
    "Precision = VP / (VP + FP); Recall = VP / (VP + FN); F1 = 2 · P · R / (P + R)",
    "Cross-entropy = −ln p(classe certa); gradiente nos logits com softmax = p − y",
    "w ← w − η · ∇L(w)",
    "Q(s, a) ← Q(s, a) + α · [r + γ · max Q(s′, ·) − Q(s, a)]",
  ],
  pitfalls: [
    "Medir o modelo nos dados de treino: o erro sai otimista, e o k-NN com k = 1 acerta 100% decorando.",
    "Confiar na acurácia com classes raras: liberar todas as transações já dá 95% num lote com 5% de fraudes.",
    "Calcular a normalização ou escolher hiperparâmetros olhando o teste: é vazamento, e a nota final deixa de valer.",
    "Agrupar ou medir distâncias sem padronizar as features: a de maior escala domina tudo.",
    "Escolher k do k-means pela menor inércia: ela sempre cai com mais grupos.",
    "Usar uma taxa de aprendizado alta demais: a perda oscila, cresce e vira NaN.",
  ],
  diagram: {
    kind: "pieces",
    layout: "single",
    pieces: [
      {
        id: "module-01",
        piece: "block-diagram",
        blocks: [
          { id: "data", kind: "documents", label: "dataset", col: 0, row: 0.5 },
          { id: "split", kind: "queue", label: "treino/val/teste", col: 1, row: 0.5 },
          { id: "model", kind: "llm", label: "modelo (w)", col: 2, row: 0 },
          { id: "loss", kind: "eval", label: "perda, gradiente", col: 2, row: 1 },
          { id: "metrics", kind: "guardrail", label: "métricas (teste)", col: 3, row: 0.5 },
        ],
        edges: [
          { from: "data", to: "split" },
          { from: "split", to: "model", label: "treino" },
          { from: "model", to: "loss", label: "ajusta w" },
          { from: "model", to: "metrics", label: "teste, 1 vez" },
        ],
        active: "model",
      },
    ],
  },
  lessons,
};

export default summary;
