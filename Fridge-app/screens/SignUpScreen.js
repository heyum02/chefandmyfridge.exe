import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useUserStore } from '../store/useUserStore';

export default function SignUpScreen({ onGoToLogin }) { // 💡 바로 가입되지 않도록 onSignUp 제거
  const [email, setEmail] = useState('');
  const [nickname, setNicknameInput] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // 💡 비밀번호 숨김/보임 상태 관리
  const [showPassword, setShowPassword] = useState(false);

  // 💡 보관함에서 데이터 저장 함수들 가져오기
  const saveNickname = useUserStore((state) => state.setNickname);
  const saveEmail = useUserStore((state) => state.setEmail);

  const handleRegister = () => {
    // 1. 이메일 유효성 검사 (@ 포함 여부)
    if (!email.includes('@')) {
      setErrorMessage('유효한 이메일 형식이 아닙니다 (@ 포함).');
      return;
    }

    // 2. 비밀번호 영문/숫자 조합 및 길이 검사
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    if (password.length < 8 || !hasLetter || !hasNumber) {
      setErrorMessage('비밀번호는 영문+숫자 포함 8자 이상이어야 합니다.');
      return;
    }

    // 3. 비밀번호 일치 검사
    if (password !== confirmPassword) {
      setErrorMessage('비밀번호가 서로 일치하지 않습니다.');
      return;
    }

    // 💡 모든 검사 통과 시 보관함에 데이터 저장
    saveNickname(nickname);
    saveEmail(email);

    Alert.alert('가입 완료', '성공적으로 가입되었습니다! 이제 로그인해주세요.', [
      { text: '확인', onPress: onGoToLogin } // 가입 후 로그인 화면으로 이동
    ]);
  };

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <TouchableOpacity style={styles.backButton} onPress={onGoToLogin}>
        <Ionicons name="arrow-back" size={28} color="#2c3e50" />
      </TouchableOpacity>

      <Text style={styles.title}>회원가입</Text>
      
      <View style={styles.inputBox}>
        <Text style={styles.label}>이메일</Text>
        <TextInput style={styles.input} placeholder="example@email.com" value={email} onChangeText={setEmail} />
        
        <Text style={styles.label}>닉네임</Text>
        <TextInput style={styles.input} placeholder="닉네임" value={nickname} onChangeText={setNicknameInput} />
        
        <Text style={styles.label}>비밀번호</Text>
        <View style={styles.passwordInputWrapper}>
          <TextInput 
            style={[styles.input, { flex: 1, marginBottom: 0 }]} 
            placeholder="비밀번호" 
            secureTextEntry={!showPassword} // 💡 상태에 따라 가림/보임
            value={password} 
            onChangeText={setPassword} 
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
            <Ionicons name={showPassword ? "eye-off" : "eye"} size={24} color="#bdc3c7" />
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>비밀번호 확인</Text>
        <TextInput style={styles.input} placeholder="비밀번호 확인" secureTextEntry={!showPassword} value={confirmPassword} onChangeText={setConfirmPassword} />

        {errorMessage !== '' && <Text style={styles.errorText}>{errorMessage}</Text>}
      </View>

      <TouchableOpacity style={styles.signupButton} onPress={handleRegister}>
        <Text style={styles.signupButtonText}>가입 완료하기</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#fff', padding: 30, paddingTop: 60 },
  backButton: { marginBottom: 20, alignSelf: 'flex-start' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#2c3e50', marginBottom: 30 },
  inputBox: { width: '100%', marginBottom: 30 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#34495e', marginBottom: 8 },
  input: { backgroundColor: '#f1f2f6', padding: 15, borderRadius: 10, marginBottom: 20, fontSize: 16 },
  passwordInputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f2f6', borderRadius: 10, marginBottom: 20 },
  eyeIcon: { paddingHorizontal: 15 },
  errorText: { color: '#e74c3c', fontSize: 14, fontWeight: 'bold', textAlign: 'center', marginTop: -10, marginBottom: 10 },
  signupButton: { width: '100%', backgroundColor: '#2ecc71', padding: 15, borderRadius: 10, alignItems: 'center' },
  signupButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});