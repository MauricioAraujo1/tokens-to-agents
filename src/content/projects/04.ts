import type { ProjectContent } from "../../types/content";

const project: ProjectContent = {
  id: "04",
  title: "Fine-tuned LLM",
  goal: "Você vai adaptar um modelo aberto pequeno, o Qwen2.5-0.5B-Instruct, para classificar chamados de suporte e responder só com um JSON de categoria e prioridade. O treino usa QLoRA: o modelo base fica congelado em 4 bits e só adaptadores LoRA pequenos aprendem. No fim, você vai saber preparar um dataset limpo, explicar o que r e lora_alpha controlam e provar com números se o ajuste melhorou o modelo.",
  steps: [
    {
      title: "Prepare o ambiente de GPU",
      body: "Use uma GPU NVIDIA com pelo menos 8 GB de VRAM, como a de um notebook no Colab, e instale torch, transformers, datasets, peft, trl e bitsandbytes. O código usa bf16, que exige uma GPU da geração Ampere ou mais nova; numa T4, troque para fp16=True e bnb_4bit_compute_dtype=torch.float16. Como saber que deu certo: torch.cuda.is_available() devolve True.",
    },
    {
      title: "Limpe e formate o dataset",
      body: "Parta de um data/tickets.jsonl com texto, categoria e prioridade de cada chamado. prepare.py descarta textos curtos ou longos demais, rótulos fora da lista e duplicatas, e grava cada exemplo no formato conversacional prompt e completion do TRL. Como saber que deu certo: o script mostra quantos exemplos sobraram, e a contagem por categoria não é dominada por uma classe só.",
    },
    {
      title: "Separe treino, validação e teste",
      body: "O split é 80/10/10 com seed fixa. A validação escolhe o melhor checkpoint durante o treino; o teste fica guardado e só entra na comparação final, para o número não sair otimista. Como saber que deu certo: nenhum texto do teste aparece no treino, o que a deduplicação feita antes do split garante.",
    },
    {
      title: "Meça a linha de base",
      body: "Antes de treinar, rode compare.py: sem adaptador salvo, ele mede só o modelo base no conjunto de teste. As métricas são a fração de respostas que são JSON válido e a fração de acerto exato da categoria e da prioridade juntas. Como saber que deu certo: você tem os números do antes e sabe onde o base erra, por exemplo inventando categorias ou escrevendo texto em volta do JSON.",
    },
    {
      title: "Treine com QLoRA",
      body: "train_qlora.py carrega o base em 4 bits NF4 e liga adaptadores LoRA com r = 16 e lora_alpha = 32 em todas as camadas lineares. Com dados no formato prompt e completion, o SFTTrainer calcula a perda só na completion: o modelo aprende a resposta, não a repetir o chamado. Como saber que deu certo: print_trainable_parameters mostra perto de 2% dos pesos treináveis, e a perda de validação cai nas primeiras épocas.",
    },
    {
      title: "Compare antes e depois",
      body: "Rode compare.py de novo: agora ele mede o base e o base com o adaptador no mesmo conjunto de teste, com geração determinística (do_sample=False). JSON válido perto de 100% é o mínimo; a melhora que importa é a do acerto exato. Como saber que deu certo: o ajustado ganha do base nas duas métricas, e você consegue apontar exemplos que o base errava e o ajustado acerta.",
    },
    {
      title: "Decida e empacote",
      body: "Se a perda de validação subiu enquanto a de treino caía, houve overfitting: reduza as épocas ou o r, ou junte mais dados. Com o resultado aprovado, publique só o adaptador, que tem poucos MB, ou faça merge_and_unload num base em precisão cheia para servir sem depender do PEFT. Como saber que deu certo: o modelo final, carregado do disco, reproduz os números do teste.",
    },
  ],
  concepts: ["11-04", "11-05", "11-07", "11-08", "11-09", "11-12", "11-13"],
  code: [
    {
      path: "prepare.py",
      source: `import json
from pathlib import Path

from datasets import Dataset

CATEGORIES = ("cobranca", "acesso", "entrega", "produto", "outro")
PRIORITIES = ("alta", "media", "baixa")
SYSTEM = (
    "Classifique o chamado de suporte. Responda só com JSON no formato "
    '{"categoria": "...", "prioridade": "..."}, usando as categorias '
    + ", ".join(CATEGORIES)
    + " e as prioridades "
    + ", ".join(PRIORITIES)
    + "."
)


def is_valid(row: dict) -> bool:
    text = row.get("texto", "").strip()
    return 20 <= len(text) <= 2_000 and row.get("categoria") in CATEGORIES and row.get("prioridade") in PRIORITIES


def to_example(row: dict) -> dict:
    label = {"categoria": row["categoria"], "prioridade": row["prioridade"]}
    return {
        "prompt": [
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content": row["texto"].strip()},
        ],
        "completion": [{"role": "assistant", "content": json.dumps(label, ensure_ascii=False)}],
    }


def main() -> None:
    lines = Path("data/tickets.jsonl").read_text(encoding="utf-8").splitlines()
    rows = [json.loads(line) for line in lines if line.strip()]
    seen: set[str] = set()
    examples = []
    for row in rows:
        key = " ".join(row.get("texto", "").lower().split())
        if is_valid(row) and key not in seen:
            seen.add(key)
            examples.append(to_example(row))
    print(f"{len(examples)} exemplos válidos de {len(rows)}")

    split = Dataset.from_list(examples).train_test_split(test_size=0.2, seed=42)
    holdout = split["test"].train_test_split(test_size=0.5, seed=42)
    split["train"].to_json("data/train.jsonl", force_ascii=False)
    holdout["train"].to_json("data/validation.jsonl", force_ascii=False)
    holdout["test"].to_json("data/test.jsonl", force_ascii=False)


if __name__ == "__main__":
    main()`,
    },
    {
      path: "train_qlora.py",
      source: `import torch
from datasets import load_dataset
from peft import LoraConfig
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
from trl import SFTConfig, SFTTrainer

BASE_MODEL = "Qwen/Qwen2.5-0.5B-Instruct"
ADAPTER_DIR = "out/qwen-chamados-lora"

data = load_dataset(
    "json",
    data_files={"train": "data/train.jsonl", "validation": "data/validation.jsonl"},
)
tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL)
model = AutoModelForCausalLM.from_pretrained(
    BASE_MODEL,
    quantization_config=BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.bfloat16,
        bnb_4bit_use_double_quant=True,
    ),
    device_map="auto",
)

peft_config = LoraConfig(
    r=16,
    lora_alpha=32,
    lora_dropout=0.05,
    target_modules="all-linear",
    task_type="CAUSAL_LM",
)

args = SFTConfig(
    output_dir=ADAPTER_DIR,
    num_train_epochs=3,
    per_device_train_batch_size=8,
    gradient_accumulation_steps=2,
    learning_rate=2e-4,
    lr_scheduler_type="cosine",
    warmup_steps=10,
    max_length=512,
    bf16=True,
    gradient_checkpointing=True,
    eval_strategy="epoch",
    save_strategy="epoch",
    load_best_model_at_end=True,
    logging_steps=10,
    report_to="none",
    seed=42,
)

trainer = SFTTrainer(
    model=model,
    args=args,
    train_dataset=data["train"],
    eval_dataset=data["validation"],
    processing_class=tokenizer,
    peft_config=peft_config,
)
trainer.model.print_trainable_parameters()
trainer.train()
trainer.save_model(ADAPTER_DIR)`,
    },
    {
      path: "compare.py",
      source: `import json
from pathlib import Path

import torch
from datasets import load_dataset
from peft import PeftModel
from transformers import AutoModelForCausalLM, AutoTokenizer

BASE_MODEL = "Qwen/Qwen2.5-0.5B-Instruct"
ADAPTER_DIR = "out/qwen-chamados-lora"

tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL)
test = load_dataset("json", data_files="data/test.jsonl", split="train")


def predict(model, prompt: list[dict]) -> str:
    inputs = tokenizer.apply_chat_template(
        prompt, add_generation_prompt=True, return_tensors="pt", return_dict=True
    ).to(model.device)
    with torch.no_grad():
        output = model.generate(**inputs, max_new_tokens=40, do_sample=False)
    return tokenizer.decode(output[0][inputs["input_ids"].shape[1]:], skip_special_tokens=True)


def score(model) -> dict[str, float]:
    valid = correct = 0
    for example in test:
        expected = json.loads(example["completion"][0]["content"])
        try:
            got = json.loads(predict(model, example["prompt"]))
        except json.JSONDecodeError:
            continue
        valid += 1
        correct += int(got == expected)
    return {"json_valido": valid / len(test), "acerto_exato": correct / len(test)}


def main() -> None:
    model = AutoModelForCausalLM.from_pretrained(BASE_MODEL, device_map="auto")
    model.eval()
    results = {"base": score(model)}
    if Path(ADAPTER_DIR).exists():
        tuned = PeftModel.from_pretrained(model, ADAPTER_DIR)
        tuned.eval()
        results["base + LoRA"] = score(tuned)

    print(f"{'modelo':<12} {'JSON válido':>12} {'acerto exato':>13}")
    for name, metrics in results.items():
        print(f"{name:<12} {metrics['json_valido']:>12.1%} {metrics['acerto_exato']:>13.1%}")


if __name__ == "__main__":
    main()`,
    },
  ],
};

export default project;
