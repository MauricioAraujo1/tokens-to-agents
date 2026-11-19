import type { GlossaryEntry } from "../glossary";

// Termos do módulo 02: Deep Learning. ReLU, RNN, LSTM, softmax e logit já estão em glossary.ts;
// neural-network, deep-learning, feature, parameter, gpu e inference, em glossary/00.ts;
// gradient, gradient-descent, learning-rate e sgd, em glossary/01.ts.

const entries: GlossaryEntry[] = [
  {
    id: "representation-learning",
    term: "Representation Learning",
    explanation: "Aprender as próprias features a partir de dados brutos, camada por camada, em vez de recebê-las prontas de uma pessoa.",
    lesson: "02-01",
  },
  {
    id: "hidden-layer",
    term: "Hidden Layer",
    explanation: "Camada entre a entrada e a saída da rede. Ninguém vê os valores dela diretamente: são as features que a rede aprendeu.",
    lesson: "02-02",
  },
  {
    id: "multilayer-perceptron",
    term: "Multilayer Perceptron (MLP)",
    explanation: "Rede de camadas densas: cada neurônio de uma camada liga com todos os da seguinte, com uma ativação entre as camadas.",
    lesson: "02-02",
  },
  {
    id: "neuron",
    term: "Neuron",
    explanation: "Unidade da rede que soma as entradas multiplicadas por pesos, acrescenta um viés e aplica uma função de ativação.",
    lesson: "02-03",
  },
  {
    id: "weight",
    term: "Weight",
    explanation: "Número que multiplica uma entrada do neurônio: o sinal diz a direção da influência e o tamanho diz a força. É ajustado no treino.",
    lesson: "02-03",
  },
  {
    id: "bias",
    term: "Bias",
    explanation: "Viés: número somado à soma ponderada do neurônio, independente das entradas. Funciona como um limiar ajustável.",
    lesson: "02-03",
  },
  {
    id: "activation-function",
    term: "Activation Function",
    explanation: "Função não linear aplicada à soma de cada neurônio. Sem ela, camadas empilhadas equivalem a uma camada linear só.",
    lesson: "02-04",
  },
  {
    id: "sigmoid",
    term: "Sigmoid",
    explanation: "Função 1 / (1 + e^(−z)), que espreme qualquer número entre 0 e 1. Usada na saída de tarefas de sim ou não.",
    lesson: "02-04",
  },
  {
    id: "tanh",
    term: "tanh",
    explanation: "Tangente hiperbólica: ativação que espreme os valores entre −1 e 1, com centro no zero.",
    lesson: "02-04",
  },
  {
    id: "gelu",
    term: "GELU",
    explanation: "Gaussian Error Linear Unit, x · Φ(x): parecida com a ReLU, mas suave perto do zero. É a ativação do BERT e do GPT-2.",
    lesson: "02-04",
  },
  {
    id: "vanishing-gradient",
    term: "Vanishing Gradient",
    explanation: "Gradiente que encolhe ao voltar por muitas camadas ou passos de tempo, porque é multiplicado por fatores menores que 1. As primeiras camadas quase não aprendem.",
    lesson: "02-04",
  },
  {
    id: "forward-propagation",
    term: "Forward Propagation",
    explanation: "Passada de ida: calcular a saída da rede a partir da entrada, camada por camada.",
    lesson: "02-05",
  },
  {
    id: "tensor",
    term: "Tensor",
    explanation: "Arranjo de números com qualquer número de eixos: escalar, vetor, matriz ou mais. É a estrutura de dados dos frameworks de deep learning.",
    lesson: "02-05",
  },
  {
    id: "flops",
    term: "FLOPs",
    explanation: "Operações de ponto flutuante: a medida de quanta conta um modelo faz. Uma camada densa gasta cerca de 2 FLOPs por peso por exemplo.",
    lesson: "02-05",
  },
  {
    id: "backpropagation",
    term: "Backpropagation",
    explanation: "Algoritmo que calcula o gradiente da perda em relação a todos os parâmetros, aplicando a regra da cadeia da saída para a entrada.",
    lesson: "02-06",
  },
  {
    id: "chain-rule",
    term: "Chain Rule",
    explanation: "Regra da cadeia: a derivada de funções compostas é o produto das derivadas de cada etapa.",
    lesson: "02-06",
  },
  {
    id: "computational-graph",
    term: "Computational Graph",
    explanation: "Grafo em que cada nó é uma operação simples e as arestas levam os valores entre elas. É por ele que o backprop caminha.",
    lesson: "02-06",
  },
  {
    id: "autograd",
    term: "Autograd",
    explanation: "Diferenciação automática: o framework grava as operações do forward e calcula os gradientes sozinho no backward.",
    lesson: "02-06",
  },
  {
    id: "momentum",
    term: "Momentum",
    explanation: "Técnica de otimização que soma ao passo atual uma fração do passo anterior, acelerando nas direções constantes e amortecendo o zigue-zague.",
    lesson: "02-07",
  },
  {
    id: "adam",
    term: "Adam",
    explanation: "Otimizador que combina momentum com um passo adaptado a cada parâmetro, dividido pela raiz da média dos gradientes ao quadrado.",
    lesson: "02-07",
  },
  {
    id: "learning-rate-schedule",
    term: "Learning Rate Schedule",
    explanation: "Regra que muda a taxa de aprendizado ao longo do treino, como aquecimento linear seguido de decaimento em cosseno.",
    lesson: "02-07",
  },
  {
    id: "cnn",
    term: "Convolutional Neural Network (CNN)",
    explanation: "Rede que aplica filtros pequenos em todas as posições da imagem, compartilhando os pesos entre posições.",
    lesson: "02-08",
  },
  {
    id: "convolution",
    term: "Convolution",
    explanation: "Operação que desliza um kernel pela entrada e, em cada posição, calcula o produto escalar entre o kernel e a janela coberta.",
    lesson: "02-08",
  },
  {
    id: "convolution-kernel",
    term: "Kernel (Filter)",
    explanation: "Grade pequena de pesos, como 3 × 3, que a convolução aplica em toda a imagem para detectar um padrão.",
    lesson: "02-08",
  },
  {
    id: "feature-map",
    term: "Feature Map",
    explanation: "Saída de um kernel sobre a imagem: um mapa que diz onde, e com que força, o padrão aparece.",
    lesson: "02-08",
  },
  {
    id: "pooling",
    term: "Pooling",
    explanation: "Redução de um mapa de features que resume cada bloco num valor só, como o máximo (max pooling).",
    lesson: "02-08",
  },
  {
    id: "receptive-field",
    term: "Receptive Field",
    explanation: "Região da entrada original que influencia um neurônio. Cresce a cada camada de convolução empilhada.",
    lesson: "02-08",
  },
  {
    id: "hidden-state",
    term: "Hidden State",
    explanation: "Vetor que a RNN atualiza a cada token e que resume o que ela já leu da sequência.",
    lesson: "02-09",
  },
  {
    id: "backpropagation-through-time",
    term: "Backpropagation Through Time (BPTT)",
    explanation: "Backpropagation aplicado à RNN desenrolada no tempo, do último passo da sequência até o primeiro.",
    lesson: "02-09",
  },
  {
    id: "gru",
    term: "GRU",
    explanation: "Gated Recurrent Unit: RNN com dois portões, uma versão mais enxuta da LSTM.",
    lesson: "02-09",
  },
  {
    id: "cuda",
    term: "CUDA",
    explanation: "Plataforma da NVIDIA para programar GPUs com milhares de threads em paralelo. É a base do PyTorch em GPU.",
    lesson: "02-10",
  },
  {
    id: "tensor-core",
    term: "Tensor Core",
    explanation: "Unidade das GPUs da NVIDIA que multiplica blocos pequenos de matriz numa instrução só, em precisões como fp16 e bf16.",
    lesson: "02-10",
  },
  {
    id: "arithmetic-intensity",
    term: "Arithmetic Intensity",
    explanation: "FLOPs feitos por byte lido ou escrito na memória. Baixa, a operação espera a memória; alta, ela usa a capacidade de cálculo.",
    lesson: "02-10",
  },
  {
    id: "mixed-precision",
    term: "Mixed Precision",
    explanation: "Treino com as contas pesadas em 16 bits (bf16 ou fp16) e uma cópia dos pesos em fp32 para as atualizações.",
    lesson: "02-10",
  },
  {
    id: "data-parallelism",
    term: "Data Parallelism",
    explanation: "Treino distribuído em que cada GPU tem uma cópia do modelo e processa uma fatia do lote; os gradientes são somados antes do passo.",
    lesson: "02-11",
  },
  {
    id: "all-reduce",
    term: "All-Reduce",
    explanation: "Operação coletiva que soma (ou tira a média de) um valor de todas as GPUs e entrega o resultado a todas.",
    lesson: "02-11",
  },
  {
    id: "gradient-accumulation",
    term: "Gradient Accumulation",
    explanation: "Somar os gradientes de vários mini-lotes antes de um passo do otimizador, simulando um lote maior com a mesma memória.",
    lesson: "02-11",
  },
  {
    id: "zero-sharding",
    term: "ZeRO / FSDP",
    explanation: "Divisão de pesos, gradientes e estado do otimizador entre as GPUs, que buscam as partes que faltam só quando precisam.",
    lesson: "02-11",
  },
  {
    id: "tensor-parallelism",
    term: "Tensor Parallelism",
    explanation: "Divisão de cada multiplicação de matriz de uma camada entre várias GPUs, que trocam os resultados parciais.",
    lesson: "02-11",
  },
  {
    id: "pipeline-parallelism",
    term: "Pipeline Parallelism",
    explanation: "Divisão do modelo em grupos de camadas, cada grupo numa GPU, com os mini-lotes passando de uma para a outra como numa linha de montagem.",
    lesson: "02-11",
  },
];

export default entries;
