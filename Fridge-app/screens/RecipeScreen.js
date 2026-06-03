import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { getRecipeDetailAPI, recommendRecipeAPI, sendRecipeChatAPI } from '../services/api';
import { useFridgeStore } from '../store/useFridgeStore';
import { useUserStore } from '../store/useUserStore';

export default function RecipeScreen() {
  const ingredients = useFridgeStore((state) => state.ingredients);
  const userProfile = useUserStore((state) => state.userProfile); 
  
  const updateTaste = useUserStore((state) => state.updateTaste);
  const addTriedRecipe = useUserStore((state) => state.addTriedRecipe);
  
  const isPremium = useUserStore((state) => state.isPremium);
  const freeCount = useUserStore((state) => state.freeCount);
  const setIsPremium = useUserStore((state) => state.setIsPremium);
  const decreaseFreeCount = useUserStore((state) => state.decreaseFreeCount);
  const addFreeCount = useUserStore((state) => state.addFreeCount);

  const [view, setView] = useState('list');
  const [selectedRecipe, setSelectedRecipe] = useState(null); 
  const [recipeDetailData, setRecipeDetailData] = useState(null); 

  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  
  const [recipeList, setRecipeList] = useState([]);

  const categories = ['✨ 추천', '⏱️ 초스피드'];
  const [selectedCategory, setSelectedCategory] = useState(categories[0]);
  
  const [showAdModal, setShowAdModal] = useState(false);
  const [modalVisible, setModalVisible] = useState(false); 
  
  const [chatVisible, setChatVisible] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setMessages] = useState([
    { id: 1, sender: 'bot', text: '이 레시피에 대해 궁금한 점이 있나요? 🤖' }
  ]);

  const [feedback, setFeedback] = useState({ spicy: 0, salty: 0, sweet: 0, bitter: 0, sour: 0, savory: 0 });
  const [rating, setRating] = useState(0); 
  const [comment, setComment] = useState(''); 

  const handleGenerateRecipe = async () => {
    if (isPremium) {
    } else if (freeCount > 0) {
      decreaseFreeCount();
    } else {
      setShowAdModal(true); 
      return;
    }

    setIsLoading(true); 
    
    try {
      const response = await recommendRecipeAPI({
        query: "내 냉장고 재료로 만들 수 있는 요리",
        allergies: userProfile.allergies || [],
        cookingTools: userProfile.kitchenTools || [],
        cookingHistory: [], 
        maxResults: 3
      });

      let fetchedRecipes = [];
      if (response.data && response.data.data && Array.isArray(response.data.data)) {
          fetchedRecipes = response.data.data;
      } else if (response.data && Array.isArray(response.data)) {
          fetchedRecipes = response.data;
      } else if (response.data && response.data.recipes && Array.isArray(response.data.recipes)) {
          fetchedRecipes = response.data.recipes;
      } else if (response.data && response.data.data && response.data.data.recipes && Array.isArray(response.data.data.recipes)) {
          fetchedRecipes = response.data.data.recipes;
      }

      setRecipeList(fetchedRecipes);

      if (fetchedRecipes.length === 0) {
          Alert.alert("알림", "조건에 맞는 레시피를 찾지 못했거나 데이터가 비어있습니다.");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("통신 오류", "서버와 연결할 수 없습니다. 🥲");
    } finally {
      setIsLoading(false); 
    }
  };

  const openRecipeDetail = async (recipe) => {
    setSelectedRecipe(recipe);
    setIsLoading(true);

    try {
      const recipeTitle = recipe.name || recipe.recipeName || '요리';

      const response = await getRecipeDetailAPI({
        recipeName: recipeTitle, 
        missingIngredients: recipe.missing_ingredients || [], 
        allergies: userProfile.allergies || [],
        selectedTools: userProfile.kitchenTools || [],
        cookingHistory: [], 
      });

      if (response.data.success || response.data) {
        const detailData = response.data.data || response.data;
        setRecipeDetailData(detailData); 
        
        // 임시 방 번호가 아니라, 서버가 주는 '진짜 방 번호'를 확실하게 저장합니다!
        const realSessionId = response.data.sessionId || response.data.data?.sessionId;

        
        console.log("서버가 준 방 번호:", realSessionId);

        setSessionId(realSessionId); 
        
        setMessages([{ id: 1, sender: 'bot', text: `'${recipeTitle}'에 대해 궁금한 점이 있나요? 🤖` }]);
        setView('detail'); 
      }
    } catch (error) {
      console.error(error);
      Alert.alert("통신 오류", "상세 레시피를 불러올 수 없습니다. 🥲");
    } finally {
      setIsLoading(false);
    }
  };

  const sendChatMessage = async (text) => {
    if (!text.trim()) return; 
    
    // 💡 [방어막] 방 번호가 아예 없으면 챗봇이 미리 알려줍니다.
    if (!sessionId) {
      setMessages(prev => [...prev, { id: Date.now(), sender: 'bot', text: "대화 세션이 끊어졌습니다. 뒤로 갔다가 다시 들어와주세요! 🥲" }]);
      return;
    }

    const newMsg = { id: Date.now(), sender: 'user', text };
    setMessages(prev => [...prev, newMsg]); 
    setChatInput('');

    setMessages(prev => [...prev, { id: 'loading', sender: 'bot', text: "AI가 열심히 답변을 준비 중입니다! 🛠️" }]);

    try {
      const response = await sendRecipeChatAPI({
        sessionId: sessionId,
        message: text
      });

      if (response.data.success || response.data) {
        const replyText = response.data.data?.reply || response.data?.reply || "AI가 답변을 생성했습니다.";
        
        setMessages(prev => prev.filter(msg => msg.id !== 'loading'));
        setMessages(prev => [...prev, { id: Date.now(), sender: 'bot', text: replyText }]);
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => prev.filter(msg => msg.id !== 'loading'));
      
      // 💡 [수정됨] 404 에러가 떴을 때 '진짜 원인'을 말풍선에 띄워줍니다!
      let errorMsg = "통신 오류가 발생했어요. 다시 질문해 주세요. 🥲";
      if (error.response && error.response.status === 404) {
          if (error.response.data && error.response.data.error) {
              // 백엔드가 방 번호를 잃어버렸을 때 보내는 메시지
              errorMsg = `서버 알림: ${error.response.data.error}`; 
          } else {
              // api.js 주소 오타일 때
              errorMsg = "서버 주소가 잘못되었습니다. (api.js 파일을 확인해주세요!)";
          }
      }
      setMessages(prev => [...prev, { id: Date.now(), sender: 'bot', text: errorMsg }]);
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

    const today = new Date();
    const dateString = `${today.getFullYear()}.${today.getMonth() + 1}.${today.getDate()}`; 
    
    addTriedRecipe({ id: Date.now().toString(), name: selectedRecipe?.name || selectedRecipe?.recipeName || '요리', date: dateString, rating, comment });

    setModalVisible(false);
    setFeedback({ spicy: 0, salty: 0, sweet: 0, bitter: 0, sour: 0, savory: 0 });
    setRating(0); setComment('');

    Alert.alert('저장 완료 🍽️', isReflectTaste ? '별점과 피드백이 완벽하게 반영되었습니다!' : '기록에만 저장했습니다.');
    setView('list'); 
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
      <View style={styles.header}>
        {view === 'detail' && (
          <TouchableOpacity onPress={() => setView('list')} style={{ marginRight: 15 }}>
            <Ionicons name="arrow-back" size={28} color="#2c3e50" />
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>{view === 'list' ? 'AI 맞춤 레시피' : '레시피 상세'}</Text>
      </View>

      {view === 'list' && (
        <>
          <View style={styles.statusBox}>
            {isPremium ? (
              <Text style={styles.premiumText}>👑 프리미엄 회원 (무제한 이용 중)</Text>
            ) : (
              <Text style={styles.freeText}>남은 무료 횟수: <Text style={{fontWeight: 'bold'}}>{freeCount}회</Text></Text>
            )}
          </View>
          <TouchableOpacity style={styles.mainGenerateButton} onPress={handleGenerateRecipe} disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.mainGenerateButtonText}>내 냉장고로 새 레시피 생성하기</Text>
            )}
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

          <ScrollView showsVerticalScrollIndicator={false} style={{ paddingHorizontal: 15 }}>
            <Text style={styles.listTitle}>요리 목록</Text>
            
            {recipeList.length === 0 && !isLoading && (
               <Text style={{textAlign: 'center', marginTop: 30, color: '#95a5a6'}}>버튼을 눌러 레시피를 추천받아 보세요!</Text>
            )}

            {(recipeList || []).map((recipe, index) => (
              <TouchableOpacity key={index} style={styles.recipeListItem} onPress={() => openRecipeDetail(recipe)}>
                <View>
                  <Text style={styles.listItemName}>{recipe.name || recipe.recipeName || '맛있는 요리'}</Text>
                  <Text style={styles.listItemInfo}>
                    난이도: {recipe.difficulty || '보통'} | 조리시간: {recipe.estimated_time_minutes ? `${recipe.estimated_time_minutes}분` : (recipe.cookTime || '20분')}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#bdc3c7" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </>
      )}

      {view === 'detail' && recipeDetailData && (
        <View style={{ flex: 1 }}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.recipeCard}>
              <View style={styles.badge}><Text style={styles.badgeText}>✨ AI 맞춤 추천</Text></View>
              <Text style={styles.recipeTitle}>{recipeDetailData.name || recipeDetailData.recipeName || selectedRecipe?.name}</Text>
              
              {selectedRecipe?.reason && (
                <View style={styles.reasonBox}>
                  <Text style={styles.reasonText}>💬 "{selectedRecipe.reason}"</Text>
                </View>
              )}

              <View style={styles.infoSection}>
                <Text style={styles.sectionTitle}>🛒 준비 재료</Text>
                <Text style={styles.infoText}>
                  ✅ 있는 재료: {selectedRecipe?.available_ingredients?.join(', ') || '없음'}
                </Text>
                {selectedRecipe?.missing_ingredients && selectedRecipe.missing_ingredients.length > 0 && (
                  <Text style={[styles.infoText, { color: '#e74c3c', marginTop: 5 }]}>
                    ❌ 부족한 재료: {selectedRecipe.missing_ingredients.join(', ')}
                  </Text>
                )}
              </View>

              <View style={styles.infoSection}>
                <Text style={styles.sectionTitle}>🍳 필요 주방 도구</Text>
                <Text style={styles.infoText}>
                  {selectedRecipe?.required_tools?.join(', ') || '특별한 도구 없음'}
                </Text>
              </View>

              <View style={styles.stepSection}>
                <Text style={styles.sectionTitle}>👨‍🍳 AI 맞춤 조리 순서</Text>
                {((recipeDetailData.steps || recipeDetailData.instructions) && (recipeDetailData.steps || recipeDetailData.instructions).length > 0) ? (
                  (recipeDetailData.steps || recipeDetailData.instructions).map((step, index) => (
                      <Text key={index} style={[styles.stepText, {marginBottom: 12}]}>
                        <Text style={{fontWeight: 'bold', color: '#3498db'}}>{index + 1}. </Text>
                        {step}
                      </Text>
                  ))
                ) : (
                  <Text style={styles.stepText}>조리 순서를 불러오는 중이거나 데이터가 없습니다.</Text>
                )}
              </View>
            </View>
          </ScrollView>

          <TouchableOpacity style={styles.chatFab} onPress={() => setChatVisible(true)}>
            <Ionicons name="chatbubble-ellipses" size={30} color="white" />
          </TouchableOpacity>

          <View style={styles.bottomButtonContainer}>
            <TouchableOpacity style={styles.cookButton} onPress={() => setModalVisible(true)}>
              <Text style={styles.cookButtonText}>요리 완료 & 입맛 가르치기</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 💡 [수정됨] 챗봇 모달에 키보드 회피(KeyboardAvoidingView) 적용 */}
      <Modal animationType="slide" transparent={true} visible={chatVisible} onRequestClose={() => setChatVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <View style={styles.chatModalContent}>
              <View style={styles.chatHeader}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#2c3e50' }}>{selectedRecipe?.name || selectedRecipe?.recipeName} 도우미 🤖</Text>
                <TouchableOpacity onPress={() => setChatVisible(false)}><Ionicons name="close" size={28} color="#bdc3c7" /></TouchableOpacity>
              </View>
              <ScrollView style={styles.chatArea} showsVerticalScrollIndicator={false}>
                {chatMessages.map(msg => (
                  <View key={msg.id} style={[styles.chatBubble, msg.sender === 'user' ? styles.chatBubbleUser : styles.chatBubbleBot]}>
                    <Text style={msg.sender === 'user' ? { color: '#fff', fontSize: 15 } : { color: '#333', fontSize: 15 }}>{msg.text}</Text>
                  </View>
                ))}
              </ScrollView>
              <View style={styles.chatInputRow}>
                <TextInput style={styles.chatInputBox} placeholder="질문을 자유롭게 입력하세요..." value={chatInput} onChangeText={setChatInput} onSubmitEditing={() => sendChatMessage(chatInput)}/>
                <TouchableOpacity style={styles.chatSendBtn} onPress={() => sendChatMessage(chatInput)}><Ionicons name="send" size={20} color="white" /></TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false} style={{ width: '100%' }}>
              <Text style={styles.feedbackModalTitle}>요리는 어떠셨나요? 😋</Text>
              <Text style={styles.feedbackModalSubtitle}>피드백을 통해 AI가 더 똑똑해집니다</Text>
              <View style={styles.ratingSection}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity key={star} onPress={() => setRating(star)}><Ionicons name={star <= rating ? "star" : "star-outline"} size={36} color="#f1c40f" style={styles.starIcon} /></TouchableOpacity>
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
              <TouchableOpacity style={styles.noReflectBtn} onPress={() => saveRecipeRecord(false)}><Text style={styles.noReflectBtnText}>기록만 하고 내 입맛에는 반영 안 함 ❌</Text></TouchableOpacity>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
                <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}><Text style={styles.closeBtnText}>나중에 할게요</Text></TouchableOpacity>
                <TouchableOpacity style={styles.submitBtn} onPress={() => saveRecipeRecord(true)}><Text style={styles.submitBtnText}>입맛 반영하기 ✨</Text></TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showAdModal} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.adModalBox}>
            <Text style={styles.adModalTitle}>무료 횟수를 모두 소진했어요! 🥲</Text>
            <Text style={styles.adModalDesc}>광고를 보고 1회 더 이용하거나,{'\n'}프리미엄 구독으로 무제한 이용해 보세요!</Text>
            <TouchableOpacity style={styles.adWatchButton} onPress={handleWatchAd}><Ionicons name="play-circle-outline" size={20} color="#fff" /><Text style={styles.adButtonText}> 광고 보고 1회 무료 이용하기</Text></TouchableOpacity>
            <TouchableOpacity style={styles.premiumSubscribeButton} onPress={handleSubscribe}><Ionicons name="star" size={20} color="#fff" /><Text style={styles.adButtonText}> 월 3,990원 무제한 구독하기</Text></TouchableOpacity>
            <TouchableOpacity style={{marginTop: 15}} onPress={() => setShowAdModal(false)}><Text style={{color: '#7f8c8d', textDecorationLine: 'underline'}}>다음에 할게요</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 60, backgroundColor: '#fff', paddingBottom: 15 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#2c3e50' },
  
  statusBox: { padding: 12, backgroundColor: '#f1f2f6', borderRadius: 10, alignItems: 'center', marginHorizontal: 15, marginBottom: 8 },
  freeText: { fontSize: 14, color: '#2c3e50' },
  premiumText: { fontSize: 14, color: '#e67e22', fontWeight: 'bold' },
  mainGenerateButton: { backgroundColor: '#3498db', padding: 14, borderRadius: 12, alignItems: 'center', marginHorizontal: 15, marginBottom: 15, height: 50, justifyContent: 'center' },
  mainGenerateButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  listTitle: { fontSize: 18, fontWeight: 'bold', color: '#34495e', marginBottom: 10, marginTop: 10 },
  recipeListItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 18, borderRadius: 12, marginBottom: 10, elevation: 1 },
  listItemName: { fontSize: 16, fontWeight: 'bold', color: '#2c3e50', marginBottom: 5 },
  listItemInfo: { fontSize: 13, color: '#7f8c8d' },

  categoryContainer: { backgroundColor: '#fff', paddingVertical: 5, paddingHorizontal: 15, marginBottom: 5 },
  categoryBadge: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f1f2f6', marginRight: 10 },
  categoryBadgeActive: { backgroundColor: '#2ecc71' },
  categoryText: { color: '#7f8c8d', fontWeight: '600' },
  categoryTextActive: { color: '#fff' },
  
  recipeCard: { backgroundColor: '#fff', margin: 15, padding: 20, borderRadius: 15, elevation: 2 },
  badge: { alignSelf: 'flex-start', backgroundColor: '#e8f8f5', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, marginBottom: 10 },
  badgeText: { color: '#1abc9c', fontWeight: 'bold', fontSize: 12 },
  recipeTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 15, color: '#2c3e50' },
  
  reasonBox: { backgroundColor: '#f8f9fa', padding: 15, borderRadius: 10, marginBottom: 25 },
  reasonText: { fontSize: 14, color: '#34495e', fontStyle: 'italic', lineHeight: 20 },
  infoSection: { marginBottom: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#f1f2f6' },
  infoText: { fontSize: 15, color: '#2c3e50', marginTop: 5, lineHeight: 22 },

  stepSection: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#34495e', marginBottom: 10 },
  stepText: { fontSize: 15, color: '#34495e', marginBottom: 8, lineHeight: 24 },
  
  bottomButtonContainer: { padding: 20, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#f1f2f6' },
  cookButton: { backgroundColor: '#2ecc71', padding: 15, borderRadius: 12, alignItems: 'center' },
  cookButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  
  chatFab: { position: 'absolute', bottom: 100, right: 20, backgroundColor: '#3498db', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 8, zIndex: 100 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: Platform.OS === 'web' ? 'center' : 'flex-end', alignItems: Platform.OS === 'web' ? 'center' : 'stretch' },
  chatModalContent: { width: '100%', maxWidth: Platform.OS === 'web' ? 400 : '100%', height: '80%', backgroundColor: '#fff', borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 20, paddingBottom: 30 },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 15, marginBottom: 15 },
  chatArea: { flex: 1, marginBottom: 10 },
  chatBubble: { padding: 14, borderRadius: 18, maxWidth: '85%', marginBottom: 10 },
  chatBubbleBot: { backgroundColor: '#f1f2f6', alignSelf: 'flex-start', borderBottomLeftRadius: 5 },
  chatBubbleUser: { backgroundColor: '#3498db', alignSelf: 'flex-end', borderBottomRightRadius: 5 },
  chatInputRow: { flexDirection: 'row', alignItems: 'center' },
  chatInputBox: { flex: 1, backgroundColor: '#f1f2f6', borderRadius: 25, paddingHorizontal: 20, paddingVertical: 12, marginRight: 10, fontSize: 15 },
  chatSendBtn: { backgroundColor: '#2ecc71', width: 45, height: 45, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },

  adModalBox: { width: '85%', backgroundColor: '#fff', padding: 25, borderRadius: 20, alignItems: 'center', alignSelf: 'center', marginBottom: Platform.OS === 'web' ? 0 : '50%' },
  adModalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  adModalDesc: { fontSize: 14, color: '#7f8c8d', textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  adWatchButton: { flexDirection: 'row', backgroundColor: '#3498db', padding: 15, borderRadius: 10, width: '100%', justifyContent: 'center', marginBottom: 10 },
  premiumSubscribeButton: { flexDirection: 'row', backgroundColor: '#9b59b6', padding: 15, borderRadius: 10, width: '100%', justifyContent: 'center' },
  adButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },

  modalContent: { width: '100%', maxWidth: Platform.OS === 'web' ? 400 : '100%', height: '90%', maxHeight: Platform.OS === 'web' ? 720 : '100%', backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, alignItems: 'center', paddingBottom: 40 },
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