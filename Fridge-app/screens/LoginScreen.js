import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useState } from 'react';
import { Alert, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function LoginScreen({ onLogin, onGoToSignUp }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isAutoLogin, setIsAutoLogin] = useState(false);
  
  // 💡 [추가됨] 비밀번호 보이기/숨기기 상태 관리
  const [showPassword, setShowPassword] = useState(false);

  const handleLoginAttempt = async () => {
    // 1. 빈칸 검사
    if (!email.includes('@')) { setErrorMessage('올바른 이메일 형식을 입력해주세요.'); return; }
    if (password.length < 1) { setErrorMessage('비밀번호를 입력해주세요.'); return; }
    setErrorMessage(''); 

    // 2. 서버 연결 테스트
    try {
      const backendUrl = 'https://twelve-forks-run.loca.lt'; 
      const response = await axios.get(backendUrl, { headers: { "Bypass-Tunnel-Reminder": "true" } });
      
      // 진짜로 완벽하게 200 OK 성공했을 때!
      Alert.alert('연결 성공', '서버와 완벽하게 연결되었습니다!', [{ text: '확인', onPress: () => onLogin() }]);
      
    } catch (error) {
      // 💡 질문자님의 날카로운 지적 반영! (503 에러는 실패로 처리)
      if (error.response && error.response.status === 503) {
        Alert.alert(
          '서버 점검 중', 
          '현재 백엔드 서버가 꺼져 있습니다. (상태코드: 503)\n\n디자인(UI) 확인을 위해 강제로 입장하시겠습니까?',
          [
            { text: '취소', style: 'cancel' },
            { text: '강제 입장하기', onPress: () => onLogin() } // 💡 강제 입장 버튼!
          ]
        );
      } else if (error.response) {
        Alert.alert('통신 에러', `서버에서 에러를 반환했습니다.\n(상태코드: ${error.response.status})`);
      } else {
        Alert.alert('연결 실패', '서버에 도달하지 못했습니다. 인터넷 연결이나 주소를 확인해주세요.');
      }
    }
  };

  return (
    <View style={styles.container}>
      {/* source={require('파일경로')} 로 이미지 파일을 가져옵니다. */}
      <Image 
        source={require('../assets/app-logo2.png')} // assets 폴더 안에 넣은 파일명과 똑같이 써주세요!
        style={styles.logoImage} // 이미지를 크기를 조절하는 스타일을 아래에 추가했습니다.
      />
      
      <View style={styles.inputBox}>
        <TextInput 
          style={styles.input} 
          placeholder="이메일" 
          keyboardType="email-address" 
          value={email} 
          onChangeText={setEmail} 
        />
        
        {/* 💡 [수정됨] 로그인 비밀번호 칸 눈 아이콘 추가 */}
        <View style={styles.passwordWrapper}>
          <TextInput 
            style={[styles.input, { flex: 1, marginBottom: 0 }]} 
            placeholder="비밀번호" 
            secureTextEntry={!showPassword} // 상태에 따라 글씨가 보이거나 숨겨짐
            value={password} 
            onChangeText={setPassword} 
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
            <Ionicons name={showPassword ? "eye-off" : "eye"} size={24} color="#bdc3c7" />
          </TouchableOpacity>
        </View>

        {errorMessage !== '' ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
      </View>

      <View style={styles.optionsContainer}>
        <TouchableOpacity style={styles.checkboxContainer} onPress={() => setIsAutoLogin(!isAutoLogin)}>
          <Ionicons name={isAutoLogin ? "checkbox" : "square-outline"} size={24} color={isAutoLogin ? "#2ecc71" : "#bdc3c7"} />
          <Text style={styles.checkboxText}>자동 로그인</Text>
        </TouchableOpacity>
        <TouchableOpacity><Text style={styles.findPasswordText}>비밀번호 찾기</Text></TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.loginButton} onPress={handleLoginAttempt}>
        <Text style={styles.loginButtonText}>로그인</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.signupButton} onPress={onGoToSignUp}>
        <Text style={styles.signupButtonText}>회원가입하러 가기</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', padding: 30 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#2c3e50', marginBottom: 40 },
  
  // 💡 [추가됨] 로고 이미지 크기를 예쁘게 조절하는 스타일
  logoImage: { 
    width: 150,       // 로고 가로 크기
    height: 150,      // 로고 세로 크기
    resizeMode: 'contain', // 이미지가 잘리거나 찌그러지지 않고 네모 박스 안에 쏙 들어가게 함
    marginBottom: 20  // 로고 아래 타이틀(SnapCook)과의 간격
  },
  
  inputBox: { width: '100%', marginBottom: 15 },
  input: { backgroundColor: '#f1f2f6', padding: 15, borderRadius: 10, marginBottom: 10, fontSize: 16 },
  
  // 💡 [추가됨] 비밀번호 눈 아이콘을 위한 래퍼 및 아이콘 스타일
  passwordWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f2f6', borderRadius: 10, marginBottom: 10 },
  eyeIcon: { paddingHorizontal: 15 },

  errorText: { color: '#e74c3c', fontSize: 13, textAlign: 'center', marginBottom: 10, fontWeight: 'bold' },
  optionsContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 25, paddingHorizontal: 5 },
  checkboxContainer: { flexDirection: 'row', alignItems: 'center' },
  checkboxText: { marginLeft: 8, fontSize: 14, color: '#34495e' },
  findPasswordText: { fontSize: 14, color: '#7f8c8d', textDecorationLine: 'underline' },
  loginButton: { width: '100%', backgroundColor: '#2ecc71', padding: 15, borderRadius: 10, alignItems: 'center', marginBottom: 15 },
  loginButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  signupButton: { padding: 10 },
  signupButtonText: { color: '#7f8c8d', textDecorationLine: 'underline' },
});