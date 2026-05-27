// src/navigation/types.ts
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Splash: undefined;
  Auth: undefined;
  Onboarding: undefined;
  MainTabs: undefined;
  MemoryDetail: { memoryId: string };
  MemoryEdit: { memoryId: string };
  Capture: { mode?: 'voice' | 'text' | 'image' };
  Processing: { tempMemoryId: string };
  Search: undefined;
  Settings: undefined;
  AIPreferences: undefined;
  ThemeCustomization: undefined;
  Privacy: undefined;
  Export: undefined;
  Paywall: { trigger?: string };
  ManageSubscription: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Memories: undefined;
  Insights: undefined;
  Profile: undefined;
};

export type RootNavigationProp<RouteName extends keyof RootStackParamList> = NativeStackNavigationProp<
  RootStackParamList,
  RouteName
>;

export type MainTabNavigationProp<RouteName extends keyof MainTabParamList> = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, RouteName>,
  NativeStackNavigationProp<RootStackParamList>
>;
