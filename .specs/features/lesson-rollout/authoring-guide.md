# Guia de escrita das aulas (rollout dos módulos)

Decisões do usuário (2026-11-19): aulas **enxutas** (cerca de 6 passos), escritas em **lotes de uns 4 módulos** com revisão entre os lotes, usando os **blocos isométricos novos** (peça `block-diagram`) e cenas **diferentes em cada aula**.

## Arquivos de um módulo `NN`

| Arquivo | Conteúdo |
| --- | --- |
| `src/content/lessons/NN/NN-MM-<slug>.ts` | Uma aula por arquivo, `export default lesson` (`LessonContent`). O nome do arquivo precisa começar pelo id da aula. |
| `src/content/lessons/NN/index.ts` | Cópia exata de `src/content/lessons/00/index.ts`. |
| `src/content/glossary/NN.ts` | Termos novos do módulo (`GlossaryEntry[]`, `export default`), como `src/content/glossary/00.ts`. |
| `src/content/quizzes/NN.ts` | Quiz do módulo (`QuizContent`), como `src/content/quizzes/03.ts`. |
| `src/content/summaries/NN.ts` | Resumo do módulo (`SummaryContent`), como `src/content/summaries/03.ts`. |

Não edite nenhum outro arquivo. Em especial: `glossary.ts`, `catalog.ts`, os tipos, as peças e as mensagens de i18n.

## Leia antes de escrever

- `src/types/content.ts` e `src/scene/types.ts`: os contratos. Uma cena com campo errado não compila.
- `src/content/lessons/00/00-01-what-is-artificial-intelligence.ts`: **a aula modelo** no formato enxuto, com `block-diagram`, gráfico, tokens, painel de métricas e contas reais.
- `src/content/lessons/03/03-08-self-attention.ts`: referência de profundidade e de contas calculadas no próprio arquivo.
- `src/content/catalog.ts`: título, nível e duração de cada aula.

## Formato da aula

- **5 a 7 passos.** Ordem típica: `context` → `mechanism` (1 ou 2) → `example` → `tradeoff` → `summary`. O validador exige pelo menos um `context` e um `mechanism`.
- Cada passo tem `shortTitle` curto (até uns 14 caracteres), `title`, `body` com **2 parágrafos**, `keyIdea` de uma frase, `scene` e `alt` (descrição da cena em PT-BR, para leitor de tela).
- Público: iniciante e avançado ao mesmo tempo. O primeiro parágrafo explica com uma analogia ou um exemplo concreto. O segundo traz o detalhe técnico correto (nome do algoritmo, a conta, o número que importa).
- `objectives`: 3 ou 4 itens. `realWorldExample`: um caso real e verificável. `code`: opcional, só quando ajuda (python, typescript, bash ou json), curto e correto.
- `tradeOffs`: pelo menos 2 prós e 2 contras; `alternatives` quando fizer sentido.
- `knowledgeCheck`: 2 questões de aplicação (não de decoreba), com `lesson` igual ao id da aula e ids únicos na aula.
- `related`: 2 ou 3 aulas do catálogo (anterior, próxima, conceito vizinho de outro módulo).
- `references`: 2 ou 3 links `https://` reais e estáveis: documentação oficial, paper no arXiv, página de projeto, livro aberto. **Nunca invente URL.** Na dúvida, use a página principal da documentação oficial.

## Cenas: cada aula de um jeito

- Use **pelo menos 3 tipos de peça diferentes** na aula e **pelo menos 2 passos com `block-diagram`**.
- Mantenha o `id` de uma peça entre passos seguidos quando a cena evolui: o motor anima a transição (blocos novos entram, o bloco ativo muda, a seta passa a fluir).
- Não repita a mesma sequência de cenas de uma aula para outra do mesmo módulo: varie a metáfora (fluxo de dados, comparação lado a lado, antes e depois, contas, gráfico de curva, grafo).
- Números na cena e no texto vêm de contas no próprio arquivo (como em 00-01 e 03-08) ou de fatos conhecidos com referência. Nada de estatística inventada.
- A peça `chart` não desenha valores negativos: use valores de 0 para cima (probabilidades, porcentagens, contagens).
- A peça `token-stream` e o `chart` ficam grandes com poucos itens; prefira de 5 a 10 itens.

### Peças

`token-stream` (tokens, query, keys, arcos, barras), `matrix` (heatmap, máscara causal), `vector-space` (pontos 2D/3D, vizinhos, distância), `graph` (nós e arestas, caminho, travessia), `pipeline` (etapas em linha, ramo alternativo, `display: "chips"`), `agent-loop` (pensar, agir, observar, ferramenta, iteração), `client-server` (clientes, fila, servidor, utilização), `chart` (barras ou linha, corte top-p ou limiar), `metrics-panel` (cards de métrica), `block-diagram` (os blocos isométricos).

### `block-diagram`

```ts
{
  id: "flow",
  piece: "block-diagram",
  blocks: [
    { id: "phone", kind: "phone", label: "app", col: 0, row: 0 },
    { id: "llm", kind: "llm", label: "modelo", col: 1, row: 0 },
  ],
  edges: [{ from: "phone", to: "llm", label: "prompt" }],
  active: "llm",          // zona verde, brilho, bloco flutuando; a seta que chega nele mostra o fluxo
  done: ["phone"],        // opcional: declarado, os blocos fora dele ficam esmaecidos (futuros)
}
```

- Grade: `col` de 0 a 3 e `row` de 0 a 1 (aceita `0.5`). No máximo **4 colunas e 2 linhas**, até uns 6 blocos.
- `label` curto, em minúsculas, até uns 16 caracteres. Rótulos de seta também curtos.
- `variant: "alternative"` na seta deixa o caminho tracejado em vermelho (erro, fallback, desvio).

| `kind` | Desenho | Use para |
| --- | --- | --- |
| `user` | plataforma com pessoas | usuários, clientes humanos |
| `app` | janela de app numa base | aplicação, backend, frontend |
| `embedding` | colunas de alturas diferentes | vetores, embeddings, features |
| `vector-db` | cilindro com vetores | banco vetorial |
| `retrieval` | funil com trechos | busca, filtro, top-k, ranking |
| `context` | folhas com trechos marcados | contexto, prompt montado, janela de contexto |
| `llm` | cabeça de robô sobre um chip | modelo, LLM, rede treinada |
| `answer` | balão de fala | resposta, saída gerada |
| `no-result` | caixa vazia com lupa | erro, nada encontrado, falha |
| `sql-db` | tabelas ligadas | banco relacional, dados tabulares |
| `nosql-db` | documentos JSON | banco de documentos |
| `kv-cache` | gaveteiro com raio | cache, chave-valor, KV cache |
| `documents` | pasta com arquivos | dataset, documentos, base de conhecimento |
| `phone` | celular | cliente mobile, app de chat |
| `laptop` | notebook | cliente web, desenvolvedor, IDE |
| `server` | rack com LEDs | API, servidor, serviço, GPU host |
| `cloud` | nuvem | provedor externo, API de terceiros, nuvem |
| `queue` | esteira com pacotes | fila, batch, streaming, mensageria |
| `agent` | robô com chave inglesa | agente |
| `tool` | caixa de ferramentas | ferramenta, function calling, servidor MCP |
| `memory` | pente de RAM | memória, estado, VRAM |
| `guardrail` | escudo | segurança, guardrail, validação |
| `eval` | prancheta com checks | avaliação, testes, métricas |
| `tokens` | peças com texto | tokens, tokenização |

## Texto

- PT-BR claro e direto. Frases curtas. Sem travessão (—): use dois-pontos, vírgula ou ponto.
- Termos técnicos em inglês aparecem marcados como `[[texto|id]]`, e o `id` precisa existir no glossário. Antes de criar um termo, procure o id em `src/content/glossary.ts` e em `src/content/glossary/*.ts`; se existir, reuse. Termos novos vão em `glossary/NN.ts`, com `lesson` igual à aula que ensina o termo e `id` em kebab-case. Nunca repita um id.
- A aula termina conectando com a próxima aula ou o próximo módulo.

## Quiz e resumo do módulo

- Quiz: 8 a 10 questões de aplicação, cada uma com `lesson` apontando para a aula que ensina o assunto, ids únicos.
- Resumo: 6 a 8 `concepts`, 4 a 6 `pitfalls`, `formulas` só se o módulo tiver, `diagram` com um `block-diagram` do módulo e `lessons` lendo o catálogo, como em `summaries/03.ts`.

## Conferência antes de terminar

```bash
npx vitest run src/content          # validador de conteúdo
npx tsc -b                          # tipos (corrija só erros nos seus arquivos)
npx oxlint src/content              # lint
```

Outros módulos podem estar sendo escritos ao mesmo tempo. Se aparecer erro em arquivo de outro módulo, ignore e não mexa nele.
