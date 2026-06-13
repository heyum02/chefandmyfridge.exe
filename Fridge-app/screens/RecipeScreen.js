import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { getRecipeDetailAPI, recommendRecipeAPI, sendRecipeChatAPI, addHistoryAPI } from '../services/api';
import { useFridgeStore } from '../store/useFridgeStore';
import { useUserStore } from '../store/useUserStore';

export default function RecipeScreen() {
  const ingredients = useFridgeStore((state) => state.ingredients);
  const fetchIngredients = useFridgeStore((state) => state.fetchIngredients);

  const userProfile = useUserStore((state) => state.userProfile);
  const addTriedRecipe = useUserStore((state) => state.addTriedRecipe);
  const updateTaste = useUserStore((state) => state.updateTaste);

  const isPremium = useUserStore((state) => state.isPremium);
  const freeCount = useUserStore((state) => state.freeCount);
  const setIsPremium = useUserStore((state) => state.setIsPremium);
  const decreaseFreeCount = useUserStore((state) => state.decreaseFreeCount);
  const addFreeCount = useUserStore((state) => state.addFreeCount);

  const [view, setView] = useState('list');
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [recipeDetailData, setRecipeDetailData] = useState(null);

  const [isMainLoading, setIsMainLoading] = useState(false);
  const [isUrgentLoading, setIsUrgentLoading] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  const [sessionId, setSessionId] = useState(null);
  const [recipeList, setRecipeList] = useState([]);

  const [prepModalVisible, setPrepModalVisible] = useState(false);
  const [prepServings, setPrepServings] = useState(1);
  const [prepUserPrompt, setPrepUserPrompt] = useState('');
  const [isUrgentMode, setIsUrgentMode] = useState(false);

  const quickRequests = ['✨ SnapCook 추천', '💪 다이어트/건강', '🌶️ 매콤 칼칼하게', '🥗 담백하고 싱겁게', '🍲 뜨끈한 국물 요리', '🍳 설거지 적은 초간단', '🍺 시원한 안주용'];
  const [selectedTags, setSelectedTags] = useState([]);

  const [showAdModal, setShowAdModal] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const [usedIngredients, setUsedIngredients] = useState([]);

  const [chatVisible, setChatVisible] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setMessages] = useState([{ id: 1, sender: 'bot', text: '이 레시피에 대해 궁금한 점이 있나요? 🤖' }]);

  const [feedback, setFeedback] = useState({ spicy: 0, salty: 0, sweet: 0, bitter: 0, sour: 0, savory: 0 });
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  const [isBookmarked, setIsBookmarked] = useState(false);

  const urgentItems = (ingredients || []).filter(item => {
    if (!item.expiryDate) return false;
    const expDate = new Date(item.expiryDate.replace(/\./g, '-'));
    const today = new Date();
    expDate.setHours(0, 0, 0, 0); today.setHours(0, 0, 0, 0);
    const diffDays = Math.round((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 3;
  });

  const toggleTagSelection = (tag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const openPrepModal = (isUrgent) => {
    setIsUrgentMode(isUrgent);
    setPrepServings(1);
    setPrepUserPrompt('');
    setSelectedTags([]);
    setPrepModalVisible(true);
  };

  const handleGenerateRecipe = async () => {
    setPrepModalVisible(false);
    if (!isPremium && freeCount <= 0) { setShowAdModal(true); return; }
    if (!isPremium) decreaseFreeCount();

    if (isUrgentMode) setIsUrgentLoading(true);
    else setIsMainLoading(true);

    let finalQuery = "내 냉장고 재료로 만들 수 있는 요리를 추천해 줘.";

    if (isUrgentMode) {
      const urgentNames = urgentItems.map(i => i.name).join(', ');
      finalQuery = `유통기한이 3일 이내로 남은 [${urgentNames}]를 무조건 최우선으로 소비할 수 있는 레시피를 추천해 줘.`;
    }

    const combinedPrompt = [...selectedTags, prepUserPrompt.trim()].filter(Boolean).join(', ');

    try {
      const response = await recommendRecipeAPI({
        query: finalQuery,
        user_prompt: combinedPrompt,
        servings: prepServings,
        allergies: userProfile.allergies || [],
        cookingTools: userProfile.kitchenTools || [],
        maxResults: 5
      });

      let safeList = [];
      if (Array.isArray(response.data?.data)) safeList = response.data.data;
      else if (Array.isArray(response.data)) safeList = response.data;
      else if (response.data?.recipes && Array.isArray(response.data.recipes)) safeList = response.data.recipes;

      setRecipeList(safeList);
    } catch (error) {
      Alert.alert("통신 오류", "서버와 연결할 수 없습니다.");
    } finally {
      setIsMainLoading(false);
      setIsUrgentLoading(false);
    }
  };

  const openRecipeDetail = async (recipe) => {
    setSelectedRecipe(recipe);
    setIsDetailLoading(true);
    setIsBookmarked(false);

    try {
      const recipeTitle = recipe.name || recipe.recipeName || recipe.recipe_name || '요리';
      let missing = recipe.missing_ingredients || recipe.missingIngredients || [];
      if (!Array.isArray(missing)) missing = [];
      missing = missing.map(ing => typeof ing === 'string' ? ing.replace(/\s*\(없는\s*재료\)\s*/g, '').trim() : ing);

      const response = await getRecipeDetailAPI({
        recipeName: recipeTitle,
        servings: prepServings,
        missingIngredients: missing,
        allergies: userProfile.allergies || [],
        selectedTools: userProfile.kitchenTools || []
      });

      if (response.data) {
        let detailData = response.data.data || response.data;

        let safeSteps = detailData.instructions || detailData.steps || [];
        if (!Array.isArray(safeSteps)) safeSteps = typeof safeSteps === 'string' ? [safeSteps] : [];
        detailData.steps = safeSteps;

        let rawSubs = detailData.ingredients?.substitutions || detailData.substitute_ingredients || [];
        if (!Array.isArray(rawSubs)) rawSubs = [];
        detailData.substitute_ingredients = rawSubs.map(sub => ({
          missing: sub.original_ingredient || sub.missing || '알 수 없음',
          alternative: sub.substitute || sub.alternative || '대체재',
          reason: sub.reason ? `${sub.reason} ${sub.notes || ''}` : (sub.notes || '')
        }));

        let finalMissing = [...missing];
        detailData.substitute_ingredients.forEach(sub => {
          if (sub.missing && sub.missing !== '알 수 없음' && !finalMissing.includes(sub.missing)) {
            finalMissing.push(sub.missing);
          }
        });
        detailData.final_missing_ingredients = finalMissing;

        let rawIngs = detailData.ingredients?.final_used || detailData.required_ingredients || [];
        let safeIngs = [];
        if (Array.isArray(rawIngs)) {
          safeIngs = rawIngs.map(ing => {
            let nameStr = '';
            let amountStr = '적당량';

            if (typeof ing === 'string') {
              const parts = ing.split(' ');
              amountStr = parts.length > 1 ? parts.pop() : '적당량';
              nameStr = parts.join(' ') || ing;
            } else {
              nameStr = ing.name || '알 수 없는 재료';
              amountStr = String(ing.amount || '적당량');
            }

            const isMissingOrSub = finalMissing.some(m => nameStr.includes(m) || m.includes(nameStr)) ||
              detailData.substitute_ingredients.some(sub =>
                nameStr.includes(sub.alternative) || sub.alternative.includes(nameStr) ||
                nameStr.includes(sub.missing) || sub.missing.includes(nameStr)
              );

            return {
              name: nameStr,
              amount: amountStr,
              isUsed: !isMissingOrSub,
              rawText: typeof ing === 'string' ? ing : `${nameStr} ${amountStr}`.trim()
            };
          });
        }
        setUsedIngredients(safeIngs);

        setRecipeDetailData(detailData);
        setSessionId(response.data.sessionId);
        setMessages([{ id: 1, sender: 'bot', text: `'${recipeTitle}'에 대해 궁금한 점이 있나요? 🤖` }]);
        setView('detail');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.detail || error.response?.data?.error || error.message || "서버 응답 없음";
      console.log("상세 레시피 에러 로그:", errorMessage);
      Alert.alert("상세 레시피 오류 🥲", `상세 정보를 처리하는 중 문제가 발생했습니다.\n\n[에러 내용]\n${errorMessage}`);
    } finally {
      setIsDetailLoading(false);
    }
  };

  const sendChatMessage = async (text) => {
    if (!text.trim() || !sessionId) return;
    const newMsg = { id: Date.now(), sender: 'user', text };
    setMessages(prev => [...prev, newMsg, { id: 'loading', sender: 'bot', text: "답변 생성 중... 🛠️" }]);
    setChatInput('');

    try {
      const response = await sendRecipeChatAPI({ sessionId, message: text });
      if (response.data) {
        const data = response.data.data || response.data;
        let replyText = data.answer_summary || "답변을 불러오지 못했습니다.";
        if (data.tips && data.tips.length > 0) replyText += "\n\n💡 꿀팁:\n- " + data.tips.join("\n- ");
        setMessages(prev => prev.filter(msg => msg.id !== 'loading'));
        setMessages(prev => [...prev, { id: Date.now(), sender: 'bot', text: replyText }]);
      }
    } catch (error) {
      setMessages(prev => prev.filter(msg => msg.id !== 'loading'));
      setMessages(prev => [...prev, { id: Date.now(), sender: 'bot', text: "통신 오류가 발생했습니다." }]);
    }
  };

  const openFeedbackModal = () => {
    setRating(0);
    setComment('');
    setFeedback({ spicy: 0, salty: 0, sweet: 0, bitter: 0, sour: 0, savory: 0 });
    setIsBookmarked(false);
    setModalVisible(true);
  };

  const toggleBookmark = () => {
    const newState = !isBookmarked;
    setIsBookmarked(newState);

    if (addTriedRecipe) {
      addTriedRecipe({
        id: Date.now().toString(),
        name: recipeDetailData?.name || selectedRecipe?.name || selectedRecipe?.recipeName || '요리',
        date: new Date().toLocaleDateString(),
        rating: 0,
        comment: '',
        isBookmark: newState
      });
    }
    if (newState) Alert.alert("즐겨찾기 완료 💛", "마이페이지에서 확인할 수 있습니다.");
  };

  const saveRecipeRecord = async (isReflectTaste) => {
    if (rating === 0) { Alert.alert('알림', '별점을 선택해주세요!'); return; }

    const recipeName = selectedRecipe?.name || selectedRecipe?.recipeName || recipeDetailData?.name || '요리';

    try {
      await addHistoryAPI({
        name: recipeName,
        date: new Date().toLocaleDateString(),
        rating, comment,
        tasteFeedback: isReflectTaste ? feedback : null
      });

      if (addTriedRecipe) {
        addTriedRecipe({
          id: Date.now().toString(),
          name: recipeName,
          date: new Date().toLocaleDateString(),
          rating,
          comment,
          isBookmark: isBookmarked
        });
      }

      if (isReflectTaste && updateTaste) {
        updateTaste(feedback);
      }

      setModalVisible(false);
      setView('list');
      Alert.alert('저장 완료 🍽️', isReflectTaste ? '요리 기록이 저장되고 입맛이 반영되었습니다!' : '요리 기록이 안전하게 저장되었습니다.');
    } catch (error) {
      Alert.alert('저장 실패', '서버 통신 중 오류가 발생했습니다.');
    }
  };

  const handleWatchAd = () => {
    setShowAdModal(false);
    addFreeCount(1);
    Alert.alert("광고 시청 완료", "보상으로 레시피 1회 이용권이 지급되었습니다!");
  };

  const handleSubscribe = () => {
    setShowAdModal(false);
    setIsPremium(true);
    Alert.alert("구독 완료 🎉", "프리미엄 회원이 되셨습니다!");
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

  const availableIngs = selectedRecipe?.available_ingredients || selectedRecipe?.availableIngredients || [];
  const missingIngsToDisplay = recipeDetailData?.final_missing_ingredients || [];

  const rawSubstituteIngs = recipeDetailData?.substitute_ingredients || [];
  const validSubstituteIngs = rawSubstituteIngs.filter(sub => {
    if (typeof sub === 'string') return !sub.includes('없음') && !sub.includes('불가') && !sub.includes('이미 보유');
    const alt = sub.alternative || '';
    const miss = sub.missing || '';
    if (alt.includes('없음') || alt.includes('불가') || alt.includes('이미 보유') || alt.includes('대체 재료 없음')) return false;
    if (miss === alt) return false;
    return true;
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {view === 'detail' && <TouchableOpacity onPress={() => setView('list')} style={{ marginRight: 10 }}><Ionicons name="arrow-back" size={28} color="#2c3e50" /></TouchableOpacity>}
        <Text style={styles.headerTitle}>{view === 'list' ? 'AI 맞춤 레시피' : '레시피 상세'}</Text>
      </View>

      {view === 'list' && (
        <>
          <View style={styles.statusBox}>
            {isPremium ? <Text style={styles.premiumText}>👑 프리미엄 회원 (무제한 이용 중)</Text> : <Text style={styles.freeText}>남은 무료 횟수: <Text style={{ fontWeight: 'bold' }}>{freeCount}회</Text></Text>}
          </View>

          {(isMainLoading || isUrgentLoading || isDetailLoading) ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3498db" />
              <Text style={styles.loadingText}>
                {isDetailLoading
                  ? `기존 레시피를 ${userProfile?.nickname || '회원'}님 맞춤 레시피로\n바꾸고 있는 중입니다. 잠시만 기다려주세요 🍳`
                  : `${userProfile?.nickname || '회원'}님 맞춤 레시피를 찾고 있는 중입니다.\n조금만 기다려 주세요 🔍`}
              </Text>
            </View>
          ) : (
            <>
              <TouchableOpacity style={styles.mainGenerateButton} onPress={() => openPrepModal(false)}>
                <Text style={styles.mainGenerateButtonText}>내 냉장고 맞춤 레시피 추천받기</Text>
              </TouchableOpacity>

              {urgentItems.length > 0 && (
                <TouchableOpacity style={styles.urgentGenerateButton} onPress={() => openPrepModal(true)}>
                  <Text style={styles.urgentGenerateButtonText}>🚨 임박 식재료 ({urgentItems.length}개) 파기 추천</Text>
                </TouchableOpacity>
              )}

              <ScrollView showsVerticalScrollIndicator={false} style={{ paddingHorizontal: 15 }}>
                {recipeList.length > 0 ? (
                  <Text style={styles.listSubtitle}>
                    🧑‍🍳 회원님이 가지고 계신 식재료가 많이 포함된 순서대로 레시피를 추천합니다.
                  </Text>
                ) : (
                  <Text style={{ textAlign: 'center', marginTop: 30, color: '#95a5a6' }}>버튼을 눌러 레시피를 추천받아 보세요!</Text>
                )}

                {recipeList.map((recipe, index) => (
                  <TouchableOpacity key={index} style={styles.recipeListItem} onPress={() => openRecipeDetail(recipe)}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.listItemName}>{recipe.name || recipe.recipeName || recipe.recipe_name}</Text>
                      <Text style={styles.listItemInfo}>난이도: {recipe.difficulty || '보통'} | 조리시간: {recipe.estimated_time_minutes ? `${recipe.estimated_time_minutes}분` : (recipe.cookTime || '20분')}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={24} color="#bdc3c7" />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}
        </>
      )}

      {view === 'detail' && recipeDetailData && (
        <View style={{ flex: 1 }}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.recipeCard}>
              <View style={styles.badge}><Text style={styles.badgeText}>✨ AI 맞춤 추천 ({prepServings}인분)</Text></View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 }}>
                <Text style={[styles.recipeTitle, { flex: 1, marginBottom: 0 }]}>
                  {recipeDetailData.name || recipeDetailData.recipeName || selectedRecipe?.name || selectedRecipe?.recipeName}
                </Text>
              </View>

              <View style={styles.infoSection}>
                <Text style={styles.sectionTitle}>🛒 준비 재료</Text>

                <Text style={styles.infoText}>✅ 있는 재료: {availableIngs.length > 0 ? availableIngs.join(', ') : '없음'}</Text>

                {missingIngsToDisplay.length > 0 && (
                  <Text style={[styles.infoText, { color: '#e74c3c', marginTop: 5 }]}>❌ 부족한 재료: {missingIngsToDisplay.join(', ')}</Text>
                )}

                {validSubstituteIngs.length > 0 && (
                  <View style={styles.substituteBox}>
                    <Text style={{ fontWeight: 'bold', color: '#8e44ad', marginBottom: 10 }}>💡 부족한 재료는 이렇게 대체해 보세요!</Text>
                    {validSubstituteIngs.map((sub, idx) => (
                      <View key={idx} style={{ marginBottom: 12 }}>
                        <Text style={{ color: '#2c3e50', fontSize: 14, fontWeight: 'bold' }}>
                          • {sub.missing} ➡️ {sub.alternative}
                        </Text>
                        {sub.reason ? (
                          <Text style={{ color: '#7f8c8d', fontSize: 13, marginTop: 4, paddingLeft: 14 }}>
                            설명: {sub.reason.replace(/^\(|\)$/g, '')}
                          </Text>
                        ) : null}
                      </View>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.stepSection}>
                <Text style={styles.sectionTitle}>👨‍🍳 조리 순서</Text>
                {recipeDetailData.steps.map((step, index) => {
                  const cleanText = step.replace(/^[\d\s\.\:단계]+(?:준비하기\s*[\-\:]\s*)?/, '').trim();
                  return (
                    <Text key={index} style={[styles.stepText, { marginBottom: 12 }]}>
                      <Text style={{ fontWeight: 'bold', color: '#3498db' }}>{index + 1}. </Text>{cleanText}
                    </Text>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          <TouchableOpacity style={styles.chatFab} onPress={() => setChatVisible(true)}>
            <Ionicons name="chatbubble-ellipses" size={30} color="white" />
          </TouchableOpacity>

          <View style={styles.bottomButtonContainer}>
            <TouchableOpacity style={styles.cookButton} onPress={openFeedbackModal}>
              <Text style={styles.cookButtonText}>요리 완료 & 입맛 가르치기</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <Modal animationType="fade" transparent={true} visible={prepModalVisible} onRequestClose={() => setPrepModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { height: '80%' }]}>

              <View style={styles.modalBody}>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>맞춤 추천 준비 📝</Text>
                  </View>

                  <Text style={styles.sectionSubtitle}>몇 인분을 준비하시나요?</Text>
                  <View style={styles.prepAmountContainer}>
                    <TouchableOpacity style={styles.prepAmountBtn} onPress={() => setPrepServings(Math.max(1, prepServings - 1))}><Ionicons name="remove" size={20} /></TouchableOpacity>
                    <Text style={styles.prepAmountText}>{prepServings} 인분</Text>
                    <TouchableOpacity style={styles.prepAmountBtn} onPress={() => setPrepServings(prepServings + 1)}><Ionicons name="add" size={20} /></TouchableOpacity>
                  </View>

                  <Text style={styles.sectionSubtitle}>선택형 빠른 요청 (중복 가능)</Text>
                  <View style={styles.chipContainer}>
                    {quickRequests.map((tag) => (
                      <TouchableOpacity key={tag} style={[styles.chip, selectedTags.includes(tag) && styles.activeChip]} onPress={() => toggleTagSelection(tag)}>
                        <Text style={[styles.chipText, selectedTags.includes(tag) && styles.activeChipText]}>{tag}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.sectionSubtitle}>원하는 재료나 특별한 요청이 있나요?</Text>
                  <TextInput style={styles.promptInput} placeholder="예: 감자 2개를 꼭 써줘, 매콤하게 개조해줘" value={prepUserPrompt} onChangeText={setPrepUserPrompt} multiline />
                </ScrollView>
              </View>

              <View style={styles.modalFooter}>
                <TouchableOpacity style={styles.closeBtn} onPress={() => setPrepModalVisible(false)}><Text style={styles.closeBtnText}>취소</Text></TouchableOpacity>
                <TouchableOpacity style={styles.submitBtn} onPress={handleGenerateRecipe}>
                  <Text style={styles.submitBtnText}>추천받기 ✨</Text>
                </TouchableOpacity>
              </View>

            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { height: '90%' }]}>

              <View style={styles.modalBody}>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.feedbackModalTitle}>요리는 어떠셨나요? 😋</Text>
                  </View>

                  <View style={styles.ratingSection}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <TouchableOpacity key={star} onPress={() => setRating(star)}><Ionicons name={star <= rating ? "star" : "star-outline"} size={36} color="#f1c40f" style={{ marginHorizontal: 5 }} /></TouchableOpacity>
                    ))}
                  </View>
                  <TextInput style={styles.commentInput} placeholder="간단한 코멘트를 작성해 주세요" value={comment} onChangeText={setComment} />

                  <TouchableOpacity style={styles.bookmarkToggleRow} onPress={() => setIsBookmarked(!isBookmarked)}>
                    <Ionicons name={isBookmarked ? "bookmark" : "bookmark-outline"} size={24} color={isBookmarked ? "#f1c40f" : "#bdc3c7"} />
                    <Text style={styles.bookmarkToggleText}>⭐ 이 레시피 즐겨찾기 (마이페이지에 저장)</Text>
                  </TouchableOpacity>

                  <View style={styles.usedIngSection}>
                    <Text style={styles.feedbackLabel}>🛒 이 레시피에 쓰인 재료량 ({prepServings}인분)</Text>
                    <Text style={{ fontSize: 12, color: '#7f8c8d', marginBottom: 10 }}>* 수량을 적어도 냉장고에서 차감되지는 않습니다.</Text>

                    <ScrollView nestedScrollEnabled={true} style={{ maxHeight: 250 }}>
                      {usedIngredients.map((item, index) => (
                        <View key={index} style={styles.usedItemRow}>

                          <Text style={[styles.usedItemName, !item.isUsed && { textDecorationLine: 'line-through', color: '#bdc3c7' }]}>
                            {item.name}
                          </Text>

                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <TextInput
                              style={[styles.customUnitInput, !item.isUsed && { color: '#bdc3c7', borderColor: '#eee' }]}
                              value={item.amount}
                              onChangeText={(text) => {
                                const newArr = [...usedIngredients];
                                newArr[index].amount = text;
                                setUsedIngredients(newArr);
                              }}
                              editable={item.isUsed}
                              placeholder="수량 입력"
                            />
                            <TouchableOpacity onPress={() => {
                              const newArr = [...usedIngredients];
                              newArr[index].isUsed = !newArr[index].isUsed;
                              setUsedIngredients(newArr);
                            }}>
                              <Text style={item.isUsed ? styles.usedToggleOn : styles.usedToggleOff}>
                                {item.isUsed ? '사용함' : '사용 안 함'}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </ScrollView>
                  </View>

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
              </View>

              <View style={styles.feedbackFooter}>
                <TouchableOpacity style={styles.noReflectBtn} onPress={() => saveRecipeRecord(false)}>
                  <Text style={styles.noReflectBtnText}>기록만 하고 내 입맛에는 반영 안 함 ❌</Text>
                </TouchableOpacity>
                <View style={styles.feedbackFooterRow}>
                  <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}>
                    <Text style={styles.closeBtnText}>나중에 할게요</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.submitBtn} onPress={() => saveRecipeRecord(true)}>
                    <Text style={styles.submitBtnText}>입맛 반영하기 ✨</Text>
                  </TouchableOpacity>
                </View>
              </View>

            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showAdModal} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.adModalBox}>
            <Text style={styles.adModalTitle}>무료 횟수를 모두 소진했어요! 🥲</Text>
            <Text style={styles.adModalDesc}>광고를 보고 1회 더 이용하거나,{'\n'}프리미엄 구독으로 무제한 이용해 보세요!</Text>
            <TouchableOpacity style={styles.adWatchButton} onPress={handleWatchAd}><Ionicons name="play-circle-outline" size={20} color="#fff" /><Text style={styles.adButtonText}> 광고 보고 1회 무료 이용하기</Text></TouchableOpacity>
            <TouchableOpacity style={styles.premiumSubscribeButton} onPress={handleSubscribe}><Ionicons name="star" size={20} color="#fff" /><Text style={styles.adButtonText}> 월 3,990원 무제한 구독하기</Text></TouchableOpacity>
            <TouchableOpacity style={{ marginTop: 15 }} onPress={() => setShowAdModal(false)}><Text style={{ color: '#7f8c8d', textDecorationLine: 'underline' }}>다음에 할게요</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

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
                <TextInput style={styles.chatInputBox} placeholder="질문을 자유롭게 입력하세요..." value={chatInput} onChangeText={setChatInput} onSubmitEditing={() => sendChatMessage(chatInput)} />
                <TouchableOpacity style={styles.chatSendBtn} onPress={() => sendChatMessage(chatInput)}><Ionicons name="send" size={20} color="white" /></TouchableOpacity>
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
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 60, backgroundColor: '#fff', paddingBottom: 15 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#2c3e50' },
  statusBox: { padding: 12, backgroundColor: '#f1f2f6', borderRadius: 10, alignItems: 'center', marginHorizontal: 15, marginBottom: 15 },
  freeText: { fontSize: 14, color: '#2c3e50' },
  premiumText: { fontSize: 14, color: '#e67e22', fontWeight: 'bold' },

  loadingContainer: { marginTop: 50, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 15, fontSize: 15, color: '#34495e', textAlign: 'center', lineHeight: 24, fontWeight: '500' },
  listSubtitle: { fontSize: 13, color: '#7f8c8d', marginBottom: 15, paddingHorizontal: 5 },

  mainGenerateButton: { backgroundColor: '#3498db', padding: 14, borderRadius: 12, alignItems: 'center', marginHorizontal: 15, marginBottom: 15 },
  urgentGenerateButton: { backgroundColor: '#e74c3c', padding: 14, borderRadius: 12, alignItems: 'center', marginHorizontal: 15, marginBottom: 15 },
  mainGenerateButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  urgentGenerateButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  recipeListItem: { flexDirection: 'row', justifyContent: 'space-between', padding: 18, backgroundColor: '#fff', borderRadius: 12, marginBottom: 10, elevation: 1 },
  listItemName: { fontSize: 16, fontWeight: 'bold', color: '#2c3e50', marginBottom: 5 },
  listItemInfo: { fontSize: 13, color: '#7f8c8d' },
  recipeCard: { backgroundColor: '#fff', margin: 15, padding: 20, borderRadius: 15 },
  badge: { alignSelf: 'flex-start', backgroundColor: '#e8f8f5', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, marginBottom: 10 },
  badgeText: { color: '#1abc9c', fontWeight: 'bold', fontSize: 12 },
  recipeTitle: { fontSize: 22, fontWeight: 'bold', color: '#2c3e50' },
  infoSection: { marginBottom: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#f1f2f6' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#34495e', marginBottom: 10 },
  infoText: { fontSize: 15, color: '#2c3e50', marginTop: 5, lineHeight: 22 },

  substituteBox: { backgroundColor: '#f9f2fb', padding: 15, borderRadius: 12, marginTop: 15, borderWidth: 1, borderColor: '#ebd4f5' },

  stepSection: { marginBottom: 20 },
  stepText: { fontSize: 15, color: '#34495e', marginBottom: 8, lineHeight: 24 },
  bottomButtonContainer: { padding: 20, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#f1f2f6' },
  cookButton: { backgroundColor: '#2ecc71', padding: 15, borderRadius: 12, alignItems: 'center' },
  cookButtonText: { color: '#fff', fontWeight: 'bold' },
  chatFab: { position: 'absolute', bottom: 100, right: 20, backgroundColor: '#3498db', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 8, zIndex: 100 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { width: '100%', backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, paddingBottom: Platform.OS === 'ios' ? 40 : 25, flexDirection: 'column' },
  modalHeader: { alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#2c3e50' },
  modalBody: { flex: 1, width: '100%' },

  modalFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingTop: 15, marginTop: 10, borderTopWidth: 1, borderColor: '#eee' },
  closeBtn: { width: '30%', paddingVertical: 15, alignItems: 'center' },
  closeBtnText: { color: '#95a5a6', fontSize: 16, fontWeight: 'bold' },
  submitBtn: { width: '65%', backgroundColor: '#2ecc71', paddingVertical: 15, borderRadius: 12, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  feedbackFooter: { width: '100%', paddingTop: 15, marginTop: 10, borderTopWidth: 1, borderColor: '#eee' },
  noReflectBtn: { width: '100%', backgroundColor: '#95a5a6', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginBottom: 10 },
  noReflectBtnText: { color: '#ffffff', fontSize: 15, fontWeight: 'bold' },
  feedbackFooterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' },

  sectionSubtitle: { fontSize: 15, fontWeight: 'bold', color: '#34495e', marginTop: 15, marginBottom: 10 },
  prepAmountContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f2f6', borderRadius: 12, padding: 5, marginBottom: 15, alignSelf: 'flex-start' },
  prepAmountBtn: { backgroundColor: '#fff', padding: 8, borderRadius: 8, marginHorizontal: 5 },
  prepAmountText: { fontSize: 16, fontWeight: 'bold', paddingHorizontal: 15 },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 15 },
  chip: { backgroundColor: '#f1f2f6', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20 },
  activeChip: { backgroundColor: '#2ecc71' },
  chipText: { fontSize: 13, color: '#7f8c8d' },
  activeChipText: { color: '#fff', fontWeight: 'bold' },
  promptInput: { backgroundColor: '#f1f2f6', padding: 15, borderRadius: 10, fontSize: 15, color: '#2c3e50', minHeight: 80, textAlignVertical: 'top' },
  feedbackModalTitle: { fontSize: 22, fontWeight: 'bold', color: '#2c3e50', textAlign: 'center' },
  ratingSection: { flexDirection: 'row', justifyContent: 'center', marginBottom: 15 },
  commentInput: { backgroundColor: '#f1f2f6', padding: 15, borderRadius: 10, fontSize: 14, color: '#2c3e50', marginBottom: 20 },

  bookmarkToggleRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fffcd1', padding: 15, borderRadius: 12, marginBottom: 20, justifyContent: 'center' },
  bookmarkToggleText: { fontSize: 15, fontWeight: 'bold', color: '#e67e22', marginLeft: 8 },

  usedIngSection: { backgroundColor: '#f8f9fa', padding: 15, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: '#eee' },
  usedItemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },

  usedItemName: { fontSize: 15, fontWeight: '600', color: '#2c3e50', flex: 1, marginRight: 10 },
  customUnitInput: { backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, width: 80, textAlign: 'center', marginRight: 10, borderWidth: 1, borderColor: '#ddd', fontSize: 14 },

  usedToggleOn: { color: '#3498db', fontWeight: 'bold', fontSize: 14, width: 65, textAlign: 'center' },
  usedToggleOff: { color: '#e74c3c', fontWeight: 'bold', fontSize: 14, width: 65, textAlign: 'center' },

  feedbackSection: { width: '100%', marginBottom: 10 },
  feedbackRow: { marginBottom: 20 },
  feedbackLabel: { fontSize: 15, fontWeight: 'bold', color: '#34495e', marginBottom: 10 },
  scaleGroup: { flexDirection: 'row', justifyContent: 'space-between' },
  scaleBtn: { flex: 1, backgroundColor: '#f1f2f6', paddingVertical: 12, marginHorizontal: 2, borderRadius: 8, alignItems: 'center' },
  scaleBtnActive: { backgroundColor: '#3498db' },
  scaleBtnText: { color: '#7f8c8d', fontSize: 11, fontWeight: '600', textAlign: 'center', lineHeight: 16 },
  scaleBtnTextActive: { color: '#fff', fontWeight: 'bold' },
  divider: { height: 1, backgroundColor: '#eee', marginBottom: 20 },

  adModalBox: { width: '85%', backgroundColor: '#fff', padding: 25, borderRadius: 20, alignItems: 'center', alignSelf: 'center', marginBottom: Platform.OS === 'web' ? 0 : '50%' },
  adModalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  adModalDesc: { fontSize: 14, color: '#7f8c8d', textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  adWatchButton: { flexDirection: 'row', backgroundColor: '#3498db', padding: 15, borderRadius: 10, width: '100%', justifyContent: 'center', marginBottom: 10 },
  premiumSubscribeButton: { flexDirection: 'row', backgroundColor: '#9b59b6', padding: 15, borderRadius: 10, width: '100%', justifyContent: 'center' },
  adButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },

  chatModalContent: { width: '100%', height: '80%', backgroundColor: '#fff', borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 20 },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 15, marginBottom: 15 },
  chatArea: { flex: 1, marginBottom: 10 },
  chatBubble: { padding: 14, borderRadius: 18, maxWidth: '85%', marginBottom: 10 },
  chatBubbleBot: { backgroundColor: '#f1f2f6', alignSelf: 'flex-start', borderBottomLeftRadius: 5 },
  chatBubbleUser: { backgroundColor: '#3498db', alignSelf: 'flex-end', borderBottomRightRadius: 5 },
  chatInputRow: { flexDirection: 'row', alignItems: 'center' },
  chatInputBox: { flex: 1, backgroundColor: '#f1f2f6', borderRadius: 25, paddingHorizontal: 20, paddingVertical: 12, marginRight: 10 },
  chatSendBtn: { backgroundColor: '#2ecc71', width: 45, height: 45, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
});
