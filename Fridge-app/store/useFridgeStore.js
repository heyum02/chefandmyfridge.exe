import { create } from 'zustand';

export const useFridgeStore = create((set) => ({
  // 1. 우리 냉장고에 들어있는 재료 데이터 (초기 상태는 텅 빈 배열)
  ingredients: [],

  // 2. 냉장고에 새 재료를 넣는 기능
  addIngredient: (newIngredient) => set((state) => ({ ingredients: [...state.ingredients, newIngredient] })),

  // 3. 냉장고에서 다 쓴 재료를 빼는(삭제) 기능
  removeIngredient: (ingredientId) => set((state) => ({ ingredients: state.ingredients.filter((item) => item.id !== ingredientId) })),

  // 💡 4. 새로 추가된 기능: 로그아웃 시 냉장고 싹 비우기!
  clearFridge: () => set({ ingredients: [] }),
}));
