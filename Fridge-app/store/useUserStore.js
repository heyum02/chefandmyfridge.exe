import { create } from 'zustand';

export const useUserStore = create((set) => ({
  nickname: '새로운 요리사',
  email: 'guest@example.com',
  
  userProfile: {
    allergies: [], 
    kitchenTools: [], 
    tastes: { spicy: 3, salty: 3, sweet: 3, bitter: 3, sour: 3, savory: 3 } 
  },

  triedRecipes: [],

  // 💡 [핵심] 카메라 화면이 찾던 바로 그 스위치입니다!
  isChatHidden: false,
  setChatHidden: (hidden) => set({ isChatHidden: hidden }),

  setNickname: (newName) => set({ nickname: newName }),
  setEmail: (newEmail) => set({ email: newEmail }),
  setInitialProfile: (profile) => set({ userProfile: profile }),

  updateTaste: (category, change) => set((state) => ({
    userProfile: {
      ...state.userProfile,
      tastes: {
        ...state.userProfile.tastes,
        [category]: Math.max(1, Math.min(5, (state.userProfile.tastes[category] || 3) + change))
      }
    }
  })),

  updateFullProfile: (newProfile) => set((state) => ({
    userProfile: { ...state.userProfile, ...newProfile }
  })),

  addTriedRecipe: (recipe) => set((state) => ({
    triedRecipes: [recipe, ...state.triedRecipes]
  })),

  deleteTriedRecipe: (id) => set((state) => ({
    triedRecipes: state.triedRecipes.filter((recipe) => recipe.id !== id)
  })),

  editTriedRecipe: (id, updatedData) => set((state) => ({
    triedRecipes: state.triedRecipes.map((recipe) => 
      recipe.id === id ? { ...recipe, ...updatedData } : recipe
    )
  })),

  // 💡 [추가됨] 구독 및 무료 횟수 상태
  isPremium: false,
  freeCount: 10,
  
  setIsPremium: (status) => set({ isPremium: status }),
  decreaseFreeCount: () => set((state) => ({ freeCount: state.freeCount > 0 ? state.freeCount - 1 : 0 })),
  addFreeCount: (amount) => set((state) => ({ freeCount: state.freeCount + amount })),

  clearUser: () => set({ 
    nickname: '새로운 요리사', 
    email: 'guest@example.com',
    userProfile: { allergies: [], kitchenTools: [], tastes: { spicy: 3, salty: 3, sweet: 3, bitter: 3, sour: 3, savory: 3 } },
    triedRecipes: [],
    // 로그아웃 시 스위치 원상복구
    isChatHidden: false 
  }),
}));