import type { QuizContent } from "../../types/content";

// Quiz do módulo 04 (PRAC-01.1). Cada questão aponta para a aula que ensina o assunto (PRAC-01.4) e
// cobra uma aplicação do conteúdo, não as mesmas perguntas do knowledge check de cada aula.

const quiz: QuizContent = {
  module: "04",
  questions: [
    {
      id: "streaming-cost",
      prompt: "Um app de chat mostra a resposta crescendo na tela. O que acontece por trás a cada pedaço novo?",
      options: [
        "O servidor busca a próxima frase pronta num banco de dados",
        "O modelo roda mais uma passada, prevê o próximo token e o anexa ao texto",
        "O modelo gera a resposta inteira e o app só atrasa a exibição",
        "O tokenizador divide uma resposta já pronta",
      ],
      correct: 1,
      explanation: "A geração é autorregressiva: uma passada por token, e cada token escolhido entra na entrada da próxima previsão. O streaming envia cada token assim que ele sai.",
      lesson: "04-02",
    },
    {
      id: "logits-ratio",
      prompt: "O logit de “Paris” é 6 e o de “Lyon” é 3. Quantas vezes “Paris” é mais provável que “Lyon” depois do softmax?",
      options: ["2 vezes", "3 vezes", "e³ ≈ 20 vezes", "Depende da temperatura do servidor, sempre"],
      correct: 2,
      explanation: "No softmax, a razão entre duas probabilidades é e elevado à diferença dos logits: e^(6 − 3) = e³ ≈ 20. Com temperatura T, a diferença é dividida por T antes.",
      lesson: "04-03",
    },
    {
      id: "memory-70b",
      prompt: "Quanta memória ocupam só os pesos de um modelo de 70 bilhões de parâmetros quantizado em 4 bits?",
      options: ["Cerca de 4 GB", "Cerca de 35 GB", "Cerca de 140 GB", "Cerca de 280 GB"],
      correct: 1,
      explanation: "Memória = parâmetros × bytes por peso. 4 bits são meio byte: 70 × 10⁹ × 0,5 = 35 GB. Em bf16, seriam 140 GB.",
      lesson: "04-04",
    },
    {
      id: "long-chat-forgets",
      prompt: "Depois de uma conversa longa, o assistente esquece o nome que o usuário disse no começo. Qual é a explicação mais provável?",
      options: [
        "O modelo apagou o nome dos pesos",
        "A aplicação cortou as mensagens mais antigas para caber na janela de contexto",
        "A temperatura subiu durante a conversa",
        "O KV cache trocou o nome por outro",
      ],
      correct: 1,
      explanation: "O modelo só vê o que está na janela. Quando a conversa passa do limite, a aplicação descarta ou resume o começo, e o que saiu deixa de existir para o modelo.",
      lesson: "04-05",
    },
    {
      id: "temperature-order",
      prompt: "Você baixa a temperatura de 1 para 0,5. O que acontece com a ordem dos tokens mais prováveis?",
      options: [
        "Ela se inverte",
        "Ela continua a mesma; só o favorito fica mais concentrado",
        "Ela vira aleatória",
        "Os tokens raros passam para o topo",
      ],
      correct: 1,
      explanation: "Dividir todos os logits pelo mesmo número positivo não muda quem é maior. Com T < 1, as diferenças crescem e o favorito ganha mais probabilidade.",
      lesson: "04-06",
    },
    {
      id: "edge-model",
      prompt: "Um app precisa classificar mensagens em tempo real, offline, num celular. O que pesa mais na escolha do modelo?",
      options: [
        "A posição do modelo no ranking geral",
        "Caber na memória do aparelho e ser bom o bastante na tarefa, medido em testes",
        "Ter o maior número de parâmetros possível",
        "Ter a maior janela de contexto do mercado",
      ],
      correct: 1,
      explanation: "Rodar offline num celular exige um modelo pequeno, quantizado, que caiba na memória. Classificar é uma tarefa estreita, em que um SLM costuma bastar.",
      lesson: "04-07",
    },
    {
      id: "license-check",
      prompt: "Uma equipe quer usar um modelo de pesos abertos num produto pago. Qual é o passo obrigatório antes?",
      options: [
        "Nenhum: pesos abertos podem ser usados de qualquer jeito",
        "Ler a licença e o model card para confirmar que o uso comercial é permitido e em que condições",
        "Pedir os dados de treino ao autor",
        "Treinar o modelo de novo do zero",
      ],
      correct: 1,
      explanation: "Pesos abertos vêm com licenças diferentes. Algumas, como a Apache 2.0, permitem uso comercial amplo; outras têm condições e restrições próprias.",
      lesson: "04-08",
    },
    {
      id: "image-tokens",
      prompt: "Um modelo de visão corta imagens de 448 × 448 pixels em patches de 14 × 14. Quantos tokens cada imagem ocupa?",
      options: ["32", "448", "1.024", "6.272"],
      correct: 2,
      explanation: "São 448 ÷ 14 = 32 patches por lado, e 32 × 32 = 1.024 patches, um token cada.",
      lesson: "04-09",
    },
    {
      id: "grounded-answer",
      prompt: "Um assistente interno inventa políticas da empresa que não existem. Qual mudança ataca a causa com mais eficácia?",
      options: [
        "Subir a temperatura",
        "Buscar os documentos de política, colocá-los no contexto e exigir citação de cada afirmação",
        "Trocar por um modelo com mais parâmetros e o mesmo prompt",
        "Pedir respostas mais longas",
      ],
      correct: 1,
      explanation: "O modelo não conhece as políticas internas e completa com o que é plausível. Com as fontes no contexto e citação obrigatória, a resposta passa a ter base e pode ser conferida.",
      lesson: "04-10",
    },
    {
      id: "dpo-models",
      prompt: "Por que o DPO costuma ser mais barato de treinar que o RLHF com PPO?",
      options: [
        "Porque usa menos pares de preferência",
        "Porque dispensa o modelo de recompensa e o modelo de valor: carrega só a política e a referência",
        "Porque não precisa de um modelo SFT antes",
        "Porque treina só a camada de saída",
      ],
      correct: 1,
      explanation: "O RLHF com PPO mantém quatro modelos no treino (política, referência, recompensa e valor). O DPO aplica a perda de preferência direto na política, com uma referência congelada.",
      lesson: "04-13",
    },
  ],
};

export default quiz;
