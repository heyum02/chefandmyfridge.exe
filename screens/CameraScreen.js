import { useState, useRef } from 'react';
import { StyleSheet, Text, View, Button, Image, TouchableOpacity, ScrollView, Dimensions, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons'; // 아이콘 추가

// 스마트폰 화면의 너비를 가져옵니다 (사진을 꽉 차게 보여주기 위함)
const screenWidth = Dimensions.get('window').width;

export default function CameraScreen() {
  // 1. 카메라 권한 상태 관리
  const [permission, requestPermission] = useCameraPermissions();
  // 2. 촬영된 사진의 URI를 저장할 상태
  //단일 URI가 아닌, 여러 URI를 담을 배열([])로 상태를 변경합니다.
  const [photoUris, setPhotoUris] = useState([]);
  // 📸 카메라 뷰를 띄울지 여부를 결정하는 상태 (처음에는 숨김)
  const [isCameraVisible, setIsCameraVisible] = useState(false);
  // 3. 카메라 컴포넌트를 참조하기 위한 Ref
  const cameraRef = useRef(null);

  // 권한 로딩 중일 때 빈 화면 반환
  if (!permission) return <View />;
  
  // 권한이 거부되었거나 아직 묻지 않은 경우
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

  // 📸 카메라로 촬영 후 사진 추가
  const takePicture = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync();
      // 기존 사진 배열(prev) 뒤에 새 사진(photo.uri)을 추가합니다.
      setPhotoUris((prev) => [...prev, photo.uri]);
      setIsCameraVisible(false); // 촬영 후 카메라 닫기
    }
  };

  // 🖼️ 갤러리에서 여러 장 선택 후 사진 추가
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, 
      allowsMultipleSelection: true, // 다중 선택 활성화
      selectionLimit: 10, // 최대 10장까지 선택 제한
      quality: 1,
    });

    // 사용자가 사진 선택을 취소하지 않았다면, 해당 사진의 경로를 저장합니다.
    if (!result.canceled) {
      // 기존 사진 배열(prev) 뒤에 새로 선택한 사진들(selectedUris)을 추가합니다.
      setPhotoUris((prev) => [...prev, ...photoUris]);
    }
  };

return (
    <View style={styles.container}>
      {/* 📸 카메라 뷰 (isCameraVisible이 true일 때만 전체화면으로 띄움) */}
      {isCameraVisible && (
        <View style={StyleSheet.absoluteFill}>
          <CameraView style={styles.camera} facing="back" ref={cameraRef}>
            <View style={styles.cameraButtons}>
              {/* 카메라 닫기 버튼 */}
              <TouchableOpacity style={styles.closeButton} onPress={() => setIsCameraVisible(false)}>
                <Ionicons name="close-circle" size={40} color="white" />
              </TouchableOpacity>
              {/* 촬영 버튼 */}
              <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
                <View style={styles.captureButtonInner} />
              </TouchableOpacity>
            </View>
          </CameraView>
        </View>
      )}

      {/* 🖼️ 미리보기 및 사진 관리 화면 (isCameraVisible이 false일 때 보임) */}
      {!isCameraVisible && (
        <>
          {/* 사진이 없는 경우 초기 화면 */}
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
            /* 사진이 1장이라도 있는 경우 미리보기 스와이프 화면 */
            <View style={styles.previewContainer}>
              <ScrollView horizontal pagingEnabled style={styles.scrollView}>
                {photoUris.map((uri, index) => (
                  <Image key={index} source={{ uri: uri }} style={styles.multiCamera} />
                ))}
              </ScrollView>
              
              {/* 하단 사진 관리 및 분석 버튼 */}
              <View style={styles.actionButtons}>
                <View style={styles.manageButtons}>
                    {/* 👉 '사진 더 추가하기' 버튼! */}
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
                  onPress={() => Alert.alert('9주 차 예고!', `${photoUris.length}장의 사진을 Vision AI 서버로 전송하여 한꺼번에 분석합니다!`)} 
                />
              </View>
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9', justifyContent: 'center' },
  camera: { flex: 1 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyText: { fontSize: 20, fontWeight: 'bold', color: '#2c3e50', marginTop: 20 },
  emptySubText: { fontSize: 14, color: '#7f8c8d', marginTop: 10, marginBottom: 30 },
  mainButtons: { gap: 15, width: '80%' },
  
  // 카메라 화면 내 버튼
  cameraButtons: { flex: 1, backgroundColor: 'transparent', justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 50 },
  closeButton: { position: 'absolute', top: 50, right: 30 },
  captureButton: { width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(255, 255, 255, 0.5)', justifyContent: 'center', alignItems: 'center' },
  captureButtonInner: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'white' },

  // 미리보기 화면
  previewContainer: { flex: 1, backgroundColor: 'black' },
  scrollView: { flex: 1 },
  multiCamera: { width: screenWidth, height: '100%', resizeMode: 'cover' },
  actionButtons: { padding: 20, gap: 10, backgroundColor: 'white' },
  manageButtons: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  addButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2ecc71', padding: 10, borderRadius: 5, gap: 5, width: '31%', justifyContent: 'center' },
  addText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
});