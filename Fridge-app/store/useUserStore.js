import { create } from 'zustand';

export const useUserStore = create((set) => ({
  // 💡 기존: 유저 기본 정보
  nickname: '새로운 요리사',
  email: 'guest@example.com',
  
  // 💡 기존: 사용자의 제약 조건 및 식성 데이터
  userProfile: {
    allergies: [], 
    kitchenTools: [], 
    tastes: { spicy: 3, salty: 3, sweet: 3 } // 1~5 단계 (3이 보통)
  },

  // 💡 기존: 따라 해본 레시피 저장소 (배열)
  triedRecipes: [],

  // --- 기존 함수들 ---
  setNickname: (newName) => set({ nickname: newName }),
  setEmail: (newEmail) => set({ email: newEmail }),
  setInitialProfile: (profile) => set({ userProfile: profile }),

  // 1. 레시피 피드백용 (상대적 변화: -1, +1 누적)
  updateTaste: (category, change) => set((state) => ({
    userProfile: {
      ...state.userProfile,
      tastes: {
        ...state.userProfile.tastes,
        [category]: Math.max(1, Math.min(5, state.userProfile.tastes[category] + change))
      }
    }
  })),

  // 2. 마이페이지에서 직접 설정 변경할 때 '전체 덮어쓰기'용
  updateFullProfile: (newProfile) => set((state) => ({
    userProfile: { ...state.userProfile, ...newProfile }
  })),

  // 3. 요리 완료 시 레시피 기록 추가 함수
  addTriedRecipe: (recipe) => set((state) => ({
    triedRecipes: [recipe, ...state.triedRecipes]
  })),

  // 4. 요리 기록 삭제 함수
  deleteTriedRecipe: (id) => set((state) => ({
    triedRecipes: state.triedRecipes.filter((recipe) => recipe.id !== id)
  })),

  // 💡 NEW: 요리 기록 수정 함수 (id가 일치하는 항목을 찾아서 내용만 쏙 바꿔치기)
  editTriedRecipe: (id, updatedData) => set((state) => ({
    triedRecipes: state.triedRecipes.map((recipe) => 
      recipe.id === id ? { ...recipe, ...updatedData } : recipe
    )
  })),

  // 로그아웃 시 모든 정보 깨끗하게 초기화
  clearUser: () => set({ 
    nickname: '새로운 요리사', 
    email: 'guest@example.com',
    userProfile: { allergies: [], kitchenTools: [], tastes: { spicy: 3, salty: 3, sweet: 3 } },
    triedRecipes: [] 
  }),
}));