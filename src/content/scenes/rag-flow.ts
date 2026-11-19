import type { DiagramCategory, RagNodeId } from "../../components/diagrams/ragDiagramLayout";

// Conteúdo da cena custom "rag-flow" (aula 08.02). É conteúdo, não interface: fica em
// PT-BR como o resto da aula (AD-003). A geometria fica em ragDiagramLayout.ts.

export interface RagFlowContent {
  title: string;
  description: string;
  nodes: Record<RagNodeId, string>;
  /** Rótulo de cada conexão, pelo id; conexão sem rótulo não mostra pílula. */
  edges: Partial<Record<string, string>>;
  legend: Partial<Record<DiagramCategory, string>>;
  /** Pílula do nó ativo; `{n}` é o número do passo. */
  stepPill: string;
  /** Nó que cada passo destaca, pelo id do passo. */
  stepNodes: Partial<Record<string, RagNodeId>>;
}

export const ragFlowContent: RagFlowContent = {
  title: "Fluxo de uma consulta RAG",
  description:
    "A pergunta do usuário passa pela aplicação, pelo modelo de embedding e pelo banco vetorial. Os trechos recuperados entram no contexto do LLM, que gera a resposta. Se nenhum trecho for relevante, o fluxo segue um caminho alternativo.",
  nodes: {
    user: "Usuário",
    app: "Aplicação",
    embedding: "Embedding",
    vectordb: "Banco vetorial",
    retrieval: "Recuperação",
    context: "Contexto",
    llm: "LLM",
    answer: "Resposta",
    fallback: "Sem resultado",
  },
  edges: {
    "user-app": "pergunta",
    "app-embedding": "query embedding",
    "embedding-vectordb": "similarity score",
    "vectordb-retrieval": "top-k retrieval",
    "context-llm": "context injection",
    "llm-answer": "generated answer",
    "retrieval-fallback": "sem trecho relevante",
  },
  legend: {
    processing: "Requisição e processamento",
    retrieval: "Recuperação",
    context: "Contexto",
    generation: "Geração",
    response: "Resposta",
    error: "Erro / caminho alternativo",
  },
  stepPill: "passo {n}",
  stepNodes: {
    question: "app",
    embedding: "embedding",
    search: "vectordb",
    similarity: "vectordb",
    "top-k": "retrieval",
    chunks: "retrieval",
    context: "context",
    prompt: "context",
    generation: "llm",
    answer: "answer",
  },
};
