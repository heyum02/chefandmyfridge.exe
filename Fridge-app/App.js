import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import HomeScreen from './screens/HomeScreen';
import InventoryScreen from './screens/InventoryScreen';
import RecipeScreen from './screens/RecipeScreen';
import MyPageScreen from './screens/MyPageScreen';
import CameraScreen from './screens/CameraScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown:false,//헤더 숨기기(각 화면에서 자체적으로 헤더를 만들었기 때문에 중복 방지)
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
        <Tab.Screen name="마이페이지" component={MyPageScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}