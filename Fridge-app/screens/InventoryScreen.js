import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

// Zustand 보관함 불러오기 (경로가 스크린 폴더 안이므로 '../store/useFridgeStore' 입니다)
import { useFridgeStore } from '../store/useFridgeStore';

// 카테고리 이름에 맞춰서 알맞은 아이콘(이모지)을 뱉어내는 함수
const getCategoryIcon = (category) => {
  switch (category) {
    case '신선식품': return '🥬'; 
    case '냉동식품': return '🧊'; 
    case '가공식품': return '🍪'; 
    case '음료수': return '🥤'; 
    case '소스': return '🥫'; 
    case '기타': return '📦'; 
    default: return '📦'; 
  }
};

export default function InventoryScreen() {
  
  //  보관함에서 데이터와 기능 꺼내오기
  const ingredients = useFridgeStore((state) => state.ingredients);
  const addIngredient = useFridgeStore((state) => state.addIngredient);
  const removeIngredient = useFridgeStore((state) => state.removeIngredient);

  // 입력창 상태 관리
  const [inputText, setInputText] = useState('');

  //  추가 버튼 누를 때 실행될 함수
  const handleAdd = () => {
    if (inputText.trim() === '') return;
    
    // 새 재료 객체 만들기 (아직 상세 입력 기능이 없으니 유통기한은 임시로 넣고, 제미나이 데이터 형식과 맞춥니다!)
    const newItem = {
      id: Date.now().toString(),
      name: inputText,
      amount: 1,         // quantity 대신 amount 사용
      unit: '개',        // 단위 추가
      category: '기타',  // 직접 추가하는 건 일단 '기타'로 분류
    };
    
    addIngredient(newItem);
    setInputText(''); // 입력창 비우기
  };

  // 리스트의 각 항목을 어떻게 보여줄지 정의하는 함수
  const renderItem = ({ item }) => (
    <View style={styles.card}>
      {/* 고정된 아이콘 대신 카테고리에 맞는 아이콘을 띄워줍니다 */}
      <Text style={styles.icon}>{getCategoryIcon(item.category)}</Text>
      
      <View style={styles.infoContainer}>
        <Text style={styles.name}>{item.name}</Text>
      </View>
      
      <View style={styles.badge}>
        <Text style={styles.badgeText}>
          {item.amount} {item.unit}
        </Text>
      </View>

      {/* 쓰레기통 아이콘(삭제 버튼) 추가 */}
      <TouchableOpacity 
        style={styles.deleteBtn} 
        onPress={() => removeIngredient(item.id)}
      >
        <Ionicons name="trash-outline" size={24} color="#ff7675" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* 상단 헤더 부분 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>마이 냉장고 식재료</Text>
      </View>

      {/* 재료 추가 입력창 */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="새로운 재료 입력 (예: 사과)"
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={handleAdd} // 엔터(완료) 누르면 추가 함수 실행
          returnKeyType="done"        // 키보드 엔터키를 '완료' 혹은 '체크' 모양으로 변경
        />
        <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
          <Text style={styles.addButtonText}>추가</Text>
        </TouchableOpacity>
      </View>

      {/* FlatList 컴포넌트 적용 */}
      <FlatList
        data={ingredients} // 💡 가짜 데이터 대신 Zustand의 진짜 데이터를 바라봅니다!
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        // 💡 데이터가 하나도 없을 때 보여줄 화면
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>냉장고가 텅 비었어요!{'\n'}위에 재료를 추가해보세요.</Text>
          </View>
        }
      />
    </View>
  );
}

// 스타일링
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 60, backgroundColor: '#fff' },
  headerTitle: { fontSize: 26, fontWeight: 'bold', color: '#2c3e50' },
  inputContainer: { flexDirection: 'row', padding: 15, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  input: { flex: 1, backgroundColor: '#f1f2f6', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 10, fontSize: 16, marginRight: 10 },
  addButton: { backgroundColor: '#2ecc71', justifyContent: 'center', paddingHorizontal: 20, borderRadius: 10 },
  addButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  listContainer: { padding: 15 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 15, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  icon: { fontSize: 35, marginRight: 15 },
  infoContainer: { flex: 1 },
  
  name: { fontSize: 18, fontWeight: '600' }, // 수량이 옆으로 빠졌으니 하단 여백(marginBottom) 제거
  
  badge: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: '#f1f2f6', marginRight: 10 },
  badgeText: { fontSize: 15, fontWeight: 'bold', color: '#2c3e50' },
  
  deleteBtn: { padding: 5 },
  emptyContainer: { marginTop: 50, alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#7f8c8d', textAlign: 'center', lineHeight: 24 }
});