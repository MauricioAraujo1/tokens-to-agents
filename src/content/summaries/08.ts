import { catalog } from "../catalog";
import type { LessonId, SummaryContent } from "../../types/content";

// Cheat sheet do módulo 08 (SUM-01.1). O diagrama é desenhado pelo <Scene> num passo único, e a folha
// tem estilo de impressão em A4 (SUM-01.2). As aulas linkadas saem do catálogo: as 16 do módulo, em ordem.

const lessons: LessonId[] = (catalog.find((module) => module.id === "08")?.lessons ?? []).map((lesson) => lesson.id);

const summary: SummaryContent = {
  module: "08",
  concepts: [
    "RAG junta duas memórias: a paramétrica, nos pesos do modelo, e a não paramétrica, um índice de documentos consultado na hora. Atualizar o conhecimento é reindexar, não treinar de novo, e a resposta pode citar a fonte.",
    "Ingestão: conectar às fontes, extrair, limpar, deduplicar por hash do conteúdo, dividir, gerar embeddings e indexar. A carga incremental processa só o que é novo, mudou ou foi apagado.",
    "Parsing decide o que o resto do pipeline enxerga: ordem de leitura em colunas, tabelas com cabeçalho em cada linha e OCR para páginas escaneadas, que não têm camada de texto.",
    "Chunking: janela fixa, por estrutura (recursivo: parágrafo, linha, palavra) ou semântico (corta onde a similaridade entre frases vizinhas cai). Chunk pequeno acerta a busca; chunk grande traz contexto.",
    "Embeddings: o mesmo modelo para chunks e perguntas, em lotes, com a versão do modelo guardada nos metadados. Trocar o modelo ou o chunking exige reindexar tudo.",
    "Recuperação: o retriever compara o vetor da pergunta com os do índice (exato ou ANN), mantém o top-k e corta pelo limiar de similaridade. Filtros de metadados e permissões entram na própria busca.",
    "Contexto e geração: empacotar os chunks num orçamento de tokens, sem duplicatas, com os melhores nas pontas e cada fonte delimitada e numerada. O prompt pede resposta só com o contexto, citações e abstenção quando falta base.",
    "Além do básico: reescrita da pergunta, multi-query, HyDE, parent-child e compressão (advanced RAG); um agente que decide quando e onde buscar e repete a busca (agentic RAG); avaliação com faithfulness, answer relevance, context precision e context recall antes de qualquer otimização.",
  ],
  formulas: [
    "Chunks = ⌈(N − tamanho) / (tamanho − overlap)⌉ + 1, para N > tamanho (janela deslizante)",
    "Orçamento de contexto = janela − sistema − pergunta − saída reservada",
    "Faithfulness = afirmações sustentadas pelo contexto / afirmações da resposta",
    "Context recall = afirmações da referência presentes no contexto / afirmações da referência",
    "Hit@k = perguntas com um chunk certo entre os k primeiros / total de perguntas",
  ],
  pitfalls: [
    "Indexar e consultar com modelos de embedding diferentes: os scores saem, mas não medem nada.",
    "Confiar no top-k sem limiar: ele sempre devolve K trechos, mesmo para uma pergunta fora da base.",
    "Aplicar o filtro de metadados depois do top-k: a lista encolhe ou zera. E nunca deixar a permissão de leitura só nas instruções do prompt.",
    "Esquecer as remoções na ingestão incremental: o documento sai da fonte, mas os chunks continuam respondendo.",
    "Encher a janela de contexto com tudo o que foi recuperado: mais ruído, mais custo e o trecho certo perdido no meio.",
    "Otimizar sem um conjunto de avaliação: sem medir antes e depois, não dá para saber se a mudança ajudou.",
  ],
  diagram: {
    kind: "pieces",
    layout: "single",
    pieces: [
      {
        id: "module-08",
        piece: "block-diagram",
        blocks: [
          { id: "docs", kind: "documents", label: "documentos", col: 0, row: 0 },
          { id: "embedding", kind: "embedding", label: "chunks + embeddings", col: 1, row: 0 },
          { id: "index", kind: "vector-db", label: "índice", col: 2, row: 0 },
          { id: "retrieval", kind: "retrieval", label: "top-k + filtros", col: 2, row: 1 },
          { id: "context", kind: "context", label: "contexto", col: 1, row: 1 },
          { id: "llm", kind: "llm", label: "resposta com fontes", col: 0, row: 1 },
        ],
        edges: [
          { from: "docs", to: "embedding", label: "ingestão" },
          { from: "embedding", to: "index" },
          { from: "index", to: "retrieval", label: "pergunta" },
          { from: "retrieval", to: "context" },
          { from: "context", to: "llm" },
        ],
        active: "retrieval",
      },
    ],
  },
  lessons,
};

export default summary;
