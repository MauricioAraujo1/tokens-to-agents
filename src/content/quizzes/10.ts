import type { QuizContent } from "../../types/content";

// Quiz do módulo 10 (PRAC-01.1). Cada questão aponta para a aula que ensina o assunto (PRAC-01.4) e cobra
// uma aplicação do conteúdo, não as mesmas perguntas do knowledge check de cada aula.

const quiz: QuizContent = {
  module: "10",
  questions: [
    {
      id: "decode-bound",
      prompt:
        "Um time trocou a GPU por outra com o dobro de TFLOPS e a mesma banda de memória. O streaming de um usuário sozinho quase não acelerou. Por quê?",
      options: [
        "Porque o decode de um usuário é limitado pela leitura dos pesos na memória, não pelas contas",
        "Porque a GPU nova precisa de outro modelo",
        "Porque o prefill ficou mais lento",
        "Porque tokens por segundo não dependem do hardware",
      ],
      correct: 0,
      explanation:
        "Cada token do decode relê todos os pesos e faz poucas contas por byte. O tempo é bytes ÷ banda de memória; mais TFLOPS ajudam o prefill, não esse caso.",
      lesson: "10-02",
    },
    {
      id: "latency-formula",
      prompt: "Um sistema tem TTFT de 300 ms e ITL de 20 ms. Quanto tempo leva uma resposta de 101 tokens?",
      options: ["2,02 s", "2,3 s", "320 ms", "6 s"],
      correct: 1,
      explanation: "Latência total = TTFT + (n − 1) × ITL = 0,3 s + 100 × 0,02 s = 2,3 s.",
      lesson: "10-03",
    },
    {
      id: "utilization-headroom",
      prompt:
        "O p99 de um serviço estourou a meta, embora a GPU esteja em 85% de utilização média. Qual é a decisão mais coerente com a teoria de filas?",
      options: [
        "Mandar mais tráfego para a GPU chegar a 100%",
        "Adicionar réplicas ou reduzir a carga por réplica, porque perto da saturação a cauda da latência cresce muito mais rápido que a média",
        "Diminuir o número de réplicas para economizar",
        "Ignorar o p99 e olhar só a média",
      ],
      correct: 1,
      explanation: "Com tempo ∝ 1 / (1 − ρ), os últimos pontos de utilização multiplicam a espera, e o p99 sobe antes da média. Folga é o que protege a meta.",
      lesson: "10-04",
    },
    {
      id: "kv-gqa",
      prompt:
        "Dois modelos têm as mesmas camadas e a mesma dimensão de cabeça; um usa 32 cabeças de key e value, o outro 8 (GQA). Na mesma GPU, o que muda no serviço?",
      options: [
        "Nada: o KV cache só depende do número de camadas",
        "O de GQA guarda 4 vezes menos KV cache por token, e cabem cerca de 4 vezes mais tokens ou pedidos simultâneos",
        "O de GQA precisa de 4 vezes mais memória",
        "O de GQA não usa KV cache",
      ],
      correct: 1,
      explanation: "O cache por token é 2 × camadas × cabeças de KV × dimensão × bytes. Com 8 cabeças de KV em vez de 32, ele cai 4 vezes, e a memória livre comporta 4 vezes mais.",
      lesson: "10-05",
    },
    {
      id: "cache-order",
      prompt:
        "Um app monta o prompt como: data e hora atual, instruções fixas de 5.000 tokens, documento e pergunta. A taxa de acerto do prompt caching é zero. O que corrigir?",
      options: [
        "Aumentar o TTL do cache",
        "Mover a data e hora para depois das partes fixas, porque o cache casa o prefixo token a token e qualquer mudança no começo invalida tudo o que vem depois",
        "Desligar o KV cache",
        "Trocar o modelo por um maior",
      ],
      correct: 1,
      explanation: "Prompt caching reaproveita o maior prefixo idêntico. Um valor que muda a cada pedido no começo do prompt deixa o prefixo comum com zero tokens.",
      lesson: "10-06",
    },
    {
      id: "continuous-vs-static",
      prompt:
        "Num lote estático de 8 pedidos, um deles gera 1.000 tokens e os outros cerca de 50. O que o continuous batching muda?",
      options: [
        "Nada: o lote ainda espera o pedido mais longo",
        "As vagas dos pedidos que terminam são preenchidas por pedidos da fila no passo seguinte, em vez de ficarem ociosas até o pedido de 1.000 tokens acabar",
        "Ele corta a resposta longa em 50 tokens",
        "Ele processa um pedido por vez",
      ],
      correct: 1,
      explanation: "No lote estático, 7 vagas ficam paradas por quase 950 passos. Com escalonamento por iteração, cada vaga livre recebe um pedido novo na hora.",
      lesson: "10-08",
    },
    {
      id: "quantization-fit",
      prompt: "Você precisa servir um modelo de 70B numa única GPU de 80 GB. Qual opção torna isso possível só pela memória dos pesos?",
      options: [
        "fp16, que ocupa cerca de 140 GB",
        "int8, que ocupa cerca de 70 GB e deixa pouco espaço para o KV cache",
        "int4, que ocupa cerca de 35 GB e ainda sobra memória para o KV cache",
        "fp32, por ser mais preciso",
      ],
      correct: 2,
      explanation: "Memória dos pesos = parâmetros × bytes por peso. Em int4, 70 bilhões × 0,5 byte ≈ 35 GB, com espaço para o cache dos pedidos simultâneos.",
      lesson: "10-09",
    },
    {
      id: "paged-waste",
      prompt:
        "Um servidor reserva, para cada pedido, espaço de KV cache para o contexto máximo de 8.192 tokens, mas os pedidos usam em média 900. Que técnica ataca esse desperdício?",
      options: [
        "Aumentar o max_model_len",
        "PagedAttention: alocar o KV cache em blocos pequenos sob demanda, achados por uma tabela de blocos",
        "Speculative decoding",
        "Desligar o batching",
      ],
      correct: 1,
      explanation: "Com reserva contígua pelo máximo, quase 90% do espaço de cada pedido fica vazio. Em blocos sob demanda, o desperdício fica restrito ao último bloco de cada sequência.",
      lesson: "10-11",
    },
    {
      id: "speculative-acceptance",
      prompt:
        "Com speculative decoding, o modelo de rascunho passou a acertar muito menos tokens depois de uma mudança de domínio dos pedidos. O que acontece com o ganho?",
      options: [
        "Aumenta, porque o modelo grande trabalha menos",
        "Cai: com menos tokens aceitos por verificação, o custo do rascunho deixa de compensar, e a resposta continua correta",
        "A resposta passa a ter erros do modelo pequeno",
        "Nada muda",
      ],
      correct: 1,
      explanation: "O modelo grande confere cada proposta, então a qualidade é a dele. O ganho depende da taxa de aceitação: com poucos tokens aceitos, sobra só o custo extra do rascunho.",
      lesson: "10-12",
    },
    {
      id: "routing-threshold",
      prompt:
        "Um roteador manda 80% dos pedidos para um modelo pequeno, mas a taxa de respostas erradas subiu. Qual é o ajuste natural?",
      options: [
        "Mandar todos os pedidos para o modelo pequeno",
        "Rever o limiar do roteador com um conjunto de avaliação, trocando parte da economia por qualidade, ou escalar para o modelo grande quando uma checagem falha",
        "Desligar o modelo grande",
        "Aumentar a temperatura do modelo pequeno",
      ],
      correct: 1,
      explanation: "O limiar decide a mistura de custo e qualidade. Medir os dois no mesmo conjunto mostra onde parar; uma cascata com checagem recupera os casos difíceis.",
      lesson: "10-15",
    },
  ],
};

export default quiz;
