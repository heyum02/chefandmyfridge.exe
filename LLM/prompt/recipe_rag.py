"""
RAG (Retrieval Augmented Generation) 모듈
레시피 데이터베이스를 검색하여 관련 레시피를 LLM에 제공
"""

import json
import os
from pathlib import Path
from typing import List, Dict, Tuple
from difflib import SequenceMatcher


class RecipeRAG:
    """레시피 데이터베이스를 활용한 RAG 시스템"""
    
    def __init__(self, recipes_path: str = "../recipe/recipes_pages"):
        """
        RAG 모듈 초기화
        
        Args:
            recipes_path: 레시피 JSON 파일들이 있는 경로
        """
        self.recipes_path = recipes_path
        self.recipe_cache: Dict[int, Dict] = {}
        self.recipe_index: List[Dict] = []
        self.loaded = False
    
    def load_recipes(self, limit: int = None) -> int:
        """
        레시피 파일 로드
        
        Args:
            limit: 로드할 최대 파일 수 (전체는 None)
        
        Returns:
            로드된 레시피 수
        """
        try:
            recipes_dir = Path(self.recipes_path)
            if not recipes_dir.exists():
                print(f"경로가 없습니다: {self.recipes_path}")
                return 0
            
            json_files = sorted(recipes_dir.glob("*.json"))[:limit]
            
            for file_path in json_files:
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = json.load(f)
                        
                        # 각 레시피 파일이 리스트일 수 있음
                        recipes = content if isinstance(content, list) else [content]
                        
                        for recipe in recipes:
                            if isinstance(recipe, dict) and "title" in recipe:
                                index_entry = {
                                    "title": recipe.get("title", ""),
                                    "ingredients": recipe.get("ingredients", []),
                                    "steps": recipe.get("steps", []),
                                    "full_text": self._create_recipe_text(recipe)
                                }
                                self.recipe_index.append(index_entry)
                except json.JSONDecodeError:
                    continue
                except Exception as e:
                    continue
            
            self.loaded = True
            return len(self.recipe_index)
        
        except Exception as e:
            print(f"레시피 로드 중 오류: {e}")
            return 0
    
    @staticmethod
    def _create_recipe_text(recipe: Dict) -> str:
        """레시피를 검색 가능한 텍스트로 변환"""
        parts = [recipe.get("title", "")]
        
        ingredients = recipe.get("ingredients", [])
        if ingredients:
            parts.append(" ".join(ingredients))
        
        return " ".join(parts)
    
    def search_recipes(self, query: str, top_k: int = 3) -> List[Dict]:
        """
        유사도 기반으로 레시피 검색
        
        Args:
            query: 검색 쿼리
            top_k: 반환할 상위 레시피 수
        
        Returns:
            검색된 레시피 리스트 (유사도 점수 포함)
        """
        if not self.loaded:
            self.load_recipes(limit=100)  # 기본 100개만 로드
        
        if not self.recipe_index:
            return []
        
        # 간단한 유사도 계산 (키워드 매칭)
        query_keywords = query.lower().split()
        results = []
        
        for recipe in self.recipe_index:
            score = self._calculate_similarity(query_keywords, recipe)
            results.append((score, recipe))
        
        # 유사도 높은 순으로 정렬
        results.sort(key=lambda x: x[0], reverse=True)
        
        return [recipe for score, recipe in results[:top_k] if score > 0]
    
    @staticmethod
    def _calculate_similarity(keywords: List[str], recipe: Dict) -> float:
        """
        쿼리 키워드와 레시피의 유사도 계산
        
        Args:
            keywords: 쿼리 키워드 리스트
            recipe: 레시피 딕셔너리
        
        Returns:
            유사도 점수 (0-1000)
        """
        score = 0.0
        recipe_text = recipe["full_text"].lower()
        
        # 제목에 매치되면 높은 점수
        title = recipe.get("title", "").lower()
        for keyword in keywords:
            if keyword in title:
                score += 500
        
        # 재료에 매치되면 중간 점수
        for ingredient in recipe.get("ingredients", []):
            ingredient_lower = ingredient.lower()
            for keyword in keywords:
                if keyword in ingredient_lower:
                    score += 100
        
        # 전체 텍스트에 매치되면 낮은 점수
        for keyword in keywords:
            if keyword in recipe_text:
                score += 10
        
        return score
    
    def search_by_ingredients(self, ingredients: List[str], top_k: int = 3) -> List[Dict]:
        """
        보유 재료로 레시피 검색
        
        Args:
            ingredients: 보유한 재료 리스트
            top_k: 반환할 상위 레시피 수
        
        Returns:
            검색된 레시피 리스트
        """
        if not self.loaded:
            self.load_recipes(limit=100)
        
        if not self.recipe_index:
            return []
        
        results = []
        
        for recipe in self.recipe_index:
            # 보유 재료가 몇 개 포함되어 있는지 계산
            match_count = 0
            recipe_ingredients = recipe.get("ingredients", [])
            
            for user_ingredient in ingredients:
                user_ing_lower = user_ingredient.lower()
                for recipe_ingredient in recipe_ingredients:
                    if user_ing_lower in recipe_ingredient.lower():
                        match_count += 1
                        break
            
            if match_count > 0:
                results.append((match_count, recipe))
        
        # 매치 수가 많은 순으로 정렬
        results.sort(key=lambda x: x[0], reverse=True)
        
        return [recipe for score, recipe in results[:top_k]]
    
    def get_recipe_context(self, recipes: List[Dict]) -> str:
        """
        검색된 레시피들을 LLM 프롬프트에 포함시킬 컨텍스트로 변환
        
        Args:
            recipes: 레시피 리스트
        
        Returns:
            포맷된 컨텍스트 문자열
        """
        if not recipes:
            return "참고할 레시피가 없습니다."
        
        context_parts = ["=== 참고 레시피 ==="]
        
        for i, recipe in enumerate(recipes, 1):
            parts = [f"\n{i}. {recipe.get('title', 'Unknown')}"]
            
            ingredients = recipe.get("ingredients", [])
            if ingredients:
                parts.append("재료:")
                for ingredient in ingredients[:5]:  # 처음 5개만 표시
                    parts.append(f"  - {ingredient}")
                if len(ingredients) > 5:
                    parts.append(f"  ... 외 {len(ingredients)-5}가지")
            
            steps = recipe.get("steps", [])
            if steps:
                parts.append("조리 단계 (처음 3단계):")
                for step in steps[:3]:
                    parts.append(f"  - {step[:100]}...")
            
            context_parts.append("\n".join(parts))
        
        return "\n".join(context_parts)


class RecipeDatabase:
    """레시피 데이터베이스 관리"""
    
    def __init__(self, recipes_path: str = "../recipe/recipes_pages"):
        self.recipes_path = recipes_path
        self.rag = RecipeRAG(recipes_path)
    
    def prepare_rag_context(self, user_query: str, ingredients: List[str] = None) -> Tuple[str, str]:
        """
        RAG 컨텍스트 준비
        
        Args:
            user_query: 사용자 쿼리
            ingredients: 보유 재료 (선택사항)
        
        Returns:
            (추가할_컨텍스트, 검색_쿼리_정보)
        """
        recommendations = []
        search_info = ""
        
        # 쿼리 기반 검색
        if user_query:
            query_results = self.rag.search_recipes(user_query, top_k=2)
            if query_results:
                recommendations.extend(query_results)
                search_info = f"쿼리 '{user_query}'로 검색한 레시피를 참고했습니다."
        
        # 재료 기반 검색
        if ingredients:
            ingredient_results = self.rag.search_by_ingredients(ingredients, top_k=2)
            if ingredient_results:
                recommendations.extend(ingredient_results)
                search_info = f"보유 재료 {ingredients}로 검색한 레시피를 참고했습니다."
        
        context = self.rag.get_recipe_context(recommendations)
        
        return context, search_info
