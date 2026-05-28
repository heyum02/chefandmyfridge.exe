import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Alert, FlatList, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFridgeStore } from '../store/useFridgeStore';

const getCategoryIcon = (category) => {
  switch (category) {
    case '채소': return '🥬'; case '과일': return '🍎'; case '육류': return '🥩'; case '수산물': return '🐟';
    case '유제품/계란': return '🥚'; case '양념/소스': return '🧂'; case '가공/냉동': return '🧊'; case '기타': return '📦';
    default: return '📦';
  }
};

const calculateDday = (dateString) => {
  if (!dateString) return null;
  const target = new Date(dateString);
  const today = new Date();
  target.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  const diffTime = target - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const formatDate = (date) => {
  const d = new Date(date);
  let month = '' + (d.getMonth() + 1);
  let day = '' + d.getDate();
  const year = d.getFullYear();
  if (month.length < 2) month = '0' + month;
  if (day.length < 2) day = '0' + day;
  return [year, month, day].join('-');
};

export default function InventoryScreen() {
  const ingredients = useFridgeStore((state) => state.ingredients);
  const fetchIngredients = useFridgeStore((state) => state.fetchIngredients);
  
  useEffect(() => {
    fetchIngredients();
  }, []);
  
  const addIngredient = useFridgeStore((state) => state.addIngredient);
  const removeIngredient = useFridgeStore((state) => state.removeIngredient);
  const updateIngredient = useFridgeStore((state) => state.updateIngredient);

  // 💡 메인 모달 상태 관리 (추가 및 수정 공용)
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false); // 수정 모드인지 확인
  const [editingId, setEditingId] = useState(null); // 수정 중인 아이템 ID

  // 💡 입력폼 상태 관리
  const [inputText, setInputText] = useState('');
  const [amount, setAmount] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState('기타');
  const [daysLeft, setDaysLeft] = useState(7);

  const categories = ['채소', '과일', '육류', '수산물', '유제품/계란', '양념/소스', '가공/냉동', '기타'];

  const validIngredients = (ingredients || []).filter(item => item && item.id);
  const sortedIngredients = [...validIngredients].sort((a, b) => {
    const dDayA = calculateDday(a?.expiryDate) ?? 999;
    const dDayB = calculateDday(b?.expiryDate) ?? 999;
    return dDayA - dDayB;
  });

  // 💡 새 식재료 추가 창 열기
  const openAddModal = () => {
    setIsEditMode(false);
    setEditingId(null);
    setInputText(''); 
    setAmount(1); 
    setSelectedCategory('기타'); 
    setDaysLeft(7); 
    setModalVisible(true);
  };

  // 💡 기존 식재료 수정 창 열기 (항목 클릭 시 실행)
  const openEditModal = (item) => {
    setIsEditMode(true);
    setEditingId(item.id);
    setInputText(item.name);
    setAmount(item.amount);
    setSelectedCategory(item.category || '기타');
    
    const currentDday = calculateDday(item.expiryDate);
    setDaysLeft(currentDday !== null ? currentDday : 7);
    
    setModalVisible(true);
  };

  const handleAmountChange = (value, setter, state) => { setter(Math.max(1, state + value)); }; // 수량이 1 밑으로 안 내려가게 방어!

  // 💡 추가 또는 수정 완료 버튼을 눌렀을 때
  const handleSubmit = () => {
    if (inputText.trim() === '') { Alert.alert('알림', '식재료 이름을 입력해주세요!'); return; }
    
    const today = new Date();
    today.setDate(today.getDate() + daysLeft);
    const formattedDate = formatDate(today);

    if (isEditMode) {
      // 수정 모드일 때
      updateIngredient(editingId, { 
        name: inputText, 
        amount: amount, 
        category: selectedCategory, 
        expiryDate: formattedDate 
      });
    } else {
      // 새롭게 추가할 때
      const newItem = { 
        id: Date.now().toString(), 
        name: inputText, 
        amount: amount, 
        unit: '개', 
        category: selectedCategory, 
        expiryDate: formattedDate 
      };
      addIngredient(newItem);
    }
    setModalVisible(false);
  };

  const renderItem = ({ item }) => {
    if (!item || !item.id) return null;

    const dDay = calculateDday(item.expiryDate);
    const isUrgent = dDay !== null && dDay <= 3;

    return (
      <View style={styles.card}>
        <Text style={styles.icon}>{getCategoryIcon(item.category)}</Text>
        
        {/* 💡 식재료 이름과 카테고리 부분을 누르면 전체 수정 창이 열리도록 변경했습니다! */}
        <TouchableOpacity style={styles.infoContainer} onPress={() => openEditModal(item)}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.categoryText}>{item.category} (터치하여 수정)</Text>
        </TouchableOpacity>
        
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{item.amount} {item.unit}</Text>
        </View>

        <View style={[styles.ddayBadge, isUrgent && styles.ddayBadgeUrgent]}>
          <Text style={[styles.ddayText, isUrgent && styles.ddayTextUrgent]}>
            {dDay !== null ? (dDay < 0 ? `D+${Math.abs(dDay)}` : dDay === 0 ? 'D-Day' : `D-${dDay}`) : '기한 모름'}
          </Text>
        </View>

        <TouchableOpacity style={styles.deleteBtn} onPress={() => removeIngredient(item.id)}>
          <Ionicons name="trash-outline" size={24} color="#ff7675" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}><Text style={styles.headerTitle}>마이 냉장고 식재료</Text></View>
      <View style={styles.topActionContainer}>
        <TouchableOpacity style={styles.openModalButton} onPress={openAddModal}>
          <Ionicons name="add-circle-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.openModalButtonText}>직접 식재료 추가하기</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={sortedIngredients}
        keyExtractor={(item, index) => item?.id ? String(item.id) : String(index)}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<View style={styles.emptyContainer}><Text style={styles.emptyText}>냉장고가 텅 비었어요!{'\n'}위에 버튼을 눌러 재료를 추가해보세요.</Text></View>}
      />

      {/* 💡 공용 입력 모달 (추가 / 수정 둘 다 사용) */}
      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{isEditMode ? '식재료 정보 수정 ✏️' : '식재료 수기 추가 ➕'}</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ width: '100%' }}>
              <Text style={styles.sectionSubtitle}>🏷️ 식재료 이름</Text>
              <TextInput style={styles.modalInput} placeholder="예: 사과, 대파" value={inputText} onChangeText={setInputText} />

              <Text style={styles.sectionSubtitle}>분류 카테고리</Text>
              <View style={styles.chipContainer}>
                {categories.map((cat) => (
                  <TouchableOpacity key={cat} style={[styles.chip, selectedCategory === cat && styles.activeChip]} onPress={() => setSelectedCategory(cat)}>
                    <Text style={[styles.chipText, selectedCategory === cat && styles.activeChipText]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.sectionSubtitle}>🔢 수량 (개)</Text>
              <View style={styles.amountContainer}>
                <TouchableOpacity style={styles.amountBtn} onPress={() => handleAmountChange(-1, setAmount, amount)}><Ionicons name="remove" size={24} color="#2c3e50" /></TouchableOpacity>
                <Text style={styles.amountText}>{amount}</Text>
                <TouchableOpacity style={styles.amountBtn} onPress={() => handleAmountChange(1, setAmount, amount)}><Ionicons name="add" size={24} color="#2c3e50" /></TouchableOpacity>
              </View>

              <Text style={styles.sectionSubtitle}>⏳ 소비기한 (며칠 남았나요?)</Text>
              <View style={styles.amountContainer}>
                <TouchableOpacity style={styles.amountBtn} onPress={() => handleAmountChange(-1, setDaysLeft, daysLeft)}><Ionicons name="remove" size={24} color="#2c3e50" /></TouchableOpacity>
                <Text style={styles.amountText}>{daysLeft}일 남음</Text>
                <TouchableOpacity style={styles.amountBtn} onPress={() => handleAmountChange(1, setDaysLeft, daysLeft)}><Ionicons name="add" size={24} color="#2c3e50" /></TouchableOpacity>
              </View>
            </ScrollView>
            <View style={styles.modalButtonGroup}>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}><Text style={styles.closeBtnText}>취소</Text></TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
                <Text style={styles.submitBtnText}>{isEditMode ? '수정 완료하기' : '추가하기'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 60, backgroundColor: '#fff' },
  headerTitle: { fontSize: 26, fontWeight: 'bold', color: '#2c3e50' },
  topActionContainer: { padding: 15, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  openModalButton: { flexDirection: 'row', backgroundColor: '#2ecc71', paddingVertical: 12, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  openModalButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  listContainer: { padding: 15 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 15, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  icon: { fontSize: 35, marginRight: 15 },
  infoContainer: { flex: 1 },
  name: { fontSize: 18, fontWeight: '600', color: '#2c3e50' },
  categoryText: { fontSize: 12, color: '#95a5a6', marginTop: 3 },
  badge: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: '#f1f2f6', marginRight: 10 },
  badgeText: { fontSize: 15, fontWeight: 'bold', color: '#2c3e50' },
  ddayBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: '#ecf0f1', marginRight: 10 },
  ddayText: { fontSize: 13, fontWeight: 'bold', color: '#7f8c8d' },
  ddayBadgeUrgent: { backgroundColor: '#ffecec' },
  ddayTextUrgent: { color: '#e74c3c' },
  deleteBtn: { padding: 5 },
  emptyContainer: { marginTop: 50, alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#7f8c8d', textAlign: 'center', lineHeight: 24 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: Platform.OS === 'web' ? 'center' : 'flex-end', alignItems: Platform.OS === 'web' ? 'center' : 'stretch' },
  modalContent: { width: '100%', maxWidth: Platform.OS === 'web' ? 400 : '100%', height: '75%', maxHeight: Platform.OS === 'web' ? 720 : '100%', backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, borderBottomLeftRadius: Platform.OS === 'web' ? 30 : 0, borderBottomRightRadius: Platform.OS === 'web' ? 30 : 0, padding: 25, alignItems: 'flex-start' },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#2c3e50', marginBottom: 20, alignSelf: 'center' },
  sectionSubtitle: { fontSize: 15, fontWeight: 'bold', color: '#34495e', marginTop: 15, marginBottom: 10 },
  modalInput: { backgroundColor: '#f1f2f6', padding: 15, borderRadius: 10, fontSize: 16, color: '#2c3e50', marginBottom: 10 },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  chip: { backgroundColor: '#f1f2f6', paddingVertical: 10, paddingHorizontal: 15, borderRadius: 20, borderWidth: 1, borderColor: '#ecf0f1' },
  activeChip: { backgroundColor: '#3498db', borderColor: '#3498db' },
  chipText: { color: '#7f8c8d', fontSize: 13, fontWeight: '600' },
  activeChipText: { color: '#fff', fontWeight: 'bold' },
  amountContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f2f6', alignSelf: 'flex-start', borderRadius: 12, padding: 5 },
  amountBtn: { backgroundColor: '#fff', padding: 10, borderRadius: 8, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  amountText: { fontSize: 18, fontWeight: 'bold', paddingHorizontal: 20, color: '#2c3e50' },
  modalButtonGroup: { flexDirection: 'row', width: '100%', marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderColor: '#eee' },
  closeBtn: { flex: 0.3, padding: 15, alignItems: 'center' },
  closeBtnText: { color: '#95a5a6', fontSize: 16, fontWeight: 'bold' },
  submitBtn: { flex: 0.7, backgroundColor: '#2ecc71', padding: 15, borderRadius: 12, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});