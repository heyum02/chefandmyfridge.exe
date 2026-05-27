import { create } from 'zustand';
// 💡 방금 만든 통신 본부(api.js)에서 필요한 기능들을 수입해옵니다!
import { addFridgeItemAPI, deleteFridgeItemAPI, getFridgeItems, updateExpiryDateAPI } from '../services/api';

export const useFridgeStore = create((set, get) => ({
  // 1. 우리 냉장고에 들어있는 재료 데이터
  ingredients: [],

  // 💡 [새로 추가됨] 1.5. 서버에서 내 냉장고 데이터 싹 가져오기
  fetchIngredients: async () => {
    try {
      const response = await getFridgeItems(); 
      set({ ingredients: response.data });
    } catch (error) {
      console.error("서버에서 냉장고 데이터를 불러오는데 실패했습니다:", error);
    }
  },

  // 2. 냉장고에 새 재료를 넣는 기능 (서버 통신 추가)
  addIngredient: async (newIngredient) => {
    try {
      // 💡 [철통 방어 1] 만약 다른 곳에서 카테고리를 빼먹고 보냈더라도, 무조건 '기타'를 채워 넣어서 에러를 막습니다!
      const safeCategory = newIngredient.category || '기타';
      const finalIngredient = { ...newIngredient, category: safeCategory };

      // 💡 [서버에 먼저 저장 요청]
      const response = await addFridgeItemAPI({
        name: finalIngredient.name,
        category: finalIngredient.category,
        amount: finalIngredient.amount,
        unit: finalIngredient.unit,
        expiryDate: finalIngredient.expiryDate
      });

      // 서버가 새롭게 발급해준 진짜 DB ID
      const realDbId = response.data.id;

      // 💡 [기존 로직 유지] 내 화면(상태)에도 업데이트
      set((state) => {
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
          // 완전히 새로운 재료라면 서버에서 받은 '진짜 ID'를 넣어서 맨 끝에 추가합니다.
          const newItemWithId = { ...finalIngredient, id: realDbId };
          return { ingredients: [...state.ingredients, newItemWithId] };
        }
      });
    } catch (error) {
      console.error("식재료 추가 실패:", error);
      alert("서버 통신 오류로 식재료를 추가하지 못했습니다.");
    }
  },

  // 3. 냉장고에서 다 쓴 재료를 빼는(삭제) 기능 (서버 통신 추가)
  removeIngredient: async (ingredientId) => {
    try {
      // 💡 서버에 먼저 지워달라고 요청
      await deleteFridgeItemAPI(ingredientId);
      
      // 요청 성공 시 화면(상태)에서도 삭제
      set((state) => ({ 
        ingredients: state.ingredients.filter((item) => item.id !== ingredientId) 
      }));
    } catch (error) {
      console.error("식재료 삭제 실패:", error);
      alert("삭제 중 오류가 발생했습니다.");
    }
  },

  // 💡 3.5. 냉장고 재료 정보 수정 기능 (D-day 변경 시 사용 - 서버 통신 추가)
  updateIngredient: async (id, updatedData) => {
    try {
      // 💡 소비기한이 변경된 경우 서버에 먼저 업데이트 요청
      if (updatedData.expiryDate) {
        await updateExpiryDateAPI(id, updatedData.expiryDate);
      }

      // 요청 성공 시 화면(상태) 데이터도 수정
      set((state) => ({
        ingredients: state.ingredients.map(item => item.id === id ? { ...item, ...updatedData } : item)
      }));
    } catch (error) {
      console.error("식재료 수정 실패:", error);
      alert("수정 중 오류가 발생했습니다.");
    }
  },

  // 4. 로그아웃 시 냉장고 싹 비우기
  clearFridge: () => set({ ingredients: [] }),
}));