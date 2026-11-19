import type { QuizContent } from "../../types/content";

// Quiz do módulo 02 (PRAC-01.1). Cada questão aponta para a aula que ensina o assunto (PRAC-01.4) e
// cobra uma aplicação do conteúdo, não as mesmas perguntas do knowledge check de cada aula.

const quiz: QuizContent = {
  module: "02",
  questions: [
    {
      id: "learned-features",
      prompt: "Um time tenta reconhecer espécies de pássaros em fotos escrevendo à mão detectores de bico, asa e cor. Um colega propõe deep learning. Qual é o argumento central a favor da proposta?",
      options: [
        "Deep learning não precisa de dados rotulados",
        "A rede aprende as próprias features a partir dos pixels, em camadas, em vez de depender de detectores escritos à mão",
        "Deep learning sempre é mais barato de treinar",
        "Redes profundas não erram",
      ],
      correct: 1,
      explanation: "O ganho do deep learning em dados brutos vem da representação aprendida: as camadas descobrem bordas, partes e objetos sozinhas, com exemplos rotulados suficientes.",
      lesson: "02-01",
    },
    {
      id: "first-layer-cost",
      prompt: "Uma rede densa recebe imagens de 64 × 64 pixels em tons de cinza e tem uma camada escondida de 100 neurônios. Quantos parâmetros tem essa primeira camada?",
      options: ["6.400", "409.600", "409.700", "4.096"],
      correct: 2,
      explanation: "São 64 × 64 = 4.096 entradas. A camada tem 4.096 × 100 = 409.600 pesos mais 100 vieses: 409.700.",
      lesson: "02-02",
    },
    {
      id: "neuron-output",
      prompt: "Um neurônio tem pesos [2; −1], viés 0,5 e ativação ReLU. Qual é a saída para a entrada [1; 3]?",
      options: ["0", "−0,5", "0,5", "5,5"],
      correct: 0,
      explanation: "z = 2 · 1 + (−1) · 3 + 0,5 = −0,5. A ReLU devolve max(0, −0,5) = 0.",
      lesson: "02-03",
    },
    {
      id: "batch-shape",
      prompt: "Um lote de 32 exemplos, cada um com 10 features, entra numa camada densa de 64 neurônios. Qual é o formato da saída da camada?",
      options: ["10 × 64", "32 × 10", "32 × 64", "64 × 64"],
      correct: 2,
      explanation: "X (32 × 10) vezes W (10 × 64) dá 32 × 64: uma linha por exemplo, uma coluna por neurônio.",
      lesson: "02-05",
    },
    {
      id: "backprop-memory",
      prompt: "Ao treinar, a memória da GPU acaba, mas a inferência com o mesmo lote cabe tranquila. Qual é a explicação mais provável?",
      options: [
        "Os pesos dobram de tamanho no treino",
        "O treino guarda as ativações de todas as camadas para o backward, além dos gradientes e do estado do otimizador",
        "A inferência não usa a GPU",
        "O backprop apaga as ativações",
      ],
      correct: 1,
      explanation: "O backward usa os valores calculados no forward, então o treino guarda as ativações. Somam-se ainda os gradientes e as médias do otimizador.",
      lesson: "02-06",
    },
    {
      id: "oscillating-loss",
      prompt: "A perda de treino sobe e desce sem parar, sem tendência de queda, desde o primeiro passo. Qual ajuste testar primeiro?",
      options: [
        "Aumentar a taxa de aprendizado",
        "Diminuir a taxa de aprendizado ou usar aquecimento",
        "Tirar o momentum e dobrar a taxa",
        "Treinar por mais épocas com a mesma configuração",
      ],
      correct: 1,
      explanation: "Oscilação forte é sinal de passo grande demais: cada atualização pula o vale. Reduzir a taxa ou aquecer no começo estabiliza.",
      lesson: "02-07",
    },
    {
      id: "conv-params",
      prompt: "Uma camada convolucional recebe uma imagem RGB (3 canais) e tem 16 kernels de 5 × 5. Quantos parâmetros ela tem, contando os vieses?",
      options: ["400", "1.216", "1.200", "75"],
      correct: 1,
      explanation: "Cada kernel tem 5 × 5 × 3 = 75 pesos e 1 viés. Com 16 kernels: 16 × 76 = 1.216, qualquer que seja o tamanho da imagem.",
      lesson: "02-08",
    },
    {
      id: "rnn-training-speed",
      prompt: "Treinar uma RNN em textos longos é muito mais lento por token do que treinar um Transformer do mesmo tamanho na mesma GPU. Por quê?",
      options: [
        "A RNN tem mais parâmetros",
        "Cada estado depende do anterior, então os passos da sequência são calculados em fila e não em paralelo",
        "A RNN não usa multiplicação de matriz",
        "O Transformer não calcula gradientes",
      ],
      correct: 1,
      explanation: "h_t depende de h_(t−1), e isso força uma fila ao longo da sequência. A attention calcula todas as posições ao mesmo tempo.",
      lesson: "02-09",
    },
    {
      id: "gpu-idle",
      prompt: "O monitor mostra a GPU em 40% de uso durante o treino, e a CPU em 100%. O que mais provavelmente resolve?",
      options: [
        "Comprar uma GPU mais rápida",
        "Paralelizar e acelerar o carregamento dos dados, com mais processos preparando lotes",
        "Diminuir a precisão numérica para fp8",
        "Aumentar o número de camadas",
      ],
      correct: 1,
      explanation: "A GPU está esperando lotes: o gargalo é a CPU que prepara os dados. Mais processos de carregamento mantêm a fila cheia.",
      lesson: "02-10",
    },
    {
      id: "data-parallel-batch",
      prompt: "Um treino roda com lote de 64 numa GPU. Ao passar para 8 GPUs com paralelismo de dados e 64 exemplos em cada, o que muda matematicamente?",
      options: [
        "Nada: é o mesmo treino",
        "O gradiente de cada passo passa a ser a média de 512 exemplos, como um lote 8 vezes maior, o que pode pedir ajuste da taxa",
        "Cada GPU passa a treinar um modelo diferente",
        "Os pesos de cada GPU divergem",
      ],
      correct: 1,
      explanation: "O all-reduce tira a média dos 8 gradientes locais, o que equivale a um lote de 8 × 64 = 512. Lotes maiores costumam pedir taxa de aprendizado ajustada.",
      lesson: "02-11",
    },
  ],
};

export default quiz;
