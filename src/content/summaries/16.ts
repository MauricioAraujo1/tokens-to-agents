import { catalog } from "../catalog";
import type { LessonId, SummaryContent } from "../../types/content";

// Cheat sheet do módulo 16 (SUM-01.1). O diagrama é desenhado pelo <Scene> num passo único, e a folha
// tem estilo de impressão em A4 (SUM-01.2). As aulas linkadas saem do catálogo: as 13 do módulo, em ordem.

const lessons: LessonId[] = (catalog.find((module) => module.id === "16")?.lessons ?? []).map((lesson) => lesson.id);

const summary: SummaryContent = {
  module: "16",
  concepts: [
    "Avaliação = casos fixos que representam o produto + um critério de acerto por caso + uma nota agregada com intervalo de confiança. Compare versões caso a caso: a média esconde regressões. Offline antes do deploy, online com tráfego real depois.",
    "Métricas com referência (exact match, token F1, BLEU, ROUGE, BERTScore) premiam parecer com o gabarito; métricas sem referência validam formato, rodam testes ou conferem a resposta contra o contexto. Valide a métrica em respostas certas e erradas antes de confiar nela.",
    "O benchmark mede o modelo isolado; o eval do sistema mede o que o usuário recebe, e o sucesso fim a fim é no máximo o produto das peças. Análise de erros conta as falhas por componente antes de trocar o modelo.",
    "RAG em escala: quadrante context recall × faithfulness para achar a peça culpada, citation recall e precision, perguntas reais misturadas às sintéticas e uma amostra do tráfego avaliada sem referência. Agentes: estado final, trajetória, pass^k e custo por tarefa resolvida.",
    "LLM-as-a-judge: rubrica com checagens verificáveis, raciocínio antes do veredito, comparação aos pares nas duas ordens e calibração contra pessoas pelo kappa de Cohen. Benchmarks: mesmo protocolo, empates dentro do intervalo, Elo para arenas, cuidado com contaminação e saturação.",
    "Observabilidade: um trace por requisição, uma árvore de spans com tempo, pai e atributos gen_ai do OpenTelemetry, amostrada na cauda para guardar todos os erros. Traces com nota baixa viram casos de teste.",
    "Segurança em camadas: detecção de alucinação (groundedness com NLI, SelfCheckGPT, entropia semântica), guardrails de entrada e saída medidos por recall e recusa indevida, e defesas de prompt injection avaliadas por ASR e utilidade, de spotlighting a dois LLMs e políticas de fluxo de dados.",
    "Privacidade e monitoramento: redija ou pseudonimize PII antes do provedor e dos logs, filtre por permissão antes da busca, colete o mínimo e apague no prazo; em produção, junte sinais explícitos, implícitos e de juiz, meça drift com PSI e alerte com limites tirados da série.",
  ],
  formulas: [
    "Meia largura do intervalo de 95% de uma taxa: 1,96 · √(p · (1 − p) / n); metade da incerteza pede 4 vezes mais casos",
    "Token F1 = 2 · P · R / (P + R), com P = comuns / palavras da resposta e R = comuns / palavras da referência",
    "Sucesso fim a fim ≈ Π taxas de sucesso das peças (falhas independentes)",
    "Kappa de Cohen: κ = (p_o − p_e) / (1 − p_e), com p_e = p_a · p_b + (1 − p_a) · (1 − p_b)",
    "Elo: E_A = 1 / (1 + 10^((R_B − R_A) / 400)); R'_A = R_A + K · (S_A − E_A)",
    "Entropia semântica = −Σ p(grupo) · ln p(grupo), com as amostras agrupadas por significado",
    "PSI = Σ (a − e) · ln(a / e); limite de alerta = média ± k · σ da série de referência",
  ],
  pitfalls: [
    "Decidir com a média de poucos casos: sem intervalo de confiança e sem a lista de regressões, a vitória pode ser ruído.",
    "Escolher o modelo pelo leaderboard: o benchmark não mede o seu formato, os seus trechos nem as suas ferramentas.",
    "Confiar num juiz LLM pela concordância bruta: quando um veredito domina, aprovar tudo já concorda muito; meça o kappa contra pessoas.",
    "Medir só a resposta final de um agente: estado certo com trajetória que pulou uma regra é sorte.",
    "Ligar guardrails sem medir a recusa indevida, e deixar segredos ou dados pessoais no contexto confiando em instruções do prompt.",
    "Alertar com números redondos em vez da faixa normal da série, ou com limites tão apertados que a equipe aprende a ignorar o alarme.",
  ],
  diagram: {
    kind: "pieces",
    layout: "single",
    pieces: [
      {
        id: "module-16",
        piece: "block-diagram",
        blocks: [
          { id: "phone", kind: "phone", label: "usuário", col: 0, row: 0.5 },
          { id: "input", kind: "guardrail", label: "guardrails", col: 1, row: 0.5 },
          { id: "llm", kind: "llm", label: "app com llm", col: 2, row: 0 },
          { id: "traces", kind: "queue", label: "traces", col: 2, row: 1 },
          { id: "eval", kind: "eval", label: "evals + monitor", col: 3, row: 1 },
          { id: "golden", kind: "documents", label: "golden dataset", col: 3, row: 0 },
        ],
        edges: [
          { from: "phone", to: "input" },
          { from: "input", to: "llm" },
          { from: "llm", to: "traces", label: "spans" },
          { from: "traces", to: "eval", label: "amostra" },
          { from: "eval", to: "golden", label: "falhas viram casos" },
          { from: "golden", to: "llm", label: "eval offline", variant: "alternative" },
        ],
        active: "eval",
      },
    ],
  },
  lessons,
};

export default summary;
