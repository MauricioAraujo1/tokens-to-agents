import type { GlossaryEntry } from "../glossary";

// Termos do módulo 14: Harness Engineering. Memória, contexto, subagentes e aprovação humana vêm do módulo 12;
// system prompt, hierarquia de instruções e prompt injection vêm do módulo 05.

const entries: GlossaryEntry[] = [
  {
    id: "agent-harness",
    term: "Agent Harness",
    explanation: "Tudo o que fica em volta do modelo e o transforma num agente: o loop, as ferramentas, as instruções carregadas, as permissões, os hooks, a memória, o sandbox e as checagens.",
    lesson: "14-01",
  },
  {
    id: "harness-engineering",
    term: "Harness Engineering",
    explanation: "Projetar e ajustar o ambiente em que o agente trabalha (o que ele vê, o que pode fazer, o que é checado) para que ele acerte de forma repetível, sem trocar o modelo.",
    lesson: "14-01",
  },
  {
    id: "deterministic-enforcement",
    term: "Deterministic Enforcement",
    explanation: "Regra aplicada pelo harness toda vez, como um hook, uma regra de negação ou uma configuração gerenciada, em vez de pedida ao modelo, que pode decidir não seguir.",
    lesson: "14-02",
  },
  {
    id: "agent-instructions",
    term: "Agent Instructions",
    explanation: "O texto que orienta o agente em toda chamada: papel, objetivo, fatos do ambiente, comandos, convenções e o que conta como pronto. Fica no system prompt e em arquivos de instrução.",
    lesson: "14-03",
  },
  {
    id: "rules-file",
    term: "Rules File",
    explanation: "Arquivo de regras do projeto lido pelo agente, como os arquivos em .claude/rules/ do Claude Code. Orienta o comportamento, mas o modelo ainda decide se a regra se aplica.",
    lesson: "14-04",
  },
  {
    id: "path-scoped-rule",
    term: "Path-Scoped Rule",
    explanation: "Regra que só entra no contexto quando o agente trabalha com arquivos de certos caminhos, declarados por padrões glob (o campo paths no Claude Code).",
    lesson: "14-04",
  },
  {
    id: "hard-constraint",
    term: "Hard Constraint",
    explanation: "Limite que o ambiente impõe, não o texto: uma regra de negação, um hook que bloqueia, um sandbox, um schema validado. Vale mesmo que o modelo tente o contrário.",
    lesson: "14-04",
  },
  {
    id: "agents-md",
    term: "AGENTS.md",
    explanation: "Formato aberto de arquivo markdown, descrito como um README para agentes, com comandos, convenções e cuidados do projeto. Lido por várias ferramentas, como o Codex; o mais próximo do arquivo editado prevalece.",
    lesson: "14-05",
  },
  {
    id: "claude-md",
    term: "CLAUDE.md",
    explanation: "Arquivo de instruções que o Claude Code coloca no contexto no início de cada sessão, nos escopos de organização, usuário, projeto e local, concatenados da raiz até o diretório atual.",
    lesson: "14-05",
  },
  {
    id: "skill",
    term: "Skill",
    explanation: "Pasta com um SKILL.md (nome, descrição e instruções) e, se preciso, scripts e referências. O agente vê só nome e descrição e carrega o resto quando a tarefa pede.",
    lesson: "14-06",
  },
  {
    id: "reusable-workflow",
    term: "Reusable Workflow",
    explanation: "Procedimento de vários passos escrito uma vez e reusado pelo agente ou disparado por um comando, para que a mesma tarefa saia sempre do mesmo jeito.",
    lesson: "14-06",
  },
  {
    id: "progressive-disclosure",
    term: "Progressive Disclosure",
    explanation: "Revelar informação em camadas: primeiro um resumo curto que diz quando algo é útil, depois o conteúdo completo e os anexos só quando a tarefa precisa deles.",
    lesson: "14-06",
  },
  {
    id: "hook",
    term: "Hook",
    explanation: "Comando ou chamada que o harness executa sozinho num ponto fixo do ciclo do agente, como antes de uma ferramenta rodar. Pode bloquear a ação, mudar a entrada ou devolver contexto.",
    lesson: "14-07",
  },
  {
    id: "lifecycle-event",
    term: "Lifecycle Event",
    explanation: "Momento do ciclo do agente em que o harness pode rodar hooks: início da sessão, prompt enviado, antes e depois de uma ferramenta, compactação, fim da resposta.",
    lesson: "14-07",
  },
  {
    id: "pre-tool-use-hook",
    term: "PreToolUse Hook",
    explanation: "Hook que roda depois de o modelo pedir uma ferramenta e antes de ela executar. No Claude Code, sair com código 2 bloqueia a chamada e devolve o motivo ao modelo.",
    lesson: "14-07",
  },
  {
    id: "stop-hook",
    term: "Stop Hook",
    explanation: "Hook que roda quando o agente tenta encerrar a resposta. Se a checagem falha, ele manda o agente de volta ao trabalho com o motivo.",
    lesson: "14-07",
  },
  {
    id: "agent-computer-interface",
    term: "Agent-Computer Interface (ACI)",
    explanation: "As ferramentas e os formatos pelos quais o agente age no computador: nomes, argumentos, saídas e mensagens de erro, desenhados para um modelo usar, como uma interface é desenhada para pessoas.",
    lesson: "14-08",
  },
  {
    id: "permission-mode",
    term: "Permission Mode",
    explanation: "Configuração geral de quanto o agente faz sem perguntar: pedir aprovação para quase tudo, aceitar edições, só planejar, negar o que perguntaria ou pular as perguntas.",
    lesson: "14-08",
  },
  {
    id: "allowlist",
    term: "Allowlist",
    explanation: "Lista do que é permitido; o que não está nela fica de fora ou pede aprovação. Em agentes, as ferramentas e comandos que rodam sem perguntar.",
    lesson: "14-08",
  },
  {
    id: "denylist",
    term: "Denylist",
    explanation: "Lista do que é proibido. Em agentes, regras de negação checadas antes de qualquer permissão: um deny vence um allow mais específico.",
    lesson: "14-08",
  },
  {
    id: "least-privilege",
    term: "Least Privilege",
    explanation: "Princípio de segurança: cada agente ou processo recebe só as permissões que a tarefa exige, para que um erro ou ataque cause o menor dano possível.",
    lesson: "14-08",
  },
  {
    id: "subagent-definition",
    term: "Subagent Definition",
    explanation: "Arquivo que descreve um subagente reutilizável: nome, descrição de quando usar, ferramentas, modelo e prompt próprio. No Claude Code, um markdown em .claude/agents/.",
    lesson: "14-09",
  },
  {
    id: "context-engineering",
    term: "Context Engineering",
    explanation: "Escolher, a cada chamada, o conjunto de tokens que o modelo vê (instruções, ferramentas, memória, dados, histórico), buscando o menor conjunto de alto sinal que leva ao resultado.",
    lesson: "14-10",
  },
  {
    id: "just-in-time-context",
    term: "Just-in-Time Context",
    explanation: "Guardar no contexto só referências leves (caminhos, ids, consultas) e trazer o conteúdo com ferramentas na hora em que o agente precisa dele.",
    lesson: "14-10",
  },
  {
    id: "context-budget",
    term: "Context Budget",
    explanation: "Quanto da janela cada camada pode ocupar (instruções, ferramentas, memória, dados, histórico), tratado como orçamento: o que entra numa camada sai da atenção das outras.",
    lesson: "14-10",
  },
  {
    id: "memory-file",
    term: "Memory File",
    explanation: "Arquivo de texto em que o harness guarda o que deve passar de uma sessão para outra, como o MEMORY.md da memória automática do Claude Code. Pode ser lido e editado por pessoas.",
    lesson: "14-11",
  },
  {
    id: "memory-index",
    term: "Memory Index",
    explanation: "Arquivo curto, carregado em toda sessão, que lista as memórias com uma linha cada e aponta para arquivos de tópico lidos sob demanda.",
    lesson: "14-11",
  },
  {
    id: "memory-scope",
    term: "Memory Scope",
    explanation: "Quem enxerga uma memória e onde ela mora: organização, usuário, projeto compartilhado no git ou local de uma pessoa.",
    lesson: "14-11",
  },
  {
    id: "sandbox",
    term: "Sandbox",
    explanation: "Ambiente com limites impostos pelo sistema operacional a um processo: quais pastas ele lê e escreve e com quais servidores fala, valendo para qualquer comando que o agente rode.",
    lesson: "14-12",
  },
  {
    id: "isolation",
    term: "Isolation",
    explanation: "Separar o que o agente toca do resto: arquivos, rede, credenciais e outras sessões, para que um erro ou ataque fique contido.",
    lesson: "14-12",
  },
  {
    id: "network-isolation",
    term: "Network Isolation",
    explanation: "Bloquear conexões de saída do agente, deixando passar só domínios aprovados. Sem ela, um agente enganado pode enviar dados para fora.",
    lesson: "14-12",
  },
  {
    id: "worktree",
    term: "Git Worktree",
    explanation: "Diretório de trabalho extra do git, com arquivos e branch próprios e o mesmo histórico do repositório. Deixa sessões de agentes em paralelo editarem sem colidir.",
    lesson: "14-12",
  },
  {
    id: "blast-radius",
    term: "Blast Radius",
    explanation: "Tudo o que pode ser afetado se uma ação der errado. Isolamento e menor privilégio servem para encolher esse raio.",
    lesson: "14-12",
  },
  {
    id: "feedback-loop",
    term: "Feedback Loop",
    explanation: "Ciclo em que o agente age, recebe um sinal do ambiente (teste, erro, revisão) e usa esse sinal para corrigir a próxima ação.",
    lesson: "14-13",
  },
  {
    id: "verification-loop",
    term: "Verification Loop",
    explanation: "Feedback loop com uma checagem que responde passou ou falhou, como testes ou typecheck: o agente só termina quando a checagem passa ou um limite de tentativas chega.",
    lesson: "14-13",
  },
  {
    id: "reproducible-environment",
    term: "Reproducible Environment",
    explanation: "Ambiente que sobe igual toda vez, a partir de arquivos versionados (dependências fixadas, script de setup, imagem), para que o agente e as pessoas vejam o mesmo comportamento.",
    lesson: "14-14",
  },
  {
    id: "clean-state",
    term: "Clean State",
    explanation: "Estado em que uma sessão do agente deixa o projeto ao terminar: código que compila e passa nos testes, mudanças commitadas e progresso anotado para a próxima sessão.",
    lesson: "14-14",
  },
  {
    id: "progress-file",
    term: "Progress File",
    explanation: "Arquivo em que cada sessão do agente registra o que fez e o que falta, relido no início da sessão seguinte junto com o histórico do git.",
    lesson: "14-14",
  },
];

export default entries;
