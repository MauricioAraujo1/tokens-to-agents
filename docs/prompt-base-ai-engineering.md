# Prompt — Criar a base do projeto AI Engineering

> Use este prompt em um agente de programação (Claude Code, Codex ou similar).  
> Anexe também a imagem de referência enviada pelo usuário. Ela é a referência visual principal e deve ser seguida de perto.

---

## Papel

Você é um engenheiro frontend sênior e especialista em UI/UX, design systems e interfaces educacionais interativas.

Sua tarefa é criar a **base funcional de um site gratuito para ensinar Inteligência Artificial**, inspirado visualmente na imagem de referência anexada. O projeto deve reproduzir com alta fidelidade a composição, hierarquia visual, densidade de informação, linguagem gráfica e sensação de produto da referência — adaptando o conteúdo de *System Design* para **AI Engineering**.

Não crie uma landing page. O objetivo é construir a interface principal da plataforma de aprendizado, já com navegação, estrutura de curso, visualização central de uma aula e painel lateral.

## Stack obrigatória

- React
- TypeScript
- Vite
- Tailwind CSS
- Lucide React para ícones
- SVG nativo para diagramas e elementos visuais interativos

Use versões estáveis e compatíveis das dependências. Não adicione bibliotecas pesadas sem necessidade.

## Objetivo desta primeira entrega

Construir uma aplicação frontend navegável com:

1. Shell completo da plataforma.
2. Sidebar com módulos e aulas em árvore expansível.
3. Header superior com navegação global, busca, idioma e tema.
4. Área principal de aula.
5. Canvas central para diagramas técnicos.
6. Painel lateral direito com explicação passo a passo.
7. Timeline inferior com etapas da aula.
8. Indicadores de progresso.
9. Dados mockados e tipados.
10. Responsividade e interações básicas.

**Não implemente backend, autenticação, pagamentos ou persistência remota nesta etapa.** A arquitetura deve permitir adicionar essas funcionalidades futuramente.

---

# 1. Direção visual

A imagem anexada é a referência prioritária. Reproduza a identidade visual com bastante proximidade, sem copiar textos, marca ou conteúdo específico do produto original.

## Personalidade

- Editorial, técnica e didática.
- Minimalista, mas com bastante informação visível.
- Aparência de ferramenta profissional, não de dashboard SaaS genérico.
- Leve inspiração em papel, caderno técnico, blueprint e diagramas desenhados.
- Interface clara, quente e de baixo contraste agressivo.
- Elementos com contornos escuros finos e sombras discretas.
- Tipografia compacta e legível.

## Paleta inicial

Defina as cores como tokens CSS/Tailwind para facilitar ajustes posteriores.

| Token | Cor | Uso |
|---|---|---|
| `canvas` | `#F5F0E7` | Fundo geral quente |
| `surface` | `#FBF8F1` | Painéis e cards |
| `surface-muted` | `#EEE8DC` | Áreas secundárias |
| `ink` | `#292820` | Texto principal e contornos |
| `muted` | `#817B70` | Texto secundário |
| `line` | `#D8D0C2` | Bordas e divisórias |
| `green` | `#B9D99B` | Cor principal de ação e progresso |
| `green-dark` | `#547B45` | Texto/ícones de sucesso |
| `blue` | `#8DB9DE` | Categoria técnica |
| `purple` | `#B8A2D8` | Conceitos/entidades |
| `orange` | `#EFB47D` | Nós principais e destaque |
| `red` | `#D96B65` | Erros, alertas e ameaças |
| `yellow` | `#E9D58B` | Avisos e dicas |

Não use gradientes chamativos, glassmorphism, fundos pretos ou o visual padrão de template administrativo.

## Tipografia

Use uma combinação próxima da referência:

- Interface, títulos e textos: `Inter` ou `IBM Plex Sans`.
- Labels técnicos, números, atalhos e metadados: `IBM Plex Mono` ou `JetBrains Mono`.

Carregue as fontes por uma estratégia confiável. Use fallbacks adequados.

## Forma dos componentes

- Bordas finas de 1px.
- Raios pequenos ou médios, sem excesso de arredondamento.
- Sombras curtas e suaves, como objetos sobre uma folha.
- Botões compactos, com estado hover e focus visíveis.
- Badges em formato de cápsula, com fundos pastel.
- Ícones pequenos, consistentes e preferencialmente Lucide.
- Evite cards enormes com muito espaço vazio.

## Textura de fundo do canvas

O canvas da aula deve ter uma grade isométrica/diagonal muito sutil, semelhante ao papel quadriculado técnico da imagem. Faça com CSS (`background-image` com gradientes lineares) ou SVG leve. A textura não pode prejudicar a leitura.

---

# 2. Layout principal

A aplicação deve ser pensada prioritariamente para desktop, seguindo a proporção e a distribuição da imagem de referência.

## Estrutura da tela

A tela principal deve ocupar 100% da viewport, sem scroll horizontal.

Distribuição aproximada em desktop:

- Header: 42–48px de altura.
- Sidebar esquerda: 220–240px.
- Painel principal: flexível, ocupando o espaço restante.
- Painel direito: 280–310px.
- Rodapé/timeline da aula: 90–105px dentro do painel principal.

Use CSS Grid ou Flexbox com áreas bem definidas. Evite posicionamento absoluto para a estrutura geral.

### Wireframe

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ LOGO / NOME     APRENDER   PRÁTICA   LABORATÓRIO   RESUMOS    BUSCA  PT  TEMA│
├──────────────┬───────────────────────────────────────────────┬──────────────┤
│              │                                               │              │
│ CURSO        │  BREADCRUMB                                   │  PASSO  X/Y  │
│              │  TÍTULO DA AULA                  BADGES        │              │
│ 00. Módulo   ├───────────────────────────────────────────────┤  EXPLICAÇÃO  │
│   Aula       │                                               │  DO PASSO    │
│   Aula       │                                               │              │
│              │             CANVAS / DIAGRAMA                 │  DICA        │
│ 01. Módulo   │                                               │              │
│   Aula       │                                               │  O QUE       │
│              │                                               │  MUDOU       │
│ ...          │                                               │              │
│              ├───────────────────────────────────────────────┤  VOLTAR      │
│ PROGRESSO    │  TIMELINE DE ETAPAS DA AULA                   │  PRÓXIMO     │
└──────────────┴───────────────────────────────────────────────┴──────────────┘
```

---

# 3. Header superior

Crie um header horizontal fixo no topo da aplicação.

### Lado esquerdo

- Ícone simples de livro/cérebro.
- Nome do produto: **AI Engineering**.
- Destaque visual discreto em uma palavra do nome, como na referência.

### Navegação central

Itens:

- Aprender
- Prática
- Laboratório
- Resumos

O item ativo deve ter fundo verde pastel, borda e sombra inferior muito discreta.

Nesta primeira versão, as rotas podem ser simples páginas/estados locais, mas os itens precisam parecer navegáveis. Se as demais áreas ainda não estiverem implementadas, apresente estados de placeholder bem acabados, sem links quebrados.

### Lado direito

- Campo de busca com placeholder `Buscar lições e conceitos...`.
- Atalho visual `Ctrl K`.
- Seletor de idioma, inicialmente `PT`.
- Botão para alternar tema claro/escuro.
- Avatar ou pequeno botão de perfil, sem implementar autenticação.

A busca deve abrir um popover/modal simples com resultados mockados e permitir navegar para uma aula.

---

# 4. Sidebar esquerda — árvore do curso

A sidebar deve ser semelhante à coluna de navegação da referência.

### Cabeçalho

- Ícone de pasta.
- Texto `Curso`.
- Total de aulas, por exemplo `120 lições`.

### Módulos

Exiba a estrutura do roadmap de AI Engineering:

```text
00. Introdução à IA
01. Machine Learning
02. Deep Learning
03. Arquitetura Transformers
04. Fundamentos de LLMs
05. Prompt Engineering
06. Embeddings e Bancos Vetoriais
07. Information Retrieval
08. RAG Architecture
09. Knowledge Systems
10. Inference e Otimização
11. Fine-tuning
12. AI Agents
13. Model Context Protocol
14. Harness Engineering
15. AI Software Engineering
16. Evaluation e Safety
17. AI Infrastructure
```

Cada módulo deve ter:

- Chevron para expandir/recolher.
- Ícone de pasta.
- Cor de identificação sutil.
- Nome do módulo.
- Progresso no formato `2/8`.

Ao expandir um módulo, exiba suas aulas como itens filhos.

Cada aula deve indicar seu estado:

- Não iniciada.
- Em andamento.
- Concluída.
- Aula atual.

A aula atual deve ter fundo destacado sutil, uma barra lateral verde e texto mais forte.

### Comportamento

- Expandir/recolher módulos.
- Selecionar uma aula.
- Atualizar o conteúdo central ao selecionar outra aula.
- Atualizar o progresso visual.
- Manter somente o estado necessário em React; não simular persistência real nesta fase.

### Rodapé da sidebar

Um bloco compacto de progresso geral:

- Label `PROGRESSO`.
- Exemplo `12 / 120`.
- Barra de progresso.
- Chevron ou link para visão geral.

---

# 5. Área principal — conteúdo da aula

A área central é a parte mais importante da interface.

Ela deve ter três regiões:

1. Cabeçalho da aula.
2. Canvas visual.
3. Timeline inferior.

## 5.1 Cabeçalho da aula

Exiba:

- Breadcrumb, exemplo: `08. RAG Architecture / Aula 3 de 8`.
- Título grande, exemplo: `Como funciona o RAG`.
- Subtítulo curto explicando o objetivo da aula.
- Badges à direita:
  - Tempo estimado: `12 min`.
  - Dificuldade: `Intermediário`.
  - Quantidade de etapas: `10 passos`.

Inclua uma faixa de indicadores compactos acima do canvas, quando fizer sentido para a aula. Exemplo de RAG:

- `DOCUMENTOS` — 120 arquivos.
- `CHUNKS` — 1.840 fragmentos.
- `EMBEDDINGS` — indexados.

Esses indicadores são ilustrativos e devem vir dos dados mockados da aula, não ficar hardcoded no componente.

## 5.2 Canvas de visualização

Crie um painel amplo, com borda, fundo de papel e grade diagonal muito sutil.

O canvas deve ocupar a maior parte da região central. Ele deve conter uma visualização SVG específica para a aula selecionada.

### Primeira visualização obrigatória: fluxo RAG

Implemente um diagrama SVG didático com estes elementos:

1. Usuário fazendo uma pergunta.
2. Aplicação recebendo a pergunta.
3. Modelo de embedding transformando a pergunta em vetor.
4. Banco vetorial consultando os documentos.
5. Recuperação dos chunks mais relevantes.
6. Contexto sendo enviado ao LLM.
7. LLM gerando a resposta.
8. Resposta retornando ao usuário.

Use nós com aparência de pequenos objetos/isométricos, contornos escuros, preenchimentos pastel e sombras leves. Conecte os nós com linhas e setas.

Diferencie visualmente:

- Requisição do usuário.
- Processamento.
- Recuperação.
- Contexto.
- Resposta.
- Erro ou caminho alternativo.

Adicione labels pequenas ao redor do diagrama, como:

- `query embedding`
- `top-k retrieval`
- `similarity score`
- `context injection`
- `generated answer`

### Interatividade do diagrama

- Cada etapa deve ser clicável.
- A etapa ativa deve ganhar destaque visual.
- As etapas futuras devem ficar menos destacadas.
- As conexões podem ser animadas de forma sutil para indicar o fluxo.
- Ao clicar em um nó, atualizar o painel explicativo à direita.
- Ao avançar a aula, atualizar o estado visual do diagrama.

Não use uma imagem estática como substituto do diagrama. A visualização deve ser feita em SVG/HTML para permitir interação e evolução futura.

### Controles no topo do canvas

Inclua:

- Botão `Repetir`.
- Botão `Pausar` / `Continuar`.

Esses controles devem funcionar sobre uma animação simples de demonstração do fluxo. Não é necessário criar um motor de simulação complexo.

### Legenda inferior

Exiba uma legenda pequena com as categorias de elementos do diagrama e suas respectivas cores/formas.

---

# 6. Painel direito — explicação guiada

O painel direito deve ter largura fixa aproximada de 290px em desktop e ser independente do canvas.

Ele contém:

## Cabeçalho do passo

- `PASSO 3 / 10`.
- Badge `SOLUÇÃO`, `CONCEITO` ou `ATENÇÃO`, conforme o tipo da etapa.

## Texto principal

Título curto e explicação em português, com leitura confortável.

Exemplo:

**O banco vetorial encontra os trechos mais relevantes**

A pergunta já foi convertida em um vetor. Agora, o sistema compara esse vetor com os embeddings armazenados e recupera os trechos que possuem maior similaridade semântica.

Destaque termos técnicos com pequenas marcações ou badges.

## Bloco de dica

Um card verde pastel com:

- Ícone de lâmpada.
- Label `BOM SABER`.
- Uma dica complementar ou observação importante.

## Bloco “O que mudou”

Lista curta com mudanças da etapa atual. Use marcadores coloridos:

- O vetor da pergunta foi gerado.
- Os documentos foram comparados.
- Os três trechos mais relevantes foram selecionados.

## Navegação inferior

- Botão `Voltar`.
- Botão principal `Próximo: [nome da próxima etapa]`.
- Atalhos de teclado discretos no rodapé, como `←` e `→` para navegar e `Space` para pausar.

### Comportamento

- O botão Próximo avança a etapa.
- O botão Voltar retorna uma etapa.
- Ao trocar a etapa, o título, texto, dica, lista de mudanças, badge e nó ativo do diagrama devem mudar juntos.
- No último passo, apresentar a conclusão/resumo da aula.
- Desabilitar Voltar no primeiro passo e Próximo no último, ou trocar Próximo por `Concluir aula`.

---

# 7. Timeline inferior — etapas da aula

Na parte inferior da área central, crie um painel horizontal com a timeline de todas as etapas da aula.

Cada etapa contém:

- Círculo numerado.
- Nome curto.
- Estado visual.

Estados:

- Concluída: círculo verde pastel.
- Atual: círculo com destaque e texto mais forte.
- Futura: fundo neutro e texto secundário.

A timeline deve:

- Permitir clicar em uma etapa.
- Atualizar o painel lateral e o diagrama.
- Indicar `Passo X de Y`.
- Ter scroll horizontal em telas menores, sem quebrar o layout.

Exemplo de etapas para a aula de RAG:

```text
1. Pergunta
2. Embedding
3. Busca
4. Similaridade
5. Top-K
6. Chunks
7. Contexto
8. Prompt
9. Geração
10. Resposta
```

---

# 8. Conteúdo e arquitetura de dados

Não espalhe textos de aula e informações dos módulos diretamente nos componentes.

Crie uma estrutura de dados tipada em TypeScript.

Sugestão:

```ts
export type LessonStatus = "locked" | "not-started" | "in-progress" | "completed";

export interface LessonStep {
  id: string;
  title: string;
  shortTitle: string;
  description: string;
  tip?: string;
  changes?: string[];
  diagramNodeId?: string;
  badge?: "concept" | "solution" | "warning";
}

export interface Lesson {
  id: string;
  title: string;
  description: string;
  duration: number;
  difficulty: "Iniciante" | "Intermediário" | "Avançado";
  status: LessonStatus;
  steps: LessonStep[];
  stats?: {
    label: string;
    value: string;
  }[];
}

export interface CourseModule {
  id: string;
  number: string;
  title: string;
  color: string;
  lessons: Lesson[];
}
```

Organize o conteúdo em arquivos próprios, por exemplo:

```text
src/
├── app/
│   ├── App.tsx
│   └── routes.tsx
├── components/
│   ├── layout/
│   │   ├── AppHeader.tsx
│   │   ├── CourseSidebar.tsx
│   │   ├── LessonWorkspace.tsx
│   │   └── LessonRightPanel.tsx
│   ├── course/
│   │   ├── ModuleTreeItem.tsx
│   │   ├── LessonTreeItem.tsx
│   │   └── CourseProgress.tsx
│   ├── lesson/
│   │   ├── LessonHeader.tsx
│   │   ├── LessonCanvas.tsx
│   │   ├── LessonTimeline.tsx
│   │   ├── StepNavigation.tsx
│   │   └── LessonStats.tsx
│   └── diagrams/
│       ├── RagDiagram.tsx
│       └── DiagramNode.tsx
├── data/
│   ├── course.ts
│   └── lessons/
│       └── rag.ts
├── hooks/
│   ├── useCourseProgress.ts
│   └── useLessonNavigation.ts
├── types/
│   └── course.ts
├── lib/
│   └── utils.ts
├── styles/
│   └── globals.css
└── main.tsx
```

A estrutura pode ser ajustada se houver uma solução mais simples e coerente, mas mantenha a separação entre layout, componentes, dados, tipos e lógica.

---

# 9. Conteúdo inicial obrigatório

Para demonstrar a experiência, não deixe o site com conteúdo genérico ou lorem ipsum.

Cadastre os 18 módulos do roadmap:

1. Introdução à IA
2. Machine Learning
3. Deep Learning
4. Arquitetura Transformers
5. Fundamentos de LLMs
6. Prompt Engineering
7. Embeddings e Bancos Vetoriais
8. Information Retrieval
9. RAG Architecture
10. Knowledge Systems
11. Inference e Otimização
12. Fine-tuning
13. AI Agents
14. Model Context Protocol
15. Harness Engineering
16. AI Software Engineering
17. Evaluation e Safety
18. AI Infrastructure

Para a primeira entrega:

- Todos os módulos devem aparecer na sidebar.
- Cada módulo deve possuir algumas aulas mockadas com nomes coerentes.
- O módulo de RAG deve ter uma aula completa com pelo menos 10 etapas.
- O diagrama RAG deve funcionar.
- As demais aulas podem abrir uma experiência de aula genérica, com título, descrição e etapas próprias.
- Não invente progresso concluído em massa; use dados iniciais plausíveis.

A grade curricular completa será refinada posteriormente. Facilite adicionar, remover e reordenar aulas sem mexer no layout.

---

# 10. Responsividade

A referência é desktop-first, mas o layout não pode quebrar em telas menores.

### Desktop — acima de 1280px

- Sidebar esquerda visível.
- Canvas central amplo.
- Painel direito visível.
- Timeline completa.

### Tablet — 768px a 1279px

- Sidebar recolhível.
- Painel direito pode virar drawer.
- Canvas ocupa o espaço disponível.
- Timeline com scroll horizontal.

### Mobile — abaixo de 768px

- Header compacto.
- Sidebar acessível por menu/drawer.
- Painel explicativo exibido abaixo do canvas ou em drawer.
- Diagrama com zoom/pan ou escala adaptável.
- Timeline horizontal com scroll.
- Botões de navegação acessíveis.
- Não tente comprimir as três colunas desktop em uma única tela mobile.

---

# 11. Interações e atalhos

Implemente pelo menos:

| Ação | Comportamento |
|---|---|
| Clicar em módulo | Expandir/recolher |
| Clicar em aula | Abrir aula |
| Clicar em nó SVG | Selecionar etapa relacionada |
| Clicar na timeline | Ir para etapa |
| Próximo | Avançar etapa |
| Voltar | Voltar etapa |
| Repetir | Voltar ao primeiro passo |
| Pausar | Pausar animação do diagrama |
| Buscar | Abrir busca e filtrar aulas |
| Alternar tema | Alternar claro/escuro |
| `←` / `→` | Navegar entre etapas |
| `Space` | Pausar/continuar animação |
| `Ctrl/Cmd + K` | Abrir busca |

Evite que atalhos capturem teclas quando o usuário estiver digitando em inputs ou textareas.

Inclua estados hover, active, focus-visible e disabled em todos os controles.

---

# 12. Acessibilidade e qualidade

- Use elementos semânticos HTML.
- Botões reais para ações.
- Labels acessíveis.
- Contraste adequado.
- Navegação por teclado.
- Focus visível.
- SVG com títulos/descrições acessíveis quando aplicável.
- Respeite `prefers-reduced-motion`.
- Não dependa apenas de cor para comunicar estados.
- Evite componentes gigantes e difíceis de manter.
- Evite `any` no TypeScript.
- Não ignore erros de lint ou build.

---

# 13. Regras importantes de implementação

1. **Fidelidade visual é prioridade.** Consulte a imagem anexada durante o desenvolvimento e compare o resultado com ela.
2. Não transforme o layout em um dashboard SaaS genérico.
3. Não use cards enormes e arredondados em toda parte.
4. Não use gradientes vibrantes, blur exagerado ou glassmorphism.
5. Não substitua o canvas por uma imagem estática.
6. Não coloque todo o código em um único componente.
7. Não deixe botões decorativos sem ação.
8. Não invente backend ou integrações externas.
9. Não use dados de aula diretamente espalhados pela interface.
10. Não sacrifique legibilidade para copiar dimensões exatas da imagem.
11. Priorize uma experiência desktop muito próxima da referência, mas mantenha adaptação mobile.
12. Todo texto da interface deve estar em português inicialmente, mantendo termos técnicos em inglês quando forem os nomes consagrados dos conceitos.

---

# 14. Critérios de aceite

Considere a primeira entrega concluída somente quando:

- [ ] O projeto React + TypeScript + Vite + Tailwind inicia sem erros.
- [ ] A interface ocupa corretamente a viewport desktop.
- [ ] Header, sidebar, workspace e painel direito estão presentes.
- [ ] Os 18 módulos aparecem na navegação.
- [ ] Módulos expandem e recolhem.
- [ ] Aulas podem ser selecionadas.
- [ ] Existe uma aula RAG completa com 10 etapas.
- [ ] O diagrama RAG é construído em SVG e possui nós interativos.
- [ ] O painel direito acompanha a etapa selecionada.
- [ ] A timeline acompanha a etapa selecionada.
- [ ] Próximo, Voltar e Repetir funcionam.
- [ ] A busca consegue localizar aulas mockadas.
- [ ] O tema claro/escuro funciona.
- [ ] Atalhos de teclado funcionam sem interferir na digitação.
- [ ] A interface é utilizável em tablet e mobile.
- [ ] Não existem botões principais sem comportamento.
- [ ] Não existem erros de TypeScript ou build.
- [ ] O visual geral é claramente inspirado na imagem de referência.

---

# 15. Processo de execução

Siga esta ordem:

### Fase 1 — Inspeção e setup

- Inspecione o repositório atual.
- Preserve configurações e arquivos úteis existentes.
- Se estiver vazio, inicialize Vite + React + TypeScript.
- Configure Tailwind.
- Instale Lucide React.
- Configure fontes, tokens e estilos globais.

### Fase 2 — Estrutura visual

- Implemente o shell da aplicação.
- Construa header.
- Construa sidebar.
- Construa workspace.
- Construa painel direito.
- Construa timeline.
- Ajuste dimensões e espaçamentos comparando com a referência.

### Fase 3 — Conteúdo e estado

- Crie os tipos.
- Cadastre os módulos.
- Cadastre aulas mockadas.
- Implemente a aula RAG com suas etapas.
- Implemente estado de módulo, aula e etapa selecionados.

### Fase 4 — Diagrama

- Construa o diagrama RAG em SVG.
- Adicione nós, conexões, setas, labels e legenda.
- Conecte os nós ao estado da aula.
- Implemente animação leve e controles de pausa/repetição.

### Fase 5 — Interações e responsividade

- Implemente navegação.
- Implemente busca.
- Implemente tema.
- Implemente atalhos.
- Implemente layouts tablet/mobile.
- Revise acessibilidade.

### Fase 6 — Validação

- Rode lint e build.
- Corrija todos os erros.
- Teste as interações principais.
- Compare visualmente com a imagem de referência.
- Faça uma última rodada de refinamento de espaçamento, tipografia, bordas, cores e proporções.

---

# 16. Entrega esperada

Ao finalizar:

1. Deixe o projeto executável localmente.
2. Informe os comandos para instalar dependências e iniciar o servidor.
3. Liste os principais arquivos criados.
4. Informe o que está funcional.
5. Informe explicitamente o que ainda é mockado ou está fora do escopo.
6. Não diga que algo foi implementado se não estiver funcionando.

**Comece inspecionando o repositório e a imagem de referência. Depois implemente a aplicação completa seguindo as fases acima. Não pare após criar apenas o esqueleto visual: entregue uma primeira versão navegável e funcional.**
