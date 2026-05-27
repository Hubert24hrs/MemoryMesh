// src/store/themeStore.ts
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import defaultTheme from '../theme/enhancedTheme';

type ThemeVariant = 'holographic' | 'cyberpunk' | 'synthwave' | 'minimal';

interface ThemeState {
  theme: typeof defaultTheme;
  variant: ThemeVariant;
  darkMode: boolean;
  initialize: () => Promise<void>;
  setVariant: (variant: ThemeVariant) => Promise<void>;
  toggleDarkMode: () => Promise<void>;
}

const THEME_VARIANT_KEY = 'memorymesh_theme_variant_choice';
const THEME_DARK_MODE_KEY = 'memorymesh_theme_dark_mode_choice';

// Styling templates for premium interface layouts
const VARIANT_PALETTES: Record<ThemeVariant, { primary: { cyan: string; purple: string; pink: string }; background: string }> = {
  holographic: {
    primary: { cyan: '#00F5FF', purple: '#B026FF', pink: '#FF0080' },
    background: '#0A0A1A',
  },
  cyberpunk: {
    primary: { cyan: '#FFEA00', purple: '#FF0055', pink: '#00FF66' },
    background: '#030303',
  },
  synthwave: {
    primary: { cyan: '#FF007F', purple: '#3F00FF', pink: '#FF7F00' },
    background: '#1F003F',
  },
  minimal: {
    primary: { cyan: '#FFFFFF', purple: '#707070', pink: '#202020' },
    background: '#121212',
  },
};

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: defaultTheme,
  variant: 'holographic',
  darkMode: true,

  initialize: async () => {
    try {
      const storedVariant = await AsyncStorage.getItem(THEME_VARIANT_KEY) as ThemeVariant;
      const storedDarkMode = await AsyncStorage.getItem(THEME_DARK_MODE_KEY);
      
      const variant = storedVariant || 'holographic';
      const darkMode = storedDarkMode !== 'false'; // Default to true (dark theme)

      const activePalette = VARIANT_PALETTES[variant];
      const mergedTheme = {
        ...defaultTheme,
        colors: {
          ...defaultTheme.colors,
          primary: activePalette.primary,
          background: {
            deep: darkMode ? activePalette.background : '#F8FAFC',
          },
          text: {
            primary: darkMode ? '#FFFFFF' : '#0F172A',
            secondary: darkMode ? '#94A3B8' : '#475569',
            tertiary: darkMode ? '#64748B' : '#94A3B8',
          },
        },
      };

      set({ theme: mergedTheme, variant, darkMode });
    } catch (e) {
      console.error('Failed to load theme state:', e);
    }
  },

  setVariant: async (variant: ThemeVariant) => {
    try {
      await AsyncStorage.setItem(THEME_VARIANT_KEY, variant);
      
      const darkMode = get().darkMode;
      const activePalette = VARIANT_PALETTES[variant];
      const mergedTheme = {
        ...defaultTheme,
        colors: {
          ...defaultTheme.colors,
          primary: activePalette.primary,
          background: {
            deep: darkMode ? activePalette.background : '#F8FAFC',
          },
          text: {
            primary: darkMode ? '#FFFFFF' : '#0F172A',
            secondary: darkMode ? '#94A3B8' : '#475569',
            tertiary: darkMode ? '#64748B' : '#94A3B8',
          },
        },
      };

      set({ theme: mergedTheme, variant });
    } catch (e) {
      console.error('Failed to save theme variant:', e);
    }
  },

  toggleDarkMode: async () => {
    try {
      const newDarkMode = !get().darkMode;
      await AsyncStorage.setItem(THEME_DARK_MODE_KEY, newDarkMode ? 'true' : 'false');
      
      const variant = get().variant;
      const activePalette = VARIANT_PALETTES[variant];
      const mergedTheme = {
        ...defaultTheme,
        colors: {
          ...defaultTheme.colors,
          background: {
            deep: newDarkMode ? activePalette.background : '#F8FAFC',
          },
          text: {
            primary: newDarkMode ? '#FFFFFF' : '#0F172A',
            secondary: newDarkMode ? '#94A3B8' : '#475569',
            tertiary: newDarkMode ? '#64748B' : '#94A3B8',
          },
        },
      };

      set({ theme: mergedTheme, darkMode: newDarkMode });
    } catch (e) {
      console.error('Failed to save dark mode state:', e);
    }
  },
}));
export default useThemeStore;
