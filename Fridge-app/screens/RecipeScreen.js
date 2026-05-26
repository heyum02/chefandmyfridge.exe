import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFridgeStore } from '../store/useFridgeStore';
import { useUserStore } from '../store/useUserStore';

export default function RecipeScreen() {
  const ingredients = useFridgeStore((state) => state.ingredients);
  const firstItem = ingredients.length > 0 ? ingredients[0] : null;
  
  const updateTaste = useUserStore((state) => state.updateTaste);
  const addTriedRecipe = useUserStore((state) => state.addTriedRecipe);
  
  const isPremium = useUserStore((state) => state.isPremium);
  const freeCount = useUserStore((state) => state.freeCount);
  const setIsPremium = useUserStore((state) => state.setIsPremium);
  const decreaseFreeCount = useUserStore((state) => state.decreaseFreeCount);
  const addFreeCount = useUserStore((state) => state.addFreeCount);

  const categories = ['✨ 추천', '⏱️ 초스피드'];
  const [selectedCategory, setSelectedCategory] = useState(categories[0]);
  
  const [showAdModal, setShowAdModal] = useState(false);
  const [modalVisible, setModalVisible] = useState(false); 
  
  const [feedback, setFeedback] = useState({ spicy: 0, salty: 0, sweet: 0, bitter: 0, sour: 0, savory: 0 });
  const [rating, setRating] = useState(0); 
  const [comment, setComment] = useState(''); 

  const handleGenerateRecipe = () => {
    if (isPremium) {
      Alert.alert("레시피 생성 🍳", "프리미엄 회원님, 맞춤 레시피를 분석 중입니다...");
      return;
    }
    if (freeCount > 0) {
      decreaseFreeCount();
      Alert.alert("레시피 생성 🍳", `레시피를 생성합니다!\n(남은 무료 횟수: ${freeCount - 1}회)`);
    } else {
      setShowAdModal(true); 
    }
  };

  const handleWatchAd = () => {
    setShowAdModal(false);
    Alert.alert("광고 시청 완료", "보상으로 레시피 1회 이용권이 지급되었습니다!");
    addFreeCount(1);
  };

  const handleSubscribe = () => {
    setShowAdModal(false);
    setIsPremium(true);
    Alert.alert("결제 완료 🎉", "프리미엄 회원이 되셨습니다! 무제한으로 이용해 보세요.");
  };

  const saveRecipeRecord = (isReflectTaste) => {
    if (rating === 0) { Alert.alert('알림', '별점을 먼저 선택해 주세요!'); return; }

    if (isReflectTaste) {
      if (feedback.spicy !== 0) updateTaste('spicy', feedback.spicy);
      if (feedback.salty !== 0) updateTaste('salty', feedback.salty);
      if (feedback.sweet !== 0) updateTaste('sweet', feedback.sweet);
      if (feedback.bitter !== 0) updateTaste('bitter', feedback.bitter);
      if (feedback.sour !== 0) updateTaste('sour', feedback.sour);
      if (feedback.savory !== 0) updateTaste('savory', feedback.savory);
    }

    const recipeName = firstItem ? `${firstItem.name} 듬뿍 카레` : '고구마 듬뿍 카레';
    const today = new Date();
    const dateString = `${today.getFullYear()}.${today.getMonth() + 1}.${today.getDate()}`; 
    
    addTriedRecipe({ id: Date.now().toString(), name: recipeName, date: dateString, rating, comment });

    setModalVisible(false);
    setFeedback({ spicy: 0, salty: 0, sweet: 0, bitter: 0, sour: 0, savory: 0 });
    setRating(0); setComment('');

    const alertMsg = isReflectTaste ? '별점과 피드백이 AI에 완벽하게 반영되었습니다!' : '입맛에는 반영하지 않고 홈 화면 기록에만 저장했습니다.';
    if (Platform.OS === 'web') window.alert(`저장 완료 🍽️\n${alertMsg}`);
    else Alert.alert('저장 완료 🍽️', alertMsg);
  };

  const renderScale = (type, labels) => {
    const values = [-2, -1, 0, 1, 2]; 
    return (
      <View style={styles.scaleGroup}>
        {values.map((val, idx) => (
          <TouchableOpacity key={idx} style={[styles.scaleBtn, feedback[type] === val && styles.scaleBtnActive]} onPress={() => setFeedback({ ...feedback, [type]: val })}>
            <Text style={[styles.scaleBtnText, feedback[type] === val && styles.scaleBtnTextActive]}>{labels[idx]}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}><Text style={styles.headerTitle}>AI 맞춤 레시피</Text></View>

      <View style={styles.statusBox}>
        {isPremium ? (
          <Text style={styles.premiumText}>👑 프리미엄 회원 (무제한 이용 중)</Text>
        ) : (
          <Text style={styles.freeText}>남은 무료 횟수: <Text style={{fontWeight: 'bold'}}>{freeCount}회</Text></Text>
        )}
      </View>
      <TouchableOpacity style={styles.mainGenerateButton} onPress={handleGenerateRecipe}>
        <Text style={styles.mainGenerateButtonText}>내 냉장고로 새 레시피 생성하기</Text>
      </TouchableOpacity>
      
      <View style={styles.categoryContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {categories.map((cat, index) => (
            <TouchableOpacity key={index} style={[styles.categoryBadge, selectedCategory === cat && styles.categoryBadgeActive]} onPress={() => setSelectedCategory(cat)}>
              <Text style={[styles.categoryText, selectedCategory === cat && styles.categoryTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.recipeCard}>
          <View style={styles.badge}><Text style={styles.badgeText}>✨ AI 맞춤 추천</Text></View>
          <Text style={styles.recipeTitle}>{firstItem ? `${firstItem.name} 듬뿍 카레` : '고구마 듬뿍 카레'}</Text>
          <Text style={styles.recipeDesc}>{firstItem ? `냉장고에 있는 '${firstItem.name}'을(를) 활용해 요리를 만들어보세요!` : '냉장고에 재료를 추가하면 맞춤 레시피를 추천해 드려요!'}</Text>
          
          <View style={styles.ingredientSection}>
            <Text style={styles.sectionTitle}>💡 스마트 식재료 대체</Text>
            <View style={styles.compareRow}>
              <View style={styles.itemBox}><Text style={styles.itemIcon}>🥔</Text><Text style={styles.oldItem}>감자 (없음)</Text></View>
              <Ionicons name="arrow-forward" size={24} color="#bdc3c7" style={styles.arrowIcon} />
              <View style={[styles.itemBox, styles.newItemBox]}>
                <Text style={styles.itemIcon}>{firstItem ? '✨' : '❓'}</Text> 
                <Text style={styles.newItem}>{firstItem ? `${firstItem.name}` : '재료 없음'}</Text>
              </View>
            </View>
          </View>

          <View style={styles.stepSection}>
            <Text style={styles.sectionTitle}>🍳 AI 맞춤 조리 순서</Text>
            <Text style={[styles.stepText, {marginBottom: 12}]}><Text style={{fontWeight: 'bold', color: '#1E293B'}}>1. 재료 손질:</Text> 양파와 고구마, 고기를 깍둑썰기 합니다.</Text>
            <Text style={[styles.stepText, {marginBottom: 12}]}><Text style={{fontWeight: 'bold', color: '#1E293B'}}>2. 재료 볶기:</Text> 냄비에 기름을 두르고 고기를 볶다가 채소를 볶아줍니다.</Text>
            <Text style={[styles.stepText, {marginBottom: 12}]}><Text style={{fontWeight: 'bold', color: '#1E293B'}}>3. 간 맞추기:</Text> 물 500ml를 넣고 끓어오르면 카레 가루를 넣습니다.</Text>
            <Text style={styles.stepText}><Text style={{fontWeight: 'bold', color: '#1E293B'}}>4. 마무리:</Text> 약불에서 15분간 푹 끓여 완성합니다.</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomButtonContainer}>
        <TouchableOpacity style={styles.cookButton} onPress={() => setModalVisible(true)}>
          <Text style={styles.cookButtonText}>요리 완료 & 입맛 가르치기</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={showAdModal} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.adModalBox}>
            <Text style={styles.adModalTitle}>무료 횟수를 모두 소진했어요! 🥲</Text>
            <Text style={styles.adModalDesc}>광고를 보고 1회 더 이용하거나,{'\n'}프리미엄 구독으로 무제한 이용해 보세요!</Text>
            
            <TouchableOpacity style={styles.adWatchButton} onPress={handleWatchAd}>
              <Ionicons name="play-circle-outline" size={20} color="#fff" />
              <Text style={styles.adButtonText}> 광고 보고 1회 무료 이용하기</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.premiumSubscribeButton} onPress={handleSubscribe}>
              <Ionicons name="star" size={20} color="#fff" />
              <Text style={styles.adButtonText}> 월 3,990원 무제한 구독하기</Text>
            </TouchableOpacity>

            <TouchableOpacity style={{marginTop: 15}} onPress={() => setShowAdModal(false)}>
              <Text style={{color: '#7f8c8d', textDecorationLine: 'underline'}}>다음에 할게요</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false} style={{ width: '100%' }}>
              <Text style={styles.feedbackModalTitle}>요리는 어떠셨나요? 😋</Text>
              <Text style={styles.feedbackModalSubtitle}>피드백을 통해 AI가 더 똑똑해집니다</Text>
              
              <View style={styles.ratingSection}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity key={star} onPress={() => setRating(star)}>
                    <Ionicons name={star <= rating ? "star" : "star-outline"} size={36} color="#f1c40f" style={styles.starIcon} />
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput style={styles.commentInput} placeholder="간단한 코멘트 남기기 (밥도둑이다 !)" value={comment} onChangeText={setComment} maxLength={30} />
              
              <View style={styles.divider} />
              <View style={styles.feedbackSection}>
                <View style={styles.feedbackRow}><Text style={styles.feedbackLabel}>🔥 매운맛</Text>{renderScale('spicy', ['너무\n맵다', '맵다', '딱\n좋다', '안\n맵다', '너무\n안맵다'])}</View>
                <View style={styles.feedbackRow}><Text style={styles.feedbackLabel}>🧂 짠맛 (간)</Text>{renderScale('salty', ['너무\n짜다', '짜다', '딱\n좋다', '싱겁다', '너무\n싱겁다'])}</View>
                <View style={styles.feedbackRow}><Text style={styles.feedbackLabel}>🍯 단맛</Text>{renderScale('sweet', ['너무\n달다', '달다', '딱\n좋다', '안\n달다', '너무\n안달다'])}</View>
                <View style={styles.feedbackRow}><Text style={styles.feedbackLabel}>☕ 쓴맛</Text>{renderScale('bitter', ['너무\n쓰다', '쓰다', '딱\n좋다', '안\n쓰다', '전혀\n안쓰다'])}</View>
                <View style={styles.feedbackRow}><Text style={styles.feedbackLabel}>🍋 신맛</Text>{renderScale('sour', ['너무\n시다', '시다', '딱\n좋다', '안\n시다', '전혀\n안시다'])}</View>
                <View style={styles.feedbackRow}><Text style={styles.feedbackLabel}>🥩 감칠맛</Text>{renderScale('savory', ['너무\n강함', '강함', '딱\n좋다', '약함', '너무\n약함'])}</View>
              </View>
            </ScrollView>

            <View style={styles.modalButtonGroup}>
              <TouchableOpacity style={styles.noReflectBtn} onPress={() => saveRecipeRecord(false)}>
                <Text style={styles.noReflectBtnText}>기록만 하고 내 입맛에는 반영 안 함 ❌</Text>
              </TouchableOpacity>
              
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
                <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}><Text style={styles.closeBtnText}>나중에 할게요</Text></TouchableOpacity>
                <TouchableOpacity style={styles.submitBtn} onPress={() => saveRecipeRecord(true)}><Text style={styles.submitBtnText}>입맛 반영하기 ✨</Text></TouchableOpacity>
              </View>
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
  
  // 💡 [수정됨] 여백(margin/padding)을 깎아서 전체적으로 버튼들을 위로 끌어올렸습니다.
  statusBox: { padding: 12, backgroundColor: '#f1f2f6', borderRadius: 10, alignItems: 'center', marginHorizontal: 15, marginBottom: 8 },
  freeText: { fontSize: 14, color: '#2c3e50' },
  premiumText: { fontSize: 14, color: '#e67e22', fontWeight: 'bold' },
  mainGenerateButton: { backgroundColor: '#3498db', padding: 14, borderRadius: 12, alignItems: 'center', marginHorizontal: 15, marginBottom: 15 },
  mainGenerateButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  // 💡 [수정됨] 카테고리 버튼이 잘리지 않도록 paddingVertical 값을 추가했습니다.
  categoryContainer: { backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 15, marginBottom: 5 },
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
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: Platform.OS === 'web' ? 'center' : 'flex-end', alignItems: Platform.OS === 'web' ? 'center' : 'stretch' },
  
  adModalBox: { width: '85%', backgroundColor: '#fff', padding: 25, borderRadius: 20, alignItems: 'center', alignSelf: 'center', marginBottom: Platform.OS === 'web' ? 0 : '50%' },
  adModalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  adModalDesc: { fontSize: 14, color: '#7f8c8d', textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  adWatchButton: { flexDirection: 'row', backgroundColor: '#3498db', padding: 15, borderRadius: 10, width: '100%', justifyContent: 'center', marginBottom: 10 },
  premiumSubscribeButton: { flexDirection: 'row', backgroundColor: '#9b59b6', padding: 15, borderRadius: 10, width: '100%', justifyContent: 'center' },
  adButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },

  modalContent: { width: '100%', maxWidth: Platform.OS === 'web' ? 400 : '100%', height: '90%', maxHeight: Platform.OS === 'web' ? 720 : '100%', backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, borderBottomLeftRadius: Platform.OS === 'web' ? 30 : 0, borderBottomRightRadius: Platform.OS === 'web' ? 30 : 0, padding: 25, alignItems: 'center', paddingBottom: 40 },
  feedbackModalTitle: { fontSize: 22, fontWeight: 'bold', color: '#2c3e50', marginBottom: 10, textAlign: 'center' },
  feedbackModalSubtitle: { fontSize: 14, color: '#7f8c8d', textAlign: 'center', marginBottom: 20 },
  ratingSection: { flexDirection: 'row', justifyContent: 'center', marginBottom: 15 },
  starIcon: { marginHorizontal: 5 },
  commentInput: { backgroundColor: '#f1f2f6', padding: 15, borderRadius: 10, fontSize: 14, color: '#2c3e50', marginBottom: 20, width: '100%' },
  divider: { height: 1, backgroundColor: '#eee', marginBottom: 20, width: '100%' },
  feedbackSection: { width: '100%', marginBottom: 10 },
  feedbackRow: { marginBottom: 20 },
  feedbackLabel: { fontSize: 15, fontWeight: 'bold', color: '#34495e', marginBottom: 10 },
  scaleGroup: { flexDirection: 'row', justifyContent: 'space-between' },
  scaleBtn: { flex: 1, backgroundColor: '#f1f2f6', paddingVertical: 12, marginHorizontal: 2, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  scaleBtnActive: { backgroundColor: '#3498db' },
  scaleBtnText: { color: '#7f8c8d', fontSize: 11, fontWeight: '600', textAlign: 'center', lineHeight: 16 },
  scaleBtnTextActive: { color: '#fff', fontWeight: 'bold' },
  modalButtonGroup: { width: '100%', marginTop: 10, paddingTop: 10, alignItems: 'center' },
  noReflectBtn: { backgroundColor: '#95a5a6', paddingVertical: 14, paddingHorizontal: 20, borderRadius: 12, marginBottom: 15, width: '100%', alignItems: 'center', justifyContent: 'center' },
  noReflectBtnText: { color: '#ffffff', fontSize: 15, fontWeight: 'bold' },
  closeBtn: { flex: 0.35, padding: 15, alignItems: 'center' },
  closeBtnText: { color: '#95a5a6', fontSize: 14, textDecorationLine: 'underline' },
  submitBtn: { flex: 0.6, backgroundColor: '#2ecc71', padding: 15, borderRadius: 12, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' }
});