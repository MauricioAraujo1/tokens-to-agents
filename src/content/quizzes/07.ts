import type { QuizContent } from "../../types/content";

// Quiz do módulo 07 (PRAC-01.1). Cada questão aponta para a aula que ensina o assunto (PRAC-01.4) e
// cobra uma aplicação do conteúdo, não as mesmas perguntas do knowledge check de cada aula.

const quiz: QuizContent = {
  module: "07",
  questions: [
    {
      id: "stemming-one-side",
      prompt:
        "Os documentos foram indexados com stemming, e “devoluções” virou “devol” no índice. As consultas chegam sem stemming. O que acontece com a consulta “devolução”?",
      options: [
        "Casa normalmente, porque o índice entende variações",
        "Não casa: a consulta procura “devolucao”, e o índice só tem “devol”",
        "Casa com todos os documentos",
        "Gera um erro de sintaxe",
      ],
      correct: 1,
      explanation:
        "Casamento lexical é exato depois da análise. Se só um dos lados passa pelo stemmer, os termos deixam de bater. Indexação e consulta precisam do mesmo analisador.",
      lesson: "07-02",
    },
    {
      id: "common-term-or",
      prompt: "Numa coleção de 10 milhões de documentos, por que uma consulta com OU que inclui “de” fica lenta sem remoção de stopwords?",
      options: [
        "Porque “de” é uma palavra curta",
        "Porque a posting list de “de” tem quase todos os documentos, e a união precisa percorrer essa lista inteira",
        "Porque o índice invertido não guarda palavras curtas",
        "Porque o OU sempre lê a coleção inteira, com ou sem índice",
      ],
      correct: 1,
      explanation:
        "O custo da consulta acompanha o tamanho das posting lists. Um termo presente em quase todo documento tem uma lista quase do tamanho da coleção, e ainda pesa quase zero no ranking.",
      lesson: "07-03",
    },
    {
      id: "tf-idf-compute",
      prompt: "Numa coleção de 1.000 documentos, um termo aparece em 10 deles. Num documento, ele aparece 3 vezes. Qual é o peso tf · log10(N / df)?",
      options: ["0,3", "3", "6", "30"],
      correct: 2,
      explanation: "idf = log10(1.000 / 10) = log10(100) = 2. O peso é tf · idf = 3 · 2 = 6.",
      lesson: "07-04",
    },
    {
      id: "bm25-saturation",
      prompt: "No BM25 com k1 = 1,2 e b = 0 (sem normalização por tamanho), quanto vale a parte de frequência f · (k1 + 1) / (f + k1) para f = 2?",
      options: ["2", "1,375", "2,2", "1"],
      correct: 1,
      explanation:
        "2 · 2,2 / (2 + 1,2) = 4,4 / 3,2 = 1,375. Com f = 1 ela vale 1: a segunda ocorrência acrescenta só 0,375, e o teto é k1 + 1 = 2,2.",
      lesson: "07-05",
    },
    {
      id: "semantic-paraphrase",
      prompt: "A consulta é “como cancelar minha assinatura” e o documento certo se chama “Encerrar o plano mensal”. Qual busca tende a achá-lo?",
      options: [
        "BM25, porque ele pesa termos raros",
        "A busca semântica: não há termo em comum, mas os sentidos são próximos no espaço de embeddings",
        "Nenhuma das duas",
        "Busca booleana com E",
      ],
      correct: 1,
      explanation:
        "Sem palavras em comum, o BM25 dá zero. Um bom modelo de embedding põe “cancelar assinatura” e “encerrar plano” perto, e o cosseno os aproxima.",
      lesson: "07-06",
    },
    {
      id: "sku-and-description",
      prompt:
        "Numa loja, metade das buscas é por código de produto (“SKU 88231-B”) e metade por descrição (“tênis confortável para correr”). Qual desenho atende as duas?",
      options: [
        "Só busca vetorial, porque é mais moderna",
        "Só BM25, porque códigos são exatos",
        "Busca híbrida: BM25 acerta os códigos, a vetorial acerta as descrições, e uma fusão junta as listas",
        "Busca booleana com E",
      ],
      correct: 2,
      explanation:
        "Cada busca falha justamente onde a outra acerta: códigos pedem casamento exato, descrições pedem significado. Rodar as duas e fundir cobre os dois tipos de consulta.",
      lesson: "07-07",
    },
    {
      id: "rrf-compute",
      prompt: "Com RRF e k = 60, um documento é 2º no BM25 e 5º no vetorial. Qual é a pontuação dele?",
      options: [
        "1/2 + 1/5 = 0,70",
        "1/62 + 1/65 ≈ 0,0315",
        "1/(60 + 2 + 5) ≈ 0,0149",
        "(2 + 5) / 60 ≈ 0,117",
      ],
      correct: 1,
      explanation: "Cada ranking soma 1 / (k + posição): 1/62 ≈ 0,0161 e 1/65 ≈ 0,0154, total ≈ 0,0315.",
      lesson: "07-09",
    },
    {
      id: "first-stage-size",
      prompt: "Um time aumenta os candidatos da 1ª etapa de 20 para 200, antes do reranker. O que esperar?",
      options: [
        "Recall maior e latência do reranker cerca de 10 vezes maior",
        "Recall menor e latência igual",
        "Nenhuma mudança, porque o reranker devolve sempre o mesmo top-3",
        "A 1ª etapa passa a precisar de um cross-encoder",
      ],
      correct: 0,
      explanation:
        "Mais candidatos aumentam a chance de o documento certo chegar ao reranker, e cada candidato custa uma passada do modelo: 10 vezes mais pares, cerca de 10 vezes mais tempo de reranking.",
      lesson: "07-10",
    },
    {
      id: "ann-bi-encoder",
      prompt: "Qual dos dois modelos pode ser usado com um índice ANN para buscar em milhões de documentos?",
      options: [
        "O cross-encoder, porque é mais preciso",
        "O bi-encoder, porque os vetores dos documentos existem antes da consulta e podem ser indexados",
        "Os dois, do mesmo jeito",
        "Nenhum dos dois",
      ],
      correct: 1,
      explanation:
        "Um índice ANN organiza vetores prontos. O bi-encoder produz um vetor por documento na indexação; o cross-encoder só produz uma nota por par, na hora da consulta.",
      lesson: "07-11",
    },
    {
      id: "mrr-compute",
      prompt: "Em três consultas, o primeiro resultado relevante aparece em 1º, em 3º e em nenhuma posição do top-10. Qual é o MRR@10?",
      options: ["0,44", "0,67", "0,33", "1"],
      correct: 0,
      explanation: "Os reciprocal ranks são 1, 1/3 e 0. A média é (1 + 0,333 + 0) / 3 ≈ 0,44.",
      lesson: "07-12",
    },
  ],
};

export default quiz;
