// Conteúdo do playground do loop de agente. Conteúdo didático em PT-BR (AD-003).
// O roteiro é fixo e as ferramentas são de exemplo: as observações já vêm escritas.

import type { AgentIteration } from "../../lab/agentLoop";

export const agentLoopContent = {
  title: "Loop de agente",
  observe:
    "O agente alterna entre pensar, chamar uma ferramenta e observar o resultado, até ter o que precisa para responder. O limite de iterações é a trava de segurança: se a tarefa pede mais voltas do que o limite, o agente para sem resposta, em vez de girar para sempre e gastar tokens.",
  task: "Quanto custam 3 cafés em reais, se um café custa US$ 2?",
  taskLabel: "Tarefa",
  tools: ["cotacao(par): cotação de câmbio do dia", "calcular(expressão): calculadora"],
  toolsLabel: "Ferramentas",
  limitLabel: "Limite de iterações",
  limitHint: "voltas do loop antes de desistir",
  next: "Próximo passo",
  runAll: "Executar até o fim",
  reset: "Reiniciar",
  phases: [
    { id: "think", label: "Pensar" },
    { id: "act", label: "Agir" },
    { id: "observe", label: "Observar" },
  ],
  caption: (iteration: number, max: number) => `Iteração ${iteration} de no máximo ${max}`,
  logLabel: "Passos do agente",
  event: {
    think: (text: string) => `Pensamento: ${text}`,
    act: (text: string) => `Ação: ${text}`,
    observe: (text: string) => `Observação: ${text}`,
    answer: (text: string) => `Resposta: ${text}`,
  },
  limitWarning: (max: number) =>
    `Limite de ${max} ${max === 1 ? "iteração atingido" : "iterações atingido"} sem resposta: o agente parou.`,
  initialLimit: 4,
  maxLimit: 5,
  script: [
    {
      thought: "Preciso saber quanto vale o dólar em reais hoje.",
      action: { tool: "cotacao", input: '"USD/BRL"' },
      observation: "1 USD = 5.10 BRL",
    },
    {
      thought: "3 cafés custam US$ 6. Falta converter para reais.",
      action: { tool: "calcular", input: '"3 * 2 * 5.10"' },
      observation: "30.6",
    },
    {
      thought: "Já tenho o valor em reais.",
      answer: "3 cafés custam R$ 30,60.",
    },
  ] satisfies AgentIteration[],
};
