import { create } from 'zustand';

export const useFridgeStore = create((set) => ({
  // 1. 우리 냉장고에 들어있는 재료 데이터
  ingredients: [],

  // 2. 냉장고에 새 재료를 넣는 기능
  addIngredient: (newIngredient) => set((state) => {
    
    // 💡 [철통 방어 1] 만약 다른 곳에서 카테고리를 빼먹고 보냈더라도, 무조건 '기타'를 채워 넣어서 에러를 막습니다!
    const safeCategory = newIngredient.category || '기타';
    const finalIngredient = { ...newIngredient, category: safeCategory };

    // 기존 냉장고에 지금 넣으려는 재료와 '이름'이 같은 게 있는지 찾습니다.
    const existingIndex = state.ingredients.findIndex(
      (item) => item.name === finalIngredient.name
    );

    if (existingIndex !== -1) {
      // 이미 냉장고에 같은 재료가 있다면? -> 개수를 더해줍니다.
      const updatedIngredients = [...state.ingredients];
      updatedIngredients[existingIndex].amount += finalIngredient.amount;
      
      // 💡 [철통 방어 2] 예전에 카테고리 없이 저장된 녀석이거나 '기타'였다면, 이번에 제대로 받아온 카테고리로 업데이트해 줍니다!
      if (!updatedIngredients[existingIndex].category || updatedIngredients[existingIndex].category === '기타') {
         updatedIngredients[existingIndex].category = safeCategory;
      }
      
      return { ingredients: updatedIngredients };
    } else {
      // 완전히 새로운 재료라면 맨 끝에 추가합니다.
      return { ingredients: [...state.ingredients, finalIngredient] };
    }
  }),

  // 3. 냉장고에서 다 쓴 재료를 빼는(삭제) 기능
  removeIngredient: (ingredientId) => set((state) => ({ ingredients: state.ingredients.filter((item) => item.id !== ingredientId) })),

  // 💡 3.5. 냉장고 재료 정보 수정 기능 (D-day 변경 시 사용)
  updateIngredient: (id, updatedData) => set((state) => ({
    ingredients: state.ingredients.map(item => item.id === id ? { ...item, ...updatedData } : item)
  })),

  // 4. 로그아웃 시 냉장고 싹 비우기
  clearFridge: () => set({ ingredients: [] }),
}));