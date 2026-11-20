import type { GlossaryEntry } from "../glossary";

// Termos do módulo 05: Prompt Engineering.

const entries: GlossaryEntry[] = [
  {
    id: "prompt-engineering",
    term: "Prompt Engineering",
    explanation: "Prática de escrever, testar e ajustar a entrada de um modelo de linguagem para que ele cumpra uma tarefa com qualidade e formato previsíveis, sem mudar os pesos.",
    lesson: "05-01",
  },
  {
    id: "delimiter",
    term: "Delimiter",
    explanation: "Marcador, como tags XML, ### ou aspas triplas, que separa as partes do prompt e mostra ao modelo onde começa e termina cada uma.",
    lesson: "05-02",
  },
  {
    id: "system-prompt",
    term: "System Prompt",
    explanation: "Mensagem de maior prioridade, escrita por quem constrói o app, que define o papel, as regras e o formato do assistente na conversa inteira.",
    lesson: "05-03",
  },
  {
    id: "message-role",
    term: "Message Role",
    explanation: "Rótulo de cada mensagem de uma conversa (system, developer, user, assistant ou tool) que diz ao modelo quem escreveu aquele trecho.",
    lesson: "05-03",
  },
  {
    id: "chat-template",
    term: "Chat Template",
    explanation: "Regra que transforma a lista de mensagens com papéis numa única sequência de tokens, com tokens especiais marcando o início e o fim de cada mensagem.",
    lesson: "05-03",
  },
  {
    id: "instruction-hierarchy",
    term: "Instruction Hierarchy",
    explanation: "Ordem de prioridade entre as fontes de instrução (plataforma, desenvolvedor, usuário, ferramenta) que o modelo é treinado a seguir quando elas entram em conflito.",
    lesson: "05-03",
  },
  {
    id: "zero-shot",
    term: "Zero-Shot Prompting",
    explanation: "Pedir uma tarefa só com a instrução, sem nenhum exemplo resolvido no prompt.",
    lesson: "05-05",
  },
  {
    id: "few-shot",
    term: "Few-Shot Prompting",
    explanation: "Colocar alguns exemplos resolvidos de entrada e saída no prompt, antes da entrada nova, para mostrar a tarefa e o formato.",
    lesson: "05-06",
  },
  {
    id: "in-context-learning",
    term: "In-Context Learning",
    explanation: "Capacidade de um LLM de fazer uma tarefa nova a partir de instruções e exemplos no próprio contexto, sem atualizar nenhum peso.",
    lesson: "05-06",
  },
  {
    id: "chain-of-thought",
    term: "Chain of Thought (CoT)",
    explanation: "Técnica em que o modelo escreve os passos intermediários do raciocínio antes da resposta final, gastando mais tokens para errar menos em problemas de vários passos.",
    lesson: "05-07",
  },
  {
    id: "structured-output",
    term: "Structured Output",
    explanation: "Saída do modelo num formato que código consegue ler sem adivinhação, como JSON que segue um schema declarado.",
    lesson: "05-08",
  },
  {
    id: "json-schema",
    term: "JSON Schema",
    explanation: "Padrão para descrever a forma de um JSON: campos, tipos, valores permitidos e campos obrigatórios. Serve para validar a saída e para restringir a geração.",
    lesson: "05-08",
  },
  {
    id: "constrained-decoding",
    term: "Constrained Decoding",
    explanation: "Geração em que, a cada passo, os tokens que quebrariam a gramática ou o schema recebem probabilidade zero, e o sorteio acontece só entre os permitidos.",
    lesson: "05-08",
  },
  {
    id: "prompt-template",
    term: "Prompt Template",
    explanation: "Texto fixo com lacunas nomeadas que o código preenche a cada requisição, para que o prompt seja versionado, testado e reutilizado como código.",
    lesson: "05-09",
  },
  {
    id: "tool-calling",
    term: "Tool Calling (Function Calling)",
    explanation: "Recurso em que o modelo, em vez de responder em texto, devolve o nome de uma ferramenta e os argumentos em JSON; o app executa a ferramenta e devolve o resultado ao modelo.",
    lesson: "05-10",
  },
  {
    id: "prompt-injection",
    term: "Prompt Injection",
    explanation: "Ataque em que um texto controlado por terceiros traz instruções que o modelo segue no lugar das instruções de quem construiu o app.",
    lesson: "05-11",
  },
  {
    id: "indirect-prompt-injection",
    term: "Indirect Prompt Injection",
    explanation: "Prompt injection que chega por conteúdo que o app busca ou recebe, como uma página web, um e-mail, um documento ou a saída de uma ferramenta, sem o usuário digitar nada.",
    lesson: "05-11",
  },
  {
    id: "jailbreak",
    term: "Jailbreak",
    explanation: "Prompt feito para contornar o treino de segurança do próprio modelo e fazê-lo produzir algo que ele foi treinado para recusar.",
    lesson: "05-11",
  },
  {
    id: "self-consistency",
    term: "Self-Consistency",
    explanation: "Técnica que sorteia vários raciocínios para a mesma pergunta, com temperatura acima de zero, e fica com a resposta final que aparece mais vezes.",
    lesson: "05-12",
  },
  {
    id: "prompt-chaining",
    term: "Prompt Chaining",
    explanation: "Dividir uma tarefa em várias chamadas ao modelo, cada uma com um prompt focado, em que a saída de uma vira a entrada da seguinte.",
    lesson: "05-12",
  },
  {
    id: "react-prompting",
    term: "ReAct",
    explanation: "Padrão de prompt que alterna pensamento, ação (chamada de ferramenta) e observação do resultado, até o modelo ter o que precisa para responder.",
    lesson: "05-12",
  },
  {
    id: "tree-of-thoughts",
    term: "Tree of Thoughts",
    explanation: "Técnica que gera vários passos candidatos em cada ponto do raciocínio, avalia cada um e explora os melhores como uma busca em árvore.",
    lesson: "05-12",
  },
];

export default entries;
