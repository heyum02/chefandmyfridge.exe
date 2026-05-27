import { Ionicons } from '@expo/vector-icons';
import { BottomTabBar, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

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

  // 💡 챗봇 상태는 RecipeScreen으로 이사갔으므로 여기서는 isPremium만 씁니다.
  const isPremium = useUserStore((state) => state.isPremium);

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
            tabBar={(props) => (
              <View>
                {!isPremium && isLoggedIn && ['홈', '재고관리', '마이페이지'].includes(currentRoute) && (
                  <View style={styles.globalBannerAd}>
                    <Text style={styles.globalBannerText}>광고: 오늘 저녁은 마켓컬리에서 할인받고 주문하세요! 🍅</Text>
                  </View>
                )}
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