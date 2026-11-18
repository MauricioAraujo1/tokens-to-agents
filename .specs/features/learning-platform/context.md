# Learning Platform Context

**Gathered:** 2026-11-18
**Spec:** `.specs/features/learning-platform/spec.md`
**Status:** Ready for design (aguardando aprovação da spec)

---

## Feature Boundary

Plataforma estática "Tokens to Agents" que ensina as 237 aulas e os 5 projetos de `docs/ai-engineering-roadmap.md` em aulas com cena interativa em passos. Inclui as abas Aprender, Prática, Laboratório e Resumos, interface em 21 idiomas, progresso no navegador e deploy no Vercel.

---

## Implementation Decisions

### Escopo e produção de conteúdo

- Escopo completo: 18 módulos, 237 aulas e 5 projetos.
- As cenas saem de um motor com peças reutilizáveis configuradas por aula. Só as aulas-chave têm cena custom.
- Claude escreve as aulas e o usuário revisa cada módulo antes do próximo.
- O módulo 03 (Transformers) é o piloto interno do formato. Depois vêm os módulos de 00 a 17.
- Só publica quando tudo estiver pronto.

### Idiomas

- Interface nos 21 idiomas do seletor da referência, incluindo RTL (AR, HE).
- As aulas ficam só em PT-BR, com termos técnicos em inglês explicados na primeira vez em que aparecem.

### Abas

- Aprender: aulas em passos.
- Prática: um quiz por módulo, com correção na hora.
- Laboratório: playgrounds livres das peças de cena e os 5 projetos guiados.
- Resumos: uma cheat sheet por módulo, que pode ser impressa.

### Visual

- A mesma linguagem da referência: fonte mono, papel creme com grade, cenas isométricas, botões neo-brutalistas com sombra deslocada e cores pastel.
- Identidade própria: nome Tokens to Agents, logo, paleta com uma cor por módulo e ícones. Tema escuro desde o início.
- O design é feito no FigCraft e validado pelo usuário antes de qualquer código. Ele cobre o design system e as telas: aula clara, aula escura, aula em RTL, seletor de idioma, busca, Prática, Laboratório, Resumos, home e aula no mobile.

### Plataforma

- Progresso só em localStorage, com exportação e importação em JSON.
- Layout adaptado ao mobile.
- Deploy no Vercel com Web Analytics sem cookies.
- Open source: código em MIT e conteúdo em CC BY-SA 4.0.

### Agent's Discretion

- Stack e arquitetura (a proposta é React + Vite + TS com cenas em SVG), decididas na fase Design.
- O conjunto exato de peças do motor de cenas.
- A paleta dos 18 módulos e a tipografia, dentro da direção visual aprovada.

### Declined / Undiscussed Gray Areas → Assumptions

- Idioma inicial, código `uk`, definição de aula concluída, crédito à referência e política de referências verificáveis: registrados na tabela de Assumptions da spec.

---

## Specific References

- designed-to-scale.vercel.app: o print da tela de aula (sidebar com árvore e contadores, cena isométrica com métricas ao vivo, stepper de 10 passos, narração com tag e callout "Ideia-chave", checklist "Você vai aprender", atalhos ← → R Space, busca Ctrl K, seletor de idioma em 2 colunas).

---

## Deferred Ideas

- Tradução do conteúdo das aulas, por LLM ou pela comunidade.
- Laboratório com LLM real usando a API key do aluno.
- Login e sincronização de progresso.
- Aula "System model one (Jev)", quando a referência for identificada.
