"""
레시피 상세 API 브리지 스크립트

Node 서버에서 호출되어 prompt.py의
rag_recipe_detail_with_substitution_prompt를 실행하고
LLM 응답을 JSON으로 반환한다.
"""

import json
import sys
from pathlib import Path
from typing import Any, Dict, List

from chat_module import ChatGPTModule
from prompt import PromptGenerator, RecipeDetailRequest
from recipe_rag import RecipeDatabase

DEFAULT_RECIPE_NAME = "토마토 계란볶음"
DEFAULT_MISSING_INGREDIENTS = ["토마토", "쪽파"]
SUBSTITUTION_PATH = Path(__file__).resolve().parent.parent / "recipe" / "data" / "substitution_network.json"


def parse_request_payload() -> Dict[str, Any]:
    raw = sys.stdin.read().strip()
    if not raw:
        return {}
    return json.loads(raw)


def extract_ingredient_names(ingredients: List[Dict[str, str]]) -> List[str]:
    return [ingredient["name"] for ingredient in ingredients if ingredient.get("name")]


def parse_model_json(response_text: str) -> Dict[str, Any]:
    cleaned = response_text.strip()
    if cleaned.startswith("```"):
        lines = cleaned.splitlines()
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        cleaned = "\n".join(lines).strip()

    return json.loads(cleaned)


def load_substitution_context(missing_ingredients: List[str]) -> str:
    if not SUBSTITUTION_PATH.exists() or not missing_ingredients:
        return ""

    with SUBSTITUTION_PATH.open("r", encoding="utf-8") as file:
        substitution_data = json.load(file)

    lines = []
    for ingredient in missing_ingredients:
        candidates = substitution_data.get(ingredient, [])
        if candidates:
            lines.append(f"{ingredient} -> {', '.join(candidates[:5])}")

    return "\n".join(lines)


def main() -> None:
    try:
        payload = parse_request_payload()

        recipe_name = payload.get("recipeName", DEFAULT_RECIPE_NAME)

        available_ingredients = payload.get("ingredients") or []
        if not isinstance(available_ingredients, list):
            available_ingredients = []
        ingredient_names = extract_ingredient_names(available_ingredients)

        db = RecipeDatabase()
        rag_context, search_info = db.prepare_rag_context(
            user_query=recipe_name,
            ingredients=ingredient_names,
        )

        missing_ingredients = payload.get(
            "missingIngredients",
            DEFAULT_MISSING_INGREDIENTS,
        )
        substitution_context = load_substitution_context(missing_ingredients)

        request = RecipeDetailRequest(
            recipe_name=recipe_name,
            rag_context=rag_context,
            available_ingredients=available_ingredients,
            servings=max(1, int(payload.get("servings", 1) or 1)),
            substitution_context=substitution_context,
            missing_ingredients=missing_ingredients,
            allergies=payload.get("allergies", []),
            selected_tools=payload.get("selectedTools", payload.get("cookingTools", [])),
            cooking_history=payload.get("cookingHistory", []),
            conversation_history=payload.get("conversationHistory", []),
            nutrition_focus=payload.get("nutritionFocus"),
        )

        user_prompt, system_message = PromptGenerator.rag_recipe_detail_with_substitution_prompt(
            request
        )

        chat = ChatGPTModule()
        response_text = chat.send_prompt(
            prompt=user_prompt,
            system_message=system_message,
        )
        response_json = parse_model_json(response_text)

        print(
            json.dumps(
                {
                    "success": True,
                    "mockIngredientsUsed": False,
                    "searchInfo": search_info,
                    "sessionContext": {
                        "recipeName": recipe_name,
                        "servings": request.servings,
                        "previousRecipeResponse": json.dumps(response_json, ensure_ascii=False),
                        "ragContext": rag_context,
                        "substitutionContext": substitution_context,
                        "availableIngredients": available_ingredients,
                        "missingIngredients": missing_ingredients,
                        "allergies": payload.get("allergies", []),
                        "selectedTools": payload.get("selectedTools", payload.get("cookingTools", [])),
                        "cookingHistory": payload.get("cookingHistory", []),
                        "conversationHistory": payload.get("conversationHistory", []),
                    },
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
