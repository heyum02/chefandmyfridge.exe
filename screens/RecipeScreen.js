import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function RecipeScreen() {
  // 모달창을 띄우고 숨기기 위한 상태(State) 관리
  const [modalVisible, setModalVisible] = useState(false);
  const [rating, setRating] = useState(0);

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* 상단 헤더 */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>AI 맞춤 레시피</Text>
        </View>

        {/* 1. 레시피 추천 카드 */}
        <View style={styles.recipeCard}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>✨ AI 추천</Text>
          </View>
          <Text style={styles.recipeTitle}>고구마 듬뿍 카레</Text>
          <Text style={styles.recipeDesc}>
            유통기한이 임박한 '고구마'를 활용해 달콤하고 부드러운 카레를 만들어보세요!
          </Text>

          {/* 2. 핵심 UI: 대체 식재료 비교 섹션 */}
          <View style={styles.ingredientSection}>
            <Text style={styles.sectionTitle}>💡 스마트 식재료 대체</Text>
            
            <View style={styles.compareRow}>
              <View style={styles.itemBox}>
                <Text style={styles.itemIcon}>🥔</Text>
                <Text style={styles.oldItem}>감자 (없음)</Text>
              </View>
              
              <Ionicons name="arrow-forward" size={24} color="#bdc3c7" style={styles.arrowIcon} />
              
              <View style={[styles.itemBox, styles.newItemBox]}>
                <Text style={styles.itemIcon}>🍠</Text>
                <Text style={styles.newItem}>고구마 (D-2)</Text>
              </View>
            </View>
          </View>

          {/* 조리 순서 (가짜 데이터) */}
          <View style={styles.stepSection}>
            <Text style={styles.sectionTitle}>🍳 조리 순서</Text>
            <Text style={styles.stepText}>1. 고구마와 양파를 깍둑썰기 합니다.</Text>
            <Text style={styles.stepText}>2. 냄비에 기름을 두르고 채소를 볶습니다.</Text>
            <Text style={styles.stepText}>3. 물과 카레 가루를 넣고 푹 끓여주세요.</Text>
          </View>
        </View>
      </ScrollView>

      {/* 3. 요리 완료 버튼 (누르면 모달창 열림) */}
      <View style={styles.bottomButtonContainer}>
        <TouchableOpacity style={styles.cookButton} onPress={() => setModalVisible(true)}>
          <Text style={styles.cookButtonText}>요리 완료 & 평가하기</Text>
        </TouchableOpacity>
      </View>

      {/* 4. 평가 모달창 (평상시엔 숨겨져 있음) */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>요리는 어떠셨나요?</Text>
            <Text style={styles.modalSubtitle}>'고구마 듬뿍 카레'에 대한 별점과 후기를 남겨주세요.</Text>

            {/* 별점 선택 UI (가짜로 눌리게만 구현) */}
            <View style={styles.starContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setRating(star)}>
                  <Ionicons 
                    name={star <= rating ? "star" : "star-outline"} 
                    size={36} 
                    color="#f1c40f" 
                  />
                </TouchableOpacity>
              ))}
            </View>

            {/* 코멘트 입력창 */}
            <TextInput
              style={styles.textInput}
              placeholder="레시피에 대한 나만의 팁을 적어보세요!"
              multiline={true}
            />

            {/* 모달 버튼들 */}
            <View style={styles.modalButtonGroup}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelButtonText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitButton} onPress={() => setModalVisible(false)}>
                <Text style={styles.submitButtonText}>저장하기</Text>
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
  header: { padding: 20, paddingTop: 60, backgroundColor: '#fff' },
  headerTitle: { fontSize: 26, fontWeight: 'bold', color: '#2c3e50' },
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
  
  // 모달 스타일
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