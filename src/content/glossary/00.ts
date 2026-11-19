import type { GlossaryEntry } from "../glossary";

// Termos do módulo 00: Introduction to AI.

const entries: GlossaryEntry[] = [
  {
    id: "artificial-intelligence",
    term: "Artificial Intelligence",
    explanation: "Área que constrói sistemas capazes de fazer tarefas que pedem inteligência: entender, decidir, prever e gerar.",
    lesson: "00-01",
  },
  {
    id: "model",
    term: "Model",
    explanation: "Função aprendida a partir de dados que recebe uma entrada e devolve uma saída: uma classe, um número ou um texto.",
    lesson: "00-01",
  },
  {
    id: "narrow-ai",
    term: "Narrow AI",
    explanation: "IA feita para uma tarefa ou um domínio, como filtrar spam ou traduzir texto. Toda IA em produção hoje é desse tipo.",
    lesson: "00-01",
  },
  {
    id: "machine-learning",
    term: "Machine Learning",
    explanation: "Parte da IA em que o programa aprende uma tarefa a partir de exemplos, ajustando parâmetros, em vez de seguir regras escritas à mão.",
    lesson: "00-02",
  },
  {
    id: "deep-learning",
    term: "Deep Learning",
    explanation: "Parte do machine learning que usa redes neurais com muitas camadas, capazes de aprender as próprias features a partir de dados brutos.",
    lesson: "00-02",
  },
  {
    id: "neural-network",
    term: "Neural Network",
    explanation: "Modelo feito de camadas de unidades simples que multiplicam entradas por pesos, somam e aplicam uma função não linear.",
    lesson: "00-02",
  },
  {
    id: "feature",
    term: "Feature",
    explanation: "Informação de entrada que o modelo usa para decidir, como o número de palavras suspeitas de um e-mail ou o brilho de um pixel.",
    lesson: "00-02",
  },
  {
    id: "parameter",
    term: "Parameter",
    explanation: "Número interno do modelo ajustado no treino, como um peso ou um viés. Os LLMs de hoje têm bilhões deles.",
    lesson: "00-02",
  },
  {
    id: "generative-ai",
    term: "Generative AI",
    explanation: "IA que produz conteúdo novo (texto, imagem, áudio, código) a partir de padrões aprendidos em grandes volumes de dados.",
    lesson: "00-03",
  },
  {
    id: "llm",
    term: "Large Language Model",
    explanation: "Modelo de linguagem com bilhões de parâmetros, treinado em muito texto para prever o próximo token. É a base dos assistentes de chat.",
    lesson: "00-03",
  },
  {
    id: "foundation-model",
    term: "Foundation Model",
    explanation: "Modelo grande pré-treinado em dados amplos que serve de base para muitas tarefas, por prompt ou por fine-tuning.",
    lesson: "00-03",
  },
  {
    id: "prompt",
    term: "Prompt",
    explanation: "Texto de entrada que diz ao modelo generativo o que fazer: instrução, contexto e exemplos.",
    lesson: "00-03",
  },
  {
    id: "sampling",
    term: "Sampling",
    explanation: "Sorteio do próximo token a partir das probabilidades do modelo. É o que faz a mesma pergunta gerar respostas diferentes.",
    lesson: "00-03",
  },
  {
    id: "hallucination",
    term: "Hallucination",
    explanation: "Resposta gerada que soa plausível e confiante, mas é falsa ou não tem apoio nas fontes.",
    lesson: "00-03",
  },
  {
    id: "discriminative-model",
    term: "Discriminative Model",
    explanation: "Modelo que aprende a separar classes: estima P(rótulo | entrada) e responde qual é a classe de um exemplo.",
    lesson: "00-04",
  },
  {
    id: "generative-model",
    term: "Generative Model",
    explanation: "Modelo que aprende como os dados se distribuem, P(entrada) ou P(entrada, rótulo), e por isso consegue criar exemplos novos.",
    lesson: "00-04",
  },
  {
    id: "decision-boundary",
    term: "Decision Boundary",
    explanation: "Fronteira no espaço das entradas onde o classificador troca de resposta, por exemplo de spam para normal.",
    lesson: "00-04",
  },
  {
    id: "computer-vision",
    term: "Computer Vision",
    explanation: "Área da IA que trabalha com imagens e vídeo: classificar, detectar objetos, segmentar e gerar imagens.",
    lesson: "00-05",
  },
  {
    id: "embedding-model",
    term: "Embedding Model",
    explanation: "Modelo que transforma texto, imagem ou áudio num vetor de números, de modo que coisas parecidas fiquem próximas.",
    lesson: "00-05",
  },
  {
    id: "diffusion-model",
    term: "Diffusion Model",
    explanation: "Modelo generativo que cria imagens partindo de ruído e removendo um pouco do ruído a cada passo.",
    lesson: "00-05",
  },
  {
    id: "multimodal-model",
    term: "Multimodal Model",
    explanation: "Modelo que recebe ou gera mais de um tipo de dado, como texto e imagem, no mesmo processamento.",
    lesson: "00-05",
  },
  {
    id: "inference",
    term: "Inference",
    explanation: "Uso do modelo já treinado para responder uma entrada nova. Acontece a cada requisição, com os pesos congelados.",
    lesson: "00-06",
  },
  {
    id: "fine-tuning",
    term: "Fine-tuning",
    explanation: "Treino extra de um modelo pré-treinado com um conjunto menor de exemplos, para especializá-lo numa tarefa ou num estilo.",
    lesson: "00-06",
  },
  {
    id: "guardrail",
    term: "Guardrail",
    explanation: "Verificação em volta do modelo que barra entradas ou saídas perigosas, fora do formato ou fora da política.",
    lesson: "00-06",
  },
  {
    id: "ai-engineering",
    term: "AI Engineering",
    explanation: "Construção de produtos sobre modelos prontos, em geral foundation models: prompts, contexto, ferramentas, avaliação e operação.",
    lesson: "00-07",
  },
  {
    id: "ml-engineering",
    term: "ML Engineering",
    explanation: "Construção e operação de modelos próprios: dados, features, treino, validação, deploy e monitoramento do modelo.",
    lesson: "00-07",
  },
  {
    id: "eval",
    term: "Eval",
    explanation: "Conjunto de casos de teste com critério de acerto usado para medir a qualidade de um sistema de IA a cada mudança.",
    lesson: "00-07",
  },
  {
    id: "mlops",
    term: "MLOps",
    explanation: "Práticas para levar modelos à produção e mantê-los: versionar dados e modelos, automatizar treino e deploy, monitorar.",
    lesson: "00-07",
  },
  {
    id: "gpu",
    term: "GPU",
    explanation: "Processador com milhares de núcleos que fazem multiplicações de matrizes em paralelo. É o hardware que treina e serve os modelos.",
    lesson: "00-08",
  },
  {
    id: "open-weights",
    term: "Open Weights",
    explanation: "Modelo cujos pesos são publicados para download, de modo que qualquer um pode rodar e ajustar o modelo na própria máquina.",
    lesson: "00-08",
  },
  {
    id: "agent",
    term: "Agent",
    explanation: "Sistema em que o modelo decide, em loop, qual ferramenta chamar, observa o resultado e continua até cumprir o objetivo.",
    lesson: "00-08",
  },
];

export default entries;
