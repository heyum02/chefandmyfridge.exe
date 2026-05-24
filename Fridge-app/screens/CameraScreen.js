import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Button, Dimensions, Image, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { analyzeIngredients } from '../services/geminiService';
import { useFridgeStore } from '../store/useFridgeStore';
import { useUserStore } from '../store/useUserStore';

const screenWidth = Dimensions.get('window').width;

const formatDate = (date) => {
  const d = new Date(date);
  let month = '' + (d.getMonth() + 1);
  let day = '' + d.getDate();
  const year = d.getFullYear();
  if (month.length < 2) month = '0' + month;
  if (day.length < 2) day = '0' + day;
  return [year, month, day].join('-');
};

// 💡 날짜를 받아서 '며칠 남았는지(D-Day)' 계산해주는 함수
const calculateDaysLeft = (expiryDateStr) => {
  const target = new Date(expiryDateStr);
  const today = new Date();
  target.setHours(0,0,0,0); today.setHours(0,0,0,0);
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
};

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [isLoading, setIsLoading] = useState(false);
  const [photoUris, setPhotoUris] = useState([]);
  const [isCameraVisible, setIsCameraVisible] = useState(false);
  const cameraRef = useRef(null);
  
  const addIngredient = useFridgeStore((state) => state.addIngredient);
  const setChatHidden = useUserStore((state) => state.setChatHidden); 

  // 💡 [새로 추가된 상태] AI 분석 결과를 담아두고 수정할 창
  const [analyzedResults, setAnalyzedResults] = useState([]);
  const [showReviewModal, setShowReviewModal] = useState(false);

  // 카테고리 목록 (Unknown일 때 유저가 쉽게 고칠 수 있도록)
  const categories = ['채소', '과일', '육류', '수산물', '유제품/계란', '양념/소스', '가공/냉동', '기타'];

  useFocusEffect(
    useCallback(() => {
      const shouldHide = isCameraVisible || photoUris.length > 0 || showReviewModal;
      setChatHidden(shouldHide);
      return () => setChatHidden(false);
    }, [isCameraVisible, photoUris.length, showReviewModal]) 
  );

  if (!permission) return <View />;
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={{ textAlign: 'center', marginBottom: 20 }}>냉장고 식재료를 촬영하려면 카메라 접근 권한이 필요합니다.</Text>
        <Button onPress={requestPermission} title="카메라 권한 허용하기" />
      </View>
    );
  }

  const takePicture = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync();
      setPhotoUris((prev) => [...prev, photo.uri]);
      setIsCameraVisible(false);
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsMultipleSelection: true, selectionLimit: 10, quality: 1 });
    if (!result.canceled) setPhotoUris((prev) => [...prev, ...result.assets.map(asset => asset.uri)]);
  };

  const removeSinglePhoto = (indexToRemove) => setPhotoUris((prev) => prev.filter((_, index) => index !== indexToRemove));

  const handleAnalyze = async () => {
    if (photoUris.length === 0) {
      Alert.alert('사진이 없습니다', '분석할 사진을 최소 1장 이상 추가해주세요.');
      return;
    }
    try {
      setIsLoading(true);
      const result = await analyzeIngredients(photoUris);

      const today = new Date();
      const defaultExpiryDate = new Date(today);
      defaultExpiryDate.setDate(today.getDate() + 7);
      const defaultExpiryStr = formatDate(defaultExpiryDate);

      const processedData = result.map(item => ({
        name: item.name,
        amount: isNaN(Number(item.amount)) ? 1 : Number(item.amount),
        unit: item.unit || '개',
        // 💡 AI가 분류를 못해서 'Unknown'으로 오면 일단 그대로 둡니다. (유저가 화면에서 보고 고치게 유도)
        category: item.category || 'Unknown', 
        expiryDate: item.expiryDate || defaultExpiryStr, 
      }));

      if (processedData && processedData.length > 0) {
        // 💡 [수정됨] Alert 대신 모달을 띄우고 결과값을 상태에 저장합니다!
        setAnalyzedResults(processedData);
        setShowReviewModal(true);
      } else {
        Alert.alert('분석 실패', '식재료를 인식하지 못했습니다. 다시 촬영해 주세요.');
      }
    } catch (error) {
      Alert.alert('분석 실패', '식재료 분석 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  // 💡 [새로 추가됨] 모달 안에서 유저가 값을 수정할 때 작동하는 함수
  const updateResultItem = (index, key, value) => {
    const updated = [...analyzedResults];
    updated[index][key] = value;
    setAnalyzedResults(updated);
  };

  // 💡 [새로 추가됨] D-day(남은 일수)를 조절하면 expiryDate 날짜 문자로 바꿔주는 함수
  const updateDaysLeft = (index, currentExpiry, change) => {
    const currentDaysLeft = calculateDaysLeft(currentExpiry);
    const newDaysLeft = currentDaysLeft + change;
    const newDate = new Date();
    newDate.setDate(newDate.getDate() + newDaysLeft);
    updateResultItem(index, 'expiryDate', formatDate(newDate));
  };

  // 💡 [새로 추가됨] 최종 확인 버튼을 누르면 냉장고에 넣는 함수
  const confirmAndSaveToFridge = () => {
    // 혹시라도 유저가 수정 안 하고 Unknown인 채로 넘기면 '기타'로 강제 변환
    analyzedResults.forEach(item => {
      const finalCategory = item.category === 'Unknown' ? '기타' : item.category;
      addIngredient({
        id: Date.now().toString() + Math.random().toString(), 
        name: item.name,
        amount: item.amount,
        unit: item.unit,
        category: finalCategory, 
        expiryDate: item.expiryDate, 
      });
    });

    Alert.alert('저장 완료!', '재고관리 창에서 식재료를 확인해 보세요. 🎉', [
      { text: '확인', onPress: () => {
        setShowReviewModal(false);
        setPhotoUris([]);
      }}
    ]);
  };

  return (
    <View style={styles.container}>
      {isLoading && (
        <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', zIndex: 10 }}>
          <ActivityIndicator size="large" color="#2ecc71" /> 
          <Text style={{ color: 'white', fontSize: 18, marginTop: 15, fontWeight: 'bold' }}>식재료 분석 중...</Text>
        </View>
      )}
      
      {!isCameraVisible && (<View style={styles.header}><Text style={styles.headerTitle}>식재료 촬영</Text></View>)}
      
      {isCameraVisible && (
        <View style={StyleSheet.absoluteFill}>
          <CameraView style={styles.camera} facing="back" ref={cameraRef}>
            <View style={styles.cameraButtons}>
              <TouchableOpacity style={styles.closeButton} onPress={() => setIsCameraVisible(false)}><Ionicons name="close-circle" size={40} color="white" /></TouchableOpacity>
              <TouchableOpacity style={styles.captureButton} onPress={takePicture}><View style={styles.captureButtonInner} /></TouchableOpacity>
            </View>
          </CameraView>
        </View>
      )}

      {!isCameraVisible && (
        <View style={styles.previewWrapper}>
          {photoUris.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="camera-outline" size={80} color="#bdc3c7" />
              <Text style={styles.emptyText}>냉장고 속이나 영수증 사진을 올려주세요!</Text>
              <Text style={styles.emptySubText}>최대 10장까지 모아서 분석할 수 있습니다.</Text>
              <View style={styles.mainButtons}>
                <Button title="📸 사진 촬영하기" color="#2ecc71" onPress={() => setIsCameraVisible(true)} />
                <Button title="🖼️ 갤러리에서 가져오기" color="#3498db" onPress={pickImage} />
              </View>
            </View>
          ) : (
            <View style={styles.previewContainer}>
              <ScrollView horizontal pagingEnabled style={styles.scrollView}>
                {photoUris.map((uri, index) => (
                  <View key={index} style={{ width: screenWidth }}>
                    <Image source={{ uri: uri }} style={styles.multiCamera} />
                    <TouchableOpacity style={styles.deleteSingleButton} onPress={() => removeSinglePhoto(index)}><Ionicons name="close-circle" size={35} color="rgba(255, 255, 255, 0.8)" /></TouchableOpacity>
                    <View style={styles.pageBadge}><Text style={styles.pageText}>{index + 1} / {photoUris.length}</Text></View>
                  </View>
                ))}
              </ScrollView>
              <View style={styles.actionButtons}>
                <View style={styles.manageButtons}>
                  <TouchableOpacity style={styles.addButton} onPress={() => setIsCameraVisible(true)}><Ionicons name="camera" size={20} color="white" /><Text style={styles.addText}>더 찍기</Text></TouchableOpacity>
                  <TouchableOpacity style={[styles.addButton, { backgroundColor: '#3498db' }]} onPress={pickImage}><Ionicons name="images" size={20} color="white" /><Text style={styles.addText}>더 고르기</Text></TouchableOpacity>
                  <TouchableOpacity style={[styles.addButton, { backgroundColor: '#e74c3c' }]} onPress={() => setPhotoUris([])}><Ionicons name="trash-outline" size={20} color="white" /><Text style={styles.addText}>전체 삭제</Text></TouchableOpacity>
                </View>
                <Button title={`이 사진(${photoUris.length}장)으로 식재료 분석하기`} color="#2ecc71" onPress={handleAnalyze} disabled={isLoading} />
              </View>
            </View>
          )}
        </View>
      )}

      {/* 💡 [새로 추가됨] AI 결과 검토 및 수정 모달 (Review Modal) */}
      <Modal animationType="slide" transparent={true} visible={showReviewModal} onRequestClose={() => setShowReviewModal(false)}>
        <View style={styles.reviewModalOverlay}>
          <View style={styles.reviewModalContent}>
            <View style={styles.reviewHeader}>
              <Text style={styles.reviewTitle}>분석 결과 확인</Text>
              <Text style={styles.reviewSubtitle}>수정이 필요한 부분이 있다면 바로 고쳐주세요!</Text>
            </View>

            <ScrollView style={styles.reviewScroll} showsVerticalScrollIndicator={false}>
              {analyzedResults.map((item, index) => (
                <View key={index} style={[styles.resultCard, item.category === 'Unknown' && styles.unknownCard]}>
                  {item.category === 'Unknown' && (
                    <Text style={styles.unknownAlertText}>⚠️ 카테고리를 알 수 없습니다. 직접 선택해주세요!</Text>
                  )}
                  
                  {/* 1. 이름 수정 */}
                  <Text style={styles.inputLabel}>식재료 이름</Text>
                  <TextInput 
                    style={styles.reviewInput} 
                    value={item.name} 
                    onChangeText={(text) => updateResultItem(index, 'name', text)} 
                  />

                  {/* 2. 카테고리 칩 선택 (Unknown 수정용) */}
                  <Text style={styles.inputLabel}>카테고리</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                    {categories.map((cat) => (
                      <TouchableOpacity 
                        key={cat} 
                        style={[styles.reviewChip, item.category === cat && styles.activeReviewChip]}
                        onPress={() => updateResultItem(index, 'category', cat)}
                      >
                        <Text style={[styles.reviewChipText, item.category === cat && styles.activeReviewChipText]}>{cat}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  {/* 3. 개수 및 소비기한 수정 (가로 정렬) */}
                  <View style={styles.rowInputs}>
                    <View style={styles.halfInputBox}>
                      <Text style={styles.inputLabel}>수량 ({item.unit})</Text>
                      <View style={styles.stepperContainer}>
                        <TouchableOpacity style={styles.stepperBtn} onPress={() => updateResultItem(index, 'amount', Math.max(1, item.amount - 1))}><Ionicons name="remove" size={20} color="#2c3e50" /></TouchableOpacity>
                        <Text style={styles.stepperText}>{item.amount}</Text>
                        <TouchableOpacity style={styles.stepperBtn} onPress={() => updateResultItem(index, 'amount', item.amount + 1)}><Ionicons name="add" size={20} color="#2c3e50" /></TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.halfInputBox}>
                      <Text style={styles.inputLabel}>소비기한 (남은 일수)</Text>
                      <View style={styles.stepperContainer}>
                        <TouchableOpacity style={styles.stepperBtn} onPress={() => updateDaysLeft(index, item.expiryDate, -1)}><Ionicons name="remove" size={20} color="#2c3e50" /></TouchableOpacity>
                        <Text style={styles.stepperText}>D-{calculateDaysLeft(item.expiryDate)}</Text>
                        <TouchableOpacity style={styles.stepperBtn} onPress={() => updateDaysLeft(index, item.expiryDate, 1)}><Ionicons name="add" size={20} color="#2c3e50" /></TouchableOpacity>
                      </View>
                    </View>
                  </View>
                  
                  {/* 개별 항목 삭제 버튼 */}
                  <TouchableOpacity style={styles.removeResultBtn} onPress={() => setAnalyzedResults(analyzedResults.filter((_, i) => i !== index))}>
                    <Text style={styles.removeResultText}>이 항목 빼기</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>

            <View style={styles.reviewButtonGroup}>
              <TouchableOpacity style={styles.reviewCancelBtn} onPress={() => setShowReviewModal(false)}>
                <Text style={styles.reviewCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.reviewSubmitBtn} onPress={confirmAndSaveToFridge}>
                <Text style={styles.reviewSubmitText}>최종 확인 & 냉장고에 넣기</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9', justifyContent: 'center' },
  header: { padding: 20, paddingTop: 60, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  headerTitle: { fontSize: 26, fontWeight: 'bold', color: '#2c3e50' },
  previewWrapper: { flex: 1 },
  camera: { flex: 1 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyText: { fontSize: 20, fontWeight: 'bold', color: '#2c3e50', marginTop: 20 },
  emptySubText: { fontSize: 14, color: '#7f8c8d', marginTop: 10, marginBottom: 30 },
  mainButtons: { gap: 15, width: '80%' },
  cameraButtons: { flex: 1, backgroundColor: 'transparent', justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 50 },
  closeButton: { position: 'absolute', top: 50, right: 30 },
  captureButton: { width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(255, 255, 255, 0.5)', justifyContent: 'center', alignItems: 'center' },
  captureButtonInner: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'white' },
  previewContainer: { flex: 1, backgroundColor: 'black' },
  scrollView: { flex: 1 },
  multiCamera: { width: screenWidth, height: '100%', resizeMode: 'cover' },
  deleteSingleButton: { position: 'absolute', top: 50, right: 20, zIndex: 10 },
  pageBadge: { position: 'absolute', bottom: 30, right: 20, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15 },
  pageText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  actionButtons: { padding: 20, gap: 10, backgroundColor: 'white' },
  manageButtons: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  addButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2ecc71', padding: 10, borderRadius: 5, gap: 5, width: '31%', justifyContent: 'center' },
  addText: { color: 'white', fontWeight: 'bold', fontSize: 14 },

  // 💡 [새로 추가됨] 리뷰 모달 전용 스타일 모음
  reviewModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  reviewModalContent: { backgroundColor: '#f5f6fa', height: '90%', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 20 },
  reviewHeader: { alignItems: 'center', marginBottom: 15 },
  reviewTitle: { fontSize: 22, fontWeight: 'bold', color: '#2c3e50' },
  reviewSubtitle: { fontSize: 14, color: '#7f8c8d', marginTop: 5 },
  reviewScroll: { flex: 1 },
  resultCard: { backgroundColor: '#fff', padding: 20, borderRadius: 15, marginBottom: 15, elevation: 2, borderWidth: 1, borderColor: '#fff' },
  unknownCard: { borderColor: '#e74c3c', borderWidth: 1.5 },
  unknownAlertText: { color: '#e74c3c', fontWeight: 'bold', fontSize: 13, marginBottom: 10 },
  inputLabel: { fontSize: 13, fontWeight: 'bold', color: '#34495e', marginBottom: 8, marginTop: 10 },
  reviewInput: { backgroundColor: '#f1f2f6', padding: 12, borderRadius: 10, fontSize: 16, color: '#2c3e50' },
  chipScroll: { flexDirection: 'row', marginBottom: 10 },
  reviewChip: { backgroundColor: '#f1f2f6', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, marginRight: 8 },
  activeReviewChip: { backgroundColor: '#3498db' },
  reviewChipText: { color: '#7f8c8d', fontSize: 13, fontWeight: '600' },
  activeReviewChipText: { color: '#fff', fontWeight: 'bold' },
  rowInputs: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
  halfInputBox: { width: '48%' },
  stepperContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f2f6', borderRadius: 10, justifyContent: 'space-between', paddingHorizontal: 5, paddingVertical: 5 },
  stepperBtn: { backgroundColor: '#fff', padding: 8, borderRadius: 8, elevation: 1 },
  stepperText: { fontSize: 16, fontWeight: 'bold', color: '#2c3e50' },
  removeResultBtn: { marginTop: 15, alignSelf: 'flex-end' },
  removeResultText: { color: '#e74c3c', textDecorationLine: 'underline', fontSize: 13 },
  reviewButtonGroup: { flexDirection: 'row', paddingTop: 15, paddingBottom: 20 },
  reviewCancelBtn: { flex: 0.35, padding: 15, alignItems: 'center' },
  reviewCancelText: { color: '#7f8c8d', fontSize: 16, fontWeight: 'bold' },
  reviewSubmitBtn: { flex: 0.65, backgroundColor: '#2ecc71', padding: 15, borderRadius: 12, alignItems: 'center' },
  reviewSubmitText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});