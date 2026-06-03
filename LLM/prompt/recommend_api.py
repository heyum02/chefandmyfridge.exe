"""
레시피 추천 API 브리지 스크립트

Node 서버에서 호출되어 prompt.py의 rag_recipe_recommendation_prompt를 실행하고
LLM 응답을 JSON으로 반환한다.
"""

import json
import sys
from typing import Any, Dict, List

from chat_module import ChatGPTModule
from prompt import PromptGenerator, RecipeRecommendationRequest
from recipe_rag import RecipeDatabase


MOCK_INGREDIENTS: List[Dict[str, str]] = [
    {"name": "계란", "amount": "2", "unit": "개"},
    {"name": "토마토", "amount": "1", "unit": "개"},
    {"name": "양파", "amount": "0.5", "unit": "개"},
    {"name": "식용유", "amount": "2", "unit": "큰술"},
]


def parse_request_payload() -> Dict[str, Any]:
    """stdin으로 전달된 JSON payload를 읽는다."""
    raw = sys.stdin.read().strip()
    if not raw:
        return {}
    return json.loads(raw)


def extract_ingredient_names(ingredients: List[Dict[str, str]]) -> List[str]:
    """RAG 검색용 재료 이름만 추출한다."""
    return [ingredient["name"] for ingredient in ingredients if ingredient.get("name")]


def parse_model_json(response_text: str) -> Dict[str, Any]:
    """모델 응답을 JSON으로 파싱한다."""
    cleaned = response_text.strip()
    if cleaned.startswith("```"):
        lines = cleaned.splitlines()
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        cleaned = "\n".join(lines).strip()

    return json.loads(cleaned)


def main() -> None:
    try:
        payload = parse_request_payload()

        ingredients = payload.get("ingredients") or []
        mock_ingredients_used = False

        if not isinstance(ingredients, list):
            ingredients = []

        if not ingredients:
            ingredients = MOCK_INGREDIENTS
            mock_ingredients_used = True

        ingredient_names = extract_ingredient_names(ingredients)

        db = RecipeDatabase()
        rag_context, search_info = db.prepare_rag_context(
            user_query=payload.get("query", "냉장고 재료로 만들 수 있는 한식"),
            ingredients=ingredient_names,
        )

        request = RecipeRecommendationRequest(
            ingredients=ingredients,
            rag_context=rag_context,
            allergies=payload.get("allergies", []),
            cooking_tools=payload.get("cookingTools", []),
            cooking_history=payload.get("cookingHistory", []),
            max_results=payload.get("maxResults", 5),
        )

        user_prompt, system_message = PromptGenerator.rag_recipe_recommendation_prompt(
            request
        )

        chat = ChatGPTModule()
        response_text = chat.send_prompt(
            prompt=user_prompt,
            system_message=system_message,
        )
        response_json = parse_model_json(response_text)
        recipes = response_json.get("recipes", [])

        print(
            json.dumps(
                {
                    "success": True,
                    "mockIngredientsUsed": mock_ingredients_used,
                    "searchInfo": search_info,
                    "recipeCount": len(recipes),
                    "recipes": recipes,
                    "data": response_json,
                },
                ensure_ascii=False,
            )
        )
    except Exception as exc:
        print(
            json.dumps(
                {
                    "success": False,
                    "error": str(exc),
                },
                ensure_ascii=False,
            )
        )
        sys.exit(1)


if __name__ == "__main__":
    main()
