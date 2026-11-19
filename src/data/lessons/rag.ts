import type { Lesson } from "../../types/course";

export const RAG_LESSON_ID = "08-03";

export const ragHowItWorksLesson: Lesson = {
  id: RAG_LESSON_ID,
  title: "Como funciona o RAG",
  description:
    "Acompanhe o caminho de uma pergunta: embedding, busca vetorial, recuperação de chunks e geração de uma resposta ancorada nos seus documentos.",
  duration: 12,
  difficulty: "Intermediário",
  status: "in-progress",
  diagram: "rag-flow",
  stats: [
    { label: "Documentos", value: "120 arquivos" },
    { label: "Chunks", value: "1.840 fragmentos" },
    { label: "Embeddings", value: "indexados", isHighlighted: true },
  ],
  objectives: [
    { label: "Transformar a pergunta em um vetor", stepId: "embedding" },
    { label: "Comparar documentos por similaridade", stepId: "similarity" },
    { label: "Escolher os K trechos mais relevantes", stepId: "top-k" },
    { label: "Injetar o contexto no prompt", stepId: "context" },
    { label: "Gerar a resposta com fontes", stepId: "answer" },
  ],
  steps: [
    {
      id: "question",
      title: "A aplicação recebe a pergunta",
      shortTitle: "Pergunta",
      description:
        "A pergunta chega à aplicação em linguagem natural. Ainda não há busca: o sistema precisa primeiro entender o significado do que foi perguntado.",
      tip: "O RAG começa antes da busca: uma pergunta ambígua gera trechos ambíguos.",
      changes: ["A pergunta do usuário foi recebida pela aplicação."],
      diagramNodeId: "app",
      badge: "concept",
    },
    {
      id: "embedding",
      title: "O modelo de embedding gera um vetor",
      shortTitle: "Embedding",
      description:
        "A pergunta passa por um modelo de embedding, que a transforma em um vetor numérico. Perguntas com sentidos parecidos ficam próximas nesse espaço, mesmo usando palavras diferentes.",
      tip: "Use o mesmo modelo de embedding na indexação e na consulta. Modelos diferentes produzem espaços vetoriais incompatíveis.",
      changes: ["O vetor da pergunta foi gerado.", "O vetor tem a mesma dimensão dos documentos indexados."],
      diagramNodeId: "embedding",
      badge: "solution",
    },
    {
      id: "search",
      title: "O banco vetorial recebe a consulta",
      shortTitle: "Busca",
      description:
        "O vetor da pergunta é enviado ao banco vetorial, que procura entre os embeddings armazenados os candidatos mais próximos. Em bases grandes, isso usa índices aproximados (ANN) em vez de comparar todos os vetores.",
      tip: "Índices aproximados trocam uma pequena perda de precisão por uma busca muito mais rápida.",
      changes: ["A consulta foi enviada ao índice vetorial.", "Os filtros de metadados foram aplicados."],
      diagramNodeId: "vectordb",
      badge: "concept",
    },
    {
      id: "similarity",
      title: "Os documentos são comparados por similaridade",
      shortTitle: "Similaridade",
      description:
        "Cada candidato recebe um score de similaridade com a pergunta, geralmente pelo cosseno entre os vetores. Quanto maior o score, mais próximo o trecho está da consulta.",
      tip: "Scores só são comparáveis dentro do mesmo modelo de embedding.",
      changes: ["Os documentos foram comparados.", "Cada candidato recebeu um score de similaridade."],
      diagramNodeId: "vectordb",
      badge: "concept",
    },
    {
      id: "top-k",
      title: "Os K trechos mais relevantes são selecionados",
      shortTitle: "Top-K",
      description:
        "O sistema ordena os candidatos pelo score e mantém apenas os K melhores. Poucos trechos podem deixar a resposta incompleta; muitos aumentam o ruído e o custo de tokens.",
      tip: "Um limiar mínimo de score evita enviar trechos irrelevantes quando nada é bom o suficiente.",
      changes: ["Os três trechos mais relevantes foram selecionados.", "Trechos abaixo do limiar foram descartados."],
      diagramNodeId: "retrieval",
      badge: "warning",
    },
    {
      id: "chunks",
      title: "Os chunks recuperados são carregados",
      shortTitle: "Chunks",
      description:
        "O banco guarda vetores; o texto legível dos trechos escolhidos vem do armazenamento dos documentos. Cada chunk é carregado com o seu contexto de origem.",
      tip: "Guarde o texto do chunk junto com os metadados (fonte, página, data) para citar a origem na resposta.",
      changes: ["Os textos dos três chunks foram carregados.", "Cada chunk mantém a fonte do documento."],
      diagramNodeId: "retrieval",
      badge: "concept",
    },
    {
      id: "context",
      title: "O contexto é injetado no prompt",
      shortTitle: "Contexto",
      description:
        "Os trechos recuperados são inseridos no contexto do modelo. É assim que o LLM passa a usar o conteúdo dos seus documentos, sem nenhum re-treinamento.",
      tip: "Delimite bem cada trecho e ordene-os com critério: o modelo presta mais atenção ao início e ao fim do contexto.",
      changes: ["Os chunks foram inseridos no contexto.", "Instruções de citação foram adicionadas ao prompt."],
      diagramNodeId: "context",
      badge: "solution",
    },
    {
      id: "prompt",
      title: "O prompt final é montado",
      shortTitle: "Prompt",
      description:
        "Instruções do sistema, pergunta do usuário e contexto recuperado são combinados em um único prompt. O total de tokens precisa caber na janela de contexto do modelo.",
      tip: "Se o contexto não couber na janela, reduza K ou resuma os trechos antes de enviar.",
      changes: ["O prompt final respeita o limite de tokens.", "A pergunta e o contexto foram combinados."],
      diagramNodeId: "context",
      badge: "concept",
    },
    {
      id: "generation",
      title: "O LLM gera a resposta",
      shortTitle: "Geração",
      description:
        "O modelo lê o prompt e gera a resposta token a token. Como a resposta está ancorada nos trechos recuperados, ela tende a ser mais precisa e verificável.",
      tip: "Grounding não elimina alucinações. Peça ao modelo que responda apenas com o contexto e que diga quando não souber.",
      changes: ["O LLM gerou a resposta com base no contexto."],
      diagramNodeId: "llm",
      badge: "solution",
    },
    {
      id: "answer",
      title: "A resposta volta ao usuário com fontes",
      shortTitle: "Resposta",
      description:
        "A aplicação devolve a resposta ao usuário junto com as fontes dos trechos usados. Quando nenhum trecho passa do limiar, o fluxo alternativo informa que não há base suficiente.",
      tip: "Mostrar as fontes permite ao usuário verificar a resposta e corrigir a base de conhecimento.",
      changes: ["A resposta foi entregue com as fontes citadas."],
      diagramNodeId: "answer",
      badge: "solution",
    },
  ],
};
