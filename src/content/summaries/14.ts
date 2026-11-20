import { catalog } from "../catalog";
import type { LessonId, SummaryContent } from "../../types/content";

// Cheat sheet do módulo 14 (SUM-01.1). O diagrama é desenhado pelo <Scene> num passo único, e a folha
// tem estilo de impressão em A4 (SUM-01.2). As aulas linkadas saem do catálogo: as 14 do módulo, em ordem.

const lessons: LessonId[] = (catalog.find((module) => module.id === "14")?.lessons ?? []).map((lesson) => lesson.id);

const summary: SummaryContent = {
  module: "14",
  concepts: [
    "Agente = modelo + harness. O harness roda o loop, monta o contexto, executa ferramentas, aplica permissões e confere o resultado. Harness engineering melhora o acerto mexendo no ambiente, sem trocar o modelo.",
    "Pedir ou impor: prompt, arquivos de instrução e skills são lidos e interpretados pelo modelo; hooks, regras de negação, sandbox e configurações gerenciadas são aplicados pelo harness sempre. Diretriz com exceções fica no texto; regra sem exceção vira configuração.",
    "Instruções (AGENTS.md, CLAUDE.md): curtas, concretas, com motivo e com os comandos exatos de checagem. São relidas em toda chamada; arquivos aninhados se empilham da raiz até a pasta atual, e o mais próximo vence.",
    "Skills e regras por caminho: procedimentos e regras que só importam em parte das tarefas entram por revelação progressiva (descrição sempre, corpo na ativação, referências e scripts na execução).",
    "Hooks: código seu em eventos fixos do ciclo (SessionStart, UserPromptSubmit, PreToolUse, PostToolUse, Stop...). No Claude Code, sair com código 2 no PreToolUse bloqueia a chamada; no Stop, manda o agente continuar.",
    "Ferramentas e permissões: ferramentas desenhadas para o modelo (nomes claros, saídas enxutas, erros acionáveis), regras avaliadas na ordem deny, ask, allow, modos de permissão conforme o isolamento e menor privilégio por agente e subagente.",
    "Contexto e memória: a janela é um orçamento entre camadas. Mapas leves e leitura sob demanda, subagentes que devolvem resumos e memória em arquivos curtos, com escopo e curadoria.",
    "Contenção e confiabilidade: sandbox com muros de arquivos e de rede, worktrees para sessões paralelas, containers para o modo sem perguntas, checagens que respondem passou ou falhou e um ritual de início e fim que mantém o estado limpo entre sessões.",
  ],
  formulas: [
    "Chance de violar uma regra seguida com probabilidade q em N ocorrências = 1 − qᴺ",
    "Custo de instruções numa sessão = tokens das instruções × número de chamadas",
    "Razão de sinal da camada de dados = tokens úteis / tokens carregados",
    "Contexto evitado por um subagente = (resultados brutos − resumo) × chamadas seguintes do principal",
    "Verificação com sensibilidade s e até k tentativas: sucesso = Σᵢ₌₀ᵏ⁻¹ ((1 − p)s)ⁱ p; erro silencioso = Σᵢ₌₀ᵏ⁻¹ ((1 − p)s)ⁱ (1 − p)(1 − s)",
  ],
  pitfalls: [
    "Escrever IMPORTANTE no CLAUDE.md para uma regra que não pode falhar, em vez de um hook ou uma regra de negação.",
    "Inchar o arquivo de instruções com o que o agente descobre lendo o código: custa tokens e atenção em toda chamada.",
    "Achar que um allow mais específico fura um deny, ou que um hook que responde allow passa por cima das regras de negação.",
    "Usar o modo que pula as perguntas fora de um container ou VM, ou um sandbox só de arquivos, sem isolamento de rede.",
    "Deixar a memória crescer sem curadoria: o limite de carga esconde as entradas, e memórias velhas enganam com a mesma confiança das novas.",
    "Dar ao agente permissão para editar os testes que medem o próprio trabalho.",
  ],
  diagram: {
    kind: "pieces",
    layout: "single",
    pieces: [
      {
        id: "module-14",
        piece: "block-diagram",
        blocks: [
          { id: "docs", kind: "documents", label: "instruções + skills", col: 0, row: 0 },
          { id: "memory", kind: "memory", label: "memória", col: 0, row: 1 },
          { id: "agent", kind: "agent", label: "agente", col: 1, row: 0.5 },
          { id: "guard", kind: "guardrail", label: "hooks + permissões", col: 2, row: 0 },
          { id: "sandbox", kind: "server", label: "sandbox", col: 3, row: 0 },
          { id: "eval", kind: "eval", label: "checagens", col: 2, row: 1 },
        ],
        edges: [
          { from: "docs", to: "agent", label: "contexto" },
          { from: "memory", to: "agent" },
          { from: "agent", to: "guard", label: "pedidos" },
          { from: "guard", to: "sandbox", label: "executa" },
          { from: "agent", to: "eval", label: "confere" },
          { from: "eval", to: "memory", label: "progresso" },
        ],
        active: "guard",
      },
    ],
  },
  lessons,
};

export default summary;
