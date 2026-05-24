import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
// 💡 useFocusEffect와 useCallback을 새로 가져옵니다.
import { useFocusEffect } from '@react-navigation/native'; // 💡 화면 이동 감지용
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Button, Dimensions, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { analyzeIngredients } from '../services/geminiService';
import { useFridgeStore } from '../store/useFridgeStore';
import { useUserStore } from '../store/useUserStore'; // 💡 챗봇 스위치 가져오기

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

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [isLoading, setIsLoading] = useState(false);
  const [photoUris, setPhotoUris] = useState([]);
  const [isCameraVisible, setIsCameraVisible] = useState(false);
  const cameraRef = useRef(null);
  
  const addIngredient = useFridgeStore((state) => state.addIngredient);
  const setChatHidden = useUserStore((state) => state.setChatHidden); // 💡 스위치 조작 버튼 가져오기

  // 💡 [핵심 로직] 카메라 화면에 들어와 있을 때 계속 감시합니다!
  useFocusEffect(
    useCallback(() => {
      // 1. 진짜로 카메라가 켜져 있거나(isCameraVisible)
      // 2. 갤러리에서 사진을 가져왔을 때(photoUris.length > 0) 챗봇을 숨깁니다!
      const shouldHide = isCameraVisible || photoUris.length > 0;
      setChatHidden(shouldHide);

      // 사용자가 다른 탭(홈, 재고관리 등)으로 떠나면 무조건 챗봇을 다시 보여줍니다.
      return () => {
        setChatHidden(false);
      };
    }, [isCameraVisible, photoUris.length]) // 카메라 상태나 사진 개수가 변할 때마다 스위치 재작동!
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
        amount: isNaN(Number(item.amount)) ? item.amount : Number(item.amount),
        unit: item.unit || '개',
        category: item.category || '기타', 
        expiryDate: item.expiryDate || defaultExpiryStr, 
      }));

      if (processedData && processedData.length > 0) {
        const itemListText = processedData.map(item => `[${item.name}] ${item.amount}${item.unit}`).join('\n');
        Alert.alert(
          '분석 완료! 📸',
          `냉장고 보관함에 다음 식재료를 추가할까요?\n\n${itemListText}`,
          [
            { text: '다시 찍기', style: 'cancel' },
            {
              text: '추가하기',
              onPress: () => {
                processedData.forEach(item => {
                  addIngredient({
                    id: Date.now().toString() + Math.random().toString(), 
                    name: item.name,
                    amount: item.amount,
                    unit: item.unit,
                    category: item.category, 
                    expiryDate: item.expiryDate, 
                  });
                });
                Alert.alert('저장 완료!', '재고관리 창에서 식재료를 확인해 보세요. 🎉', [{ text: '확인', onPress: () => setPhotoUris([]) }]);
              }
            }
          ]
        );
      } else {
        Alert.alert('분석 실패', '식재료를 인식하지 못했습니다. 다시 촬영해 주세요.');
      }
    } catch (error) {
      Alert.alert('분석 실패', '식재료 분석 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
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
});