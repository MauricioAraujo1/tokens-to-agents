import type { QuizContent } from "../../types/content";

// Quiz do módulo 15 (PRAC-01.1). Cada questão aponta para a aula que ensina o assunto (PRAC-01.4) e
// cobra uma aplicação do conteúdo, não as mesmas perguntas do knowledge check de cada aula.

const quiz: QuizContent = {
  module: "15",
  questions: [
    {
      id: "amdahl-review",
      prompt: "Numa equipe, revisar e testar ocupam metade do tempo de uma feature. Um agente deixa o resto 4 vezes mais rápido. Qual o ganho total?",
      options: ["4×", "2×", "1,6×", "1,25×"],
      correct: 2,
      explanation: "Pela Lei de Amdahl, 1 / (0,5 + 0,5 / 4) = 1 / 0,625 = 1,6×. A metade que não acelera segura o ganho.",
      lesson: "15-01",
    },
    {
      id: "sdd-when",
      prompt: "Qual tarefa mais se beneficia de uma spec escrita antes de chamar o agente?",
      options: [
        "Corrigir um erro de digitação numa mensagem",
        "Um protótipo descartável para mostrar uma ideia amanhã",
        "Uma regra de cobrança com descontos, parcelas e reembolsos",
        "Renomear uma variável em um arquivo",
      ],
      correct: 2,
      explanation: "A spec se paga quando há muitas decisões abertas e caras de desfazer. Regra de cobrança tem várias; as outras tarefas têm quase nenhuma.",
      lesson: "15-02",
    },
    {
      id: "spec-vs-design",
      prompt: "Onde vai a frase “o progresso é salvo no localStorage, numa chave versionada”?",
      options: [
        "Na spec, como critério de aceite",
        "No design, porque diz como, não o quê",
        "Nos non-goals",
        "Em lugar nenhum: é detalhe de código",
      ],
      correct: 1,
      explanation: "A spec diz o comportamento (o progresso sobrevive a recarregar a página). Onde e como guardar é decisão de design.",
      lesson: "15-03",
    },
    {
      id: "ears-if",
      prompt: "Qual critério está escrito em EARS para um comportamento indesejado?",
      options: [
        "O upload deve ser robusto",
        "WHEN o aluno clica em Enviar THEN o sistema SHALL enviar o arquivo",
        "IF o arquivo passa de 10 MB THEN o sistema SHALL recusar o upload e mostrar o limite",
        "WHILE o upload está em andamento o botão SHALL ficar desabilitado",
      ],
      correct: 2,
      explanation: "IF ... THEN é o padrão de comportamento indesejado do EARS. WHEN é evento, WHILE é estado, e a primeira opção nem é verificável.",
      lesson: "15-04",
    },
    {
      id: "adr-status",
      prompt: "A equipe troca o banco relacional por um banco de documentos. O que fazer com o ADR antigo que escolheu o relacional?",
      options: [
        "Apagar, para o agente não se confundir",
        "Marcar como substituído e apontar para o ADR novo, que explica o contexto da troca",
        "Editar o texto antigo para dizer banco de documentos",
        "Deixar como está",
      ],
      correct: 1,
      explanation: "O ADR é um histórico: o status muda para substituído e aponta para o novo. Apagar ou reescrever perde o porquê da primeira decisão.",
      lesson: "15-06",
    },
    {
      id: "tdd-order",
      prompt: "No TDD com um agente, qual ordem segura o agente no trilho?",
      options: [
        "Pedir o código, depois pedir os testes",
        "Escrever os testes, vê-los falhar, commitá-los e só então pedir a implementação sem mexer neles",
        "Pedir código e testes juntos no mesmo prompt",
        "Escrever os testes depois do merge",
      ],
      correct: 1,
      explanation: "Testes vistos falhando e commitados viram um contrato. Sem isso, o agente pode fazer os testes passarem mudando os testes.",
      lesson: "15-07",
    },
    {
      id: "coverage-vs-mutation",
      prompt: "Uma suíte gerada por IA tem 95% de cobertura e mutation score de 40%. O que isso indica?",
      options: [
        "Que os testes são ótimos",
        "Que os testes rodam quase todo o código, mas poucos asserts conferem os resultados",
        "Que a ferramenta de mutação está errada",
        "Que falta cobertura",
      ],
      correct: 1,
      explanation: "Cobertura mede o que rodou; o mutation score mede o que foi conferido. 60% dos bugs plantados passaram despercebidos.",
      lesson: "15-08",
    },
    {
      id: "review-criteria",
      prompt: "Um agente revisor devolve 30 achados por PR, a maioria sobre estilo. O que melhora a revisão?",
      options: [
        "Corrigir todos os 30",
        "Pedir para revisar contra a spec, só corretude e segurança, com severidade, e deixar estilo para o lint",
        "Desligar o revisor",
        "Usar dois revisores para achar ainda mais",
      ],
      correct: 1,
      explanation: "Sem critério, um revisor sempre acha algo. Critério explícito, severidade e lint para estilo cortam o ruído e deixam o bloqueante visível.",
      lesson: "15-09",
    },
    {
      id: "ci-red-main",
      prompt: "A main está vermelha há duas horas e três agentes continuam abrindo PRs em cima dela. Pela prática de CI, o que fazer?",
      options: [
        "Continuar e corrigir no fim do dia",
        "Tratar como prioridade número um: reverter o commit que quebrou ou corrigir já, antes de juntar mais mudanças",
        "Desligar os testes que falham",
        "Pedir aos agentes que ignorem o vermelho",
      ],
      correct: 1,
      explanation: "Build quebrado é a prioridade da equipe; reverter costuma ser o caminho mais rápido. Cada mudança juntada em cima do vermelho fica sem o portão que deveria conferi-la.",
      lesson: "15-10",
    },
    {
      id: "debt-priority",
      prompt: "Duas dívidas custam 10 dias para limpar. A do checkout custa 1 dia extra por mudança e muda 5 vezes por mês; a do relatório anual custa 3 dias extras e muda 1 vez por ano. Qual pagar primeiro?",
      options: [
        "A do relatório, que custa mais por mudança",
        "A do checkout: 5 dias de juros por mês, e se paga em 2 meses",
        "As duas ao mesmo tempo",
        "Nenhuma, dívida não se paga",
      ],
      correct: 1,
      explanation: "Juros mensais: checkout 1 × 5 = 5 dias; relatório 3 / 12 = 0,25 dia. O checkout se paga em 2 meses; o relatório, em 40.",
      lesson: "15-12",
    },
  ],
};

export default quiz;
