import { Ionicons } from '@expo/vector-icons';
// 💡 [수정됨] BottomTabBar를 추가로 가져옵니다!
import { BottomTabBar, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { useState } from 'react';
import { Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import CameraScreen from './screens/CameraScreen';
import HomeScreen from './screens/HomeScreen';
import InventoryScreen from './screens/InventoryScreen';
import LoginScreen from './screens/LoginScreen';
import MyPageScreen from './screens/MyPageScreen';
import RecipeScreen from './screens/RecipeScreen';
import SignUpScreen from './screens/SignUpScreen';

import { useUserStore } from './store/useUserStore';

const Tab = createBottomTabNavigator();

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false); 
  const [authScreen, setAuthScreen] = useState('login'); 

  const navigationRef = useNavigationContainerRef();
  const [currentRoute, setCurrentRoute] = useState('홈');

  const isChatHidden = useUserStore((state) => state.isChatHidden);
  const isPremium = useUserStore((state) => state.isPremium);

  const [chatVisible, setChatVisible] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setMessages] = useState([
    { id: 1, sender: 'bot', text: '안녕하세요! SnapCook AI입니다. 무엇을 도와드릴까요? 🤖' }
  ]);

  const suggestedQuestions = [
    "🥚 달걀이 없는데 뭘로 대체하죠?",
    "🌿 깜빡하고 파를 안 넣었어요!",
    "🌶️ 파 대신 고추를 넣었는데 괜찮을까요?"
  ];

  const sendMessage = (text) => {
    if (!text.trim()) return;
    const newMsg = { id: Date.now(), sender: 'user', text };
    setMessages(prev => [...prev, newMsg]);
    setChatInput('');
    
    setTimeout(() => {
      setMessages(prev => [...prev, { 
        id: Date.now()+1, 
        sender: 'bot', 
        text: "현재 AI를 똑똑하게 학습시키는 중입니다! 곧 정확한 답변을 제공해 드릴게요! 🛠️" 
      }]);
    }, 1000);
  };

  if (!isLoggedIn) {
    if (authScreen === 'login') {
      return (
        <View style={styles.rootBackground}>
          <View style={styles.webContainer}>
            <LoginScreen onLogin={() => setIsLoggedIn(true)} onGoToSignUp={() => setAuthScreen('signup')} />
          </View>
        </View>
      );
    }
    
    if (authScreen === 'signup') {
      return (
        <View style={styles.rootBackground}>
          <View style={styles.webContainer}>
            <SignUpScreen onSignUp={() => setIsLoggedIn(true)} onGoToLogin={() => setAuthScreen('login')} />
          </View>
        </View>
      );
    }
  }

  return (
    <View style={styles.rootBackground}> 
      <View style={styles.webContainer}> 
        <NavigationContainer
          ref={navigationRef}
          onStateChange={() => {
            const routeName = navigationRef.getCurrentRoute()?.name;
            if (routeName) setCurrentRoute(routeName);
          }}
        >
          <Tab.Navigator
            // 💡 [핵심 수정] 기본 탭 바 위에 배너를 블록 쌓듯이 얹습니다!
            tabBar={(props) => (
              <View>
                {!isPremium && isLoggedIn && ['홈', '재고관리', '마이페이지'].includes(currentRoute) && (
                  <View style={styles.globalBannerAd}>
                    <Text style={styles.globalBannerText}>광고: 오늘 저녁은 마켓컬리에서 할인받고 주문하세요! 🍅</Text>
                  </View>
                )}
                {/* 원래 있던 기본 탭 바를 손상 없이 그대로 그려줍니다 */}
                <BottomTabBar {...props} />
              </View>
            )}
            screenOptions={({ route }) => ({
              headerShown: false,
              tabBarIcon: ({ color, size }) => {
                let iconName;
                if (route.name === '홈') iconName = 'home-outline'; 
                else if (route.name === '재고관리') iconName = 'basket-outline';
                else if (route.name === '카메라') iconName = 'camera-outline';
                else if (route.name === '레시피') iconName = 'restaurant-outline';
                else if (route.name === '마이페이지') iconName = 'person-outline';
                return <Ionicons name={iconName} size={size} color={color} />;
              },
              tabBarActiveTintColor: '#2ecc71',
              tabBarInactiveTintColor: 'gray',
              // 💡 [수정됨] 강제 높이(height: 55)를 삭제하여 글씨 잘림(찌그러짐) 현상을 없앴습니다!
              tabBarStyle: Platform.OS === 'web' ? { height: 64, paddingBottom: 10 } : { paddingTop: 5 }, 
              tabBarLabelStyle: { fontSize: 11, fontWeight: 'bold', paddingBottom: Platform.OS === 'ios' ? 0 : 5 }
            })}
          >
            <Tab.Screen name="홈" component={HomeScreen} />
            <Tab.Screen name="재고관리" component={InventoryScreen} />
            <Tab.Screen name="카메라" component={CameraScreen} />
            <Tab.Screen name="레시피" component={RecipeScreen} />
            <Tab.Screen name="마이페이지">
              {() => <MyPageScreen onLogout={() => setIsLoggedIn(false)} />}
            </Tab.Screen>
          </Tab.Navigator>
        </NavigationContainer>

        {!isChatHidden && (
          <TouchableOpacity style={styles.chatFab} onPress={() => setChatVisible(true)}>
            <Ionicons name="chatbubble-ellipses" size={30} color="white" />
          </TouchableOpacity>
        )}

        <Modal animationType="slide" transparent={true} visible={chatVisible} onRequestClose={() => setChatVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.chatModalContent}>
              <View style={styles.chatHeader}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#2c3e50' }}>SnapCook 챗봇 🤖</Text>
                <TouchableOpacity onPress={() => setChatVisible(false)}>
                  <Ionicons name="close" size={28} color="#bdc3c7" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.chatArea} showsVerticalScrollIndicator={false}>
                {chatMessages.map(msg => (
                  <View key={msg.id} style={[styles.chatBubble, msg.sender === 'user' ? styles.chatBubbleUser : styles.chatBubbleBot]}>
                    <Text style={msg.sender === 'user' ? { color: '#fff', fontSize: 15 } : { color: '#333', fontSize: 15 }}>
                      {msg.text}
                    </Text>
                  </View>
                ))}
              </ScrollView>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestionScroll}>
                {suggestedQuestions.map((q, idx) => (
                  <TouchableOpacity key={idx} style={styles.suggestionChip} onPress={() => sendMessage(q)}>
                    <Text style={{ fontSize: 13, color: '#3498db', fontWeight: '600' }}>{q}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.chatInputRow}>
                <TextInput 
                  style={styles.chatInputBox} 
                  placeholder="질문을 자유롭게 입력하세요..." 
                  value={chatInput} 
                  onChangeText={setChatInput} 
                  onSubmitEditing={() => sendMessage(chatInput)}
                />
                <TouchableOpacity style={styles.chatSendBtn} onPress={() => sendMessage(chatInput)}>
                  <Ionicons name="send" size={20} color="white" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rootBackground: { flex: 1, backgroundColor: '#f0f2f5', alignItems: 'center', justifyContent: 'center' },
  webContainer: Platform.OS === 'web' ? { 
    width: '100%', maxWidth: 400, height: '100%', maxHeight: 800, backgroundColor: '#ffffff', borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#cccccc', shadowColor: "#000", shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 5 
  } : {
    flex: 1, width: '100%', backgroundColor: '#ffffff'
  },
  // 💡 챗봇 버튼이 배너 위로 잘 올라오도록 위치(bottom)를 살짝 여유 있게 두었습니다.
  chatFab: { position: 'absolute', bottom: 120, right: 20, backgroundColor: '#3498db', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 8, zIndex: 100 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end', alignItems: Platform.OS === 'web' ? 'center' : 'stretch' },
  chatModalContent: { width: '100%', maxWidth: Platform.OS === 'web' ? 400 : '100%', height: '80%', backgroundColor: '#fff', borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 20, paddingBottom: 30 },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 15, marginBottom: 15 },
  chatArea: { flex: 1, marginBottom: 10 },
  chatBubble: { padding: 14, borderRadius: 18, maxWidth: '85%', marginBottom: 10 },
  chatBubbleBot: { backgroundColor: '#f1f2f6', alignSelf: 'flex-start', borderBottomLeftRadius: 5 },
  chatBubbleUser: { backgroundColor: '#3498db', alignSelf: 'flex-end', borderBottomRightRadius: 5 },
  suggestionScroll: { maxHeight: 45, marginBottom: 15 },
  suggestionChip: { paddingHorizontal: 15, paddingVertical: 10, backgroundColor: '#ebf5fb', borderRadius: 20, marginRight: 10, alignSelf: 'center' },
  chatInputRow: { flexDirection: 'row', alignItems: 'center' },
  chatInputBox: { flex: 1, backgroundColor: '#f1f2f6', borderRadius: 25, paddingHorizontal: 20, paddingVertical: 12, marginRight: 10, fontSize: 15 },
  chatSendBtn: { backgroundColor: '#2ecc71', width: 45, height: 45, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  
  // 💡 [핵심 수정] absolute(둥둥 띄우기)를 빼고 100% 폭을 가진 블록으로 만들었습니다!
  globalBannerAd: { 
    width: '100%', 
    height: 50, 
    backgroundColor: '#ecf0f1', 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderTopWidth: 1, 
    borderColor: '#bdc3c7'
  },
  globalBannerText: { 
    color: '#95a5a6', 
    fontSize: 12, 
    fontWeight: 'bold' 
  },
});