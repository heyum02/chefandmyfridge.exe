import { useState } from 'react';
import { Button, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

// 💡 아까 만든 중앙 보관함 불러오기!
import { useFridgeStore } from './store/useFridgeStore';

export default function App() {
  // 1. 보관함에서 데이터(재료 목록)와 기능(넣기, 빼기) 꺼내오기
  const ingredients = useFridgeStore((state) => state.ingredients);
  const addIngredient = useFridgeStore((state) => state.addIngredient);
  const removeIngredient = useFridgeStore((state) => state.removeIngredient);

  // 2. 사용자가 키보드로 입력할 글자를 임시로 저장할 공간
  const [inputText, setInputText] = useState('');

  // 3. '넣기' 버튼을 눌렀을 때 실행될 작전
  const handleAdd = () => {
    if (inputText.trim() === '') return; // 빈칸이면 무시
    
    // 보관함에 새 재료(id와 이름) 넣기
    addIngredient({ id: Date.now().toString(), name: inputText });
    setInputText(''); // 다 넣었으면 입력창 비워주기
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>❄️ 나의 냉장고 ❄️</Text>

      {/* 새 재료 입력하는 곳 */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="새로운 재료 입력 (예: 양파)"
          value={inputText}
          onChangeText={setInputText}
        />
        <Button title="넣기" onPress={handleAdd} />
      </View>

      {/* 냉장고에 있는 재료들 리스트 쫙 보여주기 */}
      <FlatList
        data={ingredients}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.itemRow}>
            <Text style={styles.itemText}>{item.name}</Text>
            {/* 빼기 버튼 누르면 보관함에서 삭제! */}
            <TouchableOpacity onPress={() => removeIngredient(item.id)}>
              <Text style={styles.deleteBtn}>[다 먹음]</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

// 🎨 화면 예쁘게 꾸미는 스타일 설정
const styles = StyleSheet.create({
  container: { flex: 1, padding: 50, backgroundColor: '#f0f8ff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#333' },
  inputContainer: { flexDirection: 'row', marginBottom: 20 },
  input: { flex: 1, borderWidth: 1, borderColor: '#ccc', padding: 10, marginRight: 10, borderRadius: 8, backgroundColor: 'white' },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, backgroundColor: 'white', borderBottomWidth: 1, borderColor: '#eee', marginBottom: 8, borderRadius: 8 },
  itemText: { fontSize: 18, fontWeight: '500' },
  deleteBtn: { color: '#ff6347', fontWeight: 'bold', fontSize: 16 }
});