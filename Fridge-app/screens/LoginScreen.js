import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function LoginScreen({ onLogin, onGoToSignUp }) {
  // 💡 사용자가 입력하는 이메일과 비밀번호 상태 관리
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // 💡 새로 추가된 기능: 자동 로그인 체크박스 상태 관리 (기본값은 해제 상태인 false)
  const [isAutoLogin, setIsAutoLogin] = useState(false);

  const handleLoginAttempt = () => {
    // 💡 로그인 버튼을 눌렀을 때 실행되는 프론트엔드 점검 로직
    if (!email.includes('@')) {
      setErrorMessage('올바른 이메일 형식을 입력해주세요.');
      return;
    }
    if (password.length < 1) {
      setErrorMessage('비밀번호를 입력해주세요.');
      return;
    }
    
    // 점검 통과 시 에러 메시지 초기화
    setErrorMessage(''); 

    // 💡 나중(7주 차)에는 여기서 백엔드로 이메일, 비밀번호, 그리고 isAutoLogin(자동로그인 여부) 값을 보냅니다!
    // 지금은 무조건 로그인 성공 처리 후 App.js로 신호 보냄
    onLogin(); 
  };

  return (
    <View style={styles.container}>
      {/* 상단 로고 및 타이틀 */}
      <Ionicons name="leaf-outline" size={80} color="#2ecc71" style={{ marginBottom: 20 }} />
      <Text style={styles.title}>마이 냉장고</Text>

      {/* 입력창 영역 */}
      <View style={styles.inputBox}>
        <TextInput 
          style={styles.input} 
          placeholder="이메일" 
          keyboardType="email-address"
          value={email} 
          onChangeText={setEmail} 
        />
        <TextInput 
          style={styles.input} 
          placeholder="비밀번호" 
          secureTextEntry 
          value={password} 
          onChangeText={setPassword} 
        />
        
        {/* 에러 메시지 출력 영역 */}
        {errorMessage !== '' && <Text style={styles.errorText}>{errorMessage}</Text>}
      </View>

      {/* 💡 새로 추가된 영역: 자동 로그인 체크박스 */}
      <View style={styles.optionsContainer}>
        <TouchableOpacity 
          style={styles.checkboxContainer} 
          // 💡 누를 때마다 true <-> false 가 뒤집히도록 설정
          onPress={() => setIsAutoLogin(!isAutoLogin)}
        >
          {/* 상태에 따라 체크된 아이콘과 빈 네모 아이콘을 번갈아 보여줌 */}
          <Ionicons 
            name={isAutoLogin ? "checkbox" : "square-outline"} 
            size={24} 
            color={isAutoLogin ? "#2ecc71" : "#bdc3c7"} 
          />
          <Text style={styles.checkboxText}>자동 로그인</Text>
        </TouchableOpacity>
        
        {/* 오른쪽엔 나중을 위한 비밀번호 찾기 버튼 (뼈대만) */}
        <TouchableOpacity>
          <Text style={styles.findPasswordText}>비밀번호 찾기</Text>
        </TouchableOpacity>
      </View>

      {/* 로그인 버튼 */}
      <TouchableOpacity style={styles.loginButton} onPress={handleLoginAttempt}>
        <Text style={styles.loginButtonText}>로그인</Text>
      </TouchableOpacity>
      
      {/* 회원가입 화면으로 이동하는 버튼 */}
      <TouchableOpacity style={styles.signupButton} onPress={onGoToSignUp}>
        <Text style={styles.signupButtonText}>회원가입하러 가기</Text>
      </TouchableOpacity>
    </View>
  );
}

// 🎨 화면 스타일링
const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', padding: 30 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#2c3e50', marginBottom: 40 },
  
  // 입력창 스타일
  inputBox: { width: '100%', marginBottom: 15 }, // 간격을 살짝 줄임
  input: { backgroundColor: '#f1f2f6', padding: 15, borderRadius: 10, marginBottom: 10, fontSize: 16 },
  errorText: { color: '#e74c3c', fontSize: 13, textAlign: 'center', marginBottom: 5 },
   
  // 💡 체크박스 및 옵션 영역 스타일
  optionsContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    width: '100%', 
    marginBottom: 25,
    paddingHorizontal: 5
  },
  checkboxContainer: { flexDirection: 'row', alignItems: 'center' },
  checkboxText: { marginLeft: 8, fontSize: 14, color: '#34495e' },
  findPasswordText: { fontSize: 14, color: '#7f8c8d', textDecorationLine: 'underline' },
  
  // 버튼 스타일
  loginButton: { width: '100%', backgroundColor: '#2ecc71', padding: 15, borderRadius: 10, alignItems: 'center', marginBottom: 15 },
  loginButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  signupButton: { padding: 10 },
  signupButtonText: { color: '#7f8c8d', textDecorationLine: 'underline' },
});