# Tokens to Agents — Learning Platform Specification

## Problem Statement

Quem quer aprender AI Engineering encontra conteúdo gratuito espalhado, raso ou só em texto, sem uma trilha que vá dos fundamentos até a operação de sistemas em produção. O roadmap em `docs/ai-engineering-roadmap.md` já define a trilha (18 módulos, 237 aulas, 5 projetos), mas não existe uma plataforma que a ensine. O Tokens to Agents ensina cada conceito com uma cena interativa em passos, no formato da referência designed-to-scale.vercel.app, com identidade visual própria.

## Goals

- [ ] As 237 aulas dos 18 módulos do roadmap publicadas, cada uma com cena interativa em passos e com as 9 seções do padrão de aula.
- [ ] Interface disponível nos 21 idiomas, com layout espelhado em AR e HE.
- [ ] Abas Prática, Laboratório (com os 5 projetos guiados) e Resumos cobrindo os 18 módulos.
- [ ] Site estático no Vercel, sem backend, com progresso salvo só no navegador.
- [ ] Design validado no FigCraft antes da primeira linha de código.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Conteúdo das aulas em idiomas além de PT-BR | Decisão: só a interface é traduzida. As aulas ficam em PT-BR, e o CC BY-SA permite traduções da comunidade no futuro |
| Login, contas e sincronização entre dispositivos | Decisão: progresso só no navegador. A troca de máquina é feita por exportação e importação em JSON |
| Backend, banco de dados e API própria | O site é estático |
| Chamadas a LLM real no Laboratório | Os playgrounds são simulados no navegador. Uma API key exigiria guardar segredo do aluno |
| Analytics por aluno ou por evento e banner de consentimento | Decisão: só analytics agregado e sem cookies |
| Aula "System model one (Jev)" | Item sem referência verificável no roadmap. Fica fora até ser identificado |
| Publicação parcial (módulo a módulo) | Decisão: só publica quando os 18 módulos, as abas e os projetos estiverem prontos |
| Cópia da identidade da referência (nome, logo, crédito, textos, ilustrações) | Aproveitamos a linguagem visual e a estrutura, não a marca |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Escopo do conteúdo | Os 18 módulos (237 aulas) e os 5 projetos | Resposta do usuário: "Tudo" | y |
| Produção das cenas | Motor com peças reutilizáveis configuradas por aula. Aulas-chave podem ter cena custom | Resposta do usuário. Escrever 237 cenas do zero não escala | y |
| Idiomas | Interface em 21 idiomas (EN, ES, PT, FR, IT, DE, NL, PL, TR, ID, VI, EL, UK, RU, zh-Hans, zh-Hant, JA, KO, HI, AR, HE). Aulas só em PT-BR | Resposta do usuário | y |
| Código do ucraniano | `uk` (ISO 639-1). O rótulo "UA" do print é o código do país | Usar a tag BCP 47 correta evita erro de detecção de idioma | n |
| Idioma inicial da interface | O primeiro idioma de `navigator.languages` que esteja entre os 21. Se nenhum estiver, PT-BR | O público principal é brasileiro e o conteúdo é PT-BR | n |
| Autoria | Claude escreve as aulas e o usuário revisa cada módulo antes do próximo | Resposta do usuário | y |
| Ordem de execução | Design no FigCraft → plataforma → módulo 03 como piloto → demais módulos de 00 a 17 → abas → projetos → publicação | O usuário pediu publicar só no fim. O piloto interno valida o formato antes de escrever 237 aulas | n |
| Abas | Aprender = aulas. Prática = quizzes por módulo. Laboratório = playgrounds e os 5 projetos guiados. Resumos = cheat sheet por módulo | Resposta do usuário | y |
| Progresso | localStorage, com exportação e importação em JSON | Resposta do usuário | y |
| Nome | Tokens to Agents | Resposta do usuário | y |
| Deploy | Vercel, plano gratuito. O primeiro deploy e o vínculo da conta ficam com o usuário | Resposta do usuário. Deploy é ação externa e precisa de autorização | y |
| Visual | Fonte mono, papel com grade, cenas isométricas e botões neo-brutalistas, com paleta, logo e ícones próprios (uma cor por módulo), tema claro e escuro | Resposta do usuário | y |
| Telas no FigCraft | Design system e as telas: aula clara, aula escura, aula em RTL, seletor de idioma, busca, Prática, Laboratório, Resumos, home e aula no mobile | Resposta do usuário | y |
| Mobile | Layout adaptado: 3 colunas no desktop, gaveta no tablet, cena + narração empilhadas no celular | Resposta do usuário | y |
| Licença | Código MIT e conteúdo CC BY-SA 4.0 | Resposta do usuário | y |
| Analytics | Vercel Web Analytics (agregado, sem cookies) | Resposta do usuário | y |
| Item "Jev" | Removido do escopo | Resposta do usuário | y |
| Definição de aula concluída | A aula conta como concluída quando o aluno chega ao último passo | Regra simples e igual ao contador 0/N da referência. O quiz conta à parte | n |
| Stack | React + Vite + TypeScript, cenas em SVG animado, conteúdo em arquivos versionados no repo (decisão final no Design) | Site estático, cenas declarativas e conteúdo revisável por diff | n |
| Referências das aulas | Só fontes verificáveis (paper, doc oficial, repositório). Quando não houver fonte confirmada, a referência é omitida | Princípio do projeto: nunca inventar | n |
| Crédito à referência | Um "inspirado em designed-to-scale" no rodapé e no README | Reconhece a inspiração sem copiar a marca | n |

**Open questions:** none - all resolved or logged above (required before the spec is confirmed).

---

## User Stories

### P1: Navegar pela trilha ⭐ MVP

**User Story**: Como aluno, quero ver a trilha inteira e chegar a qualquer aula, para saber onde estou e o que vem depois.

**Why P1**: Sem navegação não há curso.

**Acceptance Criteria**:

1. The sistema SHALL exibir na sidebar os 18 módulos do roadmap, na ordem 00 a 17, cada um com sua cor, título e contador "concluídas/total".
2. WHEN o aluno expande um módulo THEN o sistema SHALL listar as aulas do módulo na ordem do roadmap.
3. WHEN o aluno abre a URL de uma aula THEN o sistema SHALL renderizar essa aula com o breadcrumb "NN. Módulo / Lição X de Y".
4. IF a URL não corresponde a nenhum módulo ou aula THEN o sistema SHALL exibir a página "não encontrado" com um link para a home.
5. The sistema SHALL exibir no topo as abas Aprender, Prática, Laboratório e Resumos, com a aba atual destacada.
6. WHEN o aluno abre a home THEN o sistema SHALL exibir a visão da trilha com os 18 módulos, o progresso de cada um e um botão "continuar" que leva à última aula aberta.

**Independent Test**: Abrir a home, expandir o módulo 06, clicar em "Cosine Similarity" e conferir a URL e o breadcrumb. Abrir `/learn/99/x` e ver a página "não encontrado".

---

### P1: Aprender uma aula em passos ⭐ MVP

**User Story**: Como aluno, quero avançar passo a passo numa cena animada com narração, para entender o mecanismo, não só a definição.

**Why P1**: É o formato central do produto.

**Acceptance Criteria**:

1. The tela de aula SHALL exibir título, subtítulo, badges de duração, nível e número de passos, a cena, o stepper "Nesta lição", o painel de narração e o checklist "Você vai aprender".
2. WHEN o aluno clica em Próximo ou pressiona → THEN o sistema SHALL avançar um passo e atualizar a cena, a narração e o stepper para esse passo.
3. WHEN o aluno clica em Voltar ou pressiona ← THEN o sistema SHALL voltar um passo.
4. WHILE o aluno está no primeiro passo o botão Voltar SHALL ficar desabilitado.
5. WHILE o aluno está no último passo o botão Próximo SHALL virar "Próxima aula" e levar à aula seguinte na ordem do roadmap.
6. WHEN o aluno clica num passo do stepper THEN o sistema SHALL ir direto para esse passo.
7. WHEN o aluno pressiona R THEN o sistema SHALL reiniciar a animação do passo atual.
8. WHEN o aluno pressiona Space THEN o sistema SHALL alternar entre pausar e retomar a animação.
9. WHILE o foco está num campo de texto os atalhos ←, →, R e Space SHALL ser ignorados.
10. The URL SHALL refletir o passo atual, para que um link abra a aula no mesmo passo.
11. IF a URL pede um passo fora do intervalo 1..N THEN o sistema SHALL abrir o passo 1.
12. The aula SHALL conter as 9 seções do padrão (Concept, How it works, Visual explanation, Real-world example, Code example quando aplicável, Trade-offs, Knowledge check, Related concepts, References), distribuídas entre os passos e o rodapé da aula.

**Independent Test**: Abrir a aula 03.08 (Self-Attention), percorrer todos os passos com → e voltar com ←, pausar com Space e copiar a URL do passo 4 numa aba nova.

---

### P1: Motor de cenas reutilizáveis ⭐ MVP

**User Story**: Como autor, quero montar a cena de uma aula combinando peças prontas por configuração, para produzir 237 aulas com qualidade consistente.

**Why P1**: Sem o motor, o escopo "tudo" não cabe.

**Acceptance Criteria**:

1. The motor SHALL renderizar uma cena a partir de uma configuração declarativa por passo, sem código específico da aula.
2. The motor SHALL oferecer as peças: fluxo de tokens, espaço vetorial 2D/3D, matriz/heatmap, grafo de nós e arestas, pipeline de etapas, loop de agente, servidor/cliente isométrico, gráfico de métricas e painel de métricas ao vivo.
3. WHERE uma aula declara uma cena custom o motor SHALL renderizar o componente custom no lugar das peças.
4. WHEN o passo muda THEN o motor SHALL animar a transição do estado anterior para o novo.
5. WHILE o sistema operacional pede movimento reduzido (`prefers-reduced-motion: reduce`) o motor SHALL mostrar direto o estado final de cada passo, sem animação.
6. IF a configuração de uma cena é inválida THEN o build SHALL falhar com uma mensagem que identifica a aula, o passo e o campo inválido.
7. The cena SHALL ter descrição textual acessível por passo (`aria-label` ou texto alternativo) com o que ela mostra.

**Independent Test**: Criar uma aula de teste só com configuração que usa 3 peças e ver a cena animar. Quebrar um campo e ver o build falhar apontando o campo.

---

### P1: Conteúdo completo da trilha ⭐ MVP

**User Story**: Como aluno, quero todas as aulas do roadmap escritas, para seguir a trilha do início ao fim.

**Why P1**: O usuário definiu o escopo como "tudo".

**Acceptance Criteria**:

1. The site publicado SHALL conter as 237 aulas listadas em `docs/ai-engineering-roadmap.md`, com os mesmos números e títulos.
2. The conteúdo das aulas SHALL estar em PT-BR, com cada termo técnico em inglês explicado na primeira vez em que aparece na aula.
3. The cada referência citada numa aula SHALL ter URL acessível e apontar para paper, documentação oficial ou repositório.
4. The aula SHALL declarar seus pré-requisitos como links para outras aulas, e cada link SHALL apontar para uma aula existente.
5. IF uma aula aponta para uma aula inexistente THEN o build SHALL falhar indicando a aula de origem e o destino.
6. The KV Cache e o Prompt Caching SHALL ser aulas separadas, conforme a nota do módulo 10.

**Independent Test**: Um script compara a lista de aulas do build com o roadmap e retorna zero diferenças. Um script checa links internos e externos.

---

### P1: Interface em 21 idiomas ⭐ MVP

**User Story**: Como aluno de qualquer país, quero usar a interface no meu idioma.

**Why P1**: Pedido explícito do usuário.

**Acceptance Criteria**:

1. The seletor de idioma SHALL listar os 21 idiomas com nome nativo e nome no idioma atual, em duas colunas, como no print de referência.
2. WHEN o aluno escolhe um idioma THEN o sistema SHALL trocar todos os textos da interface sem recarregar a página e salvar a escolha.
3. WHEN o aluno abre o site pela primeira vez THEN o sistema SHALL usar o primeiro idioma de `navigator.languages` que esteja entre os 21 e, se nenhum estiver, PT-BR.
4. WHILE o idioma é AR ou HE o sistema SHALL aplicar `dir="rtl"` e espelhar o layout (sidebar à direita, setas e stepper invertidos).
5. WHILE o idioma da interface não é PT o sistema SHALL mostrar na aula o aviso "conteúdo disponível em português", traduzido para o idioma atual.
6. The sistema SHALL renderizar os textos de CJK, HI, AR, HE, EL, RU e UK com fontes que tenham esses caracteres, sem caixas vazias (tofu).
7. IF falta uma chave de tradução THEN o build SHALL falhar listando o idioma e a chave.

**Independent Test**: Trocar para AR e ver o layout espelhado. Trocar para JA e ver a interface sem tofu. Remover uma chave do DE e ver o build falhar.

---

### P1: Progresso salvo no navegador ⭐ MVP

**User Story**: Como aluno, quero que o site lembre o que já concluí, sem criar conta.

**Why P1**: Os contadores e o "continuar" dependem disso.

**Acceptance Criteria**:

1. WHEN o aluno chega ao último passo de uma aula THEN o sistema SHALL marcar a aula como concluída e atualizar o contador do módulo e o total.
2. WHEN a mesma aula é concluída de novo THEN o sistema SHALL manter um único registro (os contadores não aumentam).
3. WHEN o aluno marca um item do checklist "Você vai aprender" THEN o sistema SHALL salvar esse estado.
4. WHEN o aluno clica em "Exportar progresso" THEN o sistema SHALL baixar um arquivo JSON com versão de schema, aulas concluídas, checklist, respostas de quiz e idioma.
5. WHEN o aluno importa um JSON válido THEN o sistema SHALL substituir o progresso atual pelo do arquivo, depois de uma confirmação.
6. IF o arquivo importado não é JSON, tem schema desconhecido ou passa de 1 MB THEN o sistema SHALL rejeitar a importação com mensagem e manter o progresso atual.
7. IF o localStorage está indisponível THEN o sistema SHALL funcionar sem salvar progresso e mostrar um aviso discreto uma vez por sessão.
8. WHEN o progresso muda em outra aba THEN o sistema SHALL atualizar os contadores da aba atual.
9. WHEN o schema salvo é de uma versão anterior THEN o sistema SHALL migrar os dados para a versão atual sem perder aulas concluídas.
10. WHEN o aluno clica em "Zerar progresso" e confirma THEN o sistema SHALL apagar todo o progresso salvo.

**Independent Test**: Concluir 2 aulas, exportar, zerar, importar e ver os contadores voltarem. Importar um `.txt` e ver a rejeição.

---

### P1: Busca rápida ⭐ MVP

**User Story**: Como aluno, quero buscar aulas e conceitos com Ctrl K.

**Why P1**: Com 237 aulas, navegar só pela árvore é lento.

**Acceptance Criteria**:

1. WHEN o aluno pressiona Ctrl K (Cmd K no macOS) ou clica na busca THEN o sistema SHALL abrir o modal de busca com o foco no campo.
2. WHEN o aluno digita 2 ou mais caracteres THEN o sistema SHALL listar até 10 resultados entre títulos de aula, conceitos e termos do glossário, ignorando acentos e maiúsculas.
3. WHEN o aluno escolhe um resultado com Enter ou clique THEN o sistema SHALL abrir a aula correspondente e fechar o modal.
4. WHEN o aluno pressiona Esc THEN o sistema SHALL fechar o modal e devolver o foco ao elemento anterior.
5. IF nenhum resultado corresponde THEN o sistema SHALL exibir "nenhum resultado" com o termo buscado.
6. The busca SHALL funcionar sem rede, com um índice gerado no build.

**Independent Test**: Ctrl K, digitar "atencao" (sem acento) e ver "Attention Mechanism" e "Self-Attention" nos resultados.

---

### P1: Tema claro e escuro ⭐ MVP

**User Story**: Como aluno, quero escolher entre tema claro e escuro.

**Why P1**: Faz parte da direção visual escolhida.

**Acceptance Criteria**:

1. WHEN o aluno abre o site pela primeira vez THEN o sistema SHALL seguir `prefers-color-scheme`.
2. WHEN o aluno clica no botão de tema THEN o sistema SHALL alternar o tema e salvar a escolha.
3. The texto e os componentes SHALL ter contraste mínimo WCAG AA (4.5:1 para texto normal) nos dois temas.
4. The cena SHALL usar as cores do tema atual.

**Independent Test**: Alternar o tema na aula e passar o checador de contraste nos dois temas.

---

### P1: Layout responsivo ⭐ MVP

**User Story**: Como aluno, quero estudar no celular.

**Why P1**: Decisão do usuário.

**Acceptance Criteria**:

1. WHILE a largura é 1280 px ou mais a aula SHALL usar 3 colunas: árvore, cena e narração.
2. WHILE a largura está entre 768 e 1279 px a árvore SHALL virar gaveta aberta por um botão, e a cena e a narração SHALL ficar lado a lado.
3. WHILE a largura é menor que 768 px a aula SHALL empilhar a cena no topo e a narração abaixo, com os botões Voltar e Próximo fixos no rodapé.
4. WHEN o aluno arrasta para a esquerda ou para a direita sobre a cena no celular THEN o sistema SHALL avançar ou voltar um passo.
5. The página SHALL não ter rolagem horizontal em larguras de 320 px ou mais.

**Independent Test**: Abrir a aula em 375, 1024 e 1440 px e conferir cada layout.

---

### P1: Prática ⭐ MVP

**User Story**: Como aluno, quero testar o que aprendi em cada módulo.

**Why P1**: Aba aprovada no escopo.

**Acceptance Criteria**:

1. The aba Prática SHALL ter um quiz por módulo, nos 18 módulos.
2. WHEN o aluno responde uma questão THEN o sistema SHALL mostrar na hora se acertou e a explicação da resposta correta.
3. WHEN o aluno termina um quiz THEN o sistema SHALL mostrar a nota e salvar a melhor nota do módulo.
4. The cada questão SHALL linkar a aula que ensina o assunto.

**Independent Test**: Fazer o quiz do módulo 07, errar uma questão e ver a explicação e o link da aula.

---

### P1: Laboratório ⭐ MVP

**User Story**: Como aluno, quero mexer livremente nos parâmetros das simulações e seguir projetos guiados.

**Why P1**: Aba aprovada no escopo, e os 5 projetos fazem parte do roadmap.

**Acceptance Criteria**:

1. The Laboratório SHALL ter playgrounds livres que reaproveitam as peças do motor de cenas, com controles para os parâmetros de cada uma (por exemplo temperatura, chunk size, pesos de attention, top-k).
2. WHEN o aluno muda um controle THEN o playground SHALL atualizar a cena em menos de 100 ms.
3. The Laboratório SHALL ter os 5 projetos guiados do roadmap, cada um com objetivo, etapas, conceitos aplicados com links para as aulas e código de referência.
4. The playgrounds SHALL rodar só no navegador, sem chamar API externa.

**Independent Test**: Abrir o playground de amostragem, mover a temperatura de 0 para 2 e ver a distribuição mudar. Abrir o projeto 02 e seguir os links das aulas.

---

### P1: Resumos ⭐ MVP

**User Story**: Como aluno, quero revisar um módulo inteiro numa página.

**Why P1**: Aba aprovada no escopo.

**Acceptance Criteria**:

1. The aba Resumos SHALL ter uma cheat sheet por módulo, nos 18 módulos, com os conceitos-chave, um diagrama e links para as aulas.
2. WHEN o aluno imprime uma cheat sheet THEN o sistema SHALL aplicar o estilo de impressão (sem navegação, fundo branco, cabendo em até 2 páginas A4).

**Independent Test**: Abrir o resumo do módulo 10 e usar Imprimir → PDF.

---

### P1: Publicação e operação ⭐ MVP

**User Story**: Como mantenedor, quero o site publicado de graça, medido sem rastrear ninguém e aberto a contribuições.

**Why P1**: É o destino do projeto.

**Acceptance Criteria**:

1. The build SHALL gerar um site estático que roda no Vercel sem servidor.
2. WHEN alguém acessa direto qualquer rota interna THEN o servidor SHALL servir a aplicação (rewrite para o SPA) sem erro 404.
3. The site SHALL carregar o Vercel Web Analytics sem cookies e sem enviar dados de progresso.
4. IF o script de analytics é bloqueado THEN o site SHALL funcionar normalmente.
5. The repositório SHALL conter `LICENSE` (MIT) para o código e `LICENSE-CONTENT` (CC BY-SA 4.0) para o conteúdo.
6. The rodapé SHALL creditar a inspiração em designed-to-scale.

**Independent Test**: `vercel build` local, servir a saída e abrir uma rota funda direto. Bloquear o analytics e navegar.

---

## Edge Cases

- IF o JavaScript está desativado THEN o sistema SHALL exibir uma mensagem `<noscript>` pedindo para ativá-lo.
- IF uma fonte web falha ao carregar THEN o sistema SHALL usar a fonte de fallback da pilha sem quebrar o layout.
- WHEN a aula tem só 1 passo THEN os botões Voltar e Próximo SHALL seguir as regras de primeiro e último passo ao mesmo tempo.
- WHEN o aluno está na última aula do módulo 17 THEN o botão "Próxima aula" SHALL levar à aba Laboratório, na lista de projetos.
- IF o aluno troca de idioma no meio de uma aula THEN o sistema SHALL manter a aula e o passo atuais.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| NAV-01 | P1: Navegar pela trilha | Execute | In Progress (T7: catálogo; T9: registry lazy; T12: sidebar pelo catálogo, NAV-01.1 e NAV-01.2; T13: `parseRoute`/`buildPath`, id inexistente → not-found, NAV-01.3 e NAV-01.4; T14: `useRoute` com push, replace e `popstate`; T15: App dirigido pela URL, aula com breadcrumb e aba atual destacada, NAV-01.3 e NAV-01.5; T16: `NotFoundPage` com link para a home, NAV-01.4; T67: breadcrumb "NN. Módulo / Lição X de Y" no `LessonHeader`, NAV-01.3; T73: a `LessonPage` abre a aula da URL com o breadcrumb, NAV-01.3; T77: `/` mostra a `HomePage` com hero, card de progresso (total, percentual, última aula aberta e `ProgressMenu`), "Continuar" para `lastVisited` no passo salvo ou para a 00.01 sem histórico, grade dos 18 módulos com "concluídas/total", status e link para a primeira aula não concluída, e a faixa dos 5 projetos (`projectCatalog`, títulos conferidos contra o roadmap) com link para `/lab/project/0N`; a `LessonPage` passa a gravar `lastVisited` com o passo atual, NAV-01.6; T128: home no visual do preview 07, com `ModuleCard` (faixa na cor do módulo, glifos de status e destaque do módulo da última aula), `ProgressMenu` em linha no card de progresso e entradas `animate-rise` escalonadas; conferência no navegador na T133; T134: a trilha e o botão dela só existem em `/learn/:id`; home, Prática, Laboratório e Resumos em largura total, como nos previews 07–10) |
| LES-01 | P1: Aprender uma aula em passos | Execute | In Progress (T8: validador das 9 seções, LES-01.12; T13: `?step` na rota e `resolveStep` fora de 1..N → passo 1, LES-01.10 e LES-01.11; T66: `useLessonNavigation` sem autoplay (avançar é manual, `isPlaying` só pausa a animação), abre no `?step` pedido e devolve o passo atual para a URL com `replaceState` (inválido ou ausente vira `?step=1`), `R` e "Repetir" refazem a animação do passo atual sem sair dele, no último passo o "Próximo" vira "Próxima aula" para a aula seguinte do catálogo ou o Laboratório depois da 17.14, aula de 1 passo segue as duas regras, LES-01.2 a .5, .7, .8, .10 e .11; chegar ao último passo conclui a aula no `App` até a `LessonPage` (T73), PRG-01.1; T67: título, subtítulo e badges traduzidos de duração, nível e passos (plural), LES-01.1; T68: `StepNarration` com "Passo X / N", tag, título, parágrafos e o callout `KeyIdea` só quando o passo tem ideia-chave, LES-01.1; T69: stepper "Nesta lição" com passos concluídos (rótulo acessível "…, concluído" e ícone), atual (`aria-current="step"`) e futuros, e clique que vai ao passo, LES-01.1 e LES-01.6; T71: `LessonFooterSections` com exemplo real, código com botão copiar (só quando a aula declara código), trade-offs com vantagens, desvantagens e alternativas, conceitos relacionados e referências, LES-01.12; T72: `KnowledgeCheck` com as perguntas da aula, correção na hora (escolha certa ou errada, a certa sempre apontada), explicação, "Tentar de novo" e opções em botões acessíveis por Tab, Enter e Space, LES-01.12; T73: `LessonPage` carrega a aula pelo registry e monta cabeçalho, cena, stepper, checklist, rodapé com o knowledge check depois dos trade-offs e painel de narração; os atalhos de passo saem do `App` para a página; aula sem arquivo mostra "em preparação", falha de import ou de render mostra "tentar de novo", que refaz o import, LES-01.1) |
| SCN-01 | P1: Motor de cenas reutilizáveis | Execute | In Progress (T6: stub de `SceneSpec`; T8: issues com arquivo, passo e campo, SCN-01.6; T10: teste parametrizado quebra `npm test`; T11: aula 08.02 com cena custom, SCN-01.3; T54: `SceneSpec` com as variantes `pieces` e `custom`, `SceneLayout`, `PieceSpec` como união discriminada das 9 peças, `SceneColor` restrita aos tokens do tema e `types.check.ts` com `@ts-expect-error` para campo errado, peça, layout, cena custom e cor inválidos, SCN-01.1, .2 e .6; T55: `<Scene>` posiciona as peças pelo `layout`, guarda a cena anterior e entrega a cada peça a mesma peça do passo anterior (`findPreviousPiece`), aplica `scene-transition` na troca de passo e nenhuma transição com `prefers-reduced-motion`, e o `aria-label` vem do `alt` do passo ou de `describeScene` via `t()`, SCN-01.1, .4, .5 e .7; T56: registry `customScenes` com `rag-flow` → `RagFlowScene`, que adapta o `RagDiagram`; título, descrição, rótulos, legenda, pílula "passo N" e mapa passo → nó saem dos componentes para `content/scenes/rag-flow.ts` (conteúdo em PT, AD-003); `LessonCanvas` renderiza `<Scene>`, SCN-01.3; SCN-01.2, peças: T57 `TokenStream` (query e keys em destaque, arco com espessura proporcional ao peso, barras, rótulos sem sobreposição até 12 tokens), T58 `Matrix` (rótulos, escala de cor declarada ou mín/máx, célula em destaque, máscara causal), T59 `VectorSpace` (escala uniforme com y para cima, projeção isométrica em 3D, k vizinhos da query, vetores e rótulo de distância), T60 `Chart` (barras ou linha com altura proporcional, corte `top-p` ou `threshold` com linha e barras fora do corte esmaecidas, destaque), T61 `MetricsPanel` (cards com o destaque em `aria-current`), T62 `Graph` (nós em posição relativa, arestas com rótulo e espessura pelo peso, caminho ativo em `path` destaca as arestas entre nós consecutivos, travessia com `visited`: nó em foco, visitado e não visitado esmaecido), T63 `Pipeline` (etapas em linha com `getRagEdgeGeometry`, ativa com `aria-current`, concluída e futura esmaecida, pontos `.flow-dot` só na conexão que chega na ativa e só com animação, ramo alternativo tracejado com rótulo, cena pausada marca `is-paused` e o CSS pausa os pontos), T64 `AgentLoop` (fases em ciclo com a última ligando à primeira, fase ativa com fluxo chegando nela, ferramenta chamada em pílula, contador `↻ iteração / maxIterations` em alerta no limite), T65 `ClientServer` (colunas isométricas por papel com as formas `platform`/`block` do diagrama RAG, um cliente por nó, fila com `size` em itens e número, barra de `utilization` com porcentagem, requisição ativa em trânsito); `pieceComponents` completo, com as 9 peças exigidas pelo tipo; T123: cena `rag-flow` no piso isométrico 2:1 do design, com blocos, cilindro e plataforma nos vértices da grade, setas nos eixos do piso e pílulas afastadas da linha, só com tokens `--diagram-*`, THM-01.4; T124: `TokenStream` no estilo do preview 01, com caixas de sombra dura, arco da key em `info`, pílulas de pontuação, barras por papel e marcas "↑ query"/"↑ key" traduzidas; T125: as outras 8 peças com contorno `line-strong`, sombra dura, `DiagramPill` e cartões de métrica do preview 01, só com tokens, THM-01.4; conferência no navegador pendente para a T133; T126: motion do 27abe4e na troca de passo, na narração e no destaque de nós, e `motion.test.ts` prova que, com `prefers-reduced-motion`, a regra universal zera animações e transições, SCN-01.4; T138: cena RAG com a legenda fora da área dos blocos e a proporção da viewBox ocupando a largura do quadro (rótulos de 4,6 → 6,5 px a 1440 px; os 11 px pedidos pelo QA ficam para decisão do usuário), `Pipeline` com `display: "chips"` e `repeat` para o resumo, `TokenStream` em lista abaixo de 768 px como no preview 06) |
| CNT-01 | P1: Conteúdo completo da trilha | Execute | In Progress (T6: tipos; T7: catálogo, CNT-01.1 e CNT-01.6; T8: validadores, CNT-01.2 a CNT-01.5; T10: todo arquivo de conteúdo validado no teste; T11: aula 08.02 migrada; T51: `glossary` com os termos do módulo 03 e da aula de RAG, `validateGlossary` rejeita id repetido e aula de origem inexistente, e `content.test.ts` passa a aceitar `[[termo|id]]` dos ids do glossário, CNT-01.2; T68: na narração, `[[termo|id]]` vira link para a aula que ensina o termo, com a explicação do glossário no `title`, CNT-01.2; T71: referências com o tipo da fonte (paper, documentação, repositório, artigo), abertas em aba nova com `rel="noopener noreferrer"`, CNT-01.3; conceitos relacionados como links `/learn/:id` com número e título do catálogo, CNT-01.4; T98: `npm run validate:content` (`scripts/validate-content.ts`, carregado pelo `runnerImport` do Vite) exige uma aula por item do catálogo, um quiz e um resumo por módulo e os 5 projetos do `projectCatalog`, listando o que falta, CNT-01.1; roda `validateLesson`, `validateQuiz`, `validateSummary` e o novo `validateProject` (conceitos com origem e destino), CNT-01.5; faz `HEAD` em cada URL de referência (GET quando o servidor recusa HEAD com 405/501) e acusa status ≥ 400 ou erro de rede com a URL e o arquivo, CNT-01.3; sai com 1 e a lista, ou 0 quando está tudo certo; hoje sai com 1 por falta de conteúdo (236 aulas, 18 quizzes, 18 resumos e 5 projetos), o que só se resolve com o rollout; Phase 17 (T99–T106): aulas 03.01 a 03.08 em `src/content/lessons/03/`, com o índice do módulo, 9 ou 10 passos por aula, as 9 seções da AD-010 e cenas só com peças; os números das cenas (contagens de n-gram e de pares do BPE, cortes do tokenizador de brinquedo do Laboratório, senoides, cossenos, softmax e pesos de attention) são calculados no próprio arquivo da aula; 11 termos novos no glossário, marcados como `[[termo|id]]` nos passos, CNT-01.1 (parcial) e CNT-01.2; T106 com `self-attention-lesson.test.ts`, que refaz o softmax a partir dos vetores da cena; Phase 18 (T107–T113): aulas 03.09 a 03.15, com 9 ou 10 passos, as 9 seções da AD-010 e cenas só com peças; os números das cenas (pesos de attention, cross-attention e cabeças pelo `attentionRow` do Laboratório, desvio do produto escalar por amostragem com `seededRandom`, custo do KV cache pelo `generationCost`, ativações da FFN, normalização, contagens de parâmetros a partir das configurações publicadas do Transformer base, GPT-2 e Llama 2, cross-entropy, gradiente p − y, cronograma de taxa do paper original, 6 · N · D e os dois tokenizadores BPE de brinquedo) são calculados no arquivo da aula; 15 termos novos no glossário, marcados como `[[termo|id]]` nos passos, CNT-01.1 (as 15 aulas do módulo 03) e CNT-01.2) |
| I18N-01 | P1: Interface em 21 idiomas | Execute | In Progress (T2: Geist Mono; T24: `LOCALES` com os 21 idiomas, `dir` e família de fonte, `detectLocale` com o primeiro idioma suportado e fallback PT-BR, I18N-01.1 e I18N-01.3; T25: `pt-BR.ts` com `Messages = typeof ptBR` e `messages.test.ts` sobre todo arquivo de idioma, string vazia ou placeholder diferente quebra `npm test` com idioma e chave, I18N-01.7; T26: `I18nProvider` com `t()`, plural por `Intl.PluralRules`, `<html lang dir>` e escolha salva em `ProgressV1.locale`, mensagens de cada idioma em chunk próprio e fallback pt-BR, I18N-01.2 a I18N-01.4; T27: textos de `src/components`, `src/app` e `NotFoundPage` via `t()`, teste de App com pseudo-idioma prova que nenhum texto de interface fica em pt-BR e que aula e passo se mantêm, I18N-01.2; o diagrama da aula 08.02 é conteúdo e segue em PT até a T56; T28: `LanguageMenu` em duas colunas com nome nativo e nome no idioma atual via `Intl.DisplayNames`, item atual em destaque, setas, Home, End, Enter e Esc, setas espelhadas no RTL, I18N-01.1 e I18N-01.2; T127: em RTL, `←` avança e `→` volta o passo, como o swipe e os ícones, e a cena fica LTR dentro da moldura espelhada (preview 05), I18N-01.4; T29: `loadScriptFont` importa sob demanda a Noto variável da escrita e a pilha de fontes troca por `:lang()`, falha de rede não lança, I18N-01.6; ausência de tofu no navegador fica para o agente `qa`; T30: `ContentLanguageNotice` no topo da aula fora do PT, no idioma da interface, I18N-01.5; Phase 6, I18N-01.1: mensagens da interface em `en` (T31), `es` (T32), `fr` (T33), `it` (T34), `de` (T35), `nl` (T36), `pl` (T37), `tr` (T38), `id` (T39) e `vi` (T40), cada um tipado `Messages` e coberto por `messages.test.ts`; Phase 7, I18N-01.1: mensagens em `el` (T41), `uk` (T42), `ru` (T43), `zh-Hans` (T44), `zh-Hant` (T45), `ja` (T46), `ko` (T47), `hi` (T48), `ar` (T49, I18N-01.4) e `he` (T50, I18N-01.4), com as categorias de plural CLDR de cada idioma; os 21 idiomas de `LOCALES` têm arquivo de mensagens; T140: em RTL, o conteúdo em PT (narração, títulos de passo, aula e módulo, rodapé, objetivos, knowledge check) fica em `dir="ltr"` ou `<bdi dir="ltr">`, I18N-01.4; `.uppercase` sem caixa alta nem letter-spacing em `:lang(ar|he|hi|zh|ja|ko)`, I18N-01.6) |
| PRG-01 | P1: Progresso salvo no navegador | Execute | In Progress (T3: safeStorage; T18: `ProgressV1` e `migrate`, v0 → v1 sem perder concluídas, versão futura ou lixo → null, PRG-01.9; T19: `ProgressStore` persistido, concluir idempotente, checklist, melhor nota, reset e fallback em memória, PRG-01.1, .2, .3, .10 e PRAC-01.3; T20: `useProgress` com `useSyncExternalStore` e evento `storage`, `useCourseProgress` vira fachada, PRG-01.8; T21: `exportProgress` e `parseImport` com erros tipados `not-json`, `too-large` e `unknown-schema`, PRG-01.4 a PRG-01.6; T22: `ProgressMenu` no rodapé da sidebar com exportar, importar e zerar com confirmação, PRG-01.4, .5, .6 e .10; T77: o mesmo `ProgressMenu` também no card de progresso da home; T23: `StorageNotice` uma vez por sessão sem localStorage, PRG-01.7; T66: chegar ao último passo conclui a aula, PRG-01.1; T73: a conclusão passa para a `LessonPage`, inclusive ao abrir direto no último passo, PRG-01.1; T70: `ObjectivesChecklist` marca e desmarca pelo `toggleObjective`, o estado vem do `useProgress` e volta ao reabrir a aula, PRG-01.3) |
| SRCH-01 | P1: Busca rápida | Execute | In Progress (T51: glossário no bundle, fonte dos termos da busca, SRCH-01.2; T52: `searchAll` sobre aulas, conceitos (títulos de passo) e glossário, sem acento nem maiúsculas, mínimo de 2 caracteres, até 10 resultados divididos em rodízio entre os grupos; o índice base vem do catálogo e do glossário no bundle e `loadFullSearchIndex` acrescenta os passos lendo os chunks das aulas do próprio site, SRCH-01.2 e SRCH-01.6; T53: `SearchDialog` com grupos Aulas, Conceitos e Glossário, orientação abaixo de 2 caracteres, "Nenhum resultado para “x”", Enter e clique abrem a aula e fecham o modal, Esc fecha e devolve o foco a quem abriu, Ctrl K e Cmd K abrem com o foco no campo, SRCH-01.1, .3, .4 e .5) |
| THM-01 | P1: Tema claro e escuro | Execute | In Progress (T1, T2, T4, T5; THM-01.4: a partir da T54, `SceneColor` só aceita tokens do tema e `sceneColor` devolve `var(--…)`; as peças das Phases 9 e 10 usam só essas cores; Graph, Pipeline, AgentLoop e ClientServer conferidos sem cor fixa; T116: utilitários do design system (`paper`, `brand`, `brand-soft`, `on-brand`, `sunken`, `subtle`, `success`, `info`, `--diagram-*`), sombras duras `shadow-press*` e `.scene-grid` de 24 px, com `on-brand` sobre `brand` ≥ 4.5:1 nos dois temas, THM-01.3; T117–T122: primitivas, cabeçalho, trilha, busca, menu de idioma e tela de aula restilizados com esses tokens; T128–T132: home, Prática, Laboratório, Resumos e "não encontrado" só com os nomes do design, e os aliases antigos (`canvas`, `surface-muted`, `green`, `green-dark`, `red`, `yellow`, `shadow-paper`, `paper-grid`, `--surface`, `--ink`, `--grid-line`) removidos do `globals.css`; T136: tokens de texto `--state-success-ink`, `--state-info-ink` e `--state-danger-ink` nos dois temas, ≥ 4,5:1 sobre surface, paper, sunken e o próprio `*-soft`; texto legível sem `ink-subtle`; rótulos sobre `brand-soft` em `ink`; texto esmaecido das cenas a 0,7, THM-01.3) |
| RSP-01 | P1: Layout responsivo | Execute | In Progress (T74: `LessonWorkspace` dono do layout, com áreas cabeçalho, cena, narração e corpo; abaixo de 768 px uma coluna na ordem cabeçalho, cena, narração e resto, RSP-01.3; de 768 px em diante grade com a narração na segunda coluna, fixa enquanto a coluna da cena rola, RSP-01.2; a árvore segue gaveta abaixo de 1280 px e coluna a partir daí, RSP-01.1; todas as áreas com `min-w-0` e o seletor de idioma preso às bordas abaixo de 640 px, RSP-01.5; T75: `MobileStepBar` abaixo de 768 px (por `matchMedia`), com um ponto por passo (concluído, atual com `aria-current="step"`, futuro) e Voltar/Próximo fixos no rodapé pelo `StepNavigation` compacto, respeitando primeiro e último passo; no celular o painel esconde a sua navegação, RSP-01.3; T76: `useSwipe` sobre a cena, com um dedo, ≥ 50 px e mais horizontal que vertical: esquerda avança, direita volta, sentido invertido em RTL; a cena usa `touch-action: pan-y`, RSP-01.4; verificação no navegador pendente para o agente `qa`; T134: telas de seção sem a trilha; T135: legenda do código e referências quebram linha, e `/learn/03-08` a 375 px fica sem scroll horizontal (`main.scrollWidth` 605 → 375), RSP-01.5; T138: `TokenStream` em lista abaixo de 768 px) |
| PRAC-01 | P1: Prática | Execute | In Progress (T79: `QuizRunner` com uma questão por vez, posição, acertos, melhor nota e barra por questão; as opções e o retorno vêm do `KnowledgeCheck` (`AnswerOptions` e `AnswerFeedback`), com a escolha errada marcada, a certa sempre apontada e a explicação na hora, PRAC-01.2; cada questão linka "Revisar: NN.MM Título" para `/learn/:id`, PRAC-01.4; no fim mostra "Você acertou X de N (P%)" e grava com `recordQuiz`, que só troca a melhor nota por uma proporção maior, PRAC-01.3; T80: `PracticePage` em `/practice` com a lista dos 18 módulos (melhor nota ou "—", item atual com `aria-current`) e, em `/practice/:moduleId`, o `QuizRunner` do quiz carregado pelo `loadQuiz`; módulo sem quiz publicado (`hasQuiz` do registry) aparece como "em produção", estado que só existe enquanto os quizzes não estão todos escritos; falha de import mostra "tentar de novo", PRAC-01.1; a cobertura dos 18 quizzes publicados depende do conteúdo, T114 em diante; T114: `quizzes/03.ts` com 10 questões, cada uma ligada a uma aula do módulo 03 (03.04, 03.06 e 03.08 a 03.15), validado pelo `validateQuiz` no `content.test.ts`, PRAC-01.1 (1 de 18 quizzes) e PRAC-01.4; T129: Prática no visual do preview 08, com letras A–D nas opções, marcas "correta"/"sua resposta" fora do nome acessível e o retorno no callout "Por que B", PRAC-01.2; conferência no navegador na T133) |
| LAB-01 | P1: Laboratório | Execute | In Progress (T81: `PlaygroundShell` com controles slider, select e texto rotulados, valor do slider em `<output>`, cena derivada dos valores na mesma renderização (as peças do motor sem a transição de 450 ms do `<Scene>`), erro de parâmetro em `role="alert"`, quadro "O que observar" e aviso de que tudo roda no navegador; nenhuma chamada a `fetch`, LAB-01.1, .2 e .4; o texto de cada playground é conteúdo em PT, AD-003; LAB-01.1, playgrounds: T82 tokenizador BPE (merges aprendidos num corpus de exemplo, empate para o par que aparece primeiro, aplicados um a um pelo slider sobre o texto digitado, com o token do último merge em destaque no `TokenStream` e a lista de merges com as ocorrências no texto), T83 temperatura e amostragem (softmax de `ln(p) / T` sobre uma distribuição fixa, T = 0 guloso, depois top-k e top-p, que mantém o menor grupo com soma ≥ p; `Chart` com os cortados esmaecidos e o último sorteio em destaque, tabela com probabilidade, acumulado e motivo do corte; o sorteio recebe o gerador por prop e os testes usam `seededRandom`, LAB-01.2), T84 pesos de attention (a query escolhida pontua `q · k / √d` contra cada key da frase "a gata viu um rato e fugiu", softmax em pesos que somam 1 e saída como soma ponderada dos valores; `TokenStream` com arcos e barras pelos pesos e a key mais pesada em destaque, e `Matrix` com a linha da query), T85 espaço de embeddings (11 palavras em 2D, ponto escolhido e k vizinhos pela similaridade de cosseno, do mais parecido para o menos; o `VectorSpace` recebe os vizinhos pela cor e pelas setas a partir da origem, porque os vizinhos da peça usam distância euclidiana), T86 chunk size e overlap (texto de 60 palavras em janela deslizante de `tamanho` palavras com passo `tamanho − overlap`, até o chunk que chega ao fim; overlap ≥ tamanho é rejeitado com mensagem; `Pipeline` documento → chunker → N chunks → embeddings e a lista dos chunks com o overlap marcado), T87 BM25 vs. busca vetorial (BM25 com k1 = 1.2, b = 0.75 e IDF do Lucene, busca vetorial por cosseno sobre embeddings de conceito de brinquedo e fusão RRF com `k` ajustável, somando 1 / (k + posição) de cada ranking; três `Chart` lado a lado com rótulo e a tabela com pontuação e posição em cada ranking; a moldura ganhou `labels` por peça), T88 KV cache e latência (operações por token gerado com contexto L: sem cache L + L², reprocessando a sequência; com cache 1 + L, só o token novo contra as keys guardadas; dois `Chart` de linha na mesma escala e `MetricsPanel` com operações, tempo simulado, aceleração em destaque e vetores no cache; o prefill fica fora da conta), T89 loop de agente (roteiro fixo com as ferramentas de exemplo `cotacao` e `calcular`, um evento por clique ou tudo de uma vez: pensar, agir com a ferramenta em pílula, observar, até a resposta na 3ª iteração; com limite menor, para depois das iterações permitidas com aviso em `role="alert"` e o contador `↻ N / N` em alerta). T90: `ProjectView` com objetivo, etapas numeradas em `<ol>`, conceitos aplicados como links `/learn/:id` com número e título do catálogo e o código de referência de cada arquivo com o caminho e o botão copiar (`CodeBlock` do rodapé da aula), LAB-01.3; T91: `LabPage` em `/lab` com a lista dos 8 playgrounds (registry `src/lab/registry.ts`) e dos 5 projetos do `projectCatalog`, item atual com `aria-current`; `/lab/playground/:id` abre o playground e `/lab/project/:id` carrega o projeto pelo `loadProject` do registry (projeto sem arquivo aparece "em produção", falha de import mostra "tentar de novo"); id desconhecido de playground ou de projeto mostra a página "não encontrado" (o `parseRoute` aceita qualquer id em `/lab/…` e a `LabPage` decide); um único `h1` por estado da página, LAB-01.1 e LAB-01.3; o conteúdo dos 5 projetos fica com a feature `content-projects`; T130: Laboratório no visual do preview 09, com a lista no estilo `SectionList`, o callout "O que observar" e o slider `.range-track` preenchido até o valor; conferência no navegador na T133; T139: sampling no layout do preview 09, com a caixa "prompt › O céu hoje está", uma barra horizontal por token com chip, valor e acumulado, cortados esmaecidos com texto AA e top-k inicial 40; a derivação continua síncrona, LAB-01.2) |
| SUM-01 | P1: Resumos | Execute | In Progress (T92: `SummarySheet` com a borda superior na cor `--module-NN`, "Resumo · Módulo NN" e o título do módulo do catálogo, o diagrama do resumo pelo `<Scene>` com a descrição acessível, conceitos-chave, fórmulas (só quando o resumo declara), pegadinhas e os links das aulas para `/learn/:id` com número e título do catálogo, SUM-01.1; T93: `print.css`, importado depois do `globals.css`, com `@page` A4, tokens de fundo e tinta apontando para `Canvas`/`CanvasText` do esquema claro em qualquer tema, app sem altura fixa nem rolagem interna, cabeçalho, árvore, aviso de storage e `.print-hidden` escondidos, diagrama em faixa baixa e seções sem quebra no meio, SUM-01.2; a conferência de ≤ 2 páginas em PDF fica com o agente `qa`; T94: `SummariesPage` em `/summaries` com a lista dos 18 módulos (resumo não publicado aparece "em produção", pelo `hasSummary` do registry) e, em `/summaries/:moduleId`, o `SummarySheet` carregado pelo `loadSummary`, com o botão "Imprimir / PDF" que chama `window.print`; lista e botão ficam fora da impressão; falha de import mostra "tentar de novo"; o `SectionPlaceholder` deixa de ser usado no `App`, SUM-01.1 e SUM-01.2; os 18 resumos dependem do conteúdo, T115 em diante; T115: `summaries/03.ts` com 11 conceitos-chave, 6 fórmulas, 7 pegadinhas, diagrama em `Pipeline` (texto → tokens → vetor + posição → attention + FFN → logits → próximo token) e links para as 15 aulas do módulo, tirados do catálogo, validado pelo `validateSummary`, SUM-01.1 (1 de 18 resumos); a conferência de ≤ 2 páginas A4 do resumo do 03 fica pendente com o agente `qa`, SUM-01.2; T131: Resumos no visual do preview 10, com faixa de 10 px na cor do módulo, "N aulas · ~H de estudo" no cabeçalho e as aulas numa linha de links; os testes de impressão seguem passando, SUM-01.1 e SUM-01.2; conferência no navegador na T133; T137: na impressão, `--state-*` e `--state-*-ink` voltam aos valores do tema claro, também a partir do tema escuro, SUM-01.2; T138: fluxo do resumo 03 em chips como no preview 10) |
| OPS-01 | P1: Publicação e operação | Execute | In Progress (T17: `vercel.json` com rewrite SPA, OPS-01.1 e OPS-01.2; o rewrite só é exercitado no deploy, o `vite preview` já tem fallback próprio; T78: `SiteFooter` no fim da home com "Inspirado em designed-to-scale" (link para designed-to-scale.vercel.app), OPS-01.6, e os links das licenças MIT (código) e CC BY-SA 4.0 (conteúdo) para os textos oficiais, em nova aba com `rel="noopener noreferrer"`; os arquivos `LICENSE` e `LICENSE-CONTENT` do OPS-01.5 entram na T97; T95: `@vercel/analytics` 2.0.1 (API conferida nas definições do pacote instalado); `initAnalytics()` no `main.tsx`, depois do render, só no build de produção, com `inject({ mode: "production", beforeSend })` dentro de `try`; o `beforeSend` só deixa passar visualizações de página com origem e caminho, sem query nem hash, e descarta eventos customizados; o progresso nunca é lido, OPS-01.3 e OPS-01.4; o envio real só acontece no deploy; T96: `index.html` com o título "Tokens to Agents", descrição, `<noscript>` pedindo para ativar o JavaScript (edge case da spec) e favicon novo "t→a" na cor da marca, conferidos no `dist/index.html` do build, OPS-01.1; T97: `LICENSE` (MIT, código), `LICENSE-CONTENT` (CC BY-SA 4.0, conteúdo de `src/content/`) e `LICENSE-FONTS` (OFL 1.1 das fontes Geist Mono e Noto) na raiz, OPS-01.5; o texto do CC BY-SA ainda precisa ser conferido contra o legalcode oficial antes da publicação; T132: `README.md` da arquitetura atual, com a estrutura real, "How lessons work", os atalhos, os testes, os scripts com `validate:content`, o status do piloto e as licenças apontando para `src/content/`) |

**ID format:** cada ID cobre a story inteira. Os critérios são referenciados como `ID.n` (por exemplo `LES-01.5` = critério 5 da aula em passos).

**Coverage:** 13 total, 0 mapped to tasks, 13 unmapped ⚠️ (o mapeamento sai na fase Tasks)

---

## Success Criteria

- [ ] O script de cobertura retorna 237/237 aulas do roadmap publicadas.
- [ ] O build passa com zero chaves de tradução faltando nos 21 idiomas.
- [ ] Zero links internos quebrados e zero referências externas fora do ar no momento da publicação.
- [ ] Lighthouse com Acessibilidade ≥ 95 e Performance ≥ 90 na tela de aula (mobile).
- [ ] O usuário aprova o design no FigCraft e cada módulo de conteúdo antes da publicação.
