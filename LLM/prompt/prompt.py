"""
프롬프트 생성 모듈
사용자 입력과 RAG 컨텍스트를 기반으로 ChatGPT에 전달할 프롬프트 생성
"""

from typing import Optional, List, Tuple


class PromptGenerator:
    """프롬프트 생성용 정적 메서드 모음"""
    
    @staticmethod
    def recipe_suggestion_prompt(
        ingredients: List[str],
        allergies: Optional[List[str]] = None,
        cooking_tools: Optional[List[str]] = None,
        rag_context: Optional[str] = None
    ) -> Tuple[str, str]:
        """
        보유 재료를 기반으로 레시피 추천 프롬프트 생성
        
        Returns:
            (user_prompt, system_message) 튜플
        """
        system_message = """당신은 친절한 요리 조언가입니다.
사용자가 보유한 재료를 기반으로 맛있는 레시피를 추천해줍니다.
한국 요리를 중심으로 추천하며, 제공된 레시피 정보가 있으면 참고합니다."""

        user_parts = [f"내가 가진 재료: {', '.join(ingredients)}"]
        
        if allergies:
            user_parts.append(f"알레르기: {', '.join(allergies)}")
        
        if cooking_tools:
            user_parts.append(f"사용 가능한 조리 도구: {', '.join(cooking_tools)}")
        
        if rag_context:
            user_parts.append(f"\n참고할 레시피 정보:\n{rag_context}")
        
        user_parts.append("\n이 재료들로 만들 수 있는 요리를 추천해줘. 조리 방법도 간단히 설명해줄래?")
        
        user_prompt = "\n".join(user_parts)
        
        return user_prompt, system_message
    
    @staticmethod
    def recipe_extraction_prompt(user_input: str, rag_context: Optional[str] = None) -> Tuple[str, str]:
        """
        사용자의 자연어 요청에서 레시피를 추출하는 프롬프트
        
        Returns:
            (user_prompt, system_message) 튜플
        """
        system_message = """당신은 요리 정보 추출 전문가입니다.
사용자의 요청을 분석하여 필요한 재료, 조리 방법, 팁 등을 정리해줍니다.
제공된 레시피 정보가 있으면 참고합니다."""

        user_parts = [user_input]
        
        if rag_context:
            user_parts.append(f"\n참고: {rag_context}")
        
        user_prompt = "\n".join(user_parts)
        
        return user_prompt, system_message
    
    @staticmethod
    def nutrition_analysis_prompt(dish_name: str, ingredients: List[str]) -> Tuple[str, str]:
        """영양 분석 프롬프트"""
        system_message = "당신은 영양사입니다. 요리의 영양 정보를 분석해줍니다."
        
        user_prompt = f"""요리명: {dish_name}
재료: {', '.join(ingredients)}

이 요리의 대략적인 영양 정보(칼로리, 단백질, 탄수화물, 지방, 비타민)를 분석해줄래?"""
        
        return user_prompt, system_message
    
    @staticmethod
    def cooking_time_estimation_prompt(
        ingredients: List[str],
        difficulty: str = "중간"
    ) -> Tuple[str, str]:
        """조리 시간 예측 프롬프트"""
        system_message = "당신은 요리 경험이 풍부합니다. 조리 시간을 정확히 예측해줍니다."
        
        user_prompt = f"""재료: {', '.join(ingredients)}
난이도: {difficulty}

이 재료로 밥을 만든다면 예상 조리 시간은? 준비 시간과 조리 시간을 나누어 설명해줘."""
        
        return user_prompt, system_message
    
    @staticmethod
    def ingredient_substitution_prompt(
        original_ingredient: str,
        reason: str = "보유하지 않음"
    ) -> Tuple[str, str]:
        """재료 대체 프롬프트"""
        system_message = "당신은 요리 전문가입니다. 재료를 효과적으로 대체하는 방법을 제시해줍니다."
        
        user_prompt = f"""원래 재료: {original_ingredient}
이유: {reason}

이 재료를 대체할 수 있는 재료들을 3가지 제시해주고, 각각의 장단점을 설명해줄래?"""
        
        return user_prompt, system_message
    
    @staticmethod
    def rag_enhanced_prompt(
        user_query: str,
        rag_context: str,
        system_message: Optional[str] = None
    ) -> Tuple[str, str]:
        """
        RAG 컨텍스트를 포함한 프롬프트
        
        Args:
            user_query: 사용자 질문
            rag_context: RAG로 검색한 레시피 정보
            system_message: 커스텀 시스템 메시지 (선택)
        
        Returns:
            (user_prompt, system_message) 튜플
        """
        if not system_message:
            system_message = """당신은 요리 전문가입니다.
제공된 레시피 정보를 참고하여 사용자의 요청에 정확히 답변합니다.
레시피 정보가 있으면 우선적으로 활용합니다."""
        
        user_prompt = f"""{user_query}

참고할 레시피:
{rag_context}"""
        
        return user_prompt, system_message


class PromptBuilder:
    """체인 패턴을 사용한 프롬프트 빌더"""
    
    def __init__(self, base_prompt: str = "", base_system: str = ""):
        """
        Args:
            base_prompt: 초기 사용자 프롬프트
            base_system: 초기 시스템 메시지
        """
        self.user_prompt = base_prompt
        self.system_message = base_system
    
    def add_instruction(self, instruction: str) -> "PromptBuilder":
        """지시사항 추가"""
        self.user_prompt += f"\n\n지시사항: {instruction}"
        return self
    
    def add_context(self, context_title: str, context_content: str) -> "PromptBuilder":
        """컨텍스트 추가"""
        self.user_prompt += f"\n\n[{context_title}]\n{context_content}"
        return self
    
    def add_rag_context(self, rag_context: str) -> "PromptBuilder":
        """RAG 컨텍스트 추가"""
        self.user_prompt += f"\n\n[참고 레시피]\n{rag_context}"
        return self
    
    def add_format_instruction(self, format_type: str) -> "PromptBuilder":
        """출력 형식 지시 추가"""
        if format_type == "json":
            self.user_prompt += "\n\n응답은 반드시 JSON 형식으로 제시해주세요."
        elif format_type == "list":
            self.user_prompt += "\n\n응답은 단계적 리스트 형식으로 제시해주세요."
        elif format_type == "markdown":
            self.user_prompt += "\n\n응답은 마크다운 형식으로 제시해주세요."
        return self
    
    def build(self) -> Tuple[str, str]:
        """프롬프트 빌드 완료, (user_prompt, system_message) 반환"""
        return self.user_prompt, self.system_message