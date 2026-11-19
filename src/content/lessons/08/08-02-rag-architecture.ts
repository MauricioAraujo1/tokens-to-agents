import type { SceneSpec } from "../../../scene/types";
import type { LessonContent } from "../../../types/content";

const ragFlow: SceneSpec = { kind: "custom", id: "rag-flow" };

const lesson: LessonContent = {
  id: "08-02",
  subtitle:
    "Acompanhe o caminho de uma pergunta: embedding, busca vetorial, recuperação de chunks e geração de uma resposta ancorada nos seus documentos.",
  objectives: [
    "Descrever as etapas de um pipeline RAG, da pergunta à resposta com fontes",
    "Explicar por que a consulta e os documentos usam o mesmo modelo de embedding",
    "Escolher o K da recuperação pesando cobertura, ruído e custo de tokens",
    "Montar um prompt que caiba na janela de contexto e cite as fontes",
  ],
  steps: [
    {
      id: "question",
      shortTitle: "Pergunta",
      title: "A aplicação recebe a pergunta",
      tag: "context",
      body: [
        "A pergunta chega à aplicação em linguagem natural. Ainda não há busca: o sistema precisa primeiro entender o significado do que foi perguntado.",
      ],
      keyIdea: "O RAG começa antes da busca: uma pergunta ambígua gera trechos ambíguos.",
      scene: ragFlow,
    },
    {
      id: "embedding",
      shortTitle: "Embedding",
      title: "O modelo de embedding gera um vetor",
      tag: "mechanism",
      body: [
        "A pergunta passa por um modelo de embedding, que a transforma em um vetor numérico. Perguntas com sentidos parecidos ficam próximas nesse espaço, mesmo usando palavras diferentes.",
      ],
      keyIdea:
        "Use o mesmo modelo de embedding na indexação e na consulta. Modelos diferentes produzem espaços vetoriais incompatíveis.",
      scene: ragFlow,
    },
    {
      id: "search",
      shortTitle: "Busca",
      title: "O banco vetorial recebe a consulta",
      tag: "mechanism",
      body: [
        "O vetor da pergunta é enviado ao banco vetorial, que procura entre os embeddings armazenados os candidatos mais próximos. Em bases grandes, isso usa índices aproximados (ANN, Approximate Nearest Neighbors) em vez de comparar todos os vetores.",
      ],
      keyIdea: "Índices aproximados trocam uma pequena perda de precisão por uma busca muito mais rápida.",
      scene: ragFlow,
    },
    {
      id: "similarity",
      shortTitle: "Similaridade",
      title: "Os documentos são comparados por similaridade",
      tag: "mechanism",
      body: [
        "Cada candidato recebe um score de similaridade com a pergunta, geralmente pelo cosseno entre os vetores. Quanto maior o score, mais próximo o trecho está da consulta.",
      ],
      keyIdea: "Scores só são comparáveis dentro do mesmo modelo de embedding.",
      scene: ragFlow,
    },
    {
      id: "top-k",
      shortTitle: "Top-K",
      title: "Os K trechos mais relevantes são selecionados",
      tag: "tradeoff",
      body: [
        "O sistema ordena os candidatos pelo score e mantém apenas os K melhores. Poucos trechos podem deixar a resposta incompleta; muitos aumentam o ruído e o custo de tokens.",
      ],
      keyIdea: "Um limiar mínimo de score evita enviar trechos irrelevantes quando nada é bom o suficiente.",
      scene: ragFlow,
    },
    {
      id: "chunks",
      shortTitle: "Chunks",
      title: "Os chunks recuperados são carregados",
      tag: "mechanism",
      body: [
        "O banco guarda vetores; o texto legível dos trechos escolhidos (os chunks) vem do armazenamento dos documentos. Cada chunk é carregado com o seu contexto de origem.",
      ],
      keyIdea:
        "Guarde o texto do chunk junto com os metadados (fonte, página, data) para citar a origem na resposta.",
      scene: ragFlow,
    },
    {
      id: "context",
      shortTitle: "Contexto",
      title: "O contexto é injetado no prompt",
      tag: "mechanism",
      body: [
        "Os trechos recuperados são inseridos no contexto do modelo. É assim que o LLM passa a usar o conteúdo dos seus documentos, sem nenhum re-treinamento.",
      ],
      keyIdea:
        "Delimite bem cada trecho e ordene-os com critério: o modelo presta mais atenção ao início e ao fim do contexto.",
      scene: ragFlow,
    },
    {
      id: "prompt",
      shortTitle: "Prompt",
      title: "O prompt final é montado",
      tag: "mechanism",
      body: [
        "Instruções do sistema, pergunta do usuário e contexto recuperado são combinados em um único prompt. O total de tokens precisa caber na janela de contexto do modelo.",
      ],
      keyIdea: "Se o contexto não couber na janela, reduza K ou resuma os trechos antes de enviar.",
      scene: ragFlow,
    },
    {
      id: "generation",
      shortTitle: "Geração",
      title: "O LLM gera a resposta",
      tag: "mechanism",
      body: [
        "O modelo lê o prompt e gera a resposta token a token. Como a resposta está ancorada nos trechos recuperados (grounding), ela tende a ser mais precisa e verificável.",
      ],
      keyIdea:
        "Grounding não elimina alucinações. Peça ao modelo que responda apenas com o contexto e que diga quando não souber.",
      scene: ragFlow,
    },
    {
      id: "answer",
      shortTitle: "Resposta",
      title: "A resposta volta ao usuário com fontes",
      tag: "summary",
      body: [
        "A aplicação devolve a resposta ao usuário junto com as fontes dos trechos usados. Quando nenhum trecho passa do limiar, o fluxo alternativo informa que não há base suficiente.",
      ],
      keyIdea: "Mostrar as fontes permite ao usuário verificar a resposta e corrigir a base de conhecimento.",
      scene: ragFlow,
    },
  ],
  realWorldExample:
    "Um assistente de suporte interno responde dúvidas dos funcionários com base no manual de RH e nas políticas da empresa. Os documentos são divididos em chunks, indexados uma vez e reindexados quando mudam. A cada pergunta, o assistente recupera os trechos mais próximos, monta o prompt com eles e responde citando a política e a seção de origem. Quando nenhum trecho passa do limiar, ele diz que não encontrou a resposta e indica o canal de RH, em vez de inventar uma regra.",
  code: {
    language: "python",
    caption:
      "Recuperação top-k com Sentence Transformers e montagem do prompt. Os vetores são normalizados, então o produto escalar é a similaridade de cosseno.",
    source: `import numpy as np
from sentence_transformers import SentenceTransformer

model = SentenceTransformer("all-MiniLM-L6-v2")

chunks = [
    "Férias podem ser divididas em até três períodos.",
    "O reembolso de despesas exige nota fiscal.",
    "O home office é permitido até três dias por semana.",
]
# Indexação: feita uma vez, com o mesmo modelo usado na consulta.
chunk_vectors = model.encode(chunks, normalize_embeddings=True)

def retrieve(question: str, k: int = 2, min_score: float = 0.3) -> list[str]:
    query = model.encode([question], normalize_embeddings=True)[0]
    scores = chunk_vectors @ query
    best = np.argsort(scores)[::-1][:k]
    return [chunks[i] for i in best if scores[i] >= min_score]

def build_prompt(question: str) -> str:
    context = retrieve(question)
    if not context:
        return f"Diga que não há base suficiente para responder: {question}"
    sources = "\\n".join(f"[{i + 1}] {text}" for i, text in enumerate(context))
    return (
        "Responda só com o contexto abaixo e cite as fontes pelo número.\\n"
        f"Contexto:\\n{sources}\\n\\nPergunta: {question}"
    )

print(build_prompt("Posso trabalhar de casa?"))`,
  },
  tradeOffs: {
    pros: [
      "Usa dados privados e atualizados sem re-treinar o modelo",
      "Permite citar as fontes, o que torna a resposta verificável",
      "Atualizar o conhecimento é reindexar documentos, não treinar de novo",
    ],
    cons: [
      "A qualidade depende da recuperação: chunk ruim gera resposta ruim",
      "Cada pergunta custa uma busca e mais tokens de contexto",
      "Grounding reduz, mas não elimina, alucinações",
    ],
    alternatives: [
      "Fine-tuning, quando o objetivo é mudar estilo ou formato, não trazer fatos novos",
      "Janela de contexto longa com os documentos inteiros, quando a base é pequena",
      "Busca híbrida (lexical + vetorial) quando termos exatos importam",
    ],
  },
  knowledgeCheck: [
    {
      id: "same-embedding-model",
      prompt: "Por que a pergunta e os documentos precisam usar o mesmo modelo de embedding?",
      options: [
        "Porque modelos diferentes geram espaços vetoriais incompatíveis",
        "Porque o banco vetorial só aceita um modelo por vez",
        "Porque o LLM lê os vetores diretamente",
        "Porque assim o prompt fica menor",
      ],
      correct: 0,
      explanation:
        "Cada modelo de embedding cria o seu próprio espaço. Comparar um vetor de um modelo com vetores de outro não mede proximidade de sentido.",
      lesson: "08-02",
    },
    {
      id: "choosing-k",
      prompt: "O que acontece quando o K da recuperação é grande demais?",
      options: [
        "A resposta fica sempre mais precisa",
        "Entra mais ruído no contexto e o custo de tokens sobe",
        "O banco vetorial deixa de usar o índice ANN",
        "O modelo de embedding precisa ser trocado",
      ],
      correct: 1,
      explanation:
        "Trechos pouco relevantes competem com os bons pela atenção do modelo e ocupam tokens da janela de contexto.",
      lesson: "08-02",
    },
    {
      id: "no-relevant-chunk",
      prompt: "Nenhum trecho passou do limiar de score. O que o sistema deve fazer?",
      options: [
        "Enviar os K trechos mesmo assim",
        "Responder só com o conhecimento do modelo, sem avisar",
        "Seguir o fluxo alternativo e dizer que não há base suficiente",
        "Aumentar a temperatura do modelo",
      ],
      correct: 2,
      explanation:
        "Sem contexto relevante, a resposta não teria fonte. O fluxo alternativo evita uma resposta inventada e deixa claro o limite da base.",
      lesson: "08-02",
    },
  ],
  related: ["08-01", "06-01", "06-08", "08-05", "08-09", "08-11"],
  references: [
    {
      title: "Lewis et al. (2020), Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks",
      url: "https://arxiv.org/abs/2005.11401",
      kind: "paper",
    },
    {
      title: "Malkov e Yashunin, Efficient and robust approximate nearest neighbor search using HNSW graphs",
      url: "https://arxiv.org/abs/1603.09320",
      kind: "paper",
    },
    {
      title: "Liu et al. (2023), Lost in the Middle: How Language Models Use Long Contexts",
      url: "https://arxiv.org/abs/2307.03172",
      kind: "paper",
    },
    {
      title: "Sentence Transformers: documentação",
      url: "https://www.sbert.net/",
      kind: "docs",
    },
  ],
};

export default lesson;
