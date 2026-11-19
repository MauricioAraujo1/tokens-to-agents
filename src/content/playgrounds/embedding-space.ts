// Conteúdo do playground do espaço de embeddings. Conteúdo didático em PT-BR (AD-003).
// Embeddings 2D de brinquedo: reais de verdade têm centenas de dimensões, mas o cosseno funciona igual.

export const embeddingSpaceContent = {
  title: "Espaço de embeddings",
  observe:
    "O cosseno mede o ângulo entre dois vetores, não a distância entre as pontas: “rei” e “príncipe” apontam quase na mesma direção, mesmo com tamanhos diferentes. Um vetor comparado com ele mesmo dá cosseno 1; vetores perpendiculares dão 0; opostos dão −1. Aumente o k e veja os vizinhos ficando menos parecidos.",
  queryLabel: "Palavra escolhida",
  queryHint: "o ponto de consulta",
  kLabel: "Vizinhos (k)",
  kHint: "quantos vizinhos mais próximos pelo cosseno",
  caption: (word: string, k: number) => `Os ${k} vizinhos de “${word}” pela similaridade de cosseno`,
  neighborsLabel: (word: string) => `Vizinhos de “${word}”, do mais parecido para o menos`,
  neighbor: (word: string, similarity: string) => `${word} · cos ${similarity}`,
  self: (word: string) => `cos(${word}, ${word}) = 1.00`,
  initial: { query: "rei", k: 3 },
  maxK: 6,
  points: [
    { id: "rei", label: "rei", vector: [3, 2.6] },
    { id: "rainha", label: "rainha", vector: [2.6, 3] },
    { id: "principe", label: "príncipe", vector: [2.4, 2] },
    { id: "homem", label: "homem", vector: [3, 0.6] },
    { id: "mulher", label: "mulher", vector: [0.6, 3] },
    { id: "gato", label: "gato", vector: [-2.5, 1] },
    { id: "cachorro", label: "cachorro", vector: [-2.8, 0.6] },
    { id: "peixe", label: "peixe", vector: [-2, -1.5] },
    { id: "carro", label: "carro", vector: [1.5, -2.8] },
    { id: "onibus", label: "ônibus", vector: [2, -2.4] },
    { id: "bicicleta", label: "bicicleta", vector: [1, -2.6] },
  ],
};
