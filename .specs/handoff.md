# Handoff — Tokens to Agents

**Atualizado:** 2026-11-18
**Onde parou:** planejamento completo e aprovado. **A execução ainda não começou** (nenhuma tarefa feita).

## Como retomar num chat novo

Cole isto no chat novo:

> Retomar o projeto tokens-to-agents. Leia `.specs/handoff.md` e `.specs/STATE.md`, ative a skill `tlc-spec-driven` e comece o Execute pela T1 de `.specs/features/learning-platform/tasks.md`.

## Estado atual

| Item | Situação |
| --- | --- |
| Branch | `master` em dia com `origin/master` (PRs #1, #2 e #3 mergeados) |
| Spec | `.specs/features/learning-platform/spec.md`, aprovada |
| Context | `.specs/features/learning-platform/context.md` |
| Design (arquitetura) | `.specs/features/learning-platform/design.md`, aprovado |
| Tarefas | `.specs/features/learning-platform/tasks.md`, aprovado: 115 tarefas em 18 fases |
| Design visual | `design/tokens-to-agents.figcraft`, previews em `design/previews/`, tokens em `design/tokens.css` |
| Decisões | `.specs/STATE.md`, AD-001 a AD-009 |
| Dependências | `node_modules` instalada com **npm** (o usuário preferiu npm e descartou o pnpm). Não rodar `npm ci` de novo sem motivo. |
| Pendência no git | `package-lock.json` modificado: só o campo `name` (`scaffold` → `ai-engineering`). Pode entrar no primeiro commit. |

## Próximos passos (na ordem)

1. Criar a branch de trabalho (sugestão: `feat/platform-foundation`). Não commitar direto na `master`.
2. Rodar `npm test`, `npm run lint` e `npm run build` para confirmar que a base atual está verde antes de mudar qualquer coisa.
3. Começar pela **T1** (aplicar os tokens do FigCraft) e seguir a ordem das fases, com um commit atômico por tarefa.
4. Com 115 tarefas, a skill vai oferecer sub-agentes (batches de cerca de 7 tarefas). **Perguntar ao usuário antes de disparar.**
5. Depois da Phase 18 (piloto do módulo 03) há um **checkpoint**: o usuário revisa no navegador antes do rollout dos outros módulos.

## Decisões e preferências do usuário

- O nome do pacote fica `ai-engineering` por enquanto. Não renomear sem pedido.
- Os títulos das aulas são os do roadmap, em EN, com subtítulo em PT (AD-009).
- A aula de RAG que já existe vai para a 08.02 (T11).
- A busca usa índice em memória, montado com os dados do bundle. Sem Playwright: o layout é validado pelo agente `qa`.
- Push, deploy e qualquer ação externa só com autorização explícita.
- Quando o usuário diz "pode seguir", usar o padrão recomendado sem abrir perguntas de escolha.
- Toda resposta que grava arquivos passa pela revisão do subagente `reviewer` (review-gate do `CLAUDE.md` global).

## Ambiente

- FigCraft MCP: abrir o app com `"C:\Program Files\ArtCraft\FigCraft\figcraft.exe" --control 47800` e depois `/mcp` → figcraft → reconnect. Só é preciso para mexer no design.
- Skill grill-me: `C:\Users\Tarkuss\.agents\skills\grill-me\SKILL.md` (o Claude Code não carrega automaticamente).
