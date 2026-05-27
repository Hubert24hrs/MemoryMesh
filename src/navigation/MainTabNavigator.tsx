// src/navigation/MainTabNavigator.tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, StyleSheet } from 'react-native';
import { useNotificationStore } from '../store/notificationStore';
import { MainTabParamList } from './types';
import { BlurView } from 'expo-blur';

// Ionicons fallback for custom icons
import { Ionicons } from '@expo/vector-icons';

import { DashboardScreen } from '../screens/DashboardScreen';
import { MemoryFeedScreen } from '../screens/Memory/MemoryFeedScreen';
import { InsightsScreen } from '../screens/Insights/InsightsScreen';
import { SettingsScreen } from '../screens/Settings/SettingsScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

export const MainTabNavigator: React.FC = () => {
  const unreadCount = useNotificationStore((state) => state.unreadCount);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: '#00F5FF',
        tabBarInactiveTintColor: 'rgba(255, 255, 255, 0.4)',
        tabBarLabelStyle: {
          fontSize: 10,
          fontFamily: 'SpaceGrotesk-Bold',
          fontWeight: 'bold',
          marginBottom: 4,
        },
        tabBarStyle: {
          position: 'absolute',
          bottom: 20,
          left: 16,
          right: 16,
          height: 64,
          borderRadius: 24,
          borderWidth: 1,
          borderColor: 'rgba(0, 245, 255, 0.2)',
          backgroundColor: 'rgba(10, 10, 26, 0.65)',
          overflow: 'hidden',
          elevation: 10,
        },
        tabBarBackground: () => (
          <BlurView intensity={25} style={StyleSheet.absoluteFill} tint="dark" />
        ),
        tabBarIcon: ({ color, focused }) => {
          let iconName: keyof typeof Ionicons.mappings | string = 'home';
          
          if (route.name === 'Dashboard') iconName = focused ? 'cube' : 'cube-outline';
          else if (route.name === 'Memories') iconName = focused ? 'layers' : 'layers-outline';
          else if (route.name === 'Insights') iconName = focused ? 'sparkles' : 'sparkles-outline';
          else if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';

          return (
            <View style={focused ? styles.focusedIconWrapper : null}>
              <Ionicons name={iconName as any} size={focused ? 24 : 20} color={color} />
              {focused && <View style={[styles.activeUnderline, { backgroundColor: '#00F5FF' }]} />}
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Memories" component={MemoryFeedScreen} />
      
      {/* Insights tab showing unread badges */}
      <Tab.Screen 
        name="Insights" 
        component={InsightsScreen} 
        options={{
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: '#FF0080',
            color: '#ffffff',
            fontSize: 9,
            fontFamily: 'SpaceGrotesk-Bold',
          },
        }}
      />
      
      <Tab.Screen name="Profile" component={SettingsScreen} />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  focusedIconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
  },
  activeUnderline: {
    width: 14,
    height: 2.5,
    borderRadius: 1,
    marginTop: 4,
    shadowColor: '#00F5FF',
    shadowRadius: 4,
    shadowOpacity: 0.8,
  },
});
export default MainTabNavigator;
