import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { useState } from 'react';
import { Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import CameraScreen from './screens/CameraScreen';
import HomeScreen from './screens/HomeScreen';
import InventoryScreen from './screens/InventoryScreen';
import LoginScreen from './screens/LoginScreen';
import MyPageScreen from './screens/MyPageScreen';
import RecipeScreen from './screens/RecipeScreen';
import SignUpScreen from './screens/SignUpScreen';

// 💡 유저 보관함 불러오기
import { useUserStore } from './store/useUserStore';

const Tab = createBottomTabNavigator();

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false); 
  const [authScreen, setAuthScreen] = useState('login'); 

  // 💡 보관함에서 챗봇 스위치 상태 꺼내오기
  const isChatHidden = useUserStore((state) => state.isChatHidden);

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
        <NavigationContainer>
          <Tab.Navigator
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

        {/* 💡 스위치(isChatHidden)가 꺼져 있을 때만 챗봇을 화면에 그립니다! */}
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
  chatFab: { position: 'absolute', bottom: 110, right: 20, backgroundColor: '#3498db', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 8 },
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
});