import { create } from 'zustand';

export const useUserStore = create((set) => ({
  // 💡 초기 상태 (기본값)
  nickname: '새로운 요리사', 
  email: 'guest@example.com', // 이메일 추가
  
  // 💡 정보 저장 기능들
  setNickname: (newName) => set({ nickname: newName }),
  setEmail: (newEmail) => set({ email: newEmail }), // 이메일 저장 함수 추가

// 💡 3. 새로 추가된 기능: 로그아웃 시 유저 정보 초기화!
  clearUser: () => set({ nickname: '새로운 요리사', email: 'guest@example.com' }),

}));