import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { updateProfileAPI } from '../services/api';
import { useFridgeStore } from '../store/useFridgeStore';
import { useUserStore } from '../store/useUserStore';

const toolCategories = {
  "🔥 가열 기구": ["가스레인지", "인덕션", "오븐", "전자레인지", "에어프라이어", "밥솥", "전기팬", "전기밥솥", "토치"],
  "🍳 팬/냄비": ["냄비", "프라이팬", "주물팬", "달걀말이팬", "오븐팬", "베이킹팬", "머핀팬", "와플팬", "쿠킹팬"],
  "🔪 조리 도구": ["도마", "칼", "가위", "조리용나이프", "조리용스푼", "조리주걱", "스푼", "주걱", "국자", "집게", "거품기", "주방용스패츌라"],
  "🥣 볼/채반": ["볼", "믹싱볼", "채반", "채망", "거름망", "식힘망"],
  "🔌 가전 기기": ["믹서기", "블렌더", "핸드믹서", "핸드블렌더", "전자저울"],
  "🍽️ 식기/기타": ["그릇", "접시", "플레이트", "컵", "병", "포크", "트레이", "키친타올", "장갑", "주방솔", "랩", "포장지"]
};

export default function MyPageScreen({ onLogout }) {
  const nickname = useUserStore((state) => state.nickname);
  const email = useUserStore((state) => state.email);
  const clearUser = useUserStore((state) => state.clearUser);
  const ingredients = useFridgeStore((state) => state.ingredients);
  const clearFridge = useFridgeStore((state) => state.clearFridge);
  const userProfile = useUserStore((state) => state.userProfile);
  const updateFullProfile = useUserStore((state) => state.updateFullProfile);

  const triedRecipes = useUserStore((state) => state.triedRecipes || []);
  const bookmarkedRecipes = triedRecipes.filter(r => r.isBookmark);

  const [modalVisible, setModalVisible] = useState(false);
  const [bookmarkListVisible, setBookmarkListVisible] = useState(false);

  const [tempAllergies, setTempAllergies] = useState([]);
  const [tempTools, setTempTools] = useState([]);
  const [tempTastes, setTempTastes] = useState({ spicy: 3, salty: 3, sweet: 3, bitter: 3, sour: 3, savory: 3 });

  const handleLogout = () => {
    clearUser();
    clearFridge();
    onLogout();
  };

  const openProfileModal = () => {
    setTempAllergies(userProfile.allergies || []);
    setTempTools(userProfile.kitchenTools || []);
    setTempTastes({
      spicy: userProfile.tastes?.spicy || 3, salty: userProfile.tastes?.salty || 3, sweet: userProfile.tastes?.sweet || 3,
      bitter: userProfile.tastes?.bitter || 3, sour: userProfile.tastes?.sour || 3, savory: userProfile.tastes?.savory || 3,
    });
    setModalVisible(true);
  };

  const toggleSelection = (item, list, setList) => {
    if (list.includes(item)) setList(list.filter((i) => i !== item));
    else setList([...list, item]);
  };

  const handleSaveProfile = async () => {
    try {
      await updateProfileAPI({
        allergies: tempAllergies,
        kitchenTools: tempTools,
        tastes: tempTastes
      });

      updateFullProfile({ allergies: tempAllergies, kitchenTools: tempTools, tastes: tempTastes });
      setModalVisible(false);

      if (Platform.OS === 'web') window.alert('업데이트 완료\n맞춤 설정이 안전하게 변경되었습니다!');
      else Alert.alert('업데이트 완료', '맞춤 설정이 안전하게 변경되었습니다!');
    } catch (error) {
      console.error(error);
      Alert.alert('통신 오류', '서버에 설정을 저장하지 못했습니다.');
    }
  };

  const allergyOptions = ['난류', '우유', '땅콩', '대두', '밀', '생선', '갑각류'];

  const renderAbsoluteScale = (type, label) => {
    const levels = [1, 2, 3, 4, 5];
    return (
      <View style={styles.feedbackRow}>
        <Text style={styles.feedbackLabel}>{label}</Text>
        <View style={styles.scaleGroup}>
          {levels.map((val) => (
            <TouchableOpacity key={val} style={[styles.scaleBtn, tempTastes[type] === val && styles.scaleBtnActive]} onPress={() => setTempTastes({ ...tempTastes, [type]: val })}>
              <Text style={[styles.scaleBtnText, tempTastes[type] === val && styles.scaleBtnTextActive]}>{val}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}><Text style={styles.headerTitle}>마이페이지</Text></View>
      <View style={styles.profileSection}>
        <View style={styles.avatar}><Ionicons name="person" size={40} color="#bdc3c7" /></View>
        <View style={styles.profileInfo}>
          <Text style={styles.userName}>{nickname} 님</Text>
          <Text style={styles.userEmail}>{email}</Text>
        </View>
      </View>

      <View style={styles.statsCard}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{ingredients.length}</Text>
          <Text style={styles.statLabel}>구출한 식재료</Text>
        </View>
        <View style={styles.separator} />
        <TouchableOpacity style={styles.statItem} onPress={() => setBookmarkListVisible(true)}>
          <Text style={styles.statNumber}>{bookmarkedRecipes.length}</Text>
          <Text style={styles.statLabel}>즐겨찾기 레시피</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.menuList}>
        <TouchableOpacity style={styles.menuItem} onPress={openProfileModal}>
          <View style={styles.menuLeft}>
            <Ionicons name="options-outline" size={24} color="#34495e" />
            <Text style={styles.menuText}>내 입맛 & 주방 설정</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#bdc3c7" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>로그아웃</Text>
        </TouchableOpacity>
      </View>

      <Modal animationType="slide" transparent={true} visible={bookmarkListVisible} onRequestClose={() => setBookmarkListVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '70%' }]}>
            <Text style={styles.modalTitle}>💛 내 즐겨찾기 레시피</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ width: '100%', paddingHorizontal: 10 }}>
              {bookmarkedRecipes.length > 0 ? (
                bookmarkedRecipes.map(r => (
                  <View key={r.id} style={styles.bookmarkItem}>
                    <Text style={styles.bookmarkName}>{r.name}</Text>
                    <Ionicons name="bookmark" size={24} color="#f1c40f" />
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>아직 즐겨찾기한 레시피가 없습니다.</Text>
              )}
            </ScrollView>

            {/* 💡 [수정] 닫기 버튼 크기 예쁘게 고정 */}
            <TouchableOpacity style={styles.bookmarkCloseBtn} onPress={() => setBookmarkListVisible(false)}>
              <Text style={styles.bookmarkCloseBtnText}>닫기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>맞춤 정보 설정</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ width: '100%' }}>
              <Text style={styles.sectionSubtitle}>⚠️ 알러지 정보</Text>
              <View style={styles.chipContainer}>
                {allergyOptions.map((item) => (
                  <TouchableOpacity key={item} style={[styles.chip, tempAllergies.includes(item) && styles.activeChip]} onPress={() => toggleSelection(item, tempAllergies, setTempAllergies)}>
                    <Text style={[styles.chipText, tempAllergies.includes(item) && styles.activeChipText]}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.sectionSubtitle}>🍳 주방 도구</Text>
              {Object.entries(toolCategories).map(([categoryName, tools]) => (
                <View key={categoryName} style={{ marginBottom: 15 }}>
                  <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#34495e', marginBottom: 8 }}>{categoryName}</Text>
                  <View style={styles.chipContainer}>
                    {tools.map((item) => (
                      <TouchableOpacity key={item} style={[styles.chip, tempTools.includes(item) && styles.activeChip]} onPress={() => toggleSelection(item, tempTools, setTempTools)}>
                        <Text style={[styles.chipText, tempTools.includes(item) && styles.activeChipText]}>{item}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))}

              <Text style={styles.sectionSubtitle}>😋 내 입맛 수동 조절 (1~5단계)</Text>
              <Text style={{ fontSize: 12, color: '#7f8c8d', marginBottom: 15 }}>* 레시피 평가를 통해서도 자동으로 변합니다.</Text>
              {renderAbsoluteScale('spicy', '🔥 매운맛 선호도')}
              {renderAbsoluteScale('salty', '🧂 짠맛 선호도')}
              {renderAbsoluteScale('sweet', '🍯 단맛 선호도')}
              {renderAbsoluteScale('bitter', '☕ 쓴맛 선호도')}
              {renderAbsoluteScale('sour', '🍋 신맛 선호도')}
              {renderAbsoluteScale('savory', '🥩 감칠맛 선호도')}
            </ScrollView>
            <View style={styles.modalButtonGroup}>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}><Text style={styles.closeBtnText}>취소</Text></TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleSaveProfile}><Text style={styles.submitBtnText}>저장하기</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa' },
  header: { padding: 20, paddingTop: 60, backgroundColor: '#fff' },
  headerTitle: { fontSize: 26, fontWeight: 'bold', color: '#2c3e50' },
  profileSection: { flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: '#fff', marginBottom: 15 },
  avatar: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#ecf0f1', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  profileInfo: { flex: 1 },
  userName: { fontSize: 20, fontWeight: 'bold', color: '#2c3e50', marginBottom: 5 },
  userEmail: { fontSize: 14, color: '#7f8c8d' },
  statsCard: { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 20, marginBottom: 20, padding: 20, borderRadius: 15, elevation: 2 },
  statItem: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: 24, fontWeight: 'bold', color: '#2ecc71', marginBottom: 5 },
  statLabel: { fontSize: 13, color: '#7f8c8d' },
  separator: { width: 1, backgroundColor: '#ecf0f1' },

  bookmarkItem: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#f8f9fa', padding: 18, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#eee' },
  bookmarkName: { fontSize: 16, fontWeight: '600', color: '#2c3e50' },
  emptyText: { textAlign: 'center', color: '#95a5a6', marginVertical: 30, fontSize: 15 },

  // 💡 버튼 크기 고정 스타일
  bookmarkCloseBtn: { width: '100%', backgroundColor: '#2ecc71', paddingVertical: 15, borderRadius: 12, alignItems: 'center', marginTop: 15 },
  bookmarkCloseBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  menuList: { backgroundColor: '#fff', paddingHorizontal: 20, paddingBottom: 40 },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: '#f1f2f6' },
  menuLeft: { flexDirection: 'row', alignItems: 'center' },
  menuText: { fontSize: 16, color: '#2c3e50', marginLeft: 15 },
  logoutBtn: { marginTop: 30, alignItems: 'center', padding: 15, backgroundColor: '#ffecec', borderRadius: 10 },
  logoutText: { color: '#e74c3c', fontWeight: 'bold', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: Platform.OS === 'web' ? 'center' : 'flex-end', alignItems: Platform.OS === 'web' ? 'center' : 'stretch' },
  modalContent: { width: '100%', maxWidth: Platform.OS === 'web' ? 400 : '100%', height: '85%', maxHeight: Platform.OS === 'web' ? 720 : '100%', backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, borderBottomLeftRadius: Platform.OS === 'web' ? 30 : 0, borderBottomRightRadius: Platform.OS === 'web' ? 30 : 0, padding: 25, alignItems: 'center' },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#2c3e50', marginBottom: 20, alignSelf: 'center' },
  sectionSubtitle: { fontSize: 16, fontWeight: 'bold', color: '#34495e', marginTop: 15, marginBottom: 10, alignSelf: 'flex-start' },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: '#f1f2f6', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20 },
  activeChip: { backgroundColor: '#2ecc71' },
  chipText: { color: '#7f8c8d', fontSize: 13, fontWeight: '500' },
  activeChipText: { color: '#fff', fontWeight: 'bold' },
  feedbackRow: { marginBottom: 15, width: '100%' },
  feedbackLabel: { fontSize: 14, fontWeight: 'bold', color: '#34495e', marginBottom: 8 },
  scaleGroup: { flexDirection: 'row', justifyContent: 'space-between' },
  scaleBtn: { flex: 1, backgroundColor: '#f1f2f6', paddingVertical: 10, marginHorizontal: 3, borderRadius: 8, alignItems: 'center' },
  scaleBtnActive: { backgroundColor: '#3498db' },
  scaleBtnText: { color: '#7f8c8d', fontSize: 14, fontWeight: 'bold' },
  scaleBtnTextActive: { color: '#fff' },
  modalButtonGroup: { flexDirection: 'row', width: '100%', marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderColor: '#eee' },
  closeBtn: { flex: 0.3, padding: 15, alignItems: 'center' },
  closeBtnText: { color: '#95a5a6', fontSize: 16, fontWeight: 'bold' },
  submitBtn: { flex: 0.7, backgroundColor: '#2ecc71', padding: 15, borderRadius: 12, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
