"""
ChatGPT 레시피 추천 시스템 - 사용 예제

각 모듈의 역할:
1. chat_module.py: ChatGPT API와 통신 (프롬프트 전송, 응답 수신)
2. prompt.py: 프롬프트 생성 (user_prompt 및 system_message 생성)
3. recipe_rag.py: 레시피 데이터 검색 (RAG로 활용할 레시피 검색)
"""

import os
from pathlib import Path
from chat_module import ChatGPTModule
from prompt import PromptGenerator, PromptBuilder
from recipe_rag import RecipeDatabase


def example_1_basic_chat():
    """예제 1: 기본 ChatGPT 통신"""
    print("=" * 60)
    print("예제 1: 기본 ChatGPT 통신")
    print("=" * 60)
    
    chat = ChatGPTModule()
    
    response = chat.send_prompt(
        prompt="파이썬으로 리스트 정렬하는 방법을 간단히 설명해줄래?",
        system_message="당신은 프로그래밍 튜터입니다."
    )
    
    print(f"응답: {response}\n")


def example_2_recipe_suggestion():
    """예제 2: 보유 재료로 레시피 추천"""
    print("=" * 60)
    print("예제 2: 보유 재료로 레시피 추천")
    print("=" * 60)
    
    chat = ChatGPTModule()
    
    # 프롬프트 생성
    user_prompt, system_message = PromptGenerator.recipe_suggestion_prompt(
        ingredients=["계란", "토마토", "양파", "버터"],
        allergies=["우유"],
        cooking_tools=["프라이팬", "냄비"]
    )
    
    response = chat.send_prompt(prompt=user_prompt, system_message=system_message)
    print(f"응답: {response}\n")


def example_3_with_rag_context():
    """예제 3: RAG 컨텍스트를 포함한 레시피 추천"""
    print("=" * 60)
    print("예제 3: RAG 컨텍스트를 포함한 레시피 추천")
    print("=" * 60)
    
    # 1. 레시피 데이터베이스에서 관련 레시피 검색
    db = RecipeDatabase()
    rag_context, search_info = db.prepare_rag_context(
        user_query="계란 요리",
        ingredients=["계란", "토마토", "양파"]
    )
    
    print(f"검색 정보: {search_info}")
    print(f"찾은 참고 레시피:\n{rag_context}\n")
    
    # 2. RAG 컨텍스트를 포함한 프롬프트 생성
    user_prompt, system_message = PromptGenerator.recipe_suggestion_prompt(
        ingredients=["계란", "토마토", "양파", "버터"],
        rag_context=rag_context
    )
    
    # 3. ChatGPT에 프롬프트 전송
    chat = ChatGPTModule()
    response = chat.send_prompt(prompt=user_prompt, system_message=system_message)
    print(f"응답:\n{response}\n")


def example_3_new_recipe_list_rag():
    """예제 3-1: RAG 기반 레시피 목록 생성"""
    print("=" * 60)
    print("예제 3-1: RAG 기반 레시피 목록 생성")
    print("=" * 60)

    db = RecipeDatabase()
    rag_context, search_info = db.prepare_rag_context(
        user_query="간단한 야채 요리",
        ingredients=["양파", "토마토", "계란"]
    )

    print(f"검색 정보: {search_info}")
    print(f"참고 레시피:\n{rag_context}\n")

    user_prompt, system_message = PromptGenerator.recipe_list_rag_prompt(
        ingredients=["양파", "토마토", "계란"],
        rag_context=rag_context,
        allergies=["우유"],
        cooking_tools=["프라이팬", "냄비"]
    )

    chat = ChatGPTModule()
    response = chat.send_prompt(prompt=user_prompt, system_message=system_message)
    print(f"응답:\n{response}\n")


def example_4_nutrition_analysis():
    """예제 4: 영양 분석"""
    print("=" * 60)
    print("예제 4: 영양 분석")
    print("=" * 60)
    
    user_prompt, system_message = PromptGenerator.nutrition_analysis_prompt(
        dish_name="계란 토마토 스크램블",
        ingredients=["계란 2개", "토마토 1개", "양파 1/2개", "버터 1스푼", "소금, 후춧가루"]
    )
    
    chat = ChatGPTModule()
    response = chat.send_prompt(prompt=user_prompt, system_message=system_message)
    print(f"응답:\n{response}\n")


def example_5_cooking_time():
    """예제 5: 조리 시간 예측"""
    print("=" * 60)
    print("예제 5: 조리 시간 예측")
    print("=" * 60)
    
    user_prompt, system_message = PromptGenerator.cooking_time_estimation_prompt(
        ingredients=["계란", "토마토", "양파", "버터"],
        difficulty="쉬움"
    )
    
    chat = ChatGPTModule()
    response = chat.send_prompt(prompt=user_prompt, system_message=system_message)
    print(f"응답:\n{response}\n")


def example_6_ingredient_substitution():
    """예제 6: 재료 대체"""
    print("=" * 60)
    print("예제 6: 재료 대체")
    print("=" * 60)
    
    user_prompt, system_message = PromptGenerator.ingredient_substitution_prompt(
        original_ingredient="우유",
        reason="우유 알레르기가 있음"
    )
    
    chat = ChatGPTModule()
    response = chat.send_prompt(prompt=user_prompt, system_message=system_message)
    print(f"응답:\n{response}\n")


def example_7_prompt_builder():
    """예제 7: PromptBuilder를 사용한 커스텀 프롬프트"""
    print("=" * 60)
    print("예제 7: PromptBuilder를 사용한 커스텀 프롬프트")
    print("=" * 60)
    
    builder = PromptBuilder(
        base_prompt="",
        base_system="당신은 요리 전문 상담가입니다."
    )
    
    user_prompt, system_message = (builder
        .add_instruction("한국 요리 중심으로 추천반드시")
        .add_context("내 재료", "계란, 토마토, 양파, 버터")
        .add_context("알레르기", "우유")
        .add_format_instruction("list")
        .build())
    
    chat = ChatGPTModule()
    response = chat.send_prompt(prompt=user_prompt, system_message=system_message)
    print(f"응답:\n{response}\n")


def example_7_1_recipe_detail_substitution_nutrition():
    """예제 7-1: 레시피 상세 대체 재료 + 영양 분석"""
    print("=" * 60)
    print("예제 7-1: 레시피 상세 대체 재료 + 영양 분석")
    print("=" * 60)

    user_prompt, system_message = PromptGenerator.recipe_detail_substitution_nutrition_prompt(
        recipe_name="토마토 계란볶음",
        recipe_description="간단한 한식 반찬으로, 토마토와 계란을 활용한 볶음 요리입니다.",
        recipe_ingredients=["계란 2개", "토마토 1개", "양파 1/2개", "참기름 1큰술", "소금"],
        recipe_steps=[
            "양파를 썰고 토마토를 깍둑썰기 합니다.",
            "달군 팬에 기름을 두르고 양파를 볶습니다.",
            "토마토와 계란을 넣고 함께 볶습니다.",
            "소금으로 간을 맞추고 참기름을 넣습니다."
        ],
        fridge_ingredients=["계란", "양파", "식용유", "소금"],
        substitution_candidates={
            "토마토": ["파프리카", "케첩"],
            "참기름": ["식용유", "들기름"]
        }
    )

    chat = ChatGPTModule()
    response = chat.send_prompt(prompt=user_prompt, system_message=system_message)
    print(f"응답:\n{response}\n")


def example_8_search_recipes():
    """예제 8: 레시피 데이터베이스에서 직접 검색"""
    print("=" * 60)
    print("예제 8: 레시피 데이터베이스에서 직접 검색")
    print("=" * 60)
    
    db = RecipeDatabase()
    
    # 쿼리 기반 검색
    print("쿼리 기반 검색 (100개 레시피):")
    context, _ = db.prepare_rag_context(user_query="계란 요리", ingredients=None)
    print(context[:500] + "..." if len(context) > 500 else context)
    print()
    
    # 재료 기반 검색
    print("재료 기반 검색:")
    context, _ = db.prepare_rag_context(
        user_query=None,
        ingredients=["계란", "토마토", "양파"]
    )
    print(context[:500] + "..." if len(context) > 500 else context)
    print()


def example_9_rag_enhanced():
    """예제 9: RAG 강화 프롬프트"""
    print("=" * 60)
    print("예제 9: RAG 강화 프롬프트")
    print("=" * 60)
    
    # RAG 컨텍스트 준비
    db = RecipeDatabase()
    rag_context, search_info = db.prepare_rag_context(
        user_query="빠른 계란 요리",
        ingredients=["계란", "양파", "버터"]
    )
    
    # RAG 강화 프롬프트 생성
    user_prompt, system_message = PromptGenerator.rag_enhanced_prompt(
        user_query="5분 안에 만들 수 있는 간단한 계란 요리 추천해줄래?",
        rag_context=rag_context
    )
    
    # ChatGPT에 전송
    chat = ChatGPTModule()
    response = chat.send_prompt(prompt=user_prompt, system_message=system_message)
    print(f"응답:\n{response}\n")


def example_10_conversation_history():
    """예제 10: 대화 히스토리 관리"""
    print("=" * 60)
    print("예제 10: 대화 히스토리 관리")
    print("=" * 60)
    
    chat = ChatGPTModule()
    
    # 첫 번째 질문
    response1 = chat.send_prompt(
        prompt="계란 요리 3가지를 추천해줄래?",
        system_message="당신은 요리 전문가입니다."
    )
    print(f"1차 응답: {response1}\n")
    
    # 두 번째 질문 (대화 히스토리 포함)
    response2 = chat.send_prompt(
        prompt="그 중에서 가장 빠르게 만들 수 있는 요리는?"
    )
    print(f"2차 응답: {response2}\n")
    
    # 대화 히스토리 확인
    print("대화 히스토리:")
    for i, msg in enumerate(chat.get_history(), 1):
        role = msg['role'].upper()
        content = msg['content'][:50] + "..." if len(msg['content']) > 50 else msg['content']
        print(f"{i}. [{role}] {content}")
    
    # 히스토리 초기화
    chat.clear_history()
    print("\n히스토리 초기화됨\n")


if __name__ == "__main__":
    # .env 파일 로드
    from dotenv import load_dotenv
    load_dotenv()
    
    # 실제 API 호출 테스트
    try:
        example_1_basic_chat()
        example_2_recipe_suggestion()
        example_3_with_rag_context()
        example_3_new_recipe_list_rag()
        example_4_nutrition_analysis()
        example_5_cooking_time()
        example_6_ingredient_substitution()
        example_7_prompt_builder()
        example_7_1_recipe_detail_substitution_nutrition()
        example_9_rag_enhanced()
        example_10_conversation_history()
    except Exception as e:
        print(f"❌ 오류 발생: {e}")
        import traceback
        traceback.print_exc()

