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
| NAV-01 | P1: Navegar pela trilha | Design | Pending |
| LES-01 | P1: Aprender uma aula em passos | Design | Pending |
| SCN-01 | P1: Motor de cenas reutilizáveis | Design | Pending |
| CNT-01 | P1: Conteúdo completo da trilha | Design | Pending |
| I18N-01 | P1: Interface em 21 idiomas | Design | Pending |
| PRG-01 | P1: Progresso salvo no navegador | Design | Pending |
| SRCH-01 | P1: Busca rápida | Design | Pending |
| THM-01 | P1: Tema claro e escuro | Design | Pending |
| RSP-01 | P1: Layout responsivo | Design | Pending |
| PRAC-01 | P1: Prática | Design | Pending |
| LAB-01 | P1: Laboratório | Design | Pending |
| SUM-01 | P1: Resumos | Design | Pending |
| OPS-01 | P1: Publicação e operação | Design | Pending |

**ID format:** cada ID cobre a story inteira. Os critérios são referenciados como `ID.n` (por exemplo `LES-01.5` = critério 5 da aula em passos).

**Coverage:** 13 total, 0 mapped to tasks, 13 unmapped ⚠️ (o mapeamento sai na fase Tasks)

---

## Success Criteria

- [ ] O script de cobertura retorna 237/237 aulas do roadmap publicadas.
- [ ] O build passa com zero chaves de tradução faltando nos 21 idiomas.
- [ ] Zero links internos quebrados e zero referências externas fora do ar no momento da publicação.
- [ ] Lighthouse com Acessibilidade ≥ 95 e Performance ≥ 90 na tela de aula (mobile).
- [ ] O usuário aprova o design no FigCraft e cada módulo de conteúdo antes da publicação.
