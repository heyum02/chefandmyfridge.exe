import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

// 💡 1. 냉장고 보관함 불러오기!
import { useFridgeStore } from '../store/useFridgeStore';

export default function HomeScreen() {
  // 💡 2. 보관함에서 내 식재료 목록 전체를 꺼내옵니다.
  const ingredients = useFridgeStore((state) => state.ingredients);

  // 💡 3. 식재료 개수를 기반으로 에코 점수 계산 (예: 재료 1개당 10점!)
  const savedItemCount = ingredients.length;
  const ecoScore = savedItemCount * 10;

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
            {/* 💡 4. 하드코딩된 숫자 대신 실제 개수(savedItemCount) 출력 */}
            <Text style={styles.ecoValue}>{savedItemCount}<Text style={styles.ecoUnit}>개</Text></Text>
          </View>
          <View style={styles.separator} />
          <View style={styles.ecoBox}>
            <Text style={styles.ecoLabel}>내 에코 점수</Text>
            {/* 💡 5. 계산된 점수(ecoScore) 출력 */}
            <Text style={styles.ecoValue}>{ecoScore}<Text style={styles.ecoUnit}>점</Text></Text>
          </View>
        </View>
      </View>

      {/* 2. 요리 기록 (별점/코멘트) 카드 - 이 부분은 기존과 동일 */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🍳 따라해본 레시피</Text>
        
        <View style={styles.recipeItem}>
          <View style={styles.recipeHeader}>
            <Text style={styles.recipeName}>마늘 듬뿍 알리오 올리오</Text>
            <Text style={styles.recipeDate}>26.03.14</Text>
          </View>
          
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={18} color="#f1c40f" />
            <Ionicons name="star" size={18} color="#f1c40f" />
            <Ionicons name="star" size={18} color="#f1c40f" />
            <Ionicons name="star" size={18} color="#f1c40f" />
            <Ionicons name="star-half" size={18} color="#f1c40f" />
            <Text style={styles.ratingText}>4.5</Text>
          </View>
          
          <View style={styles.commentBox}>
            <Text style={styles.commentText}>
              "유통기한 임박했던 다진 마늘 완벽하게 소진! 다음엔 페퍼론치노를 더 넣어서 매콤하게 해봐야지."
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

// styles 부분은 수정 없이 기존 코드와 100% 동일하므로 그대로 두시면 됩니다!
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa' },
  header: { padding: 20, paddingTop: 60, backgroundColor: '#fff' },
  headerTitle: { fontSize: 26, fontWeight: 'bold', color: '#2c3e50' },
  card: { backgroundColor: '#fff', margin: 15, padding: 20, borderRadius: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 5, color: '#2c3e50' },
  cardSubtitle: { fontSize: 13, color: '#7f8c8d', marginBottom: 20 },
  ecoRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', backgroundColor: '#f8fdf9', padding: 15, borderRadius: 12 },
  ecoBox: { alignItems: 'center' },
  ecoLabel: { fontSize: 14, color: '#7f8c8d', marginBottom: 5 },
  ecoValue: { fontSize: 28, fontWeight: 'bold', color: '#2ecc71' },
  ecoUnit: { fontSize: 16, color: '#2ecc71' },
  separator: { width: 1, height: 40, backgroundColor: '#dfe6e9' },
  recipeItem: { marginTop: 10 },
  recipeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  recipeName: { fontSize: 16, fontWeight: 'bold' },
  recipeDate: { fontSize: 12, color: '#bdc3c7' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5, marginBottom: 10 },
  ratingText: { marginLeft: 5, fontSize: 14, fontWeight: 'bold', color: '#f39c12' },
  commentBox: { backgroundColor: '#f1f2f6', padding: 12, borderRadius: 8 },
  commentText: { fontSize: 14, color: '#34495e', lineHeight: 20 }
});