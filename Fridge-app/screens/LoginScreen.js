import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

// 로그인 API와 유저 정보를 저장할 스토어를 가져옴
import { loginAPI } from '../services/api';
import { useUserStore } from '../store/useUserStore';

export default function LoginScreen({ onLogin, onGoToSignUp }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isAutoLogin, setIsAutoLogin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // 전역 상태에 저장할 준비
  const setNickname = useUserStore((state) => state.setNickname);
  const saveEmail = useUserStore((state) => state.setEmail);
  const updateFullProfile = useUserStore((state) => state.updateFullProfile);

  const handleLoginAttempt = async () => {
    if (!email.includes('@')) { setErrorMessage('올바른 이메일 형식을 입력해주세요.'); return; }
    if (password.length < 1) { setErrorMessage('비밀번호를 입력해주세요.'); return; }
    setErrorMessage('');

    try {
      // 진짜 백엔드 로그인 API를 호출
      const response = await loginAPI({ email, password });
      const data = response.data;

      // 로그인 성공 시, 서버가 준 내 알러지/입맛/도구 정보를 스토어에 깔아줌
      setNickname(data.nickname);
      saveEmail(email);
      updateFullProfile({
        allergies: data.allergies || [],
        kitchenTools: data.kitchenTools || [],
        tastes: data.tastes || { spicy: 3, salty: 3, sweet: 3, bitter: 3, sour: 3, savory: 3 }
      });

      onLogin(); // 메인 화면으로 이동

    } catch (error) {
      if (error.response && error.response.status === 401) {
        setErrorMessage('이메일이나 비밀번호가 일치하지 않습니다.');
      } else {
        // 서버가 꺼져있을 때 테스트를 위한 임시 방어막 유지
        Alert.alert(
          '연결 실패',
          '서버에 도달하지 못했습니다. 서버가 켜져 있는지 확인해주세요.\n\n오프라인 모드로 강제 입장하시겠습니까?',
          [
            { text: '취소', style: 'cancel' },
            { text: '강제 입장하기', onPress: () => onLogin() }
          ]
        );
      }
    }
  };

  return (
    <View style={styles.container}>
      <Image source={require('../assets/app-logo2.png')} style={styles.logoImage} />
      <View style={styles.inputBox}>
        <TextInput style={styles.input} placeholder="이메일" keyboardType="email-address" value={email} onChangeText={setEmail} autoCapitalize="none" />
        <View style={styles.passwordWrapper}>
          <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} placeholder="비밀번호" secureTextEntry={!showPassword} value={password} onChangeText={setPassword} />
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
      <TouchableOpacity style={styles.loginButton} onPress={handleLoginAttempt}><Text style={styles.loginButtonText}>로그인</Text></TouchableOpacity>
      <TouchableOpacity style={styles.signupButton} onPress={onGoToSignUp}><Text style={styles.signupButtonText}>회원가입하러 가기</Text></TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', padding: 30 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#2c3e50', marginBottom: 40 },
  logoImage: { width: 150, height: 150, resizeMode: 'contain', marginBottom: 20 },
  inputBox: { width: '100%', marginBottom: 15 },
  input: { backgroundColor: '#f1f2f6', padding: 15, borderRadius: 10, marginBottom: 10, fontSize: 16 },
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
