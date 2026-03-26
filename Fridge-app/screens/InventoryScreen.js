import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// 1. 가짜 데이터 (Dummy Data) 만들기
const DUMMY_INGREDIENTS = [
  { id: '1', name: '양파', expiryDate: 'D-5', quantity: '2개', icon: '🧅' },
  { id: '2', name: '우유', expiryDate: 'D-3', quantity: '1팩', icon: '🥛' },
  { id: '3', name: '소고기 (국거리)', expiryDate: 'D-1', quantity: '300g', icon: '🥩' },
  { id: '4', name: '계란', expiryDate: 'D-10', quantity: '10알', icon: '🥚' },
  { id: '5', name: '당근', expiryDate: 'D-7', quantity: '1개', icon: '🥕' },
  { id: '6', name: '대파', expiryDate: 'D-4', quantity: '1단', icon: '🥬' },
  { id: '7', name: '두부', expiryDate: 'D-2', quantity: '1모', icon: '🧊' },
];

export default function InventoryScreen() {
  
  // 2. 리스트의 각 항목을 어떻게 보여줄지 정의하는 함수
  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.icon}>{item.icon}</Text>
      
      <View style={styles.infoContainer}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.quantity}>{item.quantity}</Text>
      </View>
      
      <View style={styles.badge}>
        <Text style={item.expiryDate === 'D-1' || item.expiryDate === 'D-2' ? styles.urgentDate : styles.date}>
          {item.expiryDate}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* 상단 헤더 부분 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>마이 냉장고 식재료</Text>
        <TouchableOpacity>
          <Ionicons name="add-circle" size={30} color="#2ecc71" />
        </TouchableOpacity>
      </View>

      {/* 3. FlatList 컴포넌트 적용 */}
      <FlatList
        data={DUMMY_INGREDIENTS} // 어떤 데이터를 쓸 건지
        keyExtractor={(item) => item.id} // 각 항목의 고유 키값
        renderItem={renderItem} // 어떻게 그릴 건지 (위에서 만든 함수)
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false} // 스크롤바 숨기기
      />
    </View>
  );
}

// 4. 스타일링
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60, // 아이폰 노치 영역 확보
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  listContainer: {
    padding: 15,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3, // 안드로이드 그림자
  },
  icon: {
    fontSize: 35,
    marginRight: 15,
  },
  infoContainer: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  quantity: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: '#f1f2f6',
  },
  date: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  urgentDate: { // 유통기한 임박(D-1, D-2) 스타일 다르게!
    fontSize: 14,
    fontWeight: 'bold',
    color: '#e74c3c', 
  }
});