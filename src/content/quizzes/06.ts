import type { QuizContent } from "../../types/content";

// Quiz do módulo 06 (PRAC-01.1). Cada questão aponta para a aula que ensina o assunto (PRAC-01.4) e
// cobra uma aplicação do conteúdo, não as mesmas perguntas do knowledge check de cada aula.

const quiz: QuizContent = {
  module: "06",
  questions: [
    {
      id: "duplicate-tickets",
      prompt:
        "Um time de suporte quer achar chamados duplicados, escritos com palavras diferentes (“não consigo logar” e “o acesso dá erro de senha”). Como embeddings ajudam?",
      options: [
        "Contando as palavras em comum entre os chamados",
        "Transformando cada chamado num vetor e procurando os vizinhos mais próximos de cada chamado novo",
        "Traduzindo os chamados para inglês",
        "Ordenando os chamados por data",
      ],
      correct: 1,
      explanation:
        "Chamados com o mesmo sentido viram vetores próximos, mesmo sem palavras em comum. Buscar os vizinhos de um chamado novo revela os prováveis duplicados.",
      lesson: "06-01",
    },
    {
      id: "domain-pairs",
      prompt:
        "Um modelo de embedding treinado com perguntas da web vai mal em cláusulas de contrato: aproxima cláusulas de assuntos diferentes. O que mais provavelmente melhora o resultado?",
      options: [
        "Aumentar o k da busca",
        "Ajustar o modelo com aprendizado contrastivo em pares do próprio domínio, como cláusula e resumo",
        "Trocar o cosseno pela distância euclidiana",
        "Cortar os vetores pela metade",
      ],
      correct: 1,
      explanation: "O modelo aprende o tipo de semelhança que os pares de treino ensinam. Pares do domínio jurídico ensinam o que é parecido em contratos.",
      lesson: "06-02",
    },
    {
      id: "missing-prefix",
      prompt:
        "Um sistema usa um modelo da família E5, mas indexa os documentos e envia as perguntas sem os prefixos “passage: ” e “query: ”. O que acontece?",
      options: [
        "A API devolve um erro",
        "A busca funciona, mas pior do que poderia, sem nenhum aviso",
        "Os vetores saem com outra dimensão",
        "Nada: os prefixos são opcionais e não mudam o vetor",
      ],
      correct: 1,
      explanation: "O modelo foi treinado vendo os prefixos. Sem eles, a entrada fica diferente do treino e a qualidade cai em silêncio.",
      lesson: "06-03",
    },
    {
      id: "high-cosines",
      prompt:
        "Num modelo novo, quase todos os pares de trechos têm cosseno entre 0,75 e 0,95, inclusive os sem relação. Qual é a leitura correta?",
      options: [
        "Todos os trechos são parecidos entre si",
        "O espaço é anisotrópico: os valores absolutos dizem pouco, e o que importa é a ordem e a diferença entre os scores",
        "O modelo está quebrado e precisa ser trocado",
        "É preciso aumentar a dimensão dos vetores",
      ],
      correct: 1,
      explanation: "Muitos modelos põem os vetores num cone estreito. Os cossenos ficam altos para todo mundo, mas a ordem dos vizinhos continua informativa.",
      lesson: "06-04",
    },
    {
      id: "float16-memory",
      prompt: "Quanto ocupam 3 milhões de vetores de 1.536 dimensões guardados em float16, sem contar índice e metadados?",
      options: ["Cerca de 4,6 GB", "Cerca de 9,2 GB", "Cerca de 18,4 GB", "Cerca de 0,6 GB"],
      correct: 1,
      explanation: "3.000.000 × 1.536 × 2 bytes = 9.216.000.000 bytes, cerca de 9,2 GB. Em float32 seriam 18,4 GB.",
      lesson: "06-05",
    },
    {
      id: "normalized-metrics",
      prompt:
        "Todos os vetores da base e da consulta foram normalizados para comprimento 1. Ao trocar o índice de cosseno para distância euclidiana, o que muda na ordem dos resultados?",
      options: [
        "A ordem se inverte",
        "Nada: para vetores unitários, |a − b|² = 2 − 2·cos, e as duas métricas dão o mesmo ranking",
        "Os vetores mais longos sobem na lista",
        "Os scores ficam negativos",
      ],
      correct: 1,
      explanation: "Com normas iguais a 1, a distância euclidiana é uma função decrescente do cosseno. A ordem é idêntica; só os valores mudam.",
      lesson: "06-06",
    },
    {
      id: "popular-items",
      prompt:
        "Num sistema de recomendação com produto escalar, os mesmos itens populares aparecem para quase todo mundo. Qual é a explicação mais provável?",
      options: [
        "O produto escalar ignora o tamanho dos vetores",
        "Os vetores dos itens populares são mais compridos, e o produto escalar dá pontos ao tamanho além da direção",
        "O índice está desatualizado",
        "O cosseno seria ainda mais enviesado para popularidade",
      ],
      correct: 1,
      explanation:
        "q · d = |q| |d| cos. Vetores longos ganham mesmo sem ser os mais alinhados. Às vezes isso é desejado; se não for, normalize ou use cosseno.",
      lesson: "06-07",
    },
    {
      id: "ivf-boundary",
      prompt:
        "Um índice IVF perde vizinhos verdadeiros em consultas que caem entre dois grupos de documentos. Qual ajuste resolve sem reconstruir o índice?",
      options: [
        "Diminuir o número de listas",
        "Aumentar o nprobe, para a busca visitar também as listas vizinhas",
        "Trocar o modelo de embedding",
        "Apagar os documentos da fronteira",
      ],
      correct: 1,
      explanation: "Vizinhos na fronteira moram na lista ao lado. Visitar mais listas os recupera, ao custo de mais comparações por consulta.",
      lesson: "06-09",
    },
    {
      id: "selective-filter",
      prompt:
        "Uma busca com pós-filtro pede 10 resultados com o filtro “categoria = garantia”, que vale para 2% da base. O índice devolve 50 candidatos antes do filtro. Quantos resultados sobram, em média?",
      options: ["10", "5", "1", "50"],
      correct: 2,
      explanation:
        "50 × 0,02 = 1 resultado esperado. Para filtros seletivos, a saída é filtrar antes ou durante a busca, ou pedir cerca de 10 ÷ 0,02 = 500 candidatos.",
      lesson: "06-11",
    },
    {
      id: "greedy-local-minimum",
      prompt: "Por que a busca no HNSW guarda uma lista de ef candidatos em vez de andar só para o vizinho mais próximo?",
      options: [
        "Para usar menos memória",
        "Porque a busca gulosa pode parar num mínimo local, um ponto sem vizinho melhor que não é o vizinho mais próximo de verdade",
        "Porque o grafo não tem arestas suficientes para uma busca gulosa",
        "Para devolver resultados em ordem aleatória",
      ],
      correct: 1,
      explanation:
        "Com só um caminho, a busca não aceita se afastar para contornar uma região vazia. Guardar ef candidatos explora alternativas e aumenta o recall.",
      lesson: "06-12",
    },
  ],
};

export default quiz;
