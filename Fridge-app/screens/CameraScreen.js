import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useRef, useState } from 'react';
import { Alert, Button, Dimensions, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const screenWidth = Dimensions.get('window').width;

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [photoUris, setPhotoUris] = useState([]);
  const [isCameraVisible, setIsCameraVisible] = useState(false);
  const cameraRef = useRef(null);

  if (!permission) return <View />;
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={{ textAlign: 'center', marginBottom: 20 }}>
          냉장고 식재료를 촬영하려면 카메라 접근 권한이 필요합니다.
        </Text>
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
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, 
      allowsMultipleSelection: true, 
      selectionLimit: 10, 
      quality: 1,
    });
    if (!result.canceled) {
      setPhotoUris((prev) => [...prev, ...result.assets.map(asset => asset.uri)]);
    }
  };

  // 특정 사진만 지우는 함수 (유지)
  const removeSinglePhoto = (indexToRemove) => {
    setPhotoUris((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  return (
    <View style={styles.container}>
      {/* 💡 1. 새로 추가된 상단 헤더 (카메라 촬영 모드가 아닐 때만 보임) */}
      {!isCameraVisible && (
        <View style={styles.header}>
          <Text style={styles.headerTitle}>식재료 촬영</Text>
        </View>
      )}

      {/* 📸 카메라 뷰 */}
      {isCameraVisible && (
        <View style={StyleSheet.absoluteFill}>
          <CameraView style={styles.camera} facing="back" ref={cameraRef}>
            <View style={styles.cameraButtons}>
              <TouchableOpacity style={styles.closeButton} onPress={() => setIsCameraVisible(false)}>
                <Ionicons name="close-circle" size={40} color="white" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
                <View style={styles.captureButtonInner} />
              </TouchableOpacity>
            </View>
          </CameraView>
        </View>
      )}

      {/* 🖼️ 미리보기 및 사진 관리 화면 (사용자가 좋아했던 기존 레이아웃 유지) */}
      {!isCameraVisible && (
        <View style={styles.previewWrapper}>
          {/* 💡 헤더 아래 영역을 채워주기 위해 별도 스타일(previewWrapper) 적용 */}
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
                    
                    {/* 개별 삭제 버튼 유지 */}
                    <TouchableOpacity 
                      style={styles.deleteSingleButton} 
                      onPress={() => removeSinglePhoto(index)}
                    >
                      <Ionicons name="close-circle" size={35} color="rgba(255, 255, 255, 0.8)" />
                    </TouchableOpacity>

                    {/* 💡 2. 새로 추가된 사진 번호 뱃지 (우측 하단) */}
                    <View style={styles.pageBadge}>
                      <Text style={styles.pageText}>{index + 1} / {photoUris.length}</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
              
              {/* 사용자가 마음에 들어했던 기존 하단 버튼 레이아웃 유지 */}
              <View style={styles.actionButtons}>
                <View style={styles.manageButtons}>
                    <TouchableOpacity style={styles.addButton} onPress={() => setIsCameraVisible(true)}>
                      <Ionicons name="camera" size={20} color="white" />
                      <Text style={styles.addText}>더 찍기</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.addButton, {backgroundColor: '#3498db'}]} onPress={pickImage}>
                      <Ionicons name="images" size={20} color="white" />
                      <Text style={styles.addText}>더 고르기</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.addButton, {backgroundColor: '#e74c3c'}]} onPress={() => setPhotoUris([])}>
                      <Ionicons name="trash-outline" size={20} color="white" />
                      <Text style={styles.addText}>전체 삭제</Text>
                    </TouchableOpacity>
                </View>
                <Button 
                  title={`이 사진(${photoUris.length}장)으로 식재료 분석하기`} 
                  color="#2ecc71" 
                  onPress={() => Alert.alert('9주 차 예고!', `${photoUris.length}장의 사진을 Vision AI 서버로 전송합니다!`)} 
                />
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
  
  /* 💡 새로 추가된 헤더 스타일 */
  header: { padding: 20, paddingTop: 60, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  headerTitle: { fontSize: 26, fontWeight: 'bold', color: '#2c3e50' },

  /* 💡 인라인 스타일 대신 안전하게 StyleSheet로 뺐습니다 */
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
  
  /* 💡 새로 추가된 사진 번호 뱃지 스타일 */
  pageBadge: { position: 'absolute', bottom: 30, right: 20, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15 },
  pageText: { color: 'white', fontWeight: 'bold', fontSize: 14 },

  actionButtons: { padding: 20, gap: 10, backgroundColor: 'white' },
  manageButtons: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  addButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2ecc71', padding: 10, borderRadius: 5, gap: 5, width: '31%', justifyContent: 'center' },
  addText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
});