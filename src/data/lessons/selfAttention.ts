import type { Lesson } from "../../types/course";

export const SELF_ATTENTION_LESSON_ID = "03-02";

export const selfAttentionLesson: Lesson = {
  id: SELF_ATTENTION_LESSON_ID,
  title: "Self-Attention",
  description: "Como cada token decide em quais outros tokens prestar atenção.",
  duration: 14,
  difficulty: "Intermediário",
  status: "not-started",
  diagram: "attention",
  stats: [
    { label: "Tokens", value: "10" },
    { label: "d_k", value: "64" },
    { label: "Comparações", value: "10 × 10 = 100" },
    { label: "Maior pontuação", value: "ele → gato  3.1", isHighlighted: true },
  ],
  objectives: [
    { label: "Por que o contexto muda o significado", stepId: "context" },
    { label: "Como Q, K e V saem do mesmo embedding", stepId: "qkv" },
    { label: "Calcular a pontuação q·k / √d_k", stepId: "score" },
    { label: "Transformar pontuações em pesos (softmax)", stepId: "softmax" },
    { label: "Por que o custo cresce com n²", stepId: "cost" },
  ],
  steps: [
    {
      id: "context",
      title: "A quem “ele” se refere?",
      shortTitle: "Contexto",
      description:
        "Na frase “O gato subiu no muro porque ele estava com medo”, a palavra “ele” só ganha sentido olhando para as outras palavras. O self-attention é o mecanismo que deixa cada token consultar o resto da frase.",
      changes: ["A frase foi quebrada em 10 tokens."],
      tip: "Sem contexto, o embedding de “ele” é o mesmo em qualquer frase. A atenção é o que o torna específico desta frase.",
      attentionView: "tokens",
      badge: "concept",
    },
    {
      id: "vectors",
      title: "Cada token vira um vetor",
      shortTitle: "Vetores",
      description:
        "Cada token é convertido num embedding com informação de posição. Por enquanto, os vetores não sabem nada uns dos outros: cada um representa só o próprio token.",
      changes: ["Os 10 tokens agora são vetores de mesma dimensão."],
      attentionView: "vectors",
      badge: "concept",
    },
    {
      id: "qkv",
      title: "Query, key e value",
      shortTitle: "Q, K e V",
      description:
        "O embedding de cada token é multiplicado por três matrizes aprendidas. A query diz o que o token procura, a key diz o que ele oferece e o value é a informação que ele entrega.",
      changes: ["O token “ele” passa a perguntar com a sua query."],
      tip: "Q, K e V saem do mesmo embedding. O que muda são as matrizes W_Q, W_K e W_V, aprendidas no treino.",
      attentionView: "query",
      badge: "mechanism",
    },
    {
      id: "score",
      title: "Quem combina com quem?",
      shortTitle: "Pontuação",
      description:
        "Para o token “ele”, o modelo compara a sua query com a key de cada token da frase. Cada comparação é um produto escalar, q · k: quanto maior o número, mais os dois tokens combinam.",
      changes: [
        "Depois, cada pontuação é dividida por √d_k (aqui √64 = 8), para os números não ficarem grandes demais antes do softmax.",
      ],
      tip: "Pense numa busca: a query é a pergunta que “ele” faz (“a quem eu me refiro?”) e as keys são as etiquetas de cada palavra. O produto escalar mede o quanto cada etiqueta responde à pergunta.",
      attentionView: "scores",
      badge: "mechanism",
    },
    {
      id: "softmax",
      title: "De pontuações a pesos",
      shortTitle: "Softmax",
      description:
        "O softmax transforma as pontuações em pesos positivos que somam 1. Diferenças pequenas nas pontuações viram diferenças grandes nos pesos: “gato” fica com a maior fatia.",
      changes: ["As pontuações viraram uma distribuição de atenção."],
      tip: "É o softmax que faz os pesos somarem 1, não a divisão por √d_k.",
      attentionView: "weights",
      badge: "mechanism",
    },
    {
      id: "sum",
      title: "Uma soma ponderada dos values",
      shortTitle: "Soma",
      description:
        "A nova representação de “ele” é a soma dos values de todos os tokens, cada um multiplicado pelo seu peso. Como “gato” tem o maior peso, “ele” passa a carregar muito da informação de “gato”.",
      changes: ["O vetor de “ele” agora sabe a quem se refere."],
      attentionView: "weights",
      badge: "mechanism",
    },
    {
      id: "mask",
      title: "Máscara causal",
      shortTitle: "Máscara",
      description:
        "Num decoder, um token não pode olhar para o futuro. Antes do softmax, as pontuações dos tokens seguintes recebem −∞ e ficam com peso zero.",
      changes: ["Na geração, “ele” só enxerga “O gato subiu no muro porque”."],
      tip: "A máscara faz o treino imitar a geração: o modelo prevê cada token só com o que veio antes.",
      attentionView: "masked",
      badge: "warning",
    },
    {
      id: "heads",
      title: "Várias cabeças em paralelo",
      shortTitle: "Cabeças",
      description:
        "O multi-head attention repete o cálculo em várias cabeças, cada uma com as suas matrizes. Uma pode ligar pronomes a substantivos, outra verbos a sujeitos, e os resultados são concatenados.",
      changes: ["Cada cabeça trabalha num subespaço de dimensão d_model / h."],
      attentionView: "weights",
      badge: "concept",
    },
    {
      id: "cost",
      title: "O custo cresce com n²",
      shortTitle: "Custo n²",
      description:
        "Cada token compara a sua query com a key de todos os outros: são n × n comparações. Com 10 tokens são 100; com 1.000 tokens, um milhão.",
      changes: ["Dobrar o contexto quadruplica a conta da atenção."],
      tip: "É por isso que contextos longos são caros e técnicas como KV cache e atenção esparsa existem.",
      attentionView: "scores",
      badge: "warning",
    },
    {
      id: "summary",
      title: "Resumo",
      shortTitle: "Resumo",
      description:
        "Self-attention = comparar a query de um token com as keys de todos, escalar por √d_k, aplicar softmax e somar os values com esses pesos. É assim que “ele” descobre que se refere a “gato”.",
      changes: ["Attention(Q, K, V) = softmax(Q·Kᵀ / √d_k) · V"],
      attentionView: "weights",
      badge: "solution",
    },
  ],
};
