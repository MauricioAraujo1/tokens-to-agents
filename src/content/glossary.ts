import type { LessonId } from "../types/content";

// Glossário dos termos técnicos em inglês (CNT-01.2). Os passos das aulas marcam
// os termos como [[termo|id]], e a busca indexa o termo e a explicação (SRCH-01.2).

export interface GlossaryEntry {
  id: string;
  /** Termo em inglês, como aparece no texto. */
  term: string;
  /** Explicação curta em PT-BR. */
  explanation: string;
  /** Aula que ensina o termo. */
  lesson: LessonId;
}

export const glossary: GlossaryEntry[] = [
  // Módulo 03: Transformers Architecture.
  {
    id: "language-model",
    term: "Language Model",
    explanation: "Modelo que estima a probabilidade da próxima palavra ou token a partir do texto anterior.",
    lesson: "03-01",
  },
  {
    id: "tokenization",
    term: "Tokenization",
    explanation: "Divisão do texto em tokens, as unidades que o modelo recebe e gera.",
    lesson: "03-02",
  },
  {
    id: "token",
    term: "Token",
    explanation: "Pedaço de texto (palavra, parte de palavra ou símbolo) mapeado para um id do vocabulário.",
    lesson: "03-03",
  },
  {
    id: "vocabulary",
    term: "Vocabulary",
    explanation: "Conjunto fixo de tokens que o tokenizador conhece, cada um com o seu id.",
    lesson: "03-03",
  },
  {
    id: "bpe",
    term: "Byte Pair Encoding (BPE)",
    explanation: "Algoritmo de tokenização que junta, passo a passo, os pares de símbolos mais frequentes.",
    lesson: "03-04",
  },
  {
    id: "embedding",
    term: "Embedding",
    explanation: "Vetor de números que representa o significado de um token ou texto; sentidos parecidos ficam próximos.",
    lesson: "03-05",
  },
  {
    id: "positional-encoding",
    term: "Positional Encoding",
    explanation: "Informação de posição somada aos embeddings para o modelo saber a ordem dos tokens.",
    lesson: "03-06",
  },
  {
    id: "attention",
    term: "Attention",
    explanation: "Mecanismo de atenção: cada token pondera os outros tokens para decidir o que é relevante.",
    lesson: "03-07",
  },
  {
    id: "softmax",
    term: "Softmax",
    explanation: "Função que transforma scores em pesos positivos que somam 1.",
    lesson: "03-07",
  },
  {
    id: "self-attention",
    term: "Self-Attention",
    explanation: "Atenção de uma sequência sobre ela mesma: cada token olha para todos os tokens da mesma frase.",
    lesson: "03-08",
  },
  {
    id: "causal-mask",
    term: "Causal Mask",
    explanation: "Máscara que impede um token de olhar para os tokens seguintes durante a geração.",
    lesson: "03-08",
  },
  {
    id: "query",
    term: "Query",
    explanation: "Vetor que representa o que um token procura nos outros tokens.",
    lesson: "03-09",
  },
  {
    id: "key",
    term: "Key",
    explanation: "Vetor que representa o que um token oferece; comparado com a query para gerar o score.",
    lesson: "03-09",
  },
  {
    id: "value",
    term: "Value",
    explanation: "Vetor com o conteúdo que um token passa adiante, ponderado pelos pesos de atenção.",
    lesson: "03-09",
  },
  {
    id: "multi-head-attention",
    term: "Multi-Head Attention",
    explanation: "Várias atenções em paralelo, cada cabeça aprendendo um tipo diferente de relação entre tokens.",
    lesson: "03-10",
  },
  {
    id: "feed-forward-network",
    term: "Feed Forward Network",
    explanation: "Rede densa aplicada a cada token depois da atenção, dentro de cada bloco do Transformer.",
    lesson: "03-11",
  },
  {
    id: "encoder",
    term: "Encoder",
    explanation: "Parte do Transformer que lê a entrada inteira e gera representações de cada token.",
    lesson: "03-12",
  },
  {
    id: "decoder",
    term: "Decoder",
    explanation: "Parte do Transformer que gera a saída um token por vez, olhando só para o que já foi gerado.",
    lesson: "03-12",
  },
  {
    id: "transformer",
    term: "Transformer",
    explanation: "Arquitetura de rede neural baseada em atenção, base dos LLMs atuais.",
    lesson: "03-13",
  },
  {
    id: "pre-training",
    term: "Pre-training",
    explanation: "Treino inicial em muito texto, prevendo o próximo token, antes de qualquer ajuste para tarefas.",
    lesson: "03-14",
  },
  {
    id: "hugging-face",
    term: "Hugging Face",
    explanation: "Plataforma e bibliotecas abertas para baixar, treinar e publicar modelos e datasets.",
    lesson: "03-15",
  },
  {
    id: "n-gram",
    term: "n-gram",
    explanation: "Sequência de n palavras seguidas; o modelo n-gram prevê a próxima palavra contando as n − 1 anteriores.",
    lesson: "03-01",
  },
  {
    id: "subword",
    term: "Subword",
    explanation: "Pedaço de palavra usado como token: palavras comuns ficam inteiras e raras viram vários pedaços.",
    lesson: "03-02",
  },
  {
    id: "oov",
    term: "Out-of-Vocabulary (OOV)",
    explanation: "Palavra que não está no vocabulário; em tokenizadores por palavra, vira o token genérico [UNK].",
    lesson: "03-02",
  },
  {
    id: "special-token",
    term: "Special Token",
    explanation: "Token inserido pelo tokenizador para marcar estrutura, como início, fim, separação ou papel no chat.",
    lesson: "03-03",
  },
  {
    id: "logit",
    term: "Logit",
    explanation: "Pontuação bruta que o modelo dá a cada token do vocabulário, antes do softmax.",
    lesson: "04-03",
  },
  {
    id: "one-hot",
    term: "One-hot",
    explanation: "Vetor do tamanho do vocabulário com 1 na posição do token e 0 no resto.",
    lesson: "03-05",
  },
  {
    id: "word2vec",
    term: "word2vec",
    explanation: "Método de 2013 que aprende um vetor fixo por palavra prevendo as palavras vizinhas.",
    lesson: "03-05",
  },
  {
    id: "rope",
    term: "RoPE (Rotary Position Embedding)",
    explanation: "Codificação de posição que gira query e key por um ângulo proporcional à posição do token.",
    lesson: "03-06",
  },
  {
    id: "rnn",
    term: "Recurrent Neural Network (RNN)",
    explanation: "Rede que lê a sequência um token por vez e carrega um estado oculto com o resumo do que já leu.",
    lesson: "02-09",
  },
  {
    id: "lstm",
    term: "LSTM",
    explanation: "Long Short-Term Memory: RNN com portões que decidem o que guardar e o que esquecer no estado.",
    lesson: "02-09",
  },
  {
    id: "seq2seq",
    term: "sequence-to-sequence (seq2seq)",
    explanation: "Modelo em que um encoder lê a sequência de entrada e um decoder gera a sequência de saída.",
    lesson: "03-12",
  },
  {
    id: "cross-attention",
    term: "Cross-Attention",
    explanation: "Attention em que as queries vêm de uma sequência e as keys e values de outra, como o decoder consultando o encoder.",
    lesson: "03-12",
  },
  {
    id: "kv-cache",
    term: "KV cache",
    explanation: "Memória que guarda as keys e os values dos tokens já processados, para a geração não refazer essas contas.",
    lesson: "10-05",
  },
  {
    id: "grouped-query-attention",
    term: "Grouped-Query Attention (GQA)",
    explanation: "Variante da multi-head em que grupos de cabeças de query compartilham as mesmas keys e values, o que encolhe o KV cache.",
    lesson: "03-10",
  },
  {
    id: "relu",
    term: "ReLU",
    explanation: "Função de ativação max(0, x): deixa passar valores positivos e zera os negativos.",
    lesson: "02-04",
  },
  {
    id: "mixture-of-experts",
    term: "Mixture of Experts (MoE)",
    explanation: "Camada com várias redes feed-forward (experts) e um roteador que escolhe poucas delas para cada token.",
    lesson: "03-11",
  },
  {
    id: "autoregressive",
    term: "Autoregressive",
    explanation: "Geração em que cada token novo é previsto a partir dos anteriores e acrescentado à entrada da próxima previsão.",
    lesson: "04-02",
  },
  {
    id: "masked-language-modeling",
    term: "Masked Language Modeling (MLM)",
    explanation: "Pré-treino do BERT: parte dos tokens é escondida com [MASK] e o modelo prevê os originais olhando os dois lados.",
    lesson: "03-12",
  },
  {
    id: "residual-connection",
    term: "Residual Connection",
    explanation: "Atalho que soma a entrada de uma subcamada à saída dela (x + f(x)); a subcamada só calcula uma correção.",
    lesson: "03-13",
  },
  {
    id: "layer-norm",
    term: "Layer Normalization",
    explanation: "Normalização de cada vetor para média 0 e desvio 1, seguida de ganho e deslocamento aprendidos.",
    lesson: "03-13",
  },
  {
    id: "cross-entropy",
    term: "Cross-Entropy",
    explanation: "Perda −log p da probabilidade que o modelo deu à resposta certa; é zero quando p = 1 e cresce quando p cai.",
    lesson: "01-12",
  },
  {
    id: "perplexity",
    term: "Perplexity",
    explanation: "e elevado à perda média: o número efetivo de tokens entre os quais o modelo hesita a cada previsão.",
    lesson: "03-14",
  },
  {
    id: "teacher-forcing",
    term: "Teacher Forcing",
    explanation: "Treino em que a entrada de cada posição é o texto verdadeiro, não o que o modelo geraria antes.",
    lesson: "03-14",
  },
  {
    id: "model-card",
    term: "Model Card",
    explanation: "Documento que acompanha um modelo publicado: uso previsto, dados de treino, avaliação, limitações e licença.",
    lesson: "03-15",
  },
  {
    id: "safetensors",
    term: "safetensors",
    explanation: "Formato de arquivo de pesos que guarda só os tensores, sem código executável, e carrega por mapeamento de memória.",
    lesson: "03-15",
  },
  {
    id: "lora",
    term: "LoRA (Low-Rank Adaptation)",
    explanation: "Ajuste fino que congela os pesos do modelo e treina só um desvio de posto baixo, B · A, em algumas matrizes.",
    lesson: "11-08",
  },

  // Aula 08.02: RAG Architecture.
  {
    id: "rag",
    term: "Retrieval-Augmented Generation (RAG)",
    explanation: "Geração aumentada por recuperação: o modelo responde com trechos buscados nos seus documentos.",
    lesson: "08-01",
  },
  {
    id: "chunk",
    term: "Chunk",
    explanation: "Trecho de um documento, do tamanho certo para ser indexado e enviado ao modelo.",
    lesson: "08-05",
  },
  {
    id: "vector-database",
    term: "Vector Database",
    explanation: "Banco de dados que guarda embeddings e encontra os vetores mais próximos de uma consulta.",
    lesson: "06-10",
  },
  {
    id: "ann",
    term: "Approximate Nearest Neighbors (ANN)",
    explanation: "Busca aproximada dos vizinhos mais próximos, que troca um pouco de precisão por velocidade.",
    lesson: "06-12",
  },
  {
    id: "cosine-similarity",
    term: "Cosine Similarity",
    explanation: "Similaridade pelo cosseno do ângulo entre dois vetores: 1 é a mesma direção.",
    lesson: "06-06",
  },
  {
    id: "top-k",
    term: "Top-K",
    explanation: "Os K resultados com maior score, mantidos depois da ordenação.",
    lesson: "08-08",
  },
  {
    id: "context-window",
    term: "Context Window",
    explanation: "Quantidade máxima de tokens que o modelo consegue ler de uma vez.",
    lesson: "04-05",
  },
  {
    id: "grounding",
    term: "Grounding",
    explanation: "Ancorar a resposta do modelo em fontes recuperadas, para que ela possa ser conferida.",
    lesson: "08-11",
  },
];
