// src/theme/enhancedTheme.ts
/**
 * MemoryMesh Enhanced Theme System
 * World-class design tokens with 3D visualization support
 */

import { Dimensions, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ============================================================================
// COLOR SYSTEM - Holographic Gradient with Adaptive Brightness
// ============================================================================

export const colors = {
  // Primary Holographic Gradient
  primary: {
    cyan: '#00F5FF',
    cyanDark: '#00C4CC',
    purple: '#B026FF',
    purpleDark: '#8B1FCC',
    pink: '#FF0080',
    pinkDark: '#CC0066',
    gradient: ['#00F5FF', '#B026FF', '#FF0080'] as const,
    gradientVertical: ['#B026FF', '#FF0080', '#00F5FF'] as const,
    gradientDiagonal: ['#00F5FF', '#8B1FCC', '#FF0080'] as const,
  },

  // Background Space Theme
  background: {
    deep: '#0A0E27',
    dark: '#1A1F3A',
    medium: '#2A2F4A',
    card: 'rgba(26, 31, 58, 0.8)',
    glass: 'rgba(255, 255, 255, 0.05)',
    glassHover: 'rgba(255, 255, 255, 0.1)',
    overlay: 'rgba(10, 14, 39, 0.95)',
  },

  // Accent Colors
  accent: {
    electricCyan: '#00F5FF',
    neonPurple: '#B026FF',
    hotPink: '#FF0080',
    success: '#00FF88',
    successDark: '#00CC6A',
    warning: '#FFD700',
    warningDark: '#CCB000',
    error: '#FF3366',
    errorDark: '#CC2952',
    info: '#0099FF',
    infoDark: '#0077CC',
  },

  // Text Hierarchy
  text: {
    primary: '#FFFFFF',
    secondary: 'rgba(255, 255, 255, 0.7)',
    tertiary: 'rgba(255, 255, 255, 0.5)',
    quaternary: 'rgba(255, 255, 255, 0.3)',
    inverse: '#0A0E27',
    link: '#00F5FF',
    disabled: 'rgba(255, 255, 255, 0.25)',
  },

  // UI Elements
  border: 'rgba(255, 255, 255, 0.1)',
  borderActive: 'rgba(0, 245, 255, 0.5)',
  shadow: 'rgba(0, 0, 0, 0.5)',
  shadowHeavy: 'rgba(0, 0, 0, 0.8)',
  divider: 'rgba(255, 255, 255, 0.05)',
};

// ============================================================================
// TYPOGRAPHY - Inter + Space Grotesk
// ============================================================================

export const typography = {
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
    xxxl: 48,
    display: 64,
    hero: 80,
  },

  lineHeights: {
    xs: 16,
    sm: 20,
    md: 24,
    lg: 28,
    xl: 32,
    xxl: 40,
    xxxl: 56,
    display: 72,
    hero: 88,
  },

  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    black: '900' as const,
  },

  families: {
    primary: Platform.select({ ios: 'Inter', android: 'Inter', default: 'Inter' }),
    display: Platform.select({ ios: 'SpaceGrotesk', android: 'SpaceGrotesk', default: 'SpaceGrotesk' }),
    mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
  },

  letterSpacing: {
    tight: -0.5,
    normal: 0,
    wide: 0.5,
    wider: 1,
    widest: 2,
  },
};

// ============================================================================
// SPACING SYSTEM - 4px Base Grid
// ============================================================================

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
  huge: 96,
  massive: 128,
};

// ============================================================================
// BORDER RADIUS - Smooth Curves
// ============================================================================

export const borderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  round: 9999,
};

// ============================================================================
// SHADOWS & ELEVATION
// ============================================================================

export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },

  glass: {
    shadowColor: colors.primary.cyan,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },

  glassPurple: {
    shadowColor: colors.primary.purple,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },

  neonCyan: {
    shadowColor: colors.primary.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 15,
  },

  neonPurple: {
    shadowColor: colors.primary.purple,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 15,
  },

  neonPink: {
    shadowColor: colors.primary.pink,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 15,
  },

  deep: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 20,
  },

  floating: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
};

// ============================================================================
// GLASSMORPHISM STYLES
// ============================================================================

export const glassmorphism = {
  light: {
    backgroundColor: 'rgba(26, 31, 58, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },

  medium: {
    backgroundColor: 'rgba(26, 31, 58, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },

  heavy: {
    backgroundColor: 'rgba(26, 31, 58, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },

  frosted: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
};

// ============================================================================
// ANIMATION CONFIGURATION
// ============================================================================

export const animation = {
  // Spring Physics
  spring: {
    gentle: {
      damping: 20,
      stiffness: 90,
      mass: 1,
    },
    bouncy: {
      damping: 12,
      stiffness: 100,
      mass: 1,
    },
    snappy: {
      damping: 30,
      stiffness: 300,
      mass: 0.8,
    },
  },

  // Timing Durations
  duration: {
    instant: 0,
    fast: 150,
    normal: 300,
    slow: 500,
    slower: 800,
    slowest: 1200,
  },

  // Easing Functions
  easing: {
    linear: [0.0, 0.0, 1.0, 1.0] as const,
    ease: [0.25, 0.1, 0.25, 1.0] as const,
    easeIn: [0.42, 0.0, 1.0, 1.0] as const,
    easeOut: [0.0, 0.0, 0.58, 1.0] as const,
    easeInOut: [0.42, 0.0, 0.58, 1.0] as const,
    bounce: [0.68, -0.55, 0.265, 1.55] as const,
  },
};

// ============================================================================
// 3D VISUALIZATION SETTINGS
// ============================================================================

export const visualization3D = {
  memoryCrystal: {
    baseColor: colors.primary.cyan,
    emissiveColor: colors.primary.purple,
    metalness: 0.9,
    roughness: 0.1,
    transmission: 0.6,
    thickness: 2,
    envMapIntensity: 1,
    clearcoat: 1,
    clearcoatRoughness: 0.1,
  },

  particles: {
    count: 100,
    color: colors.primary.purple,
    size: 0.05,
    opacity: 0.6,
    speed: 0.05,
  },

  camera: {
    fov: 45,
    near: 0.1,
    far: 1000,
    position: [0, 0, 5] as [number, number, number],
  },

  lights: {
    ambient: {
      intensity: 0.5,
      color: '#ffffff',
    },
    point: {
      cyan: {
        intensity: 1,
        color: colors.primary.cyan,
        position: [10, 10, 10] as [number, number, number],
      },
      purple: {
        intensity: 0.5,
        color: colors.primary.purple,
        position: [-10, -10, -10] as [number, number, number],
      },
    },
  },
};

// ============================================================================
// BREAKPOINTS & RESPONSIVE
// ============================================================================

export const breakpoints = {
  small: 375,
  medium: 768,
  large: 1024,
  xlarge: 1440,
};

export const isSmallDevice = SCREEN_WIDTH < breakpoints.medium;
export const isMediumDevice = SCREEN_WIDTH >= breakpoints.medium && SCREEN_WIDTH < breakpoints.large;
export const isLargeDevice = SCREEN_WIDTH >= breakpoints.large;

// ============================================================================
// LAYOUT CONSTANTS
// ============================================================================

export const layout = {
  screen: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  headerHeight: Platform.select({ ios: 88, android: 72, default: 72 }),
  tabBarHeight: Platform.select({ ios: 80, android: 72, default: 72 }),
  safeAreaInsets: {
    top: Platform.select({ ios: 44, android: 0, default: 0 }),
    bottom: Platform.select({ ios: 34, android: 0, default: 0 }),
  },
};

// ============================================================================
// GESTURE THRESHOLDS
// ============================================================================

export const gestures = {
  swipe: {
    velocityThreshold: 500,
    distanceThreshold: 50,
  },
  tap: {
    maxDuration: 200,
    maxDistance: 10,
  },
  longPress: {
    minDuration: 500,
  },
  pinch: {
    minScale: 0.5,
    maxScale: 3,
  },
};

// ============================================================================
// Z-INDEX HIERARCHY
// ============================================================================

export const zIndex = {
  background: -1,
  base: 0,
  card: 10,
  dropdown: 100,
  sticky: 200,
  fixed: 300,
  overlay: 400,
  modal: 500,
  popover: 600,
  toast: 700,
  tooltip: 800,
  max: 999,
};

// ============================================================================
// HAPTIC FEEDBACK PATTERNS
// ============================================================================

export const haptics = {
  selection: 'selection' as const,
  impactLight: 'impactLight' as const,
  impactMedium: 'impactMedium' as const,
  impactHeavy: 'impactHeavy' as const,
  notificationSuccess: 'notificationSuccess' as const,
  notificationWarning: 'notificationWarning' as const,
  notificationError: 'notificationError' as const,
};

// ============================================================================
// THEME VARIANTS
// ============================================================================

export type ThemeVariant = 'holographic' | 'cyberpunk' | 'synthwave' | 'ethereal' | 'matrix';

export const themeVariants: Record<ThemeVariant, typeof colors> = {
  holographic: colors,
  
  cyberpunk: {
    ...colors,
    primary: {
      ...colors.primary,
      cyan: '#00FFFF',
      purple: '#FF00FF',
      pink: '#FF1493',
      gradient: ['#00FFFF', '#FF00FF', '#FF1493'],
    },
  },
  
  synthwave: {
    ...colors,
    primary: {
      ...colors.primary,
      cyan: '#FF6EC7',
      purple: '#7B2FBE',
      pink: '#FD1D53',
      gradient: ['#FF6EC7', '#7B2FBE', '#FD1D53'],
    },
  },
  
  ethereal: {
    ...colors,
    primary: {
      ...colors.primary,
      cyan: '#A8E6CF',
      purple: '#C4B5FD',
      pink: '#FFD3E0',
      gradient: ['#A8E6CF', '#C4B5FD', '#FFD3E0'],
    },
  },
  
  matrix: {
    ...colors,
    primary: {
      ...colors.primary,
      cyan: '#00FF00',
      purple: '#00CC00',
      pink: '#00FF00',
      gradient: ['#00FF00', '#00CC00', '#00FF00'],
    },
  },
};

// ============================================================================
// ACCESSIBILITY
// ============================================================================

export const accessibility = {
  minTouchTarget: 44,
  minTextSize: 16,
  highContrastRatio: 4.5,
  animationDuration: {
    reduceMotion: 0,
    normal: animation.duration.normal,
  },
};

// ============================================================================
// EXPORT DEFAULT THEME
// ============================================================================

export const theme = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  glassmorphism,
  animation,
  visualization3D,
  breakpoints,
  layout,
  gestures,
  zIndex,
  haptics,
  themeVariants,
  accessibility,
};

export type Theme = typeof theme;
export default theme;
