import Storage from 'expo-sqlite/kv-store';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type ThemeMode = 'system' | 'light' | 'dark';
export type ProviderPreference = 'auto' | 'anthropic' | 'kimi' | 'openai';

interface SettingsState {
  onboarded: boolean;
  /** Default for new notes; AI is opt-in per note. */
  aiByDefault: boolean;
  biometricLock: boolean;
  themeMode: ThemeMode;
  providerPreference: ProviderPreference;
  lastDigestWeek: string | null;
  set: (patch: Partial<Omit<SettingsState, 'set'>>) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      onboarded: false,
      aiByDefault: false,
      biometricLock: false,
      themeMode: 'system',
      providerPreference: 'auto',
      lastDigestWeek: null,
      set: (patch) => set(patch),
    }),
    {
      name: 'memorymesh.settings',
      storage: createJSONStorage(() => Storage),
      partialize: ({ set: _set, ...rest }) => rest,
    },
  ),
);
