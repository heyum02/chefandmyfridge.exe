import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

// 💡 1. 냉장고 보관함 불러오기
import { useFridgeStore } from '../store/useFridgeStore';

export default function RecipeScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  const [rating, setRating] = useState(0);
  
  // 카테고리 상태 관리
  const categories = ['✨ 전체 추천', '⏱️ 초스피드', '⏳ 유통기한 임박', '🥗 비건', '🔥 다이어트'];
  const [selectedCategory, setSelectedCategory] = useState(categories[0]);

  // 💡 2. 보관함에서 식재료 목록 꺼내기
  const ingredients = useFridgeStore((state) => state.ingredients);
  // 💡 3. 리스트에 데이터가 있으면 첫 번째 항목을 가져오고, 없으면 null 처리
  const firstItem = ingredients.length > 0 ? ingredients[0] : null;

  return (
    <View style={styles.container}>
      {/* 상단 헤더 (고정) */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>AI 맞춤 레시피</Text>
      </View>

      {/* 카테고리 가로 스크롤 */}
      <View style={styles.categoryContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {categories.map((cat, index) => (
            <TouchableOpacity 
              key={index} 
              style={[styles.categoryBadge, selectedCategory === cat && styles.categoryBadgeActive]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text style={[styles.categoryText, selectedCategory === cat && styles.categoryTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* 1. 레시피 추천 카드 */}
        <View style={styles.recipeCard}>
          <View style={styles.badge}><Text style={styles.badgeText}>✨ AI 추천</Text></View>
          
          {/* 재료 유무에 따라 타이틀과 설명도 살짝 동적으로 변경 */}
          <Text style={styles.recipeTitle}>
            {firstItem ? `${firstItem.name} 듬뿍 카레` : '고구마 듬뿍 카레'}
          </Text>
          <Text style={styles.recipeDesc}>
            {firstItem ? `유통기한이 임박한 '${firstItem.name}'을(를) 활용해 요리를 만들어보세요!` : '냉장고에 재료를 추가하면 맞춤 레시피를 추천해 드려요!'}
          </Text>

          {/* 💡 핵심 UI: 대체 식재료 비교 섹션 */}
          <View style={styles.ingredientSection}>
            <Text style={styles.sectionTitle}>💡 스마트 식재료 대체</Text>
            
            <View style={styles.compareRow}>
              <View style={styles.itemBox}>
                <Text style={styles.itemIcon}>🥔</Text>
                <Text style={styles.oldItem}>감자 (없음)</Text>
              </View>
              
              <Ionicons name="arrow-forward" size={24} color="#bdc3c7" style={styles.arrowIcon} />
              
              <View style={[styles.itemBox, styles.newItemBox]}>
                {/* 💡 4. 냉장고 데이터 기반으로 아이콘, 이름, 유통기한 출력 */}
                <Text style={styles.itemIcon}>{firstItem ? firstItem.icon : '❓'}</Text>
                <Text style={styles.newItem}>
                  {firstItem ? `${firstItem.name} (${firstItem.expiryDate})` : '재료 없음'}
                </Text>
              </View>
            </View>
          </View>

          {/* 조리 순서 */}
          <View style={styles.stepSection}>
            <Text style={styles.sectionTitle}>🍳 조리 순서</Text>
            <Text style={styles.stepText}>1. 재료와 양파를 깍둑썰기 합니다.</Text>
            <Text style={styles.stepText}>2. 냄비에 기름을 두르고 채소를 볶습니다.</Text>
            <Text style={styles.stepText}>3. 물과 카레 가루를 넣고 푹 끓여주세요.</Text>
          </View>
        </View>
      </ScrollView>

      {/* 요리 완료 버튼 */}
      <View style={styles.bottomButtonContainer}>
        <TouchableOpacity style={styles.cookButton} onPress={() => setModalVisible(true)}>
          <Text style={styles.cookButtonText}>요리 완료 & 평가하기</Text>
        </TouchableOpacity>
      </View>

      {/* 평가 모달창 (기존과 완전히 동일) */}
      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>요리는 어떠셨나요?</Text>
            <Text style={styles.modalSubtitle}>추천 레시피에 대한 별점과 후기를 남겨주세요.</Text>
            <View style={styles.starContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setRating(star)}>
                  <Ionicons name={star <= rating ? "star" : "star-outline"} size={36} color="#f1c40f" />
                </TouchableOpacity>
              ))}
            </View>
            <TextInput style={styles.textInput} placeholder="레시피에 대한 나만의 팁을 적어보세요!" multiline={true} />
            <View style={styles.modalButtonGroup}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}><Text style={styles.cancelButtonText}>취소</Text></TouchableOpacity>
              <TouchableOpacity style={styles.submitButton} onPress={() => setModalVisible(false)}><Text style={styles.submitButtonText}>저장하기</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa' },
  header: { padding: 20, paddingTop: 60, backgroundColor: '#fff', paddingBottom: 10 },
  headerTitle: { fontSize: 26, fontWeight: 'bold', color: '#2c3e50' },
  categoryContainer: { backgroundColor: '#fff', paddingBottom: 10, paddingHorizontal: 15 },
  categoryBadge: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f1f2f6', marginRight: 10 },
  categoryBadgeActive: { backgroundColor: '#2ecc71' },
  categoryText: { color: '#7f8c8d', fontWeight: '600' },
  categoryTextActive: { color: '#fff' },
  recipeCard: { backgroundColor: '#fff', margin: 15, padding: 20, borderRadius: 15, elevation: 2 },
  badge: { alignSelf: 'flex-start', backgroundColor: '#e8f8f5', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, marginBottom: 10 },
  badgeText: { color: '#1abc9c', fontWeight: 'bold', fontSize: 12 },
  recipeTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 10, color: '#2c3e50' },
  recipeDesc: { fontSize: 14, color: '#7f8c8d', lineHeight: 20, marginBottom: 20 },
  ingredientSection: { backgroundColor: '#f9fafd', padding: 15, borderRadius: 12, marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#34495e', marginBottom: 15 },
  compareRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  itemBox: { alignItems: 'center', padding: 10, borderRadius: 10, backgroundColor: '#f1f2f6', flex: 1 },
  newItemBox: { backgroundColor: '#eefcf5', borderWidth: 1, borderColor: '#2ecc71' },
  itemIcon: { fontSize: 30, marginBottom: 5 },
  oldItem: { fontSize: 13, color: '#95a5a6', textDecorationLine: 'line-through' },
  newItem: { fontSize: 13, fontWeight: 'bold', color: '#27ae60' },
  arrowIcon: { marginHorizontal: 10 },
  stepSection: { marginBottom: 20 },
  stepText: { fontSize: 15, color: '#34495e', marginBottom: 8, lineHeight: 22 },
  bottomButtonContainer: { padding: 20, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#f1f2f6' },
  cookButton: { backgroundColor: '#2ecc71', padding: 15, borderRadius: 12, alignItems: 'center' },
  cookButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', backgroundColor: '#fff', borderRadius: 20, padding: 25, alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#2c3e50', marginBottom: 10 },
  modalSubtitle: { fontSize: 14, color: '#7f8c8d', textAlign: 'center', marginBottom: 20 },
  starContainer: { flexDirection: 'row', marginBottom: 20 },
  textInput: { width: '100%', height: 100, backgroundColor: '#f1f2f6', borderRadius: 10, padding: 15, textAlignVertical: 'top', marginBottom: 20 },
  modalButtonGroup: { flexDirection: 'row', width: '100%', justifyContent: 'space-between' },
  cancelButton: { flex: 1, padding: 15, borderRadius: 10, backgroundColor: '#ecf0f1', marginRight: 10, alignItems: 'center' },
  cancelButtonText: { color: '#7f8c8d', fontWeight: 'bold' },
  submitButton: { flex: 1, padding: 15, borderRadius: 10, backgroundColor: '#2ecc71', alignItems: 'center' },
  submitButtonText: { color: '#fff', fontWeight: 'bold' },
});