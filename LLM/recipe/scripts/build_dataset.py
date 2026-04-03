import os
import json
import re

DATA_DIR = "../recipes_pages"
OUTPUT = "../data/recipes_clean.json"


# 도구 필터
TOOLS = {
    "냄비", "도마", "조리용나이프", "조리용스푼", "프라이팬",
    "볼", "그릇", "접시", "채반", "믹싱볼", "스푼",
    "조리주걱", "키친타올", "장갑", "오븐", "전자레인지",
    "에어프라이어", "계량컵", "국자", "집게", "칼",
    "트레이", "컵", "병", "포크", "가위"
}

TOOL_KEYWORDS = {
    "거품기", "전자저울", "식힘망", "채망", "거름망", "토치",
    "밥솥", "믹서", "믹서기", "블렌더", "주걱", "주물팬",
    "주방", "주방솔", "주방용", "주방용나이프", "주방용스패츌라",
    "핸드믹서", "핸드블렌더", "플레이트", "도구", "랩", "포장지",
    "냉각", "전기팬", "전기밥솥", "오븐팬", "쿠킹팬", "프라이팬", "후라이팬", "달걀말이팬", "베이킹팬", "머핀팬", "와플팬" 
}


REMOVE_WORDS = [
    "구매", "약간", "조금", "적당량", "적당히", "톡톡",
    "듬뿍", "기호에", "가능", "생략", "넉넉히", "솔솔"
]


def clean_ingredient(text):
    # 숫자/단위 제거
    text = re.sub(r"\d+.*", "", text)

    # 불필요 단어 제거
    for w in REMOVE_WORDS:
        text = text.replace(w, "")

    text = text.strip()

    # 도구 제거 (기존 + 확장 키워드)
    for tool in TOOLS:
        if tool in text:
            return None

    for kw in TOOL_KEYWORDS:
        if kw in text:
            return None

    # 너무 짧은 것 제거
    if len(text) < 2:
        return None

    return text


def normalize_final(text):
    # 수식어 제거
    text = text.replace("다진", "")
    text = text.replace("채썬", "")
    text = text.replace("썬", "")
    text = text.replace("송송", "")
    text = text.replace("잘게", "")
    return text.strip()


def build_dataset():
    recipes = []

    for file in sorted(os.listdir(DATA_DIR)):
        if not file.endswith(".json"):
            continue

        path = os.path.join(DATA_DIR, file)

        with open(path, encoding="utf-8") as f:
            try:
                data = json.load(f)
            except:
                print(f"[ERROR] {file}")
                continue

        for r in data:
            ingredients = []

            for i in r.get("ingredients", []):
                cleaned = clean_ingredient(i)
                if cleaned:
                    cleaned = normalize_final(cleaned)
                    ingredients.append(cleaned)

            if len(ingredients) < 2:
                continue

            recipes.append(ingredients)

        print(f"[OK] {file}")

    # 중복 제거
    recipes = list(set(tuple(r) for r in recipes))
    recipes = [list(r) for r in recipes]

    print("Total recipes:", len(recipes))

    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(recipes, f, ensure_ascii=False)

    print("Saved:", OUTPUT)


if __name__ == "__main__":
    build_dataset()