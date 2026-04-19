# ChatGPT 레시피 추천 시스템

> RAG(Retrieval Augmented Generation) 기반 한식 레시피 추천 도구

## 🏗️ 아키텍처 (역할 분담)

각 모듈이 **명확히 다른 책임**만 담당합니다:

```
1️⃣ PROMPT 생성 (prompt.py)
   ↓
2️⃣ RAG 검색 (recipe_rag.py)  ← 선택사항
   ↓
3️⃣ CHAT 송수신 (chat_module.py)
```

### 모듈별 역할

| 모듈 | 책임 | 예시 |
|------|------|------|
| **chat_module.py** | ChatGPT API와 통신만 | `chat.send_prompt()` |
| **prompt.py** | 프롬프트 생성만 | `PromptGenerator.recipe_suggestion_prompt()` |
| **recipe_rag.py** | 레시피 검색만 | `db.prepare_rag_context("계란 요리")` |

---

## 📦 모듈 상세 설명

### 1️⃣ chat_module.py - ChatGPT 통신만 담당

```python
from chat_module import ChatGPTModule

chat = ChatGPTModule()

# 프롬프트 전송 & 응답 수신
response = chat.send_prompt(
    prompt="사용자 프롬프트",
    system_message="시스템 메시지",
    temperature=0.7
)

# 히스토리 관리
history = chat.get_history()
chat.clear_history()
```

**메서드:**
- `send_prompt(prompt, system_message, temperature)` - 프롬프트 전송
- `get_history()` - 대화 히스토리 조회
- `clear_history()` - 히스토리 초기화

---

### 2️⃣ prompt.py - 프롬프트 생성만 담당

#### PromptGenerator (정적 메서드)
```python
from prompt import PromptGenerator

# 레시피 추천 프롬프트
user_prompt, system_msg = PromptGenerator.recipe_suggestion_prompt(
    ingredients=["계란", "토마토", "양파"],
    allergies=["우유"],
    cooking_tools=["프라이팬"],
    rag_context=None  # 선택사항
)

# 영양 분석 프롬프트
user_prompt, system_msg = PromptGenerator.nutrition_analysis_prompt(
    dish_name="계란 토마토 스크램블",
    ingredients=["계란", "토마토", "버터"]
)

# 조리 시간 예측 프롬프트
user_prompt, system_msg = PromptGenerator.cooking_time_estimation_prompt(
    ingredients=["계란", "토마토", "양파"],
    difficulty="쉬움"
)

# 재료 대체 프롬프트
user_prompt, system_msg = PromptGenerator.ingredient_substitution_prompt(
    original_ingredient="우유",
    reason="알레르기"
)
```

#### PromptBuilder (체인 패턴)
```python
from prompt import PromptBuilder

# 커스텀 프롬프트 구축
user_prompt, system_msg = (PromptBuilder(
    base_prompt="",
    base_system="당신은 요리 전문가입니다."
)
.add_instruction("한국 요리 중심으로 추천")
.add_context("내 재료", "계란, 토마토, 양파")
.add_rag_context(rag_context)  # RAG 컨텍스트 추가
.add_format_instruction("list")  # json, list, markdown
.build())
```

---

### 3️⃣ recipe_rag.py - 레시피 검색만 담당

```python
from recipe_rag import RecipeDatabase

db = RecipeDatabase()

# 방법 1: 쿼리 기반 검색
rag_context, search_info = db.prepare_rag_context(
    user_query="계란 요리",
    ingredients=None
)

# 방법 2: 재료 기반 검색
rag_context, search_info = db.prepare_rag_context(
    user_query=None,
    ingredients=["계란", "토마토", "양파"]
)

# 방법 3: 혼합 검색
rag_context, search_info = db.prepare_rag_context(
    user_query="빠른 계란 요리",
    ingredients=["계란", "토마토"]
)

print(rag_context)  # 프롬프트에 포함할 레시피 정보
print(search_info)  # 검색 결과 설명
```

---

## 🚀 전형적인 사용 흐름

### 흐름 1: 단순 대화
```python
chat = ChatGPTModule()
response = chat.send_prompt(
    prompt="계란 요리 3가지를 추천해줄래?",
    system_message="당신은 요리 전문가입니다."
)
print(response)
```

### 흐름 2: RAG 기반 추천
```python
from recipe_rag import RecipeDatabase

# 1단계: RAG에서 레시피 검색
db = RecipeDatabase()
rag_context, _ = db.prepare_rag_context(
    user_query="계란 요리",
    ingredients=["계란", "토마토"]
)

# 2단계: 프롬프트 생성 (RAG 컨텍스트 포함)
user_prompt, system_msg = PromptGenerator.recipe_suggestion_prompt(
    ingredients=["계란", "토마토"],
    rag_context=rag_context
)

# 3단계: ChatGPT에 전송
chat = ChatGPTModule()
response = chat.send_prompt(prompt=user_prompt, system_message=system_msg)
print(response)
```

### 흐름 3: 고급 커스텀
```python
# 1. RAG 검색
rag_context, _ = db.prepare_rag_context(
    user_query="간단한 한식",
    ingredients=["계란", "양파", "버터"]
)

# 2. 커스텀 프롬프트 생성
user_prompt, system_msg = (PromptBuilder(
    base_system="당신은 요리 전문가입니다."
)
.add_context("내 재료", "계란, 양파, 버터")
.add_context("알레르기", "우유")
.add_rag_context(rag_context)
.add_format_instruction("list")
.build())

# 3. 전송
response = chat.send_prompt(prompt=user_prompt, system_message=system_msg)
```

---

## 📥 설치

### 1. 가상 환경 설정
```bash
python3 -m venv .venv
source .venv/bin/activate  # Linux/Mac
# .venv\Scripts\activate  # Windows
```

### 2. 의존성 설치
```bash
pip install -r requirements.txt
```

### 3. .env 설정
```bash
echo "OPENAI_API_KEY=your_api_key_here" > .env
```

---

## 📝 파일 구조

```
LLM/prompt/
├── chat_module.py       # ChatGPT 통신 (OpenAI API)
├── prompt.py            # 프롬프트 생성 (템플릿)
├── recipe_rag.py        # 레시피 검색 (RAG)
├── example.py           # 사용 예제 (10가지)
├── requirements.txt     # 의존성
├── .env                 # API 키 (git 무시됨)
├── .gitignore           # git 무시 파일
└── README.md            # 이 파일
```

---

## 🔍 RAG 동작 원리

### 키워드 기반 검색 (효율적)
1. `load_recipes()` - 레시피 JSON 파일 로드
2. `search_recipes()` - 키워드 활용 검색
   - 제목 일치: **500점**
   - 재료 일치: **100점**
   - 본문 일치: **10점**
3. `get_recipe_context()` - 검색 결과를 LLM 프롬프트 형식으로 변환

### 성능 특징
- ✅ **빠른 검색**: 키워드 기반이므로 즉각적
- ✅ **낮은 리소스**: 임베딩 계산 불필요
- ✅ **실용적**: 조리 목적에 충분

---

## 🛠️ 커스터마이징

### 모델 변경
```python
# gpt-4o 모델 사용
chat = ChatGPTModule(model="gpt-4o")
```

### 온도(Temperature) 조절
```python
# 0.0 = 일관성, 2.0 = 창의성
response = chat.send_prompt(
    prompt=user_prompt,
    system_message=system_message,
    temperature=0.5  # 낮을수록 일관성 높음
)
```

### RAG 검색 결과 개수
```python
# recipe_rag.py의 search_recipes 메서드
recipes = db.rag.search_recipes(query="계란", top_k=5)  # 상위 5개만
```

---

## 📋 요구 의존성

```
openai>=1.3.0              # OpenAI API
python-dotenv>=1.0.0       # 환경 변수 관리
faiss-cpu>=1.7.4           # 벡터 검색 (향후 선택적)
sentence-transformers>=2.2.0  # 임베딩 (향후 선택적)
numpy>=1.21.0              # 수치 연산
```

---

## 🐛 문제 해결

| 오류 | 해결책 |
|------|--------|
| "OPENAI_API_KEY not found" | `.env` 파일에서 API 키 설정 |
| "Module not found" | `pip install -r requirements.txt` |
| 느린 검색 | `load_recipes(limit=100)` 제한 |
| 프롬프트 맥락 초과 | temperature 낮추거나 context 축소 |

---

## 💡 주요 특징

✅ **명확한 역할 분담**: 각 모듈이 한 가지만 잘함
✅ **효율적인 RAG**: 키워드 기반으로 빠르고 가벼움
✅ **온전한 프롬프트 생성**: 시스템/사용자 메시지 모두 포함
✅ **히스토리 관리**: 멀티턴 대화 자동 지원
✅ **정적 메서드 & 빌더 패턴**: 유연한 프롬프트 구성

---

## 🔗 참고 링크

- [OpenAI API 문서](https://platform.openai.com/docs/api-reference)
- [OpenAI API 키 관리](https://platform.openai.com/api-keys)

