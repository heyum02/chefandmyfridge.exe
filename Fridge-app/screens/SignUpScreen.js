import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useUserStore } from '../store/useUserStore';

const toolCategories = {
  "🔥 가열 기구": ["가스레인지", "인덕션", "오븐", "전자레인지", "에어프라이어", "밥솥", "전기팬", "전기밥솥", "토치"],
  "🍳 팬/냄비": ["냄비", "프라이팬", "주물팬", "달걀말이팬", "오븐팬", "베이킹팬", "머핀팬", "와플팬", "쿠킹팬"],
  "🔪 조리 도구": ["도마", "칼", "가위", "조리용나이프", "조리용스푼", "조리주걱", "스푼", "주걱", "국자", "집게", "거품기", "주방용스패츌라"],
  "🥣 볼/채반": ["볼", "믹싱볼", "채반", "채망", "거름망", "식힘망"],
  "🔌 가전 기기": ["믹서기", "블렌더", "핸드믹서", "핸드블렌더", "전자저울"],
  "🍽️ 식기/기타": ["그릇", "접시", "플레이트", "컵", "병", "포크", "트레이", "키친타올", "장갑", "주방솔", "랩", "포장지"]
};

export default function SignUpScreen({ onGoToLogin }) {
  const [email, setEmail] = useState('');
  const [nickname, setNicknameInput] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  // 💡 비밀번호와 비밀번호 확인을 각각 제어하기 위한 상태
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const saveEmail = useUserStore((state) => state.setEmail);
  const saveNickname = useUserStore((state) => state.setNickname);
  const setInitialProfile = useUserStore((state) => state.setInitialProfile);

  const [selectedAllergies, setSelectedAllergies] = useState([]);
  const [selectedTools, setSelectedTools] = useState([]);
  const allergyOptions = ['난류', '우유', '땅콩', '대두', '밀', '생선'];

  const toggleSelection = (item, list, setList) => {
    if (list.includes(item)) setList(list.filter((i) => i !== item));
    else setList([...list, item]);
  };

  const handleRegister = () => {
    if (!email || !nickname || !password || !confirmPassword) { setErrorMessage('모든 항목을 빠짐없이 입력해주세요.'); return; }
    if (!email.includes('@')) { setErrorMessage('유효한 이메일 형식이 아닙니다.'); return; }
    if (password !== confirmPassword) { setErrorMessage('비밀번호가 서로 일치하지 않습니다.'); return; }

    saveEmail(email);
    saveNickname(nickname);
    setInitialProfile({
      allergies: selectedAllergies,
      kitchenTools: selectedTools,
      tastes: { spicy: 3, salty: 3, sweet: 3, bitter: 3, sour: 3, savory: 3 } 
    });

    if (Platform.OS === 'web') {
      window.alert(`가입 완료 🎉\n${nickname}님 환영합니다!`);
      onGoToLogin(); 
    } else {
      Alert.alert('가입 완료 🎉', `${nickname}님 환영합니다!`, [{ text: '확인', onPress: onGoToLogin }]);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <TouchableOpacity style={styles.backButton} onPress={onGoToLogin}>
        <Ionicons name="arrow-back" size={28} color="#2c3e50" />
      </TouchableOpacity>
      <Text style={styles.title}>회원가입</Text>
      
      <View style={styles.inputBox}>
        <Text style={styles.label}>이메일</Text>
        <TextInput style={styles.input} placeholder="example@email.com" keyboardType="email-address" value={email} onChangeText={setEmail} />
        
        <Text style={styles.label}>닉네임</Text>
        <TextInput style={styles.input} placeholder="사용하실 닉네임을 입력해주세요" value={nickname} onChangeText={setNicknameInput} />
        
        <Text style={styles.label}>비밀번호</Text>
        <View style={styles.passwordInputWrapper}>
          <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} placeholder="8자리 이상 영문, 숫자 조합" secureTextEntry={!showPassword} value={password} onChangeText={setPassword} />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
            <Ionicons name={showPassword ? "eye-off" : "eye"} size={24} color="#bdc3c7" />
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>비밀번호 확인</Text>
        {/* 💡 비밀번호 확인 칸에도 눈 아이콘 추가 */}
        <View style={styles.passwordInputWrapper}>
          <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} placeholder="비밀번호를 다시 입력해주세요" secureTextEntry={!showConfirmPassword} value={confirmPassword} onChangeText={setConfirmPassword} />
          <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
            <Ionicons name={showConfirmPassword ? "eye-off" : "eye"} size={24} color="#bdc3c7" />
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>🍽️ 나만의 맞춤 설정</Text>
        
        <Text style={styles.subLabel}>못 먹는 식재료 (알러지)</Text>
        <View style={styles.chipContainer}>
          {allergyOptions.map((item) => (
            <TouchableOpacity key={item} style={[styles.chip, selectedAllergies.includes(item) && styles.activeChip]} onPress={() => toggleSelection(item, selectedAllergies, setSelectedAllergies)}>
              <Text style={[styles.chipText, selectedAllergies.includes(item) && styles.activeChipText]}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 💡 여백이 조정된 주방 도구 라벨 */}
        <Text style={styles.toolLabel}>우리 집 주방 도구</Text>
        {Object.entries(toolCategories).map(([categoryName, tools]) => (
          <View key={categoryName} style={{ marginBottom: 15 }}>
            <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#34495e', marginBottom: 8 }}>{categoryName}</Text>
            <View style={styles.chipContainer}>
              {tools.map((item) => (
                <TouchableOpacity key={item} style={[styles.chip, selectedTools.includes(item) && styles.activeChip]} onPress={() => toggleSelection(item, selectedTools, setSelectedTools)}>
                  <Text style={[styles.chipText, selectedTools.includes(item) && styles.activeChipText]}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {errorMessage !== '' && <Text style={styles.errorText}>{errorMessage}</Text>}
      </View>

      <TouchableOpacity style={styles.signupButton} onPress={handleRegister}>
        <Text style={styles.signupButtonText}>가입 완료하기</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#fff', padding: 30, paddingTop: 60, paddingBottom: 50 },
  backButton: { marginBottom: 20, alignSelf: 'flex-start' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#2c3e50', marginBottom: 25 },
  inputBox: { width: '100%', marginBottom: 10 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#34495e', marginBottom: 8 },
  input: { backgroundColor: '#f1f2f6', padding: 15, borderRadius: 10, marginBottom: 20, fontSize: 16 },
  passwordInputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f2f6', borderRadius: 10, marginBottom: 20 },
  eyeIcon: { paddingHorizontal: 15 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#2ecc71', marginTop: 10, marginBottom: 20, borderTopWidth: 1, borderTopColor: '#f1f2f6', paddingTop: 20 },
  subLabel: { fontSize: 15, fontWeight: 'bold', color: '#7f8c8d', marginBottom: 10 },
  
  // 💡 주방 도구 라벨 전용 스타일 (위아래 여백 추가)
  toolLabel: { fontSize: 15, fontWeight: 'bold', color: '#7f8c8d', marginTop: 25, marginBottom: 15 },
  
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: '#f1f2f6', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: '#ecf0f1' },
  activeChip: { backgroundColor: '#2ecc71', borderColor: '#2ecc71' },
  chipText: { color: '#7f8c8d', fontSize: 14, fontWeight: '500' },
  activeChipText: { color: '#fff', fontWeight: 'bold' },
  errorText: { color: '#e74c3c', fontSize: 14, fontWeight: 'bold', textAlign: 'center', marginTop: 10, marginBottom: 10 },
  signupButton: { width: '100%', backgroundColor: '#2ecc71', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  signupButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});