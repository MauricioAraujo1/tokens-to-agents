import type { BlockDiagramSpec } from "../../../scene/types";
import type { LessonContent } from "../../../types/content";

// Infraestrutura como código com as contas no arquivo. Um ambiente de brinquedo descrito no código e o que
// existe de fato na nuvem depois de mudanças manuais no console. O plano conta o que difere só entre os
// recursos que estão no state: o Terraform não enxerga um recurso criado à mão fora dele. O preço por hora
// do nó de GPU é DE EXEMPLO. terraform plan -detailed-exitcode sai com 0 (sem mudanças), 1 (erro) ou 2 (há mudanças).

const money = (value: number) => `US$ ${Math.round(value).toLocaleString("pt-BR")}`;

interface Resource {
  id: string;
  label: string;
  /** Valor da propriedade que importa no exemplo, no código e na nuvem; null = não existe ali. */
  code: number | null;
  cloud: number | null;
}

// Passo 3: o código diz uma coisa, a nuvem tem outra.
const resources: Resource[] = [
  { id: "vpc", label: "rede (vpc)", code: 1, cloud: 1 },
  { id: "gpu-pool", label: "nós de gpu", code: 4, cloud: 5 },
  { id: "cpu-pool", label: "nós de cpu", code: 3, cloud: 3 },
  { id: "bucket", label: "versionamento do bucket", code: 1, cloud: 0 },
  { id: "lb", label: "balanceador", code: 1, cloud: 1 },
  { id: "debug-vm", label: "vm criada à mão", code: null, cloud: 1 },
];
const managed = resources.filter((resource) => resource.code !== null);
const toAdd = managed.filter((resource) => resource.cloud === null).length;
const toChange = managed.filter((resource) => resource.cloud !== null && resource.cloud !== resource.code).length;
const toDestroy = 0;
const invisible = resources.filter((resource) => resource.code === null).length;
const gpuPool = resources.find((resource) => resource.id === "gpu-pool");
const extraNodes = (gpuPool?.cloud ?? 0) - (gpuPool?.code ?? 0);
const NODE_HOURLY = 40;
const HOURS_PER_MONTH = 730;
const driftCost = extraNodes * NODE_HOURLY * HOURS_PER_MONTH;

// Passo 5: um ambiente novo a partir do mesmo módulo.
const newEnvironmentAdds = managed.length;

const flow = (active: string, done?: string[]): BlockDiagramSpec => ({
  id: "iac",
  piece: "block-diagram",
  blocks: [
    { id: "laptop", kind: "laptop", label: "main.tf", col: 0, row: 0.5 },
    { id: "git", kind: "documents", label: "git + revisão", col: 1, row: 0.5 },
    { id: "plan", kind: "tool", label: "terraform plan", col: 2, row: 0 },
    { id: "state", kind: "kv-cache", label: "state remoto", col: 2, row: 1 },
    { id: "cloud", kind: "cloud", label: "nuvem", col: 3, row: 0.5 },
  ],
  edges: [
    { from: "laptop", to: "git", label: "pull request" },
    { from: "git", to: "plan" },
    { from: "plan", to: "state", label: "lê e trava" },
    { from: "plan", to: "cloud", label: "apply" },
  ],
  active,
  ...(done ? { done } : {}),
});

const lesson: LessonContent = {
  id: "17-08",
  subtitle: "Descrever GPUs, clusters, buckets e endpoints em arquivos versionados: o plano mostra a diferença antes de mudar, e o drift deixa de ser surpresa.",
  objectives: [
    "Explicar a diferença entre configurar à mão e declarar a infraestrutura em código",
    "Descrever o ciclo init, plan, apply e o papel do state",
    "Detectar drift e saber o que o plano não enxerga",
    "Reusar um módulo para criar ambientes iguais",
  ],
  steps: [
    {
      id: "recipe",
      shortTitle: "A receita",
      title: "Receita escrita em vez de memória do cozinheiro",
      tag: "context",
      body: [
        "Um bolo feito de memória sai diferente a cada vez, e ninguém consegue repetir quando o cozinheiro sai de férias. Com a receita escrita, qualquer pessoa repete, e dá para comparar versões. Infraestrutura criada clicando no console é o bolo de memória: funciona até alguém precisar de uma cópia igual em outra região.",
        "[[Infraestrutura como código|infrastructure-as-code]] é a receita: a rede, os pools de GPU, os buckets dos pesos e os endpoints ficam em arquivos, versionados no git e revisados em pull request. Ferramentas como o [[Terraform|terraform]] e o OpenTofu, um fork aberto mantido na Linux Foundation, leem esses arquivos e chamam as APIs da nuvem para criar o que foi descrito.",
      ],
      keyIdea: "Se a infraestrutura não está num arquivo revisado, ninguém consegue recriá-la igual.",
      scene: { kind: "pieces", layout: "single", pieces: [flow("git")] },
      alt: "O arquivo main.tf vai por pull request para o git com revisão, em destaque; o terraform plan lê e trava o state remoto e aplica as mudanças na nuvem.",
    },
    {
      id: "declarative",
      shortTitle: "Declarar",
      title: "Você diz o quê, a ferramenta calcula o como",
      tag: "mechanism",
      body: [
        "Um script imperativo diz “crie 4 nós”; rodado duas vezes, cria 8. Uma [[configuração declarativa|declarative-configuration]] diz “devem existir 4 nós”; rodada duas vezes, a segunda não faz nada. A ferramenta compara o desejado com o que existe e calcula as ações que faltam.",
        "O ciclo do Terraform: init baixa os providers da nuvem; plan compara o código com o [[state|infrastructure-state]] e com a nuvem e mostra o que vai criar, mudar e destruir; alguém revisa o plano; apply executa exatamente esse plano e atualiza o state. O state guarda o mapa entre cada bloco do código e o recurso real, e por isso mora num backend remoto com trava, para duas pessoas não aplicarem ao mesmo tempo.",
      ],
      keyIdea: "Declarativo é idempotente: aplicar o mesmo código de novo não muda nada que já está certo.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "cycle",
            piece: "pipeline",
            stages: [
              { id: "write", label: "escrever .tf" },
              { id: "init", label: "init" },
              { id: "plan", label: "plan", color: "module-17" },
              { id: "review", label: "revisar no pr" },
              { id: "apply", label: "apply" },
              { id: "state", label: "state atualizado" },
            ],
            active: "plan",
            done: ["write", "init"],
          },
        ],
      },
      alt: "Pipeline do Terraform: escrever os arquivos, init, plan (em destaque), revisar no pull request, apply e state atualizado.",
    },
    {
      id: "drift",
      shortTitle: "Drift",
      title: "O que o código diz e o que a nuvem tem",
      tag: "mechanism",
      body: [
        `Numa madrugada de pico, alguém adiciona um nó de GPU pelo console, e outra pessoa desliga o versionamento do bucket dos pesos para “economizar”. Isso é [[drift de configuração|configuration-drift]]: a nuvem deixou de bater com o código. Na matriz, a coluna do código e a da nuvem diferem em ${toChange} recursos gerenciados.`,
        `Há um caso pior: a VM de debug criada à mão nunca entrou no código nem no state, e o plano não a enxerga. O Terraform compara só o que gerencia; recursos fora dele pedem outra defesa, como tags obrigatórias e um inventário da conta que acusa o que não tem dono.`,
      ],
      keyIdea: "O plano acusa drift do que está no state; o que foi criado fora dele é invisível para a ferramenta.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "drift-matrix",
            piece: "matrix",
            rows: resources.map((resource) => resource.label),
            cols: ["no código", "na nuvem"],
            values: resources.map((resource) => [resource.code ?? 0, resource.cloud ?? 0]),
            scale: { min: 0, max: 5 },
            showValues: true,
            highlight: { row: 1, col: 1 },
            color: "module-17",
          },
        ],
      },
      alt: `Matriz com o valor de cada recurso no código e na nuvem: ${resources.map((resource) => `${resource.label} ${resource.code ?? "ausente"} no código e ${resource.cloud ?? "ausente"} na nuvem`).join("; ")}.`,
    },
    {
      id: "plan",
      shortTitle: "O plano",
      title: "O plano antes de qualquer mudança",
      tag: "example",
      body: [
        `Rodando o plano: ${toAdd} para criar, ${toChange} para mudar e ${toDestroy} para destruir. O nó extra volta para ${gpuPool?.code ?? 0}, e o versionamento volta a ligar. Antes de aplicar, a pergunta é se o código está certo ou a nuvem: se o pico pediu o nó a mais, o certo é mudar o código e passar pela revisão, não desfazer a mudança.`,
        `Drift também custa: um nó de GPU esquecido a ${money(NODE_HOURLY)} por hora (preço de exemplo) soma ${money(driftCost)} num mês. Por isso times rodam terraform plan -detailed-exitcode todo dia no CI: saída 2 quer dizer que há diferença, e vira um alerta para alguém olhar.`,
      ],
      keyIdea: "Plano diário no CI transforma drift em alerta: código ou nuvem, alguém decide qual está certo.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "plan-output",
            piece: "metrics-panel",
            metrics: [
              { id: "add", label: "criar", value: String(toAdd) },
              { id: "change", label: "mudar", value: String(toChange), color: "module-17" },
              { id: "destroy", label: "destruir", value: String(toDestroy) },
              { id: "invisible", label: "fora do state", value: String(invisible), color: "danger" },
              { id: "cost", label: "nó esquecido por mês", value: money(driftCost), color: "danger" },
            ],
            highlight: "change",
          },
        ],
      },
      alt: `Resultado do plano: ${toAdd} para criar, ${toChange} para mudar, ${toDestroy} para destruir, ${invisible} recurso fora do state, e ${money(driftCost)} por mês de um nó de GPU esquecido, a preço de exemplo.`,
    },
    {
      id: "modules",
      shortTitle: "Ambientes",
      title: "Um módulo, três ambientes iguais",
      tag: "tradeoff",
      body: [
        `Um módulo do Terraform agrupa os recursos de um ambiente e recebe variáveis: tipo de GPU, número de nós, região. Dev, staging e produção usam o mesmo módulo com valores diferentes, e um ambiente novo numa região nova é um plano com ${newEnvironmentAdds} recursos para criar. O que foi testado em staging é o que vai para produção.`,
        "Os custos: o state guarda valores sensíveis em texto, então o backend precisa de criptografia e acesso restrito; mudanças urgentes passam a exigir PR e plano, o que parece lento numa emergência; e quem mexe no console por fora volta a criar drift. A disciplina é a de código: tudo pelo repositório, com revisão.",
      ],
      keyIdea: "Módulos com variáveis fazem ambientes iguais; o state precisa de cofre, e o console vira só leitura.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "environments",
            piece: "block-diagram",
            blocks: [
              { id: "module", kind: "documents", label: "módulo gpu-cluster", col: 0, row: 0.5 },
              { id: "dev", kind: "cloud", label: "dev: 1 nó", col: 2, row: 0 },
              { id: "staging", kind: "cloud", label: "staging: 2 nós", col: 2, row: 1 },
              { id: "prod", kind: "cloud", label: "prod: 4 nós", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "module", to: "dev", label: "vars dev" },
              { from: "module", to: "staging", label: "vars staging" },
              { from: "staging", to: "prod", label: "mesmo código" },
            ],
            active: "prod",
          },
        ],
      },
      alt: "Um módulo gpu-cluster gera o ambiente de dev com 1 nó e o de staging com 2 nós, cada um com as suas variáveis; o mesmo código testado em staging cria a produção com 4 nós, em destaque.",
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Infraestrutura com revisão de código",
      tag: "summary",
      body: [
        "Infraestrutura como código descreve o estado desejado em arquivos versionados. O plano mostra a diferença antes de mudar, o apply executa só o que foi revisado e o state remoto, travado e criptografado, liga o código aos recursos reais. Plano diário acusa drift; tags e inventário pegam o que ficou fora do state.",
        "Com ambientes reproduzíveis, dá para crescer sem medo de não conseguir repetir. A próxima aula trata de crescer: como escalar uma aplicação de IA quando o tráfego sobe e desce.",
      ],
      keyIdea: "IaC = estado desejado em git + plano revisado + state seguro + drift vigiado.",
      scene: { kind: "pieces", layout: "single", pieces: [flow("cloud", ["laptop", "git", "plan", "state"])] },
      alt: "O fluxo completo: arquivo, git com revisão, plano e state remoto já percorridos, e a nuvem em destaque recebendo o apply.",
    },
  ],
  realWorldExample:
    "A HashiCorp mantém providers do Terraform para AWS, Google Cloud e Azure que cobrem clusters Kubernetes gerenciados, pools de nós com GPU e buckets. Depois da mudança de licença do Terraform em 2023, a comunidade criou o OpenTofu, hoje mantido na Linux Foundation, que aceita a mesma linguagem e os mesmos providers.",
  code: {
    language: "bash",
    source: `terraform init
terraform plan -out=tfplan
terraform apply tfplan

terraform plan -detailed-exitcode
if [ $? -eq 2 ]; then
  echo "drift: a nuvem não bate com o código"
fi`,
    caption: "O ciclo do Terraform com o plano salvo e aplicado, e a checagem diária de drift: o código de saída 2 indica diferenças.",
  },
  tradeOffs: {
    pros: [
      "Ambientes reproduzíveis, iguais entre regiões e entre staging e produção",
      "Toda mudança de infraestrutura passa por revisão e fica no histórico",
      "O plano mostra o efeito antes de mexer em qualquer coisa",
    ],
    cons: [
      "O state é um ponto sensível: guarda segredos e precisa de trava",
      "Mudanças urgentes ficam mais lentas com PR e plano",
      "Recursos criados fora do código continuam invisíveis para a ferramenta",
    ],
    alternatives: [
      "Pulumi ou AWS CDK, que descrevem a infraestrutura em linguagens de programação",
      "Ferramentas nativas de cada nuvem, como CloudFormation e Deployment Manager",
    ],
  },
  knowledgeCheck: [
    {
      id: "idempotent",
      prompt: "O código declara 4 nós de GPU e o apply já rodou. Alguém roda o apply de novo, sem mudar nada. O que acontece?",
      options: [
        "Cria mais 4 nós, ficando 8",
        "Nada: o plano não acha diferença entre o desejado e o real",
        "Destrói os 4 e recria",
        "Dá erro de recurso duplicado",
      ],
      correct: 1,
      explanation: "A configuração é declarativa: a ferramenta calcula a diferença entre o desejado e o que existe. Sem diferença, não há ação.",
      lesson: "17-08",
    },
    {
      id: "invisible-resource",
      prompt: "Uma VM com GPU foi criada à mão no console e ninguém a importou no Terraform. O plano diário de drift vai acusá-la?",
      options: [
        "Sim, como recurso para destruir",
        "Não: o Terraform só compara recursos que estão no state; é preciso tags e inventário da conta",
        "Sim, como recurso para mudar",
        "Só se ela estiver desligada",
      ],
      correct: 1,
      explanation: "O plano compara o código com os recursos que o state conhece. Um recurso criado fora dele não aparece; inventário e tags obrigatórias pegam esse caso.",
      lesson: "17-08",
    },
  ],
  related: ["17-07", "17-09", "17-14"],
  references: [
    { title: "Terraform: documentação", url: "https://developer.hashicorp.com/terraform/docs", kind: "docs" },
    { title: "Terraform: State", url: "https://developer.hashicorp.com/terraform/language/state", kind: "docs" },
    { title: "OpenTofu: documentação", url: "https://opentofu.org/docs/", kind: "docs" },
  ],
};

export default lesson;
