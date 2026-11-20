import type { GlossaryEntry } from "../glossary";

// Termos do módulo 06: Embeddings & Vector Databases.

const entries: GlossaryEntry[] = [
  {
    id: "dense-vector",
    term: "Dense Vector",
    explanation: "Vetor em que todas as posições têm um número real, como os embeddings; o oposto de um vetor esparso, quase todo de zeros.",
    lesson: "06-01",
  },
  {
    id: "contrastive-learning",
    term: "Contrastive Learning",
    explanation: "Treino que aproxima os vetores de pares que combinam (pergunta e resposta) e afasta os que não combinam.",
    lesson: "06-02",
  },
  {
    id: "mean-pooling",
    term: "Mean Pooling",
    explanation: "Resumir os vetores de todos os tokens de um texto pela média deles, ignorando o padding, para ter um vetor só.",
    lesson: "06-02",
  },
  {
    id: "sentence-embedding",
    term: "Sentence Embedding",
    explanation: "Um vetor para uma frase ou trecho inteiro, calculado depois de o modelo ler o texto todo em contexto.",
    lesson: "06-03",
  },
  {
    id: "mteb",
    term: "MTEB (Massive Text Embedding Benchmark)",
    explanation: "Benchmark público de modelos de embedding de texto, com tarefas de busca, agrupamento e classificação em muitos idiomas.",
    lesson: "06-03",
  },
  {
    id: "embedding-space",
    term: "Embedding Space",
    explanation: "O espaço de todos os vetores que um modelo produz, com uma medida de distância; perto nele quer dizer parecido para aquele modelo.",
    lesson: "06-04",
  },
  {
    id: "anisotropy",
    term: "Anisotropy",
    explanation: "Quando os vetores de um modelo ocupam um cone estreito do espaço, e por isso quase qualquer par tem cosseno alto.",
    lesson: "06-04",
  },
  {
    id: "vector",
    term: "Vector",
    explanation: "Lista ordenada de números de tamanho fixo; cada número é uma coordenada num espaço de d dimensões.",
    lesson: "06-05",
  },
  {
    id: "dimension",
    term: "Dimension",
    explanation: "Cada posição de um vetor. A dimensão d de um modelo é quantos números cada vetor dele tem.",
    lesson: "06-05",
  },
  {
    id: "vector-norm",
    term: "Vector Norm",
    explanation: "O comprimento de um vetor: a raiz da soma dos quadrados dos seus números (norma L2).",
    lesson: "06-05",
  },
  {
    id: "curse-of-dimensionality",
    term: "Curse of Dimensionality",
    explanation: "Em muitas dimensões, as distâncias entre pontos aleatórios ficam parecidas e o vizinho mais próximo perde o contraste.",
    lesson: "06-05",
  },
  {
    id: "matryoshka-embedding",
    term: "Matryoshka Embedding",
    explanation: "Embedding treinado para que os primeiros números do vetor já formem um bom vetor menor, que pode ser cortado.",
    lesson: "06-05",
  },
  {
    id: "l2-normalization",
    term: "L2 Normalization",
    explanation: "Dividir o vetor pela sua norma para que ele tenha comprimento 1; aí o produto escalar vira o cosseno.",
    lesson: "06-06",
  },
  {
    id: "cosine-distance",
    term: "Cosine Distance",
    explanation: "1 menos a similaridade de cosseno: 0 para a mesma direção. Não respeita a desigualdade triangular.",
    lesson: "06-06",
  },
  {
    id: "euclidean-distance",
    term: "Euclidean Distance (L2)",
    explanation: "Distância em linha reta entre dois pontos: a raiz da soma dos quadrados das diferenças. Menor é mais parecido.",
    lesson: "06-07",
  },
  {
    id: "dot-product",
    term: "Dot Product",
    explanation: "Soma dos produtos posição a posição de dois vetores; igual a |a| × |b| × cos, então cresce com a direção e com o tamanho.",
    lesson: "06-07",
  },
  {
    id: "mips",
    term: "Maximum Inner Product Search (MIPS)",
    explanation: "Busca dos vetores com o maior produto escalar com a consulta, em vez da menor distância.",
    lesson: "06-07",
  },
  {
    id: "vector-search",
    term: "Vector Search (k-NN Search)",
    explanation: "Dado o vetor da consulta, achar os k vetores mais próximos numa base, pela métrica escolhida.",
    lesson: "06-08",
  },
  {
    id: "brute-force-search",
    term: "Brute-Force Search (Flat)",
    explanation: "Busca vetorial exata que compara a consulta com todos os vetores da base; custo proporcional a N × d.",
    lesson: "06-08",
  },
  {
    id: "vector-index",
    term: "Vector Index",
    explanation: "Estrutura construída com antecedência para que cada busca vetorial visite só uma parte da base, em geral de forma aproximada.",
    lesson: "06-09",
  },
  {
    id: "ivf",
    term: "IVF (Inverted File Index)",
    explanation: "Índice que agrupa os vetores com k-means numa lista por centro; a busca visita só as listas dos centros mais próximos.",
    lesson: "06-09",
  },
  {
    id: "nprobe",
    term: "nprobe",
    explanation: "Quantas listas de um índice IVF a busca visita. Mais listas, mais recall e mais lentidão.",
    lesson: "06-09",
  },
  {
    id: "product-quantization",
    term: "Product Quantization (PQ)",
    explanation: "Compressão que corta o vetor em pedaços e troca cada um pelo código do centro mais parecido num pequeno dicionário.",
    lesson: "06-09",
  },
  {
    id: "vector-collection",
    term: "Collection",
    explanation: "Conjunto de registros de um banco vetorial com a mesma dimensão e a mesma métrica, consultado como uma unidade.",
    lesson: "06-10",
  },
  {
    id: "upsert",
    term: "Upsert",
    explanation: "Escrita que insere o registro se o id não existe e o substitui se já existe.",
    lesson: "06-10",
  },
  {
    id: "metadata-filtering",
    term: "Metadata Filtering",
    explanation: "Busca vetorial restrita aos registros cujo payload passa numa condição, como cliente, idioma ou data.",
    lesson: "06-11",
  },
  {
    id: "pre-filtering",
    term: "Pre-Filtering",
    explanation: "Aplicar o filtro de metadados antes da busca vetorial e buscar só no subconjunto que passou.",
    lesson: "06-11",
  },
  {
    id: "post-filtering",
    term: "Post-Filtering",
    explanation: "Buscar os vizinhos primeiro e só depois descartar os que não passam no filtro; pode devolver menos que k.",
    lesson: "06-11",
  },
  {
    id: "hnsw",
    term: "HNSW (Hierarchical Navigable Small World)",
    explanation: "Índice ANN em grafo com camadas: as de cima têm poucos nós e saltos longos, a de baixo liga cada vetor aos vizinhos.",
    lesson: "06-12",
  },
  {
    id: "ef-search",
    term: "ef (ef_search)",
    explanation: "Tamanho da lista de candidatos da busca no HNSW. Maior, mais recall e mais distâncias calculadas por consulta.",
    lesson: "06-12",
  },
];

export default entries;
