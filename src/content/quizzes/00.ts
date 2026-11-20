import type { QuizContent } from "../../types/content";

// Quiz do módulo 00. Cada questão aponta para a aula que ensina o assunto e cobra uma aplicação do
// conteúdo, não as mesmas perguntas do knowledge check de cada aula.

const quiz: QuizContent = {
  module: "00",
  questions: [
    {
      id: "rule-or-model",
      prompt: "Golpistas trocam todo dia as palavras das mensagens falsas. Por que um modelo treinado lida melhor com isso do que uma lista de regras?",
      options: [
        "Porque o modelo nunca erra",
        "Porque basta treinar de novo com os exemplos novos, sem reescrever o código de decisão",
        "Porque regras não rodam em servidores",
        "Porque o modelo não precisa de dados",
      ],
      correct: 1,
      explanation: "As regras só sabem o que alguém escreveu. O modelo ajusta os pesos a partir de exemplos, e exemplos novos atualizam o modelo num novo treino.",
      lesson: "00-01",
    },
    {
      id: "who-picks-features",
      prompt: "Num projeto, uma pessoa decide usar “número de links” e “palavras em maiúsculas” como entrada de um classificador. Em qual círculo esse projeto está?",
      options: [
        "IA por regras, sem aprendizado",
        "Machine learning clássico: a pessoa escolhe as features e o algoritmo aprende os parâmetros",
        "Deep learning, porque há um classificador",
        "IA generativa",
      ],
      correct: 1,
      explanation: "Escolher as features à mão é a marca do machine learning clássico. No deep learning, a rede aprende as features a partir dos dados crus.",
      lesson: "00-02",
    },
    {
      id: "bigram-probability",
      prompt: "Num modelo de bigramas, P(gato | o) = 0,5, P(dormiu | gato) = 0,4 e P(no | dormiu) = 1. Qual é a chance de gerar “o gato dormiu no”, a partir de “o”?",
      options: ["0,9", "0,2", "0,5", "1,9"],
      correct: 1,
      explanation: "A chance de uma sequência é o produto das chances de cada passo: 0,5 × 0,4 × 1 = 0,2.",
      lesson: "00-03",
    },
    {
      id: "confident-wrong",
      prompt: "Um assistente cita, com segurança, uma lei que não existe. O que melhor descreve o que aconteceu?",
      options: [
        "O modelo consultou uma base errada de propósito",
        "O modelo gerou o texto mais plausível, sem fonte que o fundamentasse: uma alucinação",
        "Um erro de digitação do usuário",
        "O modelo foi treinado com essa lei",
      ],
      correct: 1,
      explanation: "Modelos generativos otimizam o provável, não o verdadeiro. Sem fontes no contexto, eles podem gerar fatos que soam certos e não são.",
      lesson: "00-03",
    },
    {
      id: "naive-bayes-family",
      prompt: "O filtro de spam da primeira aula usava Naive Bayes. A que família ele pertence e por quê?",
      options: [
        "Discriminativa, porque classifica e-mails",
        "Generativa, porque modela P(palavras | classe) e usa a regra de Bayes para classificar",
        "Nenhuma, porque é um modelo de regras",
        "Deep learning, porque usa probabilidade",
      ],
      correct: 1,
      explanation: "O Naive Bayes aprende como os e-mails de cada classe costumam ser, P(x | classe). Classificar é uma consequência, via Bayes.",
      lesson: "00-04",
    },
    {
      id: "duplicate-tickets",
      prompt: "Um suporte quer agrupar tickets que descrevem o mesmo problema com palavras diferentes. Qual saída de modelo é a mais útil?",
      options: [
        "Uma classe entre categorias fixas",
        "Um vetor de embedding por ticket, para comparar distâncias",
        "Um número de regressão",
        "Uma imagem gerada",
      ],
      correct: 1,
      explanation: "Embeddings transformam sentido em distância: tickets parecidos viram vetores próximos, mesmo sem palavras em comum.",
      lesson: "00-05",
    },
    {
      id: "context-budget",
      prompt: "Num modelo com janela de 8.192 tokens, o prompt montado tem 7.900 tokens e você quer respostas de até 800. O que acontece?",
      options: [
        "Nada, a janela cresce sozinha",
        "Não cabe: prompt e resposta dividem a mesma janela, e é preciso cortar trechos ou histórico",
        "O modelo ignora as instruções",
        "A resposta sai mais rápida",
      ],
      correct: 1,
      explanation: "Entrada e saída disputam a mesma janela de contexto. 7.900 + 800 passa de 8.192, então algo do prompt precisa sair.",
      lesson: "00-06",
    },
    {
      id: "train-vs-inference",
      prompt: "Qual destas tarefas é inferência, e não treino?",
      options: [
        "Ajustar os pesos com 10 mil conversas rotuladas",
        "Responder a pergunta de um usuário com os pesos congelados",
        "Pré-treinar o modelo em texto da web",
        "Calcular o gradiente da perda para atualizar os pesos",
      ],
      correct: 1,
      explanation: "Inferência é usar o modelo pronto para responder. Treino é tudo o que muda os pesos.",
      lesson: "00-06",
    },
    {
      id: "measure-quality",
      prompt: "Um time trocou o modelo do assistente por uma versão mais nova. Como saber se o produto melhorou?",
      options: [
        "Ler o anúncio do provedor",
        "Rodar o mesmo eval de casos reais nas duas versões e comparar as taxas de aprovação",
        "Perguntar ao novo modelo se ele é melhor",
        "Medir a acurácia de treino",
      ],
      correct: 1,
      explanation: "Na AI engineering, a qualidade se mede no sistema inteiro, com um conjunto fixo de casos rodado antes e depois da mudança.",
      lesson: "00-07",
    },
    {
      id: "quantize",
      prompt: "Um modelo de 7 bilhões de parâmetros em 16 bits não cabe numa GPU de 8 GB. Qual mudança faz os pesos caberem?",
      options: [
        "Aumentar a janela de contexto",
        "Quantizar para 4 bits: 7 bilhões × 0,5 byte = 3,5 GB",
        "Escrever um prompt menor",
        "Aumentar a temperatura",
      ],
      correct: 1,
      explanation: "Em 16 bits são 14 GB. Com 4 bits por peso, a memória cai para um quarto, 3,5 GB, e cabe na GPU.",
      lesson: "00-08",
    },
  ],
};

export default quiz;
