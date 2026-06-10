"""
프롬프트 생성 모듈
RAG 기반 레시피 추천 및 상세 조리 프롬프트만 제공합니다.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple, Union


IngredientInput = Union[str, Dict[str, str]]


@dataclass
class RecipeRecommendationRequest:
    """레시피 추천 프롬프트 입력"""

    ingredients: List[IngredientInput]
    rag_context: str
    allergies: List[str] = field(default_factory=list)
    cooking_tools: List[str] = field(default_factory=list)
    cooking_history: List[str] = field(default_factory=list)
    max_results: int = 5


@dataclass
class RecipeDetailRequest:
    """레시피 상세 프롬프트 입력"""

    recipe_name: str
    rag_context: str
    available_ingredients: List[IngredientInput]
    substitution_context: Optional[str] = None
    missing_ingredients: List[str] = field(default_factory=list)
    allergies: List[str] = field(default_factory=list)
    selected_tools: List[str] = field(default_factory=list)
    cooking_history: List[str] = field(default_factory=list)
    conversation_history: List[Dict[str, str]] = field(default_factory=list)
    nutrition_focus: Optional[Dict[str, str]] = None


@dataclass
class RecipeFollowUpRequest:
    """레시피 상세 응답 이후 추가 질문 프롬프트 입력"""

    recipe_name: str
    previous_recipe_response: str
    user_followup_question: str
    rag_context: Optional[str] = None
    substitution_context: Optional[str] = None
    available_ingredients: List[IngredientInput] = field(default_factory=list)
    allergies: List[str] = field(default_factory=list)
    selected_tools: List[str] = field(default_factory=list)
    cooking_history: List[str] = field(default_factory=list)
    conversation_history: List[Dict[str, str]] = field(default_factory=list)


class PromptGenerator:
    """레시피 추천/상세 안내 프롬프트 생성기"""

    @staticmethod
    def _format_ingredients(ingredients: List[IngredientInput]) -> str:
        """재료 목록을 프롬프트용 문자열로 변환"""
        if not ingredients:
            return ""

        formatted = []
        for ingredient in ingredients:
            if isinstance(ingredient, dict):
                name = ingredient.get("name", "").strip()
                amount = str(ingredient.get("amount", "")).strip()
                unit = ingredient.get("unit", "").strip()
                note = ingredient.get("note", "").strip()

                text = name or "이름 없는 재료"
                if amount:
                    text += f" {amount}"
                if unit:
                    text += f"{unit}"
                if note:
                    text += f" ({note})"
                formatted.append(text)
            else:
                formatted.append(str(ingredient))

        return ", ".join(formatted)

    @staticmethod
    def _format_conversation_history(conversation_history: List[Dict[str, str]]) -> str:
        """대화 히스토리를 프롬프트용 문자열로 변환"""
        if not conversation_history:
            return ""

        history_lines = ["이전 대화 히스토리:"]
        for idx, message in enumerate(conversation_history, 1):
            role = message.get("role", "unknown")
            content = message.get("content", "")
            history_lines.append(f"{idx}. [{role}] {content}")

        return "\n".join(history_lines)

    @staticmethod
    def rag_recipe_recommendation_prompt(
        request: RecipeRecommendationRequest,
    ) -> Tuple[str, str]:
        """
        현재 보유 재료, 알레르기, 조리 도구, 사용자 요리 기록을 반영해
        RAG 레시피 후보 중 추천 목록을 생성하는 프롬프트

        요구사항:
        - recipes_dedup.json 기반 RAG 결과만 사용
        - 최대 2개 재료 부족까지 허용
        - 요리 난이도와 예상 조리 시간 포함

        Returns:
            (user_prompt, system_message) 튜플
        """
        ingredients = request.ingredients
        rag_context = request.rag_context
        allergies = request.allergies
        cooking_tools = request.cooking_tools
        cooking_history = request.cooking_history
        max_results = request.max_results

        system_message = """당신은 RAG 기반 레시피 추천 전문가입니다.
반드시 제공된 RAG 컨텍스트(원본: LLM/recipe/data/recipes_dedup.json 검색 결과) 안에서만 레시피를 추천하세요.
컨텍스트에 없는 요리는 절대 새로 만들어 추천하지 마세요.

추천 규칙:
1. 사용자의 현재 보유 재료를 최우선으로 반영합니다.
2. 사용자의 보유 재료는 이름뿐 아니라 수량과 단위도 함께 고려합니다.
3. 레시피에 필요한 재료 중 최대 2개까지는 없어도 추천 가능합니다.
4. 재료가 아예 없지 않더라도 양이 부족하면 부족한 재료로 판단할 수 있습니다.
5. 알레르기 유발 재료가 포함된 레시피는 제외합니다.
6. 사용 가능한 조리 도구로 만들기 어려운 레시피는 우선순위를 낮추거나 제외합니다.
7. 사용자의 이전 요리 기록을 참고해 너무 비슷한 요리만 반복 추천하지 말고 적절히 다양성을 반영합니다.
8. 난이도와 예상 조리 시간을 반드시 포함합니다.
9. 물, 정수, 생수처럼 일반적으로 집에 있다고 가정 가능한 기본 재료는 missing_ingredients나 insufficient_ingredients에 넣지 마세요.

응답은 반드시 JSON으로만 출력하세요. 설명 문장, 코드블록 마크다운은 넣지 마세요."""

        user_parts = [
            "다음 조건을 바탕으로 RAG 레시피 후보에서 만들 수 있는 요리 목록을 추천해줘.",
            f"현재 보유 재료: {PromptGenerator._format_ingredients(ingredients)}",
            f"최대 추천 개수: {max_results}",
            "부족한 재료 또는 양이 부족한 재료는 레시피당 최대 2개까지 허용",
        ]

        if allergies:
            user_parts.append(f"사용자 알레르기 정보: {', '.join(allergies)}")

        if cooking_tools:
            user_parts.append(f"사용 가능한 조리 도구: {', '.join(cooking_tools)}")

        if cooking_history:
            user_parts.append(f"이전 사용자 요리 기록: {', '.join(cooking_history)}")

        user_parts.append("\nRAG 레시피 후보:")
        user_parts.append(rag_context)
        user_parts.append(
            """
반드시 아래 JSON 형식으로만 응답해줘:
{
  "recipes": [
    {
      "name": "요리명",
      "difficulty": "쉬움/보통/어려움",
      "estimated_time_minutes": 20,
      "available_ingredients": ["가지고 있는 재료1", "가지고 있는 재료2"],
      "available_ingredients_detail": ["계란 2개", "양파 1/2개"],
      "insufficient_ingredients": ["토마토(양 부족)"],
      "missing_ingredients": ["없는 재료1"],
      "missing_ingredient_count": 1,
      "required_tools": ["프라이팬"],
      "reason": "이 요리를 추천하는 이유"
    }
  ]
}

중요:
- missing_ingredient_count는 반드시 숫자로 작성
- insufficient_ingredients에는 양이 부족한 재료만 포함
- missing_ingredients는 최대 2개까지만 포함
- 물, 정수, 생수 같은 기본 재료는 missing_ingredients와 insufficient_ingredients에서 제외
- recipes 배열은 추천 우선순위 순서대로 정렬
- 조건에 맞는 요리가 없으면 {"recipes": []} 로 응답
""".strip()
        )

        user_prompt = "\n".join(user_parts)
        return user_prompt, system_message

    @staticmethod
    def rag_recipe_followup_prompt(
        request: RecipeFollowUpRequest,
    ) -> Tuple[str, str]:
        """
        레시피 상세 응답 이후 사용자의 추가 질문에 답변하기 위한 프롬프트

        요구사항:
        - 직전 상세 레시피 응답을 기준으로 맥락 유지
        - 가능하면 기존 RAG/대체재 컨텍스트 우선 활용
        - 사용자 제약(재료, 알레르기, 도구, 입맛)을 계속 반영

        Returns:
            (user_prompt, system_message) 튜플
        """
        system_message = """당신은 이전에 레시피 상세 안내를 제공한 요리 전문가입니다.
반드시 직전 레시피 상세 응답과 제공된 RAG 컨텍스트를 우선 참고해, 같은 레시피 맥락을 유지하며 추가 질문에 답하세요.
새로운 레시피를 제안하지 말고, 사용자가 선택한 같은 요리를 기준으로 설명하세요.

응답 규칙:
1. 사용자의 추가 질문에 직접적으로 답합니다.
2. 이전에 제안한 대체재, 입맛 조정, 영양 정보와 충돌하지 않게 답합니다.
3. 사용 가능한 재료의 이름뿐 아니라 남은 양과 단위도 계속 반영합니다.
4. RAG 컨텍스트에 근거가 있으면 그것을 우선 사용하고, 부족한 경우에만 제한적으로 추론합니다.
5. 추가 질문이 조리법 변경을 요구하면 변경된 부분이 무엇인지 분명히 설명합니다.
6. 이전 대화 히스토리가 있으면 그 안의 최근 합의사항과 제약을 계속 유지합니다.
7. tips는 반드시 이번 사용자 추가 질문에 직접 관련된 팁만 작성합니다.
8. 이전 답변에서 나온 tips를 반복 재사용하지 마세요.
9. 현재 질문에 맞는 새로운 팁이 없으면 tips는 빈 배열로 출력하세요.

응답은 반드시 JSON으로만 출력하세요. 설명 문장, 코드블록 마크다운은 넣지 마세요."""

        user_parts = [
            f"선택한 요리: {request.recipe_name}",
            f"사용자 추가 질문: {request.user_followup_question}",
            "\n직전 레시피 상세 응답:",
            request.previous_recipe_response,
        ]

        if request.rag_context:
            user_parts.append("\n레시피 RAG 정보:")
            user_parts.append(request.rag_context)

        if request.substitution_context:
            user_parts.append("\n대체 재료 참고 정보:")
            user_parts.append(request.substitution_context)

        if request.available_ingredients:
            user_parts.append(
                f"현재 보유 재료: {PromptGenerator._format_ingredients(request.available_ingredients)}"
            )

        if request.allergies:
            user_parts.append(f"사용자 알레르기 정보: {', '.join(request.allergies)}")

        if request.selected_tools:
            user_parts.append(
                f"사용 가능한 조리 도구: {', '.join(request.selected_tools)}"
            )

        if request.cooking_history:
            user_parts.append(
                f"이전 사용자 요리 기록 및 맛 피드백: {', '.join(request.cooking_history)}"
            )

        if request.conversation_history:
            user_parts.append(
                "\n" + PromptGenerator._format_conversation_history(
                    request.conversation_history
                )
            )

        user_parts.append(
            """
아래 JSON 형식으로만 응답해줘:
{
  "recipe_name": "요리명",
  "followup_question": "사용자 추가 질문",
  "answer_summary": "질문에 대한 핵심 답변 요약",
  "changes": [
    {
      "category": "ingredient/tool/step/taste/nutrition/time",
      "before": "기존 내용",
      "after": "변경된 내용",
      "reason": "변경 이유"
    }
  ],
  "updated_instructions": [
    "필요 시 갱신된 1단계",
    "필요 시 갱신된 2단계"
  ],
  "tips": [
    "추가 팁 1",
    "추가 팁 2"
  ]
}

중요:
- 추가 질문이 조리법 수정과 무관하면 updated_instructions는 빈 배열로 출력
- 변경점이 없으면 changes는 빈 배열로 출력
- 항상 같은 recipe_name 맥락을 유지
- conversation_history가 있으면 가장 최근 합의사항을 우선 반영
- 재료 양이 부족해서 변경된 경우 changes에 그 사유를 명시
- tips는 이번 followup_question에 대한 보조 팁만 포함
- 이전 질문에 대한 tips를 그대로 반복하지 말 것
""".strip()
        )

        user_prompt = "\n".join(user_parts)
        return user_prompt, system_message

    @staticmethod
    def rag_recipe_detail_with_substitution_prompt(
        request: RecipeDetailRequest,
    ) -> Tuple[str, str]:
        """
        선택된 레시피의 조리법, 부족한 재료 대체안, 영양 정보를 생성하는 프롬프트

        요구사항:
        - 선택된 요리의 상세 조리법 출력
        - 없는 재료가 있으면 substitution_network.json 기반 대체 재료 추천
        - 이전 사용자 요리 기록과 피드백을 반영한 입맛 조정
        - 실제 사용 재료를 기준으로 영양성분 출력

        Returns:
            (user_prompt, system_message) 튜플
        """
        recipe_name = request.recipe_name
        rag_context = request.rag_context
        available_ingredients = request.available_ingredients
        substitution_context = request.substitution_context
        missing_ingredients = request.missing_ingredients
        allergies = request.allergies
        selected_tools = request.selected_tools
        cooking_history = request.cooking_history
        conversation_history = request.conversation_history
        nutrition_focus = request.nutrition_focus

        system_message = """당신은 레시피 설명 전문가이자 영양 분석가입니다.
반드시 제공된 RAG 컨텍스트(레시피 정보)와 대체재 컨텍스트(원본: recipe/data/substitution_network.json 검색 결과)를 우선 사용하세요.
컨텍스트에 없는 정보는 필요할 때만 매우 제한적으로 추론하고, 추론한 경우에도 과장하지 마세요.

작업 규칙:
1. 선택된 레시피 1개만 설명합니다.
2. 없는 재료가 있으면 대체 가능한 재료를 우선 제안합니다.
3. 보유 재료의 수량과 단위를 보고 현재 양으로 실제 조리가 가능한지 판단합니다.
4. 재료가 아예 없거나 양이 부족하면 그 차이를 구분해서 설명합니다.
5. 알레르기와 충돌하는 대체재는 추천하지 않습니다.
6. 이전 사용자의 요리 기록과 맛 관련 피드백을 참고해 간, 매운맛, 단맛, 기름진 정도를 조절합니다.
7. 예를 들어 "너무 짜다"는 의견이 많으면 양념/소금/간장 양을 줄이고, "너무 맵다"는 의견이 많으면 고추류/매운 양념을 줄이는 식으로 반영합니다.
8. 조리법은 대체 재료와 사용자 입맛 조정이 반영된 최종 버전으로 정리합니다.
9. 영양 정보는 최종적으로 사용되는 재료 기준으로 요약합니다.
10. 이전 대화 히스토리가 있으면, 이미 논의된 선호도와 제약을 유지해 같은 맥락으로 설명합니다.
11. instructions는 초보자도 그대로 따라 할 수 있을 만큼 자세하게 작성합니다.
12. 각 단계에는 가능한 한 재료 준비 방법, 투입 순서, 불 세기, 예상 시간, 상태 변화 중 최소 2가지 이상을 포함합니다.
13. 조리 단계는 너무 크게 묶지 말고, 재료 손질/예열/볶기/끓이기/간 맞추기/마무리를 구분해 작성합니다.
14. "적당히", "알아서", "대충" 같은 표현은 피하고 가능한 범위에서 구체적으로 설명합니다.
15. RAG 근거가 부족한 경우에도 instructions를 한두 줄로 끝내지 말고, 일반적인 조리 상식 범위에서 보완해 충분히 설명합니다.

응답은 반드시 JSON으로만 출력하세요. 설명 문장, 코드블록 마크다운은 넣지 마세요."""

        user_parts = [
            f"선택한 요리: {recipe_name}",
            f"현재 보유 재료: {PromptGenerator._format_ingredients(available_ingredients)}",
            "\n선택된 레시피 RAG 정보:",
            rag_context,
        ]

        if missing_ingredients:
            user_parts.append(f"현재 없는 재료: {', '.join(missing_ingredients)}")

        if allergies:
            user_parts.append(f"사용자 알레르기 정보: {', '.join(allergies)}")

        if selected_tools:
            user_parts.append(f"사용 가능한 조리 도구: {', '.join(selected_tools)}")

        if cooking_history:
            user_parts.append(f"이전 사용자 요리 기록 및 맛 피드백: {', '.join(cooking_history)}")

        if conversation_history:
            user_parts.append(
                "\n" + PromptGenerator._format_conversation_history(conversation_history)
            )

        if substitution_context:
            user_parts.append("\n대체 재료 참고 정보:")
            user_parts.append(substitution_context)

        if nutrition_focus:
            focus_text = ", ".join(
                f"{key}: {value}" for key, value in nutrition_focus.items()
            )
            user_parts.append(f"영양 분석 참고 조건: {focus_text}")

        user_parts.append(
            """
아래 JSON 형식으로만 응답해줘:
{
  "recipe": {
    "name": "요리명",
    "summary": "요리 한줄 설명",
    "difficulty": "쉬움/보통/어려움",
    "estimated_time_minutes": 20
  },
  "ingredients": {
    "original": ["원래 재료1", "원래 재료2"],
    "missing": ["없는 재료1"],
    "substitutions": [
      {
        "original_ingredient": "없는 재료1",
        "substitute": "대체 재료",
        "reason": "왜 적절한지",
        "notes": "맛/식감/주의사항"
      }
    ],
    "insufficient": ["양이 부족한 재료1"],
    "final_used": ["최종 사용 재료1", "최종 사용 재료2"]
  },
  "taste_adjustments": [
    {
      "preference_signal": "예: 너무 짜다는 의견이 많음",
      "adjustment": "예: 소금과 간장 양을 줄임",
      "applied_to": ["간장", "소금"]
    }
  ],
  "instructions": [
    "1단계 조리법",
    "2단계 조리법"
  ],
  "nutrition": {
    "calories_kcal": "예: 420",
    "carbohydrates_g": "예: 28",
    "protein_g": "예: 21",
    "fat_g": "예: 18",
    "fiber_g": "예: 5",
    "sodium_mg": "예: 620",
    "nutrition_comment": "영양 요약 코멘트"
  }
}

중요:
- 없는 재료가 없으면 substitutions는 빈 배열로 출력
- cooking_history가 있으면 taste_adjustments에 반드시 반영
- conversation_history가 있으면 이전 대화 맥락과 충돌하지 않게 반영
- insufficient에는 재료가 있으나 양이 부족한 경우만 포함
- instructions는 실제 최종 사용 재료와 입맛 조정 기준으로 작성
- instructions는 최소 6단계 이상 작성하고, 가능하면 각 단계를 한 문장 이상으로 충분히 설명
- 각 instruction에는 가능하면 시간, 불 세기, 재료 상태 변화, 실패 방지 포인트를 포함
- instructions만 읽어도 사용자가 별도 검색 없이 요리를 진행할 수 있어야 함
- nutrition은 final_used 기준으로 계산/추정
- recipe_name과 일치하는 레시피만 설명
""".strip()
        )

        user_prompt = "\n".join(user_parts)
        return user_prompt, system_message
