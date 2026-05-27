// src/types/navigation.ts

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
