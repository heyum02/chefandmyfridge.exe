"""
레시피 후속 대화 API 브리지 스크립트

Node 서버에서 호출되어 prompt.py의
rag_recipe_followup_prompt를 실행하고
LLM 응답을 JSON으로 반환한다.
"""

import json
import sys
from typing import Any, Dict

from chat_module import ChatGPTModule
from prompt import PromptGenerator, RecipeFollowUpRequest


def parse_request_payload() -> Dict[str, Any]:
    raw = sys.stdin.read().strip()
    if not raw:
        return {}
    return json.loads(raw)


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


def main() -> None:
    try:
        payload = parse_request_payload()

        request = RecipeFollowUpRequest(
            recipe_name=payload["recipeName"],
            previous_recipe_response=payload["previousRecipeResponse"],
            user_followup_question=payload["userMessage"],
            rag_context=payload.get("ragContext"),
            substitution_context=payload.get("substitutionContext"),
            available_ingredients=payload.get("availableIngredients", []),
            servings=max(1, int(payload.get("servings", 1) or 1)),
            allergies=payload.get("allergies", []),
            selected_tools=payload.get("selectedTools", []),
            cooking_history=payload.get("cookingHistory", []),
            conversation_history=payload.get("conversationHistory", []),
        )

        user_prompt, system_message = PromptGenerator.rag_recipe_followup_prompt(
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
