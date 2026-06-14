import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Alert, SectionList, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, KeyboardAvoidingView } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFridgeStore } from '../store/useFridgeStore';

const getCategoryIcon = (category) => {
  switch (category) {
    case '채소': return '🥬'; case '과일': return '🍎'; case '육류': return '🥩'; case '수산물': return '🐟';
    case '유제품/계란': return '🥚'; case '양념/소스': return '🧂'; case '가공/냉동': return '🧊'; case '기타': return '📦';
    default: return '📦';
  }
};

// 백엔드에서 온 UTC 시간을 한국 시간(로컬)으로 똑똑하게 변환
const cleanDateString = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;

  let month = '' + (d.getMonth() + 1);
  let day = '' + d.getDate();
  const year = d.getFullYear();
  if (month.length < 2) month = '0' + month;
  if (day.length < 2) day = '0' + day;

  return [year, month, day].join('-');
};

const calculateDday = (dateString) => {
  const cleanDate = cleanDateString(dateString);
  if (!cleanDate) return null;

  const target = new Date(cleanDate);
  const today = new Date();
  target.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  const diffTime = target.getTime() - today.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
};

const formatDateToDot = (date) => {
  const d = new Date(date);
  let month = '' + (d.getMonth() + 1);
  let day = '' + d.getDate();
  const year = d.getFullYear();
  if (month.length < 2) month = '0' + month;
  if (day.length < 2) day = '0' + day;
  return [year, month, day].join('.');
};

export default function InventoryScreen() {
  const ingredients = useFridgeStore((state) => state.ingredients);
  const fetchIngredients = useFridgeStore((state) => state.fetchIngredients);
  const addIngredient = useFridgeStore((state) => state.addIngredient);
  const removeIngredient = useFridgeStore((state) => state.removeIngredient);
  const updateIngredient = useFridgeStore((state) => state.updateIngredient);

  useEffect(() => { fetchIngredients(); }, []);

  const [modalVisible, setModalVisible] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [inputText, setInputText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('기타');
  const [expiryDate, setExpiryDate] = useState(new Date());

  const [showDatePicker, setShowDatePicker] = useState(false);

  const categories = ['채소', '과일', '육류', '수산물', '유제품/계란', '양념/소스', '가공/냉동', '기타'];

  const validIngredients = (ingredients || []).filter(item => item && item.id);
  const sortedIngredients = [...validIngredients].sort((a, b) => {
    const dDayA = calculateDday(a?.expiryDate) ?? 999;
    const dDayB = calculateDday(b?.expiryDate) ?? 999;
    return dDayA - dDayB;
  });

  const urgentItems = [];
  const categorizedItems = {};

  sortedIngredients.forEach(item => {
    const dDay = calculateDday(item.expiryDate);
    if (dDay !== null && dDay <= 3) {
      urgentItems.push(item);
    } else {
      const cat = item.category || '기타';
      if (!categorizedItems[cat]) categorizedItems[cat] = [];
      categorizedItems[cat].push(item);
    }
  });

  const sections = [];
  if (urgentItems.length > 0) sections.push({ title: '🚨 유통기한 임박 (3일 이내)', data: urgentItems, isUrgent: true });
  categories.forEach(cat => {
    if (categorizedItems[cat] && categorizedItems[cat].length > 0) {
      sections.push({ title: `${getCategoryIcon(cat)} ${cat}`, data: categorizedItems[cat], isUrgent: false });
    }
  });

  const openAddModal = () => {
    setIsEditMode(false);
    setEditingId(null);
    setInputText('');
    setSelectedCategory('기타');
    setExpiryDate(new Date());
    setShowDatePicker(false);
    setModalVisible(true);
  };

  const openEditModal = (item) => {
    setIsEditMode(true);
    setEditingId(item.id);
    setInputText(item.name);
    setSelectedCategory(item.category || '기타');

    const cleanDate = cleanDateString(item.expiryDate);
    setExpiryDate(cleanDate ? new Date(cleanDate) : new Date());
    setShowDatePicker(false);
    setModalVisible(true);
  };

  const handleDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setExpiryDate(selectedDate);
    }
  };

  const handleSubmit = () => {
    if (inputText.trim() === '') { Alert.alert('알림', '식재료 이름을 입력해주세요!'); return; }

    const dbFormattedDate = formatDateToDot(expiryDate).replace(/\./g, '-');

    if (isEditMode) {
      updateIngredient(editingId, { name: inputText, amount: 1, category: selectedCategory, expiryDate: dbFormattedDate });
    } else {
      addIngredient({ id: Date.now().toString(), name: inputText, amount: 1, unit: '개', category: selectedCategory, expiryDate: dbFormattedDate });
    }
    setModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {/* 💡 깔끔하게 원래 타이틀로 복구 */}
        <Text style={styles.headerTitle}>마이 냉장고 식재료</Text>
      </View>
      <View style={styles.topActionContainer}>
        <TouchableOpacity style={styles.openModalButton} onPress={openAddModal}>
          <Ionicons name="add-circle-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.openModalButtonText}>직접 식재료 추가하기</Text>
        </TouchableOpacity>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item, index) => item?.id ? String(item.id) : String(index)}
        renderItem={({ item }) => {
          const cleanDate = cleanDateString(item.expiryDate);
          const formattedDisplayDate = cleanDate ? cleanDate.replace(/-/g, '.') : '';
          const dDay = calculateDday(cleanDate);
          const isUrgent = dDay !== null && dDay <= 3;

          return (
            <View style={styles.card}>
              <Text style={styles.icon}>{getCategoryIcon(item.category)}</Text>
              <TouchableOpacity style={styles.infoContainer} onPress={() => openEditModal(item)}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.categoryText}>{item.category} (터치하여 수정)</Text>
              </TouchableOpacity>

              <View style={{ alignItems: 'flex-end' }}>
                <View style={[styles.ddayBadge, isUrgent && styles.ddayBadgeUrgent]}>
                  <Text style={[styles.ddayText, isUrgent && styles.ddayTextUrgent]}>
                    {dDay !== null ? (dDay < 0 ? `D+${Math.abs(dDay)}` : dDay === 0 ? 'D-Day' : `D-${dDay}`) : '기한 모름'}
                  </Text>
                </View>
                {formattedDisplayDate !== '' && <Text style={styles.displayDateText}>{formattedDisplayDate} 까지</Text>}
              </View>

              <TouchableOpacity style={styles.deleteBtn} onPress={() => removeIngredient(item.id)}><Ionicons name="trash-outline" size={24} color="#ff7675" /></TouchableOpacity>
            </View>
          );
        }}
        renderSectionHeader={({ section }) => (
          <View style={[styles.sectionHeader, section.isUrgent && styles.sectionHeaderUrgent]}>
            <Text style={[styles.sectionHeaderText, section.isUrgent && styles.sectionHeaderTextUrgent]}>{section.title}</Text>
          </View>
        )}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<View style={styles.emptyContainer}><Text style={styles.emptyText}>냉장고가 텅 비었어요!{'\n'}위에 버튼을 눌러 재료를 추가해보세요.</Text></View>}
      />

      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
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

                <Text style={styles.sectionSubtitle}>⏳ 소비기한 선택</Text>
                <TouchableOpacity style={styles.datePickerBtn} onPress={() => setShowDatePicker(!showDatePicker)}>
                  <Ionicons name="calendar-outline" size={20} color="#34495e" style={{ marginRight: 10 }} />
                  <Text style={styles.datePickerText}>{formatDateToDot(expiryDate)}</Text>
                  <Ionicons name={showDatePicker ? "chevron-up" : "chevron-down"} size={20} color="#95a5a6" style={{ marginLeft: 'auto' }} />
                </TouchableOpacity>

                {showDatePicker && (
                  <View style={Platform.OS === 'ios' ? { backgroundColor: '#fff', borderRadius: 10, marginTop: 10, padding: 10 } : {}}>
                    <DateTimePicker
                      value={expiryDate}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'inline' : 'default'}
                      onChange={handleDateChange}
                    />
                  </View>
                )}

              </ScrollView>
              <View style={styles.modalButtonGroup}>
                <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}><Text style={styles.closeBtnText}>취소</Text></TouchableOpacity>
                <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}><Text style={styles.submitBtnText}>{isEditMode ? '수정 완료하기' : '추가하기'}</Text></TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
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
  listContainer: { padding: 15, paddingBottom: 40 },
  sectionHeader: { paddingVertical: 12, paddingHorizontal: 5, marginBottom: 10, marginTop: 15, borderBottomWidth: 2, borderBottomColor: '#eee' },
  sectionHeaderUrgent: { borderBottomColor: '#ff7675' },
  sectionHeaderText: { fontSize: 18, fontWeight: 'bold', color: '#2c3e50' },
  sectionHeaderTextUrgent: { color: '#d63031' },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 15, marginBottom: 10, elevation: 3 },
  icon: { fontSize: 35, marginRight: 15 },
  infoContainer: { flex: 1 },
  name: { fontSize: 18, fontWeight: '600', color: '#2c3e50' },
  categoryText: { fontSize: 12, color: '#95a5a6', marginTop: 3 },
  ddayBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: '#ecf0f1', marginRight: 10, alignSelf: 'flex-end' },
  ddayText: { fontSize: 13, fontWeight: 'bold', color: '#7f8c8d' },
  ddayBadgeUrgent: { backgroundColor: '#ffecec' },
  ddayTextUrgent: { color: '#e74c3c' },
  displayDateText: { fontSize: 11, color: '#95a5a6', marginTop: 5, marginRight: 10 },
  deleteBtn: { padding: 5 },
  emptyContainer: { marginTop: 50, alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#7f8c8d', textAlign: 'center', lineHeight: 24 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { width: '100%', height: '75%', backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, alignSelf: 'center' },
  sectionSubtitle: { fontSize: 15, fontWeight: 'bold', color: '#34495e', marginTop: 15, marginBottom: 10 },
  modalInput: { backgroundColor: '#f1f2f6', padding: 15, borderRadius: 10, fontSize: 16, color: '#2c3e50', marginBottom: 10 },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  chip: { backgroundColor: '#f1f2f6', paddingVertical: 10, paddingHorizontal: 15, borderRadius: 20, borderWidth: 1, borderColor: '#ecf0f1' },
  activeChip: { backgroundColor: '#3498db', borderColor: '#3498db' },
  chipText: { color: '#7f8c8d', fontSize: 13, fontWeight: '600' },
  activeChipText: { color: '#fff', fontWeight: 'bold' },
  datePickerBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f2f6', padding: 15, borderRadius: 10 },
  datePickerText: { fontSize: 16, fontWeight: 'bold', color: '#2c3e50' },
  modalButtonGroup: { flexDirection: 'row', width: '100%', marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderColor: '#eee' },
  closeBtn: { flex: 0.3, padding: 15, alignItems: 'center' },
  closeBtnText: { color: '#95a5a6', fontSize: 16, fontWeight: 'bold' },
  submitBtn: { flex: 0.7, backgroundColor: '#2ecc71', padding: 15, borderRadius: 12, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
