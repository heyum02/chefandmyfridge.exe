import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

// 💡 냉장고 보관함 불러오기!
import { useFridgeStore } from '../store/useFridgeStore';
// 💡 유저 보관함 불러오기! (따라해본 레시피 데이터)
import { useUserStore } from '../store/useUserStore';

export default function HomeScreen() {
  const ingredients = useFridgeStore((state) => state.ingredients);
  const savedItemCount = ingredients.length;
  const ecoScore = savedItemCount * 10;

  const triedRecipes = useUserStore((state) => state.triedRecipes);
  const deleteTriedRecipe = useUserStore((state) => state.deleteTriedRecipe); 
  const editTriedRecipe = useUserStore((state) => state.editTriedRecipe); 
  const [sortType, setSortType] = useState('recent'); 

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editRating, setEditRating] = useState(0);
  const [editComment, setEditComment] = useState('');

  // 💡 방어막 1: 텅 빈(null) 데이터는 애초에 거르고(filter) 정렬합니다!
  const getSortedRecipes = () => {
    let copied = [...triedRecipes].filter(recipe => recipe !== null && recipe !== undefined); 
    
    if (sortType === 'recent') {
      return copied.sort((a, b) => Number(b?.id || 0) - Number(a?.id || 0)); 
    } else if (sortType === 'oldest') {
      return copied.sort((a, b) => Number(a?.id || 0) - Number(b?.id || 0)); 
    } else if (sortType === 'ratingHigh') {
      return copied.sort((a, b) => (b?.rating || 0) - (a?.rating || 0)); 
    } else if (sortType === 'ratingLow') {
      return copied.sort((a, b) => (a?.rating || 0) - (b?.rating || 0)); 
    }
    return copied;
  };

  const sortedRecipes = getSortedRecipes();

  const handleDelete = (id) => {
    Alert.alert('기록 삭제', '이 요리 기록을 정말 지우시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => {
          deleteTriedRecipe(id);
          setModalVisible(false);
      }}
    ]);
  };

  // 💡 방어막 2: 선택된 레시피가 확실히 있을 때만 데이터를 세팅합니다.
  const handleEditStart = () => {
    if (!selectedRecipe) return;
    setEditRating(selectedRecipe?.rating || 0);
    setEditComment(selectedRecipe?.comment || '');
    setIsEditing(true);
  };

  const handleEditSave = () => {
    if (editRating === 0) {
      Alert.alert('알림', '별점을 선택해 주세요!');
      return;
    }
    editTriedRecipe(selectedRecipe?.id, { rating: editRating, comment: editComment });
    setSelectedRecipe({ ...selectedRecipe, rating: editRating, comment: editComment });
    setIsEditing(false);
    Alert.alert('수정 완료', '기록이 성공적으로 수정되었습니다.');
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* 상단 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>마이 냉장고 홈</Text>
      </View>

      {/* 1. 에코 대시보드 카드 */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🌱 이번 달 에코 리포트</Text>
        <Text style={styles.cardSubtitle}>버려질 뻔한 식재료를 훌륭하게 구출했어요!</Text>
        
        <View style={styles.ecoRow}>
          <View style={styles.ecoBox}>
            <Text style={styles.ecoLabel}>구출한 식재료</Text>
            <Text style={styles.ecoValue}>{savedItemCount}<Text style={styles.ecoUnit}>개</Text></Text>
          </View>
          <View style={styles.separator} />
          <View style={styles.ecoBox}>
            <Text style={styles.ecoLabel}>내 에코 점수</Text>
            <Text style={styles.ecoValue}>{ecoScore}<Text style={styles.ecoUnit}>점</Text></Text>
          </View>
        </View>
      </View>

      {/* 2. 요리 기록 카드 */}
      <View style={styles.card}>
        <View style={styles.recipeCardHeader}>
          <Text style={styles.cardTitle}>🍳 따라해본 레시피</Text>
          
          <View style={styles.sortGroup}>
            <TouchableOpacity onPress={() => setSortType('recent')}>
              <Text style={[styles.sortText, sortType === 'recent' && styles.sortTextActive]}>최신</Text>
            </TouchableOpacity>
            <Text style={styles.sortDivider}>|</Text>
            <TouchableOpacity onPress={() => setSortType('oldest')}>
              <Text style={[styles.sortText, sortType === 'oldest' && styles.sortTextActive]}>처음</Text>
            </TouchableOpacity>
            <Text style={styles.sortDivider}>|</Text>
            <TouchableOpacity onPress={() => setSortType('ratingHigh')}>
              <Text style={[styles.sortText, sortType === 'ratingHigh' && styles.sortTextActive]}>높은별점</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {sortedRecipes.length === 0 ? (
           <Text style={styles.emptyText}>아직 저장된 요리 기록이 없습니다.</Text>
        ) : (
          sortedRecipes.map((recipe) => {
            // 💡 방어막 3: 혹시라도 null 값이 렌더링되려 하면 무시!
            if (!recipe) return null; 

            return (
              <TouchableOpacity 
                key={recipe.id} 
                style={styles.recipeItem}
                onPress={() => {
                  setSelectedRecipe(recipe);
                  setIsEditing(false); 
                  setModalVisible(true);
                }}
              >
                <View style={styles.recipeHeader}>
                  {/* 💡 ?. (Optional Chaining)을 써서 값이 없을 때 뻗는 것을 방지 */}
                  <Text style={styles.recipeName}>{recipe?.name || '알 수 없는 요리'}</Text>
                  <Text style={styles.recipeDate}>{recipe?.date || ''}</Text>
                </View>
                
                <View style={styles.ratingRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Ionicons key={star} name={star <= (recipe?.rating || 0) ? "star" : "star-outline"} size={18} color="#f1c40f" />
                  ))}
                  <Text style={styles.ratingText}>{(recipe?.rating || 0).toFixed(1)}</Text>
                </View>
                
                {/* 💡 방어막 4: 코멘트가 '존재할 때만' 박스를 렌더링하도록 조건 강화 */}
                {recipe?.comment ? (
                  <View style={styles.commentBox}>
                    <Text style={styles.commentText} numberOfLines={1}>"{recipe.comment}"</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          })
        )}
      </View>

      {/* 요리 기록 상세 보기 & 수정 모달창 */}
      <Modal animationType="fade" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* 💡 방어막 5: selectedRecipe가 있을 때만 모달창 내부를 그립니다 */}
            {selectedRecipe && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalDate}>{selectedRecipe?.date}의 기록</Text>
                  <TouchableOpacity onPress={() => { setModalVisible(false); setIsEditing(false); }}>
                    <Ionicons name="close" size={28} color="#bdc3c7" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.modalTitle}>{selectedRecipe?.name}</Text>

                {!isEditing ? (
                  // [보기 모드]
                  <>
                    <View style={styles.modalRatingRow}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Ionicons key={star} name={star <= (selectedRecipe?.rating || 0) ? "star" : "star-outline"} size={28} color="#f1c40f" />
                      ))}
                      <Text style={styles.modalRatingText}>{(selectedRecipe?.rating || 0).toFixed(1)}점</Text>
                    </View>

                    {selectedRecipe?.comment ? (
                      <View style={styles.modalCommentBox}>
                        <Text style={styles.modalCommentText}>"{selectedRecipe.comment}"</Text>
                      </View>
                    ) : (
                      <Text style={styles.emptyCommentText}>남겨진 코멘트가 없습니다.</Text>
                    )}

                    <View style={styles.actionButtonGroup}>
                      <TouchableOpacity style={styles.editBtn} onPress={handleEditStart}>
                        <Ionicons name="pencil" size={18} color="#3498db" />
                        <Text style={styles.editBtnText}>수정하기</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(selectedRecipe?.id)}>
                        <Ionicons name="trash-outline" size={18} color="#e74c3c" />
                        <Text style={styles.deleteBtnText}>삭제하기</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                ) : (
                  // [수정 모드]
                  <>
                    <View style={styles.modalRatingRow}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <TouchableOpacity key={star} onPress={() => setEditRating(star)}>
                          <Ionicons name={star <= editRating ? "star" : "star-outline"} size={36} color="#f1c40f" style={{ marginHorizontal: 5 }} />
                        </TouchableOpacity>
                      ))}
                    </View>

                    <TextInput 
                      style={styles.editCommentInput} 
                      placeholder="간단한 코멘트를 남겨보세요!" 
                      value={editComment}
                      onChangeText={setEditComment}
                      maxLength={30}
                    />

                    <View style={styles.actionButtonGroup}>
                      <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsEditing(false)}>
                        <Text style={styles.cancelBtnText}>취소</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.saveBtn} onPress={handleEditSave}>
                        <Text style={styles.saveBtnText}>저장하기</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

// styles는 변함없이 그대로 유지됩니다!
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa' },
  header: { padding: 20, paddingTop: 60, backgroundColor: '#fff' },
  headerTitle: { fontSize: 26, fontWeight: 'bold', color: '#2c3e50' },
  card: { backgroundColor: '#fff', margin: 15, padding: 20, borderRadius: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  recipeCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#2c3e50' }, 
  cardSubtitle: { fontSize: 13, color: '#7f8c8d', marginBottom: 20 },
  ecoRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', backgroundColor: '#f8fdf9', padding: 15, borderRadius: 12 },
  ecoBox: { alignItems: 'center' },
  ecoLabel: { fontSize: 14, color: '#7f8c8d', marginBottom: 5 },
  ecoValue: { fontSize: 28, fontWeight: 'bold', color: '#2ecc71' },
  ecoUnit: { fontSize: 16, color: '#2ecc71' },
  separator: { width: 1, height: 40, backgroundColor: '#dfe6e9' },
  recipeItem: { marginTop: 10, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#f1f2f6' },
  recipeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  recipeName: { fontSize: 16, fontWeight: 'bold', color: '#2c3e50' },
  recipeDate: { fontSize: 12, color: '#bdc3c7' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5, marginBottom: 10 },
  ratingText: { marginLeft: 5, fontSize: 14, fontWeight: 'bold', color: '#f39c12' },
  commentBox: { backgroundColor: '#f1f2f6', padding: 12, borderRadius: 8 },
  commentText: { fontSize: 14, color: '#34495e', lineHeight: 20 },
  sortGroup: { flexDirection: 'row', alignItems: 'center' },
  sortText: { fontSize: 12, color: '#95a5a6' },
  sortTextActive: { color: '#2ecc71', fontWeight: 'bold' },
  sortDivider: { marginHorizontal: 5, color: '#bdc3c7', fontSize: 10 },
  emptyText: { textAlign: 'center', color: '#bdc3c7', marginTop: 10, fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', backgroundColor: '#fff', borderRadius: 20, padding: 25 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  modalDate: { fontSize: 14, color: '#7f8c8d', fontWeight: 'bold' },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#2c3e50', marginBottom: 15, textAlign: 'center' },
  modalRatingRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  modalRatingText: { fontSize: 18, fontWeight: 'bold', color: '#f39c12', marginLeft: 10 },
  modalCommentBox: { backgroundColor: '#f8f9fa', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#eee', marginBottom: 25 },
  modalCommentText: { fontSize: 15, color: '#34495e', lineHeight: 24, fontStyle: 'italic' },
  emptyCommentText: { textAlign: 'center', color: '#bdc3c7', marginBottom: 25, fontStyle: 'italic' },
  actionButtonGroup: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  deleteBtn: { flex: 0.48, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 12, backgroundColor: '#ffecec', borderRadius: 10 },
  deleteBtnText: { color: '#e74c3c', fontWeight: 'bold', marginLeft: 5, fontSize: 14 },
  editBtn: { flex: 0.48, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 12, backgroundColor: '#eaf2f8', borderRadius: 10 },
  editBtnText: { color: '#3498db', fontWeight: 'bold', marginLeft: 5, fontSize: 14 },
  editCommentInput: { backgroundColor: '#f1f2f6', padding: 15, borderRadius: 10, fontSize: 15, color: '#2c3e50', marginBottom: 20 },
  cancelBtn: { flex: 0.3, padding: 15, alignItems: 'center', backgroundColor: '#f1f2f6', borderRadius: 10 },
  cancelBtnText: { color: '#7f8c8d', fontSize: 14, fontWeight: 'bold' },
  saveBtn: { flex: 0.65, backgroundColor: '#2ecc71', padding: 15, borderRadius: 10, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});