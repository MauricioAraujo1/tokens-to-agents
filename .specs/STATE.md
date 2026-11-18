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

## Handoff

- **Fase:** spec aprovada em 2026-11-18. Design visual feito no FigCraft, aguardando validação do usuário.
- **Design:** `design/tokens-to-agents.figcraft` com 3 páginas: Design System (claro e escuro), Aula (claro, escuro, seletor de idioma, busca, RTL, mobile) e Home/Prática/Laboratório/Resumos. PNGs em `design/previews/`, tokens exportados em `design/tokens.css`.
- **Design visual:** aprovado pelo usuário (PR #2 mergeado).
- **Arquitetura e tarefas:** `design.md` e `tasks.md` escritos (115 tarefas em 18 fases: plataforma + piloto do módulo 03); `validate_tasks.py` sem erros.
- **Aprovação:** `design.md` e `tasks.md` aprovados em 2026-11-18, incluindo as 4 decisões listadas (títulos do roadmap em EN, RAG em 08.02, índice de busca em memória, sem Playwright). O usuário pediu para **não executar nada ainda**.
- **Próximo passo:** quando o usuário mandar executar, rodar `npm ci` e começar pela T1, oferecendo sub-agentes por batch.
- **FigCraft:** o app precisa ser aberto com `figcraft.exe --control 47800` para o MCP (`--attach 47800`) conectar.
