import type { ModuleQuiz } from "../types/practice";
import { RAG_LESSON_ID } from "./lessons/rag";
import { SELF_ATTENTION_LESSON_ID } from "./lessons/selfAttention";

export const QUIZ_OPTION_LETTERS = ["A", "B", "C", "D"] as const;

export const MODULE_QUIZZES: ModuleQuiz[] = [
  {
    moduleId: "module-03",
    questions: [
      {
        id: "03-q1",
        prompt: "O que um tokenizador BPE faz para montar o vocabulário?",
        options: [
          "Separa o texto só nos espaços em branco.",
          "Junta repetidamente os pares de símbolos mais frequentes até fechar o vocabulário.",
          "Atribui um identificador aleatório a cada palavra do corpus.",
          "Mantém apenas as palavras do dicionário da língua.",
        ],
        correctIndex: 1,
        explanation:
          "O Byte Pair Encoding começa com caracteres (ou bytes) e funde os pares mais frequentes, criando subpalavras. Assim palavras raras viram combinações de pedaços conhecidos.",
        review: { lessonId: "03-01", stepIndex: 0 },
      },
      {
        id: "03-q2",
        prompt: "No self-attention, de onde vêm os vetores query, key e value de um token?",
        options: [
          "De três tabelas de embedding independentes.",
          "Da saída do softmax da camada anterior.",
          "Do mesmo embedding, multiplicado por três matrizes aprendidas.",
          "Do embedding posicional, somente.",
        ],
        correctIndex: 2,
        explanation:
          "Cada token tem um único vetor de entrada. Ele é projetado por três matrizes aprendidas (W_Q, W_K e W_V) para gerar a query, a key e o value.",
        review: { lessonId: SELF_ATTENTION_LESSON_ID, stepIndex: 2 },
      },
      {
        id: "03-q3",
        prompt: "No self-attention, por que dividimos q · k por √d_k antes do softmax?",
        options: [
          "Para normalizar o embedding de cada token.",
          "Para os produtos escalares não crescerem com a dimensão e saturarem o softmax.",
          "Para garantir que a soma dos pesos dê 1.",
          "Para reduzir o custo de O(n²) para O(n).",
        ],
        correctIndex: 1,
        explanation:
          "Quem faz os pesos somarem 1 é o softmax, não a divisão. Com d_k = 64, o produto escalar de dois vetores aleatórios tem desvio padrão perto de √64 = 8. Sem dividir, o softmax ficaria quase todo concentrado num único token e os gradientes sumiriam.",
        review: { lessonId: SELF_ATTENTION_LESSON_ID, stepIndex: 3 },
      },
      {
        id: "03-q4",
        prompt: "O que a máscara causal impede num decoder?",
        options: [
          "Que um token preste atenção nos tokens que vêm depois dele.",
          "Que tokens repetidos entrem na sequência.",
          "Que a atenção use mais de uma cabeça.",
          "Que o modelo veja tokens de padding na saída.",
        ],
        correctIndex: 0,
        explanation:
          "Na geração, o modelo só conhece o passado. A máscara zera (com −∞ antes do softmax) as pontuações dos tokens futuros, para o treino imitar a geração token a token.",
        review: { lessonId: SELF_ATTENTION_LESSON_ID, stepIndex: 6 },
      },
      {
        id: "03-q5",
        prompt: "Dobrar o tamanho do contexto faz o custo da atenção:",
        options: ["Ficar igual.", "Dobrar.", "Quadruplicar.", "Cair pela metade."],
        correctIndex: 2,
        explanation:
          "Cada token compara a sua query com a key de todos os outros: são n × n comparações. Com 2n tokens, são 4n² comparações.",
        review: { lessonId: SELF_ATTENTION_LESSON_ID, stepIndex: 8 },
      },
    ],
  },
  {
    moduleId: "module-08",
    questions: [
      {
        id: "08-q1",
        prompt: "Por que usar o mesmo modelo de embedding na indexação e na consulta?",
        options: [
          "Porque modelos diferentes geram espaços vetoriais incompatíveis.",
          "Porque o banco vetorial só aceita um modelo por vez.",
          "Porque assim a busca dispensa o índice.",
          "Porque isso reduz o tamanho dos chunks.",
        ],
        correctIndex: 0,
        explanation:
          "A similaridade só faz sentido entre vetores do mesmo espaço. Um vetor de outro modelo pode ter a mesma dimensão e, ainda assim, significar outra coisa.",
        review: { lessonId: RAG_LESSON_ID, stepIndex: 1 },
      },
      {
        id: "08-q2",
        prompt: "Qual o efeito de aumentar muito o K da recuperação?",
        options: [
          "A resposta fica sempre mais precisa.",
          "Entra mais ruído no contexto e o custo em tokens sobe.",
          "O banco vetorial deixa de usar índices aproximados.",
          "O modelo de embedding passa a gerar vetores maiores.",
        ],
        correctIndex: 1,
        explanation:
          "Poucos trechos deixam a resposta incompleta; trechos demais trazem ruído, ocupam a janela de contexto e encarecem cada chamada.",
        review: { lessonId: RAG_LESSON_ID, stepIndex: 4 },
      },
      {
        id: "08-q3",
        prompt: "O que acontece quando nenhum trecho passa do limiar de similaridade?",
        options: [
          "O LLM responde com o conhecimento do treino, sem avisar.",
          "A aplicação reindexa os documentos automaticamente.",
          "O fluxo alternativo informa que não há base suficiente para responder.",
          "O banco vetorial devolve trechos aleatórios.",
        ],
        correctIndex: 2,
        explanation:
          "Sem contexto relevante, o caminho seguro é dizer que não há base suficiente. Responder mesmo assim abre espaço para alucinação.",
        review: { lessonId: RAG_LESSON_ID, stepIndex: 9 },
      },
    ],
  },
];
