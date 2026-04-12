import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useFridgeStore } from '../store/useFridgeStore'; // 냉장고 보관함 불러오기
import { useUserStore } from '../store/useUserStore';

export default function MyPageScreen({ onLogout }) {
  const [pushEnabled, setPushEnabled] = useState(true);

  // 유저 정보 가져오기
  const nickname = useUserStore((state) => state.nickname);
  const email = useUserStore((state) => state.email);
  // 💡 지우개 기능 가져오기
  const clearUser = useUserStore((state) => state.clearUser);

  // 냉장고 재료 개수 및 지우개 기능 가져오기
  const ingredients = useFridgeStore((state) => state.ingredients);
  const clearFridge = useFridgeStore((state) => state.clearFridge); // 💡 지우개 가져오기

  // 💡 로그아웃 버튼을 눌렀을 때 실행될 새로운 함수
  const handleLogout = () => {
    clearUser();   // 1. 내 이름/이메일 지우기
    clearFridge(); // 2. 내 냉장고 재료 지우기
    onLogout();    // 3. App.js에 신호를 보내서 로그인 화면으로 이동시키기
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
        <View style={styles.menuItem}>
          <View style={styles.menuLeft}>
            <Ionicons name="notifications-outline" size={24} color="#34495e" />
            <Text style={styles.menuText}>유통기한 임박 푸시 알림</Text>
          </View>
          <Switch 
            trackColor={{ false: "#767577", true: "#81b0ff" }}
            thumbColor={pushEnabled ? "#2ecc71" : "#f4f3f4"}
            onValueChange={() => setPushEnabled(!pushEnabled)}
            value={pushEnabled}
          />
        </View>
        
        {/* 💡 기존 onLogout 대신 handleLogout 실행 */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>로그아웃</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// 🎨 화면 예쁘게 꾸미는 스타일 설정
const styles = StyleSheet.create({
  // 전체 배경 스타일
  container: { flex: 1, backgroundColor: '#f5f6fa' },
  header: { padding: 20, paddingTop: 60, backgroundColor: '#fff' },
  headerTitle: { fontSize: 26, fontWeight: 'bold', color: '#2c3e50' },
  
  // 마이페이지 프로필 스타일
  profileSection: { flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: '#fff', marginBottom: 15 },
  avatar: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#ecf0f1', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  profileInfo: { flex: 1 },
  userName: { fontSize: 20, fontWeight: 'bold', color: '#2c3e50', marginBottom: 5 },
  userEmail: { fontSize: 14, color: '#7f8c8d' },
  
  // 통계 카드 스타일
  statsCard: { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 20, marginBottom: 20, padding: 20, borderRadius: 15, elevation: 2 },
  statItem: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: 24, fontWeight: 'bold', color: '#2ecc71', marginBottom: 5 },
  statLabel: { fontSize: 13, color: '#7f8c8d' },
  separator: { width: 1, backgroundColor: '#ecf0f1' },
  
  // 메뉴 리스트 스타일
  menuList: { backgroundColor: '#fff', paddingHorizontal: 20, paddingBottom: 40 },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: '#f1f2f6' },
  menuLeft: { flexDirection: 'row', alignItems: 'center' },
  menuText: { fontSize: 16, color: '#2c3e50', marginLeft: 15 },
  
  // 로그아웃 버튼 스타일
  logoutBtn: { marginTop: 30, alignItems: 'center', padding: 15, backgroundColor: '#ffecec', borderRadius: 10 },
  logoutText: { color: '#e74c3c', fontWeight: 'bold', fontSize: 16 }
});