import type { QuizContent } from "../../types/content";

// Quiz do módulo 01 (PRAC-01.1). Cada questão aponta para a aula que ensina o assunto (PRAC-01.4) e
// cobra uma aplicação do conteúdo, não as mesmas perguntas do knowledge check de cada aula.

const quiz: QuizContent = {
  module: "01",
  questions: [
    {
      id: "pick-family",
      prompt:
        "Uma loja tem o histórico de compras de 1 milhão de clientes, sem nenhuma etiqueta, e quer criar campanhas para perfis diferentes. Que tipo de aprendizado usar primeiro?",
      options: [
        "Supervisionado, prevendo o perfil de cada cliente",
        "Não supervisionado, agrupando clientes parecidos",
        "Por reforço, premiando as compras",
        "Nenhum: é preciso rotular todos os clientes antes",
      ],
      correct: 1,
      explanation:
        "Não há rótulo de perfil para copiar. Um algoritmo de clustering encontra os grupos; depois, pessoas dão nome a eles e decidem a campanha de cada um.",
      lesson: "01-03",
    },
    {
      id: "knn-scale",
      prompt:
        "Um k-NN classifica imóveis por área (m²) e número de quartos, sem padronizar as features. O que tende a acontecer?",
      options: [
        "Os quartos dominam a distância, porque variam pouco",
        "A área domina a distância, e o número de quartos quase não muda quem são os vizinhos",
        "As duas features pesam igual, porque o k-NN normaliza sozinho",
        "O k-NN deixa de funcionar com duas features",
      ],
      correct: 1,
      explanation:
        "Uma diferença de 40 m² pesa muito mais que uma diferença de 2 quartos na distância euclidiana. Padronizar as features dá a elas a mesma escala.",
      lesson: "01-02",
    },
    {
      id: "credit-assignment",
      prompt:
        "Um agente de xadrez só recebe recompensa no fim da partida (+1 vitória, −1 derrota). Para que serve o fator de desconto γ < 1?",
      options: [
        "Para a recompensa final valer mais que as intermediárias",
        "Para que estados mais perto da vitória valham mais e o agente prefira vencer em menos jogadas",
        "Para impedir que o agente explore",
        "Para transformar o reforço em aprendizado supervisionado",
      ],
      correct: 1,
      explanation:
        "Com desconto, uma recompensa a k jogadas vale γ^k. O valor dos estados cresce à medida que a vitória se aproxima, e vitórias rápidas valem mais que vitórias demoradas.",
      lesson: "01-04",
    },
    {
      id: "logistic-boundary",
      prompt:
        "Uma regressão logística tem pesos w = (2, −1) e b = 0. Qual é a decisão para x = (1, 3), com limiar de 50%?",
      options: [
        "Classe positiva, porque 2 é o maior peso",
        "Classe negativa: a pontuação é 2 · 1 − 1 · 3 = −1, e a sigmoide de −1 fica abaixo de 50%",
        "Exatamente 50%, porque b = 0",
        "Não dá para saber sem treinar de novo",
      ],
      correct: 1,
      explanation: "A pontuação w · x + b = −1 é negativa, então σ(−1) ≈ 27% < 50%. O ponto fica do lado negativo da fronteira 2x₁ − x₂ = 0.",
      lesson: "01-05",
    },
    {
      id: "ce-confident",
      prompt:
        "Dois classificadores erram o mesmo exemplo. O A deu 40% à classe certa; o B deu 1%. Como a cross-entropy trata os dois?",
      options: [
        "Igual, porque os dois erraram",
        "Pune bem mais o B: −ln 0,01 ≈ 4,6 contra −ln 0,4 ≈ 0,92",
        "Pune mais o A, porque ele estava em dúvida",
        "Não pune nenhum, porque a cross-entropy só olha os acertos",
      ],
      correct: 1,
      explanation:
        "A cross-entropy olha a probabilidade dada à classe certa e cresce sem limite quando ela vai a zero. Errar com muita confiança custa muito mais que errar em dúvida.",
      lesson: "01-12",
    },
    {
      id: "kmeans-steps",
      prompt: "Numa iteração do k-means, depois de atribuir cada ponto ao centroide mais próximo, qual é o próximo passo?",
      options: [
        "Aumentar k em 1",
        "Mover cada centroide para a média dos pontos do seu grupo",
        "Remover os pontos mais distantes",
        "Rotular os pontos e treinar um classificador",
      ],
      correct: 1,
      explanation:
        "O k-means alterna atribuir (cada ponto ao centroide mais perto) e atualizar (cada centroide para a média do grupo) até as atribuições pararem de mudar.",
      lesson: "01-07",
    },
    {
      id: "validation-role",
      prompt:
        "Você compara 5 profundidades de uma árvore de decisão e escolhe a que tem o menor erro. Em qual conjunto esse erro deve ser medido?",
      options: [
        "No treino, porque tem mais dados",
        "Na validação (ou com validação cruzada), deixando o teste para a medida final",
        "No teste, porque é o número que vai para o relatório",
        "Em qualquer um, o resultado é o mesmo",
      ],
      correct: 1,
      explanation:
        "Escolher hiperparâmetros é trabalho da validação. No treino, a árvore mais profunda sempre ganha; no teste, a escolha vaza e a nota final fica otimista.",
      lesson: "01-08",
    },
    {
      id: "learning-curve",
      prompt:
        "Ao longo das épocas, o erro de treino continua caindo, mas o de validação começou a subir na época 12. O que fazer?",
      options: [
        "Treinar mais épocas até o erro de validação voltar a cair",
        "Ficar com os pesos da época 12 (early stopping) ou regularizar mais",
        "Aumentar a taxa de aprendizado",
        "Medir no teste a cada época para decidir",
      ],
      correct: 1,
      explanation:
        "Treino caindo e validação subindo é overfitting começando. Early stopping guarda os pesos do melhor ponto de validação; regularização atrasa o problema.",
      lesson: "01-09",
    },
    {
      id: "precision-recall-calc",
      prompt:
        "Um detector de fraude teve 30 VP, 20 FP, 10 FN e 940 VN. Quais são precision e recall?",
      options: [
        "Precision 75% e recall 60%",
        "Precision 60% e recall 75%",
        "Precision 97% e recall 75%",
        "Precision 30% e recall 10%",
      ],
      correct: 1,
      explanation: "Precision = 30 / (30 + 20) = 60%. Recall = 30 / (30 + 10) = 75%. A acurácia, 97%, esconde que 40% dos bloqueios são falsos alarmes.",
      lesson: "01-10",
    },
    {
      id: "gd-step",
      prompt: "Com perda L(w) = (w − 5)², w = 1 e taxa de aprendizado η = 0,25, qual é o w depois de um passo de descida do gradiente?",
      options: ["w = −1", "w = 3", "w = 5", "w = 1,25"],
      correct: 1,
      explanation: "O gradiente é 2 · (1 − 5) = −8. O passo é w − η · ∇L = 1 − 0,25 · (−8) = 3: metade do caminho até o mínimo em 5.",
      lesson: "01-11",
    },
  ],
};

export default quiz;
