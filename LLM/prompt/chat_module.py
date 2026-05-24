import os
from openai import OpenAI
from typing import Optional, List, Dict
from dotenv import load_dotenv

# .env 파일 로드
load_dotenv()


class ChatGPTModule:
    """ChatGPT와 프롬프트를 주고받는 모듈"""
    
    def __init__(self, api_key: Optional[str] = None, model: str = "gpt-4o-mini"):
        """
        ChatGPT 모듈 초기화
        
        Args:
            api_key: OpenAI API 키 (기본값: 환경변수 OPENAI_API_KEY)
            model: 사용할 모델 (기본값: gpt-4o-mini)
        """
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError("OpenAI API 키가 설정되지 않았습니다. "
                           "OPENAI_API_KEY 환경변수를 설정하거나 api_key 파라미터를 전달하세요.")
        
        self.client = OpenAI(api_key=self.api_key)
        self.model = model
        self.conversation_history: List[Dict[str, str]] = []
    
    def send_prompt(self, prompt: str, system_message: Optional[str] = None, temperature: float = 0.7) -> str:
        """
        ChatGPT에 프롬프트를 보내고 응답을 받음
        
        Args:
            prompt: 사용자 프롬프트
            system_message: 시스템 메시지 (선택사항)
            temperature: 응답의 다양성 (0.0 ~ 2.0, 기본값: 0.7)
        
        Returns:
            ChatGPT의 응답 텍스트
        """
        messages = []
        
        if system_message:
            messages.append({"role": "system", "content": system_message})
        
        # 대화 히스토리 추가
        messages.extend(self.conversation_history)
        
        # 현재 프롬프트 추가
        messages.append({"role": "user", "content": prompt})
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=temperature
            )
            
            assistant_message = response.choices[0].message.content
            
            # 대화 히스토리에 저장
            self.conversation_history.append({"role": "user", "content": prompt})
            self.conversation_history.append({"role": "assistant", "content": assistant_message})
            
            return assistant_message
        
        except Exception as e:
            raise Exception(f"ChatGPT API 호출 중 오류 발생: {str(e)}")
    
    def clear_history(self):
        """대화 히스토리 초기화"""
        self.conversation_history = []
    
    def get_history(self) -> List[Dict[str, str]]:
        """현재 대화 히스토리 반환"""
        return self.conversation_history.copy()
