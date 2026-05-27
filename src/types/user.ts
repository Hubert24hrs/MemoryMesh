// src/types/user.ts

export interface User {
  id: string;
  email: string;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  userId: string;
  name: string;
  avatarUrl?: string;
  streakCount: number;
  lastActiveAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
  preferredAIProvider: 'claude' | 'kimi' | 'openai';
  autoTranscribe: boolean;
  language: string;
  hapticEnabled: boolean;
  analyticsEnabled: boolean;
  themeVariant: 'holographic' | 'cyberpunk' | 'synthwave' | 'minimal';
  darkMode: boolean;
  exportFormat: 'json' | 'markdown' | 'pdf';
}

export interface BiometricConfig {
  biometricEnabled: boolean;
  biometricType?: 'FaceID' | 'TouchID' | 'Biometrics' | 'None';
  lastAuthenticated?: string;
}
