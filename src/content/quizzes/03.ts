import type { QuizContent } from "../../types/content";

// Quiz do módulo 03 (PRAC-01.1). Cada questão aponta para a aula que ensina o assunto (PRAC-01.4) e
// cobra uma aplicação do conteúdo, não as mesmas perguntas do knowledge check de cada aula.

const quiz: QuizContent = {
  module: "03",
  questions: [
    {
      id: "bpe-unseen-word",
      prompt: "Um tokenizador BPE encontra uma palavra que não apareceu no corpus de treino. O que ele faz?",
      options: [
        "Troca a palavra inteira pelo token [UNK]",
        "Quebra a palavra nos pedaços que existem no vocabulário, chegando a caracteres ou bytes se for preciso",
        "Acrescenta a palavra ao vocabulário na hora",
        "Ignora a palavra",
      ],
      correct: 1,
      explanation:
        "O BPE aplica os merges que aprendeu, na ordem. O que não se junta fica em pedaços menores, até os símbolos de base. Com BPE em bytes, qualquer texto tem tokenização, sem [UNK].",
      lesson: "03-04",
    },
    {
      id: "order-without-position",
      prompt:
        "Sem codificação posicional, o que a self-attention produz para “o cão mordeu o homem” e “o homem mordeu o cão”?",
      options: [
        "Vetores diferentes, porque a attention percebe a ordem sozinha",
        "Os mesmos vetores para cada palavra nas duas frases, só em posições trocadas",
        "Um erro, porque a frase tem palavras repetidas",
        "Vetores aleatórios",
      ],
      correct: 1,
      explanation:
        "A attention compara conteúdos, não posições. Sem a informação de posição, trocar a ordem das palavras só troca a ordem das saídas: “cão” sai igual nas duas frases.",
      lesson: "03-06",
    },
    {
      id: "attention-formula",
      prompt: "Qual expressão descreve a self-attention com produto escalar escalado?",
      options: [
        "softmax(Q + K) · V",
        "softmax(Q · Kᵀ / √d_k) · V",
        "Q · K · V / d_k",
        "softmax(V) · Q · Kᵀ",
      ],
      correct: 1,
      explanation:
        "As queries são comparadas com as keys (Q · Kᵀ), a escala é ajustada por √d_k, o softmax transforma cada linha em pesos e os pesos misturam os values.",
      lesson: "03-08",
    },
    {
      id: "change-wv",
      prompt: "Numa cabeça de self-attention, só a matriz W_V muda. O que acontece?",
      options: [
        "Os pesos de attention mudam e a saída continua igual",
        "Os pesos de attention continuam iguais e a saída muda",
        "Nada muda",
        "A máscara causal deixa de funcionar",
      ],
      correct: 1,
      explanation:
        "Os pesos dependem só de queries e keys. W_V muda o conteúdo que cada token entrega, e portanto a mistura que sai, mas não quem olha para quem.",
      lesson: "03-09",
    },
    {
      id: "more-heads-same-params",
      prompt: "Com d_model fixo, por que passar de 8 para 16 cabeças não aumenta os parâmetros da attention?",
      options: [
        "Porque as cabeças novas não têm pesos",
        "Porque d_k cai pela metade: as mesmas matrizes de d_model × d_model são fatiadas em mais pedaços",
        "Porque metade das cabeças é desligada",
        "Porque as cabeças compartilham o mesmo softmax",
      ],
      correct: 1,
      explanation:
        "Cada cabeça usa d_k = d_model / h. Com o dobro de cabeças, cada uma fica com metade das colunas, e a camada continua com 4 · d_model² parâmetros.",
      lesson: "03-10",
    },
    {
      id: "moe-router",
      prompt: "Numa camada mixture of experts, o que o roteador faz com cada token?",
      options: [
        "Manda o token para todos os experts e soma tudo",
        "Escolhe poucos experts (por exemplo, 2 de 8) e combina as saídas deles com os seus pesos",
        "Descarta os tokens menos importantes",
        "Escolhe qual cabeça de attention usar",
      ],
      correct: 1,
      explanation:
        "Cada token passa só pelos experts escolhidos. Assim o modelo tem muitos parâmetros no total, mas cada token usa uma fração deles, como no Mixtral, que ativa 2 de 8.",
      lesson: "03-11",
    },
    {
      id: "classifier-architecture",
      prompt: "Você precisa classificar avaliações de produtos como positivas ou negativas. Qual arquitetura combina melhor com a tarefa?",
      options: [
        "Encoder-only, como o BERT, que lê o texto inteiro nos dois sentidos",
        "Só a tabela de vetores de entrada, sem blocos",
        "Um decoder sem máscara causal na geração",
        "Uma RNN sem attention",
      ],
      correct: 0,
      explanation:
        "Classificar exige entender um texto que já está pronto, não gerar texto. Um encoder usa o contexto dos dois lados de cada token, e um modelo pequeno desse tipo resolve a tarefa com custo baixo.",
      lesson: "03-12",
    },
    {
      id: "tied-weights",
      prompt: "No GPT-2 small, por que a matriz que gera os logits não entra à parte na contagem de 124 milhões de parâmetros?",
      options: [
        "Porque ela não tem pesos",
        "Porque é a mesma tabela de vetores da entrada, transposta: os pesos são compartilhados",
        "Porque ela fica fora do modelo",
        "Porque ela só é usada no treino",
      ],
      correct: 1,
      explanation:
        "O GPT-2 compartilha os pesos da entrada e da saída. A tabela de 50.257 × 768 é contada uma vez só, e a soma dá 124.439.808.",
      lesson: "03-13",
    },
    {
      id: "warmup",
      prompt: "Por que o treino de um Transformer começa com aquecimento da taxa de aprendizado?",
      options: [
        "Para gastar menos energia na GPU",
        "Porque, no começo, os gradientes são grandes e instáveis, e passos grandes podem fazer o treino divergir",
        "Para o modelo aprender o vocabulário primeiro",
        "Porque a perda inicial é zero",
      ],
      correct: 1,
      explanation:
        "Com pesos aleatórios, os gradientes ainda não apontam de forma confiável. Subir a taxa aos poucos evita passos grandes demais; depois, ela decai para ajustes finos.",
      lesson: "03-14",
    },
    {
      id: "fits-gpu",
      prompt: "Uma GPU tem 16 GiB. Considerando só os pesos, qual versão de um modelo de 7 bilhões de parâmetros cabe nela?",
      options: [
        "Só a de 32 bits",
        "A de 16 bits (cerca de 13 GiB) ou uma quantizada",
        "Nenhuma, porque 7 bilhões é mais que 16 bilhões",
        "Qualquer uma, porque os pesos ficam no disco",
      ],
      correct: 1,
      explanation:
        "Memória dos pesos = parâmetros × bytes. Em 32 bits, 7 bilhões × 4 bytes passam de 26 GB; em 16 bits, ficam em cerca de 13 GiB, e a versão quantizada ocupa ainda menos. Sobra pouco para o KV cache.",
      lesson: "03-15",
    },
  ],
};

export default quiz;
