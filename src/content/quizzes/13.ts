import type { QuizContent } from "../../types/content";

// Quiz do módulo 13 (PRAC-01.1). Cada questão aponta para a aula que ensina o assunto (PRAC-01.4) e cobra
// uma aplicação do conteúdo, com as contas feitas a partir dos números do enunciado. Detalhes versionados
// seguem a revisão 2026-07-28 da especificação do MCP.

const quiz: QuizContent = {
  module: "13",
  questions: [
    {
      id: "integration-math",
      prompt:
        "Uma empresa tem 6 apps de IA e 9 sistemas internos. Quantas integrações a mais ela escreve sem um protocolo comum, comparado a usar MCP?",
      options: ["15", "39", "54", "69"],
      correct: 1,
      explanation: "Sem padrão: 6 × 9 = 54 conectores. Com MCP: 6 clientes + 9 servidores = 15. A diferença é 54 − 15 = 39.",
      lesson: "13-02",
    },
    {
      id: "clients-per-host",
      prompt:
        "Dois desenvolvedores usam, cada um, uma IDE ligada a um servidor local de arquivos e aos servidores remotos do Sentry e do GitHub. Quantos clientes MCP existem no total e quantos o servidor do Sentry atende?",
      options: ["2 e 1", "3 e 2", "6 e 2", "6 e 1"],
      correct: 2,
      explanation: "Cada IDE é um host com um cliente por servidor: 3 por IDE, 6 no total. O Sentry recebe um cliente de cada IDE: 2.",
      lesson: "13-04",
    },
    {
      id: "primitive-choice",
      prompt:
        "Um servidor de CRM quer oferecer (a) a ficha de um cliente para o host anexar quando o usuário abrir a conversa, (b) a criação de uma oportunidade quando o modelo decidir e (c) um roteiro de follow-up que o vendedor dispara com /followup. Quais primitivas?",
      options: [
        "Ferramenta, ferramenta e ferramenta",
        "Recurso, ferramenta e prompt",
        "Prompt, recurso e ferramenta",
        "Recurso, prompt e ferramenta",
      ],
      correct: 1,
      explanation: "Dado que a aplicação decide anexar: recurso. Ação que o modelo decide: ferramenta. Roteiro que o usuário escolhe: prompt.",
      lesson: "13-07",
    },
    {
      id: "annotation-defaults",
      prompt:
        "Uma ferramenta de um servidor confiável declara só readOnlyHint: false. Pelos padrões da especificação, como ela conta para destructiveHint e openWorldHint?",
      options: [
        "Não destrutiva e de mundo fechado",
        "Destrutiva e de mundo aberto",
        "Não destrutiva e de mundo aberto",
        "Sem valor: o host deve recusar a ferramenta",
      ],
      correct: 1,
      explanation: "Os padrões são pessimistas: destructiveHint true e openWorldHint true quando não declarados. Uma política sensata pede aprovação antes de executar.",
      lesson: "13-05",
    },
    {
      id: "meta-cost",
      prompt:
        "Na revisão 2026-07-28, o _meta de um cliente ocupa 180 bytes por pedido. Numa tarefa com 1 tools/list e 9 tools/call, quantos bytes de _meta o cliente envia?",
      options: ["180", "1.620", "1.800", "3.600"],
      correct: 2,
      explanation: "São 10 pedidos, e cada um carrega o _meta: 10 × 180 = 1.800 bytes. É o custo de não ter handshake nem sessão.",
      lesson: "13-09",
    },
    {
      id: "dual-era-probe",
      prompt:
        "Um cliente que suporta as duas eras manda server/discover a um servidor stdio e recebe o erro -32601 (método não encontrado), sem nenhum erro moderno reconhecido. O que fazer?",
      options: [
        "Tentar outra versão moderna",
        "Tratar como servidor legado e abrir com o handshake initialize",
        "Desistir do servidor",
        "Repetir o server/discover até funcionar",
      ],
      correct: 1,
      explanation: "No stdio, um DiscoverResult ou um erro moderno reconhecido indica servidor novo; qualquer outro erro, ou silêncio, indica servidor legado, e o cliente cai para o initialize.",
      lesson: "13-09",
    },
    {
      id: "catalog-budget",
      prompt:
        "Um agente conecta 10 servidores com 12 ferramentas cada, e cada definição custa 150 tokens. A janela é de 200 mil tokens e o limite do host para definições é 5%. O que fazer?",
      options: [
        "Mandar tudo: 18.000 tokens cabem na janela",
        "Usar descoberta progressiva: 18.000 tokens passam dos 10.000 do limite",
        "Cortar pela metade as descrições e mandar tudo",
        "Desconectar 9 servidores",
      ],
      correct: 1,
      explanation: "10 × 12 × 150 = 18.000 tokens por chamada, acima de 5% de 200.000 (10.000). Vale oferecer uma busca de ferramentas e carregar só as definições que a tarefa pede.",
      lesson: "13-10",
    },
    {
      id: "rug-pull-detect",
      prompt:
        "O usuário aprovou a ferramenta export_csv ontem. Hoje o tools/list devolve a mesma ferramenta com outra descrição. Qual é a defesa que pega essa troca?",
      options: [
        "Confiar no readOnlyHint da ferramenta",
        "Comparar o hash da definição atual com o hash aprovado e bloquear até nova aprovação",
        "Pedir ao modelo que avalie se a descrição é segura",
        "Aumentar o timeout",
      ],
      correct: 1,
      explanation: "É um rug pull: a definição mudou depois da aprovação. Fixar a impressão digital da definição aprovada detecta qualquer mudança, e a ferramenta volta a precisar de aprovação.",
      lesson: "13-11",
    },
    {
      id: "code-mode-math",
      prompt:
        "Um agente lê 400 registros de 50 tokens cada e grava 8 totais. Direto, todos os registros passam pelo contexto; em code mode, o script custa 250 tokens e o resumo 20. Quanto o code mode economiza, ignorando as chamadas de gravação?",
      options: ["Cerca de 50%", "Cerca de 75%", "Cerca de 99%", "Nada"],
      correct: 2,
      explanation: "Direto: 400 × 50 = 20.000 tokens. Code mode: 250 + 20 = 270. A economia é 1 − 270 / 20.000 ≈ 98,7%, cerca de 99%.",
      lesson: "13-13",
    },
    {
      id: "fc-vs-mcp",
      prompt: "Uma ferramenta MCP com 120 tokens de definição é oferecida ao modelo pelo host. Quanto ela custa no contexto, comparada à mesma ferramenta declarada como função local?",
      options: [
        "O dobro, porque o MCP acrescenta o protocolo ao contexto",
        "Praticamente o mesmo: o host traduz para a tool da API, e o modelo vê nome, descrição e schema iguais",
        "Zero, porque o MCP carrega sob demanda sempre",
        "Metade, porque o MCP comprime a definição",
      ],
      correct: 1,
      explanation: "O modelo não vê o MCP: vê uma tool comum. O custo em tokens é o da definição traduzida, quase igual ao da função local (só o prefixo do nome muda).",
      lesson: "13-14",
    },
  ],
};

export default quiz;
