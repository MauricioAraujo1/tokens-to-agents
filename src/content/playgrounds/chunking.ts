// Conteúdo do playground de chunk size e overlap. Conteúdo didático em PT-BR (AD-003).

export const chunkingContent = {
  title: "Chunk size e overlap",
  observe:
    "Chunks pequenos dão buscas precisas, mas cortam ideias no meio; chunks grandes guardam contexto, mas diluem o trecho que interessa. O overlap repete o fim de um chunk no começo do próximo para nenhuma frase ficar órfã, ao custo de mais chunks para gerar embedding e guardar. Overlap igual ou maior que o tamanho não anda, por isso é rejeitado.",
  sizeLabel: "Tamanho do chunk",
  sizeHint: "em palavras",
  overlapLabel: "Overlap",
  overlapHint: "palavras repetidas entre chunks vizinhos",
  caption: (words: number, chunks: number, size: number, overlap: number) =>
    `${words} palavras → ${chunks} chunks de até ${size} palavras, com ${overlap} de overlap`,
  overlapError: "O overlap precisa ser menor que o tamanho do chunk. Diminua o overlap ou aumente o chunk.",
  chunksLabel: "Chunks gerados",
  chunk: (n: number, from: number, to: number) => `Chunk ${n} · palavras ${from}–${to}`,
  stages: {
    document: (words: number) => `Documento · ${words} palavras`,
    splitter: (size: number, overlap: number) => `Chunker · ${size}/${overlap}`,
    chunks: (count: number) => `${count} chunks`,
    embeddings: "Embeddings",
  },
  initial: { size: 20, overlap: 5 },
  limits: { size: { min: 4, max: 40 }, overlap: { min: 0, max: 20 } },
  // Exatamente 60 palavras.
  text: "Um sistema RAG começa dividindo os documentos em pedaços chamados chunks. Cada chunk vira um embedding e vai para o banco vetorial. Na hora da pergunta, o sistema busca os chunks mais parecidos e coloca esses trechos no prompt. O tamanho do chunk e o overlap entre chunks vizinhos decidem quanto contexto cada trecho carrega e quanto custa indexar tudo.",
};
