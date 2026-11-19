# STATE

## Decisions

| ID | Decision | Rationale | Date |
| --- | --- | --- | --- |
| AD-001 | Site estático sem backend, progresso em localStorage | Custo zero, sem dado pessoal guardado | 2026-11-18 |
| AD-002 | Cenas via motor de peças reutilizáveis configuradas por aula | 237 aulas custom não escalam | 2026-11-18 |
| AD-003 | Interface em 21 idiomas, conteúdo só em PT-BR | Alcance da interface sem multiplicar a escrita por 21 | 2026-11-18 |
| AD-004 | Design no FigCraft validado antes de codar | Pedido do usuário | 2026-11-18 |
| AD-005 | Publicação única no Vercel quando tudo estiver pronto | Pedido do usuário | 2026-11-18 |
| AD-006 | MIT (código) + CC BY-SA 4.0 (conteúdo) | Trilha gratuita e aberta a contribuições | 2026-11-18 |
| AD-007 | Evoluir a base do PR #1; conteúdo em TS tipado (`LessonContent`), carregado sob demanda por módulo | Configuração de cena inválida vira erro de build; reaproveita o shell e os testes | 2026-11-18 |
| AD-008 | Router e i18n próprios, sem biblioteca; `Messages = typeof ptBR` | Poucas rotas; chave de tradução faltando vira erro de tipo | 2026-11-18 |
| AD-009 | Títulos das aulas = títulos do roadmap (EN); subtítulo em PT na aula | CNT-01.1 exige os títulos do roadmap | 2026-11-18 |
| AD-010 | As 9 seções da aula (LES-01.12) viram campos assim: Conceito = passo `context`, Como funciona = passo `mechanism`, Visual = cena, Exemplo real não vazio, Código opcional (não vazio se declarado), Trade-offs com prós e contras, Quiz, Relacionados e Referências com ≥ 1 item. Referências é obrigatória no validador. | A spec não definia o mapeamento; o usuário aprovou o que entrou na T8 | 2026-11-18 |
| AD-011 | A tela da aula termina no stepper, como na versão publicada. Exemplo real, exemplo de código, trade-offs, conceitos relacionados, referências e knowledge check saem da `LessonPage`. Os campos continuam no `LessonContent` e no validador (AD-010), e os componentes continuam em uso por Projetos e Prática. | O usuário achou o rodapé poluído demais (2026-11-19). Isso muda a parte visível do LES-01.12. | 2026-11-19 |

## Handoff

- **Atualizado:** 2026-11-19. Feature `learning-platform`, fase Execute.
- **Tarefas:** 115 de 115 implementadas em `tasks.md`, 4 delas com ⚠️ por causa de pendência externa:
  - T74: layout a conferir pelo agente `qa` em 375, 1024 e 1440 px.
  - T93 e T115: impressão do resumo em até 2 páginas A4, também pelo `qa`.
  - T97: comparar o texto CC BY-SA com o legalcode oficial (exige rede).
- **Git:** tudo **sem commit** na `master`, por decisão do usuário. Branch e commits ficam para o fim, com a decisão dele; cada tarefa tem a mensagem proposta no campo `Commit` do `tasks.md`. Nada de push nem deploy.
- **Gates:** lint 0, `tsc -b` 0 e vitest com 643 testes em 76 arquivos. Rodar a partir de `C:\` (C maiúsculo) pelo PowerShell com `npx.cmd`/`npm.cmd`; pelo Git Bash (`/c/...`) todas as suítes falham. `vite.config.ts` usa `maxWorkers: '50%'`, decisão do usuário para estabilizar os testes de App.
- **Verifier:** PASS na iteração 1 de 3 (2026-11-19). O sensor matou 10 de 10 mutantes, incluindo M9 e M11 depois dos testes de correção. `validate_state.py learning-platform` sai com 0. Há 4 lições candidatas em `.specs/LESSONS.md`.
- **Alinhamento visual (2026-11-19):** o usuário rejeitou o visual de T1–T115 porque ele não segue o design. O Lucas fez a camada visual certa no `origin/master` (`59287a7`, `5a7b9bb`, `27abe4e`), só que sobre a arquitetura antiga.
  - **Decisão do usuário:** manter a nossa base e portar o visual dele.
  - **O que já veio do `origin/master`:** os previews 11 e 12 e o `.figcraft` atualizado, via `git checkout`, o que deixou os três arquivos staged. O código dele não entra por merge.
  - **Fases novas:** Phases 19–21 (T116–T133) no `tasks.md`.
- **Phases 19–22 (T116–T141):** executadas em 2026-11-19.
  - O QA da T133 reprovou; as correções entraram nas T134–T140.
  - O re-QA da T141 fechou 8 de 10 divergências e não achou regressões. O defeito novo, na impressão do pipeline, foi corrigido pelo orquestrador.
  - Gates: 744 testes, lint e tsc verdes. Revisão aprovada.
- **Abertos para o usuário:**
  - contraste dos rótulos da RAG no tema escuro (o preview 12 tem o mesmo problema) e o tamanho desses rótulos;
  - caixas `info`/`module-*` com texto escuro;
  - TokenStream no mobile sem todos os valores nem a fórmula;
  - "Bom saber" ou "Ideia-chave";
  - fórmula e legendas na cena 03.08;
  - busca por "atencao";
  - ícone do tema;
  - limpeza do pnpm: um sub-agente rodou `pnpm install` às 12:00, o que criou `pnpm-lock.yaml` e `node_modules/.pnpm`, contra a escolha de usar npm.
- **Pendências conhecidas (rollout dos módulos, 2026-11-19):**
  - a peça `matrix` mostra decimais com ponto (`toFixed`), não com vírgula; o usuário decidiu não mexer no componente por enquanto;
  - a referência de Jurafsky e Martin (`https://web.stanford.edu/~jurafsky/slp3/`) dá timeout na checagem daqui; o usuário decidiu manter.
- **Rollout dos módulos:** aulas enxutas (cerca de 6 passos), em lotes de uns 4 módulos, com a peça `block-diagram` dos blocos da página 05. Guia em `.specs/features/lesson-rollout/authoring-guide.md`. Lote 1: módulos 00, 01, 02 e 04.
- **Próximo passo:** checkpoint do piloto do módulo 03 no navegador, com o usuário. Branch e commits só por decisão dele.
- **Revisão (`reviewer`):** aprovada, sem BLOCKER nem HIGH. Os itens MEDIUM e LOW estão no resumo da sessão, entre eles setas em RTL, aviso de quota e Ctrl+clique nos links.
- **Depois:** checkpoint da Phase 18. O usuário revisa o módulo 03 no navegador antes do rollout dos outros 17 módulos.
- **Decisões pendentes do usuário:**
  - AD-011: tema fora do `ProgressV1`.
  - Texto dos playgrounds em PT.
  - "lição" ou "aula" no pt-BR.
  - Titular do copyright.
  - Marca "AI Engineering" no `AppHeader`.
  - Testes de busca que dependem do conteúdo real.
- **Desatualizado:** `.specs/handoff.md` ainda descreve o estado anterior à execução. Use esta seção.
- **FigCraft:** o app precisa ser aberto com `figcraft.exe --control 47800` para o MCP (`--attach 47800`) conectar.
