import type { QuizContent } from "../../types/content";

// Quiz do módulo 12 (PRAC-01.1). Cada questão aponta para a aula que ensina o assunto (PRAC-01.4) e cobra uma
// aplicação do conteúdo, com as contas feitas a partir dos números do enunciado.

const quiz: QuizContent = {
  module: "12",
  questions: [
    {
      id: "agent-to-workflow",
      prompt:
        "Um agente processa notas fiscais. Em 2.000 rastros, ele sempre faz as mesmas chamadas na mesma ordem: extrair campos, validar CNPJ, gravar na planilha. O que faz mais sentido?",
      options: [
        "Dar mais ferramentas ao agente para ele ter mais opções",
        "Trocar o agente por um workflow com essas três etapas fixas no código, usando o modelo só para extrair os campos",
        "Aumentar o limite de iterações",
        "Transformar o agente num sistema com três agentes",
      ],
      correct: 1,
      explanation:
        "Se o caminho nunca muda, quem decide a ordem pode ser o código. O workflow é mais barato, mais rápido e mais fácil de testar; o agente só vale quando os passos não dão para prever.",
      lesson: "12-02",
    },
    {
      id: "cumulative-tokens",
      prompt:
        "Um agente tem prompt base de 1.000 tokens e cada volta acrescenta 500 tokens ao histórico, reenviado em toda chamada. Quantos tokens de entrada ele consome, somando as chamadas, numa tarefa de 4 voltas?",
      options: ["4.000", "5.500", "7.000", "8.000"],
      correct: 2,
      explanation:
        "A chamada i lê 1.000 + (i − 1) × 500: 1.000 + 1.500 + 2.000 + 2.500 = 7.000. O total cresce com o quadrado das voltas, porque o histórico é reenviado.",
      lesson: "12-04",
    },
    {
      id: "parallel-latency",
      prompt:
        "Cada chamada ao modelo leva 2 s. Um agente precisa de três ferramentas independentes, que levam 1 s, 3 s e 2 s. Pedindo as três em paralelo numa volta e depois respondendo, qual é a latência aproximada?",
      options: ["6 s", "7 s", "10 s", "14 s"],
      correct: 1,
      explanation:
        "Em paralelo são 2 chamadas ao modelo (4 s) mais a espera da ferramenta mais lenta (3 s): 7 s. Em sequência seriam 4 chamadas (8 s) mais a soma das ferramentas (6 s): 14 s.",
      lesson: "12-05",
    },
    {
      id: "replan-or-continue",
      prompt:
        "Num plan-and-execute de 5 passos, o passo 3 mostra que o fornecedor escolhido no passo 1 não entrega na cidade. O que o executor deve fazer?",
      options: [
        "Continuar os passos 4 e 5 como planejado",
        "Parar e devolver ao planejador o plano, os resultados até ali e a falha, para ele refazer o restante",
        "Recomeçar do passo 1 sem guardar nada",
        "Pedir ao executor para inventar um fornecedor",
      ],
      correct: 1,
      explanation:
        "Verificar cada passo é o que diz quando replanejar. O planejador corrige o plano com o que já se sabe, sem jogar fora os passos certos.",
      lesson: "12-06",
    },
    {
      id: "memory-type",
      prompt:
        "Qual destas anotações de um agente é uma memória episódica?",
      options: [
        "“O cliente prefere voos pela manhã.”",
        "“Na tarefa de ontem, buscar_voos falhou com a data em texto e funcionou com AAAA-MM-DD.”",
        "“Sempre confirme antes de comprar.”",
        "“Lisboa fica em Portugal.”",
      ],
      correct: 1,
      explanation:
        "Episódica é o registro de uma experiência: o que o agente tentou, o que aconteceu e o que aprendeu. Preferência e fato são memória semântica; a regra de confirmar é procedural.",
      lesson: "12-07",
    },
    {
      id: "context-almost-full",
      prompt:
        "Na volta 40 de uma tarefa longa, o contexto do agente está quase cheio, e a maior parte são resultados antigos de ferramentas. Qual é a primeira medida a tomar?",
      options: [
        "Apagar o system prompt para liberar espaço",
        "Limpar os resultados brutos antigos e, se ainda precisar, compactar o histórico num resumo com decisões e pendências",
        "Trocar para um modelo sem limite de contexto",
        "Recomeçar a tarefa do zero",
      ],
      correct: 1,
      explanation:
        "Resultados antigos de ferramenta raramente são relidos: limpá-los é a forma mais leve de compactação. Se não bastar, resumir o histórico preserva o que importa numa janela nova.",
      lesson: "12-08",
    },
    {
      id: "multi-agent-worth",
      prompt:
        "Em qual destes casos um sistema com vários agentes tende a compensar o custo extra em tokens?",
      options: [
        "Corrigir um erro de digitação num único arquivo",
        "Pesquisar um tema amplo com várias frentes independentes, que podem ser investigadas em paralelo com contextos separados",
        "Responder “qual é o horário de funcionamento?”",
        "Extrair 3 campos de um formulário fixo",
      ],
      correct: 1,
      explanation:
        "Vários agentes gastam bem mais tokens que um só. Compensam quando a tarefa é ampla, se divide em frentes independentes e ganha com contextos separados e trabalho em paralelo.",
      lesson: "12-10",
    },
    {
      id: "bounded-fan-out",
      prompt:
        "Um orquestrador divide a tarefa em 12 subtarefas independentes de 5 s cada, mas só pode rodar 4 ao mesmo tempo. A agregação final leva 2 s. Qual é a latência aproximada?",
      options: ["7 s", "17 s", "22 s", "62 s"],
      correct: 1,
      explanation:
        "Com 4 de cada vez, são ⌈12 / 4⌉ = 3 ondas de 5 s (15 s), mais 2 s de agregação: 17 s. Em sequência seriam 60 s mais a agregação.",
      lesson: "12-14",
    },
    {
      id: "approval-load",
      prompt:
        "Um agente propõe 2.000 ações por dia. Com o limiar de risco atual, 6% delas param num approval gate, e cada revisão leva 2 minutos de uma pessoa. Quantas horas de revisão isso dá por dia?",
      options: ["2 horas", "4 horas", "12 horas", "40 horas"],
      correct: 1,
      explanation:
        "6% de 2.000 são 120 revisões; 120 × 2 min = 240 min, ou 4 horas por dia. Baixar o limiar aumenta essa carga, por isso ele se calibra pelo risco da ação e pela capacidade da equipe.",
      lesson: "12-15",
    },
    {
      id: "chain-reliability",
      prompt:
        "Cada passo de um agente acerta 95% das vezes, de forma independente. Qual é a chance aproximada de uma tarefa de 10 passos sair toda certa?",
      options: ["95%", "60%", "50%", "9,5%"],
      correct: 1,
      explanation:
        "Erros se acumulam: 0,95 elevado a 10 dá cerca de 0,60. Por isso tarefas longas pedem verificação, retries com idempotência e passos mais curtos.",
      lesson: "12-18",
    },
  ],
};

export default quiz;
