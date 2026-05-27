// src/store/settingsStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AIProvider } from '../types/ai';

interface SettingsState {
  preferredAIProvider: AIProvider;
  autoTranscribe: boolean;
  language: string;
  hapticEnabled: boolean;
  analyticsEnabled: boolean;
  exportFormat: 'json' | 'markdown' | 'pdf';
  setPreferredAIProvider: (provider: AIProvider) => void;
  setAutoTranscribe: (enabled: boolean) => void;
  setLanguage: (lang: string) => void;
  setHapticEnabled: (enabled: boolean) => void;
  setAnalyticsEnabled: (enabled: boolean) => void;
  setExportFormat: (format: 'json' | 'markdown' | 'pdf') => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      preferredAIProvider: 'claude',
      autoTranscribe: true,
      language: 'en',
      hapticEnabled: true,
      analyticsEnabled: true,
      exportFormat: 'json',

      setPreferredAIProvider: (provider: AIProvider) => set({ preferredAIProvider: provider }),
      setAutoTranscribe: (enabled: boolean) => set({ autoTranscribe: enabled }),
      setLanguage: (lang: string) => set({ language: lang }),
      setHapticEnabled: (enabled: boolean) => set({ hapticEnabled: enabled }),
      setAnalyticsEnabled: (enabled: boolean) => set({ analyticsEnabled: enabled }),
      setExportFormat: (format: 'json' | 'markdown' | 'pdf') => set({ exportFormat: format }),
    }),
    {
      name: 'memorymesh-user-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
export default useSettingsStore;
