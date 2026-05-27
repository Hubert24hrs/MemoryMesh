// src/navigation/RootNavigator.tsx
import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { RootStackParamList } from './types';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Screens imports (Will be completed in steps 8 & 9)
import { AuthNavigator } from './AuthNavigator';
import { OnboardingScreen } from '../screens/Onboarding/OnboardingScreen';
import { MainTabNavigator } from './MainTabNavigator';
import { LoadingScreen } from '../components/LoadingScreen';

import { MemoryDetailScreen } from '../screens/Memory/MemoryDetailScreen';
import { CaptureScreen } from '../screens/Capture/CaptureScreen';
import { ProcessingScreen } from '../screens/Capture/ProcessingScreen';
import { SearchScreen } from '../screens/Search/SearchScreen';
import { SettingsScreen } from '../screens/Settings/SettingsScreen';
import { PaywallScreen } from '../screens/Subscription/PaywallScreen';

const MemoryEditScreen = MemoryDetailScreen; // Map edit to detail or same for simplicity

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator = () => {
  const { isAuthenticated, isLoading } = useAuthStore();
  const theme = useThemeStore((state) => state.theme);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const completed = await AsyncStorage.getItem('memorymesh_onboarding_completed');
        setHasCompletedOnboarding(completed === 'true');
      } catch (e) {
        setHasCompletedOnboarding(false);
      }
    };
    checkOnboarding();
  }, [isAuthenticated]);

  if (isLoading || hasCompletedOnboarding === null) {
    return <LoadingScreen />;
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: theme.colors.background.deep },
      }}
    >
      {!isAuthenticated ? (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      ) : !hasCompletedOnboarding ? (
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      ) : (
        <>
          <Stack.Screen name="MainTabs" component={MainTabNavigator} />
          <Stack.Screen name="MemoryDetail" component={MemoryDetailScreen} />
          <Stack.Screen name="MemoryEdit" component={MemoryEditScreen} />
          <Stack.Screen name="Capture" component={CaptureScreen} />
          <Stack.Screen name="Processing" component={ProcessingScreen} />
          <Stack.Screen name="Search" component={SearchScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="Paywall" component={PaywallScreen} />
        </>
      )}
    </Stack.Navigator>
  );
};
export default RootNavigator;
