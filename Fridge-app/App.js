import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { useState } from 'react';

// 모든 화면 불러오기
import CameraScreen from './screens/CameraScreen';
import HomeScreen from './screens/HomeScreen';
import InventoryScreen from './screens/InventoryScreen';
import LoginScreen from './screens/LoginScreen'; // 새로 추가
import MyPageScreen from './screens/MyPageScreen';
import RecipeScreen from './screens/RecipeScreen';
import SignUpScreen from './screens/SignUpScreen'; // 새로 추가

const Tab = createBottomTabNavigator();

export default function App() {
  // 💡 앱의 핵심 상태 관리 (로그인 여부, 현재 인증 화면)
  const [isLoggedIn, setIsLoggedIn] = useState(false); // 처음 켜면 로그아웃 상태(false)
  const [authScreen, setAuthScreen] = useState('login'); // 처음 켜면 보여줄 인증 화면은 'login'

  // 🔴 1. 로그인이 안 되어 있을 때 (문지기 작동!)
  if (!isLoggedIn) {
    if (authScreen === 'login') {
      return (
        <LoginScreen 
          onLogin={() => setIsLoggedIn(true)} 
          onGoToSignUp={() => setAuthScreen('signup')} 
        />
      );
    }
    
    if (authScreen === 'signup') {
      return (
        <SignUpScreen 
          onSignUp={() => setIsLoggedIn(true)} 
          onGoToLogin={() => setAuthScreen('login')} 
        />
      );
    }
  }

  // 🟢 2. 로그인을 통과했을 때 보여주는 진짜 앱 화면 (하단 탭)
  return (
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
        })}
      >
        <Tab.Screen name="홈" component={HomeScreen} />
        <Tab.Screen name="재고관리" component={InventoryScreen} />
        <Tab.Screen name="카메라" component={CameraScreen} />
        <Tab.Screen name="레시피" component={RecipeScreen} />
        {/* 마이페이지에는 로그아웃 기능을 전달해주기 위해 조금 다르게 씁니다 */}
        <Tab.Screen name="마이페이지">
          {() => <MyPageScreen onLogout={() => setIsLoggedIn(false)} />}
        </Tab.Screen>
      </Tab.Navigator>
    </NavigationContainer>
  );
}