import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useUserStore } from '../store/useUserStore';

export default function SignUpScreen({ onGoToLogin }) {
  // 💡 1. 입력창 상태 관리
  const [email, setEmail] = useState('');
  const [nickname, setNicknameInput] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  // 비밀번호 숨김/보임 상태
  const [showPassword, setShowPassword] = useState(false);

  // 💡 2. 보관함(Zustand)에서 정보 저장 함수 가져오기
  const saveEmail = useUserStore((state) => state.setEmail);
  const saveNickname = useUserStore((state) => state.setNickname);
  const setInitialProfile = useUserStore((state) => state.setInitialProfile);

  // 💡 3. 알러지 및 주방 도구 선택 상태 (여러 개 선택 가능하도록 배열 사용)
  const [selectedAllergies, setSelectedAllergies] = useState([]);
  const [selectedTools, setSelectedTools] = useState([]);

  // 선택지 목록
  const allergyOptions = ['난류', '우유', '땅콩', '대두', '밀', '생선'];
  const toolOptions = ['가스레인지', '인덕션', '전자레인지', '에어프라이어', '냄비', '프라이팬', '오븐', '믹서기'];

  // 💡 버튼을 누를 때마다 선택/해제 해주는 마법의 함수
  const toggleSelection = (item, list, setList) => {
    if (list.includes(item)) {
      setList(list.filter((i) => i !== item)); // 이미 있으면 뺌
    } else {
      setList([...list, item]); // 없으면 넣음
    }
  };

  // 💡 4. 가입 완료 버튼을 눌렀을 때 실행되는 함수
  const handleRegister = () => {
    // 빈칸 검사
    if (!email || !nickname || !password || !confirmPassword) {
      setErrorMessage('모든 항목을 빠짐없이 입력해주세요.');
      return;
    }
    // 이메일 형식 검사
    if (!email.includes('@')) {
      setErrorMessage('유효한 이메일 형식이 아닙니다 (@ 포함).');
      return;
    }
    // 비밀번호 규칙 검사
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    if (password.length < 8 || !hasLetter || !hasNumber) {
      setErrorMessage('비밀번호는 영문+숫자 포함 8자 이상이어야 합니다.');
      return;
    }
    // 비밀번호 일치 검사
    if (password !== confirmPassword) {
      setErrorMessage('비밀번호가 서로 일치하지 않습니다.');
      return;
    }

    setErrorMessage(''); // 에러 메시지 초기화

    // 💡 모든 검사를 통과하면 보관함에 데이터 저장!
    saveEmail(email);
    saveNickname(nickname);
    setInitialProfile({
      allergies: selectedAllergies,
      kitchenTools: selectedTools,
      tastes: { spicy: 3, salty: 3, sweet: 3 } // 식성 초기값은 '보통(3)'으로 셋팅
    });

    Alert.alert('가입 완료 🎉', `${nickname}님의 입맛과 주방 환경을 완벽하게 기억했습니다! 이제 로그인해주세요.`, [
      { text: '확인', onPress: onGoToLogin }
    ]);
  };

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      {/* 뒤로 가기 버튼 */}
      <TouchableOpacity style={styles.backButton} onPress={onGoToLogin}>
        <Ionicons name="arrow-back" size={28} color="#2c3e50" />
      </TouchableOpacity>

      <Text style={styles.title}>회원가입</Text>
      
      <View style={styles.inputBox}>
        {/* 기본 정보 입력란 */}
        <Text style={styles.label}>이메일</Text>
        <TextInput style={styles.input} placeholder="example@email.com" keyboardType="email-address" value={email} onChangeText={setEmail} />
        
        <Text style={styles.label}>닉네임</Text>
        <TextInput style={styles.input} placeholder="사용하실 닉네임을 입력해주세요" value={nickname} onChangeText={setNicknameInput} />
        
        <Text style={styles.label}>비밀번호</Text>
        <View style={styles.passwordInputWrapper}>
          <TextInput 
            style={[styles.input, { flex: 1, marginBottom: 0 }]} 
            placeholder="8자리 이상 영문, 숫자 조합" 
            secureTextEntry={!showPassword} 
            value={password} 
            onChangeText={setPassword} 
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
            <Ionicons name={showPassword ? "eye-off" : "eye"} size={24} color="#bdc3c7" />
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>비밀번호 확인</Text>
        <TextInput style={styles.input} placeholder="비밀번호를 다시 입력해주세요" secureTextEntry={!showPassword} value={confirmPassword} onChangeText={setConfirmPassword} />

        {/* 💡 새로 추가된 맞춤형 정보 설정 영역 */}
        <Text style={styles.sectionTitle}>🍽️ 나만의 맞춤 설정</Text>

        <Text style={{ fontSize: 13, color: '#e74c3c', marginBottom: 15, fontWeight: 'bold' }}>
          이 설정은 가입 후 마이페이지에서 언제든지 변경할 수 있습니다
        </Text>
        
        {/* 알러지 선택 */}
        <Text style={styles.subLabel}>못 먹는 식재료 (알러지)</Text>
        <View style={styles.chipContainer}>
          {allergyOptions.map((item) => (
            <TouchableOpacity 
              key={item} 
              style={[styles.chip, selectedAllergies.includes(item) && styles.activeChip]}
              onPress={() => toggleSelection(item, selectedAllergies, setSelectedAllergies)}
            >
              <Text style={[styles.chipText, selectedAllergies.includes(item) && styles.activeChipText]}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 주방 도구 선택 */}
        <Text style={styles.subLabel}>우리 집 주방 도구</Text>
        <View style={styles.chipContainer}>
          {toolOptions.map((item) => (
            <TouchableOpacity 
              key={item} 
              style={[styles.chip, selectedTools.includes(item) && styles.activeChip]}
              onPress={() => toggleSelection(item, selectedTools, setSelectedTools)}
            >
              <Text style={[styles.chipText, selectedTools.includes(item) && styles.activeChipText]}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 에러 메시지 출력 */}
        {errorMessage !== '' && <Text style={styles.errorText}>{errorMessage}</Text>}
      </View>

      <TouchableOpacity style={styles.signupButton} onPress={handleRegister}>
        <Text style={styles.signupButtonText}>가입 완료하기</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// 🎨 스타일 설정
const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#fff', padding: 30, paddingTop: 60, paddingBottom: 50 },
  backButton: { marginBottom: 20, alignSelf: 'flex-start' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#2c3e50', marginBottom: 25 },
  inputBox: { width: '100%', marginBottom: 10 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#34495e', marginBottom: 8 },
  input: { backgroundColor: '#f1f2f6', padding: 15, borderRadius: 10, marginBottom: 20, fontSize: 16 },
  passwordInputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f2f6', borderRadius: 10, marginBottom: 20 },
  eyeIcon: { paddingHorizontal: 15 },
  
  // 💡 맞춤 설정 영역 스타일
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#2ecc71', marginTop: 10, marginBottom: 15, borderTopWidth: 1, borderTopColor: '#f1f2f6', paddingTop: 20 },
  subLabel: { fontSize: 13, fontWeight: '600', color: '#7f8c8d', marginBottom: 10 },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20, gap: 8 },
  chip: { backgroundColor: '#f1f2f6', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: '#ecf0f1' },
  activeChip: { backgroundColor: '#2ecc71', borderColor: '#2ecc71' },
  chipText: { color: '#7f8c8d', fontSize: 14, fontWeight: '500' },
  activeChipText: { color: '#fff', fontWeight: 'bold' },

  errorText: { color: '#e74c3c', fontSize: 14, fontWeight: 'bold', textAlign: 'center', marginTop: 10, marginBottom: 10 },
  signupButton: { width: '100%', backgroundColor: '#2ecc71', padding: 16, borderRadius: 12, alignItems: 'center' },
  signupButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});