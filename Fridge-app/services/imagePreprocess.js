import * as ImageManipulator from 'expo-image-manipulator';

export const preprocessImage = async (imageUri, isReceipt = false) => {
    try {
        const actions = [];

        actions.push({ resize: { width: 1024 } });

        const result = await ImageManipulator.manipulateAsync(imageUri, actions, { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG });

        return result.uri;
    } catch (error) {
        console.error('이미지 전처리 실패: ', error);
        return imageUri; // 실패 시 원본 이미지 반환
    }
};
