import { catalog } from "../catalog";
import type { LessonId, SummaryContent } from "../../types/content";

// Cheat sheet do módulo 17 (SUM-01.1). O diagrama é desenhado pelo <Scene> num passo único, e a folha
// tem estilo de impressão em A4 (SUM-01.2). As aulas linkadas saem do catálogo: as 14 do módulo, em ordem.

const lessons: LessonId[] = (catalog.find((module) => module.id === "17")?.lessons ?? []).map((lesson) => lesson.id);

const summary: SummaryContent = {
  module: "17",
  concepts: [
    "Arquitetura: cliente, backend assíncrono e sem estado, AI gateway (chaves, limites, roteamento, fallback), dados (busca, sessão, cache) e o modelo. O modelo domina o tempo total; as etapas antes dele dominam a primeira palavra.",
    "API de modelo: chave no servidor, uso de tokens registrado por pedido, limite efetivo = mín(RPM, TPM ÷ tokens por pedido), backoff exponencial com jitter nos 429 e versão do modelo fixada atrás de uma interface sua.",
    "Modelo próprio: pesos abertos num motor como o vLLM. Memória dos pesos = parâmetros × bytes; equilíbrio com a API = custo fixo mensal (GPUs + operação) ÷ preço por token. Dados sensíveis e modelos ajustados podem decidir antes do custo.",
    "GPU: memória para caber, banda da HBM para o decode, NVLink para o tensor parallelism dentro do nó, rede entre nós só para pipeline ou réplicas. GPUs = réplicas × GPUs por réplica, empacotadas em nós inteiros.",
    "Containers e Kubernetes: imagens em camadas (dependências antes do código), pesos fora da imagem, pods que pedem nvidia.com/gpu num pool de GPU, startup e readiness probes que esperam os pesos, rolling update com maxSurge ou maxUnavailable.",
    "Nuvem e IaC: quatro andares (VM, Kubernetes gerenciado, endpoint gerenciado, modelo por token), cota de GPU pedida cedo, e toda a infraestrutura em código declarativo com plano revisado, state remoto travado e drift vigiado.",
    "Escala e balanceamento: HPA por pedidos em andamento ou fila, dois níveis (pods e nós), recusa antecipada no teto; least-connections ou carga do motor em vez de round-robin; afinidade por conversa para o prefix cache; health checks ativos e passivos.",
    "Operação: logs estruturados com request_id, métricas de LLM (TTFT, tempo entre tokens, fila, KV cache, tokens por pedido), SLO com error budget e alerta por taxa de queima; custo por tag, base reservada, pico em spot com fallback, alertas por previsão; CD com eval gate, canary e rollback da release inteira.",
  ],
  formulas: [
    "Limite efetivo (pedidos/min) = mín(RPM, TPM ÷ tokens por pedido)",
    "Equilíbrio (tokens/mês) = (GPUs × preço da hora × horas + operação) ÷ preço por token da API",
    "Memória dos pesos = parâmetros × bytes por parâmetro (bf16 = 2, fp8 = 1, 4 bits = 0,5)",
    "Réplicas desejadas (HPA) = ⌈réplicas atuais × métrica atual ÷ métrica alvo⌉",
    "Com N regiões e perda de uma: réplicas por região = ⌈pico ÷ (N − 1)⌉",
    "Error budget = (1 − SLO) × eventos; taxa de queima = taxa de erro ÷ (1 − SLO)",
    "Margem de 95% de um eval gate ≈ 1,96 × √(2 · p · (1 − p) ÷ n)",
  ],
  pitfalls: [
    "Colocar a chave da API no app ou no repositório: quem a extrai gasta em seu nome.",
    "Comparar API com GPU própria sem somar redundância e horas de operação ao custo fixo.",
    "Usar o liveness probe padrão num servidor que leva minutos para carregar os pesos: o pod reinicia para sempre.",
    "Escalar réplicas de LLM pela CPU ou distribuir com round-robin: a CPU não mede a GPU, e o rodízio não mede o trabalho.",
    "Alertar por limiares soltos em vez de taxa de queima do error budget: acorda à toa e deixa passar o erro lento.",
    "Versionar só o código: sem modelo e prompt na release, não existe versão anterior para o rollback.",
  ],
  diagram: {
    kind: "pieces",
    layout: "single",
    pieces: [
      {
        id: "module-17",
        piece: "block-diagram",
        blocks: [
          { id: "phone", kind: "phone", label: "cliente", col: 0, row: 0.5 },
          { id: "gateway", kind: "server", label: "gateway + lb", col: 1, row: 0.5 },
          { id: "replicas", kind: "llm", label: "réplicas na gpu", col: 2, row: 0 },
          { id: "api", kind: "cloud", label: "api de fallback", col: 2, row: 1 },
          { id: "monitor", kind: "eval", label: "slo e custo", col: 3, row: 0 },
          { id: "cd", kind: "laptop", label: "iac + ci/cd", col: 3, row: 1 },
        ],
        edges: [
          { from: "phone", to: "gateway" },
          { from: "gateway", to: "replicas", label: "least-conn" },
          { from: "gateway", to: "api", label: "fallback", variant: "alternative" },
          { from: "replicas", to: "monitor", label: "métricas" },
          { from: "cd", to: "replicas", label: "canary" },
        ],
        active: "replicas",
      },
    ],
  },
  lessons,
};

export default summary;
