import type { QuizContent } from "../../types/content";

// Quiz do módulo 14 (PRAC-01.1). Cada questão aponta para a aula que ensina o assunto (PRAC-01.4) e cobra uma
// aplicação do conteúdo, com as contas feitas a partir dos números do enunciado.

const quiz: QuizContent = {
  module: "14",
  questions: [
    {
      id: "harness-not-model",
      prompt:
        "Com o mesmo modelo, a equipe A entrega 40% das tarefas sem erro e a equipe B, 80%. A equipe B dá ao agente os comandos de teste, bloqueia edições em pastas geradas e exige typecheck antes de terminar. O que explica a diferença?",
      options: [
        "A equipe B usa uma temperatura menor",
        "O harness: o ambiente da equipe B dá sinal de erro e impõe as regras que não podem falhar",
        "Sorte nas tarefas sorteadas",
        "O modelo da equipe B foi treinado de novo",
      ],
      correct: 1,
      explanation:
        "Nada mudou no modelo. Comandos para se conferir, restrições aplicadas pelo harness e uma checagem antes de terminar são peças de harness engineering.",
      lesson: "14-01",
    },
    {
      id: "almost-always",
      prompt:
        "Uma regra no CLAUDE.md é seguida em 99,5% das vezes. A situação aparece 300 vezes por mês. Qual é a chance aproximada de pelo menos uma violação no mês?",
      options: ["0,5%", "15%", "78%", "99,5%"],
      correct: 2,
      explanation:
        "1 − 0,995³⁰⁰ ≈ 1 − 0,22 = 78%. Para uma regra que não pode falhar nenhuma vez, a saída é tirá-la do texto e pô-la num hook ou numa regra de negação.",
      lesson: "14-02",
    },
    {
      id: "instruction-budget",
      prompt:
        "Um arquivo de instruções tem 500 linhas de 18 tokens. Uma sessão faz 30 chamadas. Cortando o arquivo para 100 linhas, quantos tokens de entrada a sessão deixa de ler?",
      options: ["7.200", "54.000", "216.000", "270.000"],
      correct: 2,
      explanation: "São 400 linhas × 18 tokens = 7.200 tokens a menos por chamada, e as instruções vão em todas: 7.200 × 30 = 216.000.",
      lesson: "14-03",
    },
    {
      id: "rule-home",
      prompt: "Qual destas regras deve sair do arquivo de instruções e virar uma restrição do harness?",
      options: [
        "“Prefira funções pequenas”",
        "“Nunca rode comandos contra o banco de produção”",
        "“Escreva mensagens de commit no imperativo”",
        "“Use nomes descritivos em testes”",
      ],
      correct: 1,
      explanation:
        "As outras são diretrizes com exceções, boas para o modelo decidir. Tocar produção não pode acontecer nenhuma vez: vira regra de negação, hook ou falta de credencial no ambiente.",
      lesson: "14-04",
    },
    {
      id: "nested-agents",
      prompt:
        "O AGENTS.md da raiz diz “rode npm test”; o de services/payments diz “rode make test”. O agente corrige um bug em services/payments/refund.ts, e o usuário pede no chat “rode só o teste de refund”. O que vale?",
      options: [
        "npm test, porque a raiz vale para tudo",
        "make test, porque o arquivo mais próximo vence",
        "O pedido do usuário no chat, que passa por cima dos arquivos",
        "O agente escolhe ao acaso",
      ],
      correct: 2,
      explanation:
        "Entre os arquivos, o mais próximo do arquivo editado prevalece, mas o site do formato diz que pedidos explícitos no chat vencem tudo.",
      lesson: "14-05",
    },
    {
      id: "skill-budget",
      prompt:
        "Um time tem 25 skills com descrições de 50 tokens e corpos de 3.000. Numa tarefa que ativa duas skills, quantos tokens de skills entram com revelação progressiva?",
      options: ["1.250", "6.000", "7.250", "76.250"],
      correct: 2,
      explanation: "A listagem custa 25 × 50 = 1.250 e os dois corpos ativados, 6.000: 7.250 tokens, contra 76.250 carregando tudo.",
      lesson: "14-06",
    },
    {
      id: "hook-exit",
      prompt:
        "Um hook PreToolUse com matcher Bash sai com código 2 e imprime “use pnpm, não npm” no stderr quando vê npm install. A política de permissões tem allow para Bash(npm *). O que acontece?",
      options: [
        "O comando roda, porque o allow libera",
        "A chamada é bloqueada e o motivo volta ao modelo, que pode tentar com pnpm",
        "A pessoa precisa aprovar",
        "O hook é ignorado",
      ],
      correct: 1,
      explanation:
        "O código 2 do PreToolUse bloqueia antes da avaliação das regras de permissão, então vale mesmo com um allow. O stderr vira o motivo que o modelo lê.",
      lesson: "14-07",
    },
    {
      id: "deny-first",
      prompt: "A política tem allow: Edit(src/**) e deny: Edit(src/generated/**). O agente pede para editar src/generated/client.ts. O que acontece?",
      options: [
        "Edita, porque o allow casa",
        "É bloqueado, porque deny é avaliado primeiro",
        "Pergunta à pessoa",
        "Depende do modelo",
      ],
      correct: 1,
      explanation: "A ordem é deny, ask, allow, e vale a primeira que casar. Um allow mais amplo não fura um deny.",
      lesson: "14-08",
    },
    {
      id: "subagent-saving",
      prompt:
        "Uma busca larga gera 40 mil tokens de resultados; um subagente devolve um resumo de 2 mil. Nas 15 chamadas seguintes do agente principal, quantos tokens de entrada a delegação evita?",
      options: ["38 mil", "40 mil", "570 mil", "600 mil"],
      correct: 2,
      explanation: "O principal deixa de carregar 40 − 2 = 38 mil tokens, reenviados em cada uma das 15 chamadas: 38 mil × 15 = 570 mil.",
      lesson: "14-09",
    },
    {
      id: "verification-math",
      prompt:
        "Cada tentativa acerta 50%. Um teste pega todos os erros e o agente tem até 2 tentativas. Qual é a chance de sucesso, e qual a de erro silencioso?",
      options: ["50% e 50%", "75% e 0%", "75% e 25%", "100% e 0%"],
      correct: 1,
      explanation:
        "Sucesso: 0,5 + 0,5 × 0,5 = 75%. Como o teste pega todo erro, nada passa em silêncio; os 25% restantes terminam como falha visível no limite de tentativas.",
      lesson: "14-13",
    },
  ],
};

export default quiz;
