import { useColorScheme } from 'react-native';

import { useSettings } from '../store/settings';

const ACCENT = '#00F5FF';

const light = {
  bg: '#FFFFFF',
  surface: '#F5F6F8',
  surfaceAlt: '#ECEEF2',
  border: '#E2E5EA',
  text: '#0B0D10',
  textMuted: '#59616D',
  textFaint: '#8A929E',
  accent: ACCENT,
  /** Text/icons drawn on an accent fill. */
  onAccent: '#002E31',
  /** Accent used as text on the background (darker in light mode for contrast). */
  accentText: '#00737A',
  accentSoft: 'rgba(0, 245, 255, 0.16)',
  danger: '#C8261B',
  success: '#12805C',
};

export type Palette = typeof light;

const dark: Palette = {
  bg: '#0B0D10',
  surface: '#14171C',
  surfaceAlt: '#1C2027',
  border: '#272C34',
  text: '#F2F4F7',
  textMuted: '#9BA3AE',
  textFaint: '#6B7380',
  accent: ACCENT,
  onAccent: '#002E31',
  accentText: ACCENT,
  accentSoft: 'rgba(0, 245, 255, 0.14)',
  danger: '#FF6B5E',
  success: '#3DD68C',
};

export const font = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 };

export const type = {
  title: { fontFamily: font.bold, fontSize: 28, lineHeight: 34, letterSpacing: -0.4 },
  heading: { fontFamily: font.semibold, fontSize: 18, lineHeight: 24, letterSpacing: -0.2 },
  body: { fontFamily: font.regular, fontSize: 16, lineHeight: 23 },
  bodyMedium: { fontFamily: font.medium, fontSize: 16, lineHeight: 23 },
  small: { fontFamily: font.regular, fontSize: 14, lineHeight: 20 },
  label: { fontFamily: font.medium, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: font.regular, fontSize: 12, lineHeight: 16 },
};

export interface Theme {
  dark: boolean;
  c: Palette;
}

export function useTheme(): Theme {
  const system = useColorScheme();
  const mode = useSettings((s) => s.themeMode);
  const isDark = mode === 'system' ? system === 'dark' : mode === 'dark';
  return { dark: isDark, c: isDark ? dark : light };
}
