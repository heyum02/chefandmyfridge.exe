import axios from 'axios';
import * as FileSystem from 'expo-file-system/legacy';
import { SYSTEM_PROMPT, OUTPUT_GUIDE } from './prompts';

/**
 * .env 파일에 정의된 API 키와 환경 변수를 가져옵니다.
 * Expo 환경에서는 process.env.EXPO_PUBLIC_... 형식을 사용합니다.
 */
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const API_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-3.5-flash:generateContent?key=${GEMINI_API_KEY}`;

/**
 * 이미지를 Gemini API에 전송하여 식재료를 추출하는 함수
 * @param {string} imageUri - 분석할 이미지의 로컬 경로
 * @returns {Promise<Array>} - 추출된 식재료 객체 배열
 */
export const analyzeIngredients = async (imageUris) => {
    try {

        const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD 형식의 오늘 날짜 문자열
        const finalizedPrompt = SYSTEM_PROMPT.replace('{TODAY}', todayStr);

        // 1. 이미지를 Base64 문자열로 변환
        const imageParts = await Promise.all(imageUris.map(async (uri) => {

            const cleanPath = uri.startsWith('file://') ? uri : `file://${uri}`;
            const base64 = await FileSystem.readAsStringAsync(cleanPath, {
                encoding: 'base64',
            });
            return {
                inlineData: {
                    mimeType: "image/jpeg",
                    data: base64,
                },
            };
        }));

        // 2. Gemini API 요청 데이터 구조 설정
        const requestData = {
            contents: [
                {
                    parts: [
                        { text: `${finalizedPrompt}\n\n${OUTPUT_GUIDE}` },
                        ...imageParts,
                    ],
                },
            ],
        };

        // 3. API 호출
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Gemini API 에러 응답:", errorData);
            throw new Error(`Gemini API 요청 실패: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        // 4. 응답 텍스트 추출 및 JSON 파싱
        const resultText = data.candidates[0].content.parts[0].text;
        const cleanJson = resultText.replace(/```json|```/g, '').trim();

        const parsedData = JSON.parse(cleanJson);
        if (parsedData.images && Array.isArray(parsedData.images)) {
            const allItems = parsedData.images.reduce((acc, currentImage) => {
                if (currentImage.items && Array.isArray(currentImage.items)) {
                    return [...acc, ...currentImage.items];
                } return acc;
            }, []);
            return allItems;
        }
        return parsedData.items || parsedData;

    } catch (error) {
        console.error("Gemini 분석 에러 상세:", error.response ? error.response.data : error.message);
        throw new Error("식재료를 분석하는 중 오류가 발생했습니다.");
    }
};
