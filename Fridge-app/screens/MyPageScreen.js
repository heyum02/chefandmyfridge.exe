import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// 💡 냉장고 보관함 불러오기
import { useFridgeStore } from '../store/useFridgeStore';
import { useUserStore } from '../store/useUserStore';

export default function MyPageScreen({ onLogout }) {
  // 유저 정보 가져오기
  const nickname = useUserStore((state) => state.nickname);
  const email = useUserStore((state) => state.email);
  // 💡 지우개 기능 가져오기
  const clearUser = useUserStore((state) => state.clearUser);

  // 냉장고 재료 개수 및 지우개 기능 가져오기
  const ingredients = useFridgeStore((state) => state.ingredients);
  const clearFridge = useFridgeStore((state) => state.clearFridge); // 💡 지우개 가져오기

  // 💡 프로필 관리용 상태 및 함수 가져오기
  const userProfile = useUserStore((state) => state.userProfile);
  const updateFullProfile = useUserStore((state) => state.updateFullProfile);

  // 💡 모달창 컨트롤 및 임시 저장소 (수정 중인 데이터)
  const [modalVisible, setModalVisible] = useState(false);
  const [tempAllergies, setTempAllergies] = useState([]);
  const [tempTools, setTempTools] = useState([]);
  const [tempTastes, setTempTastes] = useState({ spicy: 3, salty: 3, sweet: 3 });

  // 💡 로그아웃 버튼을 눌렀을 때 실행될 새로운 함수
  const handleLogout = () => {
    clearUser();   // 1. 내 이름/이메일 지우기
    clearFridge(); // 2. 내 냉장고 재료 지우기
    onLogout();    // 3. App.js에 신호를 보내서 로그인 화면으로 이동시키기
  };

  // 모달창 열 때 기존 데이터를 임시 저장소에 세팅하는 함수
  const openProfileModal = () => {
    setTempAllergies(userProfile.allergies);
    setTempTools(userProfile.kitchenTools);
    setTempTastes(userProfile.tastes);
    setModalVisible(true);
  };

  // 칩 선택/해제 토글 함수
  const toggleSelection = (item, list, setList) => {
    if (list.includes(item)) setList(list.filter((i) => i !== item));
    else setList([...list, item]);
  };

  // 변경사항 저장 함수
  const handleSaveProfile = () => {
    updateFullProfile({
      allergies: tempAllergies,
      kitchenTools: tempTools,
      tastes: tempTastes,
    });
    setModalVisible(false);
    Alert.alert('업데이트 완료', '맞춤 설정이 안전하게 변경되었습니다!');
  };

  const allergyOptions = ['난류', '우유', '땅콩', '대두', '밀', '생선', '갑각류'];
  const toolOptions = ['가스레인지', '인덕션', '전자레인지', '에어프라이어', '냄비', '프라이팬', '오븐', '믹서기'];

  // 1~5 절대 수치 평가용 버튼을 그려주는 함수
  const renderAbsoluteScale = (type, label) => {
    const levels = [1, 2, 3, 4, 5];
    return (
      <View style={styles.feedbackRow}>
        <Text style={styles.feedbackLabel}>{label}</Text>
        <View style={styles.scaleGroup}>
          {levels.map((val) => (
            <TouchableOpacity
              key={val}
              style={[styles.scaleBtn, tempTastes[type] === val && styles.scaleBtnActive]}
              onPress={() => setTempTastes({ ...tempTastes, [type]: val })}
            >
              <Text style={[styles.scaleBtnText, tempTastes[type] === val && styles.scaleBtnTextActive]}>{val}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* 1. 상단 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>마이페이지</Text>
      </View>

      {/* 2. 프로필 섹션 */}
      <View style={styles.profileSection}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={40} color="#bdc3c7" />
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.userName}>{nickname} 님</Text>
          <Text style={styles.userEmail}>{email}</Text> 
        </View>
      </View>

      {/* 3. 내 활동 요약 통계 카드 */}
      <View style={styles.statsCard}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{ingredients.length}</Text>
          <Text style={styles.statLabel}>구출한 식재료</Text>
        </View>
        <View style={styles.separator} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>5</Text>
          <Text style={styles.statLabel}>저장한 레시피</Text>
        </View>
      </View>

      {/* 4. 설정 메뉴 리스트 */}
      <View style={styles.menuList}>
        {/* 💡 내 맞춤 설정 관리 메뉴 */}
        <TouchableOpacity style={styles.menuItem} onPress={openProfileModal}>
          <View style={styles.menuLeft}>
            <Ionicons name="options-outline" size={24} color="#34495e" />
            <Text style={styles.menuText}>내 입맛 & 주방 설정</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#bdc3c7" />
        </TouchableOpacity>
        
        {/* 💡 로그아웃 버튼 */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>로그아웃</Text>
        </TouchableOpacity>
      </View>

      {/* 💡 맞춤 설정 수정 모달창 */}
      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>맞춤 정보 설정</Text>
            
            <ScrollView showsVerticalScrollIndicator={false} style={{ width: '100%' }}>
              {/* 알러지 수정 */}
              <Text style={styles.sectionSubtitle}>⚠️ 알러지 정보</Text>
              <View style={styles.chipContainer}>
                {allergyOptions.map((item) => (
                  <TouchableOpacity key={item} style={[styles.chip, tempAllergies.includes(item) && styles.activeChip]} onPress={() => toggleSelection(item, tempAllergies, setTempAllergies)}>
                    <Text style={[styles.chipText, tempAllergies.includes(item) && styles.activeChipText]}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* 주방 도구 수정 */}
              <Text style={styles.sectionSubtitle}>🍳 주방 도구</Text>
              <View style={styles.chipContainer}>
                {toolOptions.map((item) => (
                  <TouchableOpacity key={item} style={[styles.chip, tempTools.includes(item) && styles.activeChip]} onPress={() => toggleSelection(item, tempTools, setTempTools)}>
                    <Text style={[styles.chipText, tempTools.includes(item) && styles.activeChipText]}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* 식성 절대 수치 수정 (1~5) */}
              <Text style={styles.sectionSubtitle}>😋 내 입맛 수동 조절 (1~5단계)</Text>
              <Text style={{ fontSize: 12, color: '#7f8c8d', marginBottom: 15 }}>* 레시피 평가를 통해서도 자동으로 변합니다.</Text>
              {renderAbsoluteScale('spicy', '🔥 매운맛 선호도')}
              {renderAbsoluteScale('salty', '🧂 짠맛 선호도')}
              {renderAbsoluteScale('sweet', '🍯 단맛 선호도')}
            </ScrollView>

            <View style={styles.modalButtonGroup}>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.closeBtnText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleSaveProfile}>
                <Text style={styles.submitBtnText}>저장하기</Text>
              </TouchableOpacity>
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
  menuList: { backgroundColor: '#fff', paddingHorizontal: 20, paddingBottom: 40 },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: '#f1f2f6' },
  menuLeft: { flexDirection: 'row', alignItems: 'center' },
  menuText: { fontSize: 16, color: '#2c3e50', marginLeft: 15 },
  logoutBtn: { marginTop: 30, alignItems: 'center', padding: 15, backgroundColor: '#ffecec', borderRadius: 10 },
  logoutText: { color: '#e74c3c', fontWeight: 'bold', fontSize: 16 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { width: '100%', height: '85%', backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, alignItems: 'flex-start' },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#2c3e50', marginBottom: 20, alignSelf: 'center' },
  sectionSubtitle: { fontSize: 16, fontWeight: 'bold', color: '#34495e', marginTop: 15, marginBottom: 10 },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
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