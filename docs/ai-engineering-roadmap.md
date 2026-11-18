# AI Engineering Roadmap

> Trilha gratuita de aprendizado em Inteligência Artificial — dos fundamentos à construção, avaliação e operação de sistemas de IA em produção.

## Visão geral

O conteúdo está organizado em módulos numerados. Cada módulo representa uma pasta e contém aulas menores, ordenadas de acordo com suas dependências conceituais.

**Público:** iniciantes e desenvolvedores, com uma trilha que começa nos fundamentos e avança até tópicos especializados.  
**Profundidade:** aprofundada, incluindo conceitos, arquitetura, matemática quando relevante e implementação.  
**Formato das aulas:** teoria, diagramas e visualizações interativas, exemplos de código, ferramentas do mercado e projetos práticos.

## Índice dos módulos

1. [00 — Introduction to AI](#00--introduction-to-ai)
2. [01 — Machine Learning](#01--machine-learning)
3. [02 — Deep Learning](#02--deep-learning)
4. [03 — Transformers Architecture](#03--transformers-architecture)
5. [04 — LLM Fundamentals](#04--llm-fundamentals)
6. [05 — Prompt Engineering](#05--prompt-engineering)
7. [06 — Embeddings & Vector Databases](#06--embeddings--vector-databases)
8. [07 — Information Retrieval](#07--information-retrieval)
9. [08 — RAG Architecture](#08--rag-architecture)
10. [09 — Advanced Knowledge Systems](#09--advanced-knowledge-systems)
11. [10 — LLM Inference & Optimization](#10--llm-inference--optimization)
12. [11 — Fine-tuning & Model Adaptation](#11--fine-tuning--model-adaptation)
13. [12 — AI Agents & Multi-Agent Systems](#12--ai-agents--multi-agent-systems)
14. [13 — Model Context Protocol (MCP)](#13--model-context-protocol-mcp)
15. [14 — Harness Engineering](#14--harness-engineering)
16. [15 — AI Software Engineering](#15--ai-software-engineering)
17. [16 — Evaluation, Safety & Observability](#16--evaluation-safety--observability)
18. [17 — AI Infrastructure & Deployment](#17--ai-infrastructure--deployment)
19. [Projetos práticos](#projetos-práticos)
20. [Padrão de estrutura de cada aula](#padrão-de-estrutura-de-cada-aula)
21. [Estrutura sugerida de pastas](#estrutura-sugerida-de-pastas)
22. [Referências e tópicos para aprofundamento](#referências-e-tópicos-para-aprofundamento)

---

# Grade curricular

## 00 — Introduction to AI

**Objetivo:** construir uma visão geral do universo da inteligência artificial e de seus principais campos.

- [ ] 00.01 — What is Artificial Intelligence?
- [ ] 00.02 — AI vs. Machine Learning vs. Deep Learning
- [ ] 00.03 — Generative AI
- [ ] 00.04 — Discriminative vs. Generative Models
- [ ] 00.05 — Types of AI Models
- [ ] 00.06 — How Modern AI Systems Work
- [ ] 00.07 — AI Engineering vs. ML Engineering
- [ ] 00.08 — The AI Ecosystem

## 01 — Machine Learning

**Objetivo:** entender como modelos aprendem padrões a partir de dados.

- [ ] 01.01 — What is Machine Learning?
- [ ] 01.02 — Supervised Learning
- [ ] 01.03 — Unsupervised Learning
- [ ] 01.04 — Reinforcement Learning
- [ ] 01.05 — Classification
- [ ] 01.06 — Regression
- [ ] 01.07 — Clustering
- [ ] 01.08 — Training, Validation & Testing
- [ ] 01.09 — Overfitting & Underfitting
- [ ] 01.10 — Model Evaluation & Metrics
- [ ] 01.11 — Gradient Descent
- [ ] 01.12 — Loss Functions

## 02 — Deep Learning

**Objetivo:** compreender redes neurais e os mecanismos usados para aprender padrões complexos.

- [ ] 02.01 — What is Deep Learning?
- [ ] 02.02 — Neural Networks
- [ ] 02.03 — Neurons, Weights & Biases
- [ ] 02.04 — Activation Functions
- [ ] 02.05 — Forward Propagation
- [ ] 02.06 — Backpropagation
- [ ] 02.07 — Gradient Descent & Optimization
- [ ] 02.08 — CNN — Convolutional Neural Networks
- [ ] 02.09 — RNN — Recurrent Neural Networks
- [ ] 02.10 — GPUs & Parallel Computing
- [ ] 02.11 — Distributed Training

## 03 — Transformers Architecture

**Objetivo:** estudar a arquitetura que serve de base para grande parte dos modelos de linguagem modernos.

- [ ] 03.01 — The Evolution of Language Models
- [ ] 03.02 — Tokenization
- [ ] 03.03 — Tokens & Vocabulary
- [ ] 03.04 — Byte Pair Encoding (BPE)
- [ ] 03.05 — Word & Token Embeddings
- [ ] 03.06 — Positional Encoding
- [ ] 03.07 — Attention Mechanism
- [ ] 03.08 — Self-Attention
- [ ] 03.09 — Query, Key & Value
- [ ] 03.10 — Multi-Head Attention
- [ ] 03.11 — Feed Forward Networks
- [ ] 03.12 — Encoder vs. Decoder
- [ ] 03.13 — Transformer Architecture
- [ ] 03.14 — Training a Transformer
- [ ] 03.15 — Hugging Face Ecosystem

## 04 — LLM Fundamentals

**Objetivo:** entender como Large Language Models funcionam, são treinados e geram respostas.

- [ ] 04.01 — What is an LLM?
- [ ] 04.02 — How LLMs Generate Text
- [ ] 04.03 — Next Token Prediction
- [ ] 04.04 — Parameters & Model Weights
- [ ] 04.05 — Context Window
- [ ] 04.06 — Temperature & Sampling
- [ ] 04.07 — LLM vs. SLM
- [ ] 04.08 — Open-Source vs. Closed-Source Models
- [ ] 04.09 — Multimodal Models
- [ ] 04.10 — Hallucinations
- [ ] 04.11 — Model Training Lifecycle
- [ ] 04.12 — Choosing the Right Model
- [ ] 04.13 — RLHF & DPO

## 05 — Prompt Engineering

**Objetivo:** criar instruções claras, controláveis e consistentes para modelos de linguagem.

- [ ] 05.01 — What is Prompt Engineering?
- [ ] 05.02 — Anatomy of a Prompt
- [ ] 05.03 — System, Developer, User & Assistant Roles
- [ ] 05.04 — Instructions vs. Context
- [ ] 05.05 — Zero-Shot Prompting
- [ ] 05.06 — Few-Shot Prompting
- [ ] 05.07 — Chain of Thought
- [ ] 05.08 — Structured Outputs & JSON
- [ ] 05.09 — Prompt Templates
- [ ] 05.10 — Tool Calling
- [ ] 05.11 — Prompt Injection & Security
- [ ] 05.12 — Advanced Prompting Techniques

## 06 — Embeddings & Vector Databases

**Objetivo:** entender como transformar informações em vetores e armazená-los para recuperação por similaridade.

- [ ] 06.01 — What are Embeddings?
- [ ] 06.02 — How Embedding Models Work
- [ ] 06.03 — Text Embeddings
- [ ] 06.04 — Vector Spaces
- [ ] 06.05 — Dimensions & Vectors
- [ ] 06.06 — Cosine Similarity
- [ ] 06.07 — Euclidean Distance & Dot Product
- [ ] 06.08 — Vector Search
- [ ] 06.09 — Vector Indexing
- [ ] 06.10 — Vector Databases
- [ ] 06.11 — Metadata Filtering
- [ ] 06.12 — ANN — Approximate Nearest Neighbors

## 07 — Information Retrieval

**Objetivo:** aprender como mecanismos de busca recuperam e ranqueiam informações relevantes.

- [ ] 07.01 — What is Information Retrieval?
- [ ] 07.02 — Lexical Search
- [ ] 07.03 — Inverted Index
- [ ] 07.04 — TF-IDF
- [ ] 07.05 — BM25
- [ ] 07.06 — Semantic Search
- [ ] 07.07 — Vector Search vs. Keyword Search
- [ ] 07.08 — Hybrid Search
- [ ] 07.09 — Reciprocal Rank Fusion (RRF)
- [ ] 07.10 — Reranking
- [ ] 07.11 — Cross-Encoders
- [ ] 07.12 — Search Evaluation

## 08 — RAG Architecture

**Objetivo:** construir sistemas que recuperam informações externas para fundamentar as respostas de um LLM.

- [ ] 08.01 — What is RAG?
- [ ] 08.02 — RAG Architecture
- [ ] 08.03 — Data Ingestion
- [ ] 08.04 — Document Parsing
- [ ] 08.05 — Chunking Strategies
- [ ] 08.06 — Chunk Size & Overlap
- [ ] 08.07 — Embedding Generation
- [ ] 08.08 — Indexing & Retrieval
- [ ] 08.09 — Context Construction
- [ ] 08.10 — Retrieval Augmentation
- [ ] 08.11 — Generation & Grounding
- [ ] 08.12 — Metadata & Filters
- [ ] 08.13 — Advanced RAG
- [ ] 08.14 — Agentic RAG
- [ ] 08.15 — RAG Evaluation
- [ ] 08.16 — RAG Optimization

## 09 — Advanced Knowledge Systems

**Objetivo:** explorar estruturas para organizar, relacionar, atualizar e recuperar conhecimento.

- [ ] 09.01 — Knowledge Bases
- [ ] 09.02 — Knowledge Graphs
- [ ] 09.03 — Graph Databases
- [ ] 09.04 — Nodes & Edges
- [ ] 09.05 — GraphRAG
- [ ] 09.06 — Graph-Based Retrieval
- [ ] 09.07 — LLM Knowledge Management
- [ ] 09.08 — Karpathy's LLM Wiki
- [ ] 09.09 — Persistent Knowledge Systems
- [ ] 09.10 — RAG vs. Knowledge Wiki
- [ ] 09.11 — Knowledge Updating & Maintenance

## 10 — LLM Inference & Optimization

**Objetivo:** compreender a execução de modelos e as técnicas para reduzir latência, custo e consumo de recursos.

- [ ] 10.01 — What is Inference?
- [ ] 10.02 — Prefill vs. Decode
- [ ] 10.03 — Tokens per Second
- [ ] 10.04 — Latency & Throughput
- [ ] 10.05 — KV Cache
- [ ] 10.06 — Prompt Caching
- [ ] 10.07 — Batching
- [ ] 10.08 — Continuous Batching
- [ ] 10.09 — Quantization
- [ ] 10.10 — Model Compression
- [ ] 10.11 — GPU Memory Management
- [ ] 10.12 — Inference Optimization
- [ ] 10.13 — Model Serving
- [ ] 10.14 — Cost Optimization
- [ ] 10.15 — Model Routing
- [ ] 10.16 — vLLM & Inference Engines

> **Nota:** KV Cache e Prompt Caching são assuntos diferentes e devem ter aulas separadas. KV Cache reutiliza estados de atenção durante a geração; Prompt Caching reutiliza o processamento de partes de prompts conforme o modelo ou provedor oferece suporte.

## 11 — Fine-tuning & Model Adaptation

**Objetivo:** aprender a adaptar modelos existentes para tarefas, domínios e comportamentos específicos.

- [ ] 11.01 — What is Fine-tuning?
- [ ] 11.02 — Pre-training vs. Fine-tuning
- [ ] 11.03 — When to Fine-tune?
- [ ] 11.04 — Dataset Preparation
- [ ] 11.05 — Data Quality & Cleaning
- [ ] 11.06 — Synthetic Data Generation
- [ ] 11.07 — Supervised Fine-tuning (SFT)
- [ ] 11.08 — LoRA
- [ ] 11.09 — QLoRA
- [ ] 11.10 — Parameter-Efficient Fine-tuning (PEFT)
- [ ] 11.11 — Quantization Fundamentals
- [ ] 11.12 — Training & Validation
- [ ] 11.13 — Fine-tuning Evaluation
- [ ] 11.14 — Model Deployment

## 12 — AI Agents & Multi-Agent Systems

**Objetivo:** projetar agentes que usam ferramentas, mantêm contexto, executam planos e colaboram com outros agentes.

- [ ] 12.01 — What are AI Agents?
- [ ] 12.02 — LLMs vs. AI Agents
- [ ] 12.03 — Agent Architecture
- [ ] 12.04 — Agent Loops
- [ ] 12.05 — Tools & Function Calling
- [ ] 12.06 — Planning & Reasoning
- [ ] 12.07 — Agent Memory
- [ ] 12.08 — Context Management
- [ ] 12.09 — Single-Agent Systems
- [ ] 12.10 — Multi-Agent Systems
- [ ] 12.11 — Agent Communication
- [ ] 12.12 — Agent Orchestration
- [ ] 12.13 — Supervisor & Worker Patterns
- [ ] 12.14 — Sequential & Parallel Agents
- [ ] 12.15 — Human-in-the-Loop
- [ ] 12.16 — Agent Frameworks
- [ ] 12.17 — LangChain & LangGraph
- [ ] 12.18 — Agent Reliability

## 13 — Model Context Protocol (MCP)

**Objetivo:** entender e implementar integrações padronizadas entre aplicações de IA, ferramentas e fontes de dados.

- [ ] 13.01 — What is MCP?
- [ ] 13.02 — Why MCP Exists
- [ ] 13.03 — MCP Architecture
- [ ] 13.04 — Hosts, Clients & Servers
- [ ] 13.05 — MCP Tools
- [ ] 13.06 — MCP Resources
- [ ] 13.07 — MCP Prompts
- [ ] 13.08 — Transports
- [ ] 13.09 — MCP Lifecycle
- [ ] 13.10 — Tool Discovery & Execution
- [ ] 13.11 — MCP Security
- [ ] 13.12 — Building an MCP Server
- [ ] 13.13 — Integrating MCP with Agents
- [ ] 13.14 — MCP vs. Function Calling

## 14 — Harness Engineering

**Objetivo:** construir o ambiente, as regras e os mecanismos que tornam agentes de desenvolvimento mais confiáveis e previsíveis.

- [ ] 14.01 — What is Harness Engineering?
- [ ] 14.02 — Prompt Engineering vs. Harness Engineering
- [ ] 14.03 — Agent Instructions
- [ ] 14.04 — Rules & Constraints
- [ ] 14.05 — AGENTS.md & CLAUDE.md
- [ ] 14.06 — Skills & Reusable Workflows
- [ ] 14.07 — Hooks & Lifecycle Events
- [ ] 14.08 — Tools & Permissions
- [ ] 14.09 — Subagents
- [ ] 14.10 — Context Engineering
- [ ] 14.11 — Agent Memory
- [ ] 14.12 — Sandboxing & Isolation
- [ ] 14.13 — Agent Feedback Loops
- [ ] 14.14 — Building Reliable Agent Environments

**Conceitos principais:**

- **Rules:** definem restrições, instruções e comportamentos que o agente deve seguir.
- **Skills:** fornecem procedimentos e conhecimento reutilizável para tarefas específicas.
- **Hooks:** executam ações em eventos do ciclo de vida do agente.

## 15 — AI Software Engineering

**Objetivo:** desenvolver software com IA de forma estruturada, testável e controlável.

- [ ] 15.01 — AI-Assisted Software Development
- [ ] 15.02 — Spec-Driven Development (SDD)
- [ ] 15.03 — Writing Technical Specifications
- [ ] 15.04 — Requirements & Acceptance Criteria
- [ ] 15.05 — Planning with AI Agents
- [ ] 15.06 — Architecture & Design
- [ ] 15.07 — Test-Driven Development (TDD)
- [ ] 15.08 — AI-Assisted Testing
- [ ] 15.09 — Code Review with Agents
- [ ] 15.10 — Continuous Integration
- [ ] 15.11 — Agentic Development Workflows
- [ ] 15.12 — Managing Technical Debt

## 16 — Evaluation, Safety & Observability

**Objetivo:** medir a qualidade dos sistemas de IA e torná-los confiáveis, rastreáveis e seguros.

- [ ] 16.01 — What is LLM Evaluation?
- [ ] 16.02 — Evaluation Metrics
- [ ] 16.03 — Model Evaluation vs. System Evaluation
- [ ] 16.04 — RAG Evaluation
- [ ] 16.05 — Agent Evaluation
- [ ] 16.06 — LLM-as-a-Judge
- [ ] 16.07 — Benchmarking
- [ ] 16.08 — Tracing & Observability
- [ ] 16.09 — Hallucination Detection
- [ ] 16.10 — Guardrails
- [ ] 16.11 — Prompt Injection Defense
- [ ] 16.12 — Data Privacy & Security
- [ ] 16.13 — Production Monitoring

## 17 — AI Infrastructure & Deployment

**Objetivo:** colocar sistemas de IA em produção, gerenciar infraestrutura e garantir escalabilidade e eficiência.

- [ ] 17.01 — AI Application Architecture
- [ ] 17.02 — Model APIs
- [ ] 17.03 — Self-hosted Models
- [ ] 17.04 — GPU Infrastructure
- [ ] 17.05 — Docker & Containers
- [ ] 17.06 — Model Serving
- [ ] 17.07 — Cloud AI Infrastructure
- [ ] 17.08 — Infrastructure as Code (IaC)
- [ ] 17.09 — Scaling AI Applications
- [ ] 17.10 — Load Balancing
- [ ] 17.11 — Distributed Inference
- [ ] 17.12 — Logging & Monitoring
- [ ] 17.13 — Cost Management
- [ ] 17.14 — CI/CD for AI Systems

---

# Projetos práticos

Os projetos devem integrar conteúdos de vários módulos e servir como aplicação prática da trilha.

## 01 — AI Chat Application

Criar um chatbot com histórico, gerenciamento de contexto, integração com modelos e respostas estruturadas.

**Conceitos aplicados:** LLM Fundamentals, Prompt Engineering, Model APIs e Context Management.

## 02 — RAG Knowledge Assistant

Construir um assistente que consulta documentos, gera embeddings e recupera informações usando busca híbrida.

**Conceitos aplicados:** Embeddings, Vector Databases, Information Retrieval, Chunking e RAG.

## 03 — Multi-Agent System

Criar um sistema com agentes especializados, responsabilidades distintas, ferramentas compartilhadas e um agente supervisor.

**Conceitos aplicados:** AI Agents, Multi-Agent Systems, MCP e Harness Engineering.

## 04 — Fine-tuned LLM

Preparar um dataset, adaptar um modelo com LoRA ou QLoRA e comparar o comportamento antes e depois do treinamento.

**Conceitos aplicados:** Deep Learning, Fine-tuning, LoRA, QLoRA, Evaluation e Inference.

## 05 — Production AI Platform

Publicar uma aplicação de IA com monitoramento, avaliação, infraestrutura, observabilidade e otimização de custos.

**Conceitos aplicados:** Evaluation, Safety, Infrastructure, IaC, Deployment e Observability.

---

# Padrão de estrutura de cada aula

Todas as aulas devem seguir uma estrutura consistente, adaptada à complexidade do assunto.

1. **Concept** — explicação direta do conceito e do problema que ele resolve.
2. **How it works** — funcionamento explicado passo a passo.
3. **Visual explanation** — diagrama, animação ou visualização interativa quando fizer sentido.
4. **Real-world example** — exemplo de aplicação em um sistema real.
5. **Code example** — implementação ou demonstração prática, quando aplicável.
6. **Trade-offs** — vantagens, limitações, custos e alternativas.
7. **Knowledge check** — perguntas ou pequeno exercício para validar o aprendizado.
8. **Related concepts** — links para aulas relacionadas e pré-requisitos.
9. **References** — documentação, artigos, papers e materiais gratuitos para aprofundamento.

## Princípios editoriais

- Ensinar o conceito antes de apresentar um framework ou ferramenta.
- Explicar termos técnicos na primeira vez em que aparecem.
- Usar exemplos reproduzíveis e, sempre que possível, ferramentas gratuitas ou open source.
- Diferenciar fundamentos duradouros de ferramentas que podem mudar com o tempo.
- Incluir diagramas para explicar arquiteturas, fluxos e operações internas.
- Indicar pré-requisitos e conexões entre aulas.
- Manter o conteúdo gratuito e priorizar documentação e referências abertas.

---

# Estrutura sugerida de pastas

```text
ai-engineering/
│
├── 00-introduction-to-ai/
│   ├── 01-what-is-ai/
│   ├── 02-ai-vs-ml-vs-dl/
│   └── ...
│
├── 01-machine-learning/
│   ├── 01-supervised-learning/
│   ├── 02-unsupervised-learning/
│   └── ...
│
├── 02-deep-learning/
│   └── ...
│
├── 03-transformers-architecture/
│   └── ...
│
├── 04-llm-fundamentals/
│   └── ...
│
├── 05-prompt-engineering/
│   └── ...
│
├── 06-embeddings-vector-databases/
│   └── ...
│
├── 07-information-retrieval/
│   └── ...
│
├── 08-rag-architecture/
│   └── ...
│
├── 09-advanced-knowledge-systems/
│   └── ...
│
├── 10-llm-inference-optimization/
│   └── ...
│
├── 11-fine-tuning-model-adaptation/
│   └── ...
│
├── 12-ai-agents-multi-agent-systems/
│   └── ...
│
├── 13-model-context-protocol/
│   └── ...
│
├── 14-harness-engineering/
│   └── ...
│
├── 15-ai-software-engineering/
│   └── ...
│
├── 16-evaluation-safety-observability/
│   └── ...
│
├── 17-ai-infrastructure-deployment/
│   └── ...
│
└── projects/
    ├── 01-ai-chat-application/
    ├── 02-rag-knowledge-assistant/
    ├── 03-multi-agent-system/
    ├── 04-fine-tuned-llm/
    └── 05-production-ai-platform/
```

---

# Referências e tópicos para aprofundamento

A lista abaixo reúne temas e referências que devem aparecer ao longo da trilha, dentro dos módulos correspondentes.

| Tema ou referência | Módulo sugerido |
|---|---|
| Hugging Face | 03 — Transformers Architecture |
| Andrej Karpathy — LLM Wiki | 09 — Advanced Knowledge Systems |
| Vector Databases | 06 — Embeddings & Vector Databases |
| Cosine Similarity | 06 — Embeddings & Vector Databases |
| Lexical Search | 07 — Information Retrieval |
| Semantic Search | 07 — Information Retrieval |
| BM25 | 07 — Information Retrieval |
| Chunking | 08 — RAG Architecture |
| Batching | 10 — LLM Inference & Optimization |
| KV Cache | 10 — LLM Inference & Optimization |
| Prompt Caching | 10 — LLM Inference & Optimization |
| LoRA / QLoRA | 11 — Fine-tuning & Model Adaptation |
| Multi-Agent Systems | 12 — AI Agents & Multi-Agent Systems |
| System / Developer / User Roles | 05 — Prompt Engineering |
| Rules, Skills & Hooks | 14 — Harness Engineering |
| MCP | 13 — Model Context Protocol |
| SDD | 15 — AI Software Engineering |
| Graphs & Knowledge Graphs | 09 — Advanced Knowledge Systems |
| IaC | 17 — AI Infrastructure & Deployment |

## Item para esclarecer

- **“System model one (Jev)”** — termo anotado na lista original, mas ainda sem identificação suficiente para ser encaixado com segurança. Confirmar o nome ou a referência antes de criar uma aula.

---

## Princípio central do projeto

O objetivo não é criar apenas uma documentação sobre RAG, LLMs ou agentes. É construir um mapa de conhecimento gratuito de AI Engineering, que permita ao estudante sair dos fundamentos e chegar à capacidade de projetar, implementar, avaliar e operar sistemas de IA em produção.
