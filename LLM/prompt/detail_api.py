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


def normalize_name(value: str) -> str:
    return str(value or "").strip().lower().replace(" ", "")


def classify_ingredient(name: str) -> str:
    text = str(name or "").strip()
    if not text:
        return "other"

    if any(token in text for token in ["간장", "고추장", "된장", "쌈장", "케첩", "마요네즈", "굴소스", "토마토소스", "식초", "액젓", "소스", "드레싱"]):
        return "sauce"
    if any(token in text for token in ["소금", "설탕", "후추", "고춧가루", "고추기름", "참기름", "들기름", "식용유", "올리브유", "오일", "맛술", "미림", "청주", "소주", "허브", "파우더", "가루"]):
        return "seasoning"
    if any(token in text for token in ["소고기", "돼지고기", "닭", "햄", "베이컨", "소시지", "삼겹", "목살", "갈비"]):
        return "meat"
    if any(token in text for token in ["오징어", "새우", "생선", "참치", "연어", "굴", "조개", "문어", "낙지", "명란"]):
        return "seafood"
    if any(token in text for token in ["두부", "계란", "달걀", "콩", "버섯"]):
        return "protein"
    if any(token in text for token in ["양파", "대파", "쪽파", "마늘", "고추", "배추", "상추", "깻잎", "오이", "당근", "무", "감자", "고구마", "애호박", "호박", "가지", "브로콜리", "시금치", "토마토", "파프리카", "양배추"]):
        return "vegetable"
    if any(token in text for token in ["우유", "치즈", "버터", "생크림", "요거트"]):
        return "dairy"
    if any(token in text for token in ["쌀", "밥", "면", "라면", "파스타", "밀가루", "전분", "빵", "떡"]):
        return "carb"
    return "other"


def is_plausible_substitute(original: str, candidate: str) -> bool:
    if not original or not candidate:
        return False

    original_type = classify_ingredient(original)
    candidate_type = classify_ingredient(candidate)

    if original_type == "other" or candidate_type == "other":
        return normalize_name(original) == normalize_name(candidate)

    compatible_groups = {
        "sauce": {"sauce", "seasoning"},
        "seasoning": {"seasoning", "sauce"},
        "meat": {"meat", "protein"},
        "seafood": {"seafood", "protein"},
        "protein": {"protein", "meat", "seafood"},
        "vegetable": {"vegetable"},
        "dairy": {"dairy"},
        "carb": {"carb"},
    }

    return candidate_type in compatible_groups.get(original_type, {original_type})


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


def load_substitution_data() -> Dict[str, List[str]]:
    if not SUBSTITUTION_PATH.exists():
        return {}

    with SUBSTITUTION_PATH.open("r", encoding="utf-8") as file:
        data = json.load(file)

    return data if isinstance(data, dict) else {}


def load_substitution_context(missing_ingredients: List[str]) -> str:
    if not missing_ingredients:
        return ""

    substitution_data = load_substitution_data()
    if not substitution_data:
        return ""

    lines = []
    for ingredient in missing_ingredients:
        candidates = substitution_data.get(ingredient, [])
        if candidates:
            lines.append(f"{ingredient} -> {', '.join(candidates[:5])}")

    return "\n".join(lines)


def get_available_substitute_candidates(
    ingredient: str,
    available_ingredient_names: List[str],
    substitution_data: Dict[str, List[str]],
) -> List[str]:
    allowed_candidates = substitution_data.get(ingredient, [])
    normalized_available = {
        normalize_name(name): name for name in available_ingredient_names if str(name).strip()
    }

    matched = []
    seen = set()
    for candidate in allowed_candidates:
        normalized_candidate = normalize_name(candidate)
        if normalized_candidate in normalized_available and normalized_candidate not in seen:
            matched.append(normalized_available[normalized_candidate])
            seen.add(normalized_candidate)

    return matched


def validate_substitutions(
    response_json: Dict[str, Any],
    missing_ingredients: List[str],
    available_ingredient_names: List[str],
    substitution_data: Dict[str, List[str]],
) -> Dict[str, Any]:
    ingredients_section = response_json.get("ingredients")
    if not isinstance(ingredients_section, dict):
        return response_json

    reported_missing = ingredients_section.get("missing", [])
    if not isinstance(reported_missing, list) or not reported_missing:
        reported_missing = missing_ingredients

    raw_substitutions = ingredients_section.get("substitutions", [])
    if not isinstance(raw_substitutions, list):
        raw_substitutions = []

    substitution_by_original = {}
    for item in raw_substitutions:
        if not isinstance(item, dict):
            continue
        original = str(item.get("original_ingredient", "")).strip()
        if original and original not in substitution_by_original:
            substitution_by_original[original] = item

    validated_substitutions = []
    validated_substitute_names = set()
    missing_name_set = {str(name).strip() for name in reported_missing if str(name).strip()}

    for ingredient in reported_missing:
        ingredient_name = str(ingredient).strip()
        if not ingredient_name:
            continue

        available_candidates = get_available_substitute_candidates(
            ingredient_name,
            available_ingredient_names,
            substitution_data,
        )
        model_item = substitution_by_original.get(ingredient_name, {})
        model_substitute = str(model_item.get("substitute", "")).strip()
        model_substitute_is_available = any(
            normalize_name(model_substitute) == normalize_name(name)
            for name in available_ingredient_names
        )
        normalized_candidate_map = {
            normalize_name(candidate): candidate for candidate in available_candidates
        }
        normalized_model_substitute = normalize_name(model_substitute)

        if (
            normalized_model_substitute in normalized_candidate_map
            and is_plausible_substitute(ingredient_name, model_substitute)
        ):
            chosen_substitute = normalized_candidate_map[normalized_model_substitute]
            reason = str(model_item.get("reason", "")).strip() or (
                "substitution_network.json 후보를 참고했고, 현재 보유 재료이면서 레시피 문맥에도 비교적 자연스러운 대체재입니다."
            )
            notes = str(model_item.get("notes", "")).strip()
        elif model_substitute_is_available and is_plausible_substitute(ingredient_name, model_substitute):
            chosen_substitute = next(
                (
                    name
                    for name in available_ingredient_names
                    if normalize_name(name) == normalized_model_substitute
                ),
                model_substitute,
            )
            reason = str(model_item.get("reason", "")).strip() or (
                "substitution_network.json은 참고만 하고, 현재 보유 재료와 레시피 문맥을 우선 검토해 가능한 대체재로 판단했습니다."
            )
            notes = str(model_item.get("notes", "")).strip() or "치환망에 없더라도 문맥상 무리가 없을 때만 제한적으로 사용하세요."
        elif available_candidates:
            plausible_candidates = [
                candidate
                for candidate in available_candidates
                if is_plausible_substitute(ingredient_name, candidate)
            ]
            chosen_substitute = plausible_candidates[0] if plausible_candidates else "대체할 재료 없음."
            if chosen_substitute != "대체할 재료 없음.":
                reason = (
                    "substitution_network.json 후보를 참고하되 그대로 믿지 않고, 현재 보유 재료와 레시피 문맥을 다시 확인해 선택한 대체재입니다."
                )
                notes = "치환망 후보 중에서도 문맥상 어색한 재료는 제외했습니다."
            else:
                reason = "substitution_network.json 후보는 있었지만 현재 레시피 문맥에 자연스럽지 않아 대체재로 채택하지 않았습니다."
                notes = "이 재료는 무리하게 바꾸기보다 생략 또는 구매가 더 적절할 수 있습니다."
        else:
            chosen_substitute = "대체할 재료 없음."
            reason = "현재 보유 재료와 레시피 문맥을 함께 검토했을 때 무리 없는 대체재를 찾지 못했습니다."
            notes = "이 재료는 생략보다 구매 또는 다른 레시피 선택이 더 적절할 수 있습니다."

        validated_substitutions.append(
            {
                "original_ingredient": ingredient_name,
                "substitute": chosen_substitute,
                "reason": reason,
                "notes": notes,
            }
        )

        if chosen_substitute != "대체할 재료 없음.":
            validated_substitute_names.add(chosen_substitute)

    ingredients_section["substitutions"] = validated_substitutions

    final_used = ingredients_section.get("final_used", [])
    if isinstance(final_used, list):
        cleaned_final_used = []
        seen = set()
        for item in final_used:
            item_name = str(item).strip()
            if not item_name or item_name in missing_name_set:
                continue
            if item_name not in seen:
                cleaned_final_used.append(item_name)
                seen.add(item_name)

        for item_name in validated_substitute_names:
            if item_name not in seen:
                cleaned_final_used.append(item_name)
                seen.add(item_name)

        ingredients_section["final_used"] = cleaned_final_used

    return response_json


def main() -> None:
    try:
        payload = parse_request_payload()

        recipe_name = payload.get("recipeName", DEFAULT_RECIPE_NAME)

        available_ingredients = payload.get("ingredients") or []
        if not isinstance(available_ingredients, list):
            available_ingredients = []
        ingredient_names = extract_ingredient_names(available_ingredients)
        substitution_data = load_substitution_data()

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
        response_json = validate_substitutions(
            response_json=response_json,
            missing_ingredients=missing_ingredients,
            available_ingredient_names=ingredient_names,
            substitution_data=substitution_data,
        )

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
