import json
from collections import Counter, defaultdict
from tqdm import tqdm

from sklearn.feature_extraction import DictVectorizer
from sklearn.metrics.pairwise import cosine_similarity


INPUT = "../data/recipes_clean.json"
OUTPUT = "../data/substitution_network.json"


# 🔥 1. 데이터 로드
with open(INPUT, encoding="utf-8") as f:
    recipes = json.load(f)


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
    if any(x in ing for x in ["간장", "고추장", "된장", "소금", "설탕", "식초", "고춧가루", "후춧가루", "파우더", "가루", "허브", "바질", "파슬리", "시나몬", "머스타드", "소스", "액젓", "조미료", "맛간장", "참기름", "들기름"]):
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