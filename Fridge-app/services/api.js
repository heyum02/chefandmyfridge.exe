import axios from 'axios';

// 1. 서버 주소 설정
// 서버를 켜면 나오는 IP 주소나 ngrok/localtunnel 주소를 여기에 넣습니다.
// 예시: 'http://192.168.0.12:3000' 또는 'https://어쩌구저쩌구.loca.lt'
const BACKEND_URL = 'http://125.186.175.246:3000';

// 2. 기본 axios 인스턴스 생성
export const api = axios.create({
  baseURL: BACKEND_URL,
  headers: {
    'Content-Type': 'application/json',
    'Bypass-Tunnel-Reminder': 'true',
    'User-Agent': 'MyApp/1.0',
  },
});

// ==========================================
// [냉장고 관련 API 모음]
// ==========================================

// [API 1] 냉장고 전체 재고 조회
export const getFridgeItems = () => api.get('/api/fridge');

// [API 2] 식재료 수동 추가
export const addFridgeItemAPI = (data) => api.post('/api/fridge/add', data);

// [API 4] 식재료 수정 (소비기한)
export const updateExpiryDateAPI = (itemId, expiryDate) => api.put(`/api/fridge/${itemId}`, { expiryDate });

// [API 5] 식재료 삭제
export const deleteFridgeItemAPI = (itemId) => api.delete(`/api/fridge/${itemId}`);

// [API 3] Vision AI 확정 데이터 저장
export const addVisionItemsAPI = (data) => api.post('/vision/add', data);


// ==========================================
// [레시피 및 챗봇 관련 API 모음]
// ==========================================

// [API 6] 레시피 추천 (목록)
export const recommendRecipeAPI = (data) => api.post('/api/recipe/recommend', data);

// [API 7] 레시피 상세 조회 (세션 ID 발급)
export const getRecipeDetailAPI = (data) => api.post('/api/recipe/detail', data);

// [API 8] 레시피 후속 대화 (챗봇)
export const sendRecipeChatAPI = (data) => api.post('/api/recipe/chat', data);


// ==========================================
// [유저 인증 및 마이페이지 API 모음]
// ==========================================

// [API 9] 회원가입
export const signupAPI = (data) => api.post('/api/auth/signup', data);

// [API 10] 로그인
export const loginAPI = (data) => api.post('/api/auth/login', data);

// [API 11] 마이페이지 맞춤 설정 변경
export const updateProfileAPI = (data) => api.put('/api/user/profile', data);

// ==========================================
// [요리 기록 및 피드백 API 모음]
// ==========================================

// [API 12] 요리 완료 기록 저장
export const addHistoryAPI = (data) => api.post('/api/recipe/history', data);

// [API 13] 요리 기록 수정
export const updateHistoryAPI = (id, data) => api.put(`/api/recipe/history/${id}`, data);

// [API 14] 요리 기록 삭제
export const deleteHistoryAPI = (id) => api.delete(`/api/recipe/history/${id}`);
