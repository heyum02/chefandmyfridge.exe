import { create } from 'zustand';

export const useUserStore = create((set) => ({
  // 💡 백엔드와 통신할 내 고유 아이디!
  userId: null,
  nickname: '새로운 요리사',
  email: 'guest@example.com',

  userProfile: {
    allergies: [],
    kitchenTools: [],
    tastes: { spicy: 3, salty: 3, sweet: 3, bitter: 3, sour: 3, savory: 3 }
  },

  triedRecipes: [],

  // 💡 로그인 시 백엔드에서 받은 내 정보(아이디 포함)를 한 번에 저장하는 함수
  setUser: (userData) => set({
    userId: userData.userId,
    nickname: userData.nickname,
    email: userData.email,
    isPremium: userData.isPremium || false,
    freeCount: userData.freeCount !== undefined ? userData.freeCount : 10,
  }),

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

  isPremium: false,
  freeCount: 10,

  setIsPremium: (status) => set({ isPremium: status }),
  decreaseFreeCount: () => set((state) => ({ freeCount: state.freeCount > 0 ? state.freeCount - 1 : 0 })),
  addFreeCount: (amount) => set((state) => ({ freeCount: state.freeCount + amount })),

  clearUser: () => set({
    userId: null, // 💡 로그아웃 시 아이디 초기화
    nickname: '새로운 요리사',
    email: 'guest@example.com',
    userProfile: { allergies: [], kitchenTools: [], tastes: { spicy: 3, salty: 3, sweet: 3, bitter: 3, sour: 3, savory: 3 } },
    triedRecipes: [],
    isChatHidden: false,
    isPremium: false,
    freeCount: 10
  }),
}));
