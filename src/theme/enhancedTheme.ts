const theme = {
  colors: {
    primary: {
      cyan: '#00F5FF',
      purple: '#B026FF',
      pink: '#FF0080',
    },
    accent: {
      warning: '#fbbf24',
    },
    background: {
      deep: '#0f172a',
    },
    text: {
      primary: '#ffffff',
      secondary: '#94a3b8',
      tertiary: '#64748b',
    },
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
    xxxl: 64,
  },
  typography: {
    sizes: {
      sm: 12,
      md: 14,
      lg: 16,
      xl: 20,
      xxl: 24,
      xxxl: 32,
    },
    weights: {
      normal: '400',
      semibold: '600',
      bold: '700',
    },
    families: {
      primary: 'Inter-Regular',
      display: 'SpaceGrotesk-Bold',
    },
  },
  borderRadius: {
    md: 8,
    lg: 16,
    full: 9999,
  },
  shadows: {
    sm: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 1.41, elevation: 2 },
  },
};

export default theme;
