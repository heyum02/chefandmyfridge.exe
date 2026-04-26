import { create } from 'zustand';

export const useFridgeStore = create((set) => ({
  // 1. 우리 냉장고에 들어있는 재료 데이터 (초기 상태는 텅 빈 배열)
  ingredients: [],



  // 2. 냉장고에 새 재료를 넣는 기능
  addIngredient: (newIngredient) => set((state) => {
    // 기존 냉장고(ingredients)에 지금 넣으려는 재료와 '이름'이 같은 게 있는지 찾습니다.
    const existingIndex = state.ingredients.findIndex(
      (item) => item.name === newIngredient.name
    );

    if (existingIndex !== -1) {
      // 이미 냉장고에 같은 재료가 있다면? -> 개수(amount)만 더해줍니다.
      const updatedIngredients = [...state.ingredients];
      updatedIngredients[existingIndex].amount += newIngredient.amount;
      return { ingredients: updatedIngredients };
    } else {
      // 완전히 새로운 재료라면? -> 평소처럼 배열 맨 끝에 새로 추가합니다.
      return { ingredients: [...state.ingredients, newIngredient] };
    }
  }),

  // 3. 냉장고에서 다 쓴 재료를 빼는(삭제) 기능
  removeIngredient: (ingredientId) => set((state) => ({ ingredients: state.ingredients.filter((item) => item.id !== ingredientId) })),

  // 💡 4. 새로 추가된 기능: 로그아웃 시 냉장고 싹 비우기!
  clearFridge: () => set({ ingredients: [] }),
}));
