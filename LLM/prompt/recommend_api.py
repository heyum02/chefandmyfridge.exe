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

IGNORED_MISSING_INGREDIENT_KEYWORDS = {
    "물",
    "정수",
    "생수",
    "얼음물",
}


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


def should_ignore_missing_ingredient(name: str) -> bool:
    normalized = (name or "").strip().lower().replace(" ", "")
    return any(keyword in normalized for keyword in IGNORED_MISSING_INGREDIENT_KEYWORDS)


def normalize_recipe(recipe: Dict[str, Any]) -> Dict[str, Any]:
    missing_ingredients = recipe.get("missing_ingredients", [])
    insufficient_ingredients = recipe.get("insufficient_ingredients", [])

    if isinstance(missing_ingredients, list):
        recipe["missing_ingredients"] = [
            ingredient
            for ingredient in missing_ingredients
            if not should_ignore_missing_ingredient(str(ingredient))
        ]

    if isinstance(insufficient_ingredients, list):
        recipe["insufficient_ingredients"] = [
            ingredient
            for ingredient in insufficient_ingredients
            if not should_ignore_missing_ingredient(str(ingredient))
        ]

    recipe["missing_ingredient_count"] = len(recipe.get("missing_ingredients", []))
    return recipe


def main() -> None:
    try:
        payload = parse_request_payload()

        ingredients = payload.get("ingredients") or []

        if not isinstance(ingredients, list):
            ingredients = []

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
        recipes = [normalize_recipe(recipe) for recipe in response_json.get("recipes", [])]
        response_json["recipes"] = recipes

        print(
            json.dumps(
                {
                    "success": True,
                    "mockIngredientsUsed": False,
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
