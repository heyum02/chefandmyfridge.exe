import json
import re
from collections import Counter, defaultdict
from tqdm import tqdm

from sklearn.feature_extraction import DictVectorizer
from sklearn.metrics.pairwise import cosine_similarity


INPUT = "../data/recipes_clean.json"
OUTPUT = "../data/substitution_network.json"


# 🔥 1. 데이터 로드
with open(INPUT, encoding="utf-8") as f:
    recipes = json.load(f)


SPECIAL_PATTERN_REPLACEMENTS = [
    (r"\([^)]*\)", ""),
    (r"^집\s*", ""),
    (r"^(고운|굵은|다진|송송|채썬|채 썬|썬|으깬)\s*", ""),
    (r"(통조림)\s*", ""),
    (r"\s*(간|간맞추기|데칠 때|데칠때|데칠용|맞게|맞게 가감|밑간용|선택|절일때|절임용)\s*$", ""),
    (r"\s*(소량|약간|적당량|넉넉하게|살짝|취향껏|크게|작게)\s*$", ""),
    (r"^(큰|작은|중간)\s*", ""),
    (r"\s*(큰|작은|중간)\s*(것|거|크기|사이즈)?\s*$", ""),
    (r"\s*[AB]\s*$", ""),
    (r"\s+(salt|pepper)\s*$", ""),
]

SPECIAL_EXACT_REPLACEMENTS = {
    "미림": "맛술",
    "집고추장": "고추장",
    "집된장": "된장",
    "집간장": "간장",
    "통마늘": "마늘",
    "통생강": "생강",
    "통삼겹": "삼겹살",
    "통삼겹살": "삼겹살",
    "오징어몸통": "오징어",
    "오징어 몸통": "오징어",
    "참치통조림": "참치",
    "통조림참치": "참치",
    "통조림 참치": "참치",
    "골뱅이통조림": "골뱅이",
    "골뱅이 통조림": "골뱅이",
    "고등어통조림": "고등어",
    "꽁치통조림": "꽁치",
    "연어통조림": "연어",
    "옥수수통조림": "옥수수",
    "파인애플통조림": "파인애플",
    "통조림햄": "햄",
    "통조림 햄": "햄",
    "닭가슴살통조림": "닭가슴살",
    "소금 salt": "소금",
    "소금 간": "소금",
    "소금간": "소금",
    "소금 간맞추기": "소금",
    "소금 데칠 때": "소금",
    "소금 데칠때": "소금",
    "소금 데칠용": "소금",
    "소금 맞게": "소금",
    "소금 맞게 가감": "소금",
    "소금 밑간용": "소금",
    "소금 선택": "소금",
    "소금 절일때": "소금",
    "소금 절임용": "소금",
    "소금 데치기용": "소금",
    "소금 데침용": "소금",
    "소금 세척용": "소금",
    "소금 오이": "소금",
    "맛술 또는 미림": "맛술",
    "미림 또는 맛술": "맛술",
    "맛술 미림": "맛술",
    "미림 맛술": "맛술",
    "맛술 또는 소주": "맛술",
    "소주 또는 맛술": "맛술",
    "맛술 또는 청주": "맛술",
    "청주 또는 맛술": "맛술",
    "생강술 또는 맛술": "맛술",
    "생강술 맛술": "맛술",
    "생강맛술": "맛술",
    "소주 또는 청주": "청주",
    "청주 또는 소주": "청주",
}


def normalize_ingredient(text):
    if not text:
        return ""

    normalized = str(text).strip()
    normalized = re.sub(r"\s+", " ", normalized)
    normalized_lower = normalized.lower()

    if normalized in SPECIAL_EXACT_REPLACEMENTS:
        return SPECIAL_EXACT_REPLACEMENTS[normalized]
    if normalized_lower in SPECIAL_EXACT_REPLACEMENTS:
        return SPECIAL_EXACT_REPLACEMENTS[normalized_lower]

    for pattern, replacement in SPECIAL_PATTERN_REPLACEMENTS:
        normalized = re.sub(pattern, replacement, normalized, flags=re.IGNORECASE)

    normalized = normalized.strip(" ,./")
    normalized = re.sub(r"\s+", " ", normalized)
    normalized_lower = normalized.lower()

    if normalized in SPECIAL_EXACT_REPLACEMENTS:
        normalized = SPECIAL_EXACT_REPLACEMENTS[normalized]
    elif normalized_lower in SPECIAL_EXACT_REPLACEMENTS:
        normalized = SPECIAL_EXACT_REPLACEMENTS[normalized_lower]

    return normalized


normalized_recipes = []
for recipe in recipes:
    cleaned_recipe = []
    seen = set()
    for ingredient in recipe:
        normalized = normalize_ingredient(ingredient)
        if not normalized or normalized in seen:
            continue
        cleaned_recipe.append(normalized)
        seen.add(normalized)

    if len(cleaned_recipe) >= 2:
        normalized_recipes.append(cleaned_recipe)

recipes = normalized_recipes


# 🔥 2. 빈도 계산
counter = Counter()
for r in recipes:
    counter.update(r)

MIN_COUNT = 20
MAX_COUNT = 10000

vocab = {
    ing for ing, cnt in counter.items()
    if MIN_COUNT <= cnt <= MAX_COUNT
}

print("vocab size:", len(vocab))


# 🔥 3. context + direct co-occurrence 같이 생성
context = defaultdict(Counter)
direct_cooccur = defaultdict(Counter)

for recipe in tqdm(recipes):
    filtered = [i for i in recipe if i in vocab]

    for i in filtered:
        for j in filtered:
            if i != j:
                context[i][j] += 1
                direct_cooccur[i][j] += 1


ingredients = list(context.keys())


# 🔥 4. vectorize
vectorizer = DictVectorizer(sparse=True)
X = vectorizer.fit_transform([context[i] for i in ingredients])


# 🔥 5. similarity 계산
sim_matrix = cosine_similarity(X, dense_output=False)


# 🔥 6. 카테고리 (간단 버전 - 필요시 확장)
CATEGORY_MAP = {}

def get_category(ing):
    # 단백질
    if any(x in ing for x in ["오징어", "새우", "생선", "참치", "연어", "문어", "낙지", "새우젓", "조개", "굴", "명란"]):
        return "seafood"
    
    if any(x in ing for x in ["소고기", "돼지고기", "닭", "베이컨", "소시지", "햄"]):
        return "meat"

    # 채소/버섯/과일
    if any(x in ing for x in ["양파", "마늘", "파", "고추", "배추", "상추", "토마토", "버섯", "가지", "호박", "브로콜리", "시금치", "오이", "배", "당근", "무", "깻잎", "미나리", "상추", "무순", "샐러드", "콩나물", "모듬"]):
        return "vegetable"

    # 양념/향신료
    if any(x in ing for x in ["간장", "고추장", "된장", "소금", "설탕", "식초", "고춧가루", "후춧가루", "파우더", "가루", "허브", "바질", "파슬리", "시나몬", "머스타드", "소스", "액젓", "조미료", "맛간장", "참기름", "들기름", "맛술", "미림", "청주", "소주", "생강술"]):
        return "seasoning"

    # 지방/유제품
    if any(x in ing for x in ["버터", "오일", "기름", "마요네즈", "크림", "우유", "치즈", "요거트"]):
        return "fat"

    # 곡물/가공탄수화물
    if any(x in ing for x in ["밀가루", "전분", "쌀", "면", "떡", "빵", "콘", "옥수수", "시리얼"]):
        return "grain"

    return "other"


for ing in ingredients:
    CATEGORY_MAP[ing] = get_category(ing)


# 🔥 7. 필터 함수 (핵심)
def is_valid_substitute(a, b, counter, cooccur, category_map):
    # 1. 카테고리 다르면 제거
    if category_map[a] != category_map[b]:
        return False

    # 2. 같이 너무 많이 등장하면 제거 (보완재 제거)
    if b in cooccur[a]:
        co_ratio = cooccur[a][b] / min(counter[a], counter[b])
        if co_ratio > 0.5:
            return False

    return True


# 🔥 8. substitution network 생성
TOP_K = 5
THRESHOLD = 0.2

network = {}

for idx, ing in enumerate(tqdm(ingredients)):
    row = sim_matrix[idx]

    sims = []

    for j, sim in zip(row.indices, row.data):
        if j == idx:
            continue

        if sim < THRESHOLD:
            continue

        candidate = ingredients[j]

        # 🔥 필터 적용
        if not is_valid_substitute(ing, candidate, counter, direct_cooccur, CATEGORY_MAP):
            continue

        sims.append((candidate, sim))

    sims.sort(key=lambda x: -x[1])

    network[ing] = [x[0] for x in sims[:TOP_K]]


# 🔥 9. 저장
with open(OUTPUT, "w", encoding="utf-8") as f:
    json.dump(network, f, ensure_ascii=False, indent=2)

print("Saved:", OUTPUT)
