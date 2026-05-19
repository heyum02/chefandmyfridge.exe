import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

// 💡 보관함 불러오기 (냉장고 데이터 & 유저 식성 데이터)
import { useFridgeStore } from '../store/useFridgeStore';
import { useUserStore } from '../store/useUserStore';

export default function RecipeScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  
  // 카테고리 탭 상태 관리
  const categories = ['✨ 전체 추천', '⏱️ 초스피드', '⏳ 유통기한 임박', '🥗 비건', '🔥 다이어트'];
  const [selectedCategory, setSelectedCategory] = useState(categories[0]);

  // 💡 1. 냉장고 보관함에서 첫 번째 재료 꺼내오기 (대체 식재료 UI용)
  const ingredients = useFridgeStore((state) => state.ingredients);
  const firstItem = ingredients.length > 0 ? ingredients[0] : null;

  // 💡 2. 유저 보관함에서 식성 업데이트 및 레시피 저장 함수 꺼내오기
  const updateTaste = useUserStore((state) => state.updateTaste);
  const addTriedRecipe = useUserStore((state) => state.addTriedRecipe); // NEW

  // 💡 3. 모달창 상태 관리 (식성 5단계, 별점, 코멘트)
  const [feedback, setFeedback] = useState({ spicy: 0, salty: 0, sweet: 0 });
  const [rating, setRating] = useState(0); // 별점 (0~5)
  const [comment, setComment] = useState(''); // 짧은 코멘트

  // 💡 4. '평가 완료하기' 버튼 로직 (식성 업데이트 + 레시피 기록 저장)
  const submitAllFeedback = () => {
    // 별점을 안 매겼을 경우 방어 코드
    if (rating === 0) {
      Alert.alert('알림', '별점을 먼저 선택해 주세요!');
      return;
    }

    // 1) 식성 업데이트 (-2 ~ +2 값을 기존 식성에 더함)
    if (feedback.spicy !== 0) updateTaste('spicy', feedback.spicy);
    if (feedback.salty !== 0) updateTaste('salty', feedback.salty);
    if (feedback.sweet !== 0) updateTaste('sweet', feedback.sweet);

    // 2) 레시피 기록 생성 (현재 날짜 포함)
    const recipeName = firstItem ? `${firstItem.name} 듬뿍 카레` : '고구마 듬뿍 카레';
    const today = new Date();
    const dateString = `${today.getFullYear()}.${today.getMonth() + 1}.${today.getDate()}`; // 예: 2026.4.19

    const newRecipeData = {
      id: Date.now().toString(),
      name: recipeName,
      date: dateString,
      rating: rating,
      comment: comment,
    };

    // 3) 보관함에 기록 저장
    addTriedRecipe(newRecipeData);

    Alert.alert('저장 완료 🍽️', '별점과 피드백이 홈 화면 기록에 저장되었습니다!', [
      { text: '확인', onPress: () => {
          setModalVisible(false);
          // 닫을 때 다음 평가를 위해 입력값들 초기화
          setFeedback({ spicy: 0, salty: 0, sweet: 0 });
          setRating(0);
          setComment('');
      }}
    ]);
  };

  // 💡 5. 식성 5단계 평가 버튼 렌더링 함수 (기존 유지)
  const renderScale = (type, labels) => {
    const values = [-2, -1, 0, 1, 2]; 
    return (
      <View style={styles.scaleGroup}>
        {values.map((val, idx) => (
          <TouchableOpacity
            key={idx}
            style={[styles.scaleBtn, feedback[type] === val && styles.scaleBtnActive]}
            onPress={() => setFeedback({ ...feedback, [type]: val })}
          >
            <Text style={[styles.scaleBtnText, feedback[type] === val && styles.scaleBtnTextActive]}>
              {labels[idx]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* 상단 헤더 */}
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
        {/* 레시피 추천 카드 */}
        <View style={styles.recipeCard}>
          <View style={styles.badge}><Text style={styles.badgeText}>✨ AI 맞춤 추천</Text></View>
          
          <Text style={styles.recipeTitle}>
            {firstItem ? `${firstItem.name} 듬뿍 카레` : '고구마 듬뿍 카레'}
          </Text>
          <Text style={styles.recipeDesc}>
            {firstItem ? `냉장고에 있는 '${firstItem.name}'을(를) 활용해 요리를 만들어보세요!` : '냉장고에 재료를 추가하면 맞춤 레시피를 추천해 드려요!'}
          </Text>

          {/* 대체 식재료 비교 섹션 */}
          <View style={styles.ingredientSection}>
            <Text style={styles.sectionTitle}>💡 스마트 식재료 대체</Text>
            <View style={styles.compareRow}>
              <View style={styles.itemBox}>
                <Text style={styles.itemIcon}>🥔</Text>
                <Text style={styles.oldItem}>감자 (없음)</Text>
              </View>
              <Ionicons name="arrow-forward" size={24} color="#bdc3c7" style={styles.arrowIcon} />
              <View style={[styles.itemBox, styles.newItemBox]}>
                <Text style={styles.itemIcon}>{firstItem ? firstItem.icon : '❓'}</Text>
                <Text style={styles.newItem}>
                  {firstItem ? `${firstItem.name}` : '재료 없음'}
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

      {/* 💡 요리 완료 & 평가 버튼 */}
      <View style={styles.bottomButtonContainer}>
        <TouchableOpacity style={styles.cookButton} onPress={() => setModalVisible(true)}>
          <Text style={styles.cookButtonText}>요리 완료 & 입맛 가르치기</Text>
        </TouchableOpacity>
      </View>

{/* 💡 맛 평가 모달창 (내용이 길어져 ScrollView로 감쌉니다) */}
      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false} style={{ width: '100%' }}>
              <Text style={styles.modalTitle}>요리는 어떠셨나요? 😋</Text>
              <Text style={styles.modalSubtitle}>피드백과 기록을 남겨주시면 AI가 진화합니다.</Text>
              
              {/* 💡 NEW: 별점 입력 영역 */}
              <View style={styles.ratingSection}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity key={star} onPress={() => setRating(star)}>
                    <Ionicons name={star <= rating ? "star" : "star-outline"} size={36} color="#f1c40f" style={styles.starIcon} />
                  </TouchableOpacity>
                ))}
              </View>

              {/* 💡 NEW: 짧은 코멘트 입력 영역 */}
              <TextInput 
                style={styles.commentInput} 
                placeholder="간단한 코멘트를 남겨보세요! (예: 밥도둑이다)" 
                value={comment}
                onChangeText={setComment}
                maxLength={30}
              />

              <View style={styles.divider} />

              <View style={styles.feedbackSection}>
                <View style={styles.feedbackRow}>
                  <Text style={styles.feedbackLabel}>🔥 매운맛</Text>
                  {renderScale('spicy', ['너무\n맵다', '맵다', '딱\n좋다', '안\n맵다', '너무\n안맵다'])}
                </View>
                <View style={styles.feedbackRow}>
                  <Text style={styles.feedbackLabel}>🧂 짠맛 (간)</Text>
                  {renderScale('salty', ['너무\n짜다', '짜다', '딱\n좋다', '싱겁다', '너무\n싱겁다'])}
                </View>
                <View style={styles.feedbackRow}>
                  <Text style={styles.feedbackLabel}>🍯 단맛</Text>
                  {renderScale('sweet', ['너무\n달다', '달다', '딱\n좋다', '안\n달다', '너무\n안달다'])}
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalButtonGroup}>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.closeBtnText}>나중에 할게요</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={submitAllFeedback}>
                <Text style={styles.submitBtnText}>기록 저장하기</Text>
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </Modal>
    </View>
  );
}

// 🎨 스타일 설정
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
  
  /* 💡 모달창 스타일 (ScrollView 포함) */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { width: '100%', height: '90%', backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, alignItems: 'center', paddingBottom: 40 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#2c3e50', marginBottom: 10, textAlign: 'center' },
  modalSubtitle: { fontSize: 14, color: '#7f8c8d', textAlign: 'center', marginBottom: 20 },
  
  // NEW: 별점 및 코멘트 스타일
  ratingSection: { flexDirection: 'row', justifyContent: 'center', marginBottom: 15 },
  starIcon: { marginHorizontal: 5 },
  commentInput: { backgroundColor: '#f1f2f6', padding: 15, borderRadius: 10, fontSize: 14, color: '#2c3e50', marginBottom: 20 },
  divider: { height: 1, backgroundColor: '#eee', marginBottom: 20 },

  feedbackSection: { width: '100%', marginBottom: 10 },
  feedbackRow: { marginBottom: 20 },
  feedbackLabel: { fontSize: 15, fontWeight: 'bold', color: '#34495e', marginBottom: 10 },
  scaleGroup: { flexDirection: 'row', justifyContent: 'space-between' },
  scaleBtn: { flex: 1, backgroundColor: '#f1f2f6', paddingVertical: 12, marginHorizontal: 3, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  scaleBtnActive: { backgroundColor: '#3498db' },
  scaleBtnText: { color: '#7f8c8d', fontSize: 12, fontWeight: '600', textAlign: 'center', lineHeight: 16 },
  scaleBtnTextActive: { color: '#fff', fontWeight: 'bold' },
  
  modalButtonGroup: { flexDirection: 'row', width: '100%', marginTop: 10, paddingTop: 10, alignItems: 'center', justifyContent: 'space-between' },
  closeBtn: { flex: 0.3, padding: 15, alignItems: 'center' },
  closeBtnText: { color: '#95a5a6', fontSize: 14, textDecorationLine: 'underline' },
  submitBtn: { flex: 0.7, backgroundColor: '#2ecc71', padding: 15, borderRadius: 12, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});