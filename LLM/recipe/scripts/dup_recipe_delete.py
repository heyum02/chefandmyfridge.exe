import os
import json
from collections import Counter
from tqdm import tqdm

DATA_DIR = "../recipes_pages"
OUTPUT = "../data/recipes_dedup.json"


# =========================
# 재료 정규화
# =========================
def normalize(ingredient):
    import re
    ingredient = re.sub(r"\d+.*", "", ingredient)
    return ingredient.strip()


# =========================
# Jaccard similarity
# =========================
def jaccard(a, b):
    a, b = set(a), set(b)
    return len(a & b) / len(a | b)


# =========================
# 데이터 로드
# =========================
def load_all():
    recipes = []

    for file in sorted(os.listdir(DATA_DIR)):
        if not file.endswith(".json"):
            continue

        path = os.path.join(DATA_DIR, file)

        with open(path, encoding="utf-8") as f:
            try:
                data = json.load(f)
            except:
                continue

        for r in data:
            ingredients = [
                normalize(i) for i in r.get("ingredients", [])
            ]

            if len(ingredients) < 2:
                continue

            recipes.append({
                "title": r.get("title", ""),
                "ingredients": ingredients,
                "steps": r.get("steps", [])
            })

    print("Loaded:", len(recipes))
    return recipes


# =========================
# Dedup 핵심
# =========================
def deduplicate(recipes, threshold=0.7):

    unique = []

    for r in tqdm(recipes):
        is_dup = False

        for u in unique:
            sim = jaccard(r["ingredients"], u["ingredients"])

            if sim > threshold:
                is_dup = True
                break

        if not is_dup:
            unique.append(r)

    print("After dedup:", len(unique))
    return unique


# =========================
# 실행
# =========================
if __name__ == "__main__":
    recipes = load_all()

    deduped = deduplicate(recipes, threshold=0.7)

    os.makedirs("data", exist_ok=True)

    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(deduped, f, ensure_ascii=False, indent=2)

    print("Saved:", OUTPUT)