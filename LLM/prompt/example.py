"""
RAG 기반 레시피 프롬프트 사용 예제

1. 보유 재료 기반 레시피 추천 프롬프트 생성
2. 선택 레시피 상세 조리법/대체재/영양 정보 프롬프트 생성
"""

from chat_module import ChatGPTModule
from prompt import (
    PromptGenerator,
    RecipeDetailRequest,
    RecipeRecommendationRequest,
)
from recipe_rag import RecipeDatabase


def example_recipe_recommendation():
    """예제 1: RAG 기반 레시피 추천 프롬프트"""
    print("=" * 60)
    print("예제 1: RAG 기반 레시피 추천")
    print("=" * 60)

    db = RecipeDatabase()
    rag_context, search_info = db.prepare_rag_context(
        user_query="계란과 토마토로 만들 수 있는 한식",
        ingredients=["계란", "토마토", "양파", "식용유"],
    )

    print(f"검색 정보: {search_info}")

    request = RecipeRecommendationRequest(
        ingredients=["계란", "토마토", "양파", "식용유"],
        rag_context=rag_context,
        allergies=["우유"],
        cooking_tools=["프라이팬", "냄비"],
        cooking_history=[
            "이전 볶음요리 선호",
            "너무 짠 음식은 선호하지 않음",
            "간단한 20분 내 요리를 자주 선택함",
        ],
        max_results=5,
    )
    user_prompt, system_message = PromptGenerator.rag_recipe_recommendation_prompt(
        request
    )

    chat = ChatGPTModule()
    response = chat.send_prompt(prompt=user_prompt, system_message=system_message)
    print(f"응답:\n{response}\n")


def example_recipe_detail():
    """예제 2: 선택 레시피 상세 조리법/대체재/영양 정보 프롬프트"""
    print("=" * 60)
    print("예제 2: 선택 레시피 상세 조리법")
    print("=" * 60)

    selected_recipe_rag = """
요리명: 토마토 계란볶음
난이도: 쉬움
예상 조리 시간: 15분
재료: 계란 2개, 토마토 1개, 양파 1/2개, 소금, 식용유, 쪽파
조리법:
1. 토마토와 양파를 손질한다.
2. 팬에 기름을 두르고 양파를 볶는다.
3. 토마토와 계란을 넣어 볶는다.
4. 소금으로 간을 맞추고 마무리한다.
""".strip()

    substitution_context = """
토마토 -> 파프리카, 토마토소스
쪽파 -> 대파, 부추
""".strip()

    request = RecipeDetailRequest(
        recipe_name="토마토 계란볶음",
        rag_context=selected_recipe_rag,
        available_ingredients=["계란", "양파", "식용유", "소금"],
        substitution_context=substitution_context,
        missing_ingredients=["토마토", "쪽파"],
        allergies=["우유"],
        selected_tools=["프라이팬"],
        cooking_history=[
            "이전 피드백: 음식이 너무 짜다는 의견이 많음",
            "이전 피드백: 매운 음식은 선호하지 않음",
            "이전 기록: 담백한 볶음 요리를 자주 선택함",
        ],
        nutrition_focus={
            "serving_size": "1인분",
            "priority": "칼로리와 단백질을 함께 보여주기",
        },
    )
    user_prompt, system_message = PromptGenerator.rag_recipe_detail_with_substitution_prompt(
        request
    )

    chat = ChatGPTModule()
    response = chat.send_prompt(prompt=user_prompt, system_message=system_message)
    print(f"응답:\n{response}\n")


if __name__ == "__main__":
    from dotenv import load_dotenv

    load_dotenv()

    try:
        example_recipe_recommendation()
        example_recipe_detail()
    except Exception as exc:
        print(f"오류 발생: {exc}")
